import { Router, Request, Response } from 'express';
import { Activity } from '../models/Activity';
import { Participant } from '../models/Participant';
import { Notification } from '../models/Notification';
import { AnalyticsEvent } from '../models/AnalyticsEvent';
import { protect, AuthRequest } from '../middleware/auth';
import { emitNotification, emitActivityUpdate } from '../socket';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'plusone_jwt_secret_dev_key_12345';

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

function getRequesterUid(req: Request): string | null {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as { uid: string };
      return decoded.uid;
    }
  } catch {
    // Ignore invalid token on optional reads
  }
  return null;
}

// GET /api/activities
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city, category, status, isDemo, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (city && city !== 'All Cities') {
      filter.city = city;
    }
    if (category) {
      filter.category = category;
    }
    if (status) {
      filter.status = status;
    } else {
      filter.status = 'published';
    }
    if (isDemo !== undefined) {
      filter.isDemo = isDemo === 'true';
    }
    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { venueName: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const activities = await Activity.find(filter)
      .select('-meetingInstructions -whatToBring')
      .sort({ startAt: 1 })
      .limit(100);

    res.json(activities);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch activities';
    res.status(500).json({ error: msg });
  }
});

// GET /api/activities/:activityId
router.get('/:activityId', async (req: Request, res: Response) => {
  try {
    const activity = await Activity.findOne({ activityId: req.params.activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const uid = getRequesterUid(req);
    let isApprovedMember = false;

    if (uid) {
      if (activity.hostId === uid) {
        isApprovedMember = true;
      } else {
        const participant = await Participant.findOne({
          activityId: activity.activityId,
          userId: uid,
          membershipStatus: 'approved',
        });
        if (participant) isApprovedMember = true;
      }
    }

    const result = activity.toObject();
    if (!isApprovedMember) {
      delete result.meetingInstructions;
      delete result.whatToBring;
    }

    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch activity details' });
  }
});

// POST /api/activities
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      title,
      description,
      category,
      coverImageURL,
      venueName,
      venueAddress,
      city,
      startAt,
      endAt,
      timeZone,
      capacity,
      estimatedCost,
      currency,
      meetingInstructions,
      whatToBring,
      isDemo,
    } = req.body;

    const activityId = makeId('act');
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (endDate.getTime() <= startDate.getTime()) {
      res.status(400).json({ error: 'End time must be after start time' });
      return;
    }

    const activity = await Activity.create({
      activityId,
      hostId: user.uid,
      hostName: user.displayName,
      hostPhotoURL: user.photoURL,
      title: title.trim(),
      description: description.trim(),
      category,
      coverImageURL,
      venueName: venueName.trim(),
      venueAddress: venueAddress.trim(),
      city: city || user.city || 'New York',
      startAt: startDate,
      endAt: endDate,
      timeZone: timeZone || 'America/New_York',
      capacity: Number(capacity) || 5,
      approvedParticipantCount: 1,
      estimatedCost: Number(estimatedCost) || 0,
      currency: currency || 'USD',
      status: 'published',
      isDemo: isDemo === true,
      meetingInstructions: (meetingInstructions || '').trim(),
      whatToBring: (whatToBring || '').trim(),
      rosterPreviews: [
        {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'host',
        },
      ],
    });

    // Create participant record for host
    await Participant.create({
      participantId: `${activityId}_${user.uid}`,
      activityId,
      userId: user.uid,
      hostId: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: 'host',
      membershipStatus: 'approved',
      attendanceStatus: 'pending',
    });

    // Increment user hostedCount
    user.hostedCount = (user.hostedCount || 0) + 1;
    await user.save();

    // Log analytics event
    const eventId = makeId('evt');
    await AnalyticsEvent.create({
      eventId,
      userId: user.uid,
      activityId,
      eventType: 'activity_published',
      isDemo: activity.isDemo,
    });

    res.status(201).json(activity);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create activity';
    res.status(500).json({ error: msg });
  }
});

// PUT /api/activities/:activityId
router.put('/:activityId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const activity = await Activity.findOne({ activityId: req.params.activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }
    if (activity.hostId !== req.user!.uid) {
      res.status(403).json({ error: 'Only the host can edit this activity' });
      return;
    }

    const {
      title,
      description,
      category,
      coverImageURL,
      venueName,
      venueAddress,
      city,
      startAt,
      endAt,
      timeZone,
      capacity,
      estimatedCost,
      currency,
      meetingInstructions,
      whatToBring,
    } = req.body;

    if (capacity < activity.approvedParticipantCount) {
      res.status(400).json({
        error: `Capacity cannot be lower than current approved participants (${activity.approvedParticipantCount})`,
      });
      return;
    }

    activity.title = title || activity.title;
    activity.description = description || activity.description;
    activity.category = category || activity.category;
    activity.coverImageURL = coverImageURL || activity.coverImageURL;
    activity.venueName = venueName || activity.venueName;
    activity.venueAddress = venueAddress || activity.venueAddress;
    activity.city = city || activity.city;
    if (startAt) activity.startAt = new Date(startAt);
    if (endAt) activity.endAt = new Date(endAt);
    activity.timeZone = timeZone || activity.timeZone;
    activity.capacity = Number(capacity) || activity.capacity;
    activity.estimatedCost = Number(estimatedCost) || activity.estimatedCost;
    activity.currency = currency || activity.currency;
    if (meetingInstructions !== undefined) activity.meetingInstructions = meetingInstructions;
    if (whatToBring !== undefined) activity.whatToBring = whatToBring;

    await activity.save();
    emitActivityUpdate(activity.activityId, { type: 'updated', activity });

    res.json(activity);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// POST /api/activities/:activityId/cancel
router.post('/:activityId/cancel', protect, async (req: AuthRequest, res: Response) => {
  try {
    const activity = await Activity.findOne({ activityId: req.params.activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }
    if (activity.hostId !== req.user!.uid) {
      res.status(403).json({ error: 'Only the host can cancel this activity' });
      return;
    }

    activity.status = 'cancelled';
    await activity.save();

    // Notify all participants
    const participants = await Participant.find({
      activityId: activity.activityId,
      membershipStatus: 'approved',
      userId: { $ne: req.user!.uid },
    });

    for (const p of participants) {
      const nid = makeId('notif');
      const notif = await Notification.create({
        notificationId: nid,
        recipientId: p.userId,
        senderId: req.user!.uid,
        activityId: activity.activityId,
        type: 'activity_cancelled',
        title: 'Activity cancelled',
        message: `"${activity.title}" was cancelled by the host.`,
        isRead: false,
      });
      emitNotification(p.userId, notif);
    }

    emitActivityUpdate(activity.activityId, { type: 'cancelled' });
    res.json({ success: true, activity });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to cancel activity' });
  }
});

// POST /api/activities/:activityId/complete
router.post('/:activityId/complete', protect, async (req: AuthRequest, res: Response) => {
  try {
    const activity = await Activity.findOne({ activityId: req.params.activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }
    if (activity.hostId !== req.user!.uid) {
      res.status(403).json({ error: 'Only the host can mark this activity as completed' });
      return;
    }

    activity.status = 'completed';
    await activity.save();

    // Increment completed counts
    const participants = await Participant.find({
      activityId: activity.activityId,
      membershipStatus: 'approved',
    });

    for (const p of participants) {
      if (p.userId !== req.user!.uid) {
        const nid = makeId('notif');
        const notif = await Notification.create({
          notificationId: nid,
          recipientId: p.userId,
          senderId: req.user!.uid,
          activityId: activity.activityId,
          type: 'feedback_request',
          title: 'How was the plan?',
          message: `Leave quick feedback for "${activity.title}"!`,
          isRead: false,
        });
        emitNotification(p.userId, notif);
      }
    }

    const eventId = makeId('evt');
    await AnalyticsEvent.create({
      eventId,
      userId: req.user!.uid,
      activityId: activity.activityId,
      eventType: 'activity_completed',
      isDemo: activity.isDemo,
    });

    emitActivityUpdate(activity.activityId, { type: 'completed' });
    res.json({ success: true, activity });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to complete activity' });
  }
});

export default router;

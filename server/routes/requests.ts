import { Router, Response } from 'express';
import { Activity } from '../models/Activity';
import { JoinRequest } from '../models/JoinRequest';
import { Participant } from '../models/Participant';
import { Notification } from '../models/Notification';
import { AnalyticsEvent } from '../models/AnalyticsEvent';
import { protect, AuthRequest } from '../middleware/auth';
import { emitNotification } from '../socket';

const router = Router();

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

// POST /api/requests (submit join request)
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { activityId, introductoryMessage } = req.body;

    if (!activityId || !introductoryMessage?.trim()) {
      res.status(400).json({ error: 'Activity ID and intro message are required' });
      return;
    }

    const activity = await Activity.findOne({ activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (activity.hostId === user.uid) {
      res.status(400).json({ error: 'You cannot request to join your own activity' });
      return;
    }

    if (activity.status !== 'published') {
      res.status(400).json({ error: 'This activity is no longer accepting requests' });
      return;
    }

    if (activity.approvedParticipantCount >= activity.capacity) {
      res.status(400).json({ error: 'This activity is at full capacity' });
      return;
    }

    const requestId = `${activityId}_${user.uid}`;
    let joinReq = await JoinRequest.findOne({ requestId });

    if (joinReq && (joinReq.status === 'pending' || joinReq.status === 'approved')) {
      res.status(400).json({ error: 'You already have an active request or are approved' });
      return;
    }

    if (joinReq) {
      joinReq.status = 'pending';
      joinReq.introductoryMessage = introductoryMessage.trim();
      joinReq.requesterName = user.displayName;
      joinReq.requesterPhotoURL = user.photoURL;
      await joinReq.save();
    } else {
      joinReq = await JoinRequest.create({
        requestId,
        activityId,
        userId: user.uid,
        hostId: activity.hostId,
        requesterName: user.displayName,
        requesterPhotoURL: user.photoURL,
        introductoryMessage: introductoryMessage.trim(),
        status: 'pending',
      });
    }

    // Notify Host
    const nid = makeId('notif');
    const notif = await Notification.create({
      notificationId: nid,
      recipientId: activity.hostId,
      senderId: user.uid,
      activityId,
      type: 'join_request',
      title: 'New join request',
      message: `${user.displayName} asked to join "${activity.title}".`,
      isRead: false,
    });
    emitNotification(activity.hostId, notif);

    // Analytics event
    const eventId = makeId('evt');
    await AnalyticsEvent.create({
      eventId,
      userId: user.uid,
      activityId,
      eventType: 'join_requested',
      isDemo: activity.isDemo,
    });

    res.status(201).json(joinReq);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit join request';
    res.status(500).json({ error: msg });
  }
});

// GET /api/requests/activity/:activityId (host reviews requests)
router.get('/activity/:activityId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const activity = await Activity.findOne({ activityId: req.params.activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }
    if (activity.hostId !== req.user!.uid) {
      res.status(403).json({ error: 'Only the host can view join requests' });
      return;
    }

    const requests = await JoinRequest.find({ activityId: req.params.activityId }).sort({
      createdAt: -1,
    });
    res.json(requests);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch join requests' });
  }
});

// GET /api/requests/my (my pending/past requests)
router.get('/my', protect, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await JoinRequest.find({ userId: req.user!.uid }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch your requests' });
  }
});

// POST /api/requests/:requestId/approve (host approves request)
router.post('/:requestId/approve', protect, async (req: AuthRequest, res: Response) => {
  try {
    const joinReq = await JoinRequest.findOne({ requestId: req.params.requestId });
    if (!joinReq) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }
    if (joinReq.hostId !== req.user!.uid) {
      res.status(403).json({ error: 'Only the host can approve requests' });
      return;
    }
    if (joinReq.status !== 'pending') {
      res.status(400).json({ error: 'This request is no longer pending' });
      return;
    }

    // Atomic increment with capacity condition
    const updatedActivity = await Activity.findOneAndUpdate(
      {
        activityId: joinReq.activityId,
        status: 'published',
        $expr: { $lt: ['$approvedParticipantCount', '$capacity'] },
      },
      {
        $inc: { approvedParticipantCount: 1 },
        $push: {
          rosterPreviews: {
            uid: joinReq.userId,
            displayName: joinReq.requesterName,
            photoURL: joinReq.requesterPhotoURL,
            role: 'participant',
          },
        },
      },
      { new: true }
    );

    if (!updatedActivity) {
      res.status(400).json({ error: 'This activity is already at full capacity or is no longer published' });
      return;
    }

    joinReq.status = 'approved';
    await joinReq.save();

    // Create participant document
    await Participant.findOneAndUpdate(
      { activityId: joinReq.activityId, userId: joinReq.userId },
      {
        participantId: `${joinReq.activityId}_${joinReq.userId}`,
        activityId: joinReq.activityId,
        userId: joinReq.userId,
        hostId: joinReq.hostId,
        displayName: joinReq.requesterName,
        photoURL: joinReq.requesterPhotoURL,
        role: 'participant',
        membershipStatus: 'approved',
        attendanceStatus: 'pending',
      },
      { upsert: true, new: true }
    );

    // Notify approved user
    const nid = makeId('notif');
    const notif = await Notification.create({
      notificationId: nid,
      recipientId: joinReq.userId,
      senderId: req.user!.uid,
      activityId: joinReq.activityId,
      type: 'request_approved',
      title: 'You are in!',
      message: `Your request to join "${updatedActivity.title}" was approved.`,
      isRead: false,
    });
    emitNotification(joinReq.userId, notif);

    res.json({ success: true, activity: updatedActivity, request: joinReq });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to approve request';
    res.status(500).json({ error: msg });
  }
});

// POST /api/requests/:requestId/decline (host declines request)
router.post('/:requestId/decline', protect, async (req: AuthRequest, res: Response) => {
  try {
    const joinReq = await JoinRequest.findOne({ requestId: req.params.requestId });
    if (!joinReq) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }
    if (joinReq.hostId !== req.user!.uid) {
      res.status(403).json({ error: 'Only the host can decline requests' });
      return;
    }

    joinReq.status = 'declined';
    await joinReq.save();

    res.json({ success: true, request: joinReq });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

// POST /api/requests/:requestId/withdraw (requester withdraws request)
router.post('/:requestId/withdraw', protect, async (req: AuthRequest, res: Response) => {
  try {
    const joinReq = await JoinRequest.findOne({ requestId: req.params.requestId });
    if (!joinReq) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }
    if (joinReq.userId !== req.user!.uid) {
      res.status(403).json({ error: 'Only the requester can withdraw this request' });
      return;
    }

    joinReq.status = 'withdrawn';
    await joinReq.save();

    res.json({ success: true, request: joinReq });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to withdraw request' });
  }
});

export default router;

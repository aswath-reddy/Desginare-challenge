import { Router, Response } from 'express';
import { Activity } from '../models/Activity';
import { Participant } from '../models/Participant';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/participants/my (activities I am a participant in)
router.get('/my', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await Participant.find({
      userId: req.user!.uid,
      membershipStatus: 'approved',
    }).sort({ joinedAt: -1 });

    const activityIds = list.map((p) => p.activityId);
    const activities = await Activity.find({ activityId: { $in: activityIds } });

    res.json({ participants: list, activities });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch your joined plans' });
  }
});

// GET /api/participants/activity/:activityId
router.get('/activity/:activityId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const participants = await Participant.find({
      activityId: req.params.activityId,
      membershipStatus: 'approved',
    });
    res.json(participants);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// PATCH /api/participants/:activityId/attendance
router.patch('/:activityId/attendance', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId, attendanceStatus } = req.body;
    const activity = await Activity.findOne({ activityId: req.params.activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const isHost = activity.hostId === req.user!.uid;
    const isSelf = targetUserId === req.user!.uid;

    if (!isHost && !isSelf) {
      res.status(403).json({ error: 'Not authorized to update attendance' });
      return;
    }

    const participant = await Participant.findOne({
      activityId: req.params.activityId,
      userId: targetUserId,
    });
    if (!participant) {
      res.status(404).json({ error: 'Participant record not found' });
      return;
    }

    participant.attendanceStatus = attendanceStatus;
    await participant.save();

    res.json({ success: true, participant });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// POST /api/participants/:activityId/leave
router.post('/:activityId/leave', protect, async (req: AuthRequest, res: Response) => {
  try {
    const activity = await Activity.findOne({ activityId: req.params.activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const uid = req.user!.uid;
    if (activity.hostId === uid) {
      res.status(400).json({ error: 'Host cannot leave activity; cancel the activity instead.' });
      return;
    }

    const participant = await Participant.findOne({
      activityId: req.params.activityId,
      userId: uid,
    });
    if (!participant || participant.membershipStatus !== 'approved') {
      res.status(400).json({ error: 'You are not an active participant' });
      return;
    }

    participant.membershipStatus = 'left';
    await participant.save();

    // Decrement capacity & remove from roster
    activity.approvedParticipantCount = Math.max(1, activity.approvedParticipantCount - 1);
    activity.rosterPreviews = activity.rosterPreviews.filter((r) => r.uid !== uid);
    await activity.save();

    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to leave activity' });
  }
});

// POST /api/participants/:activityId/remove/:userId
router.post('/:activityId/remove/:userId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const activity = await Activity.findOne({ activityId: req.params.activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }
    if (activity.hostId !== req.user!.uid) {
      res.status(403).json({ error: 'Only the host can remove participants' });
      return;
    }

    const targetUid = req.params.userId;
    const participant = await Participant.findOne({
      activityId: req.params.activityId,
      userId: targetUid,
    });
    if (!participant) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    participant.membershipStatus = 'removed';
    await participant.save();

    activity.approvedParticipantCount = Math.max(1, activity.approvedParticipantCount - 1);
    activity.rosterPreviews = activity.rosterPreviews.filter((r) => r.uid !== targetUid);
    await activity.save();

    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

export default router;

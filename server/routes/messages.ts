import { Router, Response } from 'express';
import { Message } from '../models/Message';
import { Participant } from '../models/Participant';
import { Activity } from '../models/Activity';
import { protect, AuthRequest } from '../middleware/auth';
import { emitActivityMessage } from '../socket';

const router = Router();

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

// GET /api/messages/:activityId (fetch chat history)
router.get('/:activityId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const activityId = req.params.activityId;
    const uid = req.user!.uid;

    const activity = await Activity.findOne({ activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    // Only host or approved participants can read messages
    if (activity.hostId !== uid) {
      const part = await Participant.findOne({
        activityId,
        userId: uid,
        membershipStatus: 'approved',
      });
      if (!part) {
        res.status(403).json({ error: 'Access denied: You are not an approved participant' });
        return;
      }
    }

    const messages = await Message.find({ activityId }).sort({ createdAt: 1 }).limit(200);
    res.json(messages);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages/:activityId (send a message)
router.post('/:activityId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const activityId = req.params.activityId;
    const user = req.user!;
    const { messageText, messageType } = req.body;

    if (!messageText || !messageText.trim()) {
      res.status(400).json({ error: 'Message text cannot be empty' });
      return;
    }

    const activity = await Activity.findOne({ activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    // Check membership
    if (activity.hostId !== user.uid) {
      const part = await Participant.findOne({
        activityId,
        userId: user.uid,
        membershipStatus: 'approved',
      });
      if (!part) {
        res.status(403).json({ error: 'Access denied: You are not an approved participant' });
        return;
      }
    }

    const msg = await Message.create({
      messageId: makeId('msg'),
      activityId,
      senderId: user.uid,
      senderName: user.displayName,
      senderPhotoURL: user.photoURL,
      messageText: messageText.trim(),
      messageType: messageType || 'user',
      createdAt: new Date(),
    });

    // Broadcast in real-time to the activity room via Socket.io
    emitActivityMessage(activityId, msg);

    res.status(201).json(msg);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;

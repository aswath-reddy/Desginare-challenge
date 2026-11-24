import { Router, Response } from 'express';
import { Notification } from '../models/Notification';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await Notification.find({ recipientId: req.user!.uid })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user!.uid,
      isRead: false,
    });
    res.json({ notifications: list, unreadCount });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:notificationId/read
router.patch('/:notificationId/read', protect, async (req: AuthRequest, res: Response) => {
  try {
    const notif = await Notification.findOne({
      notificationId: req.params.notificationId,
      recipientId: req.user!.uid,
    });
    if (!notif) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    notif.isRead = true;
    await notif.save();
    res.json({ success: true, notification: notif });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', protect, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ recipientId: req.user!.uid, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

export default router;

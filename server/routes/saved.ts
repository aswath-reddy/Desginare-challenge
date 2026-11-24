import { Router, Response } from 'express';
import { SavedActivity } from '../models/SavedActivity';
import { Activity } from '../models/Activity';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/saved (get saved activity IDs and activity objects)
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await SavedActivity.find({ userId: req.user!.uid }).sort({ createdAt: -1 });
    const activityIds = list.map((s) => s.activityId);
    const activities = await Activity.find({ activityId: { $in: activityIds } });
    res.json({ savedIds: activityIds, activities });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch saved activities' });
  }
});

// POST /api/saved/:activityId (toggle save/unsave)
router.post('/:activityId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const activityId = req.params.activityId;
    const userId = req.user!.uid;

    const existing = await SavedActivity.findOne({ userId, activityId });
    if (existing) {
      await SavedActivity.deleteOne({ userId, activityId });
      res.json({ saved: false });
    } else {
      await SavedActivity.create({
        savedId: `${userId}_${activityId}`,
        userId,
        activityId,
      });
      res.json({ saved: true });
    }
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

export default router;

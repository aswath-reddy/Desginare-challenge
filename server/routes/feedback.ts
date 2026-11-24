import { Router, Response } from 'express';
import { Feedback } from '../models/Feedback';
import { Activity } from '../models/Activity';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/feedback
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      activityId,
      attended,
      wouldAttendAlone,
      metSomeoneNew,
      comfortRating,
      wouldUseAgain,
      comments,
    } = req.body;

    const activity = await Activity.findOne({ activityId });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const feedbackId = `${activityId}_${user.uid}`;
    const feedback = await Feedback.findOneAndUpdate(
      { feedbackId },
      {
        feedbackId,
        activityId,
        userId: user.uid,
        attended: attended === true,
        wouldAttendAlone,
        metSomeoneNew: metSomeoneNew === true,
        comfortRating: Number(comfortRating) || 5,
        wouldUseAgain: wouldUseAgain === true,
        comments: (comments || '').trim(),
        isDemo: activity.isDemo,
      },
      { upsert: true, new: true }
    );

    res.status(201).json(feedback);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /api/feedback/activity/:activityId
router.get('/activity/:activityId', protect, async (req, res) => {
  try {
    const list = await Feedback.find({ activityId: req.params.activityId });
    res.json(list);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

export default router;

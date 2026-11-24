import { Router, Response } from 'express';
import { Activity } from '../models/Activity';
import { Participant } from '../models/Participant';
import { Feedback } from '../models/Feedback';
import { JoinRequest } from '../models/JoinRequest';
import { protect, adminOnly, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/admin/metrics
router.get('/metrics', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const isDemo = _req.query.isDemo === 'true';

    const [
      publishedCount,
      completedCount,
      joinRequestsCount,
      approvedRequestsCount,
      participantsCount,
      confirmedAttendanceCount,
      feedbacks,
    ] = await Promise.all([
      Activity.countDocuments({ isDemo, status: 'published' }),
      Activity.countDocuments({ isDemo, status: 'completed' }),
      JoinRequest.countDocuments(),
      JoinRequest.countDocuments({ status: 'approved' }),
      Participant.countDocuments({ membershipStatus: 'approved' }),
      Participant.countDocuments({ attendanceStatus: 'confirmed_by_host' }),
      Feedback.find({ isDemo }),
    ]);

    const totalFeedback = feedbacks.length;
    const avgComfort = totalFeedback
      ? feedbacks.reduce((acc, f) => acc + f.comfortRating, 0) / totalFeedback
      : 0;
    const metSomeoneNewCount = feedbacks.filter((f) => f.metSomeoneNew).length;
    const wouldUseAgainCount = feedbacks.filter((f) => f.wouldUseAgain).length;

    res.json({
      publishedCount,
      completedCount,
      joinRequestsCount,
      approvedRequestsCount,
      participantsCount,
      confirmedAttendanceCount,
      feedbackCount: totalFeedback,
      avgComfort: Number(avgComfort.toFixed(1)),
      metSomeoneNewPct: totalFeedback ? Math.round((metSomeoneNewCount / totalFeedback) * 100) : 0,
      wouldUseAgainPct: totalFeedback ? Math.round((wouldUseAgainCount / totalFeedback) * 100) : 0,
      feedbackItems: feedbacks.slice(-10),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch admin metrics' });
  }
});

export default router;

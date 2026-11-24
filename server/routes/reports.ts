import { Router, Response } from 'express';
import { Report } from '../models/Report';
import { protect, adminOnly, AuthRequest } from '../middleware/auth';

const router = Router();

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

// POST /api/reports (submit report)
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { targetType, targetId, activityId, reason, description } = req.body;
    if (!targetType || !targetId || !reason) {
      res.status(400).json({ error: 'targetType, targetId, and reason are required' });
      return;
    }

    const report = await Report.create({
      reportId: makeId('rep'),
      reporterId: req.user!.uid,
      targetType,
      targetId,
      activityId,
      reason: reason.trim(),
      description: (description || '').trim(),
      status: 'open',
    });

    res.status(201).json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// GET /api/reports (admin only)
router.get('/', protect, adminOnly, async (_req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// PATCH /api/reports/:reportId (admin updates status)
router.patch('/:reportId', protect, adminOnly, async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId });
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    if (req.body.status) {
      report.status = req.body.status;
      await report.save();
    }
    res.json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to update report' });
  }
});

export default router;

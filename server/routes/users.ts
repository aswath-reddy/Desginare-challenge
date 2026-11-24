import { Router, Response } from 'express';
import { User } from '../models/User';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// PATCH /api/users/me (update profile / onboarding)
router.patch('/me', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const allowedFields = [
      'displayName',
      'photoURL',
      'bio',
      'city',
      'interests',
      'socialVibe',
      'goals',
      'onboardingCompleted',
      'showCityOnProfile',
      'showActivityCounts',
      'notificationPreferences',
      'privacySettings',
    ];

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        (user as unknown as Record<string, unknown>)[key] = req.body[key];
      }
    }

    await user.save();
    res.json(user);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile';
    res.status(500).json({ error: msg });
  }
});

// GET /api/users/:uid (public profile)
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const publicProfile = {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      bio: user.bio,
      city: user.showCityOnProfile !== false ? user.city : undefined,
      interests: user.interests,
      socialVibe: user.socialVibe,
      goals: user.goals,
      hostedCount: user.showActivityCounts !== false ? user.hostedCount : 0,
      completedCount: user.showActivityCounts !== false ? user.completedCount : 0,
      createdAt: user.createdAt,
    };

    res.json(publicProfile);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users/block
router.post('/block', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { targetUid } = req.body;
    if (!targetUid) {
      res.status(400).json({ error: 'targetUid is required' });
      return;
    }
    const user = req.user!;
    if (!user.blockedUserIds.includes(targetUid)) {
      user.blockedUserIds.push(targetUid);
      await user.save();
    }
    res.json({ success: true, blockedUserIds: user.blockedUserIds });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// POST /api/users/unblock
router.post('/unblock', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { targetUid } = req.body;
    const user = req.user!;
    user.blockedUserIds = user.blockedUserIds.filter((id) => id !== targetUid);
    await user.save();
    res.json({ success: true, blockedUserIds: user.blockedUserIds });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// DELETE /api/users/account
router.delete('/account', protect, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    await User.deleteOne({ uid });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;

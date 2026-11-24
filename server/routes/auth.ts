import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'plusone_jwt_secret_dev_key_12345';

function generateToken(user: IUser): string {
  return jwt.sign(
    { uid: user.uid, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, adultConfirmed } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Please provide all required fields' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    if (!adultConfirmed) {
      res.status(400).json({ error: 'You must confirm you are 18+ and accept the guidelines' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const uid = makeId('usr');

    // Check if this should be an admin account
    const adminEmail = (process.env.ADMIN_EMAIL || 'shanmukh.patamsetti05@gmail.com').toLowerCase();
    const role = email.toLowerCase().trim() === adminEmail ? 'admin' : 'user';

    const user = await User.create({
      uid,
      email: email.toLowerCase().trim(),
      passwordHash,
      displayName: displayName.trim(),
      adultConfirmed: true,
      isVerified: true, // Auto-verified for seamless local dev; verification token can be added if needed
      role,
      city: 'New York',
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        city: user.city,
        onboardingCompleted: user.onboardingCompleted,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error during registration';
    res.status(500).json({ error: msg });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Please provide email and password' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Email or password is incorrect' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Email or password is incorrect' });
      return;
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        city: user.city,
        onboardingCompleted: user.onboardingCompleted,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error during login';
    res.status(500).json({ error: msg });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      bio: user.bio,
      city: user.city,
      interests: user.interests,
      socialVibe: user.socialVibe,
      goals: user.goals,
      onboardingCompleted: user.onboardingCompleted,
      adultConfirmed: user.adultConfirmed,
      isVerified: user.isVerified,
      hostedCount: user.hostedCount,
      completedCount: user.completedCount,
      notificationPreferences: user.notificationPreferences,
      privacySettings: user.privacySettings,
      blockedUserIds: user.blockedUserIds,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    res.status(500).json({ error: msg });
  }
});

// POST /api/auth/verify (simulate or verify email)
router.post('/verify', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    user.isVerified = true;
    await user.save();
    res.json({ success: true, isVerified: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    res.status(500).json({ error: msg });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Please enter your email' });
      return;
    }
    // Simulation for password reset in local dev
    res.json({ message: 'Password reset link sent to your email.' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

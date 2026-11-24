import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'plusone_jwt_secret_dev_key_12345';

export async function protect(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: string };
    const user = await User.findOne({ uid: decoded.uid });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Not authorized, token invalid or expired' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  const adminEmail = (process.env.ADMIN_EMAIL || 'shanmukh.patamsetti05@gmail.com').toLowerCase();
  if (req.user && (req.user.role === 'admin' || req.user.email.toLowerCase() === adminEmail)) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
}

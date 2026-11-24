import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import activityRoutes from './routes/activities';
import requestRoutes from './routes/requests';
import participantRoutes from './routes/participants';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import savedRoutes from './routes/saved';
import feedbackRoutes from './routes/feedback';
import reportRoutes from './routes/reports';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';

dotenv.config();

const app = express();

// Ensure DB is connected on each serverless invocation
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
  } catch {
    // Handled in connectDB
  }
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static directory for uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

export default app;

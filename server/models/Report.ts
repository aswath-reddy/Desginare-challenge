import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reportId: string;
  reporterId: string;
  targetType: 'user' | 'activity' | 'message';
  targetId: string;
  activityId?: string;
  reason: string;
  description: string;
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reportId: { type: String, required: true, unique: true, index: true },
    reporterId: { type: String, required: true, index: true },
    targetType: { type: String, enum: ['user', 'activity', 'message'], required: true },
    targetId: { type: String, required: true },
    activityId: { type: String },
    reason: { type: String, required: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 1000 },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
  },
  { timestamps: true }
);

ReportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);

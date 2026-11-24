import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  eventId: string;
  userId: string;
  activityId: string;
  eventType: string;
  isDemo: boolean;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true },
    activityId: { type: String, required: true },
    eventType: { type: String, required: true },
    isDemo: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

AnalyticsEventSchema.index({ isDemo: 1, createdAt: -1 });

export const AnalyticsEvent = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);

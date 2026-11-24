import mongoose, { Schema, Document } from 'mongoose';

export interface IJoinRequest extends Document {
  requestId: string;
  activityId: string;
  userId: string;
  hostId: string;
  requesterName: string;
  requesterPhotoURL?: string;
  introductoryMessage: string;
  status: 'pending' | 'approved' | 'declined' | 'withdrawn';
  createdAt: Date;
  updatedAt: Date;
}

const JoinRequestSchema = new Schema<IJoinRequest>(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    activityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    hostId: { type: String, required: true, index: true },
    requesterName: { type: String, required: true, maxlength: 80 },
    requesterPhotoURL: { type: String, maxlength: 1000 },
    introductoryMessage: { type: String, required: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'withdrawn'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

JoinRequestSchema.index({ activityId: 1, userId: 1 }, { unique: true });
JoinRequestSchema.index({ activityId: 1, createdAt: -1 });
JoinRequestSchema.index({ userId: 1, createdAt: -1 });

export const JoinRequest = mongoose.model<IJoinRequest>('JoinRequest', JoinRequestSchema);

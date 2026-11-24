import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedActivity extends Document {
  savedId: string;
  userId: string;
  activityId: string;
  createdAt: Date;
}

const SavedActivitySchema = new Schema<ISavedActivity>(
  {
    savedId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    activityId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

SavedActivitySchema.index({ userId: 1, activityId: 1 }, { unique: true });
SavedActivitySchema.index({ userId: 1, createdAt: -1 });

export const SavedActivity = mongoose.model<ISavedActivity>('SavedActivity', SavedActivitySchema);

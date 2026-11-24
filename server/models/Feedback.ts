import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
  feedbackId: string;
  activityId: string;
  userId: string;
  attended: boolean;
  wouldAttendAlone: 'yes' | 'no' | 'unsure';
  metSomeoneNew: boolean;
  comfortRating: number;
  wouldUseAgain: boolean;
  comments: string;
  isDemo: boolean;
  createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    feedbackId: { type: String, required: true, unique: true, index: true },
    activityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    attended: { type: Boolean, required: true },
    wouldAttendAlone: { type: String, enum: ['yes', 'no', 'unsure'], required: true },
    metSomeoneNew: { type: Boolean, required: true },
    comfortRating: { type: Number, min: 1, max: 5, required: true },
    wouldUseAgain: { type: Boolean, required: true },
    comments: { type: String, default: '', maxlength: 1000 },
    isDemo: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

FeedbackSchema.index({ activityId: 1, userId: 1 }, { unique: true });

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);

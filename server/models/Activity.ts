import mongoose, { Schema, Document } from 'mongoose';

export interface IRosterPreview {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: 'host' | 'participant';
}

export interface IActivity extends Document {
  activityId: string;
  hostId: string;
  hostName: string;
  hostPhotoURL?: string;
  title: string;
  description: string;
  category: string;
  coverImageURL: string;
  venueName: string;
  venueAddress: string;
  city: string;
  startAt: Date;
  endAt: Date;
  timeZone: string;
  capacity: number;
  approvedParticipantCount: number;
  estimatedCost: number;
  currency: string;
  status: 'published' | 'cancelled' | 'completed';
  isDemo: boolean;
  meetingInstructions?: string;
  whatToBring?: string;
  rosterPreviews: IRosterPreview[];
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    activityId: { type: String, required: true, unique: true, index: true },
    hostId: { type: String, required: true, index: true },
    hostName: { type: String, required: true, maxlength: 80 },
    hostPhotoURL: { type: String, maxlength: 1000 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: String, required: true },
    coverImageURL: { type: String, required: true, maxlength: 1000 },
    venueName: { type: String, required: true, maxlength: 120 },
    venueAddress: { type: String, required: true, maxlength: 200 },
    city: { type: String, required: true, index: true, maxlength: 100 },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    timeZone: { type: String, default: 'America/New_York' },
    capacity: { type: Number, required: true, min: 2, max: 50 },
    approvedParticipantCount: { type: Number, default: 1 },
    estimatedCost: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['published', 'cancelled', 'completed'],
      default: 'published',
      index: true,
    },
    isDemo: { type: Boolean, default: false, index: true },
    meetingInstructions: { type: String, default: '', maxlength: 1500 },
    whatToBring: { type: String, default: '', maxlength: 600 },
    rosterPreviews: [
      {
        uid: { type: String, required: true },
        displayName: { type: String, required: true },
        photoURL: { type: String },
        role: { type: String, enum: ['host', 'participant'], default: 'participant' },
      },
    ],
  },
  { timestamps: true }
);

ActivitySchema.index({ status: 1, startAt: 1 });
ActivitySchema.index({ hostId: 1, startAt: -1 });
ActivitySchema.index({ city: 1, status: 1, startAt: 1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);

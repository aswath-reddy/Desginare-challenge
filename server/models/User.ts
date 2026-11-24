import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  uid: string;
  email: string;
  passwordHash?: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  city: string;
  interests: string[];
  socialVibe?: string;
  goals: string[];
  onboardingCompleted: boolean;
  adultConfirmed: boolean;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  showCityOnProfile: boolean;
  showActivityCounts: boolean;
  hostedCount: number;
  completedCount: number;
  notificationPreferences: {
    joinRequests: boolean;
    activityUpdates: boolean;
    groupAnnouncements: boolean;
    feedbackReminders: boolean;
  };
  privacySettings: {
    showCityOnProfile: boolean;
    showActivityCounts: boolean;
  };
  blockedUserIds: string[];
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    photoURL: { type: String, maxlength: 1000 },
    bio: { type: String, default: '', maxlength: 500 },
    city: { type: String, default: 'New York', maxlength: 100 },
    interests: { type: [String], default: [] },
    socialVibe: { type: String, default: '', maxlength: 120 },
    goals: { type: [String], default: [] },
    onboardingCompleted: { type: Boolean, default: false },
    adultConfirmed: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    showCityOnProfile: { type: Boolean, default: true },
    showActivityCounts: { type: Boolean, default: true },
    hostedCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    notificationPreferences: {
      joinRequests: { type: Boolean, default: true },
      activityUpdates: { type: Boolean, default: true },
      groupAnnouncements: { type: Boolean, default: true },
      feedbackReminders: { type: Boolean, default: true },
    },
    privacySettings: {
      showCityOnProfile: { type: Boolean, default: true },
      showActivityCounts: { type: Boolean, default: true },
    },
    blockedUserIds: { type: [String], default: [] },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);

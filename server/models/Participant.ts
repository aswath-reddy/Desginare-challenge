import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant extends Document {
  participantId: string;
  activityId: string;
  userId: string;
  hostId: string;
  displayName: string;
  photoURL?: string;
  role: 'host' | 'participant';
  membershipStatus: 'approved' | 'left' | 'removed';
  attendanceStatus: 'pending' | 'confirmed_by_host' | 'self_reported' | 'absent';
  joinedAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    participantId: { type: String, required: true, unique: true, index: true },
    activityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    hostId: { type: String, required: true, index: true },
    displayName: { type: String, required: true, maxlength: 80 },
    photoURL: { type: String, maxlength: 1000 },
    role: { type: String, enum: ['host', 'participant'], default: 'participant' },
    membershipStatus: {
      type: String,
      enum: ['approved', 'left', 'removed'],
      default: 'approved',
      index: true,
    },
    attendanceStatus: {
      type: String,
      enum: ['pending', 'confirmed_by_host', 'self_reported', 'absent'],
      default: 'pending',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ParticipantSchema.index({ activityId: 1, userId: 1 }, { unique: true });
ParticipantSchema.index({ userId: 1, membershipStatus: 1 });
ParticipantSchema.index({ activityId: 1, membershipStatus: 1 });

export const Participant = mongoose.model<IParticipant>('Participant', ParticipantSchema);

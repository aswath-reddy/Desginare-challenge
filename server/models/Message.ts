import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  messageId: string;
  activityId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  messageText: string;
  messageType: 'user' | 'system' | 'announcement';
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    messageId: { type: String, required: true, unique: true, index: true },
    activityId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true, maxlength: 80 },
    senderPhotoURL: { type: String, maxlength: 1000 },
    messageText: { type: String, required: true, maxlength: 1500 },
    messageType: {
      type: String,
      enum: ['user', 'system', 'announcement'],
      default: 'user',
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

MessageSchema.index({ activityId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

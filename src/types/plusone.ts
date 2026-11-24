import type { Timestamp } from 'firebase/firestore';

export type ActivityCategory =
  | 'Coffee & Conversations'
  | 'Art & Culture'
  | 'Food & Dining'
  | 'Outdoor Adventures'
  | 'Movies & Entertainment'
  | 'Games & Hobbies'
  | 'Fitness & Wellness'
  | 'Networking'
  | 'Explore the City'
  | 'Something Spontaneous';

export type ActivityStatus = 'published' | 'cancelled' | 'completed';

export type JoinRequestStatus = 'pending' | 'approved' | 'declined' | 'withdrawn';

export type MembershipStatus = 'approved' | 'left' | 'removed';

export type AttendanceStatus = 'pending' | 'confirmed_by_host' | 'self_reported' | 'absent';

export type MessageType = 'user' | 'system' | 'announcement';

export type NotificationType =
  | 'join_request'
  | 'request_approved'
  | 'request_declined'
  | 'participant_withdrew'
  | 'activity_updated'
  | 'activity_cancelled'
  | 'group_announcement'
  | 'feedback_request';

export type ReportTargetType = 'user' | 'activity' | 'message';

export type ReportStatus = 'open' | 'reviewed' | 'resolved' | 'dismissed';

export type AnalyticsEventType =
  | 'activity_published'
  | 'activity_discovered'
  | 'join_requested'
  | 'request_approved'
  | 'attendance_confirmed'
  | 'attendance_self_reported'
  | 'activity_completed'
  | 'feedback_submitted';

export interface UserPublicProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  city: string;
  interests?: string[];
  socialVibe?: string;
  goals?: string[];
  onboardingCompleted: boolean;
  adultConfirmed: boolean;
  showCityOnProfile?: boolean;
  showActivityCounts?: boolean;
  hostedCount: number;
  completedCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NotificationPreferences {
  joinRequests: boolean;
  activityUpdates: boolean;
  groupAnnouncements: boolean;
  feedbackReminders: boolean;
}

export interface PrivacySettings {
  showCityOnProfile: boolean;
  showActivityCounts: boolean;
}

export interface PrivateUser {
  uid: string;
  email: string;
  notificationPreferences: NotificationPreferences;
  privacySettings: PrivacySettings;
  termsAcceptedAt: Timestamp;
  blockedUserIds: string[];
  updatedAt: Timestamp;
}

export interface Activity {
  activityId: string;
  hostId: string;
  hostName: string;
  hostPhotoURL?: string;
  title: string;
  description: string;
  category: ActivityCategory;
  coverImageURL: string;
  venueName: string;
  venueAddress: string;
  city: string;
  startAt: Timestamp;
  endAt: Timestamp;
  timeZone: string;
  capacity: number;
  approvedParticipantCount: number;
  estimatedCost: number;
  currency: string;
  status: ActivityStatus;
  isDemo: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ActivityPrivateDetails {
  activityId: string;
  hostId: string;
  meetingInstructions: string;
  whatToBring: string;
  updatedAt: Timestamp;
}

export interface RosterPreview {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: 'host' | 'participant';
}

export interface ActivityRoster {
  activityId: string;
  hostId: string;
  previews: RosterPreview[];
  updatedAt: Timestamp;
}

export interface JoinRequest {
  requestId: string;
  activityId: string;
  userId: string;
  hostId: string;
  requesterName: string;
  requesterPhotoURL?: string;
  introductoryMessage: string;
  status: JoinRequestStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Participant {
  activityId: string;
  userId: string;
  hostId: string;
  displayName: string;
  photoURL?: string;
  role: 'host' | 'participant';
  membershipStatus: MembershipStatus;
  attendanceStatus: AttendanceStatus;
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Conversation {
  conversationId: string;
  activityId: string;
  hostId: string;
  title: string;
  coverImageURL?: string;
  lastMessagePreview?: string;
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
}

export interface ChatMessage {
  messageId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  messageText: string;
  messageType: MessageType;
  createdAt: Timestamp;
}

export interface NotificationItem {
  notificationId: string;
  recipientId: string;
  senderId: string;
  activityId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
}

export interface SavedActivity {
  userId: string;
  activityId: string;
  createdAt: Timestamp;
}

export interface FeedbackSubmission {
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
  createdAt: Timestamp;
}

export interface ReportItem {
  reportId: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  activityId?: string;
  reason: string;
  description: string;
  status: ReportStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AnalyticsEvent {
  eventId: string;
  userId: string;
  activityId: string;
  eventType: AnalyticsEventType;
  isDemo: boolean;
  createdAt: Timestamp;
}

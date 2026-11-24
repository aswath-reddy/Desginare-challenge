import { DEMO_ACTIVITY_TEMPLATES } from '@/src/constants/demoData';
import { CURATED_COVER_IMAGES, VALIDATION_LIMITS } from '@/src/constants/plusone';
import { wrapDocData } from '@/src/lib/mongoDbAdapter';
import type {
  Activity,
  ActivityCategory,
  ActivityPrivateDetails,
  ActivityRoster,
  AnalyticsEventType,
  AttendanceStatus,
  FeedbackSubmission,
  JoinRequest,
  MessageType,
  NotificationType,
  Participant,
  PrivateUser,
  ReportItem,
  ReportStatus,
  ReportTargetType,
  UserPublicProfile,
} from '@/src/types/plusone';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('plusone_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function cleanText(val: string, maxLen: number): string {
  return val ? val.trim().slice(0, maxLen) : '';
}

export interface ActivityFormInput {
  title: string;
  category: ActivityCategory;
  description: string;
  coverImageURL: string;
  venueName: string;
  venueAddress: string;
  city: string;
  startAt: Date;
  endAt: Date;
  timeZone: string;
  capacity: number;
  estimatedCost: number;
  currency: string;
  meetingInstructions: string;
  whatToBring: string;
}

export async function ensureUserDocuments(
  firebaseUser: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null },
  _adultConfirmed = true,
  _fallbackDisplayName?: string
): Promise<{ publicProfile: UserPublicProfile; privateProfile: PrivateUser }> {
  const res = await fetch('/api/auth/me', { headers: getAuthHeader() });
  if (!res.ok) {
    throw new Error('Please sign in to continue.');
  }
  const data = await res.json();
  return {
    publicProfile: wrapDocData(data) as unknown as UserPublicProfile,
    privateProfile: wrapDocData(data) as unknown as PrivateUser,
  };
}

export async function saveOnboardingProfile(
  _uid: string,
  data: {
    displayName: string;
    photoURL?: string;
    city: string;
    interests: string[];
    socialVibe: string;
    goals: string[];
  }
): Promise<void> {
  const res = await fetch('/api/users/me', {
    method: 'PATCH',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, onboardingCompleted: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save onboarding profile');
  }
}

export async function updateUserProfile(
  _uid: string,
  pubPatch: Partial<UserPublicProfile>,
  privPatch?: Partial<PrivateUser>
): Promise<void> {
  const payload = { ...pubPatch, ...privPatch };
  const res = await fetch('/api/users/me', {
    method: 'PATCH',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update profile');
  }
}

export async function publishActivity(
  _host: UserPublicProfile,
  input: ActivityFormInput,
  isDemo = false
): Promise<string> {
  if (input.startAt.getTime() <= Date.now()) {
    throw new Error('Activity start time must be in the future.');
  }
  if (input.endAt.getTime() <= input.startAt.getTime()) {
    throw new Error('End time must be after start time.');
  }
  if (
    input.capacity < VALIDATION_LIMITS.CAPACITY_MIN ||
    input.capacity > VALIDATION_LIMITS.CAPACITY_MAX
  ) {
    throw new Error(
      `Capacity must be between ${VALIDATION_LIMITS.CAPACITY_MIN} and ${VALIDATION_LIMITS.CAPACITY_MAX}.`
    );
  }

  const res = await fetch('/api/activities', {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, isDemo }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to publish activity');
  }

  const data = await res.json();
  return data.activityId;
}

export async function editActivity(
  activityId: string,
  _host: UserPublicProfile,
  input: ActivityFormInput
): Promise<void> {
  const res = await fetch(`/api/activities/${activityId}`, {
    method: 'PUT',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to edit activity');
  }
}

export async function cancelActivity(activityId: string, _host: UserPublicProfile): Promise<void> {
  const res = await fetch(`/api/activities/${activityId}/cancel`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cancel activity');
  }
}

export async function completeActivity(activityId: string, _host: UserPublicProfile): Promise<void> {
  const res = await fetch(`/api/activities/${activityId}/complete`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to complete activity');
  }
}

export async function submitJoinRequest(
  activity: Activity,
  _requester: UserPublicProfile,
  introMessage: string
): Promise<void> {
  const res = await fetch('/api/requests', {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      activityId: activity.activityId,
      introductoryMessage: introMessage,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit join request');
  }
}

export async function withdrawJoinRequest(activityId: string, userId: string): Promise<void> {
  const requestId = `${activityId}_${userId}`;
  const res = await fetch(`/api/requests/${requestId}/withdraw`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to withdraw join request');
  }
}

export async function approveJoinRequest(
  activityId: string,
  requestId: string,
  _host: UserPublicProfile
): Promise<void> {
  const res = await fetch(`/api/requests/${requestId}/approve`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to approve request');
  }
}

export async function declineJoinRequest(
  _activityOrId: Activity | string,
  requestId: string,
  _requesterIdOrHost?: unknown,
  _host?: UserPublicProfile
): Promise<void> {
  const res = await fetch(`/api/requests/${requestId}/decline`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to decline request');
  }
}

export async function removeParticipant(
  activityId: string,
  targetUserId: string,
  _targetDisplayNameOrHost?: unknown,
  _host?: UserPublicProfile
): Promise<void> {
  const res = await fetch(`/api/participants/${activityId}/remove/${targetUserId}`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to remove participant');
  }
}

export async function leaveActivity(
  activityOrId: Activity | string,
  _participantUser?: UserPublicProfile,
  _displayName?: string
): Promise<void> {
  const activityId = typeof activityOrId === 'string' ? activityOrId : activityOrId.activityId;
  const res = await fetch(`/api/participants/${activityId}/leave`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to leave activity');
  }
}

export async function updateAttendanceStatus(
  activityOrId: Activity | string,
  targetUserId: string,
  _updaterOrDisplayName: unknown,
  statusOrHost: unknown,
  _isDemoOrHost?: unknown
): Promise<void> {
  const activityId = typeof activityOrId === 'string' ? activityOrId : activityOrId.activityId;
  const status = (typeof statusOrHost === 'string'
    ? statusOrHost
    : _updaterOrDisplayName) as AttendanceStatus;

  const res = await fetch(`/api/participants/${activityId}/attendance`, {
    method: 'PATCH',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId, attendanceStatus: status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update attendance');
  }
}

export async function sendGroupAnnouncement(
  activityOrId: Activity | string,
  _host: UserPublicProfile,
  announcementText: string
): Promise<void> {
  const activityId = typeof activityOrId === 'string' ? activityOrId : activityOrId.activityId;
  const res = await fetch(`/api/messages/${activityId}`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageText: announcementText, messageType: 'announcement' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to post announcement');
  }
}

export async function sendGroupMessage(
  activityOrId: Activity | string,
  _sender: UserPublicProfile,
  messageText: string,
  messageType?: MessageType
): Promise<void> {
  const activityId = typeof activityOrId === 'string' ? activityOrId : activityOrId.activityId;
  const res = await fetch(`/api/messages/${activityId}`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageText, messageType: messageType || 'user' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send message');
  }
}

export async function toggleSaveActivity(
  _userId: string,
  activityId: string,
  _currentlySaved: boolean
): Promise<void> {
  const res = await fetch(`/api/saved/${activityId}`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update bookmark');
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: getAuthHeader(),
  });
}

export async function markAllNotificationsRead(_notificationIds: string[]): Promise<void> {
  await fetch('/api/notifications/read-all', {
    method: 'PATCH',
    headers: getAuthHeader(),
  });
}

export async function submitFeedback(
  activityOrId: Activity | string,
  _userId: string,
  feedback: {
    attended: boolean;
    wouldAttendAlone: 'yes' | 'no' | 'unsure';
    metSomeoneNew: boolean;
    comfortRating: number;
    wouldUseAgain: boolean;
    comments: string;
  }
): Promise<void> {
  const activityId = typeof activityOrId === 'string' ? activityOrId : activityOrId.activityId;
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId, ...feedback }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit feedback');
  }
}

export async function submitReport(
  _reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  description: string,
  activityId?: string
): Promise<void> {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetType, targetId, reason, description, activityId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit report');
  }
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  _adminUid?: string
): Promise<void> {
  const res = await fetch(`/api/reports/${reportId}`, {
    method: 'PATCH',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update report');
  }
}

export async function adminRemoveActivity(activityId: string): Promise<void> {
  await fetch(`/api/activities/${activityId}/cancel`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
}

export async function toggleBlockUser(
  _user: unknown,
  targetUid: string,
  targetDisplayNameOrBlocked?: unknown,
  currentlyBlocked?: boolean
): Promise<void> {
  const isBlocked =
    typeof currentlyBlocked === 'boolean'
      ? currentlyBlocked
      : typeof targetDisplayNameOrBlocked === 'boolean'
      ? targetDisplayNameOrBlocked
      : false;

  const endpoint = isBlocked ? '/api/users/unblock' : '/api/users/block';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUid }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update blocked status');
  }
}

export async function recordDiscoveryEvent(
  _userId: string,
  _activityId: string,
  _isDemo: boolean
): Promise<void> {
  // Event logged on query
}

export async function deleteUserAccountData(_user: unknown, _password?: string): Promise<void> {
  const res = await fetch('/api/users/account', {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete account');
  }
}

export async function seedDemoActivities(adminProfile: UserPublicProfile): Promise<number> {
  let created = 0;
  for (const tpl of DEMO_ACTIVITY_TEMPLATES) {
    const startAt = new Date(Date.now() + tpl.startOffsetHours * 3600 * 1000);
    const endAt = new Date(startAt.getTime() + 2 * 3600 * 1000);
    try {
      await publishActivity(
        adminProfile,
        {
          title: tpl.title,
          category: tpl.category,
          description: tpl.description,
          coverImageURL: tpl.coverImageURL,
          venueName: tpl.venueName,
          venueAddress: tpl.venueAddress,
          city: tpl.city,
          startAt,
          endAt,
          timeZone: tpl.timeZone,
          capacity: tpl.capacity,
          estimatedCost: tpl.estimatedCost,
          currency: tpl.currency,
          meetingInstructions: tpl.meetingInstructions,
          whatToBring: tpl.whatToBring,
        },
        true
      );
      created++;
    } catch {
      // Continue
    }
  }
  return created;
}

export async function clearDemoActivities(): Promise<number> {
  return 0;
}

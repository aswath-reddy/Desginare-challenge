import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import { DEMO_ACTIVITY_TEMPLATES } from '@/src/constants/demoData';
import { CURATED_COVER_IMAGES, VALIDATION_LIMITS } from '@/src/constants/plusone';
import { db, googleProvider, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import type {
  Activity,
  ActivityCategory,
  ActivityPrivateDetails,
  ActivityRoster,
  AnalyticsEventType,
  AttendanceStatus,
  MessageType,
  NotificationType,
  Participant,
  PrivateUser,
  ReportStatus,
  ReportTargetType,
  UserPublicProfile,
} from '@/src/types/plusone';

function cleanText(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function ensureUserDocuments(
  firebaseUser: User,
  adultConfirmed = true,
  fallbackDisplayName?: string
): Promise<{ publicProfile: UserPublicProfile; privateProfile: PrivateUser }> {
  const uid = firebaseUser.uid;
  const publicRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'privateUsers', uid);

  try {
    const [pubSnap, privSnap] = await Promise.all([getDoc(publicRef), getDoc(privateRef)]);

    if (!pubSnap.exists()) {
      const displayName = cleanText(
        fallbackDisplayName ||
          firebaseUser.displayName ||
          firebaseUser.email?.split('@')[0] ||
          'Explorer',
        VALIDATION_LIMITS.DISPLAY_NAME_MAX
      );
      const newPublic: Record<string, unknown> = {
        uid,
        displayName,
        bio: '',
        city: 'New York',
        interests: [],
        socialVibe: '',
        goals: [],
        onboardingCompleted: false,
        adultConfirmed: adultConfirmed === true,
        hostedCount: 0,
        completedCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (firebaseUser.photoURL) {
        newPublic.photoURL = firebaseUser.photoURL.slice(0, 1000);
      }
      await setDoc(publicRef, newPublic);
    }

    if (!privSnap.exists()) {
      if (!firebaseUser.email) {
        throw new Error('A verified account email is required to initialize your profile.');
      }
      const newPrivate = {
        uid,
        email: cleanText(firebaseUser.email, 254),
        notificationPreferences: {
          joinRequests: true,
          activityUpdates: true,
          groupAnnouncements: true,
          feedbackReminders: true,
        },
        privacySettings: {
          showCityOnProfile: true,
          showActivityCounts: true,
        },
        termsAcceptedAt: serverTimestamp(),
        blockedUserIds: [],
        updatedAt: serverTimestamp(),
      };
      await setDoc(privateRef, newPrivate);
    }

    const [freshPub, freshPriv] = await Promise.all([getDoc(publicRef), getDoc(privateRef)]);
    return {
      publicProfile: freshPub.data() as UserPublicProfile,
      privateProfile: freshPriv.data() as PrivateUser,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

export async function saveOnboardingProfile(
  uid: string,
  data: {
    displayName: string;
    photoURL?: string;
    city: string;
    interests: string[];
    socialVibe: string;
    goals: string[];
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const patch: Record<string, unknown> = {
      displayName: cleanText(data.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      city: cleanText(data.city, VALIDATION_LIMITS.CITY_MAX),
      interests: data.interests.slice(0, 10),
      socialVibe: cleanText(data.socialVibe, 120),
      goals: data.goals.slice(0, 6),
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    };
    if (data.photoURL !== undefined) {
      patch.photoURL = cleanText(data.photoURL, 1000);
    }
    await updateDoc(doc(db, 'users', uid), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  publicPatch: Partial<{
    displayName: string;
    photoURL: string;
    bio: string;
    city: string;
    interests: string[];
    socialVibe: string;
    goals: string[];
  }>,
  privatePatch?: Partial<{
    notificationPreferences: PrivateUser['notificationPreferences'];
    privacySettings: PrivateUser['privacySettings'];
  }>
): Promise<void> {
  try {
    const sanitizedPub: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (publicPatch.displayName !== undefined) {
      sanitizedPub.displayName = cleanText(
        publicPatch.displayName,
        VALIDATION_LIMITS.DISPLAY_NAME_MAX
      );
    }
    if (publicPatch.photoURL !== undefined) {
      sanitizedPub.photoURL = cleanText(publicPatch.photoURL, 1000);
    }
    if (publicPatch.bio !== undefined) {
      sanitizedPub.bio = cleanText(publicPatch.bio, VALIDATION_LIMITS.BIO_MAX);
    }
    if (publicPatch.city !== undefined) {
      sanitizedPub.city = cleanText(publicPatch.city, VALIDATION_LIMITS.CITY_MAX);
    }
    if (publicPatch.interests !== undefined) {
      sanitizedPub.interests = publicPatch.interests.slice(0, 10);
    }
    if (publicPatch.socialVibe !== undefined) {
      sanitizedPub.socialVibe = cleanText(publicPatch.socialVibe, 120);
    }
    if (publicPatch.goals !== undefined) {
      sanitizedPub.goals = publicPatch.goals.slice(0, 6);
    }

    if (privatePatch?.privacySettings) {
      sanitizedPub.showCityOnProfile = privatePatch.privacySettings.showCityOnProfile;
      sanitizedPub.showActivityCounts = privatePatch.privacySettings.showActivityCounts;
    }

    await updateDoc(doc(db, 'users', uid), sanitizedPub);

    if (privatePatch) {
      await updateDoc(doc(db, 'privateUsers', uid), {
        ...privatePatch,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
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

export async function publishActivity(
  host: UserPublicProfile,
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
      `Group size must be between ${VALIDATION_LIMITS.CAPACITY_MIN} and ${VALIDATION_LIMITS.CAPACITY_MAX}.`
    );
  }

  const activityId = makeId('act');
  const batch = writeBatch(db);

  const activityDoc: Record<string, unknown> = {
    activityId,
    hostId: host.uid,
    hostName: cleanText(host.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
    title: cleanText(input.title, VALIDATION_LIMITS.TITLE_MAX),
    description: cleanText(input.description, VALIDATION_LIMITS.DESCRIPTION_MAX),
    category: input.category,
    coverImageURL: cleanText(
      input.coverImageURL || CURATED_COVER_IMAGES[0].url,
      1000
    ),
    venueName: cleanText(input.venueName, VALIDATION_LIMITS.VENUE_NAME_MAX),
    venueAddress: cleanText(input.venueAddress, VALIDATION_LIMITS.VENUE_ADDRESS_MAX),
    city: cleanText(input.city, VALIDATION_LIMITS.CITY_MAX),
    startAt: Timestamp.fromDate(input.startAt),
    endAt: Timestamp.fromDate(input.endAt),
    timeZone: cleanText(input.timeZone || 'America/New_York', 80),
    capacity: Math.floor(input.capacity),
    approvedParticipantCount: 1,
    estimatedCost: Math.max(0, Number(input.estimatedCost) || 0),
    currency: cleanText(input.currency || 'USD', 8),
    status: 'published',
    isDemo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (host.photoURL) {
    activityDoc.hostPhotoURL = host.photoURL.slice(0, 1000);
  }

  const privateDoc = {
    activityId,
    hostId: host.uid,
    meetingInstructions: cleanText(
      input.meetingInstructions,
      VALIDATION_LIMITS.INSTRUCTIONS_MAX
    ),
    whatToBring: cleanText(input.whatToBring || '', VALIDATION_LIMITS.WHAT_TO_BRING_MAX),
    updatedAt: serverTimestamp(),
  };

  const hostPreview: Record<string, unknown> = {
    uid: host.uid,
    displayName: cleanText(host.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
    role: 'host',
  };
  if (host.photoURL) hostPreview.photoURL = host.photoURL;

  const rosterDoc = {
    activityId,
    hostId: host.uid,
    previews: [hostPreview],
    updatedAt: serverTimestamp(),
  };

  const hostParticipant: Record<string, unknown> = {
    activityId,
    userId: host.uid,
    hostId: host.uid,
    displayName: cleanText(host.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
    role: 'host',
    membershipStatus: 'approved',
    attendanceStatus: 'confirmed_by_host',
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (host.photoURL) hostParticipant.photoURL = host.photoURL;

  const conversationDoc = {
    conversationId: activityId,
    activityId,
    hostId: host.uid,
    title: cleanText(input.title, VALIDATION_LIMITS.TITLE_MAX),
    coverImageURL: cleanText(
      input.coverImageURL || CURATED_COVER_IMAGES[0].url,
      1000
    ),
    lastMessagePreview: 'Plan group chat opened.',
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  };

  const eventId = makeId('evt');
  const analyticsDoc = {
    eventId,
    userId: host.uid,
    activityId,
    eventType: 'activity_published' as AnalyticsEventType,
    isDemo,
    createdAt: serverTimestamp(),
  };

  batch.set(doc(db, 'activities', activityId), activityDoc);
  batch.set(doc(db, 'activityPrivateDetails', activityId), privateDoc);
  batch.set(doc(db, 'activityRosters', activityId), rosterDoc);
  batch.set(doc(db, 'participants', `${activityId}_${host.uid}`), hostParticipant);
  batch.set(doc(db, 'conversations', activityId), conversationDoc);
  batch.set(doc(db, 'analyticsEvents', eventId), analyticsDoc);
  if (!isDemo) {
    batch.update(doc(db, 'users', host.uid), {
      hostedCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    // Create welcome system message once participant doc exists
    await sendGroupMessage(
      activityId,
      host,
      `${host.displayName} created "${cleanText(input.title, 80)}". Say hello to the group!`,
      'system'
    );
    return activityId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `activities/${activityId}`);
  }
}

export async function editActivity(
  activityId: string,
  host: UserPublicProfile,
  input: ActivityFormInput
): Promise<void> {
  if (input.endAt.getTime() <= input.startAt.getTime()) {
    throw new Error('End time must be after start time.');
  }
  try {
    const actSnap = await getDoc(doc(db, 'activities', activityId));
    if (!actSnap.exists()) throw new Error('Activity not found.');
    const existing = actSnap.data() as Activity;
    if (existing.hostId !== host.uid) throw new Error('Only the host can edit this activity.');
    if (existing.status !== 'published') {
      throw new Error('Only published activities can be edited.');
    }
    if (input.capacity < existing.approvedParticipantCount) {
      throw new Error(
        `Capacity cannot be less than current approved participants (${existing.approvedParticipantCount}).`
      );
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'activities', activityId), {
      title: cleanText(input.title, VALIDATION_LIMITS.TITLE_MAX),
      description: cleanText(input.description, VALIDATION_LIMITS.DESCRIPTION_MAX),
      category: input.category,
      coverImageURL: cleanText(input.coverImageURL, 1000),
      venueName: cleanText(input.venueName, VALIDATION_LIMITS.VENUE_NAME_MAX),
      venueAddress: cleanText(input.venueAddress, VALIDATION_LIMITS.VENUE_ADDRESS_MAX),
      city: cleanText(input.city, VALIDATION_LIMITS.CITY_MAX),
      startAt: Timestamp.fromDate(input.startAt),
      endAt: Timestamp.fromDate(input.endAt),
      timeZone: cleanText(input.timeZone || 'America/New_York', 80),
      capacity: Math.floor(input.capacity),
      estimatedCost: Math.max(0, Number(input.estimatedCost) || 0),
      currency: cleanText(input.currency || 'USD', 8),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'activityPrivateDetails', activityId), {
      meetingInstructions: cleanText(
        input.meetingInstructions,
        VALIDATION_LIMITS.INSTRUCTIONS_MAX
      ),
      whatToBring: cleanText(input.whatToBring || '', VALIDATION_LIMITS.WHAT_TO_BRING_MAX),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'conversations', activityId), {
      title: cleanText(input.title, VALIDATION_LIMITS.TITLE_MAX),
      coverImageURL: cleanText(input.coverImageURL, 1000),
      lastMessagePreview: 'Activity details updated by host.',
      lastMessageAt: serverTimestamp(),
    });

    // Notify approved participants (query by hostId to satisfy security rules)
    const partQ = query(
      collection(db, 'participants'),
      where('hostId', '==', host.uid)
    );
    const partSnaps = await getDocs(partQ);
    partSnaps.forEach((pDoc) => {
      const p = pDoc.data() as Participant;
      if (
        p.activityId === activityId &&
        p.membershipStatus === 'approved' &&
        p.userId !== host.uid
      ) {
        const nid = makeId('notif');
        batch.set(doc(db, 'notifications', nid), {
          notificationId: nid,
          recipientId: p.userId,
          senderId: host.uid,
          activityId,
          type: 'activity_updated' as NotificationType,
          title: 'Plan details updated',
          message: `${host.displayName} updated details for "${cleanText(input.title, 70)}".`,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    });

    await batch.commit();
    await sendGroupMessage(
      activityId,
      host,
      `${host.displayName} updated the activity details.`,
      'system'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `activities/${activityId}`);
  }
}

export async function cancelActivity(
  activityId: string,
  host: UserPublicProfile
): Promise<void> {
  try {
    const actRef = doc(db, 'activities', activityId);
    const actSnap = await getDoc(actRef);
    if (!actSnap.exists()) throw new Error('Activity not found.');
    const activity = actSnap.data() as Activity;
    if (activity.hostId !== host.uid) throw new Error('Only the host can cancel.');

    await sendGroupMessage(
      activityId,
      host,
      `${host.displayName} cancelled this activity.`,
      'system'
    );

    const batch = writeBatch(db);
    batch.update(actRef, { status: 'cancelled', updatedAt: serverTimestamp() });

    const partQ = query(
      collection(db, 'participants'),
      where('hostId', '==', host.uid)
    );
    const partSnaps = await getDocs(partQ);
    partSnaps.forEach((pDoc) => {
      const p = pDoc.data() as Participant;
      if (
        p.activityId === activityId &&
        p.membershipStatus === 'approved' &&
        p.userId !== host.uid
      ) {
        const nid = makeId('notif');
        batch.set(doc(db, 'notifications', nid), {
          notificationId: nid,
          recipientId: p.userId,
          senderId: host.uid,
          activityId,
          type: 'activity_cancelled' as NotificationType,
          title: 'Activity cancelled',
          message: `"${activity.title}" was cancelled by the host.`,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `activities/${activityId}`);
  }
}

export async function completeActivity(
  activityId: string,
  host: UserPublicProfile
): Promise<void> {
  try {
    const actRef = doc(db, 'activities', activityId);
    const actSnap = await getDoc(actRef);
    if (!actSnap.exists()) throw new Error('Activity not found.');
    const activity = actSnap.data() as Activity;
    if (activity.hostId !== host.uid) throw new Error('Only the host can complete.');

    const batch = writeBatch(db);
    batch.update(actRef, { status: 'completed', updatedAt: serverTimestamp() });

    const eventId = makeId('evt');
    batch.set(doc(db, 'analyticsEvents', eventId), {
      eventId,
      userId: host.uid,
      activityId,
      eventType: 'activity_completed' as AnalyticsEventType,
      isDemo: activity.isDemo,
      createdAt: serverTimestamp(),
    });

    const partQ = query(
      collection(db, 'participants'),
      where('hostId', '==', host.uid)
    );
    const partSnaps = await getDocs(partQ);
    partSnaps.forEach((pDoc) => {
      const p = pDoc.data() as Participant;
      if (
        p.activityId === activityId &&
        p.membershipStatus === 'approved' &&
        p.userId !== host.uid
      ) {
        const nid = makeId('notif');
        batch.set(doc(db, 'notifications', nid), {
          notificationId: nid,
          recipientId: p.userId,
          senderId: host.uid,
          activityId,
          type: 'feedback_request' as NotificationType,
          title: 'How did it go?',
          message: `"${activity.title}" is marked complete. Share your quick post-activity feedback.`,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    });

    await batch.commit();
    await sendGroupMessage(
      activityId,
      host,
      `${host.displayName} marked this plan as completed. Thanks for showing up!`,
      'system'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `activities/${activityId}`);
  }
}

export async function submitJoinRequest(
  activity: Activity,
  requester: UserPublicProfile,
  introductoryMessage: string
): Promise<void> {
  if (activity.hostId === requester.uid) {
    throw new Error('You cannot request to join your own activity.');
  }
  if (activity.status !== 'published') {
    throw new Error('This activity is no longer accepting requests.');
  }
  if (activity.approvedParticipantCount >= activity.capacity) {
    throw new Error('This group is already full.');
  }

  const requestId = `${activity.activityId}_${requester.uid}`;
  const reqRef = doc(db, 'joinRequests', requestId);

  try {
    const existingSnap = await getDoc(reqRef);
    const batch = writeBatch(db);

    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      if (existingData.status === 'pending') {
        throw new Error('You already have a pending request for this plan.');
      }
      if (existingData.status === 'approved') {
        throw new Error('You are already approved for this plan.');
      }
      if (existingData.status === 'declined') {
        throw new Error('Your previous request for this activity was declined.');
      }
      // If withdrawn, allow re-requesting
      batch.update(reqRef, {
        status: 'pending',
        introductoryMessage: cleanText(
          introductoryMessage,
          VALIDATION_LIMITS.INTRO_MESSAGE_MAX
        ),
        updatedAt: serverTimestamp(),
      });
    } else {
      const payload: Record<string, unknown> = {
        requestId,
        activityId: activity.activityId,
        userId: requester.uid,
        hostId: activity.hostId,
        requesterName: cleanText(
          requester.displayName,
          VALIDATION_LIMITS.DISPLAY_NAME_MAX
        ),
        introductoryMessage: cleanText(
          introductoryMessage,
          VALIDATION_LIMITS.INTRO_MESSAGE_MAX
        ),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (requester.photoURL) {
        payload.requesterPhotoURL = requester.photoURL.slice(0, 1000);
      }
      batch.set(reqRef, payload);
    }

    const notifId = makeId('notif');
    batch.set(doc(db, 'notifications', notifId), {
      notificationId: notifId,
      recipientId: activity.hostId,
      senderId: requester.uid,
      activityId: activity.activityId,
      type: 'join_request' as NotificationType,
      title: 'New join request',
      message: `${requester.displayName} requested to join "${activity.title}".`,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    const evtId = makeId('evt');
    batch.set(doc(db, 'analyticsEvents', evtId), {
      eventId: evtId,
      userId: requester.uid,
      activityId: activity.activityId,
      eventType: 'join_requested' as AnalyticsEventType,
      isDemo: activity.isDemo,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    if (err instanceof Error && !err.message.includes('permission')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `joinRequests/${requestId}`);
  }
}

export async function withdrawJoinRequest(
  activityId: string,
  userId: string
): Promise<void> {
  const requestId = `${activityId}_${userId}`;
  try {
    await updateDoc(doc(db, 'joinRequests', requestId), {
      status: 'withdrawn',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `joinRequests/${requestId}`);
  }
}

export async function approveJoinRequest(
  activityId: string,
  requestId: string,
  host: UserPublicProfile
): Promise<void> {
  try {
    let approvedRequesterName = 'A member';
    await runTransaction(db, async (tx) => {
      const actRef = doc(db, 'activities', activityId);
      const reqRef = doc(db, 'joinRequests', requestId);
      const rosterRef = doc(db, 'activityRosters', activityId);

      const [actSnap, reqSnap, rosterSnap] = await Promise.all([
        tx.get(actRef),
        tx.get(reqRef),
        tx.get(rosterRef),
      ]);

      if (!actSnap.exists() || !reqSnap.exists()) {
        throw new Error('Activity or request not found.');
      }

      const activity = actSnap.data() as Activity;
      const reqData = reqSnap.data();

      if (activity.hostId !== host.uid) {
        throw new Error('Only the activity host can approve requests.');
      }
      if (activity.status !== 'published') {
        throw new Error('Cannot approve requests for a non-active plan.');
      }
      if (reqData.status !== 'pending') {
        throw new Error('This request is no longer pending.');
      }
      if (activity.approvedParticipantCount >= activity.capacity) {
        throw new Error('This group is already at full capacity.');
      }

      approvedRequesterName = reqData.requesterName || 'Member';
      const participantRef = doc(db, 'participants', `${activityId}_${reqData.userId}`);
      const partSnap = await tx.get(participantRef);

      tx.update(reqRef, {
        status: 'approved',
        updatedAt: serverTimestamp(),
      });

      const partPayload: Record<string, unknown> = {
        activityId,
        userId: reqData.userId,
        hostId: host.uid,
        displayName: cleanText(approvedRequesterName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
        role: 'participant',
        membershipStatus: 'approved',
        attendanceStatus: 'pending',
        joinedAt: partSnap.exists() ? partSnap.data().joinedAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (reqData.requesterPhotoURL) {
        partPayload.photoURL = reqData.requesterPhotoURL;
      }

      if (partSnap.exists()) {
        tx.update(participantRef, {
          membershipStatus: 'approved',
          attendanceStatus: 'pending',
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(participantRef, partPayload);
      }

      tx.update(actRef, {
        approvedParticipantCount: activity.approvedParticipantCount + 1,
        updatedAt: serverTimestamp(),
      });

      if (rosterSnap.exists()) {
        const roster = rosterSnap.data() as ActivityRoster;
        const filtered = roster.previews.filter((p) => p.uid !== reqData.userId);
        const nextPreview: Record<string, unknown> = {
          uid: reqData.userId,
          displayName: cleanText(approvedRequesterName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
          role: 'participant',
        };
        if (reqData.requesterPhotoURL) {
          nextPreview.photoURL = reqData.requesterPhotoURL;
        }
        tx.update(rosterRef, {
          previews: [...filtered, nextPreview].slice(0, 50),
          updatedAt: serverTimestamp(),
        });
      }

      const notifId = makeId('notif');
      tx.set(doc(db, 'notifications', notifId), {
        notificationId: notifId,
        recipientId: reqData.userId,
        senderId: host.uid,
        activityId,
        type: 'request_approved' as NotificationType,
        title: "You're in!",
        message: `${host.displayName} approved your request for "${activity.title}". Meeting instructions & group chat are now unlocked.`,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      const evtId = makeId('evt');
      tx.set(doc(db, 'analyticsEvents', evtId), {
        eventId: evtId,
        userId: host.uid,
        activityId,
        eventType: 'request_approved' as AnalyticsEventType,
        isDemo: activity.isDemo,
        createdAt: serverTimestamp(),
      });
    });

    await sendGroupMessage(
      activityId,
      host,
      `${approvedRequesterName} joined the plan.`,
      'system'
    );
  } catch (err) {
    if (err instanceof Error && !err.message.includes('permission')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `joinRequests/${requestId}`);
  }
}

export async function declineJoinRequest(
  activity: Activity,
  requestId: string,
  requesterId: string,
  host: UserPublicProfile
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'joinRequests', requestId), {
      status: 'declined',
      updatedAt: serverTimestamp(),
    });
    const nid = makeId('notif');
    batch.set(doc(db, 'notifications', nid), {
      notificationId: nid,
      recipientId: requesterId,
      senderId: host.uid,
      activityId: activity.activityId,
      type: 'request_declined' as NotificationType,
      title: 'Request update',
      message: `Your request for "${activity.title}" was not approved this time.`,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `joinRequests/${requestId}`);
  }
}

export async function removeParticipant(
  activityId: string,
  targetUserId: string,
  targetName: string,
  host: UserPublicProfile
): Promise<void> {
  try {
    await runTransaction(db, async (tx) => {
      const actRef = doc(db, 'activities', activityId);
      const partRef = doc(db, 'participants', `${activityId}_${targetUserId}`);
      const reqRef = doc(db, 'joinRequests', `${activityId}_${targetUserId}`);
      const rosterRef = doc(db, 'activityRosters', activityId);

      const [actSnap, partSnap, reqSnap, rosterSnap] = await Promise.all([
        tx.get(actRef),
        tx.get(partRef),
        tx.get(reqRef),
        tx.get(rosterRef),
      ]);
      if (!actSnap.exists() || !partSnap.exists()) {
        throw new Error('Participant record not found.');
      }
      const activity = actSnap.data() as Activity;
      const participant = partSnap.data() as Participant;
      if (activity.hostId !== host.uid) throw new Error('Only the host can remove members.');
      if (participant.membershipStatus !== 'approved') return;

      tx.update(partRef, {
        membershipStatus: 'removed',
        updatedAt: serverTimestamp(),
      });
      if (reqSnap.exists() && reqSnap.data().status === 'approved') {
        tx.update(reqRef, {
          status: 'declined',
          updatedAt: serverTimestamp(),
        });
      }
      tx.update(actRef, {
        approvedParticipantCount: Math.max(1, activity.approvedParticipantCount - 1),
        updatedAt: serverTimestamp(),
      });

      if (rosterSnap.exists()) {
        const roster = rosterSnap.data() as ActivityRoster;
        tx.update(rosterRef, {
          previews: roster.previews.filter((p) => p.uid !== targetUserId),
          updatedAt: serverTimestamp(),
        });
      }

      const nid = makeId('notif');
      tx.set(doc(db, 'notifications', nid), {
        notificationId: nid,
        recipientId: targetUserId,
        senderId: host.uid,
        activityId,
        type: 'participant_withdrew' as NotificationType,
        title: 'Removed from plan',
        message: `You were removed from "${activity.title}" by the host.`,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    });

    await sendGroupMessage(
      activityId,
      host,
      `${targetName} is no longer part of this plan.`,
      'system'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `participants/${activityId}_${targetUserId}`);
  }
}

export async function leaveActivity(
  activity: Activity,
  user: UserPublicProfile
): Promise<void> {
  try {
    // Post farewell system message BEFORE revoking membership
    await sendGroupMessage(
      activity.activityId,
      user,
      `${user.displayName} left the plan.`,
      'system'
    );

    await runTransaction(db, async (tx) => {
      const actRef = doc(db, 'activities', activity.activityId);
      const partRef = doc(db, 'participants', `${activity.activityId}_${user.uid}`);
      const reqRef = doc(db, 'joinRequests', `${activity.activityId}_${user.uid}`);
      const rosterRef = doc(db, 'activityRosters', activity.activityId);

      const [actSnap, partSnap, reqSnap, rosterSnap] = await Promise.all([
        tx.get(actRef),
        tx.get(partRef),
        tx.get(reqRef),
        tx.get(rosterRef),
      ]);
      if (!actSnap.exists() || !partSnap.exists()) {
        throw new Error('Membership not found.');
      }
      const actData = actSnap.data() as Activity;
      const partData = partSnap.data() as Participant;
      if (partData.membershipStatus !== 'approved') return;

      tx.update(partRef, {
        membershipStatus: 'left',
        updatedAt: serverTimestamp(),
      });
      if (reqSnap.exists() && reqSnap.data().status === 'approved') {
        tx.update(reqRef, {
          status: 'withdrawn',
          updatedAt: serverTimestamp(),
        });
      }
      tx.update(actRef, {
        approvedParticipantCount: Math.max(1, actData.approvedParticipantCount - 1),
        updatedAt: serverTimestamp(),
      });

      if (rosterSnap.exists()) {
        const roster = rosterSnap.data() as ActivityRoster;
        tx.update(rosterRef, {
          previews: roster.previews.filter((p) => p.uid !== user.uid),
          updatedAt: serverTimestamp(),
        });
      }

      const nid = makeId('notif');
      tx.set(doc(db, 'notifications', nid), {
        notificationId: nid,
        recipientId: actData.hostId,
        senderId: user.uid,
        activityId: activity.activityId,
        type: 'participant_withdrew' as NotificationType,
        title: 'Spot opened up',
        message: `${user.displayName} left "${actData.title}".`,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `participants/${activity.activityId}_${user.uid}`);
  }
}

export async function updateAttendanceStatus(
  activityId: string,
  targetUserId: string,
  actorUid: string,
  status: AttendanceStatus,
  isDemo: boolean
): Promise<void> {
  const partId = `${activityId}_${targetUserId}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'participants', partId), {
      attendanceStatus: status,
      updatedAt: serverTimestamp(),
    });
    if (status === 'confirmed_by_host' || status === 'self_reported') {
      const evtId = makeId('evt');
      batch.set(doc(db, 'analyticsEvents', evtId), {
        eventId: evtId,
        userId: actorUid,
        activityId,
        eventType: (status === 'confirmed_by_host'
          ? 'attendance_confirmed'
          : 'attendance_self_reported') as AnalyticsEventType,
        isDemo,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `participants/${partId}`);
  }
}

export async function sendGroupAnnouncement(
  activity: Activity,
  host: UserPublicProfile,
  announcementText: string
): Promise<void> {
  const clean = cleanText(announcementText, VALIDATION_LIMITS.CHAT_MESSAGE_MAX);
  if (!clean) throw new Error('Announcement cannot be empty.');
  try {
    await sendGroupMessage(activity.activityId, host, clean, 'announcement');

    const partQ = query(
      collection(db, 'participants'),
      where('hostId', '==', host.uid)
    );
    const partSnaps = await getDocs(partQ);
    const batch = writeBatch(db);
    partSnaps.forEach((pDoc) => {
      const p = pDoc.data() as Participant;
      if (
        p.activityId === activity.activityId &&
        p.membershipStatus === 'approved' &&
        p.userId !== host.uid
      ) {
        const nid = makeId('notif');
        batch.set(doc(db, 'notifications', nid), {
          notificationId: nid,
          recipientId: p.userId,
          senderId: host.uid,
          activityId: activity.activityId,
          type: 'group_announcement' as NotificationType,
          title: `Announcement · ${activity.title}`,
          message: clean.slice(0, 350),
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${activity.activityId}`);
  }
}

export async function sendGroupMessage(
  activityId: string,
  sender: UserPublicProfile,
  messageText: string,
  messageType: MessageType = 'user'
): Promise<void> {
  const clean = cleanText(messageText, VALIDATION_LIMITS.CHAT_MESSAGE_MAX);
  if (!clean) return;
  const messageId = makeId('msg');
  try {
    const batch = writeBatch(db);
    const msgPayload: Record<string, unknown> = {
      messageId,
      senderId: sender.uid,
      senderName: cleanText(sender.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      messageText: clean,
      messageType,
      createdAt: serverTimestamp(),
    };
    if (sender.photoURL) {
      msgPayload.senderPhotoURL = sender.photoURL.slice(0, 1000);
    }

    batch.set(
      doc(db, 'conversations', activityId, 'messages', messageId),
      msgPayload
    );
    batch.update(doc(db, 'conversations', activityId), {
      lastMessagePreview: clean.slice(0, 180),
      lastMessageAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.WRITE,
      `conversations/${activityId}/messages/${messageId}`
    );
  }
}

export async function toggleSaveActivity(
  userId: string,
  activityId: string,
  currentlySaved: boolean
): Promise<void> {
  const savedId = `${userId}_${activityId}`;
  const ref = doc(db, 'savedActivities', savedId);
  try {
    if (currentlySaved) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        userId,
        activityId,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `savedActivities/${savedId}`);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function markAllNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    notificationIds.slice(0, 100).forEach((id) => {
      batch.update(doc(db, 'notifications', id), { isRead: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'notifications');
  }
}

export async function submitFeedback(
  activity: Activity,
  userId: string,
  payload: {
    attended: boolean;
    wouldAttendAlone: 'yes' | 'no' | 'unsure';
    metSomeoneNew: boolean;
    comfortRating: number;
    wouldUseAgain: boolean;
    comments: string;
  }
): Promise<void> {
  const feedbackId = `${activity.activityId}_${userId}`;
  try {
    const existing = await getDoc(doc(db, 'feedback', feedbackId));
    if (existing.exists()) {
      throw new Error('You have already submitted feedback for this activity.');
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'feedback', feedbackId), {
      feedbackId,
      activityId: activity.activityId,
      userId,
      attended: payload.attended,
      wouldAttendAlone: payload.wouldAttendAlone,
      metSomeoneNew: payload.metSomeoneNew,
      comfortRating: Math.min(5, Math.max(1, Math.round(payload.comfortRating))),
      wouldUseAgain: payload.wouldUseAgain,
      comments: cleanText(payload.comments, VALIDATION_LIMITS.FEEDBACK_COMMENTS_MAX),
      isDemo: activity.isDemo,
      createdAt: serverTimestamp(),
    });

    const evtId = makeId('evt');
    batch.set(doc(db, 'analyticsEvents', evtId), {
      eventId: evtId,
      userId,
      activityId: activity.activityId,
      eventType: 'feedback_submitted' as AnalyticsEventType,
      isDemo: activity.isDemo,
      createdAt: serverTimestamp(),
    });

    if (payload.attended && !activity.isDemo) {
      batch.update(doc(db, 'users', userId), {
        completedCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    if (err instanceof Error && !err.message.includes('permission')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.CREATE, `feedback/${feedbackId}`);
  }
}

export async function submitReport(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  description: string,
  activityId?: string
): Promise<void> {
  const reportId = makeId('rep');
  try {
    const payload: Record<string, unknown> = {
      reportId,
      reporterId,
      targetType,
      targetId: cleanText(targetId, 260),
      reason: cleanText(reason, VALIDATION_LIMITS.REPORT_REASON_MAX),
      description: cleanText(description, VALIDATION_LIMITS.REPORT_DESCRIPTION_MAX),
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (activityId) {
      payload.activityId = cleanText(activityId, 128);
    }
    await setDoc(doc(db, 'reports', reportId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
  }
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus
): Promise<void> {
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
  }
}

export async function adminRemoveActivity(activityId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'activities', activityId), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `activities/${activityId}`);
  }
}

export async function toggleBlockUser(
  currentUserId: string,
  targetUserId: string,
  currentBlocked: string[],
  shouldBlock: boolean
): Promise<string[]> {
  const next = shouldBlock
    ? Array.from(new Set([...currentBlocked, targetUserId])).slice(0, 100)
    : currentBlocked.filter((id) => id !== targetUserId);
  try {
    await updateDoc(doc(db, 'privateUsers', currentUserId), {
      blockedUserIds: next,
      updatedAt: serverTimestamp(),
    });
    return next;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `privateUsers/${currentUserId}`);
  }
}

export async function recordDiscoveryEvent(
  userId: string,
  activityId: string,
  isDemo: boolean
): Promise<void> {
  const sessionKey = `plusone_disc_${userId}_${activityId}`;
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey)) {
    return;
  }
  const eventId = `disc_${userId.slice(0, 16)}_${activityId.slice(0, 24)}_${Date.now()}`;
  try {
    await setDoc(doc(db, 'analyticsEvents', eventId), {
      eventId,
      userId,
      activityId,
      eventType: 'activity_discovered' as AnalyticsEventType,
      isDemo,
      createdAt: serverTimestamp(),
    });
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(sessionKey, '1');
    }
  } catch {
    // Non-blocking analytics
  }
}

export async function deleteUserAccountData(
  firebaseUser: User,
  password?: string
): Promise<void> {
  const uid = firebaseUser.uid;
  const lastSignInMs = firebaseUser.metadata.lastSignInTime
    ? new Date(firebaseUser.metadata.lastSignInTime).getTime()
    : 0;
  const isRecentSignIn = Date.now() - lastSignInMs < 4 * 60 * 1000;

  if (!isRecentSignIn) {
    const usesGoogle = firebaseUser.providerData.some(
      (p) => p.providerId === 'google.com'
    );
    if (usesGoogle) {
      await reauthenticateWithPopup(firebaseUser, googleProvider);
    } else if (password && firebaseUser.email) {
      const cred = EmailAuthProvider.credential(firebaseUser.email, password);
      await reauthenticateWithCredential(firebaseUser, cred);
    } else {
      throw new Error('REAUTH_REQUIRED');
    }
  }

  try {
    const [savedSnaps, notifSnaps] = await Promise.all([
      getDocs(query(collection(db, 'savedActivities'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'notifications'), where('recipientId', '==', uid))),
    ]);

    const batch = writeBatch(db);
    savedSnaps.forEach((d) => batch.delete(d.ref));
    notifSnaps.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'users', uid));
    batch.delete(doc(db, 'privateUsers', uid));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
  }

  await deleteUser(firebaseUser);
}

export async function seedDemoActivities(adminProfile: UserPublicProfile): Promise<number> {
  const now = Date.now();
  const hour = 3600 * 1000;

  const demos: ActivityFormInput[] = DEMO_ACTIVITY_TEMPLATES.map((tpl) => ({
    title: tpl.title,
    category: tpl.category,
    description: tpl.description,
    coverImageURL: tpl.coverImageURL,
    venueName: tpl.venueName,
    venueAddress: tpl.venueAddress,
    city: tpl.city,
    startAt: new Date(now + tpl.startOffsetHours * hour),
    endAt: new Date(now + (tpl.startOffsetHours + tpl.durationHours) * hour),
    timeZone: tpl.timeZone,
    capacity: tpl.capacity,
    estimatedCost: tpl.estimatedCost,
    currency: tpl.currency,
    meetingInstructions: tpl.meetingInstructions,
    whatToBring: tpl.whatToBring,
  }));

  let count = 0;
  for (const item of demos) {
    await publishActivity(adminProfile, item, true);
    count += 1;
  }
  return count;
}

export async function clearDemoActivities(): Promise<number> {
  try {
    const q = query(collection(db, 'activities'), where('isDemo', '==', true));
    const snaps = await getDocs(q);
    let count = 0;
    for (const snap of snaps.docs) {
      const id = snap.id;
      const [partSnaps, reqSnaps, msgSnaps] = await Promise.all([
        getDocs(query(collection(db, 'participants'), where('activityId', '==', id))),
        getDocs(query(collection(db, 'joinRequests'), where('activityId', '==', id))),
        getDocs(collection(db, 'conversations', id, 'messages')),
      ]);
      const batch = writeBatch(db);
      partSnaps.forEach((d) => batch.delete(d.ref));
      reqSnaps.forEach((d) => batch.delete(d.ref));
      msgSnaps.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'activities', id));
      batch.delete(doc(db, 'activityPrivateDetails', id));
      batch.delete(doc(db, 'activityRosters', id));
      batch.delete(doc(db, 'conversations', id));
      await batch.commit();
      count += 1;
    }
    return count;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'activities');
  }
}

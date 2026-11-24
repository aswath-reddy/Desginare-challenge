import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Check,
  Edit3,
  Megaphone,
  MessageSquare,
  UserMinus,
  X,
} from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { UserAvatar } from '@/src/components/EditorialImage';
import { PageSkeleton } from '@/src/components/Skeletons';
import {
  approveJoinRequest,
  cancelActivity,
  completeActivity,
  declineJoinRequest,
  removeParticipant,
  sendGroupAnnouncement,
  updateAttendanceStatus,
} from '@/src/lib/api';
import { formatActivityDate, formatActivityTimeRange } from '@/src/lib/date';
import { db, getUserFriendlyError } from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type { Activity, JoinRequest, Participant } from '@/src/types/plusone';

export function HostManagePage() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { firebaseUser, publicProfile } = useAuth();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const [announcement, setAnnouncement] = useState('');
  const [announcementSent, setAnnouncementSent] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activityId || !firebaseUser) return;
    const unsubAct = onSnapshot(
      doc(db, 'activities', activityId),
      (snap) => {
        setActivity(snap.exists() ? (snap.data() as Activity) : null);
        setLoading(false);
      },
      (err) => {
        setError(getUserFriendlyError(err, 'Unable to load activity details.'));
        setLoading(false);
      }
    );

    const unsubReqs = onSnapshot(
      query(collection(db, 'joinRequests'), where('hostId', '==', firebaseUser.uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as JoinRequest)
          .filter((r) => r.activityId === activityId);
        setRequests(list);
      },
      (err) => {
        setError(getUserFriendlyError(err, 'Unable to load join requests.'));
      }
    );

    const unsubParts = onSnapshot(
      query(collection(db, 'participants'), where('hostId', '==', firebaseUser.uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as Participant)
          .filter((p) => p.activityId === activityId);
        setParticipants(list);
      },
      (err) => {
        setError(getUserFriendlyError(err, 'Unable to load participants.'));
      }
    );

    return () => {
      unsubAct();
      unsubReqs();
      unsubParts();
    };
  }, [activityId, firebaseUser]);

  if (loading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (!activity || !firebaseUser || activity.hostId !== firebaseUser.uid) {
    return (
      <AppShell>
        <div className="bg-white border border-[#E5E3DD] rounded-[24px] p-10 text-center max-w-md mx-auto my-12 space-y-4">
          <h1 className="font-display text-2xl font-semibold">Host access only</h1>
          <p className="text-sm text-[#747474]">
            Only the creator of this activity can open the host management dashboard.
          </p>
          <Link
            to="/my-plans"
            className="inline-flex rounded-full bg-[#080808] text-[#F8F6F0] px-6 py-2.5 text-sm font-medium"
          >
            Go to My Plans
          </Link>
        </div>
      </AppShell>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const declinedRequests = requests.filter((r) => r.status === 'declined');
  const approvedMembers = participants.filter((p) => p.membershipStatus === 'approved');
  const spotsLeft = Math.max(0, activity.capacity - activity.approvedParticipantCount);

  async function handleApprove(req: JoinRequest) {
    if (!publicProfile || !activity) return;
    setBusyKey(req.requestId);
    setError('');
    try {
      await approveJoinRequest(activity.activityId, req.requestId, publicProfile);
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to approve request.'));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDecline(req: JoinRequest) {
    if (!publicProfile || !activity) return;
    setBusyKey(req.requestId);
    setError('');
    try {
      await declineJoinRequest(activity, req.requestId, req.userId, publicProfile);
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to decline request.'));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemove(member: Participant) {
    if (!publicProfile || !activity) return;
    setBusyKey(member.userId);
    setError('');
    try {
      await removeParticipant(
        activity.activityId,
        member.userId,
        member.displayName,
        publicProfile
      );
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to remove participant.'));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!publicProfile || !activity || !announcement.trim()) return;
    setBusyKey('announcement');
    setError('');
    try {
      await sendGroupAnnouncement(activity, publicProfile, announcement);
      setAnnouncement('');
      setAnnouncementSent(true);
      setTimeout(() => setAnnouncementSent(false), 3000);
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to send announcement.'));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleComplete() {
    if (!publicProfile || !activity) return;
    setBusyKey('complete');
    setError('');
    try {
      await completeActivity(activity.activityId, publicProfile);
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to mark activity completed.'));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCancel() {
    if (!publicProfile || !activity) return;
    setBusyKey('cancel');
    setError('');
    try {
      await cancelActivity(activity.activityId, publicProfile);
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to cancel activity.'));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAttendance(
    targetUserId: string,
    status: 'confirmed_by_host' | 'absent'
  ) {
    if (!firebaseUser || !activity) return;
    setError('');
    try {
      await updateAttendanceStatus(
        activity.activityId,
        targetUserId,
        firebaseUser.uid,
        status,
        activity.isDemo
      );
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to update attendance.'));
    }
  }

  return (
    <AppShell>
      <div className="space-y-8 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(`/activities/${activity.activityId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#747474] hover:text-[#080808]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to activity
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/messages/${activity.activityId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] bg-white px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Group chat
            </Link>
            {activity.status === 'published' && (
              <>
                <Link
                  to={`/activities/${activity.activityId}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] bg-white px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit details
                </Link>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={busyKey === 'complete'}
                  className="rounded-full bg-[#080808] text-[#F8F6F0] px-4 py-2 text-xs font-medium hover:bg-[#222]"
                >
                  {busyKey === 'complete' ? 'Completing...' : 'Mark completed'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={busyKey === 'cancel'}
                  className="rounded-full border border-[#FEE2E2] bg-[#FEE2E2]/60 text-[#991B1B] px-4 py-2 text-xs font-medium hover:bg-[#FEE2E2]"
                >
                  {busyKey === 'cancel' ? 'Cancelling...' : 'Cancel activity'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Overview Card */}
        <section className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#747474]">
                Host management · Status:{' '}
                <span className="text-[#080808] capitalize">{activity.status}</span>
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-[-0.025em] mt-1">
                {activity.title}
              </h1>
              <p className="text-xs text-[#747474] mt-1 tabular-nums">
                {formatActivityDate(activity.startAt)} ·{' '}
                {formatActivityTimeRange(activity.startAt, activity.endAt)} ·{' '}
                {activity.venueName}
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <p className="font-display text-2xl font-bold tabular-nums">
                {activity.approvedParticipantCount}/{activity.capacity}
              </p>
              <p className="text-xs text-[#747474] tabular-nums">
                {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} open
              </p>
            </div>
          </div>

          <div className="h-1.5 w-full bg-[#F0EEE8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#080808] transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  (activity.approvedParticipantCount / activity.capacity) * 100
                )}%`,
              }}
            />
          </div>
        </section>

        {error && (
          <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-4 py-3 rounded-xl">
            {error}
          </p>
        )}

        {/* Pending Join Requests */}
        <section className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-7 space-y-4">
          <h2 className="font-display text-lg font-semibold">
            Pending requests ({pendingRequests.length})
          </h2>

          {pendingRequests.length === 0 ? (
            <p className="text-sm text-[#747474]">
              No pending requests right now. New requests will notify you immediately.
            </p>
          ) : (
            <div className="divide-y divide-[#E5E3DD]">
              {pendingRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <Link to={`/users/${req.userId}`}>
                      <UserAvatar
                        src={req.requesterPhotoURL}
                        name={req.requesterName}
                        size="md"
                      />
                    </Link>
                    <div className="min-w-0 space-y-1">
                      <Link
                        to={`/users/${req.userId}`}
                        className="font-display font-semibold text-sm hover:underline"
                      >
                        {req.requesterName}
                      </Link>
                      <p className="text-xs text-[#747474] leading-relaxed">
                        {req.introductoryMessage || 'No intro message included.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApprove(req)}
                      disabled={busyKey === req.requestId || spotsLeft <= 0}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#080808] text-[#F8F6F0] px-4 py-2 text-xs font-medium hover:bg-[#222] disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(req)}
                      disabled={busyKey === req.requestId}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8]"
                    >
                      <X className="w-3.5 h-3.5" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Approved Participants & Attendance Confirmation */}
        <section className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-7 space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Approved participants ({approvedMembers.length})
            </h2>
            <p className="text-xs text-[#747474] mt-0.5">
              Confirm who showed up in person to record verified attendance.
            </p>
          </div>

          <div className="divide-y divide-[#E5E3DD]">
            {approvedMembers.map((member) => (
              <div
                key={member.userId}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <Link
                  to={`/users/${member.userId}`}
                  className="flex items-center gap-3 min-w-0"
                >
                  <UserAvatar
                    src={member.photoURL}
                    name={member.displayName}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#080808]">
                      {member.displayName}{' '}
                      {member.role === 'host' && (
                        <span className="text-xs text-[#747474]">(You · Host)</span>
                      )}
                    </p>
                    <p className="text-xs text-[#747474]">
                      Attendance:{' '}
                      <span className="font-medium text-[#080808]">
                        {member.attendanceStatus === 'confirmed_by_host'
                          ? 'Host-confirmed'
                          : member.attendanceStatus === 'self_reported'
                            ? 'Self-reported'
                            : member.attendanceStatus === 'absent'
                              ? 'Did not attend'
                              : 'Pending'}
                      </span>
                    </p>
                  </div>
                </Link>

                {member.role !== 'host' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAttendance(member.userId, 'confirmed_by_host')}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium border ${
                        member.attendanceStatus === 'confirmed_by_host'
                          ? 'bg-[#DCFCE7] text-[#166534] border-[#DCFCE7]'
                          : 'bg-white border-[#E5E3DD] hover:bg-[#F0EEE8]'
                      }`}
                    >
                      Confirm attended
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttendance(member.userId, 'absent')}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium border ${
                        member.attendanceStatus === 'absent'
                          ? 'bg-[#F0EEE8] text-[#747474] border-[#E5E3DD]'
                          : 'bg-white border-[#E5E3DD] hover:bg-[#F0EEE8]'
                      }`}
                    >
                      Absent
                    </button>
                    {activity.status === 'published' && (
                      <button
                        type="button"
                        onClick={() => handleRemove(member)}
                        disabled={busyKey === member.userId}
                        title="Remove participant"
                        className="p-2 rounded-full border border-[#E5E3DD] text-[#747474] hover:text-[#991B1B]"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Group Announcement */}
        {activity.status === 'published' && (
          <section className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#080808]" />
              <h2 className="font-display text-lg font-semibold">
                Send group announcement
              </h2>
            </div>
            <form onSubmit={handleAnnouncement} className="space-y-3">
              <textarea
                rows={2}
                maxLength={1500}
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="Send an important update to all approved participants (posts in chat + sends notification)..."
                className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors resize-none"
              />
              <div className="flex items-center justify-between">
                {announcementSent ? (
                  <span className="text-xs font-medium text-[#166534]">
                    Announcement sent to group!
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={busyKey === 'announcement' || !announcement.trim()}
                  className="rounded-full bg-[#080808] text-[#F8F6F0] px-5 py-2 text-xs font-medium hover:bg-[#222] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {busyKey === 'announcement' ? 'Sending...' : 'Send announcement'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Declined Requests */}
        {declinedRequests.length > 0 && (
          <section className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 space-y-3">
            <h2 className="font-display text-sm font-semibold text-[#747474]">
              Declined requests ({declinedRequests.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {declinedRequests.map((r) => (
                <span
                  key={r.requestId}
                  className="text-xs text-[#747474] bg-[#F0EEE8] px-3 py-1 rounded-full"
                >
                  {r.requesterName}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

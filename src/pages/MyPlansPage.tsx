import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  Download,
  MessageSquare,
  Settings,
  Star,
  X,
} from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { EditorialImage } from '@/src/components/EditorialImage';
import { EmptyState } from '@/src/components/EmptyState';
import { PageSkeleton } from '@/src/components/Skeletons';
import {
  leaveActivity,
  submitFeedback,
  updateAttendanceStatus,
  withdrawJoinRequest,
} from '@/src/lib/api';
import { formatActivityDate, formatActivityTimeRange } from '@/src/lib/date';
import { downloadActivityIcs } from '@/src/lib/ics';
import {
  db,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  getUserFriendlyError,
} from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type { Activity, JoinRequest, Participant } from '@/src/types/plusone';

type PlanTab = 'upcoming' | 'hosting' | 'pending' | 'completed' | 'cancelled';

export function MyPlansPage() {
  const { firebaseUser, publicProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PlanTab>('upcoming');

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [hostedActivities, setHostedActivities] = useState<Activity[]>([]);
  const [activityMap, setActivityMap] = useState<Map<string, Activity>>(new Map());
  const [feedbackIds, setFeedbackIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [snapshotsReady, setSnapshotsReady] = useState({
    parts: false,
    reqs: false,
    host: false,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  // Post-activity feedback modal
  const [feedbackTarget, setFeedbackTarget] = useState<Activity | null>(null);
  const [fbAttended, setFbAttended] = useState(true);
  const [fbAlone, setFbAlone] = useState<'yes' | 'no' | 'unsure'>('no');
  const [fbMetNew, setFbMetNew] = useState(true);
  const [fbComfort, setFbComfort] = useState(5);
  const [fbAgain, setFbAgain] = useState(true);
  const [fbComments, setFbComments] = useState('');
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbError, setFbError] = useState('');

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const unsubPart = onSnapshot(
      query(collection(db, 'participants'), where('userId', '==', uid)),
      (snap) => {
        setParticipants(snap.docs.map((d) => d.data() as Participant));
        setSnapshotsReady((s) => ({ ...s, parts: true }));
      },
      (err) => {
        setActionError(getUserFriendlyError(err, 'Unable to load your plans.'));
        setSnapshotsReady((s) => ({ ...s, parts: true }));
      }
    );

    const unsubReq = onSnapshot(
      query(collection(db, 'joinRequests'), where('userId', '==', uid)),
      (snap) => {
        setRequests(snap.docs.map((d) => d.data() as JoinRequest));
        setSnapshotsReady((s) => ({ ...s, reqs: true }));
      },
      (err) => {
        setActionError(getUserFriendlyError(err, 'Unable to load join requests.'));
        setSnapshotsReady((s) => ({ ...s, reqs: true }));
      }
    );

    const unsubHost = onSnapshot(
      query(collection(db, 'activities'), where('hostId', '==', uid)),
      (snap) => {
        setHostedActivities(snap.docs.map((d) => d.data() as Activity));
        setSnapshotsReady((s) => ({ ...s, host: true }));
      },
      (err) => {
        setActionError(getUserFriendlyError(err, 'Unable to load hosted plans.'));
        setSnapshotsReady((s) => ({ ...s, host: true }));
      }
    );

    const unsubFb = onSnapshot(
      query(collection(db, 'feedback'), where('userId', '==', uid)),
      (snap) => {
        const set = new Set<string>();
        snap.docs.forEach((d) => set.add(d.data().activityId as string));
        setFeedbackIds(set);
      },
      () => {
        // Non-fatal
      }
    );

    return () => {
      unsubPart();
      unsubReq();
      unsubHost();
      unsubFb();
    };
  }, [firebaseUser]);

  // Fetch referenced activities from participants and requests
  useEffect(() => {
    if (!snapshotsReady.parts || !snapshotsReady.reqs || !snapshotsReady.host) {
      return;
    }
    const neededIds = new Set<string>();
    participants.forEach((p) => neededIds.add(p.activityId));
    requests.forEach((r) => neededIds.add(r.activityId));

    const nextMap = new Map<string, Activity>();
    hostedActivities.forEach((a) => nextMap.set(a.activityId, a));

    const missing = Array.from(neededIds).filter((id) => !nextMap.has(id));
    if (missing.length === 0) {
      setActivityMap(nextMap);
      setLoading(false);
      return;
    }

    let cancelled = false;
    Promise.all(
      missing.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'activities', id));
          return snap.exists() ? (snap.data() as Activity) : null;
        } catch {
          return null;
        }
      })
    ).then((docs) => {
      if (cancelled) return;
      docs.forEach((a) => {
        if (a) nextMap.set(a.activityId, a);
      });
      setActivityMap(nextMap);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [participants, requests, hostedActivities, snapshotsReady]);

  const approvedIds = useMemo(() => {
    const s = new Set<string>();
    participants.forEach((p) => {
      if (p.membershipStatus === 'approved') s.add(p.activityId);
    });
    return s;
  }, [participants]);

  const participantByAct = useMemo(() => {
    const m = new Map<string, Participant>();
    participants.forEach((p) => m.set(p.activityId, p));
    return m;
  }, [participants]);

  const upcomingList = useMemo(() => {
    return Array.from(approvedIds)
      .map((id) => activityMap.get(id))
      .filter((a): a is Activity => Boolean(a && a.status === 'published'))
      .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
  }, [approvedIds, activityMap]);

  const hostingList = useMemo(() => {
    return hostedActivities
      .filter((a) => a.status === 'published')
      .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
  }, [hostedActivities]);

  const pendingList = useMemo(() => {
    return requests
      .filter((r) => r.status === 'pending')
      .map((r) => ({ request: r, activity: activityMap.get(r.activityId) }))
      .filter((item): item is { request: JoinRequest; activity: Activity } =>
        Boolean(item.activity && item.activity.status === 'published')
      );
  }, [requests, activityMap]);

  const completedList = useMemo(() => {
    return Array.from(approvedIds)
      .map((id) => activityMap.get(id))
      .filter((a): a is Activity => Boolean(a && a.status === 'completed'))
      .sort((a, b) => b.startAt.toMillis() - a.startAt.toMillis());
  }, [approvedIds, activityMap]);

  const cancelledList = useMemo(() => {
    const all = Array.from(activityMap.values()).filter(
      (a) =>
        a.status === 'cancelled' &&
        (a.hostId === firebaseUser?.uid || approvedIds.has(a.activityId))
    );
    return all.sort((a, b) => b.startAt.toMillis() - a.startAt.toMillis());
  }, [activityMap, firebaseUser?.uid, approvedIds]);

  function openFeedbackModal(activity: Activity) {
    setFbAttended(true);
    setFbAlone('no');
    setFbMetNew(true);
    setFbComfort(5);
    setFbAgain(true);
    setFbComments('');
    setFbError('');
    setFeedbackTarget(activity);
  }

  async function handleWithdraw(activityId: string) {
    if (!firebaseUser) return;
    setBusyId(activityId);
    setActionError('');
    try {
      await withdrawJoinRequest(activityId, firebaseUser.uid);
    } catch (err) {
      setActionError(getUserFriendlyError(err, 'Unable to withdraw request.'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleLeave(activity: Activity) {
    if (!publicProfile) return;
    setBusyId(activity.activityId);
    setActionError('');
    try {
      await leaveActivity(activity, publicProfile);
    } catch (err) {
      setActionError(getUserFriendlyError(err, 'Unable to leave plan.'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleSelfAttendance(activity: Activity) {
    if (!firebaseUser) return;
    setBusyId(activity.activityId);
    setActionError('');
    try {
      await updateAttendanceStatus(
        activity.activityId,
        firebaseUser.uid,
        firebaseUser.uid,
        'self_reported',
        activity.isDemo
      );
    } catch (err) {
      setActionError(getUserFriendlyError(err, 'Unable to confirm attendance.'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackTarget || !firebaseUser) return;
    setFbSubmitting(true);
    setFbError('');
    try {
      await submitFeedback(feedbackTarget, firebaseUser.uid, {
        attended: fbAttended,
        wouldAttendAlone: fbAlone,
        metSomeoneNew: fbMetNew,
        comfortRating: fbComfort,
        wouldUseAgain: fbAgain,
        comments: fbComments,
      });
      if (fbAttended) {
        const part = participantByAct.get(feedbackTarget.activityId);
        if (part && part.attendanceStatus === 'pending') {
          await updateAttendanceStatus(
            feedbackTarget.activityId,
            firebaseUser.uid,
            firebaseUser.uid,
            'self_reported',
            feedbackTarget.isDemo
          );
        }
      }
      setFeedbackTarget(null);
      setFbComments('');
    } catch (err) {
      setFbError(getUserFriendlyError(err, 'Unable to save feedback.'));
    } finally {
      setFbSubmitting(false);
    }
  }

  const tabs: Array<{ key: PlanTab; label: string; count: number }> = [
    { key: 'upcoming', label: 'Upcoming', count: upcomingList.length },
    { key: 'hosting', label: 'Hosting', count: hostingList.length },
    { key: 'pending', label: 'Pending', count: pendingList.length },
    { key: 'completed', label: 'Completed', count: completedList.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelledList.length },
  ];

  function renderPlanRow(activity: Activity, variant: PlanTab) {
    const isHost = activity.hostId === firebaseUser?.uid;
    const part = participantByAct.get(activity.activityId);
    const hasFeedback = feedbackIds.has(activity.activityId);

    return (
      <div
        key={activity.activityId}
        className="bg-white border border-[#E5E3DD] hover:border-[#080808]/30 transition-colors rounded-[20px] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-5"
      >
        <Link
          to={`/activities/${activity.activityId}`}
          className="flex items-start sm:items-center gap-4 min-w-0 flex-1"
        >
          <div className="w-24 h-20 rounded-xl overflow-hidden bg-[#F0EEE8] shrink-0">
            <EditorialImage
              src={activity.coverImageURL}
              alt={activity.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-[#747474]">
              {activity.category} · {isHost ? 'Hosting' : 'Going'}
            </p>
            <h3 className="font-display text-lg font-semibold text-[#080808] truncate">
              {activity.title}
            </h3>
            <p className="text-xs text-[#747474] tabular-nums">
              {formatActivityDate(activity.startAt)} ·{' '}
              {formatActivityTimeRange(activity.startAt, activity.endAt)} ·{' '}
              {activity.venueName}
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {variant === 'upcoming' && (
            <>
              <Link
                to={`/messages/${activity.activityId}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#080808] text-[#F8F6F0] px-4 py-2 text-xs font-medium hover:bg-[#222]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </Link>
              <button
                type="button"
                onClick={() => downloadActivityIcs(activity)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8]"
              >
                <Download className="w-3.5 h-3.5" />
                Calendar
              </button>
              {isHost ? (
                <Link
                  to={`/host/${activity.activityId}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8]"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Manage
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLeave(activity)}
                  disabled={busyId === activity.activityId}
                  className="rounded-full border border-[#E5E3DD] px-4 py-2 text-xs font-medium text-[#747474] hover:text-[#991B1B]"
                >
                  {busyId === activity.activityId ? 'Leaving...' : 'Leave'}
                </button>
              )}
            </>
          )}

          {variant === 'hosting' && (
            <>
              <Link
                to={`/host/${activity.activityId}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#080808] text-[#F8F6F0] px-4 py-2 text-xs font-medium hover:bg-[#222]"
              >
                <Settings className="w-3.5 h-3.5" />
                Host dashboard
              </Link>
              <Link
                to={`/messages/${activity.activityId}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </Link>
            </>
          )}

          {variant === 'pending' && (
            <button
              type="button"
              onClick={() => handleWithdraw(activity.activityId)}
              disabled={busyId === activity.activityId}
              className="rounded-full border border-[#E5E3DD] px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8]"
            >
              {busyId === activity.activityId ? 'Withdrawing...' : 'Withdraw request'}
            </button>
          )}

          {variant === 'completed' && !isHost && (
            <>
              {part?.attendanceStatus === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleSelfAttendance(activity)}
                  disabled={busyId === activity.activityId}
                  className="rounded-full border border-[#E5E3DD] px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8]"
                >
                  Confirm I attended
                </button>
              )}
              {hasFeedback ? (
                <span className="text-xs font-medium text-[#166534] px-3">
                  Feedback submitted
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => openFeedbackModal(activity)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#080808] text-[#F8F6F0] px-4 py-2 text-xs font-medium hover:bg-[#222]"
                >
                  <Star className="w-3.5 h-3.5" />
                  Share feedback
                </button>
              )}
            </>
          )}

          {variant === 'completed' && isHost && (
            <Link
              to={`/host/${activity.activityId}`}
              className="rounded-full border border-[#E5E3DD] px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8]"
            >
              Attendance summary
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474] mb-1">
            Schedule
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">
            My Plans
          </h1>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap tabular-nums transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[#080808] text-[#F8F6F0]'
                  : 'bg-white border border-[#E5E3DD] text-[#080808] hover:bg-[#F0EEE8]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {actionError && (
          <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-4 py-3 rounded-xl">
            {actionError}
          </p>
        )}

        {loading ? (
          <PageSkeleton />
        ) : (
          <div className="space-y-4">
            {activeTab === 'upcoming' &&
              (upcomingList.length > 0 ? (
                upcomingList.map((a) => renderPlanRow(a, 'upcoming'))
              ) : (
                <EmptyState
                  icon={CalendarCheck}
                  title="No upcoming plans yet"
                  description="Find an activity nearby and request to join, or publish a plan of your own."
                  actionLabel="Discover activities"
                  onAction={() => navigate('/discover')}
                  secondaryLabel="Create a plan"
                  onSecondaryAction={() => navigate('/create')}
                />
              ))}

            {activeTab === 'hosting' &&
              (hostingList.length > 0 ? (
                hostingList.map((a) => renderPlanRow(a, 'hosting'))
              ) : (
                <EmptyState
                  icon={CalendarCheck}
                  title="You aren't hosting any active plans"
                  description="Got an exhibition, cafe, or hike in mind? Put it on the calendar and see who joins."
                  actionLabel="Create a plan"
                  onAction={() => navigate('/create')}
                />
              ))}

            {activeTab === 'pending' &&
              (pendingList.length > 0 ? (
                pendingList.map(({ activity }) => renderPlanRow(activity, 'pending'))
              ) : (
                <EmptyState
                  icon={CalendarCheck}
                  title="No pending join requests"
                  description="When you request to join an activity, it will appear here until the host responds."
                  actionLabel="Discover activities"
                  onAction={() => navigate('/discover')}
                />
              ))}

            {activeTab === 'completed' &&
              (completedList.length > 0 ? (
                completedList.map((a) => renderPlanRow(a, 'completed'))
              ) : (
                <EmptyState
                  icon={CalendarCheck}
                  title="No completed plans yet"
                  description="Plans you attend will appear here once the host marks them completed."
                />
              ))}

            {activeTab === 'cancelled' &&
              (cancelledList.length > 0 ? (
                cancelledList.map((a) => renderPlanRow(a, 'cancelled'))
              ) : (
                <EmptyState
                  icon={CalendarCheck}
                  title="No cancelled plans"
                  description="Any cancelled activities you hosted or joined would appear here."
                />
              ))}
          </div>
        )}
      </div>

      {/* Post-Activity Feedback Modal */}
      {feedbackTarget && (
        <div
          className="fixed inset-0 z-50 bg-[#080808]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fb-modal-title"
        >
          <div className="bg-white border border-[#E5E3DD] rounded-[24px] max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="fb-modal-title"
                  className="font-display text-xl font-semibold tracking-[-0.02em]"
                >
                  How did it go?
                </h2>
                <p className="text-xs text-[#747474] mt-0.5">{feedbackTarget.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackTarget(null)}
                className="p-1.5 rounded-full hover:bg-[#F0EEE8]"
                aria-label="Close feedback modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium mb-2">Did you attend this activity?</p>
                <div className="flex gap-2">
                  {[
                    { label: 'Yes, I went', val: true },
                    { label: 'No, I could not make it', val: false },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => setFbAttended(opt.val)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium border ${
                        fbAttended === opt.val
                          ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                          : 'bg-white border-[#E5E3DD]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-2">
                  Would you have attended without PlusOne?
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { label: 'No, needed company', val: 'no' },
                      { label: 'Yes, would have gone alone', val: 'yes' },
                      { label: 'Not sure', val: 'unsure' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setFbAlone(opt.val)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium border ${
                        fbAlone === opt.val
                          ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                          : 'bg-white border-[#E5E3DD]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-2">Did you meet someone new?</p>
                <div className="flex gap-2">
                  {[
                    { label: 'Yes', val: true },
                    { label: 'No', val: false },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => setFbMetNew(opt.val)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium border ${
                        fbMetNew === opt.val
                          ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                          : 'bg-white border-[#E5E3DD]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-2">
                  How comfortable did you feel during the experience? (1–5)
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFbComfort(rating)}
                      className={`w-10 h-10 rounded-full text-xs font-semibold tabular-nums border ${
                        fbComfort === rating
                          ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                          : 'bg-white border-[#E5E3DD]'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-2">Would you use PlusOne again?</p>
                <div className="flex gap-2">
                  {[
                    { label: 'Yes', val: true },
                    { label: 'Not sure / No', val: false },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => setFbAgain(opt.val)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium border ${
                        fbAgain === opt.val
                          ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                          : 'bg-white border-[#E5E3DD]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="fb-comments"
                  className="block text-xs font-medium mb-1.5"
                >
                  What could make the experience better?
                </label>
                <textarea
                  id="fb-comments"
                  rows={3}
                  maxLength={1000}
                  value={fbComments}
                  onChange={(e) => setFbComments(e.target.value)}
                  placeholder="Share honest feedback (kept private unless you consent)..."
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-3.5 py-2.5 text-sm focus:bg-white resize-none"
                />
              </div>

              {fbError && (
                <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2 rounded-lg">
                  {fbError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFeedbackTarget(null)}
                  className="rounded-full border border-[#E5E3DD] px-5 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fbSubmitting}
                  className="rounded-full bg-[#080808] text-[#F8F6F0] px-6 py-2 text-xs font-medium hover:bg-[#222] disabled:opacity-50"
                >
                  {fbSubmitting ? 'Submitting...' : 'Submit feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

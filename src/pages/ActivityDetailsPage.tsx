import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Check,
  Download,
  Flag,
  Lock,
  MapPin,
  MessageSquare,
  Share2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { EditorialImage, UserAvatar } from '@/src/components/EditorialImage';
import { ReportModal } from '@/src/components/ReportModal';
import { PageSkeleton } from '@/src/components/Skeletons';
import { getDemoPreviewById, isLocalDemoPreviewId } from '@/src/constants/demoData';
import {
  formatActivityDate,
  formatActivityTimeRange,
  isPastActivity,
} from '@/src/lib/date';
import {
  leaveActivity,
  recordDiscoveryEvent,
  submitJoinRequest,
  toggleSaveActivity,
  withdrawJoinRequest,
} from '@/src/lib/api';
import { downloadActivityIcs } from '@/src/lib/ics';
import {
  db,
  doc,
  onSnapshot,
  getUserFriendlyError,
  OperationType,
  handleFirestoreError,
} from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type {
  Activity,
  ActivityPrivateDetails,
  ActivityRoster,
  JoinRequest,
  Participant,
} from '@/src/types/plusone';

export function ActivityDetailsPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { firebaseUser, publicProfile, savedActivityIds } = useAuth();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [roster, setRoster] = useState<ActivityRoster | null>(null);
  const [privateDetails, setPrivateDetails] = useState<ActivityPrivateDetails | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [joinRequest, setJoinRequest] = useState<JoinRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [introMessage, setIntroMessage] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isLocalPreview = isLocalDemoPreviewId(activityId);

  useEffect(() => {
    if (!activityId) return;
    if (isLocalPreview) {
      const preview = getDemoPreviewById(activityId, publicProfile?.city);
      if (preview) {
        setActivity(preview.activity);
        setRoster(preview.roster);
        setPrivateDetails(preview.privateDetails);
        setNotFound(false);
      } else {
        setActivity(null);
        setRoster(null);
        setPrivateDetails(null);
        setNotFound(true);
      }
      setParticipant(null);
      setJoinRequest(null);
      setLoading(false);
      setLoadError('');
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'activities', activityId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setActivity(null);
        } else {
          const data = snap.data() as Activity;
          setActivity(data);
          setNotFound(false);
          if (
            firebaseUser &&
            firebaseUser.emailVerified &&
            data.hostId !== firebaseUser.uid
          ) {
            void recordDiscoveryEvent(firebaseUser.uid, activityId, data.isDemo);
          }
        }
        setLoading(false);
        setLoadError('');
      },
      (err) => {
        setLoading(false);
        setLoadError(getUserFriendlyError(err, 'Unable to load activity details.'));
        try {
          handleFirestoreError(err, OperationType.GET, `activities/${activityId}`);
        } catch {
          // Logged for telemetry; UI shows loadError cleanly
        }
      }
    );
    return () => unsub();
  }, [activityId, firebaseUser, isLocalPreview, publicProfile?.city]);

  useEffect(() => {
    if (!activityId || isLocalPreview) return;
    const unsubRoster = onSnapshot(
      doc(db, 'activityRosters', activityId),
      (snap) => {
        if (snap.exists()) setRoster(snap.data() as ActivityRoster);
      },
      () => {
        // Non-fatal
      }
    );
    return () => unsubRoster();
  }, [activityId, isLocalPreview]);

  useEffect(() => {
    if (!activityId || !firebaseUser || isLocalPreview) return;
    const uid = firebaseUser.uid;
    const unsubPart = onSnapshot(
      doc(db, 'participants', `${activityId}_${uid}`),
      (snap) => {
        setParticipant(snap.exists() ? (snap.data() as Participant) : null);
      },
      () => setParticipant(null)
    );
    const unsubReq = onSnapshot(
      doc(db, 'joinRequests', `${activityId}_${uid}`),
      (snap) => {
        setJoinRequest(snap.exists() ? (snap.data() as JoinRequest) : null);
      },
      () => setJoinRequest(null)
    );
    return () => {
      unsubPart();
      unsubReq();
    };
  }, [activityId, firebaseUser, isLocalPreview]);

  const isVerifiedUser = Boolean(firebaseUser && firebaseUser.emailVerified && publicProfile);
  const isHost = Boolean(firebaseUser && activity && firebaseUser.uid === activity.hostId);
  const isApproved =
    isHost || participant?.membershipStatus === 'approved';

  useEffect(() => {
    if (isLocalPreview) return;
    if (!activityId || !firebaseUser?.emailVerified || !isApproved) {
      setPrivateDetails(null);
      return;
    }
    const unsubPriv = onSnapshot(
      doc(db, 'activityPrivateDetails', activityId),
      (snap) => {
        setPrivateDetails(snap.exists() ? (snap.data() as ActivityPrivateDetails) : null);
      },
      () => {
        setPrivateDetails(null);
      }
    );
    return () => unsubPriv();
  }, [activityId, firebaseUser?.emailVerified, isApproved, isLocalPreview]);

  if (loading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="bg-white border border-[#E5E3DD] rounded-[24px] p-10 text-center max-w-lg mx-auto my-12 space-y-4">
          <h1 className="font-display text-2xl font-semibold">Unable to load activity</h1>
          <p className="text-sm text-[#747474]">{loadError}</p>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] px-6 py-2.5 text-sm font-medium"
          >
            Back to Discover
          </Link>
        </div>
      </AppShell>
    );
  }

  if (notFound || !activity) {
    return (
      <AppShell>
        <div className="bg-white border border-[#E5E3DD] rounded-[24px] p-10 text-center max-w-lg mx-auto my-12 space-y-4">
          <h1 className="font-display text-2xl font-semibold">Activity not found</h1>
          <p className="text-sm text-[#747474]">
            This plan may have been removed or the link is incorrect.
          </p>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] px-6 py-2.5 text-sm font-medium"
          >
            Back to Discover
          </Link>
        </div>
      </AppShell>
    );
  }

  const spotsLeft = Math.max(0, activity.capacity - activity.approvedParticipantCount);
  const expired = isPastActivity(activity.endAt);
  const isSaved = savedActivityIds.has(activity.activityId);
  const reqStatus = joinRequest?.status;
  const currencyPrefix =
    activity.currency === 'GBP'
      ? '£'
      : activity.currency === 'EUR'
      ? '€'
      : activity.currency === 'CAD'
      ? 'CA$'
      : '$';

  async function handleRequestJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!publicProfile || !activity) return;
    setActionBusy(true);
    setActionError('');
    try {
      await submitJoinRequest(activity, publicProfile, introMessage);
      setJoinModalOpen(false);
      setIntroMessage('');
    } catch (err) {
      setActionError(getUserFriendlyError(err, 'Unable to submit request.'));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleWithdraw() {
    if (!firebaseUser || !activity) return;
    setActionBusy(true);
    setActionError('');
    try {
      await withdrawJoinRequest(activity.activityId, firebaseUser.uid);
    } catch (err) {
      setActionError(getUserFriendlyError(err, 'Unable to withdraw request.'));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleLeave() {
    if (!publicProfile || !activity) return;
    setActionBusy(true);
    setActionError('');
    try {
      await leaveActivity(activity, publicProfile);
    } catch (err) {
      setActionError(getUserFriendlyError(err, 'Unable to leave plan.'));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleToggleSave() {
    if (!firebaseUser || !activity || saveBusy) return;
    setSaveBusy(true);
    setActionError('');
    try {
      await toggleSaveActivity(firebaseUser.uid, activity.activityId, isSaved);
    } catch (err) {
      setActionError(getUserFriendlyError(err, 'Unable to update saved status.'));
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      setActionError('Unable to copy link automatically. Please copy the page URL.');
    }
  }

  function renderPrimaryAction() {
    if (!activity) return null;
    if (isLocalPreview) {
      return (
        <Link
          to={isVerifiedUser ? '/create' : '/auth?mode=signup'}
          className="w-full inline-flex items-center justify-center rounded-full bg-[#080808] text-[#F8F6F0] py-3 px-6 text-sm font-medium hover:bg-[#222] transition-colors"
        >
          {isVerifiedUser ? 'Host a plan here' : 'Sign in to host'}
        </Link>
      );
    }
    if (!firebaseUser) {
      return (
        <Link
          to="/auth?mode=signup"
          className="w-full inline-flex items-center justify-center rounded-full bg-[#080808] text-[#F8F6F0] py-3 px-6 text-sm font-medium hover:bg-[#222]"
        >
          Sign in to join
        </Link>
      );
    }
    if (!firebaseUser.emailVerified) {
      return (
        <Link
          to="/auth?mode=verify"
          className="w-full inline-flex items-center justify-center rounded-full bg-[#080808] text-[#F8F6F0] py-3 px-6 text-sm font-medium hover:bg-[#222]"
        >
          Verify email to join
        </Link>
      );
    }
    if (!isVerifiedUser) {
      return (
        <div className="w-full rounded-full bg-[#F0EEE8] text-[#747474] py-3 px-6 text-sm font-medium text-center">
          Loading profile...
        </div>
      );
    }
    if (isHost) {
      return (
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          <Link
            to={`/host/${activity.activityId}`}
            className="flex-1 inline-flex items-center justify-center rounded-full bg-[#080808] text-[#F8F6F0] py-3 px-5 text-sm font-medium hover:bg-[#222]"
          >
            Manage activity
          </Link>
          <Link
            to={`/messages/${activity.activityId}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E3DD] bg-white py-3 px-5 text-sm font-medium hover:bg-[#F0EEE8]"
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </Link>
        </div>
      );
    }
    if (activity.status === 'cancelled') {
      return (
        <button
          type="button"
          disabled
          className="w-full rounded-full bg-[#FEE2E2] text-[#991B1B] py-3 px-6 text-sm font-medium cursor-not-allowed"
        >
          Activity cancelled
        </button>
      );
    }
    if (activity.status === 'completed' || expired) {
      return (
        <button
          type="button"
          disabled
          className="w-full rounded-full bg-[#F0EEE8] text-[#747474] py-3 px-6 text-sm font-medium cursor-not-allowed"
        >
          {activity.status === 'completed' ? 'Activity completed' : 'Activity ended'}
        </button>
      );
    }
    if (isApproved) {
      return (
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          <Link
            to={`/messages/${activity.activityId}`}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] py-3 px-5 text-sm font-medium hover:bg-[#222]"
          >
            <MessageSquare className="w-4 h-4" />
            Open group chat
          </Link>
          <button
            type="button"
            onClick={handleLeave}
            disabled={actionBusy}
            className="rounded-full border border-[#E5E3DD] bg-white py-3 px-5 text-sm font-medium text-[#080808] hover:bg-[#F0EEE8]"
          >
            {actionBusy ? 'Leaving...' : 'Leave plan'}
          </button>
        </div>
      );
    }
    if (reqStatus === 'pending') {
      return (
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          <div className="flex-1 inline-flex items-center justify-center rounded-full bg-[#FEF3C7] text-[#92400E] py-3 px-5 text-sm font-medium">
            Request pending
          </div>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={actionBusy}
            className="rounded-full border border-[#E5E3DD] bg-white py-3 px-5 text-sm font-medium hover:bg-[#F0EEE8]"
          >
            {actionBusy ? 'Withdrawing...' : 'Withdraw'}
          </button>
        </div>
      );
    }
    if (reqStatus === 'declined') {
      return (
        <div className="w-full rounded-full bg-[#F0EEE8] text-[#747474] py-3 px-5 text-sm font-medium text-center">
          Request declined by host
        </div>
      );
    }
    if (spotsLeft <= 0) {
      return (
        <button
          type="button"
          disabled
          className="w-full rounded-full bg-[#F0EEE8] text-[#747474] py-3 px-6 text-sm font-medium cursor-not-allowed"
        >
          Group full
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => {
          setActionError('');
          setJoinModalOpen(true);
        }}
        className="w-full rounded-full bg-[#080808] text-[#F8F6F0] py-3.5 px-6 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all cursor-pointer"
      >
        Count me in
      </button>
    );
  }

  return (
    <AppShell>
      <div className="space-y-7 pb-20 lg:pb-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#747474] hover:text-[#080808] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {isVerifiedUser && !isLocalPreview && (
              <button
                type="button"
                onClick={handleToggleSave}
                disabled={saveBusy}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium active:scale-[0.97] disabled:opacity-50 transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                    : 'bg-white border-[#E5E3DD] text-[#080808] hover:bg-[#F0EEE8]'
                }`}
              >
                <Bookmark
                  className="w-3.5 h-3.5"
                  fill={isSaved ? 'currentColor' : 'none'}
                />
                {isSaved ? 'Saved' : 'Save'}
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] bg-white px-4 py-1.5 text-xs font-medium hover:bg-[#F0EEE8] active:scale-[0.97] transition-all cursor-pointer"
            >
              {copiedShare ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#166534]" />
                  Copied
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </>
              )}
            </button>
            {isVerifiedUser && !isHost && !isLocalPreview && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                aria-label="Report activity"
                className="inline-flex items-center gap-1 rounded-full border border-[#E5E3DD] bg-white px-3.5 py-1.5 text-xs font-medium text-[#747474] hover:text-[#991B1B] active:scale-[0.97] transition-all cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                Report
              </button>
            )}
          </div>
        </div>

        {actionError && !joinModalOpen && (
          <p
            role="alert"
            className="lg:hidden text-xs text-[#991B1B] bg-[#FEE2E2] px-3.5 py-2.5 rounded-xl"
          >
            {actionError}
          </p>
        )}

        {/* Cover Hero */}
        <div className="aspect-[16/9] max-h-[460px] w-full rounded-[24px] overflow-hidden border border-[#E5E3DD] bg-[#F0EEE8]">
          <EditorialImage
            src={activity.coverImageURL}
            alt={activity.title}
            fallbackTitle={activity.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Main 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#747474]">
                <span>{activity.category}</span>
                <span aria-hidden="true">·</span>
                <span>{activity.city}</span>
                {activity.isDemo && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#080808]">Demo preview</span>
                  </>
                )}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.08] text-balance">
                {activity.title}
              </h1>
              {activity.isDemo && (
                <p className="text-xs text-[#747474] bg-[#F0EEE8] border border-[#E5E3DD] rounded-xl px-3.5 py-2 inline-block">
                  Demo preview listing — excluded from real pilot participation metrics.
                </p>
              )}
            </div>

            {/* Host Card */}
            {isLocalPreview ? (
              <div className="flex items-center justify-between bg-white border border-[#E5E3DD] rounded-[20px] p-4">
                <div className="flex items-center gap-3.5">
                  <UserAvatar
                    src={activity.hostPhotoURL}
                    name={activity.hostName}
                    size="md"
                  />
                  <div>
                    <p className="text-xs text-[#747474]">Sample host</p>
                    <p className="font-display font-semibold text-base text-[#080808]">
                      {activity.hostName}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-[#747474]">Demo preview</span>
              </div>
            ) : (
              <Link
                to={`/users/${activity.hostId}`}
                className="flex items-center justify-between bg-white border border-[#E5E3DD] rounded-[20px] p-4 hover:border-[#080808]/40 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <UserAvatar
                    src={activity.hostPhotoURL}
                    name={activity.hostName}
                    size="md"
                  />
                  <div>
                    <p className="text-xs text-[#747474]">Hosted by</p>
                    <p className="font-display font-semibold text-base text-[#080808]">
                      {activity.hostName}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-[#747474]">View profile →</span>
              </Link>
            )}

            {/* What to expect */}
            <section className="space-y-3">
              <h2 className="font-display text-xl font-semibold">What to expect</h2>
              <p className="text-sm sm:text-base text-[#080808]/85 leading-relaxed whitespace-pre-line">
                {activity.description}
              </p>
            </section>

            {/* Meeting Instructions (Host & Approved Only) */}
            <section className="bg-white border border-[#E5E3DD] rounded-[20px] p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  Meeting instructions
                </h2>
                {!isApproved && <Lock className="w-4 h-4 text-[#747474]" />}
              </div>

              {isLocalPreview && privateDetails ? (
                <div className="space-y-3 text-sm">
                  <p className="text-xs text-[#747474]">
                    Sample preview — on live community plans, exact instructions unlock after host approval.
                  </p>
                  <p className="text-[#080808] leading-relaxed">
                    {privateDetails.meetingInstructions}
                  </p>
                  {privateDetails.whatToBring && (
                    <div className="pt-3 border-t border-[#E5E3DD]">
                      <p className="text-xs font-medium text-[#747474] mb-1">
                        What to bring
                      </p>
                      <p className="text-[#080808]">{privateDetails.whatToBring}</p>
                    </div>
                  )}
                </div>
              ) : isApproved ? (
                privateDetails ? (
                  <div className="space-y-3 text-sm">
                    <p className="text-[#080808] leading-relaxed">
                      {privateDetails.meetingInstructions}
                    </p>
                    {privateDetails.whatToBring && (
                      <div className="pt-3 border-t border-[#E5E3DD]">
                        <p className="text-xs font-medium text-[#747474] mb-1">
                          What to bring
                        </p>
                        <p className="text-[#080808]">{privateDetails.whatToBring}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#747474]">Loading meeting instructions...</p>
                )
              ) : (
                <p className="text-sm text-[#747474] leading-relaxed">
                  Exact meetup spot instructions and group chat are private to the host
                  and approved participants. Request to join to unlock them.
                </p>
              )}
            </section>

            {/* Approved Participant Previews */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  Who&apos;s going ({activity.approvedParticipantCount}/{activity.capacity})
                </h2>
                <span className="text-xs text-[#747474] tabular-nums">
                  {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} remaining
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {(roster?.previews || [
                  {
                    uid: activity.hostId,
                    displayName: activity.hostName,
                    photoURL: activity.hostPhotoURL,
                    role: 'host' as const,
                  },
                ]).map((p) =>
                  isLocalPreview ? (
                    <span
                      key={p.uid}
                      className="inline-flex items-center gap-2 bg-white border border-[#E5E3DD] rounded-full pl-1.5 pr-3.5 py-1.5 text-xs font-medium"
                    >
                      <UserAvatar src={p.photoURL} name={p.displayName} size="xs" />
                      <span>{p.displayName.split(' ')[0]}</span>
                      {p.role === 'host' && (
                        <span className="text-[#747474]">· Host</span>
                      )}
                    </span>
                  ) : (
                    <Link
                      key={p.uid}
                      to={`/users/${p.uid}`}
                      className="inline-flex items-center gap-2 bg-white border border-[#E5E3DD] rounded-full pl-1.5 pr-3.5 py-1.5 text-xs font-medium hover:border-[#080808]"
                    >
                      <UserAvatar src={p.photoURL} name={p.displayName} size="xs" />
                      <span>{p.displayName.split(' ')[0]}</span>
                      {p.role === 'host' && (
                        <span className="text-[#747474]">· Host</span>
                      )}
                    </Link>
                  )
                )}
              </div>
            </section>

            {/* Safety Reminder */}
            <div className="bg-[#F0EEE8] border border-[#E5E3DD] rounded-[18px] p-5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#080808] shrink-0 mt-0.5" />
              <div className="text-xs text-[#747474] leading-relaxed">
                <p className="font-semibold text-[#080808] mb-0.5">
                  Safety reminder
                </p>
                Meet in public spaces, stay with the group, and tell someone you trust
                where you are going.{' '}
                <Link to="/safety" className="underline text-[#080808]">
                  Safety Center
                </Link>
              </div>
            </div>
          </div>

          {/* Right Sticky Logistics Sidebar */}
          <aside className="lg:col-span-5 lg:sticky lg:top-8">
            <div className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-7 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-[#080808] mt-1 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      {formatActivityDate(activity.startAt)}
                    </p>
                    <p className="text-xs text-[#747474] tabular-nums">
                      {formatActivityTimeRange(activity.startAt, activity.endAt)} (
                      {activity.timeZone})
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#080808] mt-1 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{activity.venueName}</p>
                    <p className="text-xs text-[#747474]">
                      {activity.venueAddress}, {activity.city}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-[#080808] mt-1 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold tabular-nums">
                      {activity.approvedParticipantCount} of {activity.capacity} spots filled
                    </p>
                    <p className="text-xs text-[#747474]">
                      {activity.estimatedCost <= 0
                        ? 'Free activity · Adults 18+'
                        : `Estimated ${currencyPrefix}${activity.estimatedCost} per person · Pay venue directly`}
                    </p>
                  </div>
                </div>
              </div>

              {actionError && (
                <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3.5 py-2.5 rounded-xl">
                  {actionError}
                </p>
              )}

              <div className="space-y-3 pt-2 border-t border-[#E5E3DD]">
                {isLocalPreview && (
                  <p className="text-xs text-[#747474] leading-relaxed">
                    This is a curated demo preview for {activity.city}. Join requests and group chat run on live community plans.
                  </p>
                )}
                {renderPrimaryAction()}

                {isApproved && !isLocalPreview && (
                  <button
                    type="button"
                    onClick={() => downloadActivityIcs(activity)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E3DD] py-2.5 text-xs font-medium text-[#080808] hover:bg-[#F0EEE8]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Add to calendar (.ics)
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar (compact <= 64px) */}
      <div className="lg:hidden fixed bottom-16 inset-x-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#E5E3DD] px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{activity.title}</p>
          <p className="text-[11px] text-[#747474] tabular-nums">
            {spotsLeft} spots left ·{' '}
            {activity.estimatedCost <= 0
              ? 'Free'
              : `${currencyPrefix}${activity.estimatedCost} est.`}
          </p>
        </div>
        <div className="w-40 sm:w-44 shrink-0">{renderPrimaryAction()}</div>
      </div>

      {/* Join Request Modal */}
      {joinModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#080808]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-modal-title"
        >
          <div className="bg-white border border-[#E5E3DD] rounded-[24px] max-w-md w-full p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="join-modal-title"
                  className="font-display text-xl font-semibold tracking-[-0.02em]"
                >
                  Request to join
                </h2>
                <p className="text-xs text-[#747474] mt-1">{activity.title}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionError('');
                  setJoinModalOpen(false);
                }}
                className="p-2 -mr-1.5 rounded-full hover:bg-[#F0EEE8] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestJoin} className="space-y-4">
              <div>
                <label
                  htmlFor="intro-msg"
                  className="block text-xs font-medium text-[#080808] mb-1.5"
                >
                  Introduce yourself to {activity.hostName} (optional)
                </label>
                <textarea
                  id="intro-msg"
                  rows={3}
                  maxLength={500}
                  value={introMessage}
                  onChange={(e) => setIntroMessage(e.target.value)}
                  placeholder="Hey! I'd love to join — excited to explore the exhibit and grab coffee."
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-3.5 py-2.5 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors resize-none"
                />
              </div>

              <p className="text-[11px] text-[#747474] leading-relaxed">
                Once approved, you&apos;ll unlock private meeting instructions and the
                activity group chat.
              </p>

              {actionError && (
                <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2 rounded-lg">
                  {actionError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActionError('');
                    setJoinModalOpen(false);
                  }}
                  className="rounded-full border border-[#E5E3DD] px-5 py-2 text-sm font-medium hover:bg-[#F0EEE8] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="rounded-full bg-[#080808] text-[#F8F6F0] px-6 py-2 text-sm font-medium hover:bg-[#222] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {actionBusy ? 'Sending...' : 'Send request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="activity"
        targetId={activity.activityId}
        targetLabel={activity.title}
        activityId={activity.activityId}
      />
    </AppShell>
  );
}

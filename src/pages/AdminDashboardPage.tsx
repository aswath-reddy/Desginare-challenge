import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity as ActivityIcon,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { PageSkeleton } from '@/src/components/Skeletons';
import { ADMIN_EMAIL } from '@/src/constants/plusone';
import {
  adminRemoveActivity,
  clearDemoActivities,
  seedDemoActivities,
  updateReportStatus,
} from '@/src/lib/api';
import { formatRelativeTime } from '@/src/lib/date';
import {
  db,
  collection,
  onSnapshot,
  orderBy,
  query,
  getUserFriendlyError,
} from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type {
  Activity,
  AnalyticsEvent,
  AnalyticsEventType,
  FeedbackSubmission,
  Participant,
  PrivateUser,
  ReportItem,
  UserPublicProfile,
} from '@/src/types/plusone';

const EVENT_LABELS: Record<AnalyticsEventType, string> = {
  activity_published: 'Activity published',
  activity_discovered: 'Activity discovered',
  join_requested: 'Join requested',
  request_approved: 'Request approved',
  attendance_confirmed: 'Host confirmed attendance',
  attendance_self_reported: 'Member self-reported attendance',
  activity_completed: 'Activity completed',
  feedback_submitted: 'Feedback submitted',
};

export function AdminDashboardPage() {
  const { isAdmin, publicProfile } = useAuth();

  const [dataScope, setDataScope] = useState<'pilot' | 'demo'>('pilot');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [users, setUsers] = useState<UserPublicProfile[]>([]);
  const [privateUsers, setPrivateUsers] = useState<PrivateUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackSubmission[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminError, setAdminError] = useState('');
  const [seedMessage, setSeedMessage] = useState('');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const onListenerError = (err: unknown, fallback: string) => {
      setAdminError(getUserFriendlyError(err, fallback));
      setLoading(false);
    };

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setUsers(snap.docs.map((d) => d.data() as UserPublicProfile)),
      (err) => onListenerError(err, 'Unable to load member profiles.')
    );

    const unsubPrivUsers = onSnapshot(
      collection(db, 'privateUsers'),
      (snap) => setPrivateUsers(snap.docs.map((d) => d.data() as PrivateUser)),
      (err) => onListenerError(err, 'Unable to load private member metadata.')
    );

    const unsubAct = onSnapshot(
      collection(db, 'activities'),
      (snap) => setActivities(snap.docs.map((d) => d.data() as Activity)),
      (err) => onListenerError(err, 'Unable to load activities.')
    );

    const unsubEvt = onSnapshot(
      query(collection(db, 'analyticsEvents'), orderBy('createdAt', 'desc')),
      (snap) => setEvents(snap.docs.map((d) => d.data() as AnalyticsEvent)),
      (err) => onListenerError(err, 'Unable to load analytics events.')
    );

    const unsubPart = onSnapshot(
      collection(db, 'participants'),
      (snap) => setParticipants(snap.docs.map((d) => d.data() as Participant)),
      (err) => onListenerError(err, 'Unable to load participants.')
    );

    const unsubFb = onSnapshot(
      collection(db, 'feedback'),
      (snap) => setFeedbacks(snap.docs.map((d) => d.data() as FeedbackSubmission)),
      (err) => onListenerError(err, 'Unable to load feedback.')
    );

    const unsubRep = onSnapshot(
      query(collection(db, 'reports'), orderBy('createdAt', 'desc')),
      (snap) => {
        setReports(snap.docs.map((d) => d.data() as ReportItem));
        setLoading(false);
      },
      (err) => onListenerError(err, 'Unable to load moderation reports.')
    );

    return () => {
      unsubUsers();
      unsubPrivUsers();
      unsubAct();
      unsubEvt();
      unsubPart();
      unsubFb();
      unsubRep();
    };
  }, [isAdmin]);

  const userMap = useMemo(() => {
    const map = new Map<string, UserPublicProfile>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  const activityMap = useMemo(() => {
    const map = new Map<string, Activity>();
    activities.forEach((a) => map.set(a.activityId, a));
    return map;
  }, [activities]);

  const adminUidSet = useMemo(() => {
    const set = new Set<string>();
    privateUsers.forEach((pu) => {
      if (pu.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        set.add(pu.uid);
      }
    });
    return set;
  }, [privateUsers]);

  const memberMetrics = useMemo(() => {
    const nonTeamUsers = users.filter((u) => !adminUidSet.has(u.uid));
    const onboardedNonTeam = nonTeamUsers.filter((u) => u.onboardingCompleted);
    const totalPilotHosts = new Set(
      activities.filter((a) => !a.isDemo).map((a) => a.hostId)
    ).size;
    const realActivityIds = new Set(
      activities.filter((a) => !a.isDemo).map((a) => a.activityId)
    );
    const uniquePilotAttendees = new Set(
      participants
        .filter(
          (p) =>
            realActivityIds.has(p.activityId) &&
            p.membershipStatus === 'approved' &&
            (p.attendanceStatus === 'confirmed_by_host' ||
              p.attendanceStatus === 'self_reported')
        )
        .map((p) => p.userId)
    ).size;

    return {
      totalVerifiedMembers: users.length,
      genuineNonTeamUsers: nonTeamUsers.length,
      onboardedNonTeamUsers: onboardedNonTeam.length,
      totalPilotHosts,
      uniquePilotAttendees,
    };
  }, [users, adminUidSet, activities, participants]);

  const metrics = useMemo(() => {
    const isDemoScope = dataScope === 'demo';
    const scopedActivities = activities.filter((a) => a.isDemo === isDemoScope);
    const scopedActivityIds = new Set(scopedActivities.map((a) => a.activityId));
    const scopedEvents = events.filter((e) => e.isDemo === isDemoScope);
    const scopedFeedbacks = feedbacks
      .filter((f) => f.isDemo === isDemoScope)
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
    const scopedParticipants = participants.filter((p) =>
      scopedActivityIds.has(p.activityId)
    );

    const uniqueDiscoverers = new Set(
      scopedEvents
        .filter((e) => e.eventType === 'activity_discovered')
        .map((e) => e.userId)
    ).size;

    const requestsSubmitted = scopedEvents.filter(
      (e) => e.eventType === 'join_requested'
    ).length;

    const requestsApproved = scopedEvents.filter(
      (e) => e.eventType === 'request_approved'
    ).length;

    const hostConfirmedAttendance = scopedParticipants.filter(
      (p) => p.role === 'participant' && p.attendanceStatus === 'confirmed_by_host'
    ).length;

    const selfReportedAttendance = scopedParticipants.filter(
      (p) => p.role === 'participant' && p.attendanceStatus === 'self_reported'
    ).length;

    const completedCount = scopedActivities.filter(
      (a) => a.status === 'completed'
    ).length;

    const attendedFeedbackCount = scopedFeedbacks.filter((f) => f.attended).length;
    const metSomeoneNewCount = scopedFeedbacks.filter((f) => f.metSomeoneNew).length;
    const wouldNotAttendAloneCount = scopedFeedbacks.filter(
      (f) => f.wouldAttendAlone === 'no'
    ).length;
    const wouldUseAgainCount = scopedFeedbacks.filter((f) => f.wouldUseAgain).length;
    const avgComfort =
      scopedFeedbacks.length > 0
        ? (
            scopedFeedbacks.reduce((acc, f) => acc + f.comfortRating, 0) /
            scopedFeedbacks.length
          ).toFixed(1)
        : '—';

    const filteredEvents =
      eventFilter === 'all'
        ? scopedEvents
        : scopedEvents.filter((e) => e.eventType === eventFilter);

    return {
      publishedCount: scopedActivities.length,
      completedCount,
      uniqueDiscoverers,
      requestsSubmitted,
      requestsApproved,
      hostConfirmedAttendance,
      selfReportedAttendance,
      totalAttendanceConfirmed: hostConfirmedAttendance + selfReportedAttendance,
      attendedFeedbackCount,
      feedbackCount: scopedFeedbacks.length,
      metSomeoneNewCount,
      wouldNotAttendAloneCount,
      wouldUseAgainCount,
      avgComfort,
      scopedFeedbacks,
      scopedEvents,
      filteredEvents: filteredEvents.slice(0, 40),
    };
  }, [activities, events, participants, feedbacks, dataScope, eventFilter]);

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="bg-white border border-[#E5E3DD] rounded-[24px] p-10 text-center max-w-md mx-auto my-12">
          <h1 className="font-display text-2xl font-semibold mb-2">
            Admin access required
          </h1>
          <p className="text-sm text-[#747474]">
            The Impact Dashboard &amp; Moderation Queue are restricted to PlusOne
            administrators.
          </p>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  async function handleSeedDemo() {
    if (!publicProfile || seeding) return;
    setSeeding(true);
    setSeedMessage('');
    setAdminError('');
    try {
      const count = await seedDemoActivities(publicProfile);
      setSeedMessage(`Seeded ${count} clearly labelled demo preview activities.`);
    } catch (err) {
      setAdminError(getUserFriendlyError(err, 'Unable to seed demo data.'));
    } finally {
      setSeeding(false);
    }
  }

  async function handleClearDemo() {
    if (seeding) return;
    setSeeding(true);
    setSeedMessage('');
    setAdminError('');
    try {
      const count = await clearDemoActivities();
      setSeedMessage(`Removed ${count} demo preview activities.`);
    } catch (err) {
      setAdminError(getUserFriendlyError(err, 'Unable to clear demo activities.'));
    } finally {
      setSeeding(false);
    }
  }

  function handleExportReport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      scope: dataScope,
      note: 'All counts derived directly from live Firestore collections (demo isDemo=true rows excluded from pilot scope).',
      members: memberMetrics,
      kpis: {
        publishedActivities: metrics.publishedCount,
        completedActivities: metrics.completedCount,
        uniqueDiscoverers: metrics.uniqueDiscoverers,
        joinRequestsSubmitted: metrics.requestsSubmitted,
        joinRequestsApproved: metrics.requestsApproved,
        hostConfirmedAttendance: metrics.hostConfirmedAttendance,
        selfReportedAttendance: metrics.selfReportedAttendance,
        feedbackCount: metrics.feedbackCount,
        attendedFeedbackCount: metrics.attendedFeedbackCount,
        metSomeoneNewCount: metrics.metSomeoneNewCount,
        wouldNotAttendAloneCount: metrics.wouldNotAttendAloneCount,
        wouldUseAgainCount: metrics.wouldUseAgainCount,
        avgComfortRating: metrics.avgComfort,
      },
      feedbackResponses: metrics.scopedFeedbacks.map((f) => ({
        feedbackId: f.feedbackId,
        activityId: f.activityId,
        activityTitle: activityMap.get(f.activityId)?.title || f.activityId,
        attended: f.attended,
        comfortRating: f.comfortRating,
        metSomeoneNew: f.metSomeoneNew,
        wouldAttendAlone: f.wouldAttendAlone,
        wouldUseAgain: f.wouldUseAgain,
        comments: f.comments,
        isDemo: f.isDemo,
      })),
      recentEventsCount: metrics.scopedEvents.length,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plusone-impact-${dataScope}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const funnelSteps = [
    { label: 'Activity discovered (unique users)', value: metrics.uniqueDiscoverers },
    { label: 'Join request submitted', value: metrics.requestsSubmitted },
    { label: 'Request approved', value: metrics.requestsApproved },
    {
      label: 'Attendance confirmed (host + self-reported)',
      value: metrics.totalAttendanceConfirmed,
    },
    { label: 'Post-activity feedback submitted', value: metrics.feedbackCount },
  ];
  const maxFunnel = Math.max(1, ...funnelSteps.map((s) => s.value));

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474] mb-1">
              Design Intelligence Challenge · Private Admin
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">
              Impact &amp; Safety Dashboard
            </h1>
            <p className="text-xs text-[#747474] mt-1">
              Computed live from Firestore documents. Demo preview records (<code>isDemo: true</code>) are isolated from real pilot telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex p-1 bg-white border border-[#E5E3DD] rounded-full">
              <button
                type="button"
                onClick={() => setDataScope('pilot')}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  dataScope === 'pilot'
                    ? 'bg-[#080808] text-[#F8F6F0]'
                    : 'text-[#747474] hover:text-[#080808]'
                }`}
              >
                Real pilot data
              </button>
              <button
                type="button"
                onClick={() => setDataScope('demo')}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  dataScope === 'demo'
                    ? 'bg-[#080808] text-[#F8F6F0]'
                    : 'text-[#747474] hover:text-[#080808]'
                }`}
              >
                Demo data
              </button>
            </div>
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] bg-white px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
        </div>

        {adminError && (
          <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-4 py-3 rounded-xl">
            {adminError}
          </p>
        )}

        {/* Genuine Non-Team Member & Participation Summary */}
        <section className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#080808]" />
            <h2 className="font-display text-lg font-semibold">
              Community Reach (Genuine Accounts)
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#F8F6F0] rounded-2xl p-4">
              <p className="text-xs text-[#747474]">Genuine non-team users</p>
              <p className="font-display text-2xl font-bold tabular-nums mt-1">
                {memberMetrics.genuineNonTeamUsers}
              </p>
              <p className="text-[11px] text-[#747474] mt-0.5 tabular-nums">
                {memberMetrics.onboardedNonTeamUsers} completed onboarding
              </p>
            </div>
            <div className="bg-[#F8F6F0] rounded-2xl p-4">
              <p className="text-xs text-[#747474]">Total verified accounts</p>
              <p className="font-display text-2xl font-bold tabular-nums mt-1">
                {memberMetrics.totalVerifiedMembers}
              </p>
              <p className="text-[11px] text-[#747474] mt-0.5">
                Includes team/admin account
              </p>
            </div>
            <div className="bg-[#F8F6F0] rounded-2xl p-4">
              <p className="text-xs text-[#747474]">Real activity hosts</p>
              <p className="font-display text-2xl font-bold tabular-nums mt-1">
                {memberMetrics.totalPilotHosts}
              </p>
              <p className="text-[11px] text-[#747474] mt-0.5">
                Distinct hosts (isDemo=false)
              </p>
            </div>
            <div className="bg-[#F8F6F0] rounded-2xl p-4">
              <p className="text-xs text-[#747474]">Confirmed real attendees</p>
              <p className="font-display text-2xl font-bold tabular-nums mt-1">
                {memberMetrics.uniquePilotAttendees}
              </p>
              <p className="text-[11px] text-[#747474] mt-0.5">
                Unique verified participants
              </p>
            </div>
          </div>
        </section>

        {/* Scoped KPI Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Activities published', value: metrics.publishedCount },
            { label: 'Completed plans', value: metrics.completedCount },
            {
              label: 'Host-confirmed attendance',
              value: metrics.hostConfirmedAttendance,
            },
            {
              label: 'Self-reported attendance',
              value: metrics.selfReportedAttendance,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="bg-white border border-[#E5E3DD] rounded-[20px] p-5 space-y-1.5"
            >
              <p className="text-xs text-[#747474]">{kpi.label}</p>
              <p className="font-display text-3xl font-bold tracking-[-0.02em] tabular-nums">
                {kpi.value}
              </p>
            </div>
          ))}
        </section>

        {/* Conversion Funnel */}
        <section className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#080808]" />
              <h2 className="font-display text-xl font-semibold">
                Online-to-Offline Conversion Funnel ({dataScope === 'pilot' ? 'Real Pilot' : 'Demo'})
              </h2>
            </div>
            <p className="text-xs text-[#747474] tabular-nums">
              {metrics.scopedEvents.length} logged events
            </p>
          </div>

          <div className="space-y-4">
            {funnelSteps.map((step, idx) => {
              const prevValue = idx > 0 ? funnelSteps[idx - 1].value : null;
              const convPct =
                prevValue && prevValue > 0
                  ? `${Math.round((step.value / prevValue) * 100)}% of prev`
                  : null;
              return (
                <div key={step.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-medium text-[#080808]">{step.label}</span>
                    <span className="font-display font-bold tabular-nums text-sm">
                      {step.value}
                      {convPct && (
                        <span className="font-sans font-normal text-xs text-[#747474] ml-2">
                          ({convPct})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#F0EEE8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#080808] transition-all duration-300"
                      style={{ width: `${Math.round((step.value / maxFunnel) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Post-Activity Pilot Feedback */}
        <section className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">
              Real-World Outcome Feedback ({metrics.feedbackCount} responses)
            </h2>
            <span className="text-xs text-[#747474] tabular-nums">
              {metrics.attendedFeedbackCount} confirmed attending in person
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#F8F6F0] rounded-2xl p-4">
              <p className="text-xs text-[#747474]">Met someone new</p>
              <p className="font-display text-2xl font-bold tabular-nums mt-1">
                {metrics.metSomeoneNewCount}
              </p>
            </div>
            <div className="bg-[#F8F6F0] rounded-2xl p-4">
              <p className="text-xs text-[#747474]">Wouldn&apos;t have gone alone</p>
              <p className="font-display text-2xl font-bold tabular-nums mt-1">
                {metrics.wouldNotAttendAloneCount}
              </p>
            </div>
            <div className="bg-[#F8F6F0] rounded-2xl p-4">
              <p className="text-xs text-[#747474]">Avg. comfort (1–5)</p>
              <p className="font-display text-2xl font-bold tabular-nums mt-1">
                {metrics.avgComfort}
              </p>
            </div>
            <div className="bg-[#F8F6F0] rounded-2xl p-4">
              <p className="text-xs text-[#747474]">Would use PlusOne again</p>
              <p className="font-display text-2xl font-bold tabular-nums mt-1">
                {metrics.wouldUseAgainCount}
              </p>
            </div>
          </div>

          {metrics.scopedFeedbacks.length === 0 ? (
            <p className="text-sm text-[#747474]">
              No post-activity feedback submitted in this dataset yet.
            </p>
          ) : (
            <div className="divide-y divide-[#E5E3DD] pt-2">
              {metrics.scopedFeedbacks.map((f) => {
                const actTitle =
                  activityMap.get(f.activityId)?.title || f.activityId;
                const respondentName =
                  userMap.get(f.userId)?.displayName || f.userId;
                return (
                  <div key={f.feedbackId} className="py-3.5 text-xs space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[#080808]">
                        {actTitle} · {respondentName}
                      </span>
                      <span className="text-[#747474]">
                        {formatRelativeTime(f.createdAt)}
                      </span>
                    </div>
                    <p className="font-medium text-[#080808]/85 tabular-nums">
                      Attended: {f.attended ? 'Yes' : 'No'} · Comfort:{' '}
                      {f.comfortRating}/5 · Met someone new:{' '}
                      {f.metSomeoneNew ? 'Yes' : 'No'} · Would attend alone:{' '}
                      {f.wouldAttendAlone} · Use again:{' '}
                      {f.wouldUseAgain ? 'Yes' : 'No'}
                    </p>
                    {f.comments && <p className="text-[#747474]">“{f.comments}”</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Live Database Event Stream */}
        <section className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-[#080808]" />
              <h2 className="font-display text-xl font-semibold">
                Live Database Events ({metrics.scopedEvents.length})
              </h2>
            </div>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              aria-label="Filter database events by type"
              className="rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-3.5 py-2 text-xs font-medium focus:bg-white focus:border-[#080808] focus:outline-none"
            >
              <option value="all">All event types</option>
              {(Object.keys(EVENT_LABELS) as AnalyticsEventType[]).map((evtType) => (
                <option key={evtType} value={evtType}>
                  {EVENT_LABELS[evtType]}
                </option>
              ))}
            </select>
          </div>

          {metrics.filteredEvents.length === 0 ? (
            <p className="text-sm text-[#747474]">
              No matching database events recorded in this scope yet.
            </p>
          ) : (
            <div className="divide-y divide-[#E5E3DD] max-h-96 overflow-y-auto pr-1">
              {metrics.filteredEvents.map((evt) => {
                const actor = userMap.get(evt.userId)?.displayName || evt.userId;
                const actTitle =
                  activityMap.get(evt.activityId)?.title || evt.activityId;
                return (
                  <div
                    key={evt.eventId}
                    className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-medium text-[#080808] truncate">
                        {EVENT_LABELS[evt.eventType] || evt.eventType} ·{' '}
                        <span className="font-normal text-[#747474]">{actTitle}</span>
                      </p>
                      <p className="text-[#747474] truncate">
                        Actor: {actor} · {evt.isDemo ? 'Demo' : 'Pilot'}
                      </p>
                    </div>
                    <span className="text-[#747474] shrink-0 tabular-nums">
                      {formatRelativeTime(evt.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Moderation Queue */}
        <section className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#080808]" />
            <h2 className="font-display text-xl font-semibold">
              Moderation Queue ({reports.length})
            </h2>
          </div>

          {reports.length === 0 ? (
            <p className="text-sm text-[#747474]">No safety reports submitted.</p>
          ) : (
            <div className="divide-y divide-[#E5E3DD]">
              {reports.map((rep) => (
                <div
                  key={rep.reportId}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-[#080808]">
                      [{rep.targetType}] {rep.reason} · Status:{' '}
                      <span className="uppercase">{rep.status}</span>
                    </p>
                    <p className="text-[#747474]">
                      Target: {rep.targetId} · {formatRelativeTime(rep.createdAt)}
                    </p>
                    {rep.description && (
                      <p className="text-[#080808]/80">{rep.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {rep.targetType === 'activity' && rep.status === 'open' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await adminRemoveActivity(rep.targetId);
                            await updateReportStatus(rep.reportId, 'resolved');
                          } catch (err) {
                            setAdminError(
                              getUserFriendlyError(err, 'Unable to resolve report.')
                            );
                          }
                        }}
                        className="rounded-full bg-[#991B1B] text-white px-3.5 py-1.5 text-xs font-medium"
                      >
                        Cancel activity &amp; resolve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        void updateReportStatus(rep.reportId, 'resolved').catch((err) =>
                          setAdminError(
                            getUserFriendlyError(err, 'Unable to update report.')
                          )
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-[#E5E3DD] px-3.5 py-1.5 text-xs font-medium hover:bg-[#F0EEE8]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void updateReportStatus(rep.reportId, 'dismissed').catch((err) =>
                          setAdminError(
                            getUserFriendlyError(err, 'Unable to dismiss report.')
                          )
                        )
                      }
                      className="rounded-full border border-[#E5E3DD] px-3.5 py-1.5 text-xs text-[#747474] hover:bg-[#F0EEE8]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Demo Preview Seeding Controls */}
        <section className="bg-[#F0EEE8] border border-[#E5E3DD] rounded-[24px] p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#080808]" />
            <h2 className="font-display text-base font-semibold">
              Optional Demo Preview Dataset
            </h2>
          </div>
          <p className="text-xs text-[#747474] leading-relaxed">
            Seed clearly labelled <code>isDemo: true</code> activities for visual
            demonstration. Demo events are strictly separated from real pilot analytics.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSeedDemo}
              disabled={seeding}
              className="rounded-full bg-[#080808] text-[#F8F6F0] px-5 py-2 text-xs font-medium hover:bg-[#222] disabled:opacity-50"
            >
              {seeding ? 'Working...' : 'Seed demo activities'}
            </button>
            <button
              type="button"
              onClick={handleClearDemo}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] bg-white px-5 py-2 text-xs font-medium hover:bg-[#F8F6F0]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear demo activities
            </button>
          </div>
          {seedMessage && (
            <p className="text-xs font-medium text-[#166534]">{seedMessage}</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

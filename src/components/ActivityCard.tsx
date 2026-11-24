import React, { useState } from 'react';
import { Bookmark, MapPin, Calendar, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EditorialImage, UserAvatar } from '@/src/components/EditorialImage';
import { isLocalDemoPreviewId } from '@/src/constants/demoData';
import { formatActivityDate, formatActivityTimeRange, isToday } from '@/src/lib/date';
import { toggleSaveActivity } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import type { Activity, JoinRequestStatus, MembershipStatus } from '@/src/types/plusone';

interface ActivityCardProps {
  activity: Activity;
  membershipStatus?: MembershipStatus;
  joinRequestStatus?: JoinRequestStatus;
  showSave?: boolean;
}

export function ActivityCard({
  activity,
  membershipStatus,
  joinRequestStatus,
  showSave = true,
}: ActivityCardProps) {
  const { firebaseUser, savedActivityIds } = useAuth();
  const [saving, setSaving] = useState(false);

  const isSaved = savedActivityIds.has(activity.activityId);
  const spotsLeft = Math.max(0, activity.capacity - activity.approvedParticipantCount);
  const isHost = firebaseUser?.uid === activity.hostId;
  const happeningToday = isToday(activity.startAt);

  let statusLabel: string | null = null;
  let statusTone = 'text-[#080808]';

  if (activity.status === 'cancelled') {
    statusLabel = 'Cancelled';
    statusTone = 'text-[#991B1B]';
  } else if (activity.status === 'completed') {
    statusLabel = 'Completed';
    statusTone = 'text-[#747474]';
  } else if (isHost) {
    statusLabel = 'Hosting';
    statusTone = 'text-[#080808]';
  } else if (membershipStatus === 'approved') {
    statusLabel = 'Joined';
    statusTone = 'text-[#166534]';
  } else if (joinRequestStatus === 'pending') {
    statusLabel = 'Request pending';
    statusTone = 'text-[#92400E]';
  } else if (spotsLeft === 0) {
    statusLabel = 'Group full';
    statusTone = 'text-[#747474]';
  } else if (happeningToday) {
    statusLabel = 'Happening today';
    statusTone = 'text-[#166534]';
  } else if (spotsLeft <= 2) {
    statusLabel = `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`;
    statusTone = 'text-[#92400E]';
  }

  const isLocalPreview = isLocalDemoPreviewId(activity.activityId);
  const currencyPrefix =
    activity.currency === 'GBP'
      ? '£'
      : activity.currency === 'EUR'
      ? '€'
      : activity.currency === 'CAD'
      ? 'CA$'
      : '$';
  const costText =
    activity.estimatedCost <= 0
      ? 'Free'
      : `${currencyPrefix}${activity.estimatedCost} est.`;

  async function handleToggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!firebaseUser?.emailVerified || saving) return;
    setSaving(true);
    try {
      await toggleSaveActivity(firebaseUser.uid, activity.activityId, isSaved);
    } catch (err) {
      console.error('Unable to toggle saved state:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="group bg-white border border-[#E5E3DD] rounded-[20px] overflow-hidden flex flex-col transition-all duration-200 hover:border-[#080808]/35">
      <Link
        to={`/activities/${activity.activityId}`}
        className="relative aspect-[4/3] overflow-hidden bg-[#F0EEE8] block"
      >
        <EditorialImage
          src={activity.coverImageURL}
          alt={activity.title}
          fallbackTitle={activity.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 via-black/10 to-transparent pointer-events-none"
        />
        <div className="absolute inset-x-0 top-0 p-3.5 flex items-start justify-between gap-2">
          {activity.isDemo ? (
            <span className="bg-[#080808]/85 text-[#F8F6F0] text-[11px] font-medium px-2.5 py-1 rounded-md tracking-tight">
              Demo preview
            </span>
          ) : (
            <span />
          )}
          {showSave && firebaseUser?.emailVerified && !isLocalPreview && (
            <button
              type="button"
              onClick={handleToggleSave}
              disabled={saving}
              aria-label={isSaved ? 'Remove from saved activities' : 'Save activity'}
              aria-pressed={isSaved}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border ${
                isSaved
                  ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                  : 'bg-white/95 text-[#080808] border-[#E5E3DD] hover:bg-white'
              }`}
            >
              <Bookmark
                className="w-4 h-4"
                strokeWidth={1.75}
                fill={isSaved ? 'currentColor' : 'none'}
              />
            </button>
          )}
        </div>
      </Link>

      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-[#747474] mb-2">
            <span className="truncate font-medium">
              {activity.category} <span aria-hidden="true">·</span> {activity.city}
            </span>
            {statusLabel && (
              <span className={`font-semibold shrink-0 tabular-nums ${statusTone}`}>
                {statusLabel}
              </span>
            )}
          </div>

          <Link to={`/activities/${activity.activityId}`} className="block group/title">
            <h3 className="font-display text-[19px] font-semibold tracking-[-0.02em] text-[#080808] leading-[1.22] line-clamp-2 group-hover/title:underline underline-offset-4 decoration-1">
              {activity.title}
            </h3>
          </Link>

          <div className="mt-3.5 space-y-1.5 text-[13px] text-[#747474]">
            <p className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 shrink-0 text-[#080808]/55" strokeWidth={1.6} />
              <span className="truncate tabular-nums">
                {formatActivityDate(activity.startAt)} ·{' '}
                {formatActivityTimeRange(activity.startAt, activity.endAt)}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#080808]/55" strokeWidth={1.6} />
              <span className="truncate">{activity.venueName}</span>
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E5E3DD] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              src={activity.hostPhotoURL}
              name={activity.hostName}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#080808] truncate">
                {activity.hostName}
              </p>
              <p className="text-[11px] text-[#747474] tabular-nums">
                {activity.approvedParticipantCount}/{activity.capacity} going · {costText}
              </p>
            </div>
          </div>

          <Link
            to={`/activities/${activity.activityId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#080808] group-hover:translate-x-0.5 transition-transform whitespace-nowrap shrink-0"
          >
            View
            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </article>
  );
}

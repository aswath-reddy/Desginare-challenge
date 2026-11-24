import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Grid } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { ActivityCard } from '@/src/components/ActivityCard';
import { ActivityCardSkeleton } from '@/src/components/Skeletons';
import { EmptyState } from '@/src/components/EmptyState';
import { getBuiltInDemoPreviews } from '@/src/constants/demoData';
import { ACTIVITY_CATEGORIES } from '@/src/constants/plusone';
import {
  db,
  collection,
  onSnapshot,
  query,
  where,
  getUserFriendlyError,
} from '@/src/lib/firebase';
import { isPastActivity } from '@/src/lib/date';
import { useAuth } from '@/src/context/AuthContext';
import type { Activity } from '@/src/types/plusone';

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { publicProfile, privateProfile } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sortBy, setSortBy] = useState<'soonest' | 'newest' | 'spots'>('soonest');
  const [hideDemo, setHideDemo] = useState(false);

  const selectedCategory = searchParams.get('category') || 'All';

  useEffect(() => {
    const q = query(
      collection(db, 'activities'),
      where('status', '==', 'published')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as Activity)
          .sort((a, b) => {
            if (a.isDemo !== b.isDemo) return a.isDemo ? 1 : -1;
            return a.startAt.toMillis() - b.startAt.toMillis();
          });
        setActivities(list);
        setLoading(false);
        setLoadError('');
      },
      (err) => {
        setLoadError(getUserFriendlyError(err, 'Unable to load activities right now.'));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const blockedSet = useMemo(
    () => new Set(privateProfile?.blockedUserIds || []),
    [privateProfile]
  );

  const items = useMemo(() => {
    const live = activities.filter(
      (a) => !blockedSet.has(a.hostId) && !isPastActivity(a.endAt)
    );
    const seededDemoCities = new Set(
      live.filter((a) => a.isDemo).map((a) => a.city.trim().toLowerCase())
    );
    const previews = getBuiltInDemoPreviews(publicProfile?.city).filter(
      (p) =>
        !seededDemoCities.has(p.city.trim().toLowerCase()) &&
        !live.some(
          (l) =>
            l.title.trim().toLowerCase() === p.title.trim().toLowerCase() &&
            l.city.trim().toLowerCase() === p.city.trim().toLowerCase()
        )
    );

    const list = [...live, ...previews].filter(
      (a) =>
        (!hideDemo || !a.isDemo) &&
        (selectedCategory === 'All' || a.category === selectedCategory)
    );

    if (sortBy === 'newest') {
      return [...list].sort((a, b) => {
        if (a.isDemo !== b.isDemo) return a.isDemo ? 1 : -1;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });
    }
    if (sortBy === 'spots') {
      return [...list].sort((a, b) => {
        if (a.isDemo !== b.isDemo) return a.isDemo ? 1 : -1;
        return (
          b.capacity -
          b.approvedParticipantCount -
          (a.capacity - a.approvedParticipantCount)
        );
      });
    }
    return [...list].sort((a, b) => {
      if (a.isDemo !== b.isDemo) return a.isDemo ? 1 : -1;
      return a.startAt.toMillis() - b.startAt.toMillis();
    });
  }, [activities, blockedSet, hideDemo, publicProfile?.city, selectedCategory, sortBy]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474] mb-1">
              Explore
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">
              Browse by category
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#080808] cursor-pointer">
              <input
                type="checkbox"
                checked={hideDemo}
                onChange={(e) => setHideDemo(e.target.checked)}
                className="accent-[#080808] rounded"
              />
              Community plans only
            </label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'soonest' | 'newest' | 'spots')}
                aria-label="Sort activities"
                className="appearance-none h-11 rounded-xl border border-[#E5E3DD] bg-white pl-4 pr-10 py-0 text-sm leading-normal text-[#080808] focus:border-[#080808] focus:outline-none transition-colors cursor-pointer"
              >
                <option value="soonest">Sort: Soonest first</option>
                <option value="newest">Sort: Recently added</option>
                <option value="spots">Sort: Most spots left</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#747474] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center sm:flex-wrap gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className={`rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-[#080808] text-[#F8F6F0]'
                : 'bg-white border border-[#E5E3DD] text-[#080808] hover:bg-[#F0EEE8]'
            }`}
          >
            All categories
          </button>
          {ACTIVITY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSearchParams({ category: cat })}
              className={`rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#080808] text-[#F8F6F0]'
                  : 'bg-white border border-[#E5E3DD] text-[#080808] hover:bg-[#F0EEE8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loadError && (
          <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-4 py-3 rounded-xl">
            {loadError}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Grid}
            title={`No ${selectedCategory === 'All' ? '' : selectedCategory + ' '}plans yet`}
            description="Start something in this category and invite people nearby to join."
            actionLabel="Create a plan"
            onAction={() => navigate('/create')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((act) => (
              <ActivityCard key={act.activityId} activity={act} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

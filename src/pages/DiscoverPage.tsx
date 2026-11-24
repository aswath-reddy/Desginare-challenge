import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, ChevronDown, Compass, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { ActivityCard } from '@/src/components/ActivityCard';
import { ActivityCardSkeleton } from '@/src/components/Skeletons';
import { EmptyState } from '@/src/components/EmptyState';
import { getBuiltInDemoPreviews } from '@/src/constants/demoData';
import { ACTIVITY_CATEGORIES, POPULAR_CITIES } from '@/src/constants/plusone';
import {
  db,
  collection,
  onSnapshot,
  query,
  where,
  getUserFriendlyError,
} from '@/src/lib/firebase';
import {
  isPastActivity,
  isStartingSoon,
  isThisWeekend,
  isToday,
} from '@/src/lib/date';
import { useAuth } from '@/src/context/AuthContext';
import type { Activity, JoinRequest, Participant } from '@/src/types/plusone';

type DateFilter = 'all' | 'today' | 'weekend' | 'upcoming';
type CostFilter = 'all' | 'free' | 'paid';

export function DiscoverPage() {
  const { firebaseUser, publicProfile, privateProfile, savedActivityIds } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [myMemberships, setMyMemberships] = useState<Map<string, Participant>>(new Map());
  const [myRequests, setMyRequests] = useState<Map<string, JoinRequest>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [cityFilter, setCityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [costFilter, setCostFilter] = useState<CostFilter>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [hideDemo, setHideDemo] = useState(false);

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

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const unsubPart = onSnapshot(
      query(collection(db, 'participants'), where('userId', '==', uid)),
      (snap) => {
        const map = new Map<string, Participant>();
        snap.docs.forEach((d) => {
          const p = d.data() as Participant;
          map.set(p.activityId, p);
        });
        setMyMemberships(map);
      },
      (err) => {
        console.error('Failed to load memberships:', err);
      }
    );

    const unsubReq = onSnapshot(
      query(collection(db, 'joinRequests'), where('userId', '==', uid)),
      (snap) => {
        const map = new Map<string, JoinRequest>();
        snap.docs.forEach((d) => {
          const r = d.data() as JoinRequest;
          map.set(r.activityId, r);
        });
        setMyRequests(map);
      },
      (err) => {
        console.error('Failed to load join requests:', err);
      }
    );

    return () => {
      unsubPart();
      unsubReq();
    };
  }, [firebaseUser]);

  const blockedSet = useMemo(
    () => new Set(privateProfile?.blockedUserIds || []),
    [privateProfile]
  );

  const activeUpcoming = useMemo(() => {
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
    return [...live, ...previews].sort((a, b) => {
      if (a.isDemo !== b.isDemo) return a.isDemo ? 1 : -1;
      return a.startAt.toMillis() - b.startAt.toMillis();
    });
  }, [activities, blockedSet, publicProfile?.city]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeUpcoming.filter((a) => {
      if (cityFilter !== 'All' && a.city.toLowerCase() !== cityFilter.toLowerCase()) {
        return false;
      }
      if (categoryFilter !== 'All' && a.category !== categoryFilter) {
        return false;
      }
      if (dateFilter === 'today' && !isToday(a.startAt)) return false;
      if (dateFilter === 'weekend' && !isThisWeekend(a.startAt)) return false;
      if (dateFilter === 'upcoming' && isPastActivity(a.startAt)) return false;
      if (costFilter === 'free' && a.estimatedCost > 0) return false;
      if (costFilter === 'paid' && a.estimatedCost <= 0) return false;
      if (onlyAvailable && a.approvedParticipantCount >= a.capacity) return false;
      if (hideDemo && a.isDemo) return false;
      if (q) {
        const hay =
          `${a.title} ${a.description} ${a.venueName} ${a.city} ${a.category} ${a.hostName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    activeUpcoming,
    cityFilter,
    categoryFilter,
    dateFilter,
    costFilter,
    onlyAvailable,
    hideDemo,
    searchQuery,
  ]);

  const isFiltered =
    cityFilter !== 'All' ||
    categoryFilter !== 'All' ||
    dateFilter !== 'all' ||
    costFilter !== 'all' ||
    onlyAvailable ||
    hideDemo ||
    searchQuery.trim().length > 0;

  const rawFirstName =
    publicProfile?.displayName?.trim().split(/\s+/)[0] || 'Explorer';
  const firstName = rawFirstName.replace(/[.!?,;:]+$/, '') || 'Explorer';

  const cityChoices = useMemo(() => {
    const set = new Set<string>(POPULAR_CITIES);
    if (publicProfile?.city) set.add(publicProfile.city);
    activeUpcoming.forEach((a) => set.add(a.city));
    return ['All', ...Array.from(set)];
  }, [publicProfile?.city, activeUpcoming]);

  const userInterests = useMemo(
    () => new Set(publicProfile?.interests || []),
    [publicProfile?.interests]
  );

  const weekendPlans = useMemo(
    () => filtered.filter((a) => isThisWeekend(a.startAt)).slice(0, 6),
    [filtered]
  );
  const startingSoonPlans = useMemo(
    () => filtered.filter((a) => isStartingSoon(a.startAt)).slice(0, 6),
    [filtered]
  );
  const interestPlans = useMemo(
    () => filtered.filter((a) => userInterests.has(a.category)).slice(0, 6),
    [filtered, userInterests]
  );
  const recentlyAddedPlans = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        .slice(0, 6),
    [filtered]
  );

  function clearFilters() {
    setCityFilter('All');
    setSearchQuery('');
    setCategoryFilter('All');
    setDateFilter('all');
    setCostFilter('all');
    setOnlyAvailable(false);
    setHideDemo(false);
  }

  function renderGrid(list: Activity[]) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((act) => (
          <ActivityCard
            key={act.activityId}
            activity={act}
            membershipStatus={myMemberships.get(act.activityId)?.membershipStatus}
            joinRequestStatus={myRequests.get(act.activityId)?.status}
          />
        ))}
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Greeting Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.08] text-balance">
              Hey, {firstName}. What&apos;s the plan?
            </h1>
            <p className="text-sm sm:text-base text-[#747474]">
              Something good is happening around you.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/saved"
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E3DD] bg-white px-4 py-2 text-xs font-medium text-[#080808] hover:bg-[#F0EEE8] active:scale-[0.98] transition-all whitespace-nowrap tabular-nums"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Saved ({savedActivityIds.size})
            </Link>
            <Link
              to="/create"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#080808] text-[#F8F6F0] px-5 py-2 text-xs font-medium hover:bg-[#222] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Host a plan
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <section
          aria-label="Search and filters"
          className="bg-white border border-[#E5E3DD] rounded-[20px] p-4 sm:p-5 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 flex items-center gap-2.5 h-11 rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-3.5 focus-within:bg-white focus-within:border-[#080808] transition-colors">
              <Search className="w-4 h-4 text-[#747474] shrink-0 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search museums, coffee, hikes, venues..."
                aria-label="Search activities"
                className="w-full h-full bg-transparent text-sm leading-normal text-[#080808] placeholder:text-[#747474] focus:outline-none"
              />
            </div>

            <div className="md:col-span-3 relative">
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                aria-label="Filter by city"
                className="appearance-none w-full h-11 rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] pl-3.5 pr-9 py-0 text-sm leading-normal text-[#080808] focus:bg-white focus:border-[#080808] focus:outline-none transition-colors cursor-pointer"
              >
                {cityChoices.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All cities' : c}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#747474] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="md:col-span-2 relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                aria-label="Filter by date"
                className="appearance-none w-full h-11 rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] pl-3.5 pr-9 py-0 text-sm leading-normal text-[#080808] focus:bg-white focus:border-[#080808] focus:outline-none transition-colors cursor-pointer"
              >
                <option value="all">Any date</option>
                <option value="today">Today</option>
                <option value="weekend">This weekend</option>
                <option value="upcoming">Upcoming</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#747474] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="md:col-span-2 relative">
              <select
                value={costFilter}
                onChange={(e) => setCostFilter(e.target.value as CostFilter)}
                aria-label="Filter by cost"
                className="appearance-none w-full h-11 rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] pl-3.5 pr-9 py-0 text-sm leading-normal text-[#080808] focus:bg-white focus:border-[#080808] focus:outline-none transition-colors cursor-pointer"
              >
                <option value="all">Free &amp; paid</option>
                <option value="free">Free only</option>
                <option value="paid">Paid only</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#747474] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full">
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  categoryFilter === 'All'
                    ? 'bg-[#080808] text-[#F8F6F0]'
                    : 'bg-[#F0EEE8] text-[#080808] hover:bg-[#E5E3DD]'
                }`}
              >
                All
              </button>
              {ACTIVITY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#080808] text-[#F8F6F0]'
                      : 'bg-[#F0EEE8] text-[#080808] hover:bg-[#E5E3DD]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-[#080808] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="accent-[#080808] rounded"
                />
                Available spots only
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-[#080808] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideDemo}
                  onChange={(e) => setHideDemo(e.target.checked)}
                  className="accent-[#080808] rounded"
                />
                Community plans only
              </label>
              {isFiltered && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-[#747474] hover:text-[#080808] underline underline-offset-4 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Results */}
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
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={isFiltered ? SlidersHorizontal : Compass}
            title={
              isFiltered
                ? 'No plans match those filters'
                : 'No upcoming plans nearby yet'
            }
            description={
              isFiltered
                ? 'Try widening your city, date range, or category search.'
                : 'Be the first person in your neighborhood to put a museum trip, coffee chat, or walk on the calendar.'
            }
            actionLabel={isFiltered ? 'Clear filters' : 'Create a plan'}
            onAction={() => {
              if (isFiltered) clearFilters();
              else navigate('/create');
            }}
            secondaryLabel={isFiltered ? 'Create a plan' : undefined}
            onSecondaryAction={
              isFiltered ? () => navigate('/create') : undefined
            }
          />
        ) : isFiltered ? (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] tabular-nums">
                Matching plans ({filtered.length})
              </h2>
            </div>
            {renderGrid(filtered)}
          </section>
        ) : (
          <div className="space-y-12">
            {/* Featured */}
            <section className="space-y-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  Featured activities
                </h2>
                <Link
                  to="/explore"
                  className="text-xs font-medium text-[#747474] hover:text-[#080808] transition-colors tabular-nums"
                >
                  See all ({filtered.length})
                </Link>
              </div>
              {renderGrid(filtered.slice(0, 6))}
            </section>

            {/* Starting Soon */}
            {startingSoonPlans.length > 0 && (
              <section className="space-y-5 border-t border-[#E5E3DD] pt-10">
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  Starting soon
                </h2>
                {renderGrid(startingSoonPlans)}
              </section>
            )}

            {/* Happening this weekend */}
            {weekendPlans.length > 0 && (
              <section className="space-y-5 border-t border-[#E5E3DD] pt-10">
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  Happening this weekend
                </h2>
                {renderGrid(weekendPlans)}
              </section>
            )}

            {/* Based on interests */}
            {interestPlans.length > 0 && (
              <section className="space-y-5 border-t border-[#E5E3DD] pt-10">
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  Based on your interests
                </h2>
                {renderGrid(interestPlans)}
              </section>
            )}

            {/* Recently added */}
            {recentlyAddedPlans.length > 0 && (
              <section className="space-y-5 border-t border-[#E5E3DD] pt-10">
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  Recently added plans
                </h2>
                {renderGrid(recentlyAddedPlans)}
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

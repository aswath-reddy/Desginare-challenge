import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Bookmark } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { ActivityCard } from '@/src/components/ActivityCard';
import { ActivityCardSkeleton } from '@/src/components/Skeletons';
import { EmptyState } from '@/src/components/EmptyState';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type { Activity } from '@/src/types/plusone';

export function SavedPage() {
  const { savedActivityIds } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = Array.from(savedActivityIds);
    if (ids.length === 0) {
      setActivities([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    Promise.all(
      ids.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'activities', id));
          return snap.exists() ? (snap.data() as Activity) : null;
        } catch {
          return null;
        }
      })
    ).then((list) => {
      if (cancelled) return;
      setActivities(list.filter((a): a is Activity => Boolean(a)));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [savedActivityIds]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474] mb-1">
            Bookmarks
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">
            Saved
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Good plans are worth keeping."
            description="Tap the bookmark icon on any activity you want to revisit later."
            actionLabel="Discover activities"
            onAction={() => navigate('/discover')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((a) => (
              <ActivityCard key={a.activityId} activity={a} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

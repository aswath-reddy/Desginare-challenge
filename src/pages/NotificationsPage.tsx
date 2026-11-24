import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Bell, CheckCheck } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { EmptyState } from '@/src/components/EmptyState';
import { PageSkeleton } from '@/src/components/Skeletons';
import { markAllNotificationsRead, markNotificationRead } from '@/src/lib/api';
import { formatRelativeTime } from '@/src/lib/date';
import { db, getUserFriendlyError } from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type { NotificationItem } from '@/src/types/plusone';

export function NotificationsPage() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', firebaseUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as NotificationItem)
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis() ?? Date.now()) -
              (a.createdAt?.toMillis() ?? Date.now())
          );
        setItems(list);
        setLoading(false);
        setError('');
      },
      (err) => {
        setError(getUserFriendlyError(err, 'Unable to load notifications.'));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  const unreadIds = items.filter((i) => !i.isRead).map((i) => i.notificationId);

  function getTargetLink(item: NotificationItem): string {
    if (item.type === 'join_request') return `/host/${item.activityId}`;
    if (item.type === 'group_announcement') return `/messages/${item.activityId}`;
    if (item.type === 'feedback_request') return '/my-plans';
    return `/activities/${item.activityId}`;
  }

  async function handleMarkAllRead() {
    if (unreadIds.length === 0 || markingAll) return;
    setMarkingAll(true);
    setError('');
    try {
      await markAllNotificationsRead(unreadIds);
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to mark notifications read.'));
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474] mb-1">
              Updates
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">
              Notifications
            </h1>
          </div>
          {unreadIds.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] bg-white px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {markingAll ? 'Updating...' : 'Mark all read'}
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-4 py-3 rounded-xl">
            {error}
          </p>
        )}

        {loading ? (
          <PageSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="When someone requests to join your plan, approves your spot, or posts an update, you'll see it here."
            actionLabel="Discover activities"
            onAction={() => navigate('/discover')}
          />
        ) : (
          <div className="bg-white border border-[#E5E3DD] rounded-[24px] divide-y divide-[#E5E3DD] overflow-hidden">
            {items.map((item) => (
              <Link
                key={item.notificationId}
                to={getTargetLink(item)}
                onClick={() => {
                  if (!item.isRead) {
                    void markNotificationRead(item.notificationId).catch(() => {});
                  }
                }}
                className={`block p-5 transition-colors hover:bg-[#F8F6F0]/60 ${
                  !item.isRead
                    ? 'bg-[#F8F6F0] border-l-2 border-l-[#080808]'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-sm font-semibold text-[#080808]">
                        {item.title}
                      </p>
                      {!item.isRead && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#080808]">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#747474] leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#747474] whitespace-nowrap tabular-nums">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

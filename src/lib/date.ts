import type { Timestamp } from 'firebase/firestore';

export function formatActivityDate(ts: Timestamp | Date): string {
  const date = ts instanceof Date ? ts : ts.toDate();
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatActivityTimeRange(start: Timestamp | Date, end: Timestamp | Date): string {
  const s = start instanceof Date ? start : start.toDate();
  const e = end instanceof Date ? end : end.toDate();
  const fmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${fmt.format(s)} – ${fmt.format(e)}`;
}

export function formatFullDateTime(ts: Timestamp | Date): string {
  const d = ts instanceof Date ? ts : ts.toDate();
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(ts: Timestamp | Date | null | undefined): string {
  if (!ts) return 'Just now';
  const date = ts instanceof Date ? ts : ts.toDate();
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatActivityDate(date);
}

export function isToday(ts: Timestamp): boolean {
  const d = ts.toDate();
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isThisWeekend(ts: Timestamp): boolean {
  const d = ts.toDate();
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < -0.5 || diffDays > 7) return false;
  const day = d.getDay();
  return day === 0 || day === 5 || day === 6;
}

export function isStartingSoon(ts: Timestamp): boolean {
  const diffHours = (ts.toDate().getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours <= 48;
}

export function isPastActivity(ts: Timestamp): boolean {
  return ts.toDate().getTime() < Date.now();
}

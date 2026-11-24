type AnyDate = { toDate?: () => Date; toMillis?: () => number } | Date | string | number | null | undefined;

export function toJsDate(val: AnyDate): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof (val as { toMillis?: () => number }).toMillis === 'function') {
    return new Date((val as { toMillis: () => number }).toMillis());
  }
  return new Date(val as string | number);
}

export function formatActivityDate(ts: AnyDate): string {
  const date = toJsDate(ts);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatActivityTimeRange(start: AnyDate, end: AnyDate): string {
  const s = toJsDate(start);
  const e = toJsDate(end);
  const fmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${fmt.format(s)} – ${fmt.format(e)}`;
}

export function formatFullDateTime(ts: AnyDate): string {
  const d = toJsDate(ts);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(ts: AnyDate): string {
  if (!ts) return 'Just now';
  const date = toJsDate(ts);
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

export function isToday(ts: AnyDate): boolean {
  const d = toJsDate(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isThisWeekend(ts: AnyDate): boolean {
  const d = toJsDate(ts);
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < -0.5 || diffDays > 7) return false;
  const day = d.getDay();
  return day === 0 || day === 5 || day === 6;
}

export function isStartingSoon(ts: AnyDate): boolean {
  const diffHours = (toJsDate(ts).getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours <= 48;
}

export function isPastActivity(ts: AnyDate): boolean {
  return toJsDate(ts).getTime() < Date.now();
}

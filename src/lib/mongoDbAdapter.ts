import { getClientSocket } from '@/src/lib/socket';
import { wrapTimestamp } from '@/src/types/plusone';

export interface RefDescriptor {
  type: 'collection' | 'doc' | 'query';
  path: string;
  subPath?: string;
  filters?: { field: string; op: string; value: unknown }[];
  limitNum?: number;
  id?: string;
}

export function wrapDocData(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (
      k === 'startAt' ||
      k === 'endAt' ||
      k === 'createdAt' ||
      k === 'updatedAt' ||
      k === 'joinedAt' ||
      k === 'termsAcceptedAt'
    ) {
      out[k] = wrapTimestamp(v);
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item && typeof item === 'object' ? wrapDocData(item as Record<string, unknown>) : item
      );
    } else if (v && typeof v === 'object') {
      out[k] = wrapDocData(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('plusone_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Emulate collection
export function collection(_db: unknown, ...pathSegments: string[]): RefDescriptor {
  return {
    type: 'collection',
    path: pathSegments.join('/'),
  };
}

// Emulate doc
export function doc(_db: unknown, ...pathSegments: string[]): RefDescriptor {
  const full = pathSegments.join('/');
  const lastSlash = full.lastIndexOf('/');
  return {
    type: 'doc',
    path: lastSlash > -1 ? full.slice(0, lastSlash) : full,
    id: lastSlash > -1 ? full.slice(lastSlash + 1) : undefined,
  };
}

// Emulate query
export function query(ref: RefDescriptor, ...clauses: { type: string; [k: string]: unknown }[]): RefDescriptor {
  const filters: { field: string; op: string; value: unknown }[] = [];
  let limitNum: number | undefined;

  for (const c of clauses) {
    if (c.type === 'where') {
      filters.push({ field: c.field as string, op: c.op as string, value: c.value });
    } else if (c.type === 'limit') {
      limitNum = c.num as number;
    }
  }

  return {
    ...ref,
    type: 'query',
    filters,
    limitNum,
  };
}

export function where(field: string, op: string, value: unknown) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(num: number) {
  return { type: 'limit', num };
}

// Emulate getDoc
export async function getDoc(ref: RefDescriptor): Promise<{ exists: () => boolean; data: () => any; id?: string }> {
  const headers = getAuthHeader();
  let url = '';
  const id = ref.id;

  if (ref.path.startsWith('activities')) {
    url = `/api/activities/${id}`;
  } else if (ref.path.startsWith('activityPrivateDetails')) {
    url = `/api/activities/${id}`;
  } else if (ref.path.startsWith('users')) {
    url = `/api/users/${id}`;
  } else {
    url = `/api/${ref.path}/${id}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      return { exists: () => false, data: () => null, id };
    }
    const data = await res.json();
    return {
      exists: () => true,
      data: () => wrapDocData(data) as any,
      id: data.activityId || data.uid || id,
    };
  } catch {
    return { exists: () => false, data: () => null, id };
  }
}

// Emulate getDocs
export async function getDocs(ref: RefDescriptor): Promise<{ docs: { id: string; data: () => any; exists: () => boolean }[]; empty: boolean; size: number }> {
  const headers = getAuthHeader();
  let url = `/api/${ref.path}`;
  if (ref.path === 'activities') url = '/api/activities';
  if (ref.path === 'joinRequests') url = '/api/requests/my';
  if (ref.path === 'participants') url = '/api/participants/my';

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return { docs: [], empty: true, size: 0 };
    const list = await res.json();
    const items = Array.isArray(list) ? list : list.activities || list.participants || [];
    const docs = items.map((d: any) => ({
      id: d.activityId || d.requestId || d.participantId || d.uid || '',
      data: () => wrapDocData(d) as any,
      exists: () => true,
    }));
    return { docs, empty: docs.length === 0, size: docs.length };
  } catch {
    return { docs: [], empty: true, size: 0 };
  }
}

// Emulate onSnapshot
export function onSnapshot(
  ref: RefDescriptor,
  callback: (snapshot: {
    docs: { id: string; data: () => any; exists: () => boolean }[];
    data: () => any;
    exists: () => boolean;
    id?: string;
  }) => void,
  _errorCallback?: (err: Error) => void
): () => void {
  const socket = getClientSocket();
  let cancelled = false;

  async function fetchAndNotify() {
    if (cancelled) return;
    const headers = getAuthHeader();

    try {
      if (ref.type === 'doc') {
        const id = ref.id;
        let url = '';
        if (ref.path.includes('activities')) url = `/api/activities/${id}`;
        else if (ref.path.includes('activityPrivateDetails')) url = `/api/activities/${id}`;
        else if (ref.path.includes('activityRosters')) url = `/api/activities/${id}`;
        else if (ref.path.includes('users')) url = `/api/users/${id}`;
        else url = `/api/${ref.path}/${id}`;

        const res = await fetch(url, { headers });
        if (!res.ok) {
          callback({
            docs: [],
            data: () => null,
            exists: () => false,
            id,
          });
          return;
        }
        const data = await res.json();
        const wrapped = wrapDocData(data);
        callback({
          docs: [],
          data: () => wrapped,
          exists: () => true,
          id: (data.activityId || data.uid || id) as string,
        });
      } else {
        // Collection / query
        let url = `/api/${ref.path}`;
        if (ref.path === 'activities') {
          url = '/api/activities';
        } else if (ref.path === 'notifications') {
          url = '/api/notifications';
        } else if (ref.path === 'joinRequests') {
          const actFilter = ref.filters?.find((f) => f.field === 'activityId');
          url = actFilter ? `/api/requests/activity/${actFilter.value}` : '/api/requests/my';
        } else if (ref.path === 'participants') {
          const actFilter = ref.filters?.find((f) => f.field === 'activityId');
          url = actFilter ? `/api/participants/activity/${actFilter.value}` : '/api/participants/my';
        } else if (ref.path.includes('messages')) {
          const parts = ref.path.split('/');
          const actId = parts[1] || parts[0];
          url = `/api/messages/${actId}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) {
          callback({ docs: [], data: () => null, exists: () => false });
          return;
        }

        const data = await res.json();
        let items: any[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (data.notifications) {
          items = data.notifications;
        } else if (data.participants) {
          items = data.participants;
        } else if (data.activities) {
          items = data.activities;
        }

        const docs = items.map((it: any) => ({
          id: (it.activityId || it.requestId || it.participantId || it.notificationId || it.messageId || it.uid || '') as string,
          data: () => wrapDocData(it),
          exists: () => true,
        }));

        callback({
          docs,
          data: () => null,
          exists: () => docs.length > 0,
        });
      }
    } catch (err) {
      if (!cancelled && _errorCallback) {
        _errorCallback(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  // Initial fetch
  void fetchAndNotify();

  // Socket listener bindings
  const onActUpdate = () => void fetchAndNotify();
  const onMsgUpdate = () => void fetchAndNotify();
  const onNotifUpdate = () => void fetchAndNotify();

  socket.on('activity_updated', onActUpdate);
  socket.on('new_message', onMsgUpdate);
  socket.on('notification', onNotifUpdate);

  // Poll every 8s as fallback for network reconnects
  const interval = setInterval(() => {
    void fetchAndNotify();
  }, 8000);

  return () => {
    cancelled = true;
    clearInterval(interval);
    socket.off('activity_updated', onActUpdate);
    socket.off('new_message', onMsgUpdate);
    socket.off('notification', onNotifUpdate);
  };
}

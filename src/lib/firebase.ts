import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from './mongoDbAdapter';

export const db = {
  type: 'mongodb',
  url: '/api',
};

export const auth = {
  currentUser: null,
};

export const storage = {};
export const googleProvider = {};

export {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(
  error: unknown,
  _operationType: OperationType,
  _path: string | null
): never {
  const msg = error instanceof Error ? error.message : String(error);
  console.error('[Database Error]:', msg);
  throw new Error(msg);
}

export function getUserFriendlyError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  return err.message || fallback;
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}

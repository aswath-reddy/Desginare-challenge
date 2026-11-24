import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { ADMIN_EMAIL } from '@/src/constants/plusone';
import { ensureUserDocuments } from '@/src/lib/api';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import type { PrivateUser, UserPublicProfile } from '@/src/types/plusone';

interface AuthContextValue {
  firebaseUser: User | null;
  publicProfile: UserPublicProfile | null;
  privateProfile: PrivateUser | null;
  loading: boolean;
  profileError: string | null;
  isAdmin: boolean;
  unreadNotificationsCount: number;
  savedActivityIds: Set<string>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authRevision, setAuthRevision] = useState(0);
  const [publicProfile, setPublicProfile] = useState<UserPublicProfile | null>(null);
  const [privateProfile, setPrivateProfile] = useState<PrivateUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [savedActivityIds, setSavedActivityIds] = useState<Set<string>>(new Set());

  const loadProfiles = useCallback(async (user: User) => {
    try {
      setProfileError(null);
      if (!user.emailVerified) {
        setPublicProfile(null);
        setPrivateProfile(null);
        setIsAdmin(false);
        return;
      }

      const { publicProfile: pub, privateProfile: priv } =
        await ensureUserDocuments(user, true);
      setPublicProfile(pub);
      setPrivateProfile(priv);

      // Check admin status cleanly
      let adminStatus =
        user.emailVerified &&
        user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      if (!adminStatus) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          if (adminDoc.exists()) adminStatus = true;
        } catch {
          // Non-admin
        }
      }
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('Failed to load user profiles:', err);
      setProfileError(
        err instanceof Error
          ? err.message
          : 'Unable to load your profile from Firestore.'
      );
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      setFirebaseUser(auth.currentUser);
      setAuthRevision((v) => v + 1);
      await loadProfiles(auth.currentUser);
    }
  }, [loadProfiles]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthRevision((v) => v + 1);
      if (user) {
        await loadProfiles(user);
      } else {
        setPublicProfile(null);
        setPrivateProfile(null);
        setProfileError(null);
        setIsAdmin(false);
        setUnreadNotificationsCount(0);
        setSavedActivityIds(new Set());
      }
      setLoading(false);
    });
    return () => unsub();
  }, [loadProfiles]);

  // Real-time listeners for authenticated & verified user
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;

    const uid = firebaseUser.uid;
    const unsubPub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) setPublicProfile(snap.data() as UserPublicProfile);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const unsubPriv = onSnapshot(
      doc(db, 'privateUsers', uid),
      (snap) => {
        if (snap.exists()) setPrivateProfile(snap.data() as PrivateUser);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `privateUsers/${uid}`)
    );

    const notifQ = query(
      collection(db, 'notifications'),
      where('recipientId', '==', uid)
    );
    const unsubNotifs = onSnapshot(
      notifQ,
      (snap) => {
        let unread = 0;
        snap.docs.forEach((d) => {
          if (d.data().isRead === false) unread += 1;
        });
        setUnreadNotificationsCount(unread);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    const savedQ = query(
      collection(db, 'savedActivities'),
      where('userId', '==', uid)
    );
    const unsubSaved = onSnapshot(
      savedQ,
      (snap) => {
        const ids = new Set<string>();
        snap.docs.forEach((d) => {
          const actId = d.data().activityId;
          if (typeof actId === 'string') ids.add(actId);
        });
        setSavedActivityIds(ids);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'savedActivities')
    );

    return () => {
      unsubPub();
      unsubPriv();
      unsubNotifs();
      unsubSaved();
    };
  }, [firebaseUser, authRevision]);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        publicProfile,
        privateProfile,
        loading,
        profileError,
        isAdmin,
        unreadNotificationsCount,
        savedActivityIds,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getClientSocket } from '@/src/lib/socket';
import { wrapTimestamp, type PrivateUser, type UserPublicProfile } from '@/src/types/plusone';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  emailVerified: boolean;
  metadata?: { lastSignInTime?: string };
  providerData?: { providerId: string; email?: string }[];
}

interface AuthContextValue {
  firebaseUser: AppUser | null;
  publicProfile: UserPublicProfile | null;
  privateProfile: PrivateUser | null;
  loading: boolean;
  profileError: string | null;
  isAdmin: boolean;
  unreadNotificationsCount: number;
  savedActivityIds: Set<string>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName: string, adult: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<AppUser | null>(null);
  const [publicProfile, setPublicProfile] = useState<UserPublicProfile | null>(null);
  const [privateProfile, setPrivateProfile] = useState<PrivateUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [savedActivityIds, setSavedActivityIds] = useState<Set<string>>(new Set());

  const loadProfiles = useCallback(async (token: string) => {
    try {
      setProfileError(null);
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('plusone_token');
          setFirebaseUser(null);
          setPublicProfile(null);
          setPrivateProfile(null);
        }
        return;
      }

      const data = await res.json();

      const userApp: AppUser = {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        emailVerified: data.isVerified !== false,
      };

      const pub: UserPublicProfile = {
        uid: data.uid,
        displayName: data.displayName,
        photoURL: data.photoURL,
        bio: data.bio || '',
        city: data.city || 'New York',
        interests: data.interests || [],
        socialVibe: data.socialVibe || '',
        goals: data.goals || [],
        onboardingCompleted: Boolean(data.onboardingCompleted),
        adultConfirmed: Boolean(data.adultConfirmed),
        showCityOnProfile: data.showCityOnProfile !== false,
        showActivityCounts: data.showActivityCounts !== false,
        hostedCount: data.hostedCount || 0,
        completedCount: data.completedCount || 0,
        createdAt: wrapTimestamp(data.createdAt),
        updatedAt: wrapTimestamp(data.updatedAt),
      };

      const priv: PrivateUser = {
        uid: data.uid,
        email: data.email,
        notificationPreferences: data.notificationPreferences || {
          joinRequests: true,
          activityUpdates: true,
          groupAnnouncements: true,
          feedbackReminders: true,
        },
        privacySettings: data.privacySettings || {
          showCityOnProfile: true,
          showActivityCounts: true,
        },
        termsAcceptedAt: wrapTimestamp(data.createdAt),
        blockedUserIds: data.blockedUserIds || [],
        updatedAt: wrapTimestamp(data.updatedAt),
      };

      setFirebaseUser(userApp);
      setPublicProfile(pub);
      setPrivateProfile(priv);
      setIsAdmin(data.role === 'admin');

      // Connect to personal socket channel
      const socket = getClientSocket();
      socket.emit('join_user', data.uid);

      // Fetch unread notifications count
      try {
        const notifRes = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setUnreadNotificationsCount(notifData.unreadCount || 0);
        }
      } catch {
        // Ignore
      }

      // Fetch saved activities
      try {
        const savedRes = await fetch('/api/saved', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (savedRes.ok) {
          const savedData = await savedRes.json();
          setSavedActivityIds(new Set(savedData.savedIds || []));
        }
      } catch {
        // Ignore
      }
    } catch (err) {
      console.error('Failed to load user profiles:', err);
      setProfileError(err instanceof Error ? err.message : 'Unable to load profile');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('plusone_token');
    if (token) {
      await loadProfiles(token);
    }
  }, [loadProfiles]);

  const login = useCallback(
    async (email: string, pass: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }
      localStorage.setItem('plusone_token', data.token);
      await loadProfiles(data.token);
    },
    [loadProfiles]
  );

  const register = useCallback(
    async (email: string, pass: string, displayName: string, adultConfirmed: boolean) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, displayName, adultConfirmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account');
      }
      localStorage.setItem('plusone_token', data.token);
      await loadProfiles(data.token);
    },
    [loadProfiles]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem('plusone_token');
    setFirebaseUser(null);
    setPublicProfile(null);
    setPrivateProfile(null);
    setIsAdmin(false);
    setUnreadNotificationsCount(0);
    setSavedActivityIds(new Set());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('plusone_token');
    if (token) {
      loadProfiles(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadProfiles]);

  // Real-time socket event listeners for notifications
  useEffect(() => {
    if (!firebaseUser) return;
    const socket = getClientSocket();
    const handleNotif = () => {
      setUnreadNotificationsCount((c) => c + 1);
    };
    socket.on('notification', handleNotif);
    return () => {
      socket.off('notification', handleNotif);
    };
  }, [firebaseUser]);

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
        login,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

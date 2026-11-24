import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { LandingPage } from '@/src/pages/LandingPage';

const AuthPage = lazy(() =>
  import('@/src/pages/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const OnboardingPage = lazy(() =>
  import('@/src/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage }))
);
const DiscoverPage = lazy(() =>
  import('@/src/pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage }))
);
const ExplorePage = lazy(() =>
  import('@/src/pages/ExplorePage').then((m) => ({ default: m.ExplorePage }))
);
const ActivityDetailsPage = lazy(() =>
  import('@/src/pages/ActivityDetailsPage').then((m) => ({
    default: m.ActivityDetailsPage,
  }))
);
const CreateActivityPage = lazy(() =>
  import('@/src/pages/CreateActivityPage').then((m) => ({
    default: m.CreateActivityPage,
  }))
);
const MyPlansPage = lazy(() =>
  import('@/src/pages/MyPlansPage').then((m) => ({ default: m.MyPlansPage }))
);
const HostManagePage = lazy(() =>
  import('@/src/pages/HostManagePage').then((m) => ({ default: m.HostManagePage }))
);
const MessagesPage = lazy(() =>
  import('@/src/pages/MessagesPage').then((m) => ({ default: m.MessagesPage }))
);
const SavedPage = lazy(() =>
  import('@/src/pages/SavedPage').then((m) => ({ default: m.SavedPage }))
);
const NotificationsPage = lazy(() =>
  import('@/src/pages/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  }))
);
const ProfilePage = lazy(() =>
  import('@/src/pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const SafetyCenterPage = lazy(() =>
  import('@/src/pages/SafetyCenterPage').then((m) => ({
    default: m.SafetyCenterPage,
  }))
);
const AdminDashboardPage = lazy(() =>
  import('@/src/pages/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);
const NotFoundPage = lazy(() =>
  import('@/src/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center">
      <div className="font-display text-lg font-semibold tracking-tight text-[#080808] animate-pulse">
        plusone.
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  requireOnboarding = true,
}: {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}) {
  const { firebaseUser, publicProfile, loading, profileError, refreshProfile } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!firebaseUser) return <Navigate to="/auth?mode=login" replace />;
  if (!firebaseUser.emailVerified) return <Navigate to="/auth?mode=verify" replace />;
  if (!publicProfile) {
    if (profileError) {
      return (
        <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-white border border-[#E5E3DD] rounded-[24px] p-8 text-center space-y-4">
            <h1 className="font-display text-xl font-semibold text-[#080808]">
              Unable to connect to your account
            </h1>
            <p className="text-sm text-[#747474]">
              We couldn&apos;t load your PlusOne profile from Firestore right now.
            </p>
            <button
              type="button"
              onClick={() => void refreshProfile()}
              className="rounded-full bg-[#080808] text-[#F8F6F0] px-6 py-2.5 text-sm font-medium hover:bg-[#222] cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return <FullScreenLoader />;
  }
  if (requireOnboarding && !publicProfile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<Navigate to="/auth?mode=login" replace />} />
              <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />
              <Route path="/safety" element={<SafetyCenterPage />} />
              <Route path="/guidelines" element={<SafetyCenterPage />} />

              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute requireOnboarding={false}>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/discover"
                element={
                  <ProtectedRoute>
                    <DiscoverPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/explore"
                element={
                  <ProtectedRoute>
                    <ExplorePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/activities/:activityId" element={<ActivityDetailsPage />} />
              <Route
                path="/activities/:activityId/edit"
                element={
                  <ProtectedRoute>
                    <CreateActivityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <CreateActivityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-plans"
                element={
                  <ProtectedRoute>
                    <MyPlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/host/:activityId"
                element={
                  <ProtectedRoute>
                    <HostManagePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages/:activityId"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saved"
                element={
                  <ProtectedRoute>
                    <SavedPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/:uid"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/impact"
                element={
                  <ProtectedRoute>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

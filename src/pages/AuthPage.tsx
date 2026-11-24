import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from 'firebase/auth';
import { ArrowLeft, Eye, EyeOff, MailCheck, RefreshCw } from 'lucide-react';
import { BrandLogo } from '@/src/components/BrandLogo';
import { EditorialImage } from '@/src/components/EditorialImage';
import { CURATED_COVER_IMAGES } from '@/src/constants/plusone';
import { auth, googleProvider } from '@/src/lib/firebase';
import { ensureUserDocuments } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';

type AuthMode = 'welcome' | 'login' | 'signup' | 'forgot' | 'verify';

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err);
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in popup was closed before finishing.';
    case 'auth/popup-blocked':
      return 'Browser blocked the Google sign-in popup. Redirecting you cleanly instead...';
    case 'auth/unauthorized-domain':
      return 'This domain is not yet listed under Firebase Authentication → Settings → Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console. Use Google sign-in below or enable Email/Password under Authentication → Sign-in method.';
    default:
      return msg || 'Authentication failed. Please try again.';
  }
}

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { firebaseUser, publicProfile, refreshProfile, logout } = useAuth();

  const initialMode = (searchParams.get('mode') as AuthMode) || 'welcome';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const m = searchParams.get('mode') as AuthMode | null;
    if (m && ['welcome', 'login', 'signup', 'forgot', 'verify'].includes(m)) {
      setMode(m);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!firebaseUser) return;
    if (!firebaseUser.emailVerified) {
      setMode('verify');
      return;
    }
    if (publicProfile) {
      navigate(publicProfile.onboardingCompleted ? '/discover' : '/onboarding', {
        replace: true,
      });
    }
  }, [firebaseUser, publicProfile, navigate]);

  useEffect(() => {
    let active = true;
    getRedirectResult(auth)
      .then(async (cred) => {
        if (!active || !cred?.user) return;
        const { publicProfile: pub } = await ensureUserDocuments(cred.user, true);
        navigate(pub.onboardingCompleted ? '/discover' : '/onboarding', {
          replace: true,
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(mapAuthError(err));
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleGoogleSignIn() {
    if (mode === 'signup' && !adultConfirmed) {
      setError('Please confirm you are 18+ and accept the Community Guidelines.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const { publicProfile: pub } = await ensureUserDocuments(cred.user, true);
      navigate(pub.onboardingCompleted ? '/discover' : '/onboarding', {
        replace: true,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          setError(mapAuthError(redirectErr));
        }
      } else {
        setError(mapAuthError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Please enter your email address.');
        return;
      }
      setBusy(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        setNotice('Password reset instructions have been sent to your email.');
      } catch (err) {
        setError(mapAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (!adultConfirmed) {
        setError('You must confirm you are at least 18 years old and accept the guidelines.');
        return;
      }
      setBusy(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: displayName.trim() });
        await sendEmailVerification(cred.user);
        setMode('verify');
        setNotice('Verification email sent. Please check your inbox.');
      } catch (err) {
        setError(mapAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'login') {
      setBusy(true);
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!cred.user.emailVerified) {
          setMode('verify');
          return;
        }
        const { publicProfile: pub } = await ensureUserDocuments(cred.user, true);
        navigate(pub.onboardingCompleted ? '/discover' : '/onboarding', {
          replace: true,
        });
      } catch (err) {
        setError(mapAuthError(err));
      } finally {
        setBusy(false);
      }
    }
  }

  async function handleResendVerification() {
    if (!auth.currentUser) return;
    setBusy(true);
    setError('');
    try {
      await sendEmailVerification(auth.currentUser);
      setNotice('A fresh verification link has been sent to your email.');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckVerified() {
    setBusy(true);
    setError('');
    try {
      await refreshProfile();
      if (!auth.currentUser?.emailVerified) {
        setError('Email is not verified yet. Please click the link in your inbox first.');
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#080808] grid grid-cols-1 lg:grid-cols-12">
      {/* Editorial Left Rail (Desktop) */}
      <aside className="hidden lg:flex lg:col-span-5 bg-[#080808] text-[#F8F6F0] flex-col justify-between p-10 xl:p-12">
        <Link to="/" aria-label="PlusOne home">
          <BrandLogo variant="light" size="md" />
        </Link>

        <div className="space-y-6 my-auto py-8">
          <div className="aspect-[4/3] rounded-[20px] overflow-hidden border border-white/15 bg-[#181818]">
            <EditorialImage
              src={CURATED_COVER_IMAGES[0].url}
              alt="Friends exploring an art museum together"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-2.5">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.025em] leading-[1.08] text-balance">
              Good plans.
              <br />
              Better company.
            </h2>
            <p className="text-sm text-[#F8F6F0]/70 leading-relaxed max-w-sm">
              Join small groups for museum mornings, coffee runs, hikes, and shared
              plans around your city.
            </p>
          </div>
        </div>

        <p className="text-xs text-[#F8F6F0]/55 border-t border-white/15 pt-5">
          Adults 18+ · Public meeting venues · Activity-first discovery
        </p>
      </aside>

      {/* Right Auth Column */}
      <div className="lg:col-span-7 flex flex-col min-h-screen">
        <header className="px-6 sm:px-10 py-5 flex items-center justify-between">
          <Link to="/" className="lg:hidden">
            <BrandLogo variant="dark" size="md" />
          </Link>
          <span className="hidden lg:block" />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#747474] hover:text-[#080808] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-8 sm:py-12">
          <div className="w-full max-w-md bg-white border border-[#E5E3DD] rounded-[24px] p-7 sm:p-10 space-y-6">
            {mode === 'verify' && firebaseUser ? (
              <div className="space-y-5 text-center">
                <MailCheck
                  className="w-7 h-7 text-[#080808] mx-auto"
                  strokeWidth={1.5}
                />
                <div>
                  <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] mb-2">
                    Verify your email
                  </h1>
                  <p className="text-sm text-[#747474] leading-relaxed">
                    We sent a verification link to{' '}
                    <span className="font-medium text-[#080808]">{firebaseUser.email}</span>.
                    Confirm your email to unlock PlusOne plans and messaging.
                  </p>
                </div>

                {error && (
                  <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3.5 py-2.5 rounded-xl text-left">
                    {error}
                  </p>
                )}
                {notice && (
                  <p className="text-xs text-[#166534] bg-[#DCFCE7] px-3.5 py-2.5 rounded-xl text-left">
                    {notice}
                  </p>
                )}

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCheckVerified}
                    disabled={busy}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] py-3 text-sm font-medium hover:bg-[#222] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {busy ? 'Checking...' : "I've verified my email"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={busy}
                    className="w-full rounded-full border border-[#E5E3DD] py-3 text-sm font-medium hover:bg-[#F0EEE8] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Resend verification email
                  </button>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="w-full text-xs text-[#747474] hover:text-[#080808] pt-2 cursor-pointer"
                  >
                    Sign out and use a different account
                  </button>
                </div>
              </div>
            ) : mode === 'welcome' ? (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl font-semibold tracking-[-0.025em] leading-[1.1] mb-2">
                    Find your people. Go somewhere.
                  </h1>
                  <p className="text-sm text-[#747474] leading-relaxed">
                    Create plans, join small groups, and meet in real life. Strictly 18+
                    and activity-first.
                  </p>
                </div>

                <div className="space-y-3">
                  {error && (
                    <p
                      role="alert"
                      className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3.5 py-2.5 rounded-xl leading-relaxed"
                    >
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={busy}
                    className="w-full rounded-full bg-[#080808] text-[#F8F6F0] py-3 text-sm font-medium hover:bg-[#222] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {busy ? 'Signing in...' : 'Continue with Google'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setNotice('');
                      setMode('signup');
                    }}
                    className="w-full rounded-full border border-[#E5E3DD] bg-white text-[#080808] py-3 text-sm font-medium hover:bg-[#F0EEE8] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Sign up with email
                  </button>
                </div>

                <p className="text-xs text-center text-[#747474]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setNotice('');
                      setMode('login');
                    }}
                    className="font-semibold text-[#080808] hover:underline cursor-pointer"
                  >
                    Log in
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h1 className="font-display text-2xl sm:text-[1.75rem] font-semibold tracking-[-0.025em] mb-1">
                    {mode === 'signup'
                      ? 'Create your account'
                      : mode === 'forgot'
                        ? 'Reset your password'
                        : 'Welcome back'}
                  </h1>
                  <p className="text-sm text-[#747474]">
                    {mode === 'signup'
                      ? 'Join real-world plans in your city.'
                      : mode === 'forgot'
                        ? 'Enter your email and we will send a reset link.'
                        : 'Log in to see your upcoming plans.'}
                  </p>
                </div>

                {mode !== 'forgot' && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={busy}
                      className="w-full rounded-full border border-[#E5E3DD] bg-white text-[#080808] py-2.5 text-sm font-medium hover:bg-[#F0EEE8] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                    >
                      Continue with Google
                    </button>

                    <div className="flex items-center gap-3 text-xs text-[#747474]">
                      <span className="h-px flex-1 bg-[#E5E3DD]" />
                      <span>or with email</span>
                      <span className="h-px flex-1 bg-[#E5E3DD]" />
                    </div>
                  </>
                )}

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <div>
                      <label
                        htmlFor="auth-name"
                        className="block text-xs font-medium text-[#080808] mb-1.5"
                      >
                        Full name or first name
                      </label>
                      <input
                        id="auth-name"
                        type="text"
                        required
                        maxLength={80}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-3.5 py-2.5 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="auth-email"
                      className="block text-xs font-medium text-[#080808] mb-1.5"
                    >
                      Email address
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-3.5 py-2.5 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors"
                    />
                  </div>

                  {mode !== 'forgot' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="auth-password"
                          className="block text-xs font-medium text-[#080808]"
                        >
                          Password
                        </label>
                        {mode === 'login' && (
                          <button
                            type="button"
                            onClick={() => {
                              setError('');
                              setNotice('');
                              setMode('forgot');
                            }}
                            className="text-xs text-[#747474] hover:text-[#080808] cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          id="auth-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] pl-3.5 pr-10 py-2.5 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#747474] hover:text-[#080808] cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === 'signup' && (
                    <label className="flex items-start gap-2.5 text-xs text-[#747474] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adultConfirmed}
                        onChange={(e) => setAdultConfirmed(e.target.checked)}
                        className="mt-0.5 rounded border-[#E5E3DD] accent-[#080808]"
                      />
                      <span>
                        I confirm I am at least <strong>18 years old</strong> and accept the{' '}
                        <Link to="/safety#guidelines" className="underline text-[#080808]">
                          Community Guidelines
                        </Link>{' '}
                        and{' '}
                        <Link to="/safety#terms" className="underline text-[#080808]">
                          Terms
                        </Link>
                        .
                      </span>
                    </label>
                  )}

                  {error && (
                    <p
                      role="alert"
                      className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3.5 py-2.5 rounded-xl leading-relaxed"
                    >
                      {error}
                    </p>
                  )}
                  {notice && (
                    <p className="text-xs text-[#166534] bg-[#DCFCE7] px-3.5 py-2.5 rounded-xl leading-relaxed">
                      {notice}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-full bg-[#080808] text-[#F8F6F0] py-3 text-sm font-medium hover:bg-[#222] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {busy
                      ? 'Please wait...'
                      : mode === 'signup'
                        ? 'Create account'
                        : mode === 'forgot'
                          ? 'Send reset email'
                          : 'Log in'}
                  </button>
                </form>

                <div className="pt-2 text-center text-xs text-[#747474]">
                  {mode === 'signup' ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setNotice('');
                          setMode('login');
                        }}
                        className="font-semibold text-[#080808] hover:underline cursor-pointer"
                      >
                        Log in
                      </button>
                    </>
                  ) : mode === 'forgot' ? (
                    <>
                      Remembered your password?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setNotice('');
                          setMode('login');
                        }}
                        className="font-semibold text-[#080808] hover:underline cursor-pointer"
                      >
                        Back to log in
                      </button>
                    </>
                  ) : (
                    <>
                      New to PlusOne?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setNotice('');
                          setMode('signup');
                        }}
                        className="font-semibold text-[#080808] hover:underline cursor-pointer"
                      >
                        Sign up
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

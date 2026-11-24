import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, MapPin, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { BrandLogo } from '@/src/components/BrandLogo';
import { UserAvatar } from '@/src/components/EditorialImage';
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  POPULAR_CITIES,
  SOCIAL_VIBES,
  USER_GOALS,
} from '@/src/constants/plusone';
import { saveOnboardingProfile } from '@/src/lib/api';
import { uploadImageToStorage } from '@/src/lib/storage';
import { useAuth } from '@/src/context/AuthContext';

export function OnboardingPage() {
  const { firebaseUser, publicProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [completedScreen, setCompletedScreen] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [city, setCity] = useState('New York');
  const [interests, setInterests] = useState<string[]>([]);
  const [socialVibe, setSocialVibe] = useState<string>(SOCIAL_VIBES[0]);
  const [goals, setGoals] = useState<string[]>([]);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (publicProfile) {
      setDisplayName((prev) => prev || publicProfile.displayName || '');
      setPhotoURL((prev) => prev || publicProfile.photoURL || '');
      setCity((prev) => prev || publicProfile.city || 'New York');
      if (publicProfile.interests?.length) setInterests(publicProfile.interests);
      if (publicProfile.socialVibe) setSocialVibe(publicProfile.socialVibe);
      if (publicProfile.goals?.length) setGoals(publicProfile.goals);
    }
  }, [publicProfile]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const url = await uploadImageToStorage(file, 'avatars', firebaseUser.uid);
      setPhotoURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleDetectLocation() {
    if (!navigator.geolocation) {
      setError('Location is unavailable in this browser. Please select your city below.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            const detected =
              data.address?.city ||
              data.address?.town ||
              data.address?.state ||
              '';
            if (detected) {
              setCity(detected);
            } else {
              setError('Could not detect city name — please choose manually below.');
            }
          }
        } catch {
          setError('Could not look up city name — please choose manually below.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError('Location permission declined. You can select your city manually.');
      },
      { timeout: 6000 }
    );
  }

  function toggleInterest(cat: string) {
    setInterests((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat].slice(0, 10)
    );
  }

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal].slice(0, 6)
    );
  }

  function handleNext() {
    setError('');
    if (step === 1 && !displayName.trim()) {
      setError('Please enter what we should call you.');
      return;
    }
    if (step === 2 && !city.trim()) {
      setError('Please select or enter your city.');
      return;
    }
    if (step === 3 && interests.length === 0) {
      setError('Pick at least one activity interest to tailor your feed.');
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  }

  async function handleFinish() {
    if (!firebaseUser) return;
    if (goals.length === 0) {
      setError('Select at least one reason you are exploring PlusOne.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveOnboardingProfile(firebaseUser.uid, {
        displayName: displayName.trim(),
        photoURL: photoURL || undefined,
        city: city.trim(),
        interests,
        socialVibe,
        goals,
      });
      await refreshProfile();
      setCompletedScreen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save onboarding.');
    } finally {
      setSaving(false);
    }
  }

  if (completedScreen) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] text-[#080808] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md w-full bg-white border border-[#E5E3DD] rounded-[24px] p-9 sm:p-10 text-center space-y-6"
        >
          <CheckCircle2
            className="w-8 h-8 text-[#080808] mx-auto"
            strokeWidth={1.5}
          />
          <div className="space-y-2.5">
            <h1 className="font-display text-3xl font-semibold tracking-[-0.025em] leading-[1.1] text-balance">
              You&apos;re one plan away from something new.
            </h1>
            <p className="text-sm text-[#747474] leading-relaxed">
              Your preferences are saved for {city}. You can update them anytime in your
              profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/discover', { replace: true })}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] py-3.5 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all cursor-pointer"
          >
            Explore activities
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#080808] flex flex-col">
      <header className="px-6 py-5 max-w-4xl w-full mx-auto flex items-center justify-between">
        <BrandLogo variant="dark" size="sm" />
        <span className="text-xs font-medium text-[#747474] tabular-nums">
          Step {step} of 5
        </span>
      </header>

      <div className="max-w-4xl w-full mx-auto px-6">
        <div className="h-0.5 w-full bg-[#E5E3DD] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#080808] transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl w-full bg-white border border-[#E5E3DD] rounded-[24px] p-7 sm:p-10 space-y-7"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-[-0.025em] mb-2">
                  What should we call you?
                </h1>
                <p className="text-sm text-[#747474]">
                  Hosts and participants see your display name and optional photo.
                </p>
              </div>

              <div className="flex items-center gap-5">
                <UserAvatar src={photoURL} name={displayName || 'P'} size="xl" />
                <div>
                  <label className="inline-flex items-center gap-2 rounded-full border border-[#E5E3DD] px-4 py-2 text-xs font-medium cursor-pointer hover:bg-[#F0EEE8] transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingPhoto ? 'Uploading...' : 'Upload photo (optional)'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="sr-only"
                    />
                  </label>
                  <p className="text-[11px] text-[#747474] mt-1.5">
                    JPG, PNG, or WebP up to 5 MB.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="onboard-name"
                  className="block text-xs font-medium text-[#080808] mb-1.5"
                >
                  Display name
                </label>
                <input
                  id="onboard-name"
                  type="text"
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-[-0.025em] mb-2">
                  Where are you exploring?
                </h1>
                <p className="text-sm text-[#747474]">
                  Choose your home city for nearby plans. Location access is optional.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  maxLength={100}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city name"
                  aria-label="City name"
                  className="flex-1 rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locating}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E3DD] px-5 py-3 text-xs font-medium hover:bg-[#F0EEE8] active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {locating ? 'Detecting...' : 'Use my location'}
                </button>
              </div>

              <div>
                <p className="text-xs font-medium text-[#747474] mb-2.5">Popular cities</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={`rounded-full px-4 py-2 text-xs font-medium border transition-colors ${
                        city === c
                          ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                          : 'bg-white text-[#080808] border-[#E5E3DD] hover:bg-[#F0EEE8]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-[-0.025em] mb-2">
                  What are you into?
                </h1>
                <p className="text-sm text-[#747474]">
                  Select as many categories as you would like to show up for.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACTIVITY_CATEGORIES.map((cat) => {
                  const selected = interests.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleInterest(cat)}
                      aria-pressed={selected}
                      className={`text-left rounded-[16px] border p-4 active:scale-[0.99] transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                          : 'bg-[#F8F6F0] text-[#080808] border-[#E5E3DD] hover:border-[#080808]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-display text-sm font-semibold">{cat}</span>
                        {selected && <Check className="w-4 h-4 shrink-0" />}
                      </div>
                      <p
                        className={`text-xs leading-relaxed ${
                          selected ? 'text-[#F8F6F0]/75' : 'text-[#747474]'
                        }`}
                      >
                        {CATEGORY_DESCRIPTIONS[cat]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-[-0.025em] mb-2">
                  What&apos;s your social vibe?
                </h1>
                <p className="text-sm text-[#747474]">
                  This helps others understand the pace you enjoy.
                </p>
              </div>

              <div className="space-y-2.5">
                {SOCIAL_VIBES.map((vibe) => {
                  const selected = socialVibe === vibe;
                  return (
                    <button
                      key={vibe}
                      type="button"
                      onClick={() => setSocialVibe(vibe)}
                      className={`w-full text-left rounded-[16px] border px-5 py-4 flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                          : 'bg-[#F8F6F0] text-[#080808] border-[#E5E3DD] hover:border-[#080808]/40'
                      }`}
                    >
                      <span className="text-sm font-medium">{vibe}</span>
                      {selected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-[-0.025em] mb-2">
                  What brings you to PlusOne?
                </h1>
                <p className="text-sm text-[#747474]">Select all that resonate.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {USER_GOALS.map((goal) => {
                  const selected = goals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleGoal(goal)}
                      className={`text-left rounded-[16px] border px-5 py-4 flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                          : 'bg-[#F8F6F0] text-[#080808] border-[#E5E3DD] hover:border-[#080808]/40'
                      }`}
                    >
                      <span className="text-sm font-medium">{goal}</span>
                      {selected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-4 py-2.5 rounded-xl">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#E5E3DD]">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep((s) => s - 1);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] px-5 py-2.5 text-sm font-medium hover:bg-[#F0EEE8] active:scale-[0.98] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <span />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] px-7 py-2.5 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all cursor-pointer"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] px-7 py-2.5 text-sm font-medium hover:bg-[#222] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
              >
                {saving ? 'Saving...' : 'Complete setup'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

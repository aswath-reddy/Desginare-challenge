import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Share2, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { AppShell } from '@/src/components/AppShell';
import { EditorialImage } from '@/src/components/EditorialImage';
import {
  ACTIVITY_CATEGORIES,
  CURATED_COVER_IMAGES,
  POPULAR_CITIES,
} from '@/src/constants/plusone';
import { editActivity, publishActivity } from '@/src/lib/api';
import { uploadImageToStorage } from '@/src/lib/storage';
import { db, getUserFriendlyError } from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type {
  Activity,
  ActivityCategory,
  ActivityPrivateDetails,
} from '@/src/types/plusone';

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateActivityPage() {
  const { activityId: editActivityId } = useParams<{ activityId: string }>();
  const isEditMode = Boolean(editActivityId);
  const navigate = useNavigate();
  const { firebaseUser, publicProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('Coffee & Conversations');
  const [description, setDescription] = useState('');
  const [coverImageURL, setCoverImageURL] = useState<string>(CURATED_COVER_IMAGES[1].url);

  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState(publicProfile?.city || 'New York');
  const [venueAddress, setVenueAddress] = useState('');
  const [dateStr, setDateStr] = useState(toDateInputValue(tomorrow));
  const [startTimeStr, setStartTimeStr] = useState('14:00');
  const [endTimeStr, setEndTimeStr] = useState('16:00');
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  );

  const [capacity, setCapacity] = useState(5);
  const [isPaid, setIsPaid] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [whatToBring, setWhatToBring] = useState('');
  const [adultOnlyAck, setAdultOnlyAck] = useState(true);

  const [meetingInstructions, setMeetingInstructions] = useState('');
  const [guidelinesAck, setGuidelinesAck] = useState(false);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [editBlockedReason, setEditBlockedReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditMode && publicProfile?.city) {
      setCity((prev) => (prev === 'New York' ? publicProfile.city : prev));
    }
  }, [isEditMode, publicProfile?.city]);

  useEffect(() => {
    if (!editActivityId || !firebaseUser) {
      setLoadingEdit(false);
      return;
    }
    let active = true;
    setLoadingEdit(true);
    setEditBlockedReason('');
    Promise.all([
      getDoc(doc(db, 'activities', editActivityId)),
      getDoc(doc(db, 'activityPrivateDetails', editActivityId)),
    ])
      .then(([actSnap, privSnap]) => {
        if (!active) return;
        if (!actSnap.exists()) {
          setEditBlockedReason('This activity could not be found.');
          setLoadingEdit(false);
          return;
        }
        const a = actSnap.data() as Activity;
        if (a.hostId !== firebaseUser.uid) {
          setEditBlockedReason('Only the host can edit this activity.');
          setLoadingEdit(false);
          return;
        }
        if (a.status !== 'published') {
          setEditBlockedReason('Completed or cancelled activities cannot be edited.');
          setLoadingEdit(false);
          return;
        }
        setTitle(a.title);
        setCategory(a.category);
        setDescription(a.description);
        setCoverImageURL(a.coverImageURL);
        setVenueName(a.venueName);
        setCity(a.city);
        setVenueAddress(a.venueAddress);
        const start = a.startAt.toDate();
        const end = a.endAt.toDate();
        setDateStr(toDateInputValue(start));
        setStartTimeStr(toTimeInputValue(start));
        setEndTimeStr(toTimeInputValue(end));
        setTimeZone(a.timeZone);
        setCapacity(a.capacity);
        setIsPaid(a.estimatedCost > 0);
        setEstimatedCost(a.estimatedCost);
        setCurrency(a.currency);
        setGuidelinesAck(true);

        if (privSnap.exists()) {
          const p = privSnap.data() as ActivityPrivateDetails;
          setMeetingInstructions(p.meetingInstructions);
          setWhatToBring(p.whatToBring);
        }
        setLoadingEdit(false);
      })
      .catch((err) => {
        if (!active) return;
        setEditBlockedReason(
          getUserFriendlyError(err, 'Unable to load activity details for editing.')
        );
        setLoadingEdit(false);
      });
    return () => {
      active = false;
    };
  }, [editActivityId, firebaseUser]);

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setUploadingCover(true);
    setError('');
    try {
      const url = await uploadImageToStorage(file, 'activities', firebaseUser.uid);
      setCoverImageURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload image.');
    } finally {
      setUploadingCover(false);
    }
  }

  function buildDateRange(): { startAt: Date; endAt: Date } {
    const startAt = new Date(`${dateStr}T${startTimeStr}:00`);
    const endAt = new Date(`${dateStr}T${endTimeStr}:00`);
    return { startAt, endAt };
  }

  function validateStep(currentStep: number): string | null {
    if (currentStep === 1) {
      if (title.trim().length < 3) return 'Title must be at least 3 characters.';
      if (description.trim().length < 10)
        return 'Please share at least a sentence describing the plan.';
      if (!coverImageURL) return 'Please choose or upload a cover image.';
    }
    if (currentStep === 2) {
      if (venueName.trim().length < 2) return 'Enter a public venue name.';
      if (city.trim().length < 2) return 'Enter a city.';
      if (venueAddress.trim().length < 3) return 'Enter the public venue street address.';
      const { startAt, endAt } = buildDateRange();
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        return 'Please select a valid date and time.';
      }
      if (!isEditMode && startAt.getTime() <= Date.now()) {
        return 'Start date and time must be in the future.';
      }
      if (endAt.getTime() <= startAt.getTime()) {
        return 'End time must be after start time.';
      }
    }
    if (currentStep === 3) {
      if (!Number.isFinite(capacity) || capacity < 2 || capacity > 50) {
        return 'Maximum group size must be between 2 and 50 (including you).';
      }
      if (isPaid && (!Number.isFinite(estimatedCost) || estimatedCost < 0)) {
        return 'Enter a valid estimated cost.';
      }
      if (!adultOnlyAck) {
        return 'Activities on PlusOne are strictly for adults 18+.';
      }
    }
    if (currentStep === 4) {
      if (meetingInstructions.trim().length < 3) {
        return 'Add clear meeting instructions for approved participants.';
      }
      if (!guidelinesAck) {
        return 'Please confirm this activity takes place in a public venue and follows Community Guidelines.';
      }
    }
    return null;
  }

  function handleNext() {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    setStep((s) => Math.min(4, s + 1));
  }

  async function handlePublish() {
    for (const s of [1, 2, 3, 4] as const) {
      const msg = validateStep(s);
      if (msg) {
        setStep(s);
        setError(msg);
        return;
      }
    }
    if (!publicProfile) return;

    const { startAt, endAt } = buildDateRange();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        category,
        description: description.trim(),
        coverImageURL,
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim(),
        city: city.trim(),
        startAt,
        endAt,
        timeZone,
        capacity: Math.floor(Number(capacity)),
        estimatedCost: isPaid ? Math.max(0, Number(estimatedCost) || 0) : 0,
        currency,
        meetingInstructions: meetingInstructions.trim(),
        whatToBring: whatToBring.trim(),
      };

      if (isEditMode && editActivityId) {
        await editActivity(editActivityId, publicProfile, payload);
        navigate(`/activities/${editActivityId}`);
      } else {
        const id = await publishActivity(publicProfile, payload, false);
        setPublishedId(id);
      }
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to publish plan.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingEdit) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto bg-white border border-[#E5E3DD] rounded-[24px] p-10 text-center text-sm text-[#747474]">
          Loading activity details...
        </div>
      </AppShell>
    );
  }

  if (editBlockedReason) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto my-12 bg-white border border-[#E5E3DD] rounded-[24px] p-10 text-center space-y-4">
          <h1 className="font-display text-2xl font-semibold">Cannot edit activity</h1>
          <p className="text-sm text-[#747474]">{editBlockedReason}</p>
          <Link
            to="/my-plans"
            className="inline-flex rounded-full bg-[#080808] text-[#F8F6F0] px-6 py-2.5 text-sm font-medium"
          >
            Back to My Plans
          </Link>
        </div>
      </AppShell>
    );
  }

  if (publishedId) {
    const shareUrl = `${window.location.origin}/activities/${publishedId}`;
    return (
      <AppShell>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-lg mx-auto bg-white border border-[#E5E3DD] rounded-[24px] p-9 sm:p-10 text-center space-y-6 my-8"
        >
          <CheckCircle2
            className="w-8 h-8 text-[#080808] mx-auto"
            strokeWidth={1.5}
          />
          <div className="space-y-2.5">
            <h1 className="font-display text-3xl font-semibold tracking-[-0.025em]">
              Good things start with a plan.
            </h1>
            <p className="text-sm text-[#747474] leading-relaxed">
              Your activity is live. People nearby can now discover it and request to
              join.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to={`/activities/${publishedId}`}
              className="flex-1 rounded-full bg-[#080808] text-[#F8F6F0] py-3 px-6 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all"
            >
              View my activity
            </Link>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopiedShare(true);
                  setTimeout(() => setCopiedShare(false), 2500);
                } catch {
                  // Clipboard unavailable
                }
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E3DD] py-3 px-6 text-sm font-medium hover:bg-[#F0EEE8] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              {copiedShare ? 'Link copied!' : 'Share your plan'}
            </button>
          </div>
        </motion.div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#747474] tabular-nums">
              Step {step} of 4 · {isEditMode ? 'Edit plan' : 'Create a plan'}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-[-0.025em] mt-0.5">
              {step === 1
                ? 'What are we doing?'
                : step === 2
                  ? 'Where and when?'
                  : step === 3
                    ? "Who's coming?"
                    : 'Final details & preview'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs font-medium text-[#747474] hover:text-[#080808] cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <div className="h-0.5 w-full bg-[#E5E3DD] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#080808] transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-8 space-y-6"
        >
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="act-title"
                  className="block text-xs font-medium text-[#080808] mb-1.5"
                >
                  Activity title
                </label>
                <input
                  id="act-title"
                  type="text"
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Museum day with new friends"
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="act-cat"
                  className="block text-xs font-medium text-[#080808] mb-1.5"
                >
                  Category
                </label>
                <select
                  id="act-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white"
                >
                  {ACTIVITY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="act-desc"
                  className="block text-xs font-medium text-[#080808] mb-1.5"
                >
                  Description &amp; what to expect
                </label>
                <textarea
                  id="act-desc"
                  rows={4}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="We're exploring the museum and grabbing coffee afterward. New people are welcome!"
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white resize-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#080808]">Cover image</span>
                  <label className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] px-3.5 py-1.5 text-xs font-medium cursor-pointer hover:bg-[#F0EEE8]">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingCover ? 'Uploading...' : 'Upload custom photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleCoverUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {CURATED_COVER_IMAGES.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setCoverImageURL(img.url)}
                      className={`aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                        coverImageURL === img.url
                          ? 'border-[#080808]'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <EditorialImage
                        src={img.url}
                        alt={img.label}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="venue-name"
                    className="block text-xs font-medium text-[#080808] mb-1.5"
                  >
                    Public venue name
                  </label>
                  <input
                    id="venue-name"
                    type="text"
                    maxLength={120}
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g. Whitney Museum / Blue Bottle"
                    className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="act-city"
                    className="block text-xs font-medium text-[#080808] mb-1.5"
                  >
                    City
                  </label>
                  <input
                    id="act-city"
                    type="text"
                    list="city-suggestions"
                    maxLength={100}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white"
                  />
                  <datalist id="city-suggestions">
                    {POPULAR_CITIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label
                  htmlFor="venue-address"
                  className="block text-xs font-medium text-[#080808] mb-1.5"
                >
                  Public street address
                </label>
                <input
                  id="venue-address"
                  type="text"
                  maxLength={200}
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="99 Gansevoort St"
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="act-date"
                    className="block text-xs font-medium text-[#080808] mb-1.5"
                  >
                    Date
                  </label>
                  <input
                    id="act-date"
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="act-start"
                    className="block text-xs font-medium text-[#080808] mb-1.5"
                  >
                    Start time
                  </label>
                  <input
                    id="act-start"
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="act-end"
                    className="block text-xs font-medium text-[#080808] mb-1.5"
                  >
                    End time
                  </label>
                  <input
                    id="act-end"
                    type="time"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="act-cap"
                  className="block text-xs font-medium text-[#080808] mb-1.5"
                >
                  Maximum group size (including you as host)
                </label>
                <input
                  id="act-cap"
                  type="number"
                  min={2}
                  max={50}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-36 rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm tabular-nums focus:bg-white"
                />
                <p className="text-xs text-[#747474] mt-1">
                  Small groups of 3–8 tend to spark the easiest conversation.
                </p>
              </div>

              <div className="space-y-3">
                <span className="block text-xs font-medium text-[#080808]">
                  Estimated cost per person
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaid(false);
                      setEstimatedCost(0);
                    }}
                    className={`rounded-full px-5 py-2 text-xs font-medium border ${
                      !isPaid
                        ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                        : 'bg-white border-[#E5E3DD]'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaid(true)}
                    className={`rounded-full px-5 py-2 text-xs font-medium border ${
                      isPaid
                        ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                        : 'bg-white border-[#E5E3DD]'
                    }`}
                  >
                    Paid at venue
                  </button>
                </div>
                {isPaid && (
                  <div className="flex items-center gap-3 pt-1">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-3 py-2.5 text-sm"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="CAD">CAD ($)</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(Number(e.target.value))}
                      className="w-36 rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-2.5 text-sm tabular-nums"
                    />
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="act-bring"
                  className="block text-xs font-medium text-[#080808] mb-1.5"
                >
                  What participants should bring (optional)
                </label>
                <input
                  id="act-bring"
                  type="text"
                  maxLength={600}
                  value={whatToBring}
                  onChange={(e) => setWhatToBring(e.target.value)}
                  placeholder="e.g. Museum ticket, walking shoes, water bottle"
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-[#080808] cursor-pointer">
                <input
                  type="checkbox"
                  checked={adultOnlyAck}
                  onChange={(e) => setAdultOnlyAck(e.target.checked)}
                  className="accent-[#080808]"
                />
                Minimum age 18+ required for all participants
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="act-inst"
                  className="block text-xs font-medium text-[#080808] mb-1.5"
                >
                  Private meeting instructions (only visible to approved participants)
                </label>
                <textarea
                  id="act-inst"
                  rows={3}
                  maxLength={1500}
                  value={meetingInstructions}
                  onChange={(e) => setMeetingInstructions(e.target.value)}
                  placeholder="Meet near the front stone lobby coat check at 1:55 PM. I'll be wearing a charcoal jacket."
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-3 text-sm focus:bg-white resize-none"
                />
              </div>

              {/* Preview */}
              <div className="border border-[#E5E3DD] rounded-[20px] overflow-hidden bg-[#F8F6F0]">
                <div className="aspect-[16/9] max-h-48 overflow-hidden">
                  <EditorialImage
                    src={coverImageURL}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 space-y-1.5">
                  <p className="text-xs text-[#747474]">
                    {category} · {dateStr} · {startTimeStr} – {endTimeStr}
                  </p>
                  <h3 className="font-display text-lg font-semibold">{title}</h3>
                  <p className="text-xs text-[#747474]">
                    {venueName}, {city} · 1/{capacity} going ·{' '}
                    {isPaid ? `${currency} ${estimatedCost} est.` : 'Free'}
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[#747474] cursor-pointer">
                <input
                  type="checkbox"
                  checked={guidelinesAck}
                  onChange={(e) => setGuidelinesAck(e.target.checked)}
                  className="mt-0.5 accent-[#080808]"
                />
                <span>
                  I confirm this plan takes place at a public venue and follows the{' '}
                  <Link to="/safety#guidelines" className="underline text-[#080808]">
                    PlusOne Community Guidelines
                  </Link>
                  .
                </span>
              </label>
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

            {step < 4 ? (
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
                onClick={handlePublish}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] px-7 py-2.5 text-sm font-medium hover:bg-[#222] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting
                  ? 'Saving...'
                  : isEditMode
                    ? 'Save changes'
                    : 'Publish plan'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}

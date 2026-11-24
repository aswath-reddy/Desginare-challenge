import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Flag, LogOut, ShieldBan, Trash2, Upload, UserCheck } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { UserAvatar } from '@/src/components/EditorialImage';
import { ReportModal } from '@/src/components/ReportModal';
import { PageSkeleton } from '@/src/components/Skeletons';
import {
  ACTIVITY_CATEGORIES,
  POPULAR_CITIES,
  SOCIAL_VIBES,
} from '@/src/constants/plusone';
import {
  deleteUserAccountData,
  toggleBlockUser,
  updateUserProfile,
} from '@/src/lib/api';
import { uploadImageToStorage } from '@/src/lib/storage';
import { db, getUserFriendlyError } from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type { UserPublicProfile } from '@/src/types/plusone';

export function ProfilePage() {
  const { uid: paramUid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { firebaseUser, publicProfile, privateProfile, logout, refreshProfile } =
    useAuth();

  const isOwnProfile = !paramUid || paramUid === firebaseUser?.uid;
  const targetUid = paramUid || firebaseUser?.uid;

  const [viewedProfile, setViewedProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'public' | 'settings'>('public');

  // Edit state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [socialVibe, setSocialVibe] = useState('');
  const [notifPrefs, setNotifPrefs] = useState({
    joinRequests: true,
    activityUpdates: true,
    groupAnnouncements: true,
    feedbackReminders: true,
  });
  const [privacySettings, setPrivacySettings] = useState({
    showCityOnProfile: true,
    showActivityCounts: true,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [needsReauthPassword, setNeedsReauthPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [initializedForUid, setInitializedForUid] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUid) return;
    if (isOwnProfile && publicProfile) {
      setViewedProfile(publicProfile);
      if (initializedForUid !== targetUid) {
        setDisplayName(publicProfile.displayName || '');
        setBio(publicProfile.bio || '');
        setCity(publicProfile.city || '');
        setPhotoURL(publicProfile.photoURL || '');
        setInterests(publicProfile.interests || []);
        setSocialVibe(publicProfile.socialVibe || SOCIAL_VIBES[0]);
        if (privateProfile) {
          setNotifPrefs(privateProfile.notificationPreferences);
          setPrivacySettings(privateProfile.privacySettings);
        }
        setInitializedForUid(targetUid);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setInitializedForUid(null);
    getDoc(doc(db, 'users', targetUid))
      .then((snap) => {
        setViewedProfile(snap.exists() ? (snap.data() as UserPublicProfile) : null);
        setLoading(false);
      })
      .catch(() => {
        setViewedProfile(null);
        setLoading(false);
      });
  }, [targetUid, isOwnProfile, publicProfile, privateProfile, initializedForUid]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImageToStorage(file, 'avatars', firebaseUser.uid);
      setPhotoURL(url);
      await updateUserProfile(firebaseUser.uid, { photoURL: url });
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload avatar.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    setError('');
    setSaveMessage('');
    try {
      await updateUserProfile(
        firebaseUser.uid,
        {
          displayName,
          bio,
          city,
          photoURL,
          interests,
          socialVibe,
        },
        {
          notificationPreferences: notifPrefs,
          privacySettings,
        }
      );
      await refreshProfile();
      setSaveMessage('Profile and preferences saved.');
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to save settings.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleBlockToggle(targetId: string) {
    if (!firebaseUser || !privateProfile) return;
    setError('');
    try {
      const isBlocked = privateProfile.blockedUserIds.includes(targetId);
      await toggleBlockUser(
        firebaseUser.uid,
        targetId,
        privateProfile.blockedUserIds,
        !isBlocked
      );
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to update block list.'));
    }
  }

  async function handleDeleteAccount() {
    if (!firebaseUser) return;
    setDeleting(true);
    setError('');
    try {
      await deleteUserAccountData(firebaseUser, deletePassword || undefined);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = getUserFriendlyError(err, '');
      if (msg === 'REAUTH_REQUIRED') {
        setNeedsReauthPassword(true);
        setError('Please enter your password to confirm account deletion.');
      } else {
        setError(
          msg || 'Unable to delete account. Please log out and log back in before retrying.'
        );
      }
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (!viewedProfile) {
    return (
      <AppShell>
        <div className="bg-white border border-[#E5E3DD] rounded-[24px] p-10 text-center max-w-md mx-auto my-12">
          <h1 className="font-display text-2xl font-semibold mb-2">
            Profile not found
          </h1>
          <p className="text-sm text-[#747474]">This member profile is unavailable.</p>
        </div>
      </AppShell>
    );
  }

  const isBlockedUser =
    !isOwnProfile &&
    Boolean(privateProfile?.blockedUserIds.includes(viewedProfile.uid));

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474] mb-1">
              {isOwnProfile ? 'Account' : 'Member profile'}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">
              {isOwnProfile ? 'Your Profile' : viewedProfile.displayName}
            </h1>
          </div>

          {isOwnProfile ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab('public')}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                  tab === 'public'
                    ? 'bg-[#080808] text-[#F8F6F0]'
                    : 'bg-white border border-[#E5E3DD] hover:bg-[#F0EEE8]'
                }`}
              >
                Public view
              </button>
              <button
                type="button"
                onClick={() => setTab('settings')}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                  tab === 'settings'
                    ? 'bg-[#080808] text-[#F8F6F0]'
                    : 'bg-white border border-[#E5E3DD] hover:bg-[#F0EEE8]'
                }`}
              >
                Settings &amp; privacy
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBlockToggle(viewedProfile.uid)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] bg-white px-4 py-2 text-xs font-medium hover:bg-[#F0EEE8]"
              >
                {isBlockedUser ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Unblock user
                  </>
                ) : (
                  <>
                    <ShieldBan className="w-3.5 h-3.5" />
                    Block user
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] bg-white px-4 py-2 text-xs font-medium text-[#747474] hover:text-[#991B1B]"
              >
                <Flag className="w-3.5 h-3.5" />
                Report
              </button>
            </div>
          )}
        </div>

        {(tab === 'public' || !isOwnProfile) && (
          <div className="bg-white border border-[#E5E3DD] rounded-[24px] p-7 sm:p-9 space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <UserAvatar
                src={viewedProfile.photoURL}
                name={viewedProfile.displayName}
                size="xl"
              />
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-semibold">
                  {viewedProfile.displayName}
                </h2>
                {((isOwnProfile ? privacySettings.showCityOnProfile : viewedProfile.showCityOnProfile !== false) ||
                  viewedProfile.socialVibe) && (
                  <p className="text-sm text-[#747474]">
                    {(isOwnProfile ? privacySettings.showCityOnProfile : viewedProfile.showCityOnProfile !== false)
                      ? viewedProfile.city
                      : ''}
                    {(isOwnProfile ? privacySettings.showCityOnProfile : viewedProfile.showCityOnProfile !== false) &&
                    viewedProfile.socialVibe
                      ? ' · '
                      : ''}
                    {viewedProfile.socialVibe || ''}
                  </p>
                )}
                {(isOwnProfile ? privacySettings.showActivityCounts : viewedProfile.showActivityCounts !== false) && (
                  <div className="flex items-center gap-5 pt-2 text-xs font-medium tabular-nums">
                    <span>{viewedProfile.hostedCount || 0} hosted</span>
                    <span>{viewedProfile.completedCount || 0} completed</span>
                  </div>
                )}
              </div>
            </div>

            {viewedProfile.bio && (
              <div className="space-y-1.5 border-t border-[#E5E3DD] pt-6">
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-[#747474]">
                  About
                </p>
                <p className="text-sm text-[#080808] leading-relaxed">
                  {viewedProfile.bio}
                </p>
              </div>
            )}

            {viewedProfile.interests && viewedProfile.interests.length > 0 && (
              <div className="space-y-2 border-t border-[#E5E3DD] pt-6">
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-[#747474]">
                  Activity interests
                </p>
                <p className="text-sm text-[#080808] leading-relaxed">
                  {viewedProfile.interests.join(' · ')}
                </p>
              </div>
            )}

            {viewedProfile.goals && viewedProfile.goals.length > 0 && (
              <div className="space-y-2 border-t border-[#E5E3DD] pt-6">
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-[#747474]">
                  Here for
                </p>
                <p className="text-sm text-[#080808]">
                  {viewedProfile.goals.join(' · ')}
                </p>
              </div>
            )}
          </div>
        )}

        {isOwnProfile && tab === 'settings' && (
          <div className="space-y-6">
            <form
              onSubmit={handleSaveSettings}
              className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center gap-4">
                <UserAvatar src={photoURL} name={displayName || 'P'} size="lg" />
                <div>
                  <label className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3DD] px-4 py-2 text-xs font-medium cursor-pointer hover:bg-[#F0EEE8]">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? 'Uploading...' : 'Change photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="prof-name"
                    className="block text-xs font-medium mb-1.5"
                  >
                    Display name
                  </label>
                  <input
                    id="prof-name"
                    type="text"
                    required
                    maxLength={80}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-2.5 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prof-city"
                    className="block text-xs font-medium mb-1.5"
                  >
                    City
                  </label>
                  <input
                    id="prof-city"
                    type="text"
                    list="profile-cities"
                    required
                    maxLength={100}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-2.5 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors"
                  />
                  <datalist id="profile-cities">
                    {POPULAR_CITIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label htmlFor="prof-bio" className="block text-xs font-medium mb-1.5">
                  Short bio
                </label>
                <textarea
                  id="prof-bio"
                  rows={3}
                  maxLength={500}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share what kind of plans you enjoy..."
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-2.5 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="prof-vibe"
                  className="block text-xs font-medium mb-1.5"
                >
                  Social vibe
                </label>
                <select
                  id="prof-vibe"
                  value={socialVibe}
                  onChange={(e) => setSocialVibe(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-4 py-2.5 text-sm focus:bg-white focus:border-[#080808] focus:outline-none transition-colors"
                >
                  {SOCIAL_VIBES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_CATEGORIES.map((cat) => {
                    const selected = interests.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setInterests((prev) =>
                            prev.includes(cat)
                              ? prev.filter((c) => c !== cat)
                              : [...prev, cat].slice(0, 10)
                          )
                        }
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium border ${
                          selected
                            ? 'bg-[#080808] text-[#F8F6F0] border-[#080808]'
                            : 'bg-white border-[#E5E3DD]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E3DD] space-y-3">
                <p className="text-xs font-medium">Notification preferences</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {(
                    [
                      ['joinRequests', 'Join request updates'],
                      ['activityUpdates', 'Plan edits & cancellations'],
                      ['groupAnnouncements', 'Host group announcements'],
                      ['feedbackReminders', 'Post-activity feedback prompts'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs[key]}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({ ...p, [key]: e.target.checked }))
                        }
                        className="accent-[#080808]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E3DD] space-y-2.5 text-xs">
                <p className="font-medium">Privacy settings</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.showCityOnProfile}
                    onChange={(e) =>
                      setPrivacySettings((p) => ({
                        ...p,
                        showCityOnProfile: e.target.checked,
                      }))
                    }
                    className="accent-[#080808]"
                  />
                  <span>Show my home city on public profile</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.showActivityCounts}
                    onChange={(e) =>
                      setPrivacySettings((p) => ({
                        ...p,
                        showActivityCounts: e.target.checked,
                      }))
                    }
                    className="accent-[#080808]"
                  />
                  <span>Show hosted &amp; completed activity counts</span>
                </label>
              </div>

              {error && (
                <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-4 py-2.5 rounded-xl">
                  {error}
                </p>
              )}
              {saveMessage && (
                <p className="text-xs text-[#166534] bg-[#DCFCE7] px-4 py-2.5 rounded-xl">
                  {saveMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#080808] text-[#F8F6F0] px-7 py-2.5 text-sm font-medium hover:bg-[#222] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>

            {/* Blocked Users */}
            <div className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 space-y-3">
              <h2 className="font-display text-base font-semibold">
                Blocked users ({privateProfile?.blockedUserIds.length || 0})
              </h2>
              {!privateProfile?.blockedUserIds.length ? (
                <p className="text-xs text-[#747474]">
                  You have not blocked anyone. Blocked members are hidden from your
                  discovery feed.
                </p>
              ) : (
                <div className="space-y-2">
                  {privateProfile.blockedUserIds.map((bId) => (
                    <div
                      key={bId}
                      className="flex items-center justify-between text-xs py-1.5"
                    >
                      <span className="font-mono text-[#747474]">{bId}</span>
                      <button
                        type="button"
                        onClick={() => handleBlockToggle(bId)}
                        className="underline font-medium text-[#080808]"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Actions */}
            <div className="bg-white border border-[#E5E3DD] rounded-[24px] p-6 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => logout().then(() => navigate('/'))}
                className="inline-flex items-center gap-2 rounded-full border border-[#E5E3DD] px-5 py-2.5 text-xs font-medium hover:bg-[#F0EEE8]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log out
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#991B1B] hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete account
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {needsReauthPassword && (
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Confirm password"
                      aria-label="Confirm password to delete account"
                      className="rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-3 py-1.5 text-xs focus:bg-white focus:border-[#080808] focus:outline-none"
                    />
                  )}
                  <span className="text-xs text-[#991B1B]">Permanently delete?</span>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleting || (needsReauthPassword && !deletePassword)}
                    className="rounded-full bg-[#991B1B] text-white px-4 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Confirm delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(false);
                      setNeedsReauthPassword(false);
                      setDeletePassword('');
                    }}
                    className="rounded-full border border-[#E5E3DD] px-3 py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!isOwnProfile && (
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="user"
          targetId={viewedProfile.uid}
          targetLabel={viewedProfile.displayName}
        />
      )}
    </AppShell>
  );
}

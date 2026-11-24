# PlusOne. — Real-World Social Discovery Platform

**Find your people. Go somewhere.**  
Good plans. Better company.

PlusOne is an activity-first social discovery platform designed to turn solo intentions into shared real-world plans—built with React, TypeScript, Tailwind CSS, Firebase Authentication, Cloud Firestore, and Firebase Cloud Storage.

---

## Key Implemented Features

1. **Public Editorial Landing Page (`/`)** — Monochrome Space Grotesk + Manrope design, live featured activities from Firestore, 10 activity categories, safety overview, and policy links.
2. **Authentication (`/auth`)** — Google Sign-In (`signInWithPopup`), Email & Password Sign-Up/Log-In, Email Verification gate, Forgot Password reset flow, 18+ & Community Guidelines confirmation.
3. **5-Step Onboarding (`/onboarding`)** — Display name + optional avatar upload, home city selection (with optional geolocation helper), category interests, social vibe, and goals.
4. **Personalized Discover & Explore (`/discover`, `/explore`)** — City selector, keyword search, category/date/cost/available-spots filters, blocked-user filtering, and curated sections.
5. **Activity Details (`/activities/:activityId`)** — Public venue info, approved participant roster previews, gated private meeting instructions (host + approved participants only), save/share/`.ics` calendar export, report activity, and mobile sticky action bar.
6. **Multi-Step Plan Creation & Editing (`/create`, `/activities/:id/edit`)** — Validates future dates, start/end times, public venue details, capacity (`2..50`), and Storage cover image upload or curated editorial photography.
7. **Transactional Join Request & Approval Workflow** — Deterministic `activityId_userId` join requests, host approval/decline via Firestore `runTransaction` (preventing race conditions & overbooking), request withdrawal, and participant leaving/removal.
8. **My Plans (`/my-plans`) & Host Management (`/host/:activityId`)** — Tabs for Upcoming, Hosting, Pending, Completed, and Cancelled; host attendance confirmation, group announcements, activity completion, and cancellation.
9. **Activity-Scoped Real-Time Group Chat (`/messages`)** — Firestore `onSnapshot` listeners restricted to host and approved participants; leaving or removal immediately revokes access.
10. **In-App Notifications, Saved Plans, Profile & Safety** — Real-time notifications, persistent saved bookmarks, public/private profile views, user blocking, reporting, account deletion, and Safety Center (`/safety`).
11. **Admin Impact & Moderation Dashboard (`/admin/impact`)** — Strictly separates Real Pilot Data (`isDemo: false`) from Demo Data (`isDemo: true`), tracks the conversion funnel, distinguishes host-confirmed vs. self-reported attendance, aggregates post-activity feedback, and includes a Moderation Queue plus optional Demo Seed controls.

---

## Remaining Manual Firebase Console Setup Steps

Firebase Project ID: `sonorous-silo-3gt36` (configured in `firebase-applet-config.json`).

1. **Email/Password Authentication (Optional — Google Sign-In works immediately)**:
   - Open Firebase Console → **Authentication → Sign-in method** → Enable **Email/Password** if you want users to register with email and password in addition to Google Sign-In.
2. **Cloud Storage Bucket & Rules**:
   - Open Firebase Console → **Storage** → Initialize Storage if not yet enabled, and deploy `storage.rules`:
     ```bash
     firebase deploy --only storage
     ```
3. **Firestore Composite Indexes**:
   - Deploy `firestore.indexes.json` if prompted by a query index link in the browser console:
     ```bash
     firebase deploy --only firestore:indexes
     ```

---

## Local Development & Build

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Lint Firestore rules:

```bash
npx eslint firestore.rules
```

---

## End-to-End Verification Checklist (Two Accounts)

1. **User A (Host)**:
   - Sign in on `/auth` (Google or verified Email/Password), complete 5-step onboarding (`/onboarding`).
   - Click **Create a Plan** (`/create`), fill all 4 steps with a future date and public venue, and publish.
2. **User B (Participant)**:
   - In an incognito/second browser session, sign in with a separate account and complete onboarding.
   - Open `/discover`, locate User A's activity, click **Save**, open details, verify private meeting instructions are locked, click **Count me in**, and submit a join request with an intro message.
3. **Host Approval (User A)**:
   - Open **Notifications** (`/notifications`) or **Host Dashboard** (`/host/:activityId`), review User B's request, and click **Approve**.
4. **Unlocked Experience (User B)**:
   - Verify approval notification, view activity under **My Plans → Upcoming**, confirm private meeting instructions are visible, open **Messages**, and send a group chat message.
5. **Completion & Pilot Feedback**:
   - **User A**: Receive User B's message, confirm User B's attendance on `/host/:activityId`, and click **Mark completed**.
   - **User B**: Go to **My Plans → Completed** and submit **Post-Activity Feedback**.
6. **Impact Dashboard (Admin)**:
   - Log in as the configured admin email and visit `/admin/impact` (`Real pilot data` tab) to verify live funnel counts, host-confirmed attendance, and feedback summaries.

/**
 * Security Rules Verification Spec (Dirty Dozen Adversarial Suite)
 * Run against Firebase Local Emulator Suite (@firebase/rules-unit-testing)
 * when testing locally:
 *   firebase emulators:exec --only firestore "npx vitest run firestore.rules.test.ts"
 */

export const DIRTY_DOZEN_CASES = [
  '1. Unverified user (email_verified: false) write to /activities -> PERMISSION_DENIED',
  '2. Shadow field injection (isAdmin: true) in /users/{uid} -> PERMISSION_DENIED',
  '3. Cross-user read of /privateUsers/{otherUid} -> PERMISSION_DENIED',
  '4. Host creating joinRequest for their own activity -> PERMISSION_DENIED',
  '5. Overbooking approvedParticipantCount > capacity on /activities -> PERMISSION_DENIED',
  '6. Non-member read of /activityPrivateDetails/{actId} -> PERMISSION_DENIED',
  '7. Non-member listing /conversations/{actId}/messages -> PERMISSION_DENIED',
  '8. Removed/left participant sending message to /conversations/{actId}/messages -> PERMISSION_DENIED',
  '9. Approved participant spoofing senderId in message -> PERMISSION_DENIED',
  '10. Submitting /feedback/{actId}_{uid} before activity status == completed -> PERMISSION_DENIED',
  '11. Non-admin listing /reports -> PERMISSION_DENIED',
  '12. Creating /activities with backdated createdAt != request.time -> PERMISSION_DENIED',
] as const;

# PlusOne Security Specification

## 1. Data Invariants
1. **PII Isolation**: Email addresses, notification preferences, privacy settings, and `blockedUserIds` live exclusively in `/privateUsers/{uid}` and are never readable by other users.
2. **Public vs Private Activity Split**: Public activity listings live in `/activities/{activityId}`. Exact `meetingInstructions` and `whatToBring` live in `/activityPrivateDetails/{activityId}` and are readable only by the activity host or an approved participant in `/participants/{activityId}_{uid}`.
3. **Capacity & No-Overbooking**: `approvedParticipantCount` cannot exceed `capacity` (2..50), and only the host may increment it (+1) while status is `'published'`.
4. **Deterministic Join Requests & Feedback**: `/joinRequests/{activityId}_{userId}` and `/feedback/{activityId}_{userId}` enforce deterministic IDs to prevent duplicate requests or duplicate feedback submissions.
5. **Group Chat Master Gate**: `/conversations/{conversationId}/messages` checks membership in `/participants/{conversationId}_{uid}` (`membershipStatus == 'approved'`) or host ownership. Leaving or being removed immediately revokes read and write access.
6. **Privilege Escalation Prevention**: Users cannot write to `/admins/{uid}` or set admin roles on their profile. Admin privileges require verified email (`email_verified == true`) matching the configured admin email or a server-managed `/admins/{uid}` record. Profile `hostedCount` and `completedCount` increments are bounded to `+1` per atomic write, conversation metadata (`title`, `coverImageURL`) is host-only, and notifications validate activity/host/participant relationships.
7. **Server Timestamps**: All `createdAt` and `updatedAt` timestamps must match `request.time`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unverified Write**: Unverified email user attempts to create `/activities/act_1` (`email_verified == false`).
2. **Shadow Field Injection**: Authenticated user creates `/users/{uid}` with extra field `isAdmin: true`.
3. **PII Read Leak**: User B attempts `get` on `/privateUsers/{userA_uid}`.
4. **Self-Join Host Bypass**: Host attempts to create `/joinRequests/{actId}_{hostId}` for their own activity.
5. **Overbooking Bypass**: Host attempts to update `/activities/{actId}` setting `approvedParticipantCount = capacity + 1`.
6. **Private Instructions Leak**: Non-approved User B attempts `get` on `/activityPrivateDetails/{actId}`.
7. **Unauthorized Chat Eavesdropping**: Non-member User C attempts `list` on `/conversations/{actId}/messages`.
8. **Revoked Member Chat Write**: User B with `membershipStatus: 'left'` attempts to create a message in `/conversations/{actId}/messages`.
9. **Spoofed Sender Message**: Approved User B attempts to send a message with `senderId: userA_uid`.
10. **Duplicate / Premature Feedback**: User B attempts to submit `/feedback/{actId}_{userB}` while activity `status == 'published'` (not `'completed'`).
11. **Public Report Scraping**: Non-admin User B attempts `list` on `/reports`.
12. **Client Timestamp Forgery**: User A creates `/activities/act_2` with backdated `createdAt` instead of `request.time`.

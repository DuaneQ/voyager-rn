# App Store Review History - TravalPass iOS

**App:** TravalPass  
**Bundle ID:** com.travalpass.app  
**Platform:** iOS (React Native/Expo)

This document consolidates all App Store review submissions, rejections, and responses for historical reference.

---

## Current Status (January 17, 2026)

**Build 15** - Awaiting re-review response  
**Submission ID:** d0922a53-3055-4cf5-addb-7355eea0437d  
**Status:** Rejected → Re-review requested

---

## Rejection #2 - January 16, 2026

**Build:** 15  
**Guideline:** 1.2 - Safety - User-Generated Content

### Apple's Message:
> "The issues we previously identified still need your attention. We found in our review that your app includes user-generated content but does not have all the required precautions."

### Required Precautions:
1. ✅ Require that users agree to terms (EULA) with zero tolerance language
2. ✅ A mechanism for users to block abusive users with instant removal and developer notification

### Our Response (January 17, 2026):
Re-review requested for Build 15 without new submission. Both features already implemented:
- Terms of Service with Section 4 "ZERO TOLERANCE POLICY"
- Block button on every profile with instant content removal
- All blocks logged in Firestore for developer visibility

**Response Document:** `ios/APPLE_SHORT_RESPONSE_BUILD15.txt`

---

## Implementation Details

### ✅ Requirement 1: Terms of Service with Zero Tolerance Policy

**Implementation:**
- **File:** `src/legal/TERMS_OF_SERVICE.md` (Section 4)
- **Enforcement:** `src/components/modals/TermsOfServiceModal.tsx`
- **Storage:** Firestore `users/{uid}.termsOfService.accepted = true`

**Key Features:**
- Mandatory acceptance before app use (cannot be bypassed)
- TermsGuard component blocks all navigation until accepted
- 6 required acknowledgments:
  1. Read and understand complete Terms
  2. Understand risks of meeting strangers
  3. Assume responsibility for personal safety
  4. Release TravalPass from liability
  5. Confirm 18+ years old
  6. Agree to comply with laws

**Section 4 - Zero Tolerance Language:**
```
TRAVALPASS MAINTAINS A STRICT ZERO TOLERANCE POLICY FOR:
- Nudity, pornography, or sexually explicit content
- Hate speech, discrimination, or harassment
- Violence, threats, or dangerous content
- Child exploitation or endangerment of any kind

IMMEDIATE CONSEQUENCES:
- Accounts posting objectionable content will be immediately suspended
- Violations result in permanent account termination and ejection
- Content removed within 24 hours of being reported
- Reported users blocked from creating new accounts
- Severe violations reported to law enforcement
```

**Section 4.2 - Enforcement Commitment:**
- All user reports reviewed within 24 hours
- Objectionable content removed immediately upon verification
- Users who report violations receive confirmation
- Multiple violations result in escalating consequences

---

### ✅ Requirement 2: Blocking with Instant Removal & Developer Notification

**Implementation:**
- **File:** `src/components/modals/ViewProfileModal.tsx` (Lines 329-361)
- **Context:** `src/context/AuthContext.tsx`
- **Search Filtering:** `src/hooks/useSearchItineraries.ts`

**Key Features:**
- Block button (🚫) on every user profile
- Confirmation alert prevents accidental blocks
- Updates Firestore: `users/{uid}.blocked` array

**Instant Content Removal (3 Effects):**

1. **Search Results**
   - Blocked user disappears from search immediately
   - Server-side RPC excludes blocked user IDs
   - Client-side post-processing for bidirectional blocks
   - Implementation: `useSearchItineraries.ts`

2. **Video Feed**
   - Blocked user's videos removed instantly
   - Videos filtered by `userInfo.blocked` array
   - Implementation: `VideoFeedPage.tsx`

3. **Chat & Connections**
   - All connections between users deleted
   - Chat messages hidden
   - Queries and deletes `connections` collection documents

**Developer Notification (2 Methods):**

1. **Firestore Logging (Immediate)**
   - Storage: `users/{uid}.blocked` array
   - Access: Firebase Console → Firestore → users collection
   - Queryable: `users.where('blocked', 'array-contains', 'userId')`
   - Visibility: Real-time tracking of all blocks

2. **Email Reporting (When User Also Reports)**
   - Trigger: `functions/src/index.ts` - `notifyViolationReport`
   - Recipient: `violations@travalpass.com`
   - Contents: Report ID, reason, user details, timestamp
   - Response: 24-hour review commitment (Terms 4.2)

**Code Evidence:**
```typescript
// ViewProfileModal.tsx - Block Implementation
const handleBlock = async () => {
  Alert.alert('Block User', `Are you sure?`, [
    {
      text: 'Block',
      style: 'destructive',
      onPress: async () => {
        // Update Firestore - DEVELOPER CAN SEE THIS
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
          blocked: arrayUnion(userId),
        });
        
        // Refresh profile (triggers instant filtering)
        updateUserProfile(await getDoc(userRef).data());
        
        onClose(); // User disappears immediately
      },
    },
  ]);
};

// useSearchItineraries.ts - Search Filtering
const result = await searchFn({
  destination,
  currentUserId,
  blocked: userProfile.blocked || [], // Server excludes these
});

// Client-side bidirectional blocking
return filtered.filter(it => {
  const otherBlocked = it.userInfo?.blocked || [];
  return !otherBlocked.includes(currentUserId);
});
```

---

## Additional Safety Features (Beyond Requirements)

### Content Filtering
- **File:** `src/utils/videoValidation.ts`
- Pre-upload profanity detection
- Spam pattern detection
- Character limit enforcement
- Server-side Firestore security rules

### User Reporting
- **File:** `src/components/modals/ViewProfileModal.tsx`
- Report button on all profiles
- 6 violation categories:
  - Harassment or bullying
  - Inappropriate content
  - Spam or scam
  - Fake profile
  - Underage user
  - Other violations
- Text field for detailed description
- Storage: Firestore `violations` collection
- Automated email notifications

### Video-Specific Reporting (Added January 15, 2026)
- **Files:** 
  - `src/components/modals/ReportVideoModal.tsx`
  - `src/pages/VideoFeedPage.tsx`
- Report button on video cards (feed + profile)
- Video-specific categories:
  - Nudity or sexual content
  - Violence or dangerous content
  - Hate speech or discrimination
- Links video ID to violation report

---

## Testing & Verification

### How Apple Reviewers Can Verify:

**Test 1: Terms Acceptance**
1. Fresh install → Login
2. Expected: Terms modal blocks all access
3. Expected: Cannot dismiss without accepting
4. Expected: Section 4 shows zero tolerance language

**Test 2: Blocking (Instant Removal)**
1. Login as Test User A
2. Find Test User B in search
3. Block Test User B
4. Expected: B's profile closes immediately
5. Expected: B does NOT appear in search results
6. Expected: B's videos NOT in feed

**Test 3: Developer Notification**
1. After blocking Test User B
2. Firebase Console → Firestore → users → (A's UID)
3. Expected: `blocked` array contains B's UID

---

## Previous Submissions

### Rejection #1 - January 12, 2026 (Build 14)

**Issue:** Same guideline 1.2  
**Resolution:** Enhanced Terms of Service, added video reporting  
**Date Enhanced:** January 15, 2026

---

## Key Files Reference

### Terms of Service
- Legal text: `src/legal/TERMS_OF_SERVICE.md`
- Modal component: `src/components/modals/TermsOfServiceModal.tsx`
- Acceptance hook: `src/hooks/useTermsAcceptance.ts`
- Guard component: `src/components/auth/TermsGuard.tsx`

### Blocking System
- ViewProfile modal: `src/components/modals/ViewProfileModal.tsx`
- Auth context: `src/context/AuthContext.tsx`
- Search filtering: `src/hooks/useSearchItineraries.ts`
- Video filtering: `src/pages/VideoFeedPage.tsx`

### Reporting System
- User reports: `src/components/modals/ViewProfileModal.tsx`
- Video reports: `src/components/modals/ReportVideoModal.tsx`
- Email trigger: `functions/src/index.ts` (notifyViolationReport)

### Content Filtering
- Video validation: `src/utils/videoValidation.ts`
- Firestore rules: `firestore.rules`

---

## Contact Information

- **Moderation Email:** violations@travalpass.com
- **General Support:** support@travalpass.com
- **App Store Connect:** Available for direct communication

---

**Last Updated:** January 17, 2026

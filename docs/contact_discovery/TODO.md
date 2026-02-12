# Contact Discovery - TODO

## Completed ✅

### Phase 1: Foundation
- [x] Contact permission handling (iOS & Android)
- [x] Contact fetching and parsing (phone + email)
- [x] SHA-256 hashing service (expo-crypto)
- [x] Platform-specific contact providers
- [x] Error handling and logging

### Phase 2: Backend Integration
- [x] Cloud Functions deployed (dev + prod)
  - `matchContactsWithUsers` - Match hashes against registered users
  - `sendContactInvite` - Create invite record and generate referral link
- [x] Firestore indexes created (dev + prod)
  - `contactInvites` by `inviterUserId` + `invitedAt`
  - `contactInvites` by `inviterUserId` + `contactIdentifier` + `invitedAt`
- [x] Firestore security rules (dev + prod)
- [x] Contact sync batching (handles 1000+ contacts automatically)

### Phase 3: UI Components
- [x] ContactDiscoveryBanner on ProfilePage
- [x] DiscoveryResultsPage with Connect/Invite sections
- [x] Individual invite flow (SMS composer integration)
- [x] Invite All functionality (sequential batch processing)
- [x] Loading states and error handling
- [x] Cross-platform support (iOS, Android, Web)

### Phase 4: Production Deployment
- [x] Cloud functions deployed to mundo1-1 (production)
- [x] Firestore indexes created in mundo1-1 (production)
- [x] Tested with 1497 contacts on Android (batching works)
- [x] Tested on iOS simulator (invite flow works)
- [x] Web navigation compatibility (conditional hooks)

## Pending 🟡

### High Priority

#### 1. Referral Code Tracking (Viral Loop Completion)
**Problem:** SMS invites contain `https://travalpass.com?ref=abc123` but ref code is lost during signup.

**Web Implementation (PWA):**
```typescript
// In landing page or App.tsx (web only)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  if (refCode) {
    localStorage.setItem('pendingReferralCode', refCode);
  }
}, []);

// During user creation (auth flow)
const referralCode = localStorage.getItem('pendingReferralCode');
if (referralCode) {
  await updateDoc(userRef, { referralCode, signupDate: new Date() });
  localStorage.removeItem('pendingReferralCode');
  
  // Update contactInvites document
  const inviteQuery = query(
    collection(db, 'contactInvites'),
    where('referralCode', '==', referralCode),
    where('status', '==', 'sent')
  );
  const inviteDocs = await getDocs(inviteQuery);
  inviteDocs.forEach(async (doc) => {
    await updateDoc(doc.ref, {
      acceptedByUserId: newUser.uid,
      acceptedAt: serverTimestamp(),
      status: 'accepted'
    });
  });
}
```

**React Native Implementation (Deep Linking):**
```typescript
// app.json configuration
{
  "expo": {
    "scheme": "travalpass",
    "ios": {
      "associatedDomains": ["applinks:travalpass.com"]
    },
    "android": {
      "intentFilters": [{
        "action": "VIEW",
        "data": [{ "scheme": "https", "host": "travalpass.com" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    }
  }
}

// App.tsx or auth flow
useEffect(() => {
  Linking.getInitialURL().then(url => {
    if (url) {
      const { queryParams } = Linking.parse(url);
      if (queryParams?.ref) {
        AsyncStorage.setItem('pendingReferralCode', queryParams.ref as string);
      }
    }
  });
  
  const subscription = Linking.addEventListener('url', ({ url }) => {
    const { queryParams } = Linking.parse(url);
    if (queryParams?.ref) {
      AsyncStorage.setItem('pendingReferralCode', queryParams.ref as string);
    }
  });
  
  return () => subscription.remove();
}, []);

// During signup
const referralCode = await AsyncStorage.getItem('pendingReferralCode');
if (referralCode) {
  // Same update logic as web
  await AsyncStorage.removeItem('pendingReferralCode');
}
```

**Alternative: Firebase Dynamic Links**
- Use Firebase Dynamic Links for automatic install attribution
- Survives app installation (stores ref code even if app not installed)
- More complex setup but better user experience

**Value:**
- Enables referral analytics (who's recruiting effectively)
- Foundation for referral rewards/incentives
- Completes viral growth loop

**Estimated Effort:** 4-6 hours (web + mobile + testing)

---

#### 2. Connect Handler Implementation
**Current State:** `handleConnect` shows success alert stub

**Required Implementation:**
```typescript
const handleConnect = async (matchedContact: MatchedContact) => {
  try {
    setConnecting(matchedContact.userId);
    
    // Create connection request
    await addDoc(collection(db, 'connections'), {
      requesterId: user!.uid,
      responderId: matchedContact.userId,
      status: 'pending',
      createdAt: serverTimestamp(),
      requesterInfo: {
        displayName: user!.displayName,
        profilePhotoUrl: user!.profilePhotoUrl,
      },
      responderInfo: {
        displayName: matchedContact.displayName,
        profilePhotoUrl: matchedContact.profilePhotoUrl,
      }
    });
    
    // Optional: Send push notification via Cloud Function
    // await httpsCallable(functions, 'sendConnectionRequest')({ 
    //   responderId: matchedContact.userId 
    // });
    
    showAlert('Connection request sent!', 'success');
    
    // Update UI state to show "Pending"
    setConnectedUsers(prev => [...prev, matchedContact.userId]);
  } catch (error) {
    showAlert('Failed to send connection request', 'error');
  } finally {
    setConnecting(null);
  }
};
```

**UI Changes:**
- Button shows "Connect" → "Pending" after request
- Disable button for already-connected users
- Handle existing connections (check before rendering Connect button)

**Estimated Effort:** 2-3 hours

---

### Medium Priority

#### 3. Banner Auto-Refresh on Tab Focus
**Current State:** Banner shows stale counts if user syncs contacts then leaves ProfilePage

**Implementation:**
```typescript
// ProfilePage.tsx
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  React.useCallback(() => {
    refreshContactStats(); // Re-fetch syncMetadata from Firestore
  }, [])
);
```

**Estimated Effort:** 30 minutes

---

#### 4. Integration Test Updates
**Current State:** 
- `DiscoveryResultsPage.test.tsx` - Already skipped (expects old prop-based API)
- `AppNavigator.test.tsx` - Fails because DiscoveryResultsPage uses `useRoute()` outside navigation context
- `ContactDiscoveryRepository.test.ts` - Some edge case failures

**Required:**
- Rewrite DiscoveryResultsPage tests to use navigation mocks
- Fix AppNavigator tests to provide proper navigation context
- Fix edge case scenarios in ContactDiscoveryRepository tests

**Estimated Effort:** 3-4 hours

---

### Low Priority (Nice-to-Have)

#### 5. Contact Sync Status Indicator
- Show "Last synced: 2 hours ago" on banner
- Pull-to-refresh on DiscoveryResultsPage

**Estimated Effort:** 2 hours

---

#### 6. Privacy Controls
- Setting to disable contact discovery entirely
- Option to hide from being discovered by others

**Estimated Effort:** 3-4 hours

---

#### 7. Analytics/Metrics
- Track invitation acceptance rate
- Measure viral coefficient
- Connection conversion rate

**Estimated Effort:** 4-6 hours (requires analytics infrastructure)

---

## Blocked ❌

None currently - all dependencies satisfied.

---

## Notes

### Database Schema (Implemented)

**contactInvites collection:**
```typescript
{
  inviterUserId: string;           // User who sent invite
  invitedAt: Timestamp;           // When invite was sent
  contactIdentifier: string;      // SHA-256 hash of phone/email
  referralCode: string;           // Unique code for attribution
  referralLink: string;           // Full tracking link
  status: 'sent' | 'accepted';    // Invite status
  acceptedByUserId?: string;      // Set when referred user signs up
  acceptedAt?: Timestamp;         // When user signed up via this invite
}
```

**contactSyncs collection:**
```typescript
{
  userId: string;                 // User who synced
  syncedAt: Timestamp;           // When sync occurred
  totalContacts: number;         // Total device contacts
  matchedCount: number;          // How many matched TravalPass users
  invitedCount: number;          // How many invites sent
}
```

**users collection (new fields):**
```typescript
{
  referralCode?: string;         // Code used when signing up
  signupDate?: Timestamp;        // Account creation date
}
```

### Production Status

**mundo1-1 (Production):**
- ✅ Cloud Functions: `matchContactsWithUsers`, `sendContactInvite`
- ✅ Firestore Indexes: Both contactInvites indexes created and enabled
- ✅ Firestore Rules: contactInvites and contactSyncs rules deployed
- ⚠️ Referral tracking: Not implemented yet
- ⚠️ Connect handler: Stub only (shows alert)

**Tested Devices:**
- ✅ Android (1497 contacts) - Batching works correctly
- ✅ iOS Simulator - Invite flow complete
- ✅ Web - Banner displays, shows compatible message

---

## Deployment Checklist for Next Release

Before releasing contact discovery to production users:

1. **Required:**
   - [ ] Implement referral code tracking (or decide to skip for v1)
   - [ ] Decide on Connect handler (implement or remove button)
   - [ ] Test on real iPhone device (not just simulator)
   - [ ] Test with production data (mundo1-1)

2. **Recommended:**
   - [ ] Fix integration tests (or document as known issue)
   - [ ] Add banner auto-refresh on tab focus
   - [ ] Create migration plan for existing users (first-time sync prompt)

3. **Optional:**
   - [ ] Analytics/metrics setup
   - [ ] Privacy controls

---

**Last Updated:** February 11, 2026
**Feature Status:** ✅ Ready for TestFlight with noted limitations


# Firestore Permissions - FINAL IMPLEMENTATION DECISION

## Date
November 10, 2025

## Problem Summary
Firebase REST API authentication works, but Firestore security rules fail with "Missing or insufficient permissions" because:
1. REST API stores ID tokens in AsyncStorage
2. Firestore Web SDK requires auth context from Firebase Auth SDK  
3. **These cannot be connected client-side** (signInWithCustomToken requires server-generated custom tokens, not ID tokens)

## Solution: Use Cloud Functions for Firestore Operations

### Why This is the Only Option
- ✅ REST API auth continues to work (no JSI issues)
- ✅ Cloud Functions run with admin privileges (bypass Firestore security rules)
- ✅ Server-side validation ensures security
- ✅ No React Native compatibility issues

### Architecture
```
Client App (REST API Auth)
    │
    └─► Cloud Function (Admin SDK)
            │
            └─► Firestore (Admin access, no security rules needed)
```

### Implementation Required

#### 1. Create Cloud Function: `getUserProfile`
**File**: `functions/src/getUserProfile.ts`
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const getUserProfile = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();
      
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User profile not found');
    }
    
    return { success: true, profile: userDoc.data() };
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

#### 2. Create Cloud Function: `updateUserProfile`
**File**: `functions/src/updateUserProfile.ts`
```typescript
export const updateUserProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const updates = data.updates;
  
  try {
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update(updates);
      
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

#### 3. Update `UserProfileContext.tsx`
Replace direct Firestore calls with Cloud Function calls:

**Before**:
```typescript
const userDoc = await getDoc(doc(db, 'users', userId));
const data = userDoc.data();
```

**After**:
```typescript
const getUserProfile = httpsCallable(functions, 'getUserProfile');
const result = await getUserProfile({});
const data = result.data.profile;
```

### Files to Modify

1. **`functions/src/index.ts`**
   - Export new Cloud Functions

2. **`src/context/UserProfileContext.tsx`**
   - Replace `getDoc()` with `httpsCallable()`
   - Replace `updateDoc()` with Cloud Function calls

3. **`src/config/firebaseConfig.ts`**
   - Keep Auth SDK initialization for Cloud Function auth context
   - Remove direct Firestore usage from client

### Testing Plan

1. Deploy Cloud Functions to Firebase
2. Test `getUserProfile` function
3. Test `updateUserProfile` function
4. Verify Firestore permissions error is gone
5. Verify REST API auth still works

### Estimated Time
- Cloud Functions creation: 2 hours
- Client code updates: 1 hour
- Testing: 1 hour
- **Total: 4 hours**

### Rollback Plan
If Cloud Functions fail, we must:
1. Switch from REST API to Firebase Auth SDK (`signInWithEmailAndPassword`)
2. Test if Auth SDK works with React 19.1.0 + Expo SDK 54
3. If Auth SDK fails, revert Expo SDK upgrade

## Next Steps
1. ✅ Document this decision
2. Create `getUserProfile` Cloud Function
3. Create `updateUserProfile` Cloud Function  
4. Update `UserProfileContext` to use functions
5. Deploy and test

## References
- Cloud Functions for Auth: https://firebase.google.com/docs/functions/callable
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
- Custom Tokens (NOT applicable): https://firebase.google.com/docs/auth/admin/create-custom-tokens

## Testing Cloud Functions from Terminal (Live Project)

When debugging live cloud functions (for example `mundo1-dev`) it's helpful to exercise rpc endpoints directly from the terminal to confirm behavior.

1. Create a lightweight test runner in the project under `scripts/` (`cloud-function-crud-test.mjs`) to:
  - sign in to Firebase REST Auth and obtain an ID token
  - call `createItinerary`, `searchItineraries`, and `deleteItinerary` via HTTP
  - verify responses and print results

2. Usage (example):
```bash
EMAIL=your-test-email@example.com PASSWORD=YourPassword node scripts/cloud-function-crud-test.mjs
```

3. The script uses these environment variables (defaults are provided where applicable):
  - `EMAIL` (required) — the email address of a test user
  - `PASSWORD` (required) — the user's password
  - `API_KEY` (optional) — Firebase API key (defaults to mundo1-dev value)
  - `FUNCTIONS_PROJECT_ID` (optional) — project id (defaults to mundo1-dev)
  - `FUNCTIONS_REGION` (optional) — region (defaults to us-central1)

4. Why this is useful:
  - Confirms cloud functions are reachable and responding properly
  - Validates the callable function shape (body format) expected by the server
  - Allows quick troubleshooting of auth and Firestore permission issues

5. Notes:
  - The test runner will use the REST `signInWithPassword` endpoint to obtain an `idToken` and include that in the Authorization header (`Bearer {idToken}`) when calling functions.
  - Ensure the test user exists in `mundo1-dev` and has appropriate permissions. If RPCs fail with an authentication or permission error, double-check the ID token / function access and verify using the emulator or the Admin SDK as needed.

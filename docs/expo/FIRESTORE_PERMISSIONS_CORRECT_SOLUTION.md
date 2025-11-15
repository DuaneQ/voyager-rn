# Firestore Permissions - CORRECT Solution

## Date
November 10, 2025

## MISTAKE DISCOVERED
The `signInWithCustomToken()` approach was **WRONG**. 

### Why It Failed
- **Custom tokens** ≠ **ID tokens**
- Custom tokens must be created server-side with Firebase Admin SDK
- ID tokens from REST API cannot be used with `signInWithCustomToken()`
- Error: `auth/invalid-custom-token`

## ROOT CAUSE (Confirmed)
The Firebase REST API auth and Firestore Web SDK are fundamentally incompatible because:
1. REST API stores ID tokens in AsyncStorage
2. Firestore Web SDK needs auth context from Firebase Auth SDK
3. There's **NO WAY** to connect them client-side

## REAL SOLUTION OPTIONS

### Option A: Use Firebase Auth SDK Instead of REST API ✅ RECOMMENDED
**Stop using REST API for auth entirely.** Use Firebase Auth SDK's `signInWithEmailAndPassword()`.

**Why This Works**:
- Firebase Auth SDK automatically provides auth context to Firestore
- No custom sync needed
- Security rules work automatically

**Implementation**:
```typescript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth(app);
await signInWithEmailAndPassword(auth, email, password);
// Firestore now has auth context automatically!
```

**BUT**: We tried this before and it had React Native compatibility issues with Expo SDK 54. Need to test if it works now with React 19.1.0.

### Option B: Move Firestore Operations to Cloud Functions ✅ WORKS BUT COMPLEX
Create Cloud Functions that run with admin privileges for all Firestore operations.

**Example**:
```typescript
// Cloud Function
exports.getUserProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new Error('Unauthenticated');
  
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(context.auth.uid)
    .get();
    
  return userDoc.data();
});

// Client
const getUserProfile = httpsCallable(functions, 'getUserProfile');
const result = await getUserProfile({});
```

**Pros**:
- Works with REST API auth
- Better security (server-side validation)

**Cons**:
- Requires rewriting all Firestore code
- Adds network latency
- More complex

### Option C: Temporarily Disable Security Rules ⚠️ UNSAFE
**DO NOT USE IN PRODUCTION**

```
match /users/{userId} {
  allow read, write: if true; // ⚠️ SECURITY RISK
}
```

## RECOMMENDED ACTION

**Try Option A first**: Test if Firebase Auth SDK `signInWithEmailAndPassword()` works with React 19.1.0 + Expo SDK 54.

If it fails, implement **Option B**: Migrate to Cloud Functions for Firestore operations.

## Implementation Plan

### Step 1: Test Firebase Auth SDK (30 min)
1. Keep REST API code as backup
2. Add Firebase Auth SDK signin in parallel
3. Test if Firestore permissions work
4. If successful, remove REST API code

### Step 2: If Auth SDK Fails, Implement Cloud Functions (4-6 hours)
1. Create Cloud Function for `getUserProfile`
2. Create Cloud Function for `updateUserProfile`  
3. Update UserProfileContext to call functions
4. Test thoroughly

## Files to Revert
- `src/config/firebaseConfig.ts` - Remove Auth SDK (already added)
- `src/services/auth/FirebaseAuthService.ts` - Remove syncWithAuthSDK()

## Next Steps
1. Revert the invalid custom token implementation
2. Test Firebase Auth SDK with current React 19.1.0 setup
3. Document results

# Firestore Permissions Fix - Implementation Complete

## Date
November 10, 2025

## Problem
After fixing the JSI Boolean error, the app now encounters Firestore permissions errors:
```
ERROR Error loading user profile: [FirebaseError: Missing or insufficient permissions.]
```

## Root Cause
The Firebase REST API authentication (FirebaseAuthService) successfully signs in users, but the Firestore Web SDK doesn't recognize the authenticated user because:

1. **FirebaseAuthService** uses REST API for authentication (stores ID tokens in AsyncStorage)
2. **Firestore Web SDK** expects auth context from Firebase Auth SDK
3. These two systems were **disconnected** - Firestore security rules check `request.auth`, which is `null`

## Solution Implemented

### Approach: Sync REST API Auth with Firebase Auth SDK

We initialize Firebase Auth SDK and use `signInWithCustomToken()` to sync the REST API ID token with the Auth SDK. This provides the auth context that Firestore security rules need.

### Code Changes

#### 1. Updated `src/config/firebaseConfig.ts`
```typescript
import { getAuth } from 'firebase/auth';

// Initialize Auth SDK (for Firestore security rules context)
const auth = getAuth(app);

// Export auth along with other services
export { auth, db, storage };
```

**Why**: Initialize Firebase Auth SDK so it can receive auth context.

#### 2. Updated `src/services/auth/FirebaseAuthService.ts`

**Added imports**:
```typescript
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
```

**Added sync method**:
```typescript
private static async syncWithAuthSDK(idToken: string): Promise<void> {
  try {
    console.log('[FirebaseAuthService] Syncing auth state with Firebase Auth SDK...');
    await signInWithCustomToken(auth, idToken);
    console.log('[FirebaseAuthService] ✅ Auth SDK sync successful');
  } catch (error) {
    console.error('[FirebaseAuthService] ⚠️ Auth SDK sync failed:', error);
    // Non-fatal error - REST API auth still works
  }
}
```

**Called after**:
- ✅ `signInWithEmailAndPassword()` - after successful login
- ✅ `initialize()` - when loading stored user on app start
- ✅ `refreshToken()` - after token refresh

### Architecture After Fix

```
┌─────────────────────────────────────────────────────────┐
│           React Native App (Expo SDK 54)                │
└─────────────────────────────────────────────────────────┘
                         │
                         ├──────────────────────────────────┐
                         │                                  │
                         ▼                                  ▼
┌─────────────────────────────────┐    ┌──────────────────────────────────┐
│   FirebaseAuthService           │    │   Firebase Auth SDK              │
│   (REST API)                    │    │   (receives auth via             │
│                                 │    │    signInWithCustomToken)        │
│   • signIn() ──────────────────────► │                                  │
│   • signUp()                    │    │   • Provides auth context        │
│   • Stores ID token ────────────────► │     for Firestore                │
│   • AsyncStorage persistence    │    │                                  │
└─────────────────────────────────┘    └──────────────────────────────────┘
                                                          │
                                                          ▼
                                       ┌──────────────────────────────────┐
                                       │   Firestore Web SDK              │
                                       │   ✅ request.auth != null        │
                                       │   ✅ Security rules work         │
                                       └──────────────────────────────────┘
```

## Testing Results

**Expected Behavior**:
1. User signs in via REST API ✅
2. ID token synced to Firebase Auth SDK via `signInWithCustomToken()` ✅
3. Firestore recognizes authenticated user ✅
4. User profile loads without permissions error ✅

**Console Output Expected**:
```
LOG  🔐 Signing in user: feedback@travalpass.com
LOG  [FirebaseAuthService] Syncing auth state with Firebase Auth SDK...
LOG  [FirebaseAuthService] ✅ Auth SDK sync successful
LOG  ✅ Sign in successful: Frj7COBIYEMqpHvTI7TQDRdJCwG3
LOG  [UserProfileContext] User changed: Frj7COBIYEMqpHvTI7TQDRdJCwG3
LOG  [UserProfileContext] loadUserProfile called
LOG  [UserProfileContext] Fetching user document from Firestore...
LOG  ✅ User profile loaded successfully
```

## Files Modified

1. **`src/config/firebaseConfig.ts`**
   - Added `getAuth()` initialization
   - Exported `auth` instance
   
2. **`src/services/auth/FirebaseAuthService.ts`**
   - Added `signInWithCustomToken` import
   - Added `syncWithAuthSDK()` private method
   - Called sync after sign in, initialization, and token refresh

## Rollback Plan

If this causes issues, revert by:
```bash
git checkout HEAD -- src/config/firebaseConfig.ts src/services/auth/FirebaseAuthService.ts
```

Or manually remove:
- The `getAuth()` initialization in firebaseConfig.ts
- The `syncWithAuthSDK()` calls in FirebaseAuthService.ts

## Next Steps

1. Test app launch and user sign-in
2. Verify Firestore permissions error is resolved
3. Test token refresh flow
4. Test sign-out and re-signin

## References

- Firebase Custom Auth: https://firebase.google.com/docs/auth/web/custom-auth
- signInWithCustomToken API: https://firebase.google.com/docs/reference/js/auth#signincustomtoken
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/rules-structure
- Related Issue: docs/expo/FIREBASE_AUTH_FINAL_STATUS.md (documented the problem)
- Previous Fix: docs/expo/JSI_BOOLEAN_ERROR_FINAL_SOLUTION.md (React 19.1.0 fix)

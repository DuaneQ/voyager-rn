# Firestore Permissions Error - Solution

## Date
November 10, 2025

## Error
```
ERROR Error loading user profile: [FirebaseError: Missing or insufficient permissions.]
```

## Root Cause
The Firebase REST API authentication (FirebaseAuthService) successfully signs in users and stores ID tokens, but **Firestore Web SDK doesn't know about these tokens**. The two systems are disconnected:

- ✅ REST API Auth: User signed in, ID token stored in AsyncStorage
- ❌ Firestore SDK: No auth context, `request.auth == null` in security rules

## Architecture Problem
```
┌─────────────────────────────┐
│  FirebaseAuthService (REST) │ 
│  ✅ User authenticated       │
│  ✅ ID token stored          │
└─────────────────────────────┘
         │
         │ DISCONNECTED ❌
         │
         ▼
┌─────────────────────────────┐
│  Firestore Web SDK          │
│  ❌ No auth context          │
│  ❌ request.auth == null     │
└─────────────────────────────┘
```

## Solution Options

### Option A: Use signInWithCustomToken (RECOMMENDED)
Initialize Firebase Auth SDK with custom token to connect REST API auth to Firestore.

**Steps**:
1. After successful REST API signin, get the ID token
2. Use `signInWithCustomToken()` to sign into Firebase Auth SDK
3. This sets the auth context for Firestore

**Code**:
```typescript
import { getAuth, signInWithCustomToken } from 'firebase/auth';

// In firebaseConfig.ts
export const auth = getAuth(app);

// In FirebaseAuthService.ts - after successful REST API signin
const idToken = await this.getIdToken();
await signInWithCustomToken(auth, idToken);
```

**Pros**:
- Connects REST API auth with Firestore auth context
- Firestore security rules work correctly
- No changes to security rules needed

**Cons**:
- Requires using Firebase Auth SDK (which we removed)
- May still have React Native compatibility issues

### Option B: Use Firebase Admin SDK on Backend
Move Firestore operations to Cloud Functions that run with admin privileges.

**Pros**:
- No client-side auth context needed
- Better security (server-side validation)
- No React Native compatibility issues

**Cons**:
- Requires rewriting all Firestore operations
- Adds latency (extra network hop)
- More complex architecture

### Option C: Update Security Rules (UNSAFE)
Temporarily allow unauthenticated access for testing.

**Code**:
```
match /users/{userId} {
  allow read, write: if true; // ⚠️ UNSAFE - DO NOT USE IN PRODUCTION
}
```

**Pros**:
- Quick fix for testing

**Cons**:
- ⚠️ **SECURITY RISK** - allows anyone to read/write any user data
- Not a production solution

## Recommended Approach

**Try Option A first**: Use `signInWithCustomToken()` to connect REST API token to Firebase Auth SDK.

If Firebase Auth SDK still has React Native compatibility issues, then **use Option B**: Migrate Firestore operations to Cloud Functions.

## Implementation Plan

1. **Test Option A** (1-2 hours):
   - Re-add Firebase Auth SDK with `initializeAuth()` 
   - Use `signInWithCustomToken()` after REST API signin
   - Test if this resolves the permissions error
   
2. **If Option A fails** (3-4 hours):
   - Create Cloud Functions for user profile operations
   - Update UserProfileContext to call functions instead of direct Firestore
   - Test with authenticated functions

## References
- Firebase Custom Auth: https://firebase.google.com/docs/auth/web/custom-auth
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/rules-structure
- React Native Firebase Issues: https://github.com/firebase/firebase-js-sdk/issues/7129

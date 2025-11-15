# Firebase Auth Token Flow - Complete Solution

## Problem Analysis

### Current Broken Flow
1. ✅ User signs in via REST API → Gets ID token
2. ❌ App calls `httpsCallable(functions, 'generateCustomToken')` → **NO AUTH CONTEXT**
3. ❌ Firebase SDK doesn't include Authorization header because Auth SDK has no signed-in user
4. ❌ Cloud Function receives request without `request.auth` → Rejects with "unauthenticated"
5. ❌ All subsequent callable functions fail

### Root Cause

From [Firebase Documentation](https://firebase.google.com/docs/functions/callable):

> **With callables, Firebase Authentication tokens, FCM tokens, and App Check tokens, when available, are automatically included in requests.**

The keyword is "**when available**". The Firebase Auth SDK only includes auth tokens automatically when:
- The Auth SDK has a **currently signed-in user** via `signInWithEmailAndPassword`, `signInWithCustomToken`, etc.

In our case:
- We sign in via **REST API** (not using Auth SDK)
- The Auth SDK doesn't know about the signed-in user
- Therefore, `httpsCallable` has **NO auth token** to include

## Solution Options

### Option 1: Remove generateCustomToken (RECOMMENDED)

**The simplest fix:** We don't actually need `generateCustomToken` at all!

**Why?** 
- We already have a valid ID token from REST API sign-in
- We can use that ID token directly with `signInWithCustomToken`... wait, no we can't
- ID tokens != Custom tokens

Actually, we need to rethink this...

### Option 2: Server-Side Custom Token Generation (CORRECT SOLUTION)

The proper Firebase pattern for bridging REST API auth with SDK auth:

#### Backend Change (voyager-pwa/functions)

Create a new callable function that **doesn't require authentication** (or uses a different auth mechanism):

```typescript
// functions/src/generateCustomTokenForRestAuth.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

/**
 * Generate Custom Token for REST API Authentication
 * 
 * This function verifies an ID token from REST API sign-in
 * and returns a custom token that can be used with signInWithCustomToken
 * 
 * Security: Verifies the ID token is valid before issuing custom token
 */
export const generateCustomTokenForRestAuth = onCall(async (request) => {
  const { idToken } = request.data;
  
  if (!idToken) {
    throw new HttpsError('invalid-argument', 'ID token is required');
  }

  try {
    // Verify the ID token (this doesn't require request.auth)
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Generate custom token for this user
    const customToken = await admin.auth().createCustomToken(decodedToken.uid);
    
    return {
      success: true,
      customToken,
      uid: decodedToken.uid
    };
  } catch (error: any) {
    console.error('[generateCustomTokenForRestAuth] Error:', error);
    throw new HttpsError('internal', 'Failed to generate custom token: ' + error.message);
  }
});
```

#### Frontend Change (voyager-RN/src/services/auth)

```typescript
// FirebaseAuthService.ts
private static async syncWithAuthSDK(idToken: string): Promise<void> {
  try {
    console.log('[FirebaseAuthService] Syncing with Firebase Auth SDK...');
    
    // Call generateCustomTokenForRestAuth - pass idToken in data, not auth header
    const generateCustomTokenFn = httpsCallable<
      { idToken: string }, 
      { customToken: string; uid: string; success: boolean }
    >(
      functions,
      'generateCustomTokenForRestAuth'
    );
    
    // Pass the ID token as data (not in auth header)
    const result = await generateCustomTokenFn({ idToken });
    
    if (!result.data.success || !result.data.customToken) {
      throw new Error('Failed to get custom token');
    }
    
    console.log('[FirebaseAuthService] Custom token received, signing into Auth SDK...');
    
    // Now sign into Auth SDK with custom token
    const userCredential = await signInWithCustomToken(auth, result.data.customToken);
    
    console.log('✅ Auth SDK sync complete, user:', userCredential.user.uid);
  } catch (error: any) {
    console.error('[FirebaseAuthService] Failed to sync with Auth SDK:', error);
    throw error;
  }
}
```

### Option 3: Use HTTP Fetch Instead of httpsCallable (TEMPORARY WORKAROUND)

If we can't modify the backend immediately, we can manually add the Authorization header:

```typescript
private static async syncWithAuthSDK(idToken: string): Promise<void> {
  try {
    console.log('[FirebaseAuthService] Calling generateCustomToken with manual auth...');
    
    const functionUrl = 'https://us-central1-mundo1-dev.cloudfunctions.net/generateCustomToken';
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}` // Manually add auth token
      },
      body: JSON.stringify({ data: {} })
    });
    
    const result = await response.json();
    
    if (!result.result || !result.result.customToken) {
      throw new Error('Failed to get custom token');
    }
    
    // Sign into Auth SDK
    await signInWithCustomToken(auth, result.result.customToken);
    
    console.log('✅ Auth SDK sync complete');
  } catch (error) {
    console.error('[FirebaseAuthService] Sync failed:', error);
    throw error;
  }
}
```

## Recommended Implementation

**Use Option 2** (Server-Side Custom Token with ID Token Verification)

### Why?
1. ✅ **Secure**: Server verifies the ID token before issuing custom token
2. ✅ **Standard**: Follows Firebase's recommended custom auth pattern
3. ✅ **Clean**: No manual Authorization headers needed
4. ✅ **Scalable**: Works for all future callable functions

### Steps to Implement

1. **Deploy new backend function:**
   ```bash
   cd voyager-pwa/functions
   # Add generateCustomTokenForRestAuth.ts
   npm run build
   firebase deploy --only functions:generateCustomTokenForRestAuth --project mundo1-dev
   ```

2. **Update frontend code:**
   ```bash
   cd voyager-RN
   # Update FirebaseAuthService.ts syncWithAuthSDK method
   ```

3. **Test the flow:**
   ```bash
   # Sign in on iOS simulator
   # Check logs for "✅ Auth SDK sync complete"
   # Verify getUserProfile works without "unauthenticated" error
   ```

## Testing the Fix

### Before Fix
```
LOG  🔐 Signing in user: feedback@travalpass.com
ERROR [FirebaseAuthService] Failed to sync with Auth SDK: [FirebaseError: User must be authenticated to generate custom token]
ERROR Error getting user profile: [FirebaseError: User must be authenticated]
```

### After Fix
```
LOG  🔐 Signing in user: feedback@travalpass.com
LOG  [FirebaseAuthService] Syncing with Firebase Auth SDK...
LOG  [FirebaseAuthService] Custom token received, signing into Auth SDK...
LOG  ✅ Auth SDK sync complete, user: Frj7COBIYEMqpHvTI7TQDRdJCwG3
LOG  [UserProfileContext] Fetching user profile via Cloud Function...
LOG  ✅ Profile loaded successfully
```

## Alternative: Eliminate REST API (Future Consideration)

If the Auth SDK works in React Native now (with latest Expo SDK 54), we could:
1. Remove REST API auth entirely
2. Use Auth SDK's `signInWithEmailAndPassword` directly
3. All callable functions work automatically

**But this requires testing** to ensure Auth SDK is fully compatible with React Native.

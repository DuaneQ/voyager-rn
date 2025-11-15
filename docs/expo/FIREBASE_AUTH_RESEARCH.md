# Firebase Authentication with React Native - Research & Implementation

**Date**: November 9, 2025  
**Priority**: CRITICAL - Data access blocked  
**Issue**: Firestore permission denied, Cloud Functions auth failed

## Problem Statement

After implementing Firebase REST API for authentication (to work around "Component auth has not been registered yet" error), users can sign in successfully but CANNOT access Firestore or Cloud Functions:

```
ERROR  ❌ Sign in error: [FirebaseError: Missing or insufficient permissions.]
ERROR  Error loading user profile: [FirebaseError: Missing or insufficient permissions.]
ERROR  Error fetching all itineraries: [FirebaseError: User must be authenticated]
```

**Root Cause**: 
- AuthContext uses Firebase REST API (`FirebaseAuthService`) 
- Firestore/Functions use Firebase Web SDK which checks `auth.currentUser`
- REST API doesn't update Web SDK auth state → `auth.currentUser` is null
- Firestore sees `request.auth.uid = null`, Functions see `context.auth.uid = null`

---

## Research Findings

### Official React Native Firebase Documentation

**Source**: https://rnfirebase.io/

**Key Finding**: 
> "React Native Firebase is the **officially recommended** collection of packages that brings React Native support for all Firebase services on both Android and iOS apps."

**CRITICAL**: The Firebase **Web SDK** is NOT designed for React Native. The correct approach is to use `@react-native-firebase/*` packages.

### Why We're Having Issues

1. **Firebase Web SDK** (`firebase/auth`, `firebase/firestore`) is designed for **web browsers**
2. **React Native** doesn't have browser APIs (no `window`, `document`, `localStorage`)
3. Firebase Web SDK Auth module has **native module registration issues** in React Native
4. Our workaround (REST API) works for auth but **doesn't integrate with other Firebase services**

### The Correct Solution: React Native Firebase

**Package**: `@react-native-firebase/app` + `@react-native-firebase/auth`

**How it works**:
- Uses **native iOS/Android Firebase SDKs** (not web SDK)
- Fully integrated - Auth state automatically available to Firestore/Functions
- Requires native build (works with Expo via development builds)
- Cannot use Expo Go (requires custom native code)

---

## Implementation Approaches

### ✅ APPROACH 1: Switch to @react-native-firebase (RECOMMENDED)

**Pros**:
- Official solution for React Native
- Full Firebase integration (Auth + Firestore + Functions + Storage)
- Auth state automatically syncs across all Firebase services
- Production-ready and well-maintained

**Cons**:
- Requires native build (we already do this)
- Need to remove Firebase Web SDK dependencies
- Config plugin setup required

**Steps**:
1. Install packages:
   ```bash
   npx expo install @react-native-firebase/app @react-native-firebase/auth
   ```

2. Configure `app.json`:
   ```json
   {
     "expo": {
       "android": {
         "googleServicesFile": "./google-services.json"
       },
       "ios": {
         "googleServicesFile": "./GoogleService-Info.plist"
       },
       "plugins": [
         "@react-native-firebase/app",
         "@react-native-firebase/auth",
         [
           "expo-build-properties",
           {
             "ios": {
               "useFrameworks": "static"
             }
           }
         ]
       ]
     }
   }
   ```

3. Rebuild native code:
   ```bash
   npx expo prebuild --clean
   cd ios && pod install && cd ..
   npx expo run:ios
   ```

4. Update code to use React Native Firebase:
   ```typescript
   import auth from '@react-native-firebase/auth';
   import firestore from '@react-native-firebase/firestore';
   
   // Sign in
   await auth().signInWithEmailAndPassword(email, password);
   
   // Firestore automatically has auth context
   const userDoc = await firestore().collection('users').doc(userId).get();
   ```

**Estimated Effort**: 4-6 hours (package install + code migration + testing)

---

### ❌ APPROACH 2: Hybrid Web SDK + Custom Token Bridge (NOT RECOMMENDED)

**Why this doesn't work**:
- Firebase Web SDK `signInWithCustomToken()` requires **custom tokens from Admin SDK**
- We can't generate custom tokens client-side (security risk)
- Would need a Cloud Function to exchange REST API tokens for custom tokens
- Overly complex, fragile, and not officially supported

**Conclusion**: Don't pursue this approach.

---

### ❌ APPROACH 3: Continue with REST API + Manual Auth Context (HACKY)

**Attempted Solution**: Manually set `auth._currentUser` after REST API sign-in

**Why this doesn't work**:
- Uses private/internal Firebase APIs (not stable)
- Firestore/Functions check internal auth state, not just `_currentUser`
- Auth tokens may not be properly formatted for Firestore security rules
- Breaks on Firebase SDK updates

**Conclusion**: Not production-ready, abandon this approach.

---

## Decision: Switch to @react-native-firebase

**Rationale**:
1. **Official solution** - React Native Firebase is the recommended approach
2. **Already have native builds** - We're using `npx expo run:ios`, not Expo Go
3. **Full integration** - Auth state automatically available to all Firebase services
4. **Production-ready** - Thousands of apps use this successfully
5. **Simpler architecture** - No need for REST API workaround

**What about "Component auth has not been registered yet" error?**
- That error was likely caused by using Firebase **Web SDK** in React Native
- React Native Firebase uses **native SDKs**, so that error won't occur
- If we had started with React Native Firebase, we wouldn't have had auth issues

---

## Migration Plan

### Phase 1: Install and Configure (30 mins)

1. **Install React Native Firebase packages**:
   ```bash
   npx expo install @react-native-firebase/app @react-native-firebase/auth
   ```

2. **Update app.json** with config plugins:
   - Add `@react-native-firebase/app` plugin
   - Add `@react-native-firebase/auth` plugin
   - Add `expo-build-properties` with `useFrameworks: "static"`
   - Ensure `googleServicesFile` paths are correct

3. **Verify Firebase config files**:
   - ✅ `google-services.json` exists in root
   - ✅ `GoogleService-Info.plist` exists in root

### Phase 2: Update firebaseConfig.ts (20 mins)

**Before** (Web SDK):
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

**After** (React Native Firebase):
```typescript
import { firebase } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import functions from '@react-native-firebase/functions';

// Firebase app auto-initialized from google-services.json / GoogleService-Info.plist
// No need to call initializeApp()

export { auth, firestore, storage, functions };
export const db = firestore(); // For compatibility
```

### Phase 3: Update AuthContext.tsx (1 hour)

**Replace**:
```typescript
import { FirebaseAuthService } from '../services/auth/FirebaseAuthService';
```

**With**:
```typescript
import auth from '@react-native-firebase/auth';

const signIn = async (email: string, password: string) => {
  const userCredential = await auth().signInWithEmailAndPassword(email, password);
  // No need to manually set user - onAuthStateChanged will trigger
};

const signUp = async (email: string, password: string, displayName: string) => {
  const userCredential = await auth().createUserWithEmailAndPassword(email, password);
  await userCredential.user.updateProfile({ displayName });
};

const signOut = async () => {
  await auth().signOut();
};

// Auth state listener
useEffect(() => {
  const subscriber = auth().onAuthStateChanged((firebaseUser) => {
    if (firebaseUser) {
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || '',
        emailVerified: firebaseUser.emailVerified,
      });
    } else {
      setUser(null);
    }
    setIsLoading(false);
  });

  return subscriber; // Unsubscribe on cleanup
}, []);
```

### Phase 4: Update UserProfileContext.tsx (30 mins)

**Replace**:
```typescript
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
```

**With**:
```typescript
import firestore from '@react-native-firebase/firestore';

const loadUserProfile = async () => {
  const userDoc = await firestore()
    .collection('users')
    .doc(user.uid)
    .get();
    
  if (userDoc.exists) {
    setUserProfile(userDoc.data() as UserProfile);
  }
};

const updateUserProfile = async (updates: Partial<UserProfile>) => {
  await firestore()
    .collection('users')
    .doc(user.uid)
    .set(updates, { merge: true });
};
```

### Phase 5: Update Other Firebase Usages (2 hours)

**Files to update**:
- All repositories (`src/repositories/*.ts`)
- All hooks using Firestore (`src/hooks/**/*.ts`)
- Cloud Functions calls
- Storage uploads

**Pattern**:
```typescript
// Before (Web SDK)
import { collection, query, where, getDocs } from 'firebase/firestore';
const q = query(collection(db, 'itineraries'), where('userId', '==', userId));
const snapshot = await getDocs(q);

// After (React Native Firebase)
import firestore from '@react-native-firebase/firestore';
const snapshot = await firestore()
  .collection('itineraries')
  .where('userId', '==', userId)
  .get();
```

### Phase 6: Rebuild and Test (1 hour)

1. Clean rebuild:
   ```bash
   npx expo prebuild --clean
   cd ios && rm -rf Pods Podfile.lock build && pod install && cd ..
   npx expo run:ios
   ```

2. Test checklist:
   - [ ] Sign in with email/password
   - [ ] User profile loads from Firestore
   - [ ] Firestore queries work (no permission errors)
   - [ ] Cloud Functions calls work
   - [ ] Sign out
   - [ ] Auth persistence (reload app, user stays signed in)

### Phase 7: Cleanup (30 mins)

1. Remove deprecated code:
   - Delete `src/services/auth/FirebaseAuthService.ts`
   - Remove Firebase Web SDK packages (optional - may still need for web platform)

2. Update documentation:
   - Document React Native Firebase usage
   - Add Issue 7 to `EXPO_SDK_54_UPGRADE_RUNTIME_FIXES.md`

---

## Known Challenges

### Challenge 1: Expo Build Properties

**Issue**: React Native Firebase requires `use_frameworks! :linkage => :static` in Podfile

**Solution**: Use `expo-build-properties` plugin in `app.json`:
```json
{
  "plugins": [
    [
      "expo-build-properties",
      {
        "ios": {
          "useFrameworks": "static"
        }
      }
    ]
  ]
}
```

### Challenge 2: Development Build Required

**Issue**: Cannot use Expo Go (requires custom native modules)

**Solution**: We're already using `npx expo run:ios`, so this is not a blocker.

### Challenge 3: Web Platform Support

**Issue**: React Native Firebase doesn't work on web

**Solution**: 
- Keep Firebase Web SDK for web platform
- Use platform-specific imports:
  ```typescript
  import { Platform } from 'react-native';
  
  let auth, firestore;
  if (Platform.OS === 'web') {
    auth = require('firebase/auth').getAuth();
    firestore = require('firebase/firestore').getFirestore();
  } else {
    auth = require('@react-native-firebase/auth').default();
    firestore = require('@react-native-firebase/firestore').default();
  }
  ```

---

## Expected Outcomes

After migration:
- ✅ Sign in works (same as current)
- ✅ Firestore queries work (FIXED - no more permission errors)
- ✅ Cloud Functions work (FIXED - auth context available)
- ✅ Auth state persists across app reloads
- ✅ No "Component auth has not been registered yet" errors
- ✅ Production-ready authentication

---

## Next Steps

1. **[IMMEDIATE]** Get approval to proceed with React Native Firebase migration
2. **[NEXT]** Install packages and update app.json
3. **[THEN]** Migrate AuthContext and test sign-in
4. **[THEN]** Migrate Firestore usage and test data access
5. **[FINALLY]** Full end-to-end testing

---

## References

- React Native Firebase Docs: https://rnfirebase.io/
- Expo + React Native Firebase: https://rnfirebase.io/#installation-for-expo-projects
- Firebase Auth Module: https://rnfirebase.io/auth/usage
- Firestore Module: https://rnfirebase.io/firestore/usage

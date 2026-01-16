# Simple Authentication Flow - PWA vs RN

## PWA Flow (Current - Simple & Working)

### Sign Up
1. User fills form → `createUserWithEmailAndPassword(auth, email, password)`
2. Create profile → `setDoc(doc(db, "users", uid), profileData)`
3. Send verification → `sendEmailVerification(user)`
4. User sees success message

### Sign In
1. User fills form → `signInWithEmailAndPassword(auth, email, password)`
2. Check email verified → `user.emailVerified`
3. Store credentials → `localStorage.setItem('USER_CREDENTIALS', ...)`
4. Redirect to home

### Profile Load (After Sign In)
1. `UserProfileContext` listens to `auth.onAuthStateChanged`
2. When user signs in → `getDoc(doc(db, "users", userId))`
3. Profile loaded → app shows home screen

### Terms Check
1. After profile loads → check `userProfile.hasAcceptedTerms`
2. If false → show terms modal
3. User accepts → `updateDoc(doc(db, "users", uid), { hasAcceptedTerms: true })`

**Total Complexity: SIMPLE - Uses Web SDK for everything**

---

## RN Flow (Current - OVERCOMPLICATED)

### Sign Up
1. User fills form → `FirebaseAuthService.createUserWithEmailAndPassword()` (REST API)
2. Custom token generation → Cloud Function call
3. SDK sync → `signInWithCustomToken()`
4. Profile creation → `UserProfileService.createUserProfile()` (Cloud Function)
5. Verification email → REST API call

### Sign In
1. User fills form → `FirebaseAuthService.signInWithEmailAndPassword()` (REST API)
2. Custom token generation → Cloud Function call with headers
3. SDK sync → `signInWithCustomToken()`
4. Profile check → `UserProfileService.getUserProfile()` (Web SDK)
5. Auth state update → Multiple listeners

**Total Complexity: INSANE - Mixing REST API + Web SDK + Cloud Functions**

---

## The Fix: Use Web SDK Everywhere (RN Compatible!)

Firebase Web SDK v12.5.0 **WORKS PERFECTLY** in React Native 0.81.5!

### New RN Flow (Match PWA Exactly)

```typescript
// Sign Up
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

const userCredential = await createUserWithEmailAndPassword(auth, email, password);
await setDoc(doc(db, 'users', userCredential.user.uid), profileData);
await sendEmailVerification(userCredential.user);

// Sign In
import { signInWithEmailAndPassword } from 'firebase/auth';

const userCredential = await signInWithEmailAndPassword(auth, email, password);
if (!userCredential.user.emailVerified) {
  throw new Error('Email not verified');
}
// Done! Auth SDK handles everything

// Profile Load (UserProfileContext)
import { getDoc, doc } from 'firebase/firestore';

auth.onAuthStateChanged(async (user) => {
  if (user) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    setUserProfile(userDoc.data());
  }
});
```

**Total Complexity: SIMPLE - Exactly like PWA**

---

## Why This Was Broken

1. **FirebaseAuthService REST API** - Unnecessary! Web SDK works fine
2. **Custom Token Generation** - Unnecessary! Web SDK handles auth automatically
3. **Cloud Functions for Profile** - Unnecessary! Firestore Web SDK works directly
4. **Complex Sync Logic** - Unnecessary! No sync needed when using Web SDK

## The Solution

**DELETE** all the complex stuff and use Firebase Web SDK directly everywhere.

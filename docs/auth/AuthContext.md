# AuthContext (Firebase-backed) — Flow and Notes

This document describes how `AuthContext` in `src/context/AuthContext.tsx` manages authentication state, where data is persisted, and how Google sign-in flows are handled.

Summary (contract)
- Inputs: calls to methods exposed by the context (signIn, signUp, signOut, sendPasswordReset, resendVerification, signInWithGoogle, signUpWithGoogle).
- Outputs: `user` (Firebase User | null), `status` ('idle'|'loading'|'authenticated'|'error'), and thrown errors for failure cases.
- Side effects: writes `USER_CREDENTIALS` and `PROFILE_INFO` to cross-platform storage, creates Firestore `users/{uid}` document on sign-up.

High-level flow
1. Initialization
   - `AuthProvider` registers a Firebase `onAuthStateChanged(auth, callback)` listener on mount.
   - When the listener fires with a `firebaseUser`:
     - If present: it persists a minimal `USER_CREDENTIALS` object to storage and sets `user` + `status = 'authenticated'`.
     - If null: it clears `USER_CREDENTIALS` and `PROFILE_INFO` from storage and sets `user = null` and `status = 'idle'`.

2. Email + password sign-in (`signIn(email, password)`)
   - Calls `signInWithEmailAndPassword(auth, email, password)`.
   - Optionally calls `user.reload()` if available to refresh `emailVerified`.
   - If `emailVerified` is false the function throws an error (the hook does not set authenticated state until verification).
   - On success, minimal `USER_CREDENTIALS` are stored and `user` + `status` are updated.

3. Email + password sign-up (`signUp(username, email, password)`)
   - Calls `createUserWithEmailAndPassword(auth, email, password)`.
   - Immediately calls `sendEmailVerification(user)` to prompt verification (matches PWA behavior).
   - Creates/merges a Firestore `users/{uid}` document with initial profile fields.
   - Persists `PROFILE_INFO` and `USER_CREDENTIALS` to local storage.
   - Sets `status = 'idle'` (user must verify email before authenticated state).

4. Password reset (`sendPasswordReset(email)`)
   - Calls `sendPasswordResetEmail(auth, email)`.

5. Resend verification (`resendVerification()`)
   - If `auth.currentUser` exists, calls `sendEmailVerification(auth.currentUser)`.
   - Otherwise throws an error explaining no logged-in user.

6. Sign out (`signOut()`)
   - Calls `signOut(auth)`.
   - Clears `USER_CREDENTIALS` and `PROFILE_INFO` from storage and resets local state.

7. Google sign-in / sign-up (`signInWithGoogle`, `signUpWithGoogle`)
   - Two paths: web vs mobile.
   - Web path (Platform.OS === 'web'):
     - Uses `new GoogleAuthProvider()` + `signInWithPopup(auth, provider)`.
     - Firebase handles account creation/sign-in and triggers `onAuthStateChanged`.
   - Mobile path (iOS/Android):
     - Uses `@react-native-google-signin/google-signin` to obtain an `idToken`.
     - Builds a `GoogleAuthProvider.credential(idToken)` and calls `signInWithCredential(auth, credential)`.
     - Firebase updates auth state and `onAuthStateChanged` fires.

Note: the AuthContext deliberately relies on Firebase's auth state (onAuthStateChanged) to set `user` in most flows — this ensures behavior and session state match PWA behavior and server-side expectations.

Storage and persistence
- `USER_CREDENTIALS` — minimal trusted snapshot of the Firebase user written after successful sign-in/signup.
- `PROFILE_INFO` — user profile cache created on sign-up (stored to reduce reads and mirror PWA behavior).
- Storage implementation is cross-platform in `src/utils/storage.ts` (localStorage on web, AsyncStorage on native). Token storage uses `expo-secure-store` where available.

Testing notes and mocks
- Unit tests should mock `firebase/auth` functions used by the specific test (e.g., `signInWithPopup`, `signInWithCredential`, `signInWithEmailAndPassword`, `onAuthStateChanged`).
- For mobile Google tests, mock `@react-native-google-signin/google-signin` to return an object with `hasPlayServices()` and `signIn()` returning an `idToken`.
- Tests should not rely on live Firebase; prefer jest mocks and the repository's shared `jest.setup.js` harness.

Security and UX considerations
- We intentionally require email verification before authenticating users created via email/password.
- Password visibility toggles are implemented in the UI (Login/Register forms) to improve usability.

If you need a sequence diagram or a short code snippet showing how `onAuthStateChanged` wiring triggers the local state update, I can add it here.

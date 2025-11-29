# Sign-Up Flow Documentation

## Overview
The app supports two sign-up methods with different flows based on email verification status:

1. **Google Sign-Up**: Email pre-verified → create profile immediately → sign in
2. **Manual Sign-Up**: Email unverified → send verification → redirect to sign-in → verify → sign in → create profile

---

## Google Sign-Up Flow

### Process
1. User clicks "Sign up with Google" on `RegisterForm`
2. `AuthPage.handleGoogleSignUp()` → `AuthContext.signUpWithGoogle()`
3. Get Google ID token via `SafeGoogleSignin`
4. Call `FirebaseAuthService.signInWithGoogleIdToken(idToken)`
   - Authenticates with Firebase REST API
   - **Calls `syncWithAuthSDK()` to sign in Firebase Auth SDK** ✅
5. Check if profile exists via `UserProfileService.getUserProfile()`
6. If profile exists → user already registered → sign them in
7. If no profile → **create profile immediately** via `UserProfileService.createUserProfile()`
   - ✅ **Safe because Auth SDK is signed in** (from step 4)
   - Cloud Functions have auth context
8. Set user state → authenticated
9. Navigate to main app

### Why It Works
- Google accounts are pre-verified
- `syncWithAuthSDK()` completes **before** profile creation
- Cloud Functions receive authenticated requests

---

## Manual Sign-Up Flow (Email/Password)

### Process

#### Step 1: Registration (Mobile)
1. User fills out `RegisterForm` with username, email, password
2. `AuthPage.handleRegister()` → `AuthContext.signUp()`
3. Call `FirebaseAuthService.createUserWithEmailAndPassword()`
   - Creates Firebase Auth user via REST API
   - Returns user with `idToken` but **emailVerified: false**
4. **Skip profile creation** (Auth SDK not signed in yet)
5. Send verification email via `FirebaseAuthService.sendEmailVerification()`
6. **Keep user session** (unverified) so "Resend Verification" works
7. Show success message: "A verification link has been sent to your email"
8. `AuthPage` switches to login screen (`setMode('login')`)
9. User stays on auth screen (navigation checks `emailVerified`)

#### Step 2: Email Verification
1. User checks email inbox/spam folder
2. Clicks verification link
3. Firebase marks email as verified
4. User can now click "Resend Verification" if needed (session still active)

#### Step 3: First Sign-In (Mobile)
1. User enters email/password on `LoginForm`
2. `AuthPage.handleLogin()` → `AuthContext.signIn()`
3. Call `FirebaseAuthService.signInWithEmailAndPassword()`
   - Checks email verification status ✅
   - If not verified → throws error
   - If verified → continues
   - **Calls `syncWithAuthSDK()` to sign in Firebase Auth SDK** ✅
4. Check if profile exists via `UserProfileService.getUserProfile()`
5. If no profile → **create profile now** via `UserProfileService.createUserProfile()`
   - ✅ **Safe because Auth SDK is signed in** (from step 3)
   - Uses default values (username from email, free subscription, etc.)
6. Set user state → authenticated
7. Navigate to main app

### Why This Approach

#### Problem (Before Fix)
- Manual sign-up tried to create profile immediately after REST sign-up
- Auth SDK not signed in yet → Cloud Functions had no auth context
- Result: **"User must be authenticated" error** ❌
- Additionally: Signing out after sign-up broke "Resend Verification" ❌
- **New issue**: UserProfileContext tried to load profile for unverified users ❌

#### Solution (After Fix)
- Defer profile creation until **first sign-in after email verification**
- Keep user session active (but unverified) so resend works
- **UserProfileContext only loads profile if `emailVerified === true`** ✅
- Navigation checks `user.emailVerified` to prevent app access
- At sign-in:
  - Email is verified ✅
  - `syncWithAuthSDK()` completed ✅
  - Auth SDK has signed-in user ✅
  - Cloud Functions have auth context ✅
- Profile creation succeeds ✅
- Resend verification works (user session persists) ✅
- No profile loading errors for unverified users ✅

---

## Web Platform Differences

### Manual Sign-Up (Web)
1. Uses Firebase Web SDK directly (`createUserWithEmailAndPassword`)
2. SDK is active immediately (no REST/SDK sync needed)
3. **Creates profile immediately** after sign-up
4. Sends verification email
5. User can use app but some features may be restricted until verified

### Why It's Different
- Web uses native Firebase SDK (not REST API)
- No SDK sync step needed
- Firestore security rules can check `request.auth.uid` directly

---

## Error Handling

### Google Sign-Up Errors
- **"Google Sign-In is not configured"**: Native module not installed → rebuild app
- **Profile creation fails**: Signs user out, shows error, stays on register screen

### Manual Sign-Up Errors
- **Email already in use**: Shows error, stays on register screen
- **Weak password**: Shows error, stays on register screen
- **Email verification send fails**: User created but no verification email → use "Resend Verification"

### Sign-In Errors (After Manual Sign-Up)
- **Email not verified**: Shows error → user must verify email first
- **Profile creation fails on first sign-in**: User signs in anyway (profile creation is non-blocking)
  - App should handle missing profiles gracefully
  - User can complete profile later

---

## Testing Checklist

### Google Sign-Up
- [ ] New user signs up with Google → profile created → signed in
- [ ] Existing user tries to sign up with Google → signed in (not duplicated)
- [ ] Google sign-in fails gracefully on web (not implemented)

### Manual Sign-Up (Mobile)
- [ ] User signs up → verification email sent
- [ ] User stays on login screen (not authenticated)
- [ ] User tries to sign in without verification → error
- [ ] User verifies email → signs in → profile created automatically
- [ ] User signs in again → profile not duplicated

### Manual Sign-Up (Web)
- [ ] User signs up → profile created immediately
- [ ] Verification email sent
- [ ] User can access app (some features restricted until verified)

---

## Implementation Files

- **AuthContext**: `/src/context/AuthContext.tsx`
  - `signUp()`: Manual registration flow
  - `signIn()`: Login with profile creation check
  - `signUpWithGoogle()`: Google registration flow
  - `signInWithGoogle()`: Google login flow

- **FirebaseAuthService**: `/src/services/auth/FirebaseAuthService.ts`
  - `createUserWithEmailAndPassword()`: REST API sign-up
  - `signInWithEmailAndPassword()`: REST API sign-in with SDK sync
  - `signInWithGoogleIdToken()`: Google IDP authentication with SDK sync
  - `syncWithAuthSDK()`: Custom token exchange for Auth SDK sign-in

- **UserProfileService**: `/src/services/userProfile/UserProfileService.ts`
  - `createUserProfile()`: Cloud Function to create Firestore profile
  - `getUserProfile()`: Cloud Function to fetch Firestore profile

- **AuthPage**: `/src/pages/AuthPage.tsx`
  - `handleRegister()`: Calls `signUp()`, switches to login on success
  - `handleLogin()`: Calls `signIn()`
  - `handleGoogleSignUp()`: Calls `signUpWithGoogle()`
  - `handleGoogleSignIn()`: Calls `signInWithGoogle()`

---

## Security Notes

1. **Profile creation requires authenticated Cloud Function calls**
   - Cloud Functions check `context.auth.uid`
   - REST API alone doesn't provide this context
   - `syncWithAuthSDK()` bridges the gap

2. **Email verification enforced**
   - Manual sign-up users cannot sign in until verified
   - Google users are pre-verified by Google

3. **Token storage**
   - Mobile: `expo-secure-store` for tokens (encrypted)
   - Web: `AsyncStorage` (localStorage)
   - Never store passwords

4. **Firestore security rules**
   - Users can only read/write their own profile
   - Cloud Functions run with admin privileges but validate `context.auth.uid`

---

## Future Improvements

1. **Auto-create profiles via Cloud Function trigger**
   - Listen to `onCreate` trigger for new Firebase Auth users
   - Create profile automatically (eliminates need for check in sign-in flow)
   - Requires updating Cloud Functions deployment

2. **Better error messages**
   - Specific guidance for each error type
   - Deep links to verification/password reset flows

3. **Profile completion flow**
   - After first sign-in, guide user through profile setup
   - Upload photo, set preferences, etc.

4. **Social sign-in expansion**
   - Apple Sign-In (required for iOS App Store)
   - Facebook, Twitter, etc.

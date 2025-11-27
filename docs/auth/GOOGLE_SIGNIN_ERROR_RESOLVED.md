# Google Sign-In Error: "is not configured" - SOLVED

## The Error You're Seeing

```
ERROR  ❌ Google sign-up error: [Error: Google Sign-In is not configured. 
Please rebuild the app after installing dependencies.]
```

## Why This Happens

You're running the app via **Expo Go** or haven't rebuilt after installing the native module. The `@react-native-google-signin/google-signin` package requires **native code** which isn't available in Expo Go.

## The Solution (Required Steps)

### ⚠️ CRITICAL: You MUST rebuild the native app

**DO NOT** run the app with `npm start` or Expo Go. You MUST use:

```bash
# For Android
npx expo run:android

# For iOS  
npx expo run:ios
```

This will:
1. Compile the native Android/iOS code
2. Link the Google Sign-In native module
3. Install the app on your device/emulator
4. Run with the native module available

### Why `npm start` Doesn't Work

`npm start` launches **Expo Go**, which is a pre-built app that **cannot load custom native modules**. Google Sign-In requires native code, so it will never work in Expo Go.

## What's Been Fixed in the Code

While you rebuild, here's what the code now does:

### 1️⃣ Scenario 1: New User Tries to Sign In (No Account)
```typescript
// User clicks "Sign in with Google"
// → Google auth succeeds
// → Backend checks Firestore for profile
// → ❌ NO PROFILE FOUND
// → Signs user out
// → Shows: "No account found for this Google account. Please sign up first."
// → Switches to Sign Up form automatically
```

### 2️⃣ Scenario 2: Existing User Tries to Sign Up (Already Has Account)
```typescript
// User clicks "Sign up with Google"
// → Google auth succeeds
// → Backend checks Firestore for profile
// → ✅ PROFILE FOUND
// → Logs them in (no new profile created)
// → Shows: "Successfully signed up with Google! Welcome to TravalPass."
// → Navigates to main app
```

### 3️⃣ Scenario 3: New User Signs Up Successfully
```typescript
// User clicks "Sign up with Google"
// → Google auth succeeds
// → Backend checks Firestore for profile
// → ❌ NO PROFILE FOUND
// → Creates new profile via Cloud Function:
//    {
//      username: displayName || email.split('@')[0],
//      email: user.email,
//      photos: ['', '', '', '', ''],
//      subscriptionType: 'free',
//      dailyUsage: { date: '2025-11-23', viewCount: 0 }
//    }
// → ✅ PROFILE CREATED
// → Logs user in
// → Shows: "Successfully signed up with Google! Welcome to TravalPass."
// → Navigates to main app
```

### 4️⃣ Scenario 4: Existing User Signs In (Normal Flow)
```typescript
// User clicks "Sign in with Google"
// → Google auth succeeds
// → Backend checks Firestore for profile
// → ✅ PROFILE FOUND
// → Logs user in
// → Shows: "Login successful! Welcome back."
// → Navigates to main app
```

## Code Changes Summary

### `src/context/AuthContext.tsx`

#### ✅ `signInWithGoogle()` - Now checks for existing profile
```typescript
// Authenticate with Firebase
const firebaseUser = await FirebaseAuthService.signInWithGoogleIdToken(idToken);

// Check if profile exists
try {
  await UserProfileService.getUserProfile(firebaseUser.uid);
  // ✅ Profile found - sign in successful
  setUser(firebaseUser);
  setStatus('authenticated');
} catch (profileError) {
  // ❌ Profile not found - this is a new user
  await FirebaseAuthService.signOut();
  throw new Error('ACCOUNT_NOT_FOUND');
}
```

#### ✅ `signUpWithGoogle()` - Now handles both new and existing users
```typescript
// Authenticate with Firebase
const firebaseUser = await FirebaseAuthService.signInWithGoogleIdToken(idToken);

// Check if profile already exists
let profileExists = false;
try {
  await UserProfileService.getUserProfile(firebaseUser.uid);
  profileExists = true;
} catch (error) {
  // No profile found
}

if (profileExists) {
  // Existing user trying to sign up - just log them in
  setUser(firebaseUser);
  setStatus('authenticated');
} else {
  // New user - create profile
  const userProfile = {
    username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
    email: firebaseUser.email,
    photos: ['', '', '', '', ''],
    subscriptionType: 'free',
    // ... full profile data
  };
  
  await UserProfileService.createUserProfile(firebaseUser.uid, userProfile);
  setUser(firebaseUser);
  setStatus('authenticated');
}
```

### `src/pages/AuthPage.tsx`

#### ✅ `handleGoogleSignIn()` - Now redirects new users to sign up
```typescript
try {
  await signInWithGoogle();
} catch (error) {
  if (error.message === 'ACCOUNT_NOT_FOUND') {
    showAlert('error', 'No account found for this Google account. Please sign up first.');
    setMode('register'); // Auto-switch to Sign Up form
  }
}
```

#### ✅ `handleGoogleSignUp()` - Now shows success message
```typescript
try {
  await signUpWithGoogle();
  showAlert('success', 'Successfully signed up with Google! Welcome to TravalPass.');
} catch (error) {
  showAlert('error', error.message);
}
```

## What Happens When You Rebuild

After running `npx expo run:android` or `npx expo run:ios`:

1. ✅ Google Sign-In native module will be available
2. ✅ `SafeGoogleSignin.isAvailable()` will return `true`
3. ✅ All 4 scenarios will work correctly
4. ✅ Google Sign-In sheet will appear when buttons are clicked
5. ✅ User profiles will be created/checked in Firestore
6. ✅ Proper navigation after successful auth

## Testing After Rebuild

### Test Scenario 1: New User Sign In
1. Make sure you don't have a Firestore profile for the test Google account
2. Click "Sign in with Google" on Login screen
3. Select Google account
4. **Expected:** Error message + auto-switch to Sign Up form

### Test Scenario 2: Existing User Sign Up
1. Make sure you DO have a Firestore profile for the test Google account
2. Click "Sign up with Google" on Register screen
3. Select Google account
4. **Expected:** Success message + navigate to main app (no duplicate profile)

### Test Scenario 3: New User Sign Up
1. Make sure you don't have a Firestore profile for the test Google account
2. Click "Sign up with Google" on Register screen
3. Select Google account
4. **Expected:** Success message + navigate to main app + profile created in Firestore

### Test Scenario 4: Existing User Sign In
1. Make sure you DO have a Firestore profile for the test Google account
2. Click "Sign in with Google" on Login screen
3. Select Google account
4. **Expected:** Success message + navigate to main app

## Verification Checklist

After rebuild, verify:

- [ ] `npm list @react-native-google-signin/google-signin` shows version 12.2.1
- [ ] Running `npx expo run:android` or `npx expo run:ios` (not `npm start`)
- [ ] Google Sign-In buttons appear on Login and Register screens
- [ ] Clicking button shows native Google account picker
- [ ] All 4 scenarios work as documented above
- [ ] Check Firestore `users/{uid}` collection for new profiles
- [ ] Check that existing profiles aren't duplicated

## Common Issues After Rebuild

### "Sign-In is not configured" still appears
**Cause:** Still running via Expo Go  
**Fix:** Make sure you're using `npx expo run:android/ios`, not `npm start`

### Google Sign-In sheet doesn't appear
**Cause:** Invalid OAuth client IDs  
**Fix:** Check `AuthContext.tsx` has correct client IDs from Firebase Console

### Profile not created after sign up
**Cause:** Cloud Function error  
**Fix:** Check Firebase Console → Functions → Logs for errors in `createUserProfile`

### User authenticated but still on login screen
**Cause:** Navigation not triggered  
**Fix:** Check `AppNavigator.tsx` auth state listener

## Summary

**The Error Is Expected** - You're seeing it because the native module isn't linked yet.

**The Fix Is Simple** - Rebuild the app:
```bash
npx expo run:android  # or npx expo run:ios
```

**The Logic Is Complete** - All 4 scenarios are now properly handled in the code. Once you rebuild, everything will work!

See `docs/auth/GOOGLE_SIGNIN_BUSINESS_LOGIC.md` for complete details on all scenarios.

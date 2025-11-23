# Google Sign-In Quick Fix Guide

## Problem
You're seeing: `TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found`

**OR**

You're seeing: `Google Sign-In is not configured. Please rebuild the app after installing dependencies.`

Both errors mean the same thing: the native module needs to be linked and the app needs to be rebuilt.

## ✅ All Business Logic Has Been Implemented!

The code now correctly handles all 4 Google authentication scenarios:

1. **New user tries to sign in** → Shows error, redirects to sign up
2. **Existing user tries to sign up** → Just logs them in (no duplicate profile)
3. **New user signs up** → Creates profile in Firestore, logs them in
4. **Existing user signs in** → Normal login flow

See `GOOGLE_SIGNIN_BUSINESS_LOGIC.md` for complete details.

## Solution - You MUST Rebuild the App

### ⚠️ CRITICAL: Do NOT use `npm start` or Expo Go

The native module will **never work** in Expo Go. You **must** rebuild the native app:

#### For Android:
```bash
# Clear caches
rm -rf android/build
rm -rf android/app/build
rm -rf node_modules/.cache

# Rebuild the app
npx expo run:android
```

#### For iOS:
```bash
# Clear caches and reinstall pods
cd ios
rm -rf build
rm Podfile.lock
pod deintegrate
pod install
cd ..

# Rebuild the app
npx expo run:ios
```

### Step 3: Verify Google Sign-In Configuration

The following credentials are now configured in `src/context/AuthContext.tsx`:

```typescript
webClientId: '296095212837-6fd8f831e3d7f642f726cc.apps.googleusercontent.com'
iosClientId: '296095212837-iqnb0f91bam5urvqggk7sd2ccr7mqeej.apps.googleusercontent.com'
```

These are pulled from your Firebase Console for the `mundo1-dev` project.

### Step 4: Test

1. Rebuild and launch the app
2. Navigate to Login/Register screen
3. Tap "Sign in with Google" or "Sign up with Google"
4. You should see the Google Sign-In sheet
5. Complete the sign-in flow

## Troubleshooting

### Still seeing the error after rebuild?

1. **Make sure you're not running via Expo Go**:
   - Expo Go doesn't support custom native modules
   - You MUST use `npx expo run:android` or `npx expo run:ios`

2. **Check that the package is installed**:
   ```bash
   npm list @react-native-google-signin/google-signin
   ```
   Should show version `^12.2.1`

3. **For Android - Check google-services.json**:
   - Verify `android/app/google-services.json` exists
   - It should contain your Firebase project configuration

4. **For iOS - Check Info.plist**:
   - Verify `ios/VoyagerRN/GoogleService-Info.plist` exists
   - Check that URL scheme is added (see docs/auth/google/GOOGLE_SIGNIN_SETUP.md)

5. **Check native logs**:
   ```bash
   # Android
   npx react-native log-android
   
   # iOS
   npx react-native log-ios
   ```

### Error: "Google Sign-In is not configured"

This means the SafeGoogleSignin wrapper detected that the native module isn't available. Make sure you:
1. Rebuilt the app (not running via Expo Go)
2. Installed dependencies: `npm install`
3. For iOS, ran `pod install` in the `ios/` directory

## What Changed in the Code?

1. **AuthContext.tsx**:
   - Added `import { SafeGoogleSignin }` instead of dynamic require
   - Added GoogleSignin.configure() call in useEffect on mount
   - Replaced all `GoogleSignin.*` calls with `SafeGoogleSignin.*`
   - Added availability checks before attempting Google Sign-In

2. **SafeGoogleSignin.ts** (already existed):
   - Provides safe wrapper around native module
   - Gracefully handles cases where module isn't available
   - Gives helpful error messages

## Next Steps

After rebuilding, Google Sign-In should work! The app will:
1. Show Google Sign-In button on auth screens
2. When tapped, show native Google Sign-In sheet
3. After successful sign-in, create/update user profile
4. Navigate to the main app

If you still have issues after following these steps, check the full setup guide in `docs/auth/google/GOOGLE_SIGNIN_SETUP.md`.

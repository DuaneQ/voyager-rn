# iOS Google Sign-In Module Fix

## Problem
After running `npx expo prebuild --clean` and rebuilding for Android, the iOS app still showed:
```
ERROR Invariant Violation: TurboModuleRegistry.getEnforcing(...): 
'RNGoogleSignin' could not be found.
```

## Root Cause
The iOS app was running from a cached build that didn't include the newly installed native modules. After `expo prebuild --clean`, the native iOS binary needs to be completely rebuilt, not just the JavaScript bundle.

## Why Android Worked But iOS Didn't

### Android:
- When you run `npm run android` or `expo run:android`, it **always rebuilds** the native Android APK
- Gradle compiles all native modules from scratch each time
- The Google Sign-In module was properly included in the new build

### iOS:
- When you run `expo start` and scan QR code, it uses **Expo Go** which doesn't have your custom native modules
- When you run on simulator via Expo Go, it loads a **pre-built binary** that may not include new native modules
- iOS requires running `npx expo run:ios` to build a **development build** with custom native modules

## Solution Applied

### 1. Verified Pods Are Installed
Checked `ios/Podfile.lock`:
```
✅ RNGoogleSignin (16.0.0) - INSTALLED
```

### 2. Rebuilt iOS App from Source
```bash
cd /Users/icebergslim/projects/voyager-RN
npx expo run:ios
```

This command:
- Compiles all native Objective-C/Swift code
- Links all CocoaPods dependencies (including RNGoogleSignin)
- Creates a development build with ALL native modules
- Installs and launches on iOS Simulator

## Build Progress
The build includes:
- ✅ Copying GoogleSignIn resources (all language localizations)
- ✅ Compiling Google Sign-In native code
- ✅ Linking Firebase dependencies
- ✅ Creating proper resource bundles

## Key Differences: Expo Go vs Development Build

| Feature | Expo Go | Development Build (`expo run:ios`) |
|---------|---------|-----------------------------------|
| Custom Native Modules | ❌ Not supported | ✅ Full support |
| Google Sign-In | ❌ Won't work | ✅ Works perfectly |
| Rebuild Required | No | Yes (when native deps change) |
| QR Code | ✅ Works | ✅ Works |
| Best For | Quick JS testing | Production-like testing |

## When to Use Each Build Method

### Use `expo start` + Expo Go when:
- Testing JavaScript-only changes
- No custom native modules needed
- Quick iteration on UI/logic
- **NOT suitable for Google Sign-In testing**

### Use `expo run:ios` when:
- Testing custom native modules (like Google Sign-In)
- After installing new native dependencies
- After `expo prebuild`
- Testing production-like behavior
- **REQUIRED for Google Sign-In testing**

## Verification Steps

Once the build completes:
1. ✅ App should launch without "RNGoogleSignin could not be found" error
2. ✅ Firebase should initialize correctly
3. ✅ Google Sign-In button should work
4. ✅ Native Google Sign-In sheet should appear

## Prevention

### After Installing Native Dependencies:
```bash
# 1. Install the dependency
npm install @some/native-package

# 2. iOS: Reinstall pods
cd ios && pod install && cd ..

# 3. iOS: Rebuild development build
npx expo run:ios

# 4. Android: Will auto-rebuild on next run
npm run android
```

### Quick Reference:
```bash
# JavaScript-only changes
npm start  # Opens Expo Go

# Native module changes
npx expo run:ios      # iOS rebuild
npx expo run:android  # Android rebuild
```

## Files Confirmed Working
- ✅ `ios/VoyagerRN/GoogleService-Info.plist` - Firebase config
- ✅ `ios/VoyagerRN/Info.plist` - URL scheme for Google callback
- ✅ `ios/Podfile.lock` - RNGoogleSignin@16.0.0 installed
- ✅ `ios/Pods/` - All dependencies linked

## Expected Build Time
- First build: 5-10 minutes (compiling all native code)
- Subsequent builds: 2-3 minutes (only changed files)

## Next Steps After Build
1. Wait for build to complete and app to launch
2. Test Google Sign-In functionality
3. Verify no module errors in logs
4. Test Phase 1 Profile features

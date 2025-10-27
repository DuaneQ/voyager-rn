# iOS Troubleshooting Guide

## Common iOS Errors and Solutions

### Error: `RNGoogleSignin` could not be found

**Symptom:**
```
TurboModuleRegistry.getEnforcing(...): 
'RNGoogleSignin' could not be found. Verify that a module by this name 
is registered in the native binary.
```

**Root Cause:**
The native module is not properly linked in the iOS build. This happens when:
1. CocoaPods were not installed after adding `@react-native-google-signin/google-signin`
2. Running `expo prebuild --clean` removed the pod installation
3. iOS build cache is stale

**Solution:**

1. **Reinstall CocoaPods:**
   ```bash
   cd ios
   pod install
   cd ..
   ```

2. **Clean and rebuild:**
   ```bash
   # Remove build cache
   rm -rf ios/build
   
   # Rebuild the app
   npx expo run:ios
   ```

3. **Verify pod installation:**
   After running `pod install`, you should see:
   ```
   Auto-linking React Native modules for target `VoyagerRN`: 
   ..., RNGoogleSignin, ...
   ```

**Prevention:**
- Always run `pod install` after:
  - Adding/removing native dependencies
  - Running `expo prebuild --clean`
  - Pulling code that changes native dependencies
  - Switching branches with different dependencies

---

### Error: Google Sign-In Configuration Missing

**Symptom:**
```
Google Sign-In requires GoogleService-Info.plist
```

**Solution:**
1. Verify `ios/VoyagerRN/GoogleService-Info.plist` exists
2. Verify `ios/VoyagerRN/Info.plist` has the reversed client ID in URL schemes

See: `docs/GOOGLE_SIGNIN_MODULE_FIX.md` for full setup

---

### Error: Module not found after `expo prebuild --clean`

**Root Cause:**
`expo prebuild --clean` removes the entire `ios/` and `android/` directories, including:
- CocoaPods installation
- Firebase configuration files
- Custom native code modifications

**Solution:**
After running `expo prebuild --clean`:

1. **Restore Firebase configs:**
   ```bash
   # Android
   cp google-services.json.backup android/app/google-services.json
   
   # iOS
   cp GoogleService-Info.plist.backup ios/VoyagerRN/GoogleService-Info.plist
   ```

2. **Reinstall iOS pods:**
   ```bash
   cd ios && pod install
   ```

3. **Rebuild:**
   ```bash
   npx expo run:ios
   npx expo run:android
   ```

---

### Error: Build fails with "No bundle URL present"

**Solution:**
1. Make sure Metro bundler is running:
   ```bash
   npx expo start
   ```

2. Reset Metro cache:
   ```bash
   npx expo start --clear
   ```

3. Rebuild:
   ```bash
   npx expo run:ios
   ```

---

### Error: Simulator doesn't show app or shows old version

**Solution:**
1. **Delete app from simulator:**
   - Long press app icon → Delete
   
2. **Reset simulator (nuclear option):**
   ```bash
   # Close simulator first, then:
   xcrun simctl erase all
   ```

3. **Rebuild:**
   ```bash
   npx expo run:ios
   ```

---

## iOS Development Workflow

### Standard Build Process

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install iOS pods:**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Start Metro bundler:**
   ```bash
   npx expo start
   ```

4. **Run on simulator (in another terminal):**
   ```bash
   npx expo run:ios
   ```

### After Pulling Changes

```bash
# 1. Update npm dependencies
npm install

# 2. Update iOS pods (if package.json changed)
cd ios && pod install && cd ..

# 3. Clean build (if native code changed)
rm -rf ios/build

# 4. Rebuild
npx expo run:ios
```

### Debugging Native Modules

1. **Check if module is linked:**
   ```bash
   cd ios
   grep -r "RNGoogleSignin" Pods/Target\ Support\ Files/
   ```

2. **Check Podfile.lock:**
   ```bash
   grep "RNGoogleSignin" ios/Podfile.lock
   ```

3. **View Xcode logs:**
   - Open `ios/VoyagerRN.xcworkspace` in Xcode
   - Product → Scheme → VoyagerRN
   - Product → Run
   - View console output

---

## Quick Command Reference

```bash
# Clean everything
rm -rf node_modules ios/build ios/Pods
npm install
cd ios && pod install && cd ..

# Rebuild iOS
npx expo run:ios

# Rebuild iOS on specific simulator
npx expo run:ios --device "iPhone 15 Pro"

# View available simulators
xcrun simctl list devices

# Reset all simulators
xcrun simctl erase all

# View Metro bundler logs
npx expo start --clear

# View detailed build output
npx expo run:ios --verbose
```

---

## Related Documentation

- **Google Sign-In Setup**: `docs/GOOGLE_SIGNIN_MODULE_FIX.md`
- **iOS OAuth Client Setup**: `docs/auth/CREATE_IOS_OAUTH_CLIENT_ID.md`
- **Firebase Configuration**: `android/app/google-services.json`, `ios/VoyagerRN/GoogleService-Info.plist`

---

## When to Contact Team

If after following all troubleshooting steps:
1. Pods install successfully ✅
2. Build completes without errors ✅
3. App launches but native module still not found ❌

Then:
1. Check if the package is compatible with Expo
2. Check package version compatibility with React Native version
3. Review package documentation for additional setup steps
4. Check if manual linking is required (rare with Expo)

---

**Last Updated**: October 27, 2025  
**Tested with**: Expo SDK 51, React Native 0.74

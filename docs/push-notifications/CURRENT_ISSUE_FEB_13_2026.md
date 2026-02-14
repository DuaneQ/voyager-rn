# FCM Integration Issue - Feb 13, 2026

## Problem Summary
FCM push notification tokens are not being generated on Android devices after user sign-in.

## Expected Behavior
1. User signs into the app
2. `NotificationInitializer` component triggers
3. Permission dialog appears (Android 13+)
4. FCM token is generated
5. Token is saved to Firestore `users/{uid}.fcmTokens` array

## Actual Behavior
1. User signs into the app
2. No permission dialog appears
3. No FCM token generated
4. Firestore user document has no `fcmTokens` field

## Initial Investigation (Local Debug Build)

### Test Environment
- Device: Samsung SM_A037U (Android)
- Build: Debug via `npx expo run:android --device`
- Metro bundler: Running on port 8081

### Logs from Device
```
ERROR  Failed to load mobile notification modules: [Error: Cannot find module '@react-native-firebase/messaging']
LOG  🔔 NotificationInitializer effect running {"hasUser": true, "platform": "android", "status": "authenticated", "userId": "WAoErJ0E3AMQBvucH535DwjRAnT2"}
LOG  ✅ User authenticated, registering for push notifications...
ERROR  Error registering for push notifications: [TypeError: Cannot read property 'requestPermission' of null]
```

### Root Cause Identified
The `@react-native-firebase/messaging` module cannot be found by Metro bundler, even though:
- ✅ Package is installed: `"@react-native-firebase/messaging": "^21.9.0"` in package.json
- ✅ `@react-native-firebase/app`: `"^21.9.0"` is also installed
- ✅ Native Android build completed successfully
- ✅ `google-services.json` is present in `android/app/`

## Attempted Fixes (All Failed)

### Attempt 1: Removed `emailVerified` Check
**Hypothesis**: The `emailVerified` check was blocking token registration  
**Change**: Removed condition in `NotificationInitializer.tsx`  
**Result**: ❌ Still failed - module not found

### Attempt 2: Changed from Dynamic to Static Import
**Hypothesis**: Metro bundler can't resolve dynamic `require()` in dev builds  
**Change**: 
```typescript
// Before
function loadMobileModules() {
  const firebaseMessaging = require('@react-native-firebase/messaging');
  messaging = firebaseMessaging.default;
}

// After
import messaging from '@react-native-firebase/messaging';
```
**Result**: ❌ Would break web builds (web can't import native modules)

### Attempt 3: Platform-Specific File Extensions
**Hypothesis**: Metro can pick correct file based on platform  
**Created Files**:
- `messaging.native.ts` - imports `@react-native-firebase/messaging`
- `messaging.ts` - exports null for web
- `NotificationService.ts` imports from `./messaging`

**Result**: ❌ Metro bundler error:
```
Unable to resolve "@react-native-firebase/messaging" from "src/services/notification/messaging.native.ts"
```

## Current Code State

### File Structure
```
src/services/notification/
├── NotificationService.ts      # Main service (uses ./messaging import)
├── messaging.native.ts         # Native module wrapper (FAILING)
└── messaging.ts                # Web stub (returns null)
```

### Error Stack
```
Android Bundling failed 29ms node_modules/expo/AppEntry.js
Unable to resolve "@react-native-firebase/messaging" from "src/services/notification/messaging.native.ts"

Import stack:
 src/services/notification/messaging.native.ts
 src/services/notification/NotificationService.ts
 src/context/AuthContext.tsx
 App.tsx
 node_modules/expo/AppEntry.js
```

## Key Questions for Next Steps

1. **Is the native module properly linked?**
   - React Native Firebase requires native setup beyond npm install
   - Expo dev client may need prebuild or specific configuration
   - Check: Does `react-native.config.js` need configuration?

2. **Does Expo support React Native Firebase natively?**
   - React Native Firebase is NOT an Expo managed package
   - May require Expo dev client with custom native code
   - Alternative: Use Expo's FCM implementation (expo-notifications with FCM backend)

3. **Is there a config plugin needed?**
   - Some React Native modules need Expo config plugins
   - Check: Does `@react-native-firebase/messaging` have an Expo config plugin?

4. **Should we use a different approach?**
   - Option A: Continue with React Native Firebase (requires proper native linking)
   - Option B: Switch to expo-notifications with FCM backend
   - Option C: Use Firebase Web SDK push notifications (works on web/mobile web, not native)

## Files Modified in This Session

1. `src/components/common/NotificationInitializer.tsx`
   - Added debug logging
   - Removed `emailVerified` check

2. `src/services/notification/NotificationService.ts`
   - Added extensive debug logging (emojis for easy grep)
   - Changed module loading strategy multiple times
   - Currently imports from `./messaging`

3. `src/services/notification/messaging.native.ts` (NEW)
   - Attempts to import `@react-native-firebase/messaging`
   - Currently failing in Metro bundler

4. `src/services/notification/messaging.ts` (NEW)
   - Web stub that exports null

5. `android/app/build.gradle`
   - Incremented versionCode from 6 → 7 → 23 → 24

## Testing Commands

```bash
# Local debug build on Android device
npx expo run:android --device

# View logs with emojis
adb logcat | grep -E "🔔|📱|🔑|💾|✅|❌"

# Clear Metro cache
npx expo start --clear

# Clean Android build
cd android && ./gradlew clean && cd ..
```

## Next Steps (For Claude Opus or Developer)

1. Verify React Native Firebase is properly linked in native Android project
2. Check if Expo dev client needs special configuration for React Native Firebase
3. Consider alternative: Migrate to expo-notifications with FCM backend integration
4. If sticking with React Native Firebase:
   - May need to run `npx expo prebuild` to generate native projects
   - Add proper config plugin to app.json if available
   - Verify AndroidManifest.xml has correct permissions

## Related Issues/Resources

- React Native Firebase Docs: https://rnfirebase.io/
- Expo + React Native Firebase: https://docs.expo.dev/guides/using-firebase/
- Firebase Messaging Module: https://rnfirebase.io/messaging/usage

## Status: BLOCKED - Needs Expert Attention

The fundamental issue is that Metro bundler cannot resolve the native React Native Firebase module in the Expo development environment. This likely requires:
- Native linking verification
- Expo dev client configuration
- OR switching to a different FCM implementation strategy

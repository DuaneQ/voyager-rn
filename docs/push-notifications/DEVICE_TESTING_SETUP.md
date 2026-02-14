# FCM Push Notifications - Device Testing Setup Complete ✅

## What Was Configured

### iOS Setup ✅
1. **CocoaPods Installation**
   - Installed React Native Firebase pods
   - Firebase/Core v12.9.0
   - Firebase/Messaging v12.9.0
   - Total: 121 pods installed

2. **Firebase Configuration**
   - ✅ GoogleService-Info.plist located at: `ios/TravalPass/GoogleService-Info.plist`

3. **Capabilities Enabled**
   - ✅ Push Notifications: Added `aps-environment: development` to entitlements
   - ✅ Background Modes: Added `remote-notification` to Info.plist

4. **Files Modified**
   - `ios/Podfile` - Added Firebase/Core and Firebase/Messaging pods
   - `ios/TravalPass/TravalPass.entitlements` - Added push notification entitlement
   - `ios/TravalPass/Info.plist` - Added background modes

### Android Setup ✅
1. **Firebase Configuration**
   - ✅ google-services.json located at: `android/app/google-services.json`

2. **Gradle Configuration**
   - ✅ Google Services plugin v4.4.1 in `android/build.gradle`
   - ✅ Plugin applied in `android/app/build.gradle`

3. **No Changes Needed**
   - Android configuration was already complete!

## Building for Real Devices

### iOS Build (Physical Device Required)

```bash
# Connect your iPhone via USB
npx expo run:ios --device
```

**Important Notes:**
- ✅ iOS Simulator **does NOT support** FCM push notifications
- ✅ Must use **physical device** for testing
- ✅ Device must be connected via USB or on same Wi-Fi network
- ✅ Xcode must be installed
- ✅ Development certificates must be configured in Xcode

**Troubleshooting:**
- If build fails: Open `ios/TravalPass.xcworkspace` in Xcode and build from there
- Check code signing settings in Xcode if needed
- Ensure device is trusted (Settings → General → Device Management)

### Android Build (Physical Device or Emulator)

```bash
# Option 1: Physical device (connect via USB, enable USB debugging)
npx expo run:android --device

# Option 2: Android emulator (must have Google Play Services)
npx expo run:android
```

**Important Notes:**
- ✅ Android emulator **DOES support** FCM push notifications (if it has Google Play)
- ✅ Physical device: Enable USB debugging in Developer Options
- ✅ Emulator: Use AVD with Google Play Services (not Google APIs)

## Testing Checklist

### 1. FCM Token Generation
```typescript
// Expected console output after sign-in:
"FCM token obtained: eA3kF..."  // Long alphanumeric string
"Current device push notification token saved"
```

### 2. Token Storage Verification
- Open Firebase Console → Firestore
- Navigate to `users/{uid}`
- Check `fcmTokens` array field
- Should contain your device's FCM token

### 3. Sign-Out Test (Multi-Device Fix)
**Scenario:** User signed in on 2 devices
1. Sign out on Device 1
2. Check Firestore: Device 1 token removed, Device 2 token **still present** ✅
3. Device 2 should still receive notifications ✅

**Previous Bug (Fixed):**
- ❌ OLD: Sign out on Device 1 → **ALL tokens deleted** → Device 2 notifications stopped
- ✅ NEW: Sign out on Device 1 → **Only Device 1 token deleted** → Device 2 still works

### 4. End-to-End Notification Test
1. Create a match between two users
2. Both devices should receive "New Match! 🎉" notification
3. Send a chat message
4. Recipient should receive notification with message preview

### 5. Foreground/Background Test
- Foreground: App open → notification appears as banner
- Background: App minimized → notification appears in notification center
- Quit: App fully closed → notification appears, tap to open app

## What's Next

### Required APNs Certificate Setup (iOS Only)
Even though the app builds, you need to upload an APNs certificate to Firebase Console:

1. **Generate APNs Key (Preferred Method)**
   - Go to: Apple Developer Portal → Certificates, IDs & Profiles → Keys
   - Create new key with "Apple Push Notifications service (APNs)" enabled
   - Download the `.p8` file
   - Note your Key ID and Team ID

2. **Upload to Firebase**
   - Firebase Console → Project Settings → Cloud Messaging
   - iOS app configuration → APNs Authentication Key
   - Upload `.p8` file + enter Key ID + Team ID

3. **Alternative: APNs Certificate**
   - Generate certificate (`.p12`) via Apple Developer Portal
   - Upload to Firebase Console (less preferred, expires yearly)

**Note:** If this project shares Firebase with the PWA, APNs might already be configured!

## Verification Commands

```bash
# Check iOS Firebase installation
grep -i "firebase" ios/Podfile.lock | head -5

# Check Android Firebase configuration  
ls -la android/app/google-services.json

# TypeScript compilation (should have no errors)
npx tsc --noEmit

# Run all tests
npm test
```

## Key Architecture Changes

### Device-Specific Token Management
```typescript
// Token saved to AsyncStorage on registration
await AsyncStorage.setItem('@current_fcm_token', token);

// On sign-out: Only current device token removed
const currentDeviceToken = await AsyncStorage.getItem('@current_fcm_token');
await notificationService.removeToken(userId, currentDeviceToken);
// ✅ Other devices unaffected!
```

### No More Unmount Cleanup
- Removed automatic token cleanup on component unmount
- Prevents accidental token deletion during navigation/hot-reload
- Token cleanup **only** happens on explicit sign-out

## Debugging Tips

### View Logs During Testing
```bash
# iOS logs (with connected device)
npx react-native log-ios

# Android logs (with connected device or emulator)
npx react-native log-android

# Check for FCM-related messages
# Expected: "FCM token obtained: ..."
# Expected: "Push notifications registered successfully"
```

### Common Issues

**iOS: "No certificate for team..."**
- Solution: Open Xcode, go to Signing & Capabilities, select your team

**Android: "google-services plugin not found"**
- Solution: Already configured, but if you see this, check `android/build.gradle`

**No FCM token generated:**
- iOS: Check if GoogleService-Info.plist is in correct location
- Android: Check if google-services.json matches package name
- Both: Check Firebase Console for app registration

**Token not saving to Firestore:**
- Check Firebase Auth user is signed in
- Check Firestore rules allow write to `users/{uid}`
- Check console for "Current device push notification token saved"

## Success Criteria

✅ App builds successfully on real device  
✅ FCM token generated and logged (150+ character string)  
✅ Token appears in Firestore `users/{uid}.fcmTokens` array  
✅ Sign-out removes **only** current device token  
✅ Other devices still receive notifications after this device signs out  
✅ Foreground, background, and quit state notifications work  
✅ Unit tests pass (2,215+ tests)  
✅ TypeScript compilation clean  

## Build Commands Summary

```bash
# iOS (physical device required)
npx expo run:ios --device

# Android (physical device or emulator)
npx expo run:android --device

# Start Metro bundler (if not auto-started)
npx expo start
```

---

**Status:** Ready for device testing!
**Last Updated:** February 13, 2026
**Multi-Device Fix:** ✅ Complete

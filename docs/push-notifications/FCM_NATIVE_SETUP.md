# Firebase Cloud Messaging (FCM) Native Setup

This guide covers the necessary native configuration for FCM push notifications using `@react-native-firebase/messaging`.

## Overview

We use **Firebase Admin SDK** on the backend and **React Native Firebase** on the client to send/receive FCM tokens and notifications. This replaces the Expo Push Token implementation.

## Prerequisites

- ✅ Firebase project created (mundo1-dev / mundo1-1)
- ✅ `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) already in project
- ✅ Firebase Web SDK already configured

## iOS Setup

### 1. Install CocoaPods Dependencies

```bash
cd ios
pod install
cd ..
```

### 2. Enable Push Notifications Capability

1. Open `ios/TravalPass.xcworkspace` in Xcode
2. Select the TravalPass target
3. Click "Signing & Capabilities" tab
4. Click "+ Capability" button
5. Add "Push Notifications"
6. Add "Background Modes"
   - Check "Remote notifications"

### 3. Upload APNs Certificate/Key to Firebase Console

1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Under "Apple app configuration":
   - Upload your APNs Authentication Key (.p8 file)
   - OR upload APNs Certificate (.p12 file)

**Note**: You likely already have this configured since the PWA uses FCM for web notifications.

## Android Setup

### 1. Verify google-services.json

Ensure `google-services.json` is in `android/app/` (already present).

### 2. Update android/build.gradle

The project should already have:

```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.4.2'
}
```

### 3. Update android/app/build.gradle

Should already have:

```gradle
apply plugin: 'com.google.gms.google-services'
```

### 4. Add Notification Icon (Optional)

Place notification icon at:
```
android/app/src/main/res/drawable/notification_icon.png
```

If not present, Android will use the app icon as fallback.

## Testing

### iOS Testing

```bash
# Development build on physical device
npx expo run:ios --device
```

**Note**: Push notifications do NOT work in iOS Simulator - requires physical device.

### Android Testing

```bash
# Development build
npx expo run:android --device

# OR build via EAS and install on device
eas build --profile development --platform android
```

## Verification Checklist

- [ ] iOS: Push Notifications and Background Modes capabilities enabled
- [ ] iOS: APNs certificate/key uploaded to Firebase Console
- [ ] Android: google-services.json in android/app/
- [ ] Android: google-services plugin applied
- [ ] Test on physical device (iOS Simulator doesn't support push)
- [ ] Verify FCM token format (should be ~150+ char string, not ExponentPushToken)

## Differences from Expo Push Tokens

| Aspect | Expo Push Tokens | FCM Tokens (Current) |
|--------|------------------|---------------------|
| Format | `ExponentPushToken[abc123]` | Long alphanumeric string |
| Where stored | Expo's servers | Direct to FCM/APNs |
| Backend API | Expo Push API | Firebase Admin FCM |
| iOS Simulator | Works | Does NOT work |
| Dependency | `expo-notifications` | `@react-native-firebase/messaging` |

## Troubleshooting

### iOS: "No APNs certificate uploaded"
- Upload APNs Auth Key or Certificate in Firebase Console → Cloud Messaging

### Android: "Service not available"
- Ensure google-services.json is correct
- Check that com.google.gms.google-services plugin is applied

### Token is null
- Check that permissions are granted
- On iOS, ensure running on physical device (not simulator)
- Verify Firebase project configuration

### Backend returns "invalid-registration-token"
- Ensure backend is using Firebase Admin FCM API (already implemented)
- Verify token format is correct (not Expo token format)

## Related Files

- Client: `src/services/notification/NotificationService.ts`
- Backend: `functions/src/notifications/sendMatchNotification.ts`
- Backend: `functions/src/notifications/sendChatNotification.ts`

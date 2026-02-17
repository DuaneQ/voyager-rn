# Push Notifications Setup — FCM Token Management

> **⚠️ OUTDATED**: This document was written for the expo-notifications token approach (pre-build 33).  
> The app now uses `@react-native-firebase/messaging` for FCM token management.  
> See [IOS_PUSH_DEBUG_STATUS.md](./IOS_PUSH_DEBUG_STATUS.md) for the **current authoritative architecture**.
>
> **Updated**: February 15, 2026  
> **Status**: SUPERSEDED — See IOS_PUSH_DEBUG_STATUS.md  
> **Library**: `@react-native-firebase/messaging` (re-installed in build 33, replaces expo-notifications token approach)

## Overview

Push notifications use **`expo-notifications`** to obtain native device push tokens:
- **Android**: FCM device registration token (directly compatible with Firebase Admin SDK)
- **iOS**: APNs device token (Firebase Admin SDK handles APNs → FCM mapping)

The backend **Firebase Cloud Functions** send notifications via Firebase Admin SDK `messaging().sendEachForMulticast()`.

## Architecture

```
[Device] → expo-notifications.getDevicePushTokenAsync() → native FCM/APNs token
         → saved to Firestore: users/{uid}.fcmTokens[]
[Backend] → Cloud Function trigger (new message, new match)
          → reads fcmTokens[] from recipient's user doc
          → Firebase Admin SDK messaging().sendEachForMulticast()
          → FCM/APNs delivers to device
```

## Why expo-notifications (not @react-native-firebase/messaging)

| Factor | @react-native-firebase/messaging | expo-notifications |
|--------|----------------------------------|-------------------|
| Expo compatibility | Requires `expo-dev-client` + config plugins + `npx expo prebuild` | Works natively with Expo managed workflow |
| Native module linking | Manual — caused `RNFBAppModule not found` errors | Automatic via Expo plugin system |
| Token type | FCM token | Same FCM token (via `getDevicePushTokenAsync`) |
| Cost | Free | Free (identical — same FCM pipeline) |
| Complexity | High (native setup per platform) | Low (plugin in app.json) |

## Prerequisites

- ✅ Firebase project (`mundo1-1` for production)
- ✅ `google-services.json` in project root (Android) — points to `mundo1-1`
- ✅ `GoogleService-Info.plist` in project root (iOS) — points to `mundo1-1`
- ✅ `expo-notifications` configured as plugin in `app.json`
- ✅ `expo-device` installed (physical device detection)

## Configuration (app.json)

Already in place:
```json
["expo-notifications", {
  "icon": "./assets/images/notification-icon.png",
  "color": "#FF6B35",
  "sounds": [],
  "defaultChannel": "default"
}]
```

## Android Notification Channels

Three channels are created by `NotificationService.requestPermission()`:

| Channel ID | Name | Used By |
|-----------|------|---------|
| `default` | Default | Fallback for any notification |
| `matches` | Matches | `sendMatchNotification` cloud function |
| `chat-messages` | Messages | `sendChatNotification` cloud function |

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | `Notifications.setNotificationHandler()` — called at module level (before React render) |
| `src/services/notification/NotificationService.ts` | Permission, token CRUD, badge, channel creation |
| `src/hooks/useNotifications.ts` | React hook — state management, registration flow, listeners |
| `src/components/common/NotificationInitializer.tsx` | Triggers registration when user is authenticated |

## Testing

### Local development build (FREE — no EAS build needed)
```bash
# Android
npx expo run:android --device

# iOS  
npx expo run:ios --device
```

### Send test notification
Firebase Console → Cloud Messaging → Compose → "Send test message" → paste FCM token

**Important**: Send from the **mundo1-1** (production) Firebase Console, not `mundo1-dev`, because `google-services.json` is configured for production.

### Verify token in Firestore
Firebase Console → Firestore → `users/{uid}` → check `fcmTokens` array

## Dev vs Production Note

| Config | Points To |
|--------|----------|
| `google-services.json` / `GoogleService-Info.plist` | `mundo1-1` (production) — **always** |
| `firebase-config.js` (`__DEV__=true`) | `mundo1-dev` |
| `firebase-config.js` (`__DEV__=false`) | `mundo1-1` |

In dev mode, FCM tokens are registered against `mundo1-1` (native config) but Firestore writes go to `mundo1-dev` (JS SDK). This means **push notifications only fully work in production builds** or when testing with `mundo1-1` Firebase Console.

## Troubleshooting

### Token is null
- Ensure running on physical device (not emulator/simulator)
- Check that notification permissions are granted
- Verify `google-services.json` / `GoogleService-Info.plist` are present

### Notifications not displaying
- Ensure `Notifications.setNotificationHandler()` is called at module level in `App.tsx` (not inside a React component)
- Check Android notification channels match what cloud functions send to

### Dev mode: notifications don't arrive
- Expected behavior — `google-services.json` points to production but JS SDK connects to dev Firestore
- Test with production Firebase Console, or use production build
- Ensure backend is using Firebase Admin FCM API (already implemented)
- Verify token format is correct (not Expo token format)

## Related Files

- Client: `src/services/notification/NotificationService.ts`
- Backend: `functions/src/notifications/sendMatchNotification.ts`
- Backend: `functions/src/notifications/sendChatNotification.ts`

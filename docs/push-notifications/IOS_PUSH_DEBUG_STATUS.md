# iOS Push Notification Debug Status

**Last Updated**: February 15, 2026  
**Status**: FIXED — Replaced deprecated IID batchImport with @react-native-firebase/messaging  
**Build**: 1.7.4 build 33 (iOS), versionCode 26 (Android)

---

## Root Cause (Definitive)

### The IID batchImport API is deprecated and produces invalid FCM tokens

The `registerAPNsToken` cloud function used the deprecated [Instance ID `batchImport` API](https://developers.google.com/instance-id/reference/server) to convert iOS APNs tokens to FCM tokens. Google has deprecated this API:

> "The Instance ID API is deprecated. If you need to access unique app installation identifiers, use the Firebase installations API."

> "Apps still using deprecated Instance ID APIs for token management should update all token logic to use the FCM APIs described here."

**What happened:**
1. `registerAPNsToken` called `https://iid.googleapis.com/iid/v1:batchImport` → returned `status: "OK"` with a `registration_token`
2. Token was saved to Firestore `users/{uid}.fcmTokens`
3. `sendChatNotification` called `admin.messaging().sendEachForMulticast()` (FCM v1 API) → **token rejected as invalid**
4. Error progressed from `messaging/third-party-auth-error` (wrong APNs key) to `messaging/invalid-registration-token` (deprecated API tokens)

### Why the APNs key swap didn't fully fix it
The first error (`third-party-auth-error`) was caused by having the wrong APNs key (RHH9M95YC5, production-only) for TestFlight (sandbox). Swapping to Z64B4S2GC7 (sandbox + production) fixed the APNs auth error but revealed the deeper problem: IID batchImport-created tokens aren't properly recognized by FCM v1 messaging API.

### Why it seemed to work intermittently before
Build 31 used `arrayUnion(token)` to save tokens. Multiple tokens accumulated in Firestore from different sessions/builds. Some older tokens or Android tokens in the array could succeed, masking the iOS failures.

---

## Fix Applied: @react-native-firebase/messaging

### Problem
- `expo-notifications` `getDevicePushTokenAsync()` returns raw APNs tokens on iOS
- These needed conversion to FCM tokens via the deprecated IID batchImport API
- The converted tokens were invalid for FCM v1 delivery

### Solution
Re-installed `@react-native-firebase/messaging` which handles APNs→FCM token mapping **natively** through the Firebase iOS SDK. No cloud function conversion needed.

**Package history:**
- Originally installed in commit `6efec691f` ("Pushing changes")
- **Erroneously removed** in commit `fcfe1fde0` ("Fixing push notification", Feb 14, 2026) and replaced with the IID batchImport approach
- **Re-installed** in build 33 (Feb 15, 2026)

### Changes Made

| File | Change |
|---|---|
| package.json | Re-added `@react-native-firebase/app` v21.14.0 + `@react-native-firebase/messaging` v21.14.0 |
| src/services/notification/messaging.native.ts | Created — platform adapter importing `@react-native-firebase/messaging` |
| src/services/notification/messaging.ts | Created — web stub returning null |
| src/services/notification/NotificationService.ts | Rewrote to use `messaging().getToken()`, `messaging().requestPermission()`, `messaging().onTokenRefresh()`, `messaging().deleteToken()` |
| __mocks__/@react-native-firebase/messaging.ts | Created — Jest mock for tests |
| src/__tests__/services/NotificationService.test.ts | Updated to mock `messaging` instead of expo-notifications for tokens |
| app.json | buildNumber: 32→33, versionCode: 24→25 |

### What was removed
- `convertAPNsToFCM()` private method (no longer needed)
- `firebase/functions` import (no longer calling `registerAPNsToken` cloud function)
- All IID batchImport token conversion logic

### What was kept
- `expo-notifications` for: Android notification channels, badge management, notification listeners
- `[token]` replacement in `saveToken` (prevents stale token accumulation)
- `removeAllTokens` for clean logout
- All Firestore token storage patterns (unchanged)

---

## Architecture (Updated)

### Client Flow (NotificationService.ts) — Build 33+
```
requestPermission() → messaging().requestPermission()
  → iOS: Firebase iOS SDK registers APNs automatically
  → Android: Permissions via system API
→ messaging().getToken()
  → iOS: Firebase SDK handles APNs→FCM natively (no cloud function needed)
  → Android: FCM token directly
→ saveToken(userId, fcmToken) → Firestore users/{uid}.fcmTokens: [token]

Token refresh:
  messaging().onTokenRefresh(token => saveToken(userId, token))
  → FCM tokens directly on both platforms (no conversion needed)
```

### Server Flow (sendChatNotification.ts) — Unchanged
```
Firestore trigger: connections/{id}/messages/{id} created
→ getTokensForUser(recipientId) → reads users/{uid}.fcmTokens
→ admin.messaging().sendEachForMulticast({tokens, notification, apns, android})
→ FCM delivers to APNs (iOS) or FCM (Android)
→ cleanupInvalidTokens() on failure
```

### registerAPNsToken cloud function — DEPRECATED
- Still deployed but no longer called by the app (build 33+)
- Can be removed from cloud functions in a future cleanup
- 3864 calls/24hrs observed before fix (likely from old builds in loop)

---

## Key Files
| Purpose | File |
|---|---|
| Client notification service | src/services/notification/NotificationService.ts |
| Messaging platform adapter (mobile) | src/services/notification/messaging.native.ts |
| Messaging platform adapter (web) | src/services/notification/messaging.ts |
| Client notification hook | src/hooks/useNotifications.ts |
| Firebase config (dev/prod) | src/config/firebaseConfig.ts |
| Chat notification cloud fn | functions/src/notifications/sendChatNotification.ts |
| Match notification cloud fn | functions/src/notifications/sendMatchNotification.ts |
| Token utilities | functions/src/notifications/utils.ts |
| iOS Firebase config | GoogleService-Info.plist |
| DEPRECATED: Token conversion fn | functions/src/notifications/registerAPNsToken.ts |

## Key Values
| Setting | Value |
|---|---|
| Firebase Project (prod) | mundo1-1 |
| Firebase Project (dev) | mundo1-dev |
| Sender ID (prod) | 533074391000 |
| Sender ID (dev) | 296095212837 |
| Bundle ID | com.travalpass.app |
| APNs Key (correct, sandbox+prod) | Z64B4S2GC7 |
| Team ID | 77WCFLF5AV |
| iOS Build Number | 33 |
| Android versionCode | 26 |
| App Version | 1.7.4 |

---

## Post-Fix Checklist

- [ ] Build with `eas build --platform ios`
- [ ] Submit to TestFlight
- [ ] Clear Firestore tokens: set `users/{uid}.fcmTokens: []` for test user
- [ ] Log out and back in on iOS TestFlight to register new native FCM token
- [ ] Send test chat message → verify iOS push notification received
- [ ] Verify Android still works
- [ ] Monitor `registerAPNsToken` cloud function — calls should drop to zero from build 33+ devices
- [ ] Future cleanup: remove `registerAPNsToken` from cloud functions once all users update

---

## Debug Timeline (for reference)

1. **Build 32 deployed** — iOS notifications fail with `messaging/third-party-auth-error`
2. **APNs key investigation** — Key RHH9M95YC5 is production-only, TestFlight needs sandbox
3. **Key swap** — Replaced with Z64B4S2GC7 (sandbox + production)
4. **Error changed** — Now `messaging/invalid-registration-token` (tokens cleaned up, not temporary)
5. **Root cause found** — IID batchImport API is deprecated, produces tokens rejected by FCM v1
6. **History check** — `@react-native-firebase/messaging` was previously installed and working, removed erroneously
7. **Fix applied** — Re-installed `@react-native-firebase/messaging`, rewrote NotificationService

---

## References

- [Instance ID Server Reference (DEPRECATED)](https://developers.google.com/instance-id/reference/server)
- [FCM Token Management Best Practices](https://firebase.google.com/docs/cloud-messaging/manage-tokens)
- [Firebase Cloud Messaging iOS Setup](https://firebase.google.com/docs/cloud-messaging/ios/first-message)
- [@react-native-firebase/messaging](https://rnfirebase.io/messaging/usage)

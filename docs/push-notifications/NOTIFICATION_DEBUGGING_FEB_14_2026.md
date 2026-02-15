# Push Notification Debugging - February 14, 2026

## Current Issue Summary

**Status**: Chat and video comment notifications are not being received on iOS device, despite server logs showing successful sends.

## Timeline

### What Was Working
- ✅ Video comment notifications were working at some point with current production build
- ✅ Build: Production iOS build (build number 14)
- ✅ User authenticated, token registered in Firestore

### What Changed
1. **Session Start**: User reported not receiving connection or chat notifications
2. **Deploy 1**: Deployed `sendMatchNotification` and `sendChatNotification` functions (were coded but never deployed)
3. **Deploy 2**: Fixed `sendChatNotification` field name bug (`sender` vs `senderId`)
4. **Current State**: Neither chat nor video comment notifications being received

### What We Know (Facts)

#### Server Side ✅
- **Cloud Functions Working**: Logs show "1/1 succeeded" for video comments, "1/2 succeeded" then "1/1 succeeded" for chat
- **Functions Deployed**: All 4 notification functions active:
  - `sendMatchNotification` ✅
  - `sendChatNotification` ✅ (field name fixed)
  - `sendVideoCommentNotification` ✅
  - `registerAPNsToken` ✅
- **Messages Being Sent**: Firebase Admin SDK `messaging().sendEachForMulticast()` returns success
- **Token Validation**: Server accepts the FCM token and sends to it

#### Client Side Status
- **Build**: OLD production build from before today's session changes
- **Token**: User logged out/in and saw token refresh in Firestore (January 22, 2026 timestamp)
- **Testing**: Tried with app in both foreground and background
- **Logs**: None available (old build doesn't have new logging)

#### Firestore Data
- **User Document**: `D4bOhxg4f6MpGS1XTh504g7KfpK2`
- **FCM Tokens**: 1 token in array (was 2, cleaned up 1 invalid)
- **Token Age**: Last updated January 22, 2026 (23 days old, but user claims it's current)
- **Platform**: No platform tracking in old build

### What We've Ruled Out
- ❌ Missing cloud functions (deployed both missing functions)
- ❌ Field name mismatch in chat function (fixed `sender` vs `senderId`)
- ❌ Server-side errors (logs show success)
- ❌ Client-side code changes breaking it (testing on old build from before changes)

### What We Haven't Checked

#### iOS Device Configuration
- [ ] iOS notification settings for TravalPass app
  - Go to Settings → TravalPass → Notifications
  - Verify "Allow Notifications" is enabled
  - Verify alert style is set (not "None")
  - Verify sounds/badges/banners are enabled
- [ ] Device Do Not Disturb / Focus mode status
- [ ] Device notification history (swipe down from top to see notification center)

#### iOS/APNs Configuration
- [ ] APNs certificate validity (development vs production)
- [ ] APNs environment mismatch:
  - Development builds → APNs sandbox
  - TestFlight/App Store → APNs production
  - Token must match environment
- [ ] App Bundle ID matches certificate
- [ ] Check Apple Developer Portal for certificate expiration

#### Token Validity
- [ ] Token age (23 days old - FCM tokens can become stale)
- [ ] Token registered with correct APNs environment (sandbox vs production)
- [ ] Multiple devices logged into same account (token from different device?)
- [ ] Token invalidated by iOS (app uninstall/reinstall, iOS update, time passage)

#### Notification Payload
- [ ] Payload format accepted by iOS APNs:
  - Must have `aps` object with `alert`, `badge`, `sound`
  - Check cloud function payload structure
  - Compare working vs non-working notification payloads
- [ ] Channel ID compatibility (Android-specific, shouldn't affect iOS)
- [ ] Data payload size limits

#### App State
- [ ] App backgrounded correctly (not force-closed by user)
- [ ] iOS background app refresh enabled
- [ ] App has not been terminated by iOS
- [ ] Notification permissions still granted (can be revoked by user or iOS)

## Recommended Investigation Steps for Tomorrow

### Step 1: Verify iOS Device Settings
```
1. Open Settings app on iPhone
2. Scroll to TravalPass
3. Tap "Notifications"
4. Screenshot all settings
5. Verify:
   - Allow Notifications: ON
   - Alert Style: Banners or Alerts (not None)
   - Sounds: ON
   - Badges: ON
```

### Step 2: Test with Local Notification
Deploy a new build with test button to send local notification (proves notification display works):
```typescript
import * as Notifications from 'expo-notifications';

const testLocalNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test Notification",
      body: "If you see this, notification display is working",
    },
    trigger: null, // Immediate
  });
};
```

### Step 3: Check APNs Environment
The `registerAPNsToken` function tries sandbox first, then production. Check which one succeeded:
```typescript
// In cloud function logs, look for:
"🍎 APNs → FCM conversion succeeded (sandbox)"
// OR
"🍎 APNs → FCM conversion succeeded (production)"
```

If using TestFlight or App Store build, should be production. If development build, should be sandbox.

### Step 4: Force Token Refresh
Even though user logged out/in, the token may not have been fully refreshed. Try:
```typescript
// On device:
1. Delete app completely (long press → Remove App → Delete App)
2. Reinstall from TestFlight/App Store
3. Log in
4. Verify NEW token appears in Firestore
5. Test notification
```

### Step 5: Check Cloud Function Payload
Add detailed logging to see exact payload sent to iOS:
```typescript
// In sendChatNotification.ts (and similar):
console.log('📤 Sending notification payload:', JSON.stringify(message, null, 2));
const result = await admin.messaging().sendEachForMulticast(message);
console.log('📥 FCM response:', JSON.stringify(result, null, 2));
```

### Step 6: Verify Token Environment Match
Check Apple Developer Portal:
- Certificate type (development vs distribution)
- App ID configuration
- Certificate expiration date
- Compare with FCM token registration environment

### Step 7: Test with Different Notification Type
Since match notifications haven't been tested yet, try creating a new connection to see if match notifications work. This can help isolate whether:
- All notifications broken → device/token issue
- Only chat/video broken → payload format issue specific to those types

## Code Changes Made (Not Yet Deployed)

The following changes were made to the codebase but are NOT in the current production build being tested:

### voyager-RN (Mobile App)
- Added comprehensive logging throughout notification flow
- Added `lastTokenPlatform` and `lastTokenRegistered` fields to Firestore
- Added badge clearing on app foreground
- Created debug utilities: `debugNotifications.ts` and `forceNotificationReset.ts`
- Enhanced date parsing validation (unrelated to notifications)
- Fixed itinerary edit date loading (unrelated to notifications)

### voyager-pwa (Cloud Functions)
- Deployed `sendMatchNotification` (new)
- Deployed `sendChatNotification` with field name fix (sender vs senderId)
- No changes to `sendVideoCommentNotification` (was already working)

## Next Build Considerations

When deploying the next build (with logging), it will help diagnose:
- Token registration flow
- Permission request flow
- Notification received events (foreground)
- Notification tap events
- Platform and token tracking

**Current EAS Build Quota**: 2 free builds remaining this month

## Critical Questions to Answer

1. **When exactly did video comment notifications stop working?**
   - Was there an iOS update on the device?
   - Was there an app reinstall?
   - Was there a different user account logged in?

2. **What is the exact notification payload being sent?**
   - Does it match FCM v1 API format?
   - Does it have correct APNs-specific fields?

3. **Is the token actually from the current device?**
   - User claims yes, but Firestore shows January 22
   - Could there be token caching somewhere?

4. **Are other apps receiving notifications on this device?**
   - Tests if iOS notifications work at all
   - Tests if device is in silent mode or has restrictions

## Server-Side Notification Payload Format

Check that cloud functions are sending correct format for iOS:

```typescript
// Correct format for Firebase Admin SDK with iOS APNs:
const message = {
  tokens: [...],
  notification: {
    title: "...",
    body: "...",
  },
  data: {
    // Custom data
  },
  apns: {
    payload: {
      aps: {
        alert: {
          title: "...",
          body: "...",
        },
        badge: 1,
        sound: 'default',
        'content-available': 1, // For background handling
      },
    },
  },
  android: {
    channelId: 'chat-messages', // or 'matches', 'default'
    priority: 'high',
  },
};
```

## Hypothesis Priority

**Most Likely (Test First)**:
1. ⭐ iOS device notification settings disabled for app
2. ⭐ APNs certificate environment mismatch (sandbox vs production)
3. ⭐ Token is stale/invalid (despite FCM accepting it)
4. ⭐ iOS app state issue (backgrounded incorrectly)

**Medium Likelihood**:
5. Notification payload format incompatible with iOS
6. FCM returning success but APNs rejecting silently
7. iOS version-specific bug

**Low Likelihood**:
8. Cloud function logic error (logs show success)
9. Client-side code bug (same build that was working)
10. Firestore permissions issue (tokens being saved successfully)

## Status for Tomorrow

**Blocked Until**:
- User checks iOS device notification settings
- User tests with local notification to verify display works
- OR user deploys new build with logging (costs 1 EAS build)

**Not Blocked**:
- Can add more detailed logging to cloud functions to see exact payloads
- Can review notification payload format in cloud functions
- Can check Apple Developer Portal for certificate issues

**Recommendation**: Before using another EAS build, exhaust server-side investigation and iOS settings verification.

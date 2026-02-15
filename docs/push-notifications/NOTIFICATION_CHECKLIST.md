# Push Notification Quick Checklist

## Current Status (Feb 14, 2026)

### ✅ Server Side - Working
- [x] Cloud functions deployed and active
- [x] Logs show successful sends
- [x] Token validation passing
- [x] All 4 functions live: `sendMatchNotification`, `sendChatNotification`, `sendVideoCommentNotification`, `registerAPNsToken`

### ❌ Client Side - Not Receiving
- [ ] Chat notifications: Server sends 1/1 succeeded, device doesn't receive
- [ ] Video comment notifications: Server sends 1/1 succeeded, device doesn't receive  
- [ ] Match notifications: Not yet tested

### 🔄 Current Build
- **Production Build #14**: OLD build from before today's changes (no new logging)
- **Code Changes**: Made but not deployed (logging, debugging utilities)
- **EAS Builds Remaining**: 2 free builds this month

## Quick iOS Device Check (DO THIS FIRST)

**Before anything else, verify iOS settings:**

1. **Open Settings → TravalPass → Notifications**
   - [ ] "Allow Notifications" toggle is ON
   - [ ] Alert Style is "Banners" or "Alerts" (NOT "None")
   - [ ] Sounds toggle is ON
   - [ ] Badges toggle is ON
   - [ ] Lock Screen toggle is ON
   - [ ] Notification Center toggle is ON

2. **Check Focus Mode**
   - [ ] Swipe down from top right → verify not in Do Not Disturb
   - [ ] Not in any Focus mode that silences notifications

3. **Test Other Apps**
   - [ ] Send yourself a test notification from another app (Messages, Email, etc.)
   - [ ] Verify device CAN receive notifications in general

4. **Check Notification History**
   - [ ] Swipe down from top to see Notification Center
   - [ ] Look for any TravalPass notifications that may have arrived silently

## Quick Server-Side Check

1. **Check Cloud Function Logs** (You've done this):
   - [x] Shows "succeeded" messages
   - [x] No errors in logs
   
2. **Check Notification Payload** (Haven't done this yet):
   ```
   - [ ] Open Firebase Console → Functions → Logs
   - [ ] Find sendChatNotification or sendVideoCommentNotification execution
   - [ ] Look for actual payload structure sent to FCM
   - [ ] Verify it has iOS-compatible format with `apns` section
   ```

## Quick Token Check

**Firestore User Document**: `users/D4bOhxg4f6MpGS1XTh504g7KfpK2`

Current State:
- **FCM Tokens**: 1 token in array
- **Last Updated**: January 22, 2026 (23 days old)
- **Current Date**: February 14, 2026

Action Items:
- [ ] Verify token is actually from iOS device (not Android emulator)
- [ ] Consider token may be stale despite user logout/login
- [ ] Test complete app delete/reinstall to force new token

## If All Else Fails

### Option 1: Deploy New Build with Logging (Costs 1 EAS Build)
This will let you see:
- Notification registration flow
- Permission request results
- Whether notifications arrive but aren't displayed
- Platform and token information

### Option 2: Add Diagnostic Cloud Function
Create simple test function that sends notification on demand:
```typescript
export const sendTestNotification = onCall(async (request) => {
  const userId = request.auth?.uid;
  const tokens = await getTokensForUser(userId);
  
  const message = {
    tokens,
    notification: {
      title: 'Test Notification',
      body: 'Testing push notifications',
    },
  };
  
  const result = await admin.messaging().sendEachForMulticast(message);
  return { success: true, result };
});
```

Call from app or curl to test on-demand.

## Most Likely Issues (Priority Order)

1. **iOS Device Settings Disabled** (CHECK THIS FIRST)
   - Easiest to verify
   - Most common cause of "notifications not working"
   - Takes 30 seconds to check

2. **APNs Certificate Environment Mismatch**
   - Development certificate but production token (or vice versa)
   - Check Apple Developer Portal
   - Verify which environment `registerAPNsToken` function used

3. **Stale/Invalid Token**
   - 23-day-old token may be invalidated by iOS
   - Complete app reinstall would force fresh token
   - FCM accepts token but iOS APNs rejects it

4. **App State Issue**
   - App not properly backgrounded (force-closed by user)
   - iOS terminated app due to memory/battery
   - Background app refresh disabled

## What Changed vs What Didn't Change

### ✅ Did Change (During This Session)
- `sendMatchNotification` deployed (was never deployed before)
- `sendChatNotification` deployed with field name fix
- Cloud function logs now show notification sends

### ❌ Did NOT Change (Client Still on Old Build)
- Notification registration code
- Notification listeners/handlers
- App.tsx notification handler setup
- Token save/cleanup logic
- iOS configuration/entitlements

**Conclusion**: Client-side code couldn't have broken it because testing on old build. Issue is either server payload format or iOS device/token configuration.

## Action Plan for Morning

1. **First 5 minutes**: Check iOS device notification settings (do this before anything else)
2. **If settings OK**: Review cloud function notification payload format
3. **If payload OK**: Test complete app reinstall for fresh token
4. **If still broken**: Deploy new build with logging (use 1 EAS build)
5. **If still broken**: Check Apple Developer Portal for APNs certificate issues

## Resources

- Main debugging doc: `NOTIFICATION_DEBUGGING_FEB_14_2026.md`
- Device setup: `DEVICE_TESTING_SETUP.md`
- FCM setup: `FCM_NATIVE_SETUP.md`
- Code changes: `git diff` (not yet deployed)

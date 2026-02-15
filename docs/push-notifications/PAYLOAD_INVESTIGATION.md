# Cloud Function Payload Investigation

## Video Comment Notification Payload (Current)

**File**: `functions/src/notifications/sendVideoCommentNotification.ts`

### Payload Structure (Lines 112-147)
```typescript
const payload: MulticastMessage = {
  tokens,
  notification: {
    title: notifTitle,              // e.g., "{Name} commented"
    body: notifBody,                // e.g., 'On "{video}": {text}'
  },
  data: {
    type: 'video_comment',
    videoId,
    commenterId: comment.userId,
    commenterName,
    commentId: comment.id,
    screen: 'Videos',
  },
  android: {
    notification: {
      channelId: 'default',
      sound: 'default',
      priority: 'high',
    },
  },
  apns: {
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
        alert: {
          title: notifTitle,
          body: notifBody,
        },
      },
    },
  },
};
```

### Analysis

**✅ Correct APNs Format**:
- Has `apns.payload.aps` structure
- Has `alert` with `title` and `body`
- Has `sound` (required for iOS)
- Has `badge` count

**✅ Works with Firebase Admin SDK**:
- Using `sendEachForMulticast()` which supports FCM tokens for iOS
- Logs show "succeeded" responses

**❓ Potential Issues**:
1. **Badge number hardcoded to 1**: Should ideally increment based on existing notifications
2. **No `content-available` flag**: Required for background data delivery (but not for foreground notifications)
3. **No `mutable-content` flag**: Required for notification service extensions (not used in this app)
4. **Android channel 'default'**: Should potentially use specific channel for better organization

## Chat Notification Payload (Current)

**File**: `functions/src/notifications/sendChatNotification.ts`

### Need to Check
- [ ] Has same APNs structure?
- [ ] Has same `aps.alert` format?
- [ ] Channel ID correct?
- [ ] Sound configured?

## Match Notification Payload (Current)

**File**: `functions/src/notifications/sendMatchNotification.ts`

### Need to Check
- [ ] Has APNs configuration?
- [ ] Similar structure to video comment?
- [ ] Channel ID for matches?

## Investigation Steps

### 1. Check Actual Payload in Logs
When notification is sent, the cloud function logs should show:
```
✅ sendVideoCommentNotification: Sent to video owner D4bOhxg4f6MpGS1XTh504g7KfpK2: 1/1 succeeded
```

But we need to see the ACTUAL payload structure:

**Add to cloud function (before sending)**:
```typescript
console.log('📤 Full notification payload:', JSON.stringify(payload, null, 2));
const response = await admin.messaging().sendEachForMulticast(payload);
console.log('📥 FCM response:', JSON.stringify({
  successCount: response.successCount,
  failureCount: response.failureCount,
  responses: response.responses.map((r, i) => ({
    index: i,
    success: r.success,
    messageId: r.messageId,
    error: r.error ? {
      code: r.error.code,
      message: r.error.message,
    } : null,
  }))
}, null, 2));
```

### 2. Check FCM Token Format
The token saved in Firestore should be:
- **iOS**: FCM registration token (converted from APNs via `registerAPNsToken` function)
- **Android**: Native FCM token

**Verify in Firestore**:
```
users/D4bOhxg4f6MpGS1XTh504g7KfpK2
└─ fcmTokens: [
     "elt8laXPlus:APA91bHkTsFKkWy9Q-W6ENjP7oFhjNbFD1sn9G_7SY-GvFJI3iMw16VjkOkG7ZkLlogO84RWcFJl-4sqiObtbtiVSvVxmczBEQNsuO9CJrjgR_ZijVCHmmk"
   ]
```

**Token Anatomy**:
- Starts with random characters
- Contains `:APA91b` separator (FCM format)
- Long alphanumeric string

**Check**: Does token have correct FCM format with `:APA91b` separator?

### 3. Check APNs Certificate Configuration

**Apple Developer Portal** (https://developer.apple.com):
1. Go to Certificates, Identifiers & Profiles
2. Click on Identifiers → Select app Bundle ID
3. Verify Push Notifications capability is enabled
4. Go to Certificates → Check for APNs certificates
5. Verify certificate is not expired
6. Check certificate type:
   - **Apple Push Notification service SSL (Sandbox)** → Development
   - **Apple Push Notification service SSL (Sandbox & Production)** → Both
   - **APNs Certificate (Production)** → Production only

**Match Certificate to Build Type**:
- Development build → Needs sandbox certificate
- TestFlight → Needs production certificate
- App Store → Needs production certificate

### 4. Test APNs Connection

**Using `registerAPNsToken` Function**:
The function tries sandbox first, then production:

```typescript
// Try sandbox first (covers dev builds + TestFlight)
const result = await registerFn({ apnsToken, sandbox: true });
// Fall back to production (App Store builds)
const result = await registerFn({ apnsToken, sandbox: false });
```

**Check logs** for which environment succeeded:
```
🍎 APNs → FCM conversion succeeded (sandbox)
// OR
🍎 APNs → FCM conversion succeeded (production)
```

**If mismatch**:
- Production certificate but using sandbox → Notifications fail
- Sandbox certificate but using production → Notifications fail

## Comparison with Working PWA Notifications

The PWA uses Firebase Cloud Messaging Web API, which:
- Uses web push protocol
- Doesn't go through APNs
- Has different payload format
- Uses service workers

**This RN app uses**:
- Native iOS push (APNs)
- Firebase Admin SDK
- FCM tokens (converted from APNs)
- Native notification display

**Key Difference**: PWA web push vs Native APNs push - completely different delivery mechanisms.

## Next Steps

1. **Add detailed payload logging** to cloud functions (can be done without new build)
2. **Check iOS device notification settings** (user can do immediately)
3. **Verify APNs certificate** in Apple Developer Portal
4. **Test with local notification** (requires new build)
5. **Check FCM token format** in Firestore (already have this)

## Questions for Apple Developer Portal

- [ ] What type of APNs certificate is registered?
- [ ] Is certificate expired or revoked?
- [ ] Does Bundle ID match app (com.mundo.travalpass)?
- [ ] Is Push Notifications capability enabled for this Bundle ID?
- [ ] Are there multiple certificates (could cause confusion)?

## Questions for iOS Device

- [ ] iOS version?
- [ ] Device model?
- [ ] When was last iOS update?
- [ ] Has app been reinstalled recently?
- [ ] Are notification permissions still granted? (Settings → TravalPass → Notifications)
- [ ] Is "Allow Notifications" toggle ON?
- [ ] Is alert style set to "Banners" or "Alerts"?

## Hypothesis

**Most likely**: iOS device notification settings disabled or APNs certificate environment mismatch.

**Why**: 
- Server successfully sends notification (FCM accepts token)
- But device never receives it (iOS APNs silence reject)
- This pattern indicates delivery to FCM works but FCM→APNs fails
- Common causes: iOS settings, certificate configuration, stale token

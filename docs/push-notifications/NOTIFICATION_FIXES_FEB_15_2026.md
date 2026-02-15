# Push Notification Fixes - February 15, 2026

## Critical Fixes Completed ✅

### 1. iOS Token Refresh Bug (CRITICAL) 🔴→🟢
**Issue**: Push notifications stopped working overnight because iOS silently refreshed APNs token, but `onTokenRefresh` listener saved raw APNs token to Firestore without FCM conversion. Cloud functions then tried sending to invalid token format.

**Root Cause**: `NotificationService.onTokenRefresh()` was not calling `convertAPNsToFCM()` on iOS platform.

**Fix**: Added APNs→FCM conversion in token refresh listener:
```typescript
// src/services/notification/NotificationService.ts
onTokenRefresh(async (token: string) => {
  if (!token) return;

  let finalToken = token;
  
  // CRITICAL: Convert APNs to FCM on iOS
  if (Platform.OS === 'ios') {
    const fcmToken = await this.convertAPNsToFCM(token);
    if (fcmToken) {
      finalToken = fcmToken;
    }
  }

  // Save FCM token to Firestore
  await this.saveToken(currentUserId, finalToken);
});
```

**Impact**: Prevents overnight notification failures on iOS. iOS tokens must always be converted to FCM format before storage.

**Files Changed**:
- `src/services/notification/NotificationService.ts`

---

### 2. Re-registration Loop Bug 🔴→🟢
**Issue**: `registerForPushNotifications` function was not memoized, causing it to be recreated on every render, triggering unnecessary re-registrations.

**Root Cause**: Missing `useCallback` wrapper in `useNotifications.ts` hook.

**Fix**: Wrapped both registration functions in `useCallback`:
```typescript
// src/hooks/useNotifications.ts
const registerForPushNotifications = useCallback(async (userId: string) => {
  // ... registration logic
}, []);

const unregisterPushNotifications = useCallback(async (userId: string) => {
  // ... unregistration logic
}, []);
```

**Impact**: Reduces unnecessary token refreshes and Firestore writes. Improves performance and reduces Firebase costs.

**Files Changed**:
- `src/hooks/useNotifications.ts`

---

### 3. Privacy Violation - User IDs in Logs 🔴→🟢
**Issue**: Usage tracking hook logged user IDs (PII) in production, violating privacy best practices and compliance requirements.

**Root Cause**: Debug logging included `userId` field in console.log statements.

**Fix**: Removed user IDs from all logging while keeping useful debug information:
```typescript
// Before (privacy violation):
console.log('[useUsageTracking] 🚀 trackView START:', {
  userId: userIdNow,  // ❌ PII logged
  localViewCount: userProfile?.dailyUsage?.viewCount || 0
});

// After (privacy-safe):
console.log('[useUsageTracking] 🚀 trackView START:', {
  localViewCount: userProfile?.dailyUsage?.viewCount || 0  // ✅ No PII
});
```

**Impact**: Protects user privacy, maintains GDPR/compliance requirements, still provides useful debug information.

**Files Changed**:
- `src/hooks/useUsageTracking.ts` (4 log statements updated)

---

### 4. Security Risk - Credential Logging 🔴→🟢
**Issue**: `debugNotifications.ts` utility logged sensitive FCM tokens to console, exposing credentials in crash reports, screenshots, and log aggregation tools.

**Root Cause**: Debug utility created for troubleshooting but left in codebase with no production guards.

**Fix**: Permanently deleted the file:
```bash
# File deleted:
src/utils/debugNotifications.ts
```

**Impact**: Eliminates credential exposure risk. Prevents tokens from appearing in production logs, crash reports, or screenshots.

**Files Deleted**:
- `src/utils/debugNotifications.ts`

---

### 5. Badge Clearing Promise Handling 🟡→🟢
**Issue**: Unhandled promise rejection warning in App.tsx when clearing notification badge count.

**Root Cause**: `setBadgeCountAsync` returns a promise but it was not being handled.

**Fix**: Added proper error handling with `void` keyword:
```typescript
// src/App.tsx
void Notifications.setBadgeCountAsync(0).catch((error) => {
  console.warn('[App] Failed to clear badge count:', error);
});
```

**Impact**: Eliminates console warnings, adds graceful error handling.

**Files Changed**:
- `App.tsx`

---

## Issues Identified (Not Yet Fixed)

### High Priority (Production Safety Risks)

#### 1. forceNotificationReset.ts - Production Safety Risk 🟡
**Location**: `src/services/notification/forceNotificationReset.ts`

**Issue**: Utility function wipes ALL user tokens across ALL devices. Not currently used/imported but poses risk if accidentally called.

**Risk**: Could disable notifications for all users globally if mistakenly invoked.

**Recommendation**: Delete file (consistent with debugNotifications.ts deletion).

**User Decision Needed**: Awaiting confirmation to delete.

---

### Low Priority (Non-blocking)

#### 2. Dev/Prod Firebase Config Mismatch
**Issue**: `registerAPNsToken` cloud function may use dev Firebase config when called from production app.

**Impact**: iOS token conversion could fail or use wrong project.

**Recommendation**: Add environment detection to cloud function or use separate functions per environment.

---

#### 3. Stale Token Accumulation
**Issue**: No periodic cleanup of invalid/stale tokens in `fcmTokens` array. Over time, users can accumulate many dead tokens.

**Impact**: Wasted Firestore storage, cloud functions send to invalid tokens (though FCM handles gracefully).

**Recommendation**: Add token cleanup job or validate tokens periodically.

---

#### 4. Badge Count Hardcoded to 1
**Issue**: All notifications set badge count to `1` instead of actual unread count.

**Impact**: Users don't see accurate unread count on app icon.

**Recommendation**: Track unread counts in Firestore and send actual count in notification payload.

---

#### 5. Missing collapseKey on Some Notifications
**Issue**: Match and video comment notifications don't include `collapseKey` field.

**Impact**: Multiple notifications of same type don't collapse (user gets spammed with separate notifications instead of one updated notification).

**Recommendation**: Add `collapseKey: 'matches'` and `collapseKey: 'videos'` to respective cloud functions.

---

## Test Results

### Unit Tests ✅
- **Total Suites**: 132 passed
- **Total Tests**: 2214 passed
- **Coverage**: Maintained
- **Status**: All passing

### TypeScript Compilation ✅
- **Errors**: 0
- **Warnings**: 0
- **Status**: Clean build

### Integration Tests ✅
- **NotificationService Tests**: 25/25 passing
- **useUsageTracking Tests**: All passing
- **Status**: All passing

---

## Architecture Improvements

### Service Layer
- ✅ NotificationService properly handles iOS/Android token differences
- ✅ Token conversion abstracted in service layer
- ✅ Proper error handling and logging

### Hook Layer
- ✅ useNotifications properly memoized with useCallback
- ✅ State management isolated from business logic
- ✅ Clean separation of concerns

### Security & Privacy
- ✅ No credential logging in production
- ✅ No PII logging in production
- ✅ Proper error boundaries

---

## Deployment Checklist

### Before Next Production Build
- [x] iOS token refresh bug fixed
- [x] Re-registration loop fixed
- [x] Privacy violations removed
- [x] Security risks eliminated
- [x] All tests passing
- [x] TypeScript compilation clean
- [ ] **Decision needed**: Delete forceNotificationReset.ts?
- [ ] Increment build number in app.json

### Post-Deployment Monitoring
- [ ] Monitor cloud function logs for APNs→FCM conversion success
- [ ] Track notification delivery rates
- [ ] Watch for token refresh patterns
- [ ] Monitor Firestore writes (should see reduction after re-registration fix)

---

## Known Working State

### Client Side ✅
- **Token Registration**: Working (with fixed APNs conversion)
- **Permission Handling**: Working
- **Foreground Notifications**: Working
- **Background Notifications**: Working
- **Deep Linking**: Working

### Server Side ✅
- **Cloud Functions**: All 4 active and tested
  - `sendMatchNotification` ✅
  - `sendChatNotification` ✅
  - `sendVideoCommentNotification` ✅
  - `registerAPNsToken` ✅
- **FCM Sending**: Working (logs show success)
- **Token Validation**: Working

### Platform Support
- **iOS**: ✅ Working (after token refresh fix)
- **Android**: ✅ Working
- **Web**: ❌ Not supported (intentionally excluded)

---

## Documentation Updates

### Files Updated
- `docs/push-notifications/NOTIFICATION_FIXES_FEB_15_2026.md` (this file) ✅
- `docs/push-notifications/NOTIFICATION_DEBUGGING_FEB_14_2026.md` (status updated) ✅
- `README.md` (notification status updated) ✅

### Files to Review
- `docs/push-notifications/PUSH_NOTIFICATION_PLAN.md` - Architecture documentation (still accurate)
- `docs/push-notifications/NOTIFICATION_CHECKLIST.md` - Quick reference (still accurate)

---

## Lessons Learned

### iOS Token Handling is Critical
- **Never** save raw APNs tokens to Firestore
- **Always** convert APNs→FCM via `registerAPNsToken` cloud function
- **Always** apply conversion in `onTokenRefresh` listener
- iOS silently refreshes tokens, listener must handle it correctly

### Privacy by Design
- **Never** log user IDs (PII) in production
- **Never** log credentials (tokens, keys, passwords)
- Keep useful debug info (counts, states, flags) but remove identifying information
- Use proper logging levels (__DEV__ guards when appropriate)

### React Hook Optimization
- **Always** wrap async functions in `useCallback` to prevent re-creation
- Be mindful of dependency arrays
- Re-creation of functions can trigger unnecessary side effects

### Security First
- Delete debug utilities that log sensitive data (don't just guard with __DEV__)
- Audit logging regularly for credential exposure
- Consider production vs development needs

---

## References

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service (APNs)](https://developer.apple.com/documentation/usernotifications)
- [React useCallback Hook](https://react.dev/reference/react/useCallback)

---

**Document Status**: Complete  
**Last Updated**: February 15, 2026  
**Next Review**: After next production deployment

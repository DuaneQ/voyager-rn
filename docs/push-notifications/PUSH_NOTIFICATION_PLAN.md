# Push Notification Implementation Plan — TravalPass (iOS & Android)

> **Created**: June 2025  
> **Updated**: February 13, 2026 (Simplified Architecture)  
> **Status**: Planning  
> **Platforms**: iOS (APNs), Android (FCM), Web (FCM — future)  
> **Framework**: React Native Expo (SDK 54)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Prerequisites & Setup](#2-prerequisites--setup)
3. [Current State Assessment](#3-current-state-assessment)
4. [Architecture Design](#4-architecture-design)
5. [Notification Types & Triggers](#5-notification-types--triggers)
6. [Implementation Phases](#6-implementation-phases)
7. [Platform-Specific Requirements](#7-platform-specific-requirements)
8. [Cost Analysis](#8-cost-analysis)
9. [Testing Strategy](#9-testing-strategy)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Time Estimate Summary](#11-time-estimate-summary)

---

## 1. Executive Summary

### Goal

Implement push notifications across iOS and Android to notify users of:

- **New matches** — when two travelers have a mutual itinerary like
- **New chat messages** — when a message arrives in a connection chat
- **Vidoe  comment** — distinct notification for comments on videos.
### Approach (SIMPLIFIED for MVP)

- **Client**: `expo-notifications` library for token registration, permission handling, foreground/background notification handling, and deep linking
- **Server**: Firebase Cloud Functions with Firestore `onCreate` triggers to send FCM messages server-side (never client-initiated pushes)
- **Token Storage**: FCM tokens stored as **array field on user document** (`users/{uid}.fcmTokens: string[]`) — simpler than subcollection
- **Architecture**: Simplified single `NotificationService` class (combines business logic + Firestore operations), `useNotifications` hook (state management)
- **MVP Scope**: All notifications enabled by default, settings UI deferred to post-launch

### Key Constraints

All notification sending happens **server-side** via Cloud Functions. The client only:
1. Requests permission
2. Registers/refreshes the push token (saves to Firestore)
3. Handles incoming notifications (foreground display, tap navigation)

### Architectural Simplifications vs. Original Plan

| Original Design | Simplified Design (MVP) | Reasoning |
|---|---|---|
| `fcmTokens` subcollection | `fcmTokens: string[]` array field | Saves 1 Firestore read per notification, simpler queries |
| Separate `NotificationRepository` | Combined into `NotificationService` | Less boilerplate for small app scope |
| User notification preferences | All notifications on by default | Settings UI adds ~15-20 hours, defer to v2 |

**Impact**: ~20 hours saved, maintains clean architecture, easy to extend later.

---

## 2. Prerequisites & Setup

### 2.1 Firestore Preparation

**Before starting implementation, you must:**

#### Update Firestore User Document Schema

Add `fcmTokens` field to store push tokens:

```typescript
// Firestore: users/{userId}
interface UserDocument {
  // ... existing fields ...
  email: string;
  username: string;
  emailHash?: string;
  phoneHash?: string;
  
  // ⭐ NEW: Push notification tokens
  fcmTokens?: string[];  // Array of Expo push tokens or FCM tokens
  
  // Optional: Will add in Phase 4 (post-MVP)
  notificationPreferences?: {
    notificationsEnabled: boolean;
    newMatchNotifications: boolean;
    chatMessageNotifications: boolean;
  };
}
```

**Action Required**: No migration needed! Field will be added automatically when users grant notification permission. Existing users without the field will still work (Cloud Functions will handle missing field gracefully).

#### Update Firestore Security Rules

Add rules to allow users to read/write their own push tokens:

**File**: `dev.firestore.rules` and `prod.firestore.rules`

```javascript
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  
  // ⭐ Explicitly allow fcmTokens array updates (already covered by above rule, but explicit is clearer)
  allow update: if request.auth.uid == userId 
                && request.resource.data.keys().hasOnly(['fcmTokens', 'notificationPreferences']);
}
```

**Note**: Your existing rules already allow authenticated users to update their own user document, so **no rule changes needed** unless you want to be more restrictive. The above just shows where push tokens fit.

#### Create Firestore Indexes (if needed)

Push notifications don't require new indexes! Queries are simple:
- Cloud Functions read `users/{userId}.fcmTokens` directly (no query needed)
- No complex sorting or filtering

**Action Required**: ✅ None — no new indexes needed.

---

### 2.2 Apple Developer Console Setup

#### Generate APNs Authentication Key

1. **Login to Apple Developer Console**: https://developer.apple.com/account
2. Navigate to **Certificates, Identifiers & Profiles**
3. Go to **Keys** → Click **+** (Create a key)
4. Name it: `TravalPass Push Notifications`
5. Enable **Apple Push Notifications service (APNs)**
6. Click **Continue** → **Register**
7. **Download the `.p8` file** (you can only download once!)
8. Note the **Key ID** (e.g., `AB1C2D3E4F`)
9. Note your **Team ID** (top-right of page, e.g., `9ABCDEFGHI`)

**Important**: Store the `.p8` file securely — you cannot download it again. If lost, you must create a new key.

####Upload to Firebase Console

1. Open **Firebase Console** → Your project → **Project Settings** (gear icon)
2. Go to **Cloud Messaging** tab
3. Scroll to **Apple app configuration**
4. Click **Upload** under APNs Authentication Key
5. Upload the `.p8` file
6. Enter **Key ID** and **Team ID** from above
7. Click **Upload**

**Verification**: Firebase will show "APNs authentication key configured" with a green checkmark.

#### Update App Identifier in Apple Developer Console

1. Navigate to **Identifiers** → Select `com.travalpass.app`
2. Ensure **Push Notifications** capability is **enabled** (checkmark should be visible)
3. If not enabled:
   - Check the box next to **Push Notifications**
   - Click **Save**
   - You may need to regenerate provisioning profiles (EAS will handle this automatically)

**Note**: Expo automatically adds the push notification entitlement when you add the `expo-notifications` plugin. No manual entitlement editing needed.

---

### 2.3 Google Play Console Setup

**Good news: No Google Play Console configuration needed!**

Firebase Cloud Messaging (FCM) is configured via:
- ✅ `google-services.json` (already in your project)
- ✅ `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` (already set in env)

Android push notifications will work immediately after:
1. Installing `expo-notifications`
2. Building with EAS (includes FCM automatically)

**App Store Requirements**: None for Android push notifications. Google Play does not require special approval for notifications (unlike iOS which requires justification in App Store Review).

---

### 2.4 EAS Build Configuration

#### Ensure Push Notification Credentials

When running your first EAS build after adding `expo-notifications`:

```bash
eas build --platform ios --profile development
```

EAS will automatically:
1. Detect the `expo-notifications` plugin
2. Prompt you to configure push notifications
3. Use the APNs key from Firebase (if uploaded) or prompt you to upload it

**Action Required**: Just run `eas build` — EAS handles all credential management via interactive prompts.

#### Verify `eas.json` Configuration

Your existing `eas.json` should work without changes:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

Push notifications work on all build types (development, preview, production).

---

### 2.5 Pre-Implementation Checklist

Before writing any code, verify:

- [x] **Apple APNs key uploaded to Firebase** ✅ Uploaded to both dev and prod (Key ID: RHH9M95YC5, Team ID: 77WCFLF5AV)
- [x] **Push Notifications enabled** ✅ Enabled for `com.travalpass.app` in Apple Developer Console
- [x] **`google-services.json`** ✅ Present in project root (Android)
- [x] **`GoogleService-Info.plist`** ✅ Present in project root (iOS)
- [x] **`EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`** ✅ Set in `.env` for dev and prod
- [x] **EAS project configured** ✅ Project ID: 6fc90234-4d23-427c-918f-75d141efe8ed
- [ ] **Physical test devices available** (push tokens don't work on simulators)

---

## 3. Current State Assessment

### ✅ Already In Place

| Component | Status | Details |
|---|---|---|
| Firebase project config | ✅ Ready | `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) configured in `app.json` |
| Messaging Sender ID | ✅ Ready | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` set for dev (`296095212837`) and prod (`533074391000`) |
| **APNs Authentication Key** | ✅ Ready | Uploaded to Firebase Console for both dev and prod (Key ID: RHH9M95YC5, Team ID: 77WCFLF5AV) |
| Push Notifications capability | ✅ Ready | Enabled for `com.travalpass.app` in Apple Developer Console |
| Firestore security rules | ✅ Ready | `fcmTokens/{tokenId}` collection with `allow read, write: if request.auth != null` in both dev and prod rules |
| Legal/privacy coverage | ✅ Ready | Privacy Policy and Cookie Policy already reference Firebase Cloud Messaging and push notification tokens |
| Unread count tracking | ✅ Ready | `unreadCounts` map on connection documents — incremented on send, reset on read |
| Real-time chat listeners | ✅ Ready | `onSnapshot` listeners on messages subcollection for real-time delivery |
| Deep link scheme | ✅ Ready | `travalpass://` scheme configured in `app.json` |
| EAS project ID | ✅ Ready | `6fc90234-4d23-427c-918f-75d141efe8ed` |

### ✅ Phase 1 Complete (Client Foundation)

| Component | Status | Implementation |
|---|---|---|
| `expo-notifications` package | ✅ Complete | v0.29.16 installed |
| `expo-device` package | ✅ Complete | v7.0.4 installed |
| Notification service | ✅ Complete | `src/services/notification/NotificationService.ts` (simplified — combines service + data access) |
| Notification hook | ✅ Complete | `src/hooks/useNotifications.ts` for state management |
| `app.json` notification config | ✅ Complete | expo-notifications plugin, Android permissions (RECEIVE_BOOT_COMPLETED, VIBRATE), notification icon/color |
| NotificationInitializer | ✅ Complete | `src/components/common/NotificationInitializer.tsx` auto-registers on sign-in |
| Token cleanup on sign-out | ✅ Complete | Integrated into `AuthContext.tsx` sign-out handler |
| Android notification channels | ✅ Complete | chat-messages and matches channels created |
| Unit tests | ✅ Complete | 24 passing tests for service and hook |
| Mocks | ✅ Complete | `__mocks__/expo-notifications.ts` and `__mocks__/expo-device.ts` |

### 🔴 Not Yet Implemented (Phase 2-4)

| Component | Status | What's Needed |
|---|---|---|
| Cloud Functions (send) | 🔴 Missing | Firestore triggers to send FCM messages (Phase 2) |
| Deep linking & navigation | 🔴 Missing | Handle notification taps and navigate to correct screen (Phase 3) |
| Production testing | 🔴 Missing | End-to-end QA with real devices (Phase 4) |

### 🟡 Deferred to Post-MVP

| Component | Why Deferred | Add When |
|---|---|---|
| Notification preferences UI | Adds ~15-20 hours, all notifications useful | After user feedback requests granular control |
| Separate `NotificationRepository` | Over-engineering for current app size | When notification logic exceeds 300 lines |
| Notification batching/collapsing | Optimization for high volume | When hitting 10K+ DAU |

---

## 4. Architecture Design (Simplified)

### Simplified Layer Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    UI / Components                         │
│  ┌────────────────┐                                       │
│  │ Notification    │  (Settings UI deferred to post-MVP)  │
│  │ Permission      │                                       │
│  │ Prompt          │                                       │
│  └───────┬────────┘                                       │
├──────────┼────────────────────────────────────────────────┤
│          │     Hooks Layer                                │
│  ┌───────▼────────────────────────┐                      │
│  │      useNotifications()        │                      │
│  │  - permission state            │                      │
│  │  - token registration          │                      │
│  │  - foreground handler          │                      │
│  │  - notification tap handler    │                      │
│  └───────┬────────────────────────┘                      │
├──────────┼────────────────────────────────────────────────┤
│          │     Service Layer (COMBINED)                   │
│  ┌───────▼────────────────────────────┐                  │
│  │    NotificationService             │                  │
│  │  ✅ Business Logic + Data Access    │                  │
│  │  - requestPermission()             │                  │
│  │  - getExpoPushToken()              │                  │
│  │  - saveToken(userId, token)        │                  │
│  │  - removeToken(userId, token)      │                  │
│  │  - createNotificationChannels()    │                  │
│  │  - handleNotificationTap()         │                  │
│  │  - setBadgeCount()                 │                  │
│  └───────┬────────────────────────────┘                  │
├──────────┼────────────────────────────────────────────────┤
│          │     Firebase / External                        │
│  ┌───────▼────────────────────────┐                      │
│  │  Firestore: users/{uid}        │                      │
│  │    .fcmTokens: string[]        │  ← Array field       │
│  │  Cloud Functions: onNewMessage │                      │
│  │  FCM / APNs                    │                      │
│  └────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────┘
```

**Key Simplifications:**
- ✅ Combined service + repository → fewer files, less boilerplate
- ✅ Tokens stored as simple array field → 1 less Firestore read per notification
- ✅ No preferences UI in MVP → saves ~15-20 hours

### Token Storage Model (Simplified)

```typescript
// Firestore: users/{userId} document
interface UserDocument {
  // ... existing fields ...
  email: string;
  username: string;
  emailHash?: string;
  
  // ⭐ NEW: Push tokens stored as simple array
  fcmTokens?: string[];  
  // Example: ["ExponentPushToken[abc123]", "ExponentPushToken[def456]"]
  // One token per device the user has logged into
  
  // Deferred to post-MVP:
  // notificationPreferences?: {
  //   notificationsEnabled: boolean;
  //   newMatchNotifications: boolean;
  //   chatMessageNotifications: boolean;
  // };
}
```

**Why Array Field?**
- Simpler: No subcollection queries needed
- Faster: Cloud Functions read array directly (1 Firestore read instead of 2-3)
- Sufficient: Users rarely have >5 devices, array handles this easily
- Scalable: Firestore documents support up to 1MB; ~20-30 tokens = ~5KB

**Token Lifecycle:**
- **Add**: User grants permission → token added to array
- **Update**: Token refreshes → old removed, new added  
- **Remove**: User signs out → tokens cleaned up
- **Cleanup**: Invalid tokens auto-removed when FCM send fails

---

## 5. Notification Types & Triggers

### Notification Payload Schema (Simplified)

```typescript
interface NotificationPayload {
  title: string;
  body: string;
  data: {
    type: 'new_match' | 'new_message' | 'image_message';
    connectionId?: string;
    senderId?: string;
    senderName?: string;
    screen?: string;       // Deep link target screen
  };
  badge?: number;          // iOS badge count
  sound?: string;          // 'default' or custom sound
  channelId?: string;      // Android notification channel
}
```

### 5.1 New Match Notification

| Property | Value |
|---|---|
| **Trigger** | Cloud Function `onCreate` on `connections` collection |
| **Recipients** | Both users in the new connection |
| **Title** | "New Match! 🎉" |
| **Body** | "You matched with {otherUserName} — {destination}, {dates}" |
| **Deep Link** | Navigate to `ChatScreen` with `connectionId` |
| **Priority** | High |
| **Sound** | Default |

**Cloud Function Logic (Simplified):**
1. Read the newly created connection document
2. Extract both user IDs from `users` array
3. Extract itinerary details (destination, dates) from `itineraries` array
4. For each user, read `users/{userId}.fcmTokens` array (1 Firestore read per user)
5. Send personalized notification to each user (showing the *other* user's name)
6. MVP: Always send (no preferences check) — users can disable system-level

### 5.2 New Chat Message Notification

| Property | Value |
|---|---|
| **Trigger** | Cloud Function `onCreate` on `connections/{connId}/messages/{msgId}` |
| **Recipients** | All users in the connection *except* the sender |
| **Title** | "{senderName}" |
| **Body** | Message text (truncated to 100 chars) |
| **Deep Link** | Navigate to `ChatScreen` with `connectionId` |
| **Priority** | High |
| **Sound** | Default |
| **Collapse Key** | `chat_{connectionId}` (group notifications from same chat) |

**Cloud Function Logic (Simplified):**
1. Read the new message document
2. Read the parent connection to get all user IDs
3. Filter out the sender
4. For each recipient, read `users/{userId}.fcmTokens` array
5. Send notification with sender name and message preview
6. MVP: Always send (no preferences check)

### 5.3 Image Message Notification

| Property | Value |
|---|---|
| **Trigger** | Same as chat message (`onCreate` on messages) |
| **Title** | "{senderName}" |
| **Body** | "📷 Sent a photo" |
| **Deep Link** | Navigate to `ChatScreen` with `connectionId` |
| **Priority** | High |
| **Collapse Key** | `chat_{connectionId}` |

---

## 3. Architecture Design

### Layer Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    UI / Components                         │
│  ┌────────────────┐  ┌────────────────┐                  │
│  │ Notification    │  │ Settings /     │                  │
│  │ Permission      │  │ Preferences    │                  │
│  │ Prompt          │  │ Screen         │                  │
│  └───────┬────────┘  └───────┬────────┘                  │
├──────────┼───────────────────┼────────────────────────────┤
│          │     Hooks Layer   │                            │
│  ┌───────▼───────────────────▼────────┐                  │
│  │      useNotifications()            │                  │
│  │  - permission state                │                  │
│  │  - token management                │                  │
│  │  - foreground handler              │                  │
│  │  - notification tap handler        │                  │
│  └───────┬────────────────────────────┘                  │
├──────────┼────────────────────────────────────────────────┤
│          │     Service Layer                              │
│  ┌───────▼────────────────────────────┐                  │
│  │    NotificationService             │                  │
│  │  - requestPermission()             │                  │
│  │  - getExpoPushToken()              │                  │
│  │  - registerForPushNotifications()  │                  │
│  │  - handleNotificationTap()         │                  │
│  │  - setBadgeCount()                 │                  │
│  └───────┬────────────────────────────┘                  │
├──────────┼────────────────────────────────────────────────┤
│          │     Repository Layer                           │
│  ┌───────▼────────────────────────────┐                  │
│  │  NotificationRepository            │                  │
│  │  - saveToken(userId, token)        │                  │
│  │  - removeToken(userId, token)      │                  │
│  │  - getTokensForUser(userId)        │                  │
│  │  - savePreferences(userId, prefs)  │                  │
│  └───────┬────────────────────────────┘                  │
├──────────┼────────────────────────────────────────────────┤
│          │     Firebase / External                        │
│  ┌───────▼────────────────────────────┐                  │
│  │  Firestore: users/{uid}/fcmTokens  │                  │
│  │  Cloud Functions: sendNotification │                  │
│  │  FCM / APNs                        │                  │
│  └────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────┘
```

### Token Storage Model

```typescript
// Firestore: users/{userId}/fcmTokens/{tokenHash}
interface FCMTokenDocument {
  token: string;            // The Expo push token or FCM token
  platform: 'ios' | 'android' | 'web';
  deviceId: string;         // Unique device identifier
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

// Firestore: users/{userId} (add field)
interface UserNotificationPreferences {
  notificationsEnabled: boolean;
  newMatchNotifications: boolean;
  chatMessageNotifications: boolean;
  // Future: itinerary update notifications, etc.
}
```

### Notification Payload Schema

```typescript
interface NotificationPayload {
  title: string;
  body: string;
  data: {
    type: 'new_match' | 'new_message' | 'image_message';
    connectionId?: string;
    senderId?: string;
    senderName?: string;
    screen?: string;       // Deep link target screen
  };
  badge?: number;          // iOS badge count
  sound?: string;          // 'default' or custom sound
  channelId?: string;      // Android notification channel
}
```

---

## 4. Notification Types & Triggers

### 4.1 New Match Notification

| Property | Value |
|---|---|
| **Trigger** | Cloud Function `onCreate` on `connections` collection |
| **Recipients** | Both users in the new connection |
| **Title** | "New Match! 🎉" |
| **Body** | "You matched with {otherUserName} — {destination}, {dates}" |
| **Deep Link** | Navigate to `ChatScreen` with `connectionId` |
| **Priority** | High |
| **Sound** | Default |

**Cloud Function Logic:**
1. Read the newly created connection document
2. Extract both user IDs from `users` array
3. Extract itinerary details (destination, dates) from `itineraries` array
4. For each user, look up their FCM tokens from `fcmTokens` subcollection
5. Send personalized notification to each user (showing the *other* user's name)
6. Skip sending if user has `newMatchNotifications: false`

### 4.2 New Chat Message Notification

| Property | Value |
|---|---|
| **Trigger** | Cloud Function `onCreate` on `connections/{connId}/messages/{msgId}` |
| **Recipients** | All users in the connection *except* the sender |
| **Title** | "{senderName}" |
| **Body** | Message text (truncated to 100 chars) |
| **Deep Link** | Navigate to `ChatScreen` with `connectionId` |
| **Priority** | High |
| **Sound** | Default |
| **Collapse Key** | `chat_{connectionId}` (group notifications from same chat) |

**Cloud Function Logic:**
1. Read the new message document
2. Read the parent connection to get all user IDs
3. Filter out the sender
4. For each recipient, look up their FCM tokens
5. Send notification with sender name and message preview
6. Skip if user has `chatMessageNotifications: false`

### 4.3 Image Message Notification

| Property | Value |
|---|---|
| **Trigger** | Same as chat message (`onCreate` on messages) |
| **Title** | "{senderName}" |
| **Body** | "📷 Sent a photo" |
| **Deep Link** | Navigate to `ChatScreen` with `connectionId` |
| **Priority** | High |
| **Collapse Key** | `chat_{connectionId}` |

---

## 6. Implementation Phases (Updated for Simplified Architecture)

### Phase 1: Client Foundation (~14h — 2 days) — ✅ **COMPLETE**

**Status:** ✅ All tasks completed (February 13, 2026)

**Goal:** Install packages, configure permissions, register push tokens, handle foreground notifications.

#### Tasks — ✅ All Complete

| # | Task | Status | Files |
|---|---|---|---|
| 1.1 | Install `expo-notifications` and `expo-device` | ✅ Done | `package.json` |
| 1.2 | Configure `app.json` — add `expo-notifications` plugin, Android permissions, notification icon/color | ✅ Done | `app.json` |
| 1.3 | Create `NotificationService` (simplified — combines service + data access) | ✅ Done | `src/services/notification/NotificationService.ts` |
| 1.4 | Create `useNotifications` hook — permission state, token registration, foreground handling | ✅ Done | `src/hooks/useNotifications.ts` |
| 1.5 | Add notification initialization to `App.tsx` — set up listeners, register token on auth state change | ✅ Done | `src/components/common/NotificationInitializer.tsx`, `App.tsx` |
| 1.6 | Implement token cleanup on sign-out | ✅ Done | `src/context/AuthContext.tsx` sign-out handler |
| 1.7 | Create Android notification channels (`chat-messages`, `matches`) | ✅ Done | `src/services/notification/NotificationService.ts` |
| 1.8 | Create soft permission prompt UI (optional — can use system dialog directly) | ⏭️ Skipped | Using system dialog directly (MVP approach) |
| 1.9 | Unit tests for service and hook | ✅ Done | `src/__tests__/services/`, `src/__tests__/hooks/` |
| 1.10 | Mock setup for `expo-notifications` and `expo-device` | ✅ Done | `__mocks__/expo-notifications.ts`, `__mocks__/expo-device.ts` |

**Phase 1 Complete: All core tasks done (~13h actual)**

**Implementation Notes:**
- Token storage uses simplified array field: `users/{uid}.fcmTokens: string[]`
- NotificationService combines business logic + Firestore access (no separate repository)
- Tests: 24 passing (1 platform-specific test skipped)
- TypeScript compilation: ✅ No errors

---

### Phase 2: Cloud Functions (~14.5h — 2 days) — **NEXT**

**Goal:** Create Firestore-triggered Cloud Functions that send FCM push notifications.

#### Tasks

| # | Task | Est. Hours | Files |
|---|---|---|---|
| 2.1 | Set up Firebase Admin SDK messaging (verify `firebase-admin` includes messaging) | 0.5h | `functions/src/` |
| 2.2 | Create `sendMatchNotification` — `onCreate` trigger on `connections` collection | 3h | `functions/src/notifications/sendMatchNotification.ts` |
| 2.3 | Create `sendChatNotification` — `onCreate` trigger on `connections/{connId}/messages/{msgId}` | 3h | `functions/src/notifications/sendChatNotification.ts` |
| 2.4 | Shared utility: `getTokensForUser(userId)` — reads `users/{userId}.fcmTokens` array | 0.5h | `functions/src/notifications/utils.ts` |
| 2.5 | Shared utility: `cleanupInvalidTokens(userId, failedTokens)` — remove from array after send failure | 1h | `functions/src/notifications/utils.ts` |
| 2.6 | ~~Notification preferences check~~ (deferred to post-MVP) | ~~1h~~ | — |
| 2.7 | Deploy functions to dev environment and test with real device | 2h | — |
| 2.8 | Handle edge cases: user has no tokens, token expired, multi-device (send to all) | 1.5h | — |
| 2.9 | Cloud Function unit tests | 2.5h | `functions/src/__tests__/` |
| 2.10 | Update `firebase.json` if needed for function deployment config | 0.5h | `firebase.json` |

**Phase 2 Total: ~14.5 hours (2 dev days)**

**Time Saved**: ~6 hours vs. original plan (simpler token queries, no preferences)

#### Key Deliverables
- New match → push notification sent to both users
- New chat message → push notification sent to all recipients (not sender)
- Image message → "📷 Sent a photo" notification
- Invalid tokens auto-cleaned (from array field)
- MVP: All notifications enabled by default

---

### Phase 3: Deep Linking & Navigation (Estimated: 2–3 days)

**Goal:** Tapping a notification navigates to the correct screen.

#### Tasks

| # | Task | Est. Hours | Files |
|---|---|---|---|
| 3.1 | Configure notification response handler — extract `connectionId` from notification data | 2h | `src/hooks/useNotifications.ts` |
| 3.2 | Implement navigation from notification tap — use `navigationRef` to navigate to `ChatScreen` | 3h | `src/navigation/`, `App.tsx` |
| 3.3 | Handle cold-start deep links — app opened from killed state via notification | 3h | `src/hooks/useNotifications.ts` |
| 3.4 | Handle notification tap when app is in foreground — navigate without showing system notification | 1h | — |
| 3.5 | Badge count management — set/clear iOS badge count based on unread messages | 2h | `src/services/notification/NotificationService.ts` |
| 3.6 | Suppress duplicate notifications — if user is already viewing the chat, don't show notification | 2h | `src/hooks/useNotifications.ts` |
| 3.7 | Integration tests for deep link flows | 3h | `src/__tests__/` |

**Phase 3 Total: ~16 hours (2–3 dev days)**

#### Key Deliverables
- Tap "New Match" notification → opens chat with that connection
- Tap "New Message" notification → opens the specific chat
- Cold start from notification works correctly
- No duplicate notifications when chat is already open
- iOS badge count reflects total unread messages

---

### Phase 4: User Preferences & Settings UI (Estimated: 1–2 days)

**Goal:** Give users control over their notification preferences.

#### Tasks

| # | Task | Est. Hours | Files |
|---|---|---|---|
| 4.1 | Add notification preferences to user profile model | 1h | `src/models/User.ts` |
| 4.2 | Create notification settings UI in profile/settings screen | 3h | `src/components/profile/NotificationSettings.tsx` |
| 4.3 | Implement toggle handlers — save preferences to Firestore | 2h | `src/hooks/useNotificationPreferences.ts` |
| 4.4 | Link to system notification settings (for users who denied permission) | 1h | — |
| 4.5 | Unit tests for preferences | 2h | `src/__tests__/` |

**Phase 4 Total: ~9 hours (1–2 dev days)**

#### Key Deliverables
- Settings screen with toggles for each notification type
- Preferences persisted in Firestore
- Cloud Functions check preferences before sending
- "Open System Settings" button for re-enabling permissions

---

### Phase 5: Production Readiness & QA (Estimated: 2–3 days)

**Goal:** End-to-end testing, EAS build configuration, App Store compliance.

#### Tasks
4.1 | Verify APNs key uploaded to Firebase (should be done in Prerequisites section 2.2) | 0.5h | Firebase Console |
| 4.2 | Create EAS build with push notification support and test on physical devices | 2h | — |
| 4.3 | Test all notification flows end-to-end on iOS physical device | 2.5h | — |
| 4.4 | Test all notification flows end-to-end on Android physical device | 2.5h | — |
| 4.5 | Test edge cases: airplane mode, do-not-disturb, background/killed app states | 2h | — |
| 4.6 | Verify App Store push notification compliance (justification: "Notify users of new matches and messages") | 1h | — |
| 4.7 | Update privacy policy if needed (already mentions FCM — verify completeness) | 0.5h | `src/components/modals/PrivacyPolicyModal.tsx` |
| 4.8 | Performance testing — ensure notification listeners don't cause battery drain | 1.5h | — |
| 4.9 | Increment build numbers and create production build | 0.5h | `app.json` |
| 4.10 | Deploy Cloud Functions to production (`mundo1-1`) | 1h | — |

**Phase 4 Total: ~14 hours (2 dev days)**

**Note**: User preference settings deferred to post-MVP (adds ~9-10 hours when needed).

#### Key Deliverables
- Tested on physical iOS and Android devices
- APNs key configured in Firebase
- All notification flows working end-to-end
- Ready for production deployment

---

## 7. Platform-Specific Requirements

### iOS

| Requirement | Details |
|---|---|
| **APNs Key** | Generate in Apple Developer Console → upload to EAS/Firebase. One key works for all apps in the account. |
| **Entitlement** | `aps-environment` entitlement — Expo handles this automatically when `expo-notifications` plugin is added |
| **Permission Prompt** | iOS shows system permission dialog once. **Use soft prompt first** to explain value before triggering system dialog. If denied, user must go to Settings → TravalPass → Notifications to re-enable. |
| **Badge Count** | Managed via `Notifications.setBadgeCountAsync()`. Must be explicitly cleared when user opens app / reads messages. |
| **Provisional Auth** | iOS 12+ supports provisional (quiet) notifications — delivers to notification center without interrupting. Consider using for lower-priority notifications. |
| **Critical Alerts** | Not applicable — TravalPass notifications are not time-critical. |
| **App Store Review** | Push notifications must have clear user value. Apple may reject if permission is requested too early or without explanation. Implement soft prompt pattern. |

### Android

| Requirement | Details |
|---|---|
| **FCM Setup** | Already configured via `google-services.json` in `app.json` |
| **Notification Channels** | Required for Android 8+ (API 26). Create channels: `chat-messages` (high priority), `matches` (high priority). |
| **Permissions** | Android 13+ (API 33) requires `POST_NOTIFICATIONS` runtime permission. Below 13, notifications are enabled by default. |
| **Additional `app.json` Permissions** | Add `RECEIVE_BOOT_COMPLETED` (restart notification listeners after reboot), `VIBRATE` |
| **Notification Icon** | Android requires a monochrome notification icon. Create `notification_icon.png` (96×96, white on transparent). |
| **Notification Color** | Set accent color for notification icon tint (e.g., `#FF6B35` TravalPass orange). |
| **Heads-Up Display** | High-priority notifications show as heads-up (banner at top). Used for chat messages. |

### Web (Future — Not in Initial Scope)

| Requirement | Details |
|---|---|
| **Firebase Cloud Messaging** | `@firebase/messaging` already available as transitive dependency |
| **Service Worker** | Required for background web push. Would need `firebase-messaging-sw.js` in public folder. |
| *8Browser Support** | Chrome, Firefox, Edge support Web Push. Safari 16.1+ supports via Push API. |
| **Not Recommended Initially** | Web push adds complexity; focus on mobile first where push is more impactful. |

---

## 7. Cost Analysis

### 7.1 Infrastructure / Operational Costs

#### Firebase Cloud Messaging (FCM) — Message Delivery

| Item | Cost | Notes |
|---|---|---|
| **FCM message delivery (iOS & Android)** | * — **UPDATED for Simplified Architecture**

Firebase Blaze plan pricing (pay-as-you-go after free tier):

| Operation | Free Tier | Paid Rate | Per-Notification Usage (Simplified) |
|---|---|---|---|
| **Document reads** | 50K/day free | $0.06 per 100K reads | **2 reads per notification** (connection doc + recipient user doc with fcmTokens array) |
| **Document writes** | 20K/day free | $0.18 per 100K writes | ~0 per notification (tokens written only on login/refresh) |
| **Document deletes** | 20K/day free | $0.02 per 100K deletes | None — tokens removed via array update (write operation) |
| **Storage** | 1 GB free | $0.18 per GB/month | Negligible — token arrays add ~200 bytes per user |

**Worked example — 1,000 DAU, 5,000 messages/day, 100 matches/day:**

| Operation | Daily Volume | Monthly Volume | Monthly Cost |
|---|---|---|---|
| Reads from chat notifications (simplified) | 5,000 msgs × **2 reads** = 10,000 | 300,000 | Within free tier |
| Reads from match notifications (simplified) | 100 matches × **2 reads** = 200 | 6,000 | Within free tier |
| Token writes (login/refresh) | ~200 (users logging in) | ~6,000 | Within free tier |
| **Total Firestore cost** | | | **$0** (within free tier) |

> **Cost Improvement**: Simplified architecture saves **1-2 Firestore reads per notification** (no subcollection queries). At 10K DAU with 50K messages/day: ~100K reads/day → 3M reads/month → **~$1.80/month** (vs. $2.70 with subcollection approach)
| Reads from match notifications | 100 matches × 4 reads = 400 | 12,000 | Within free tier |
| Token writes (login/refresh) | ~200 (users logging in) | ~6,000 | Within free tier |
| **Total Firestore cost** | | | **$0** (within free tier) |

> At 10,000+ DAU the reads start exceeding the free tier. At 10K DAU with 50K messages/day: ~150K reads/day → 4.5M reads/month → **~$2.70/month** in Firestore reads.

#### Cloud Functions Costs

| Item | Free Tier | Paid Rate | Notes |
|---|---|---|---|
| **Invocations** | 2M/month free | $0.40 per million | Each message or match creation = 1 invocation |
| **Compute (GB-seconds)** | 400K GB-s/month free | $0.0000025 per GB-s | Notification functions are lightweight (~100–200ms, 256MB RAM) |
| **Networking (egress)** | 5 GB/month free | $0.12 per GB | Notification payloads are tiny (~500 bytes each) |

**Worked example — 5,000 messages/day + 100 matches/day:**

| Item | Monthly Volume | Monthly Cost |
|---|---|---|
| Invocations | 153,000/month | **$0** (well within 2M free) |
| Compute | 153K × 0.15s × 0.25GB = 5,737 GB-s | **$0** (well within 400K free) |
| Egress | 153K × 500 bytes = 73 MB | **$0** (well within 5 GB free) |

#### Projected Total Operational Costs by Scale

| Scenario | DAU | Messages/Day | Matches/Day | Firestore | Cloud Functions | FCM | **Total/Month** |
|---|---|---|---|---|---|---|---|
| **Launch** | 50 | 100 | 5 | $0 | $0 | $0 | **$0** |
| **Small** (MVP) | 100 | 500 | 10 | $0 | $0 | $0 | **$0** |
| **Medium** | 1,000 | 5,000 | 100 | $0 | $0 | $0 | **$0** |
| **Large** | 10,000 | 50,000 | 1,000 | ~$3 | ~$0.50 | $0 | **~$3.50** |
| **Scale** | 100,000 | 500,000 | 10,000 | ~$30 | ~$5 | $0 | **~$35** |

> **Key takeaway:** Push notifications are essentially **free up to ~5,000 DAU**. Even at 100K DAU, total infrastructure cost is ~$35/month — making this one of the cheapest features to operate.

### 7.2 Development Costs

#### Labor Estimate by Phase

| Phase | Description | Hours | At $75/hr | At $150/hr |
|---|---|---|---|---|
| **Phase 1** | Client Foundation (packages, service, hook, tokens, tests) | 20.5h | $1,538 | $3,075 |
| **Phase 2** | Cloud Functions (match + chat triggers, tests) | 20.5h | $1,538 | $3,075 |
| **Phase 3** | Deep Linking & Navigation (tap → navigate, cold start) | 16h | $1,200 | $2,400 |
| **Phase 4** | User Preferences & Settings UI | 9h | $675 | $1,350 |
| **Phase 5** | Production Readiness & QA (device testing, App Store) | 18h | $1,350 | $2,700 |
| **Total** | | **84h** | **$6,300** | **$12,600** |

#### MVP Only (Phases 1–3)

| Metric | Value |
|---|---|
| Hours | ~57 hours |
| At $75/hr | ~$4,275 |
| At $150/hr | ~$8,550 |
| Calendar time | ~2–2.5 weeks |

### 7.3 One-Time / Fixed Costs

| Item | Cost | Status |
|---|---|---|
| Apple Developer Account ($99/year) | $0 incremental | Already paid |
| APNs authentication key | $0 | Free — generated in Apple Developer Console |
| Google FCM setup | $0 | Already configured (`google-services.json`, `GoogleService-Info.plist`) |
| Firebase Blaze plan | $0 incremental | Already on Blaze plan |
| EAS Build for testing | ~$0–3 per build | Counts against existing quota — **test locally first!** |
| Android notification icon asset | $0 | Created in-house (96×96 monochrome PNG) |

### 7.4 Ongoing / Recurring Costs

| Item | Monthly Cost | Notes |
|---|---|---|
| Firebase infrastructure (at < 5K DAU) | **$0** | Fully within free tiers |
| Firebase infrastructure (at 10K DAU) | **~$3.50** | Firestore reads + Cloud Functions |
| Firebase infrastructure (at 100K DAU) | **~$35** | Scales linearly with message volume |
| Apple Developer Account | $8.25/month ($99/year) | Already paid — no incremental cost |
| Maintenance/bug fixes | ~2–4 hours/month | Token edge cases, OS updates, library updates |

### 7.5 Cost Optimization Strategies

1. **Batch notifications** — If a user receives multiple messages in quick succession, collapse into "X new messages from {name}" instead of individual pushes. Reduces Cloud Function invocations by up to 50%.
2. **Token cleanup** — Remove expired/invalid tokens on send failure. Prevents wasted FCM calls and Firestore reads on dead tokens.
3. **Suppress when online** — Skip push if the recipient has the chat screen open (check a presence field or handle client-side). Saves 1 function invocation + 2–4 Firestore reads per suppressed notification.
4. **Efficient Cloud Functions** — Read connection doc once and fan out to recipients in the same invocation. Avoid redundant reads.
5. **Cache user preferences** — Store a `notificationsEnabled: false` flag on the connection document (denormalized) so the Cloud Function can skip the user doc read entirely for opted-out users.
6. **Use `sendEachForMulticast`** — Send to all of a user's device tokens in one API call instead of individual sends.

### 7.6 Cost Comparison: Why FCM Over Alternatives

| Service | Per-Notification Cost | Monthly Cost at 150K notifications | Notes |
|---|---|---|---|
| **Firebase Cloud Messaging** | **$0** | **$0** (+ ~$3.50 Firestore/Functions) | ✅ Recommended — native to our stack |
| OneSignal (free tier) | $0 up to 10K subscribers | $0–$9/month | Adds external dependency, limited free tier |
| OneSignal (paid) | Starts at $9/month | $9–$99/month | Unnecessary — FCM does the same for free |
| AWS SNS | $0.50 per million | $0.08/month | Would require leaving Firebase ecosystem |
| Expo Push Service | $0 | $0 (+ Firestore/Functions) | Alternative to direct FCM — adds Expo dependency for server-side sends |
9
> **Verdict:** FCM is the clear winner — $0 per message, native Firebase integration, no additional vendor dependency, and our Firebase project is already configured for it.

---

## 8. Testing Strategy

### Unit Tests (MVP Scope)

| Test | Coverage |
|---|---|
| `NotificationService.test.ts` | Permission request, token registration (save/remove from array), channel creation |
| `useNotifications.test.ts` | Hook state management, listener setup/cleanup |
| `NotificationPermissionPrompt.test.tsx` | Optional: UI rendering, button interactions (if soft prompt implemented) |
| ~~`NotificationSettings.test.tsx`~~ | Deferred to post-MVP |

### Integration Tests (MVP Scope)

| Test | Coverage |
|---|---|
| Token registration flow | Auth → permission → token save to array → Firestore verify |
| Token cleanup on sign-out | Sign out → tokens removed from array |
| ~~Notification preferences~~ | Deferred to post-MVP |

### Cloud Function Tests (MVP - No Preferences Check)

| Test | Coverage |
|---|---|
| `sendMatchNotification.test.ts` | Connection creation → notification payload verification |
| `sendChatNotification.test.ts` | Message creation → notification sent to correct recipients |
| Token cleanup on send failure | Invalid token → removed from Firestore array field |
| ~~Preference check~~ | Deferred to post-MVP |

### Manual Testing Matrix

| Scenario | iOS | Android |
|---|---|---|
| Permission request (first time) | ☐ | ☐ |
| Permission denied → settings link | ☐ | ☐ |
| New match notification (background) | ☐ | ☐ |
| New match notification (killed) | ☐ | ☐ |
| Chat message notification (background) | ☐ | ☐ |
| Chat message notification (killed) | ☐ | ☐ |
| Image message notification | ☐ | ☐ |
| Tap notification → navigate to chat | ☐ | ☐ |
| Cold start from notification | ☐ | ☐ |
| Suppress when chat is open | ☐ | ☐ |
| Badge count updates | ☐ | N/A |
| Multi-device (same user) | ☐ | ☐ |
| Sign out → no more notifications | ☐ | ☐ |
| ~~Notification preferences toggles~~ | — | — |
| Do-not-disturb mode | ☐ | ☐ |
| Airplane mode → reconnect | ☐ | ☐ |

**Note**: Notification preferences deferred to post-MVP. Users control via system-level settings.

### Testing Limitations

- **Push tokens only work on physical devices** — simulators/emulators cannot receive real push notifications
- **Expo Go does not support push notifications** — must use development build (`npx expo run:ios` / `npx expo run:android`)
- **Test with Firestore emulator** for Cloud Function triggers during development
- **APNs sandbox vs production** — development builds use APNs sandbox; production uses APNs production

---10

## 9. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **iOS permission denial rate** | High — ~40-50% of users deny push on first prompt | High | Implement soft-prompt pattern: explain value *before* system dialog. Show in-context prompt after first match or message. |
| **Token expiration / rotation** | Medium — missed notifications | Medium | Handle token refresh events; clean up invalid tokens on send failure; re-register on app launch. |
| **Duplicate notifications** | Medium — poor UX | Medium | Use `collapseKey` for chat messages; debounce in Cloud Function; check if user is currently viewing the chat. |
| **Cloud Function cold starts** | Low — delayed notifications | Medium | Keep functions warm with min instances (cost tradeoff); use Node.js 22 for faster cold starts. |
| **Battery drain** | Medium — user complaints | Low | Expo Notifications uses system push service (APNs/FCM) — no persistent connection needed. Minimal battery impact. |
| **EAS Build quota** | Medium — cost/delay | Medium | Test thoroughly with local builds before EAS. Only build when notification config changes require native rebuild. |
| **App Store rejection** | High — delayed release | Low | Follow Apple guidelines: justify push permission, provide value, implement soft prompt, allow opt-out. |
| **Multi-device consistency** | Low — UX confusion | Medium | Send to all registered tokens for a user; let client-side handle read state sync via Firestore listeners. |
| **Web platform compatibility** | Low — future scope | Low | Design interfaces to be platform-agnostic; web implementation can be added later without refactoring. |

---

## 11. Time Estimate Summary (Simplified MVP)

| Phase | Description | Estimated Days | Cumulative |
|---|---|---|---|
| **Phase 1** | Client Foundation (simplified service, hook, token mgmt) | 2 days | 2 days |
| **Phase 2** | Cloud Functions (send match/chat notifications, no prefs) | 2 days | 4 days |
| **Phase 3** | Deep Linking & Navigation (tap → navigate) | 2-3 days | 6-7 days |
| **Phase 4** | Production Readiness & QA (device testing, App Store) | 2 days | 8-9 days |
| **Deferred** | User Preferences & Settings UI (post-MVP) | — | — |

### Total Estimate (MVP)

| Metric | Value |
|---|---|
| **Optimistic** | 8 dev days (~1.5 weeks) |
| **Realistic** | 8.5 dev days (~2 weeks) |
| **Pessimistic** | 9 dev days (~2 weeks) |
| **Hours (Realistic)** | ~58.5 hours |

### Time Savings vs. Original Plan

| Comparison | Original | Simplified | Savings |
|---|---|---|---|
| MVP Hours | 66h | 58.5h | **7.5 hours** |
| MVP Days | 11-13 days | 8-9 days | **2-4 days** |
| Calendar Time | ~3 weeks | **~2 weeks** | **~1 week** |

### Post-MVP Enhancements (If Needed)

| Enhancement | When to Add | Estimated Hours |
|---|---|---|
| User notification preferences | When users request granular control | 9-10h |
| Separate Repository layer | When NotificationService exceeds 300 lines | 4-5h |
| Notification batching/collapsing | When message volume causes spam | 6-8h |
| Web push support | When web user base justifies effort | 12-15h |

### Recommended Implementation Order

1. **Complete Prerequisites** (Section 2) — APNs key, Firestore rules, physical devices
2. **Phase 1** → Phase 2 → Phase 3 → Phase 4 (MVP deployment)
3. **Monitor user feedback** — add preferences/batching only if users request

---
3. **Phase 5** (QA overlaps with all phases but has dedicated final pass)

### MVP Milestone (Phases 1-3): ~8–11 dev days

A functional push notification system where:
- Users receive push notifications for new matches and chat messages
- Tapping a notification navigates to the correct chat
**Post-MVP Enhancements (If Needed):**
- User notification preferences settings (add when users request granular control)
- Notification batching/collapsing (add when message volume causes spam complaints)
- Separate repository layer (refactor when NotificationService exceeds 300 lines)
- Web push notifications (add when web user base justifies effort)

Before starting implementation, complete the **Prerequisites & Setup** ([Section 2](#2-prerequisites--setup)):
1. ✅ **Upload APNs authentication key to Firebase Console** (Section 2.2)
2. ✅ **Confirm Push Notifications (Simplified MVP)

```
# New files to create (MVP)
src/services/notification/NotificationService.ts   # Simplified — combines service + data access
src/hooks/useNotifications.ts
src/components/common/NotificationPermissionPrompt.tsx  # Optional — can use system dialog directly
src/models/NotificationTypes.ts
__mocks__/expo-notifications.ts
__mocks__/expo-device.ts
src/__tests__/hooks/useNotifications.test.ts
src/__tests__/services/NotificationService.test.ts

# New Cloud Functions (MVP)
functions/src/notifications/sendMatchNotification.ts
functions/src/notifications/sendChatNotification.ts
functions/src/notifications/utils.ts                # Token fetch + cleanup utilities
functions/src/__tests__/sendMatchNotification.test.ts
functions/src/__tests__/sendChatNotification.test.ts

# Modified files (MVP)
app.json                          # Add expo-notifications plugin, permissions, icon
package.json                      # Add expo-notifications, expo-device
App.tsx                           # Initialize notification listeners
src/context/AuthContext.tsx       # Token cleanup on sign-out
src/types/UserProfile.ts          # Add fcmTokens?: string[] field
firebase.json                     # Cloud Functions config (if needed)

# Deferred to post-MVP
src/hooks/useNotificationPreferences.ts          # User preferences management
src/components/profile/NotificationSettings.tsx  # Settings UI
src/__tests__/components/NotificationSettings.test.tsx
functions/src/__tests__/sendMatchNotification.test.ts
functions/src/__tests__/sendChatNotification.test.ts

# Modified files
app.json                          # Add expo-notifications plugin, permissions, icon
package.json                      # Add expo-notifications, expo-device
App.tsx                           # Initialize notification listeners
src/hooks/auth/useAuth.ts         # Token cleanup on sign-out (or sign-out flow)
src/models/User.ts                # Add notification preferences type
firebase.json                     # Cloud Functions config (if needed)
```

## Appendix B: `app.json` Changes Preview

```jsonc
{
  "expo": {
    // ... existing config ...
    "android": {
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA",
        "RECEIVE_BOOT_COMPLETED",  // ← NEW
        "VIBRATE",                  // ← NEW
        "POST_NOTIFICATIONS"        // ← NEW (Android 13+)
      ]
    },
    "plugins": [
      // ... existing plugins ...
      [
        "expo-notifications",       // ← NEW
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#FF6B35",
          "sounds": [],
          "defaultChannel": "default"Simplified)

```typescript
// functions/src/notifications/sendChatNotification.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getTokensForUser, cleanupInvalidTokens } from './utils';

export const onNewMessage = functions.firestore
  .document('connections/{connectionId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { connectionId } = context.params;
    
    // 1. Get connection document
    const connectionDoc = await admin.firestore()
      .doc(`connections/${connectionId}`).get();
    const connection = connectionDoc.data();
    
    // 2. Get recipients (all users except sender)
    const recipients = connection.users.filter(
      (uid: string) => uid !== message.senderId
    );
    
    // 3. For each recipient, send notification
    for (const recipientId of recipients) {
      // Get tokens from user document's fcmTokens array (SIMPLIFIED)
      const tokens = await getTokensForUser(recipientId);
      if (!tokens || tokens.length === 0) continue;
      
      // MVP: No user preferences check — send to all
      // Post-MVP: Add `if (userPrefs.chatMessageNotifications === false) continue;`
      
      // 4. Build notification payload
      const payload: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: message.senderName || 'New Message',
          body: message.imageUrl 
            ? '📷 Sent a photo' 
            : truncate(message.text, 100),
        },
        data: {
          type: 'new_message',
          connectionId,
          senderId: message.senderId,
        },
        android: {
          notification: { channelId: 'chat-messages' },
          collapseKey: `chat_${connectionId}`,
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      };
      
      // 5. Send and clean up invalid tokens
      const response = await admin.messaging().sendEachForMulticast(payload);
      await cleanupInvalidTokens(recipientId, tokens, response);
    }
  });

// ---- utils.ts (SIMPLIFIED) ----
export async function getTokensForUser(userId: string): Promise<string[]> {
  const userDoc = await admin.firestore().doc(`users/${userId}`).get();
  return userDoc.data()?.fcmTokens || [];  // Read array field directly
}

export async function cleanupInvalidTokens(
  userId: string, 
  tokensSent: string[], 
  response: admin.messaging.BatchResponse
) {
  const failedTokens = response.responses
    .map((res, idx) => res.success ? null : tokensSent[idx])
    .filter(Boolean) as string[];
  
  if (failedTokens.length === 0) return;
  
  // Remove failed tokens from array
  const userRef = admin.firestore().doc(`users/${userId}`);
  await userRef.update({
    fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
  });
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.substring(0, maxLen)}...` : text;
}
```

---

*This document should be reviewed and updated as implementation progresses. Each phase should have its own tracking issue or PR.*

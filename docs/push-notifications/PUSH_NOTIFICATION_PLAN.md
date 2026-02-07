# Push Notification Implementation Plan — TravalPass (iOS & Android)

> **Created**: June 2025  
> **Status**: Planning  
> **Platforms**: iOS (APNs), Android (FCM), Web (FCM — future)  
> **Framework**: React Native Expo (SDK 54)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Architecture Design](#3-architecture-design)
4. [Notification Types & Triggers](#4-notification-types--triggers)
5. [Implementation Phases](#5-implementation-phases)
6. [Platform-Specific Requirements](#6-platform-specific-requirements)
7. [Cost Analysis](#7-cost-analysis)
8. [Testing Strategy](#8-testing-strategy)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Time Estimate Summary](#10-time-estimate-summary)

---

## 1. Executive Summary

### Goal

Implement push notifications across iOS and Android to notify users of:

- **New matches** — when two travelers have a mutual itinerary like
- **New chat messages** — when a message arrives in a connection chat
- **Image messages** — distinct notification for photo messages

### Approach

- **Client**: `expo-notifications` library for token registration, permission handling, foreground/background notification handling, and deep linking
- **Server**: Firebase Cloud Functions with Firestore `onCreate`/`onUpdate` triggers to send FCM messages server-side (never client-initiated pushes)
- **Token Storage**: FCM tokens stored in Firestore `fcmTokens` subcollection (rules already exist) or as a field on the user document
- **Architecture**: Follows existing S.O.L.I.D patterns — NotificationService (business logic), NotificationRepository (token persistence), useNotifications hook (state management)

### Key Constraint

All notification sending happens **server-side** via Cloud Functions. The client only:
1. Requests permission
2. Registers/refreshes the push token
3. Handles incoming notifications (foreground display, tap navigation)

---

## 2. Current State Assessment

### ✅ Already In Place

| Component | Status | Details |
|---|---|---|
| Firebase project config | ✅ Ready | `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) configured in `app.json` |
| Messaging Sender ID | ✅ Ready | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` set for dev (`296095212837`) and prod (`533074391000`) |
| Firestore security rules | ✅ Ready | `fcmTokens/{tokenId}` collection with `allow read, write: if request.auth != null` in both dev and prod rules |
| Legal/privacy coverage | ✅ Ready | Privacy Policy and Cookie Policy already reference Firebase Cloud Messaging and push notification tokens |
| Unread count tracking | ✅ Ready | `unreadCounts` map on connection documents — incremented on send, reset on read |
| Real-time chat listeners | ✅ Ready | `onSnapshot` listeners on messages subcollection for real-time delivery |
| Deep link scheme | ✅ Ready | `travalpass://` scheme configured in `app.json` |
| EAS project ID | ✅ Ready | `6fc90234-4d23-427c-918f-75d141efe8ed` |

### 🔴 Not Yet Implemented

| Component | Status | What's Needed |
|---|---|---|
| `expo-notifications` package | 🔴 Missing | Install + configure plugin in `app.json` |
| `expo-device` package | 🔴 Missing | Needed to detect physical device (push tokens only work on real devices) |
| Notification service | 🔴 Missing | `src/services/notification/NotificationService.ts` |
| Notification repository | 🔴 Missing | `src/repositories/NotificationRepository.ts` for token CRUD |
| Notification hook | 🔴 Missing | `src/hooks/useNotifications.ts` for state management |
| Cloud Functions (send) | 🔴 Missing | Firestore triggers to send FCM messages |
| `app.json` notification config | 🔴 Missing | iOS push entitlement, Android permissions, notification icon |
| APNs key in EAS | 🔴 Missing | Apple Push Notification service key for iOS builds |
| Notification preferences UI | 🔴 Missing | Settings screen for users to toggle notification types |

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
| **Trigger** | Same `onCreate` trigger as chat messages |
| **Recipients** | Same as chat message |
| **Title** | "{senderName}" |
| **Body** | "📷 Sent a photo" |
| **Deep Link** | Navigate to `ChatScreen` with `connectionId` |

**Differentiation:** Detected by checking if the message document has an `imageUrl` field. Uses friendly text instead of showing a URL.

### 4.4 Future Notification Types (Not in Scope for Initial Release)

- Itinerary match suggestions ("Someone else is traveling to Tokyo the same week!")
- Connection request reminders
- Inactivity re-engagement ("Your trip to Paris is coming up — any new connections?")
- Group chat member added/removed

---

## 5. Implementation Phases

### Phase 1: Client Foundation (Estimated: 3–4 days)

**Goal:** Install packages, configure permissions, register push tokens, handle foreground notifications.

#### Tasks

| # | Task | Est. Hours | Files |
|---|---|---|---|
| 1.1 | Install `expo-notifications` and `expo-device` | 0.5h | `package.json` |
| 1.2 | Configure `app.json` — add `expo-notifications` plugin, Android permissions (`RECEIVE_BOOT_COMPLETED`, `VIBRATE`), Android notification icon/color, iOS push entitlement (auto via Expo) | 1h | `app.json` |
| 1.3 | Create `INotificationService` interface and `NotificationService` implementation | 3h | `src/services/notification/INotificationService.ts`, `src/services/notification/NotificationService.ts` |
| 1.4 | Create `INotificationRepository` interface and `FirebaseNotificationRepository` | 2h | `src/repositories/NotificationRepository.ts` |
| 1.5 | Create `useNotifications` hook — permission state, token registration, foreground handling | 3h | `src/hooks/useNotifications.ts` |
| 1.6 | Add notification initialization to `App.tsx` — set up listeners, register token on auth state change | 2h | `App.tsx` |
| 1.7 | Implement token cleanup on sign-out | 1h | `src/hooks/auth/useAuth.ts` or sign-out flow |
| 1.8 | Create Android notification channel (`chat-messages`, `matches`) | 1h | `src/services/notification/NotificationService.ts` |
| 1.9 | Create notification permission prompt UI (soft prompt before system dialog) | 2h | `src/components/common/NotificationPermissionPrompt.tsx` |
| 1.10 | Unit tests for service, repository, and hook | 4h | `src/__tests__/` |
| 1.11 | Mock setup for `expo-notifications` and `expo-device` in test environment | 1h | `__mocks__/expo-notifications.ts`, `__mocks__/expo-device.ts` |

**Phase 1 Total: ~20.5 hours (3–4 dev days)**

#### Key Deliverables
- App registers for push notifications on login
- FCM token saved to Firestore on registration
- FCM token removed on sign-out
- Foreground notifications displayed as in-app alerts (not system notifications)
- Android notification channels created
- Permission prompt with soft-ask pattern

---

### Phase 2: Cloud Functions — Send Notifications (Estimated: 3–4 days)

**Goal:** Create Firestore-triggered Cloud Functions that send FCM push notifications.

#### Tasks

| # | Task | Est. Hours | Files |
|---|---|---|---|
| 2.1 | Set up Firebase Admin SDK messaging in Cloud Functions (verify `firebase-admin` includes messaging) | 1h | `functions/src/` |
| 2.2 | Create `sendMatchNotification` — `onCreate` trigger on `connections` collection | 4h | `functions/src/notifications/sendMatchNotification.ts` |
| 2.3 | Create `sendChatNotification` — `onCreate` trigger on `connections/{connId}/messages/{msgId}` | 4h | `functions/src/notifications/sendChatNotification.ts` |
| 2.4 | Shared utility: `getTokensForUser(userId)` — reads `fcmTokens` subcollection | 1h | `functions/src/notifications/utils.ts` |
| 2.5 | Shared utility: `cleanupInvalidTokens(userId, tokens)` — remove expired/invalid tokens after send failure | 1h | `functions/src/notifications/utils.ts` |
| 2.6 | Implement notification preferences check — read user prefs before sending | 1h | `functions/src/notifications/utils.ts` |
| 2.7 | Deploy functions to dev environment and test with Firestore emulator | 3h | — |
| 2.8 | Handle edge cases: user has no tokens, token expired, multi-device (send to all), user blocked notifications | 2h | — |
| 2.9 | Cloud Function unit tests | 3h | `functions/src/__tests__/` |
| 2.10 | Update `firebase.json` if needed for function deployment config | 0.5h | `firebase.json` |

**Phase 2 Total: ~20.5 hours (3–4 dev days)**

#### Key Deliverables
- New match → push notification sent to both users
- New chat message → push notification sent to all recipients (not sender)
- Image message → "📷 Sent a photo" notification
- Invalid tokens auto-cleaned
- User preferences respected

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

| # | Task | Est. Hours | Files |
|---|---|---|---|
| 5.1 | Configure APNs key in EAS for iOS push notifications | 1h | EAS dashboard |
| 5.2 | Create EAS build with push notification support and test on physical devices | 3h | — |
| 5.3 | Test all notification flows end-to-end on iOS physical device | 3h | — |
| 5.4 | Test all notification flows end-to-end on Android physical device | 3h | — |
| 5.5 | Test edge cases: airplane mode, do-not-disturb, background/killed app states | 2h | — |
| 5.6 | Verify App Store push notification compliance (iOS requires justification for push permission) | 1h | — |
| 5.7 | Update privacy policy if needed (already mentions FCM — verify completeness) | 1h | `src/components/modals/PrivacyPolicyModal.tsx` |
| 5.8 | Performance testing — ensure notification listeners don't cause battery drain | 2h | — |
| 5.9 | Increment build numbers and create production build | 1h | `app.json` |
| 5.10 | Deploy Cloud Functions to production | 1h | — |

**Phase 5 Total: ~18 hours (2–3 dev days)**

---

## 6. Platform-Specific Requirements

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
| **Browser Support** | Chrome, Firefox, Edge support Web Push. Safari 16.1+ supports via Push API. |
| **Not Recommended Initially** | Web push adds complexity; focus on mobile first where push is more impactful. |

---

## 7. Cost Analysis

### 7.1 Infrastructure / Operational Costs

#### Firebase Cloud Messaging (FCM) — Message Delivery

| Item | Cost | Notes |
|---|---|---|
| **FCM message delivery (iOS & Android)** | **$0 — Free** | FCM has **no per-message charge**, no monthly fee, no volume cap. Google subsidizes this as part of the Firebase platform. |
| **APNs delivery (iOS via FCM)** | **$0 — Free** | Apple Push Notification service is free. FCM proxies to APNs on your behalf at no cost. |

> **Bottom line:** Sending the push notification itself is completely free regardless of volume.

#### Firestore Costs (Token Storage & Lookups)

Firebase Blaze plan pricing (pay-as-you-go after free tier):

| Operation | Free Tier | Paid Rate | Per-Notification Usage |
|---|---|---|---|
| **Document reads** | 50K/day free | $0.06 per 100K reads | 2–4 reads per notification (connection doc + recipient user doc + 1–2 token docs) |
| **Document writes** | 20K/day free | $0.18 per 100K writes | ~0 per notification (tokens written only on login/refresh, not per send) |
| **Document deletes** | 20K/day free | $0.02 per 100K deletes | Occasional — only when cleaning up invalid tokens |
| **Storage** | 1 GB free | $0.18 per GB/month | Negligible — token docs are ~200 bytes each |

**Worked example — 1,000 daily active users, 5,000 messages/day, 100 matches/day:**

| Operation | Daily Volume | Monthly Volume | Monthly Cost |
|---|---|---|---|
| Reads from chat notifications | 5,000 msgs × 3 reads = 15,000 | 450,000 | Within free tier (50K/day) |
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

> **Verdict:** FCM is the clear winner — $0 per message, native Firebase integration, no additional vendor dependency, and our Firebase project is already configured for it.

---

## 8. Testing Strategy

### Unit Tests

| Test | Coverage |
|---|---|
| `NotificationService.test.ts` | Permission request, token registration, channel creation |
| `NotificationRepository.test.ts` | Token CRUD operations, preference read/write |
| `useNotifications.test.ts` | Hook state management, listener setup/cleanup |
| `NotificationPermissionPrompt.test.tsx` | UI rendering, button interactions |
| `NotificationSettings.test.tsx` | Preference toggles, save operations |

### Integration Tests

| Test | Coverage |
|---|---|
| Token registration flow | Auth → permission → token save → Firestore verify |
| Token cleanup on sign-out | Sign out → token removed from Firestore |
| Notification preferences | Toggle → save → Cloud Function respects setting |

### Cloud Function Tests

| Test | Coverage |
|---|---|
| `sendMatchNotification.test.ts` | Connection creation → notification payload verification |
| `sendChatNotification.test.ts` | Message creation → notification sent to correct recipients |
| Token cleanup on send failure | Invalid token → removed from Firestore |
| Preference check | User disabled → no notification sent |

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
| Notification preferences toggles | ☐ | ☐ |
| Do-not-disturb mode | ☐ | ☐ |
| Airplane mode → reconnect | ☐ | ☐ |

### Testing Limitations

- **Push tokens only work on physical devices** — simulators/emulators cannot receive real push notifications
- **Expo Go does not support push notifications** — must use development build (`npx expo run:ios` / `npx expo run:android`)
- **Test with Firestore emulator** for Cloud Function triggers during development
- **APNs sandbox vs production** — development builds use APNs sandbox; production uses APNs production

---

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

## 10. Time Estimate Summary

| Phase | Description | Estimated Days | Cumulative |
|---|---|---|---|
| **Phase 1** | Client Foundation (packages, service, hook, token mgmt) | 3–4 days | 3–4 days |
| **Phase 2** | Cloud Functions (send match/chat notifications) | 3–4 days | 6–8 days |
| **Phase 3** | Deep Linking & Navigation (tap → navigate) | 2–3 days | 8–11 days |
| **Phase 4** | User Preferences & Settings UI | 1–2 days | 9–13 days |
| **Phase 5** | Production Readiness & QA | 2–3 days | 11–16 days |

### Total Estimate

| Metric | Value |
|---|---|
| **Optimistic** | 11 dev days (~2.5 weeks) |
| **Realistic** | 13 dev days (~3 weeks) |
| **Pessimistic** | 16 dev days (~3.5 weeks) |

### Recommended Implementation Order

1. **Phase 1** → Phase 2 → Phase 3 (core notification flow, can ship as MVP)
2. **Phase 4** (preferences — can ship as fast-follow)
3. **Phase 5** (QA overlaps with all phases but has dedicated final pass)

### MVP Milestone (Phases 1-3): ~8–11 dev days

A functional push notification system where:
- Users receive push notifications for new matches and chat messages
- Tapping a notification navigates to the correct chat
- Tokens are managed and cleaned up properly

### Dependencies & Prerequisites

Before starting implementation:
1. ✅ Confirm Apple Developer Account has push notification capability enabled for `com.travalpass.app`
2. ✅ Generate APNs authentication key (or certificate) from Apple Developer Console
3. ✅ Upload APNs key to Firebase Console (Project Settings → Cloud Messaging → iOS app)
4. ✅ Verify EAS build quota is sufficient for development builds with push support

---

## Appendix A: New File Inventory

```
# New files to create
src/services/notification/INotificationService.ts
src/services/notification/NotificationService.ts
src/repositories/NotificationRepository.ts
src/hooks/useNotifications.ts
src/hooks/useNotificationPreferences.ts
src/components/common/NotificationPermissionPrompt.tsx
src/components/profile/NotificationSettings.tsx
src/models/NotificationTypes.ts
__mocks__/expo-notifications.ts
__mocks__/expo-device.ts
src/__tests__/hooks/useNotifications.test.ts
src/__tests__/services/NotificationService.test.ts
src/__tests__/repositories/NotificationRepository.test.ts
src/__tests__/components/NotificationPermissionPrompt.test.tsx
src/__tests__/components/NotificationSettings.test.tsx

# New Cloud Functions
functions/src/notifications/sendMatchNotification.ts
functions/src/notifications/sendChatNotification.ts
functions/src/notifications/utils.ts
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
          "defaultChannel": "default"
        }
      ]
    ]
  }
}
```

## Appendix C: Cloud Function Example (Pseudocode)

```typescript
// functions/src/notifications/sendChatNotification.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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
    
    // 3. For each recipient, get their FCM tokens
    for (const recipientId of recipients) {
      const tokensSnapshot = await admin.firestore()
        .collection(`users/${recipientId}/fcmTokens`)
        .where('isActive', '==', true)
        .get();
      
      if (tokensSnapshot.empty) continue;
      
      // 4. Check user preferences
      const userDoc = await admin.firestore()
        .doc(`users/${recipientId}`).get();
      const prefs = userDoc.data()?.notificationPreferences;
      if (prefs?.chatMessageNotifications === false) continue;
      
      // 5. Build notification payload
      const payload: admin.messaging.MulticastMessage = {
        tokens: tokensSnapshot.docs.map(d => d.data().token),
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
      
      // 6. Send and clean up invalid tokens
      const response = await admin.messaging().sendEachForMulticast(payload);
      await cleanupFailedTokens(recipientId, tokensSnapshot.docs, response);
    }
  });
```

---

*This document should be reviewed and updated as implementation progresses. Each phase should have its own tracking issue or PR.*

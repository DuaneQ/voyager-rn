# Connection & Chat - Requirements

Status: Draft

## Overview

This document captures functional and non-functional requirements for the Connection & Chat
feature in Voyager-RN. The mobile app must implement the same user-facing behavior as the
Voyager PWA: when two users like each other's itinerary a `connection` is created; users see a
list of their connections and can open a chat thread for each connection. Users may add other
connections to create group chats. The document references PWA behavior and the existing
utility and modal implementations as the canonical reference.

**PWA Compatibility**: The RN app shares the same Firebase backend with the PWA. All Connection
and Message documents MUST use identical schemas to ensure seamless cross-platform communication.
PWA users and RN users must be able to chat together in real-time without data incompatibility.

Reference implementations in PWA:
- `src/utils/connectionUtils.ts` — addUserToConnection, removeUserFromConnection
- `src/utils/getEligibleUsersForChat.ts` — find eligible users for group chat
- `src/hooks/useRemoveConnection.ts` — delete connection
- `src/types/Connection.ts` and `src/types/Message.ts` — shared data models
- `src/Context/NewConnectionContext.tsx` — connection badge state management

## Goals

- Provide a clear, performant list of user connections.
- Support 1:1 and group chat conversations based on `connections` documents.
- Real-time message delivery and presence where possible (Firestore listeners).
- Support text and image messages (optimistic UI updates for low latency).
- Enforce permission rules: only the user who added another user may remove them.
- Keep mobile and web behavior functionally equivalent to the PWA.

## Matching & Connection Creation

The matching flow is a critical precursor to chat. This section documents the expected
behaviour, data updates, notification behavior, race conditions and acceptance criteria
for when two users mutually like each other's itineraries and a `connection` (chat) is created.

Behavioral summary
- A match occurs when User A likes User B's itinerary and User B likes User A's itinerary.
- On mutual like, both users receive a notification (push + in-app) indicating the match and a
  new `connection` appears in each user's connections list.
- The created connection must include the participants' itinerary summaries so the chat header
  can show a quick itinerary preview without an additional read.

Data model updates
- Connections document must be created atomically with these fields at minimum:
  - `id`: generated connection id
  - `users`: [userA.uid, userB.uid]
  - `itineraries`: embedded summaries (destination, startDate, endDate, userInfo)
  - `createdAt`: timestamp
  - `unreadCounts`: { userA: 0, userB: 0 }
  - optionally: `lastMessagePreview` with a system message like "You matched!"

Notification & UX
- Push notification: send to both users with a short message (e.g., "You matched with Alice — Tokyo, May 1-7"). Include deep link to chat thread.
- In-app: show a transient banner and update the `connections` view immediately (optimistic). If the connection creation later fails, show an error and remove the optimistic item.
- The chat should open to the new connection when the user taps the notification.

Idempotency & race conditions
- Mutual like can be triggered near-simultaneously by both clients. Connection creation must be idempotent:
  - Use a transaction or server-side Cloud Function to check for an existing connection between the two UIDs before creating a new document.
  - If a connection already exists, return it instead of creating a duplicate.
- If the creation involves multiple steps (create doc, update user indices, send push), ensure the operation is retried safely and can be rolled back or reconciled.

Security & validation
- Only authenticated requests may create connections; validate both users exist and that likes were recorded (or the Cloud Function should verify the mutual-like condition).
- Avoid exposing private itinerary fields in the connection document — only store minimal summary data required for the UI.

Edge cases
- If one user unlikes immediately after matching, define expected behavior (recommended: the connection remains and users must manually remove or block if desired).
- If connection creation fails after notifying a user, show an in-app error and provide an action to retry connection creation.

Acceptance criteria for matching
1. When two users mutually like each other's itinerary within a 24-hour window, a single `connection` is created visible to both users.
2. Both users receive a push and an in-app notification and can tap to open the new chat.
3. The connection creation is idempotent — duplicate documents are not created under race conditions.
4. The `connections` list shows itinerary summary immediately (optimistic) and reconciles with server state.
5. Unit tests and integration tests exist for the Cloud Function or server-side flow that creates connections in a transaction and for the client flows that display notifications and open the chat on tap.


## User Stories

- As a user, I can view all my connections in a list sorted by recent activity.
- As a user, I can tap a connection to open a chat thread and read/send messages.
- As a user, I can add other of my existing connections to the chat (convert 1:1 → group).
- As a user who added someone to a group, I can remove them; other users cannot remove them.
- As a user, I can upload an image in chat; the image uploads, then the message updates with the image URL.
- As a user, I can see unread message counts per connection and messages marked read when I view them.

## Data Model (Firestore)

Collection: `connections`
- id: string (document id)
- users: string[] (uid array of all members)
- itineraries: Itinerary[] (optional embedded summary of member itineraries)
- addedUsers?: Array<{ userId: string; addedBy: string }> (tracks who added whom)
- unreadCounts: { [userId: string]: number }
- lastMessagePreview?: { text?: string; sender?: string; createdAt?: Timestamp }

Subcollection: `connections/{connectionId}/messages`
- id: generated
- sender: string (uid)
- text: string
- imageUrl?: string
- createdAt: Timestamp
- readBy: string[] (uids who have read)

Notes:
- See `docs/GROUP_CHAT_MEMBER_LOGIC.md` for the `addedUsers` semantics used to enforce removal permission.

## API / Client Operations (high-level)

The implementation will primarily use Firestore SDK operations. For OpenSpec and server-backed RPCs we will define endpoints later.

- List connections (client-side Firestore query): query `connections` where `users` array-contains current user.
- Open chat: attach a realtime listener to `connections/{id}/messages` ordered by `createdAt` and a snapshot listener to the connection doc for metadata changes (unreadCounts, members).
- Send text message: add document to `connections/{id}/messages` with `sender`, `text`, `createdAt`, `readBy` = [sender]; increment `unreadCounts` for other members.
- Send image message: create placeholder message in `messages` subcollection, upload file to Storage under `chatImages/{connectionId}/{messageId}_{filename}`, then update message doc with `imageUrl`.
- Add user(s) to connection: call `addUserToConnection(connectionId, userIdToAdd, addedBy)` utility which updates `users` and `addedUsers` atomically.
- Remove user from connection: call `removeUserFromConnection(connectionId, userIdToRemove, requestingUserId)` which enforces `addedUsers` permission check.

## UI Requirements

- Connections List
  - Display avatar, username, itinerary summary (destination + dates), and unread badge.
  - Sort by `lastMessage.createdAt` or falling back to `connection.createdAt`.
  - Support pull-to-refresh and pagination if many connections.

Connections List — UI (Chat Page)
--------------------------------
The Connections List is the chat landing page showing a user's conversations (1:1 and group). The following UI, data fields, component breakdown and S.O.L.I.D. mapping should be followed when implementing the feature.

ASCII Diagram (per row — virtualized list, newest first)

[Search / Filter Bar]
+--------------------------------------------------------------------------------+
| [Avatar]  DisplayName                   | Itinerary summary (destination • dates) |
|            LastMessagePreview (truncated)|              12:34  •  [unread badge]   |
+--------------------------------------------------------------------------------+
| [Avatar]  Group Name (Alice, Bob, 2 more) | Itinerary summary (Tokyo • May 1-7)     |
|            [Image icon] Photo • 2:05 PM   |              [unread badge: 3]         |
+--------------------------------------------------------------------------------+
[Compose Floating Button]                                [Pull-to-refresh]

Displayed fields (per connection row)
- Avatar(s): circular avatar or stacked avatars for groups (image or initial fallback).
- Title: other user's name for 1:1 or group name / participant list preview for groups.
- Itinerary summary: destination + start/end dates (from `connections.itineraries` summary).
- Last message preview: truncated text or media placeholder (image/video) and sender context.
- Timestamp: readable time for last message or connection creation time.
- Unread badge: numeric unread count for current user (hidden when zero).
- Status indicators (optional): muted/pinned/typing indicators, read checksum.

Component & code decomposition (S.O.L.I.D.-friendly)
- `src/components/chat/ChatConnectionsList.tsx` — container: renders virtualized list, search/filter bar, pull-to-refresh and pagination. Uses `useConnections` hook; no direct Firestore access.
- `src/components/chat/ChatConnectionItem.tsx` — presentation: renders a single row (avatar(s), title, itinerary, preview, timestamp, unread badge). Pure UI; receives `Connection` props.
- `src/components/chat/ChatHeaderAvatars.tsx` — small component: stacked avatars with overflow chip and accessible labels.
- `src/hooks/chat/useConnections.ts` — hook: subscribes to `connections` collection, consolidates last-message preview, provides `refresh`, `loadMore`, `connections` array.
- `src/services/chat/ChatService.ts` (implements `IChatService`) — business logic: mark read, send message (optimistic flow), add/remove members, reconcile optimistic connections.
- `src/repositories/ConnectionRepository.ts` (implements `IConnectionRepository`) — persistence layer: Firestore queries/updates. Keep Firestore code here only.
- `src/utils/formatDate.ts`, `src/utils/sanitizeMessage.ts` — pure helpers used across presentation and tests.

How the design follows S.O.L.I.D.
- Single Responsibility: each file has one clear responsibility — UI, data orchestration, business rules, or persistence.
- Open/Closed: `ChatService` depends on repository interfaces (`IConnectionRepository`) so new implementations (mock, REST) can be added without changing service logic.
- Liskov Substitution: repository interfaces are narrow so test/mocked implementations can be substituted in tests.
- Interface Segregation: split repositories and services into small interfaces (`IMessageRepository`, `IConnectionRepository`) so consumers only depend on needed methods.
- Dependency Inversion: hooks and UI components depend on abstractions or hooks (not concrete Firestore imports). Inject concrete repositories in app bootstrap.

Performance & UX notes
- Use `FlatList` with appropriate `initialNumToRender`, `windowSize` and `keyExtractor` to optimize memory.
- Prefer server-side aggregated `lastMessagePreview` on `connections` doc to avoid per-row subcollection reads. If client-side aggregation is required, batch listeners or a single paged query is preferred.
- Throttle UI updates when many realtime events occur to avoid scroll jank.

Accessibility
- Each row should expose `accessibilityLabel` like: "{displayName}. {unreadCount} unread messages. Open chat." Avatars have `accessibilityRole="image"` and label "Open profile: {displayName}".

Acceptance criteria (list view)
- Shows avatar(s), title, itinerary summary, last message preview, timestamp, and unread badge.
- Rows are accessible and tappable to open the corresponding chat thread.
- Real-time updates arrive without blocking main thread; list supports pagination and pull-to-refresh.
- Optimistic connection items are reconciled with server state (use `matchId` or itinerary key to reconcile). 

Default avatar behavior
- Use the same default avatar used on the profile page when a participant has no profile photo. Reuse the existing asset/component from the profile code to guarantee visual consistency across the app and reduce duplication.
- Avatar resolution: the UI should prefer the user's `avatarUrl`. If missing, render the shared default avatar asset (do not call external services to generate avatars to avoid extra reads).
- Accessibility: default avatar should have same `accessibilityLabel` semantics as a real photo (e.g., "{displayName} — open profile").

Minimizing Firestore reads/writes (cost control)
- When opening a chat thread, only read the last 10 messages initially. Use a paged read model where `loadMore()` fetches the previous 10 messages on demand (infinite scroll / pull-up to load older). Use queries with `limit(10)` and `startAfter` / `endBefore` cursors to page.
- Keep `connections` documents aggregated with `lastMessagePreview` and `lastMessageTimestamp` so the connections list can be rendered without per-row subcollection reads. Prefer server-side aggregation (Cloud Function) or update `connections.lastMessagePreview` on message write to avoid extra reads.
- When sending messages, update `unreadCounts` in a single batched write where possible to minimize multiple writes.

Delete / Remove Connection
- Add a delete/remove affordance for each row in the Connections List (`ChatConnectionItem`). The control may be a swipe action or a small icon button (trash) in the row. The action should open a confirm sheet: "Remove conversation — This will remove the conversation for you (not necessarily others). Continue?"
- Deleting a connection does not necessarily delete the underlying chat history for other participants unless an explicit policy requires it. By default: removing a connection will remove the connection document from the current user's list view or add the current user to a `hiddenBy` array on the connection document. Decide on either behaviour consistently and document it in the implementation plan.
- Permission and server rules: ensure Firestore security rules only allow a user to perform a delete/hide for their own userId. Use a Cloud Function to perform safe deletes if additional cleanup is required (e.g., clearing push tokens or archiving data).

Avatar tap -> ViewProfile, rating & comments
- Tapping an avatar in the Connections List or in the chat header should navigate to `ViewProfile` for that participant.
- `ViewProfile` should expose rating and comments UI if the user is allowed to rate (follow existing PWA behavior). Ratings/comments are stored separately (e.g., `profiles/{userId}/ratings` collection) and must be rate-limited and validated server-side.
- The profile page should guard rating/comment writes so a user cannot self-rate or spam — enforce debounce and server-side checks.

Testing requirements (unit & integration)
- Unit tests:
  - Avatar fallback: test that components render the default avatar when `avatarUrl` is missing.
  - Connections list rendering: render stubbed `connections` and ensure `lastMessagePreview` and unread badges display correctly.
  - Delete/hide action: test that confirming calls the repository method and that only allowed users can invoke the API.
  - Pagination: test the hook logic for initial `limit(10)` and `loadMore()` fetching the next 10 messages.

- Integration tests (Firestore emulator):
  - Open chat flow reads only 5 messages initially and loads more when `loadMore` is called.
  - Send message + image upload flow: placeholder appears, upload completes and message is reconciled with server snapshot.
  - Delete connection: confirm the user's list is updated and other members still see their connection according to the deletion policy.
  - Avatar tap -> ViewProfile: navigation flows to `ViewProfile` and rating/comment writes persist and enforce rate limits.

Test mocks & fixtures
- Add mock assets for `default-avatar.png` in `__mocks__` where UI tests run (so Jest/RTL snapshots are consistent).
- Use existing `__mocks__` for Expo modules and Firebase; write a Firestore emulator configuration for integration tests and include helper scripts in `scripts/` to run them.

Notes on reads/writes trade-offs
- Prefetching fewer messages reduces read costs but may add latency when users scroll. Limit initial reads to 5 per chat open and make `loadMore` user-driven.
- Server-side aggregation of `lastMessagePreview` increases write cost on message write (one extra write to connections doc) but reduces reads across the connections list. This trade-off is typically positive for cost because a small extra write per message reduces multiple per-row reads for every active user.


- Chat View
  - Show messages chronologically with grouping by sender/time where appropriate.
  - Support sending text, uploading image, and optimistic update (message shows immediately with pending state while uploading).
  - Auto-scroll to bottom on new messages unless the user scrolled up.
  - Show message read status via `readBy` and update when the user views the thread.
  - Provide a header with member avatars and a button to manage members.

  - Typing Indicator
    - Display an animated ellipses typing indicator (e.g. "...") near the message composer or inline in the message list when other participants are actively typing.
    - The indicator must show the username(s) when space allows (e.g. "Alice is typing...") for 1:1, and aggregate ("Alice and Bob are typing...") for small groups.
    - The typing indicator should not rely on full message writes — it should use a lightweight presence / typing status update (see Data Model below) and be ephemeral.
    - The indicator must hide automatically after a short timeout (e.g. 3-5 seconds) if no further typing events are received.

  - Participants Avatar Header
    - Display all participants' avatars across the top of the chat header.
    - Each participant avatar should render the user's profile photo when available; otherwise render a circular fallback with the user's first initial (uppercase).
    - For group chats show up to `N` avatars (suggest 4) with overlapping / stacked presentation; if there are more participants show a final chip like "+3" indicating remaining count.
    - Each avatar must be accessible (accessible label: "{displayName} — open profile").
    - Avatars should be small (32-48px) and cached where possible to reduce network requests. Use the existing `userId -> avatarUrl` map in the chat page to avoid repeated fetches.
    - Tapping an avatar opens the participant's profile modal (or native profile view) when available.
    - Acceptance: avatars render correctly for participants with and without photos, overflow chip appears for large groups, and accessibility labels exist.

- Manage Members Modal
  - Show full member list with `addedBy` metadata.
  - Allow adding eligible users (use `getEligibleUsersForChat` to suggest candidates).
  - Show remove action only for members the current user added (enforced in UI and backend utility).

## Permission & Security Requirements

- Firestore Security Rules should ensure:
  - Only authenticated users in `connection.users` can read/write messages.
  - Only the adder (`addedUsers.addedBy`) can remove the added user.
  - Message writes must contain `sender === request.auth.uid`.
  - `unreadCounts` may only be incremented by server rules or validated logic (consider Cloud Function guard if necessary).

## Real-time & Offline Behavior

- Use Firestore realtime listeners for messages and connection metadata.
- Ensure optimistic UI for sending messages and uploading images; reconcile on snapshot updates.
- Support basic offline queuing via Firestore SDK where possible; show pending state for outgoing messages.

- Typing status updates must be lightweight and rate-limited (client should send typing=true at start-of-typing and typing=false when paused or on send). Consider debouncing typing=false to avoid flapping.

## Message Sanitization

- All incoming message text must be treated as untrusted input and sanitized before rendering or storing where rendering may interpret markup (web).
- Client-side rules:
  - On web (PWA): continue using `DOMPurify.sanitize()` to strip or neutralize HTML. Prefer storing plain text (no HTML) in Firestore. If you must support HTML/markdown, store a sanitized HTML field and a raw fallback.
  - On React Native: use plain `Text` rendering, but still normalize input (trim, remove control characters, enforce length limits). Do not render raw HTML on native platforms without sanitization.
  - Enforce a maximum message length (e.g. 1000 characters) client-side and server-side.
- Server-side rules:
  - Never trust client-side sanitization alone. Validate message length, character ranges, and that `sender === auth.uid` before persisting. Optionally perform a final sanitization step in a Cloud Function as a guard.
- Logging & monitoring: record sanitization failures or malicious attempts as low-severity security events for analysis.

## Platform, Media & Reliability Requirements (iOS-focused)

- Implement ChatHeaderAvatars component and a sanitization utility:
  - `ChatHeaderAvatars`: render participant avatars with initials fallback, overflow chip, accessibility labels, and tap-to-open-profile behavior.
  - `sanitizeMessage` utility: centralized wrapper that uses `DOMPurify` on web and safe normalization (trim, strip control chars, enforce max length) on native.

Existing validators
-------------------
Note: this repository already contains video validation utilities that should be reused for chat media uploads. See `src/utils/videoValidation.ts` which implements file size and duration checks, thumbnail generation, file-size retrieval, and documents codec caveats (e.g., HEVC/H.265 issues on some Android emulators). Reusing this utility avoids duplication and keeps media validation behavior consistent across the app.

If an equivalent image validator does not yet exist, create `src/utils/imageValidation.ts` that enforces the image-specific rules described above (allowed MIME types, max size, optional client-side JPEG conversion for HEIC/HEIF, compression, and EXIF orientation handling). Add unit tests for both validators and mock implementations under `__mocks__` for test suites.

- Permissions & Push
  - Photo/Camera Permission: iOS requires runtime permissions for camera and photo library (including “limited” photo access). Requirement: request permissions before showing the picker; gracefully handle denial and provide a fallback/error UI that explains how to enable permissions in Settings.
  - Notification Permission: request and verify push permission (APNs/FCM) and persist push tokens (e.g. `users.fcmToken`) for chat push notifications. Handle token refresh and deletion on sign-out.

- Media handling & formats
  - Convert to JPEG for cross-platform compatibility when the device camera returns HEIC/HEIF; define allowed MIME types (e.g. `image/jpeg`, `image/png`, `image/gif`, `video/mp4`).
  - Image compression & size limits: apply client-side compression/resizing before upload (recommended max 2–5 MB and max dimensions 2048px). Enforce the same limits server-side.
  - Thumbnails & previews: generate and store thumbnails for large images and videos to improve bandwidth and performance; store thumbnail URLs alongside the message/document.
  - Orientation & EXIF: preserve and respect image EXIF orientation when displaying images.
  - Download / Save: long-press or context action to save image to device or open native share sheet.
  - Video support: if videos are supported, define duration limits and thumbnail strategy; consider client-side transcoding or server-side transcoding to MP4 for compatibility.

- Upload flow & UX
  - Placeholder message: create an optimistic placeholder message immediately in `connections/{id}/messages` with a client-generated ID and `pending` state while upload is in progress.
  - Upload with progress UI: show upload progress on the placeholder message; allow cancel and retry on failure.
  - Failed state: display a clear error state on failure and expose a retry action.

- Offline, Idempotency & Reliability
  - Offline queueing: queue outgoing messages when offline and reconcile on reconnect. Use client-generated IDs to ensure idempotency and avoid duplicate messages once retries succeed.
  - Idempotency / deduplication: include a stable client-generated message ID in message docs (e.g., `clientMessageId`) so server or client can deduplicate retries.
  - Retries & backoff: implement exponential backoff for retries on transient network failures for both writes and media uploads; expose cancel to the user.
  - Bandwidth controls: allow user preference for high-quality uploads only on Wi‑Fi vs lower-quality on cellular.




## Edge Cases & Error Handling

- If adding a user who is already in the connection, show an informative error instead of failing silently.
- When uploading images, handle failures by allowing retry and converting placeholder message to an error state.
- When a member is removed while user is viewing chat, update UI in-place and show a non-blocking notification.

## Acceptance Criteria

1. Connections list: current user sees all connections, unread badges are correct, tapping opens chat.
2. Chat view: messages arrive in real-time, send text and image messages work with optimistic UI, uploaded images show after Storage update.
2.a Typing indicator: when another participant is typing, an animated ellipses indicator appears in the chat composer area or inline; it disappears when typing stops or after the timeout.
3. Member add: user can add eligible connections; new members appear immediately in the modal and connection doc.
4. Member remove: only the adder can remove a member; remove action is hidden for others and utility enforces permission.
5. Tests: unit tests for `connectionUtils.addUserToConnection` and `removeUserFromConnection`, UI tests for `ManageChatMembersModal`, and integration tests validating message flows (use Firestore emulator).

## Testing Notes

- Unit tests: mock Firestore calls in `connectionUtils.ts` and test permission behavior.
- Component tests: test `ChatListItem`, `ChatModal`, `AddUserToChatModal`, and `ManageChatMembersModal` with React Testing Library / Jest.
- Integration tests: use Firestore emulator to validate end-to-end flows (send message increments unreadCounts, image upload flow works, removal permissions enforced).

- Typing indicator tests:
  - Unit: verify client-side typing throttle/debounce logic produces the right sequence of writes (typing=true then typing=false after timeout).
  - Integration (emulator): simulate user A sending typing events and assert user B sees the typing indicator in near-real-time and it clears after timeout.

- Sanitization tests:
  - Unit: verify the sanitization wrapper used by the client strips HTML tags and control characters and enforces a max length.
  - Integration (emulator): attempt to write a message containing HTML or script tags and assert the stored document contains only sanitized/plain text.



## Next Steps (OpenSpec-driven plan)

1. Extract a minimal set of RPCs to document in OpenSpec (if server endpoints are used):
   - `POST /connections/{id}/messages` (server-side wrapper) — optional, client may write directly to Firestore.
   - `POST /connections/{id}/members` — adds users (wrap `addUserToConnection`).
   - `DELETE /connections/{id}/members/{userId}` — removes user (wrap `removeUserFromConnection`).
2. Generate TypeScript models and client stubs from OpenSpec for any RPCs we expose.
3. Create mock server and contract tests to validate client vs spec.

## References

- PWA components used as reference:
  - `src/components/modals/ChatModal.tsx` (message flows, optimistic placeholder message pattern)
  - `src/components/Chat/ChatListItem.tsx` (connection list item UI)
  - `src/components/pages/Chat.tsx` (main chat page with connections list and message threads)
  - `src/components/modals/ManageChatMembersModal.tsx` (group chat member management)
  - `docs/GROUP_CHAT_MEMBER_LOGIC.md` (permission enforcement for add/remove members)

## Implementation Status (RN)

The following PWA-compatible utilities and types have been implemented in the RN project:

### Types (src/types/)
- ✅ `Message.ts` — Chat message interface matching PWA schema (id, sender, text, imageUrl, createdAt, readBy, clientMessageId, pending)
- ✅ `Connection.ts` — Connection interface (already existed, includes addedUsers tracking)

### Utilities (src/utils/)
- ✅ `connectionUtils.ts` — addUserToConnection, removeUserFromConnection (exact PWA match)
- ✅ `getEligibleUsersForChat.ts` — query eligible users for adding to group chat

### Hooks (src/hooks/)
- ✅ `useRemoveConnection.ts` — hook for deleting connection documents

### Context (src/context/)
- ✅ `NewConnectionContext.tsx` — global state for new connection badge (already existed with enhanced features)

### Components (existing)
- `src/pages/ChatPage.tsx` — chat landing page (basic scaffold)
- `src/components/chat/ChatListItem.tsx` — connection list item component
- `src/components/modals/ChatModal.tsx` — chat modal component

All implemented utilities use identical function signatures, error handling, and Firestore operations
as the PWA to ensure cross-platform data compatibility and consistent behavior.
  - `src/components/Chat/ChatListItem.tsx` (connections list item UI)
  - `src/components/modals/AddUserToChatModal.tsx` (eligible user picker)
  - `src/utils/connectionUtils.ts` (add/remove utility and permission model)
  - `docs/GROUP_CHAT_MEMBER_LOGIC.md` (permission and data model description)

---

Document owner: @team/travel

Update the file as we iterate on requirements and move items from Draft → Ready for Implementation.

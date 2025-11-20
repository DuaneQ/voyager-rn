# Design Notes: Connection & Chat

This document captures architectural guidance for server-side behaviors referenced by the specs.

1. Connection creation idempotency
   - Implement as a server-side Cloud Function or transaction that:
     - Accepts two user UIDs and an idempotency token (e.g., `matchId` or deterministic pair key)
       - Checks for existing connection for the same itinerary-pair (or provided `matchId`) and returns it when matching. The check MUST be scoped to the itinerary identifiers (or `matchId`) rather than solely to the user UID pair.
       - Note: This enables multiple connections between the same two UIDs when each connection represents a different itinerary.
     - Otherwise creates the `connections` doc and writes initial metadata (itinerary summaries,
       `createdAt`, `unreadCounts`, `lastMessagePreview`).
   - Use Firestore transaction or server-side lock to avoid duplicates during near-simultaneous likes.

    Idempotency guidance
    - Prefer a deterministic idempotency key derived from the two itinerary IDs (e.g., `itineraryAId:itineraryBId` sorted) or a server-issued `matchId` generated at match time.
    - The Cloud Function should verify the mutual-like condition (or accept a trusted `matchId`) and perform creation only when no document exists for that itinerary-key. If a document exists for a different itinerary, create a distinct connection record.

2. Message idempotency & uploads
   - Client must include `clientMessageId` when creating optimistic placeholder messages.
   - If the server receives duplicate `clientMessageId` for the same connection it should dedupe.
   - Media uploads: create message doc with `pending=true` and `clientMessageId`, upload to Storage,
     then update the message doc with `imageUrl` and `pending=false`.

6. Reuse existing validators
   - The client and server should reuse `src/utils/videoValidation.ts` for video uploads in chat. This utility already implements file size and duration checks, thumbnail generation via `expo-video-thumbnails`, and documents HEVC/H.265 codec caveats on some Android environments. Reusing it keeps validation behavior consistent and reduces duplicated logic.
   - If an image validator is missing, implement `src/utils/imageValidation.ts` to validate MIME type, size, and perform client-side JPEG conversion/resizing where necessary. Ensure both validators have unit tests and `__mocks__` for the Jest environment.

3. Permission enforcement
   - `addedUsers` array maps `userId -> addedBy` so server utilities can enforce who may remove members.
   - Firestore security rules should mirror these checks for defense-in-depth.

4. Typing events
   - Implement ephemeral typing documents under `connections/{id}/typing/{userId}` with short TTLs
     or use a lightweight presence collection. Typing events are not long-lived and should be rate-limited.

5. Monitoring & Metrics
   - Log duplicate connection creation attempts and dedupe events for later analysis.

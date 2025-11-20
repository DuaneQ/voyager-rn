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

3. Permission enforcement
   - `addedUsers` array maps `userId -> addedBy` so server utilities can enforce who may remove members.
   - Firestore security rules should mirror these checks for defense-in-depth.

4. Typing events
   - Implement ephemeral typing documents under `connections/{id}/typing/{userId}` with short TTLs
     or use a lightweight presence collection. Typing events are not long-lived and should be rate-limited.

5. Monitoring & Metrics
   - Log duplicate connection creation attempts and dedupe events for later analysis.

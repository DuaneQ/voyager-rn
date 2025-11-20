# connections Specification

## Purpose
TBD - created by archiving change add-connection-chat. Update Purpose after archive.
## Requirements
### Requirement: Connections API

The server SHALL provide an idempotent `POST /connections` endpoint that returns an existing connection when the same itinerary-pair (or provided `matchId`) is submitted. Clients MUST include either a `matchId` or the pair of itinerary identifiers used to derive idempotency. The server MUST allow multiple connections between the same two users when those connections correspond to different itineraries.

#### Scenario: Idempotent creation under race (same itinerary)
Given two clients call `POST /connections` with the same user pair and the same itinerary identifiers (or identical `matchId`) nearly simultaneously
When the server receives requests
Then the server creates at most one `connections` document for that itinerary-pair and returns it to both callers

#### Scenario: Distinct itinerary match creates new connection
Given User A and User B previously matched and have an existing `connections` document created for itinerary X
When User A and User B mutually like each other's itinerary Y (a different itinerary)
Then the server MUST create a new `connections` document for itinerary Y (do not treat the previous connection for itinerary X as a blocker)


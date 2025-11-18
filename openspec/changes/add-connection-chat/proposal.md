```markdown

# Proposal: Add Connection & Chat OpenSpec Change

change-id: add-connection-chat

## Summary

Add a minimal set of OpenSpec specs that capture the Connection & Chat requirements documented in
`docs/connection_chat/REQUIREMENTS.md`. The goal is to produce small, actionable spec deltas that
can be validated with `openspec validate` and used to generate TypeScript models and client stubs.

## Scope

- Define API surface for: connections list, messages (post/list), add/remove members, and typing events.
- Capture schemas for `Connection`, `Message`, and `Member` minimal fields required by the client.
- Provide scenarios that encode idempotency, permission checks, and optimistic update behavior.

## Out of scope (for this change)

- Full server-side implementation (Cloud Function code) — this proposal defines contracts only.
- Client UI implementation details — those will be implemented against the generated types/stubs.

## Risks / Notes

- Keep specs minimal: prefer Firestore direct-writes for messages where possible; add RPC wrappers only
  where server-side validation or idempotency is required (e.g. `createConnection`).

## Owner

@team/travel

## Why

Provide a machine-readable contract for the Connection & Chat feature so client and server
implementations stay in sync and generated types/mocks can be used in CI to prevent contract drift.

## What Changes

- Add ADDED requirements for `connections`, `messages`, and `members` capabilities under `specs/`.
- Add `design.md` with server-side guidance for idempotency and uploads.
- Add `tasks.md` that describes validation and generation steps for OpenSpec artifacts.
``` 

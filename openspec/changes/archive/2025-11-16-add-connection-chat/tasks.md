# Tasks for change-id: add-connection-chat

1. Draft spec deltas for `connections` (create/list/get) with scenarios for idempotency and notification.
   - Validation: `openspec validate add-connection-chat --strict` returns no errors for this spec.
2. Draft spec deltas for `messages` (list/post) including `clientMessageId` idempotency and upload flow.
   - Include example request/response for optimistic placeholder -> final message update.
3. Draft spec deltas for `members` (add/remove) and permission semantics (`addedBy` enforcement).
4. Add `design.md` describing server-side idempotency and transaction guidance for Cloud Function.
5. Run `openspec validate add-connection-chat --strict` and fix issues reported by validation.
6. (Optional) Run `openspec generate` to produce TypeScript models and client stubs for the team to consume.

Validation & Acceptance
-----------------------
- `openspec validate` passes with no issues.
- Specs include at least one illustrative example and one scenario demonstrating idempotency.

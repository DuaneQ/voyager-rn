```markdown
# Tasks for change-id: add-connection-chat

## OpenSpec Tasks (Original Scope)

1. Draft spec deltas for `connections` (create/list/get) with scenarios for idempotency and notification.
   - Validation: `openspec validate add-connection-chat --strict` returns no errors for this spec.
2. Draft spec deltas for `messages` (list/post) including `clientMessageId` idempotency and upload flow.
   - Include example request/response for optimistic placeholder -> final message update.
3. Draft spec deltas for `members` (add/remove) and permission semantics (`addedBy` enforcement).
4. Add `design.md` describing server-side idempotency and transaction guidance for Cloud Function.
   - ✅ **COMPLETED** — design.md exists with idempotency guidance
5. Run `openspec validate add-connection-chat --strict` and fix issues reported by validation.
6. (Optional) Run `openspec generate` to produce TypeScript models and client stubs for the team to consume.

## RN Implementation Tasks (Completed)

- ✅ **Add Message type** — Created `src/types/Message.ts` matching PWA schema
- ✅ **Add connectionUtils** — Created `src/utils/connectionUtils.ts` with addUserToConnection, removeUserFromConnection
- ✅ **Add getEligibleUsersForChat** — Created `src/utils/getEligibleUsersForChat.ts`
- ✅ **Add useRemoveConnection hook** — Created `src/hooks/useRemoveConnection.ts`
- ✅ **Verify Connection type** — Confirmed `src/types/Connection.ts` has all required fields including addedUsers
- ✅ **Verify NewConnectionContext** — Confirmed `src/context/NewConnectionContext.tsx` exists (enhanced version)
- ✅ **Update documentation** — Added PWA compatibility notes to REQUIREMENTS.md
- ✅ **Create compatibility guide** — Added PWA_RN_COMPATIBILITY.md with cross-platform guidelines

## Validation & Acceptance

### OpenSpec Validation
- `openspec validate` passes with no issues.
- Specs include at least one illustrative example and one scenario demonstrating idempotency.

### RN Implementation Validation
- ✅ All PWA-compatible utilities implemented with identical function signatures
- ✅ Type definitions match PWA schemas for cross-platform compatibility
- ✅ Documentation includes cross-reference to PWA implementation
- ✅ Compatibility guide created for developers

## Next Steps

1. Implement OpenSpec spec deltas for connections, messages, and members APIs
2. Add unit tests for connectionUtils (mirror PWA tests)
3. Add integration tests for cross-platform message exchange
4. Implement UI components (ChatConnectionsList, ChatConnectionItem, etc.)

``` 

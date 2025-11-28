## Design Notes

Purpose: Keep the Terms of Service acknowledgement flow straightforward and auditable.

Storage model (Firestore):
- `users/{uid}.termsOfService` (map):
  - `accepted`: boolean
  - `acceptedAt`: timestamp
  - `version`: string (useful for future ToS changes)

Client behaviour:
- On app startup (after auth), hook `useTermsAcceptance` reads `users/{uid}.termsOfService.accepted`.
- If missing or `false`, show `TermsOfServiceModal`.
- Modal shows a concise summary, required acknowledgment checkboxes, link to full `TERMS_OF_SERVICE.md` (hosted within repo or remote URL), and Accept / Decline actions.
- Accept: write `termsOfService` map to Firestore and close modal.
- Decline: sign out user via `auth.signOut()` and redirect to login.

UX considerations:
- Modal should be dismiss-blocking (cannot use app without accepting or declining).
- Keep modal compact: summary + required checkboxes; provide a vertical scrollbar for full terms if needed.
- Provide clear feedback while saving acceptance (spinner + disable buttons).

Security & data rules:
- Use existing authenticated Firestore client; ensure server-side rules allow user write to their own `users/{uid}` doc only.

Testing:
- Unit tests for hook (mock Firestore), modal, and guard.
- Integration test to simulate accept and decline flows.

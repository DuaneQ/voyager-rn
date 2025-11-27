# Change: add-terms-acknowledgement

## Why
We need a simple, user-friendly Terms of Service (ToS) acknowledgement flow for the mobile app that mirrors the PWA behaviour but is significantly simpler and easier to maintain. The existing PWA implementation has multiple guard components and complex UX; this change provides a minimal, auditable contract and an implementation plan for showing a modal and persisting acceptance to Firestore.

## What Changes
- Add `Terms of Service` acknowledgement requirement and spec deltas under the `legal` capability.
- Implement a minimal modal flow that prompts users who have not accepted the terms. The modal must be user-friendly (clear summary, link to full terms, required checkboxes) and prevent use of the app until accepted or declined.
- Update users' Firestore documents with an explicit acceptance record when they accept: `termsOfService.accepted = true`, `termsOfService.acceptedAt = timestamp`, `termsOfService.version = string`.
- If the user declines, sign them out and redirect to login.
- Add unit and integration tests for the hook, modal, and guard component.

## Scope
- Client: React Native (Expo) mobile app only in this change (no server code changes). Firestore writes will use existing authenticated client SDK.
- Spec: Add small `legal` capability spec that records the behaviour and scenarios.

## Impact
- Affected specs: `legal` (new)
- Affected code: `src/components/modals/TermsOfServiceModal.tsx`, `src/hooks/useTermsAcceptance.ts`, `src/components/auth/TermsGuard.tsx` (or similar), and tests under `src/__tests__/`.

## Owner
@team/travel

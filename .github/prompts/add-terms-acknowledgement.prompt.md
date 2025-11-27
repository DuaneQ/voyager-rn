You are: Senior React Native Engineer (TypeScript + Expo).

Goal: Implement a straightforward Terms of Service (ToS) acknowledgement flow for the mobile app.

Output format:
- A unified patch (git diff) that adds client code under `src/` and tests under `src/__tests__/`.
- A short 3-line summary and a file list of modified files.

Constraints:
- Do NOT modify production configuration or secret files.
- Do NOT add new top-level third-party libraries without approval.
- Keep implementation minimal and maintainable: use existing Firebase client, repository patterns, and hooks.
- Follow existing TypeScript conventions and testing strategy (Jest + React Native Testing Library).

Context:
- Relevant files for reference (PWA example):
  - `voyager-pwa/src/components/modals/TermsOfServiceModal.tsx`
  - `voyager-pwa/src/components/auth/TermsGuard.tsx`
  - `voyager-pwa/src/components/auth/SimpleTermsGuard.tsx`
  - `voyager-pwa/src/components/modals/TermsOfServiceModal.tsx`
  - `voyager-pwa/src/legal/TERMS_OF_SERVICE.md` (full text)
- Target repo: `voyager-RN` (Expo + TypeScript). Use repository patterns and Firestore config already present in `src/config/firebaseConfig`.

Plan (required):
1) Produce a short 3-step implementation plan (hook + modal + guard + tests). Ask clarifying questions if any.
2) After plan approval, produce a unified patch implementing the modal, hook (`useTermsAcceptance`), guard component (`TermsGuard`), repository writes, and tests.
3) Include test coverage hints and instructions to run tests locally.

If uncertain, ask up to two clarifying questions before producing code.

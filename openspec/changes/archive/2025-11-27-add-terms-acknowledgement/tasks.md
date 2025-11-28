## Tasks

1. [x] Draft spec delta for `legal` capability: `openspec/changes/add-terms-acknowledgement/specs/legal/spec.md` (ADDED Requirements with scenarios).
2. [x] Implement React Native components and hooks:
   - [x] `src/components/modals/TermsOfServiceModal.tsx` (mobile-friendly modal with embedded terms)
   - [x] `src/hooks/useTermsAcceptance.ts` (hook that checks Firestore and writes acceptance)
   - [x] `src/components/auth/TermsGuard.tsx` (guard wrapper that uses the hook and shows modal)
3. [x] Add Firestore update logic in a repository/service layer using existing `repositories/` pattern.
4. [x] Add unit tests for the hook and modal using Jest + React Native Testing Library.
5. [x] Add integration test that verifies the guard prevents use until acceptance and signs out on decline.
6. [x] Run `openspec validate add-terms-acknowledgement --strict` and fix issues.
7. [x] Integrate TermsGuard into AppNavigator (wraps authenticated navigation stack).
8. [x] Add comprehensive integration tests for AppNavigator with TermsGuard (20 tests covering all flows).
9. [x] Fix all test failures - **46/46 tests passing** ✅
   - TermsOfServiceModal: 10/10 ✅
   - TermsGuard: 9/9 ✅  
   - useTermsAcceptance: 7/7 ✅
   - AppNavigator integration: 20/20 ✅
10. [x] Fix decline button behavior - uses AuthContext.signOut for proper state management ✅
11. [ ] Open PR with implementation, include prompt and the spec change, tag `ai-generated` if AI assisted.


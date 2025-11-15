# Docs Reference

This reference lists the newly organized documentation files (created as part of the docs consolidation), with a one-line description for each. Originals in the top-level `docs/` folder have been left intact for safety — confirm before any deletions or moves.

## High-level folders

- docs/ci/ — Continuous integration, native build, and automation troubleshooting docs.
- docs/videos/ — Video features, fixes, and related notes.
- docs/ai_itineraries/ — AI itinerary-specific docs and feature notes.
- docs/profile/ — Profile feature implementation and parity notes.

---

## docs/ci/

- docs/ci/ANDROID_SETUP.md — Android setup notes for local development, CI runners, and emulator configuration.
- docs/ci/TROUBLESHOOTING_IOS.md — iOS troubleshooting steps (pods, dev-client, Xcode build issues) collected during debugging.
- docs/ci/INTEGRATION_TESTS_CI_SETUP.md — How integration tests run in CI, emulator setup, and environment variables required.
- docs/ci/INTEGRATION_TESTS_FIXED.md — Summary of fixes applied to make integration tests stable (workarounds, config changes).
- docs/ci/COMPREHENSIVE_INTEGRATION_TESTS.md — End-to-end plan and checklist used to validate integrations across services.
- docs/ci/SCRIPTS_GUIDE.md — Explanation of local helper scripts used by the team (what they do and how to run them).
- docs/ci/SCRIPTS_CONSOLIDATION_SUMMARY.md — Rationale and notes from consolidating multiple ad-hoc scripts into a smaller set.

## docs/videos/

- docs/videos/VIDEO_AUDIO_FIX.md — Notes and steps that fixed video/audio issues on iOS/Android (codec, export, playback fixes).
- docs/videos/VIDEO_DELETE_FEATURE.md — Design and implementation notes for deleting videos from the gallery and server cleanup.

## docs/ai_itineraries/

- docs/ai_itineraries/SHARE_FEATURE_FIX.md — Fixes and regression notes for the AI itinerary share feature.

## docs/profile/

- docs/profile/ITINERARY_CARD_PROFILE_PHOTO_FIX.md — Fixes for profile photo display in itinerary cards and related rendering bugs.
- docs/profile/PROFILE_PWA_PARITY.md — Profile page implementation notes to match the PWA (fields, validation, UI, tests).

## docs/auth/

- `docs/auth/AUTH_CONTEXT_EXPLAINED.md` — Beginner-friendly explanation of `AuthContext`, startup/restore behavior, platform differences (SecureStore vs AsyncStorage), and quick flow diagrams.
- `docs/auth/AUTH_FLOW_CODE_REVIEW.md` — Comprehensive code review for signup/login/logout, token handling, Google Sign-In flow, and security recommendations for junior engineers.
- `docs/auth/AUTH_SECURITY_ANALYSIS.md` — (existing) Detailed security analysis for authentication flows.
- `docs/auth/README.md` — (existing) Overall auth documentation and setup notes.

---

## Notes & Next Steps

- Originals: The original files in the top-level `docs/` directory remain unchanged. This consolidation created copies under the folders above for easier discovery.

- Review: Please review the consolidated files. If you'd like, I can either:
  - Move the originals to `docs/archived/` (non-destructive), or
  - Delete the originals after your approval, or
  - Keep both sets until a formal review is completed.

- Automation/automation cleanup: I have not deleted or modified the `automation/` folder (contains Appium/WebdriverIO assets). Confirm if you want it archived or removed.

- Follow-ups I can do next (pick any or ask for another):
  1) Move original top-level docs into `docs/archived/`.
  2) Delete archived/unused automation and e2e artifacts (`automation/`, `e2e/`) after your confirmation.
  3) Run a repository search for remaining references to removed testing tools and update README/CI pipelines.
  4) Create a short PR-ready commit message and changelog entry describing these doc changes.

---

Completion summary

- Files created: consolidated docs under `docs/ci/`, `docs/videos/`, `docs/ai_itineraries/`, `docs/profile/`.
- Next recommended action: review `docs/REFERENCE.md` and confirm whether originals and automation artifacts should be archived or removed.

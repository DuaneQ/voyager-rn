# Project Context
```markdown
# Project Context

## Purpose
Voyager-RN is a React Native (Expo) mobile replica of the Voyager PWA. Its goal is
to provide parity in user-facing features (swipe-style itinerary matching, AI-generated
itineraries, real-time chat, video sharing, and usage tracking) while following
improved architecture and S.O.L.I.D. design patterns for maintainability and testability.

This repository targets mobile platforms (iOS and Android) while supporting React Native
Web where feasible. It must remain compatible with the shared Firebase backend used by
the PWA.

## Tech Stack
- TypeScript (strict)
- React Native (Expo SDK 54) + React Navigation
- Firebase Web SDK (Auth, Firestore, Storage, Functions)
- expo-av (video playback), expo-file-system, expo-video-thumbnails
- Jest + React Testing Library for unit/component tests
- Detox/Cypress for E2E (project provides scripts for integration tests)
- Node.js for scripts and dev tooling

## Project Conventions

### Code Style
- Strict TypeScript (`strict: true`) — avoid `any` unless explicitly justified.
- Prettier & ESLint conventions (follow existing code style in repository).
- Functional components only; prefer hooks over class components.
- Keep production code free of test-only branches or hacks — use mocks in `__mocks__` instead.

### Architecture Patterns
- Clean Architecture / S.O.L.I.D. separation:
	- `components/` contain pure UI components (presentational only).
	- `services/` implement business logic and external API interactions.
	- `repositories/` abstract data access to Firebase (Repository Pattern).
	- `models/` contain domain types and interfaces.
	- `hooks/` coordinate services and state for components.
	- `context/` houses global providers (UserProfile, Alerts, etc.).
- Single source of truth patterns: e.g., viewability logic for video feed driven by `onViewableItemsChanged`.
- Platform adapters isolate platform differences (storage, file access, audio config).

### Testing Strategy
- Unit tests: Jest + React Testing Library for components, services, and hooks.
- Integration tests: run against Firebase emulators (or `__mocks__`) for Cloud Functions and Firestore flows.
- E2E: Detox (native) or Cypress (web emulator) for full user flows — scripts are provided in `scripts/`.
- Mocks: Use `__mocks__/` for Expo modules and Firebase; tests must not modify production code for mocks.
- CI: run `npx tsc --noEmit`, `npm test`, and optionally contract checks against OpenSpec-derived mocks.

### Git Workflow
- Branching: feature/*, fix/*, chore/* naming. Main branch is protected.
- Commits: concise imperative messages, reference ticket IDs when available.
- PRs: include description of changes, testing notes, and any required migration steps.

## Domain Context
- Core domain: travel itinerary matching, user profiles, connections, chat, and media (videos).
- Usage tracking and premium feature gating are critical (daily quotas, premium unlocks).
- AI generation pipeline (multi-stage) is server-driven — UI reads canonical metadata under `response.data.metadata`.

## Important Constraints
- Never change production code purely to make tests pass; prefer improving test harnesses or mocks.
- Firebase security rules are authoritative; client must assume server-side validation for privileged operations.
- Keep Firebase project selection (dev vs prod) explicit and avoid embedding secrets in code.
- Performance: minimize Firestore reads (5-minute search cache pattern used in PWA).

## External Dependencies
- Firebase (Auth, Firestore, Storage, Functions)
- OpenAI (used server-side via Cloud Functions for itinerary generation)
- Google Places / SerpAPI (third-party data used by functions)
- Stripe (payments, webhooks handled server-side)
- Expo modules: `expo-av`, `expo-file-system`, `expo-video-thumbnails`, `expo-secure-store` for web/mobile adapters

## How OpenSpec fits this project
- Use OpenSpec to document any public or internal HTTP RPCs (Cloud Functions) and to drive
	generation of types, client code, mock servers, and CI contract tests.
- Source-of-truth for API contracts should be the OpenSpec definitions; client code and tests
	should be generated or validated against them to prevent drift.

--

Add or update this file with any project-specific rules you want OpenSpec-based tools and
AI assistants to respect when generating code, tests, or prompts.

```

## Context

TravalPass has zero conversion from paid traffic. A CRO expert analyzed 23 Clarity session recordings and Google Ads data, then produced a full landing page redesign mockup. This design document captures the technical decisions for implementing the CRO recommendations across the React Native (Expo) + React Native Web app.

**Stakeholders**: Product owner, CRO expert, development team
**Reference mockup**: `docs/CRO_EXPERT_1/travalpass-redesign.html`

## Goals / Non-Goals

**Goals:**
- Increase visitor-to-signup conversion from 0% to measurable rate (target: 5–10% of landing page visitors)
- Reduce signup friction (fewer required fields, less context-switching)
- Provide immediate value preview before requiring full profile completion
- Instrument full conversion funnel for data-driven iteration

**Non-Goals:**
- Redesigning the core matching algorithm or search experience
- Changing the subscription/premium model
- Rebuilding authentication infrastructure (Firebase Auth stays)
- Internationalizing the landing page (English-only for now, despite German traffic)

## Decisions

### D1: Landing Page Architecture
- **Decision**: Enhance the existing `src/pages/LandingPage.web.tsx` (1,513 lines) with CRO-recommended sections. The page already has hero, trust strip, demo videos, Problem→Solution comparison, feature highlights, swipeable itinerary cards, FAQ (card-based), footer CTA, sticky bottom bar, SEO meta tags, and legal modals. New additions: social proof ticker, active traveler cards strip, testimonial section, accordion FAQ (replacing card FAQ), and rewired CTAs to open signup modal. Mobile app keeps current direct-to-auth pattern — App Store listing serves as the mobile "landing page".
- **Rationale**: The existing page is substantial and already responsive. Creating a second landing page would be wasteful. The CRO gaps are specific additions (social proof, testimonial, better CTA wiring) — not a full rebuild. Modifying one file avoids fragment duplication and preserves existing SEO.
- **Alternatives considered**: (a) Create new `LandingPage.tsx` from scratch — rejected, duplicates 1,500 lines of working responsive code. (b) Separate marketing site — rejected, adds deployment complexity. (c) Native onboarding carousel — rejected for MVP, App Store listing is the natural conversion surface.

### D2: Signup Flow — Multi-Step Modal
- **Decision**: Replace current AuthPage 4-mode system with a multi-step modal for signup. Keep existing login flow intact (modal variant for "Sign in" link).
- **Steps**: 1) Email + Social auth buttons → 2) Verification → 3) Optional password → 4) Blurred matches preview + "Add My Trip"
- **Rationale**: CRO expert's mockup shows 30% less form fields and immediate value preview. Each step is a micro-commitment, reducing perceived effort.
- **Implementation**: New `SignupModal.tsx` component with step state machine. AuthPage remains for direct navigation but defaults to showing the modal.

### D3: Username Deferral
- **Decision**: Remove username from signup. Collect during profile completion (first profile edit or onboarding prompt).
- **Rationale**: Username adds cognitive load at signup. Most social apps collect display names later. Firebase Auth doesn't require username.
- **Migration**: Existing users unaffected. New users get `displayName` from social provider or email prefix as temporary username. Profile page prompts for username on first visit.

### D4: Verification Method (DECIDED)
- **Decision**: Option B — Firebase Email Link (Magic Link). User enters email → receives link → clicks link → auto-verified and returned to app. UI shows "Check your inbox" screen with submitted email.
- **Rationale**: Zero backend work, Firebase-native, one-click verify. Reduces friction vs current flow (no sign-in-again step). Avoids custom Cloud Function + email sender cost.
- **v2 consideration**: If Magic Link conversion proves low (users not clicking email links), upgrade to Option A (Custom OTP via Cloud Function with 4-digit code UI matching CRO mockup).
- **Rejected**: (A) Custom OTP — deferred to v2. (C) Current flow — highest friction, contributing to 0% conversion.

### D5: Analytics Implementation
- **Decision**: Lightweight analytics service wrapping Firebase Analytics (`logEvent`). No third-party analytics SDK to avoid bundle size and cost.
- **Event naming**: snake_case, prefixed by funnel stage (`landing_`, `signup_`, `onboard_`, `match_`)
- **Rationale**: Firebase Analytics is already in the project (used by Clarity integration). Google Ads conversion import directly supports Firebase events.

### D6: Social Proof Data (DECIDED)
- **Decision**: Option A — Hardcoded milestone copy ("80+ travelers matched"). Updated manually as user base grows (80+ → 100+ → 500+).
- **Rationale**: TravalPass is pre-traction. Milestone-based copy is standard practice (Tourlina, TripBFF, Tinder all use rounded milestones). Zero cost, zero complexity. Precise live numbers actually convert worse than rounded milestones.
- **Upgrade path**: Swap to Option C (cached aggregate via scheduled Cloud Function writing one Firestore doc) when user growth reaches ~10+ signups/day and manual updates become a chore. This is a 5-line change.
- **Rejected**: (B) Real-time Firestore — costly per-visitor reads on landing page with ad traffic. (C) Cached aggregate — unnecessary overhead at current scale.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Deferred username causes confusion | Users see email prefix as display name | Prompt for username in onboarding Step 4 or first profile visit |
| Multi-step modal increases perceived complexity | Users abandon mid-flow | Each step is <15s; progress indicator shows 3 steps total; Step 4 shows value |
| Magic Link emails land in spam | Users never verify | Add "Check spam" copy; consider OTP fallback in v2 |
| Analytics events add bundle size | Minimal | Firebase Analytics already bundled; wrapper is ~50 lines |
| Landing page increases initial load time (web) | Bounce rate stays high | Lazy-load below-fold sections; optimize hero for FCP |

## Migration Plan

1. **No database migration needed** — username becomes optional field (already nullable in Firestore)
2. **Existing users unaffected** — login flow unchanged; only signup flow changes
3. **Feature flag**: `ENABLE_NEW_SIGNUP_FLOW` environment variable to toggle between old/new during rollout
4. **Rollback**: Remove feature flag to revert to current AuthPage

## Open Questions

1. ~~Verification method~~ — **DECIDED: Firebase Magic Link (D4)**
2. ~~Mobile onboarding carousel~~ — **DECIDED: Rely on App Store listing (Option B)**. ASO optimization is a separate task.
3. ~~Social proof data source~~ — **DECIDED: Hardcoded milestone copy (D6)**
4. Should German-language landing page variant be prioritized given ad traffic from Germany?
5. Ad campaign targeting: should we switch from Display Network to Search Network given keyword data shows intent-based queries?

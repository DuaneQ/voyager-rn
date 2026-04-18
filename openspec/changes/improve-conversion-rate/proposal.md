# Change: Improve App Conversion Rate

## Why
TravalPass is spending $94/week on Google Ads with **zero conversions** (4,283 impressions, 23 Clarity sessions, 0 signups in Mar 23–30 2026). Session recordings show users landing on mobile, seeing the page for ~5 seconds with no clicks, and bouncing. The current landing page lacks social proof, trust signals, and a compelling CTA. The signup flow requires username + 10-character password + email verification (leave app to check inbox), creating high friction. After signup, users land in an empty search tab with no guided onboarding.

A CRO expert was engaged and produced a redesigned landing page mockup (`docs/CRO_EXPERT_1/travalpass-redesign.html`) and session analysis (`docs/CRO_EXPERT_1/OBSERVABILITY/`).

## What Changes

### Landing Page (MODIFIED — `src/pages/LandingPage.web.tsx`)
- Enhance existing 1,500-line landing page with CRO-recommended additions: social proof ticker, active traveler cards strip, testimonial section, accordion FAQ (replace current card-based FAQ)
- Existing sections retained and refined: hero (update CTA copy to "Match My Trip"), trust strip, demo videos, Problem→Solution comparison, feature highlights, itinerary cards, footer CTA, sticky bottom bar
- Wire CTAs to open new signup modal instead of navigating to AuthPage
- Mobile app: App Store listing serves as conversion surface (no landing page changes needed)

### Auth Flow (MODIFIED)
- Redesign signup to email-first 3+1 step modal: Email → Verify → Optional password → Blurred matches preview
- Defer username collection to profile completion (remove from signup form)
- Elevate Google/Apple social sign-in as primary option
- Firebase Magic Link for email verification (user clicks link in inbox → auto-verified, stays in-modal flow)

### Post-Signup Onboarding (NEW)
- Blurred matches preview teaser after verification (Step 4 of signup)
- Guided first-itinerary creation ("Add My Trip" CTA)
- Profile completion progress indicator

### Analytics Instrumentation (NEW)
- Full conversion funnel event tracking: landing → CTA click → signup start → email entered → verified → profile complete → first itinerary → first match
- Google Ads conversion goals aligned with funnel stages
- Microsoft Clarity already partially integrated (session recordings active)

## Impact
- Affected specs: `auth` (new), `landing-page` (new), `onboarding` (new), `analytics` (new)
- Affected code:
  - `src/pages/LandingPage.web.tsx` — add social proof ticker, traveler cards, testimonial, accordion FAQ; refine hero CTA; wire CTAs to signup modal
  - `src/pages/AuthPage.tsx` — signup flow redesign
  - `src/components/auth/forms/RegisterForm.tsx` — field reduction
  - `src/components/auth/forms/LoginForm.tsx` — CTA copy changes
  - `src/context/AuthContext.tsx` — deferred username, new verification flow
  - `src/navigation/AppNavigator.tsx` — onboarding gates
  - `src/components/search/AddItineraryTooltip.tsx` — replaced by guided onboarding
  - New `src/components/auth/SignupModal.tsx`
  - New analytics service/hook

## Evidence
- Google Ads report: 4,283 impressions, $94.24 cost, 0 conversions (Mar 23–28 2026)
- Microsoft Clarity: 23 sessions, median ~5s duration, ~74% with 0 clicks, 100% single-page exits
- CRO expert redesign mockup: `docs/CRO_EXPERT_1/travalpass-redesign.html`
- Session recordings: `docs/CRO_EXPERT_1/OBSERVABILITY/Clarity_TravalPass_23_Recordings_*.csv`
- Search term data: `docs/CRO_EXPERT_1/ADS/Searches(Search_2026.03.23-2026.03.28).csv`

## Pending Decisions
1. ~~**OTP vs Magic Link vs Current**~~: **DECIDED — Option B (Firebase Magic Link)**. Zero backend work, Firebase-native. OTP (Option A) deferred to v2 if Magic Link conversion is low.
2. ~~**Mobile landing page**~~: **DECIDED — Option B (App Store listing)**. App Store screenshots/description serve as the conversion surface for mobile. App goes straight to auth. Will need help optimizing App Store listing.
3. ~~**Social proof data source**~~: **DECIDED — Option A (Hardcoded milestone copy)**. Use milestone-based copy like "80+ travelers matched". Upgrade to cached aggregate (Option C) when adding ~10+ users/day.

## 1. Analytics Instrumentation (Foundation — Do First)
- [ ] 1.1 Define conversion funnel events schema (event names, properties, types)
- [ ] 1.2 Create analytics service abstraction (`src/services/analytics/AnalyticsService.ts`)
- [ ] 1.3 Instrument landing page: `landing_page_view`, `cta_click`, `social_proof_interaction`
- [ ] 1.4 Instrument auth flow: `signup_start`, `email_entered`, `verification_sent`, `verification_complete`, `password_set`, `signup_complete`
- [ ] 1.5 Instrument onboarding: `onboarding_start`, `first_itinerary_start`, `first_itinerary_complete`, `first_match_view`
- [ ] 1.6 Configure Google Ads conversion tracking goals
- [ ] 1.7 Verify Clarity session recording captures new pages

## 2. Landing Page Enhancement (Web — `src/pages/LandingPage.web.tsx`)
_Existing page already has: hero + 3-step value prop, trust strip, demo videos (3), Problem→Solution comparison, feature highlights (4 cards), swipeable itinerary cards, FAQ (6 card-based questions), footer CTA, sticky bottom bar (10s delay), legal modals, SEO meta tags, app store badges._

- [ ] 2.1 Refine existing hero section: update CTA copy to "Match My Trip", update trust microcopy to "Free forever · No card required · Just your email"
- [ ] 2.2 Add social proof ticker component above hero (traveler count, active destinations, avg match time)
- [ ] 2.3 Add active traveler cards strip (horizontal scroll) below hero
- [ ] 2.4 Replace existing demo videos section with CRO promo video (`public/MatchingPromo.mov`). Compress source .mov (71 MB) to web-optimized .mp4 (<5 MB target). Display in phone-frame mockup or autoplay inline with muted loop.
- [ ] 2.5 Add testimonial section (star rating, quote, author, "Verified match" badge)
- [ ] 2.6 Convert existing card-based FAQ to accordion FAQ (click to expand/collapse)
- [ ] 2.7 Wire all CTAs ("Match My Trip", footer CTA, sticky bar, overflow card) to open signup modal instead of navigating to AuthPage
- [ ] 2.8 Hardcode social proof milestone copy ("80+ travelers matched", active destinations, avg match time)
- [ ] 2.9 Add analytics events for all CTA interactions

## 3. Auth Flow Optimization
- [ ] 3.1 Redesign signup modal as multi-step: Step 1 (Email + Google/Apple), Step 2 (Verify), Step 3 (Optional password), Step 4 (Blurred preview + "Add My Trip")
- [ ] 3.2 Implement step indicator component (1-2-3 progress dots)
- [ ] 3.3 Implement email-first Step 1: email input + Google sign-in button + trust microcopy
- [ ] 3.4 Implement verification Step 2 using Firebase Email Link (Magic Link) — show "Check your inbox" screen with email displayed, auto-advance on link click
- [ ] 3.5 Implement optional password Step 3 with checkbox toggle
- [ ] 3.6 Implement blurred matches preview Step 4 with "Add My Trip" CTA
- [ ] 3.7 Remove username requirement from signup (defer to profile completion)
- [ ] 3.8 Update `AuthContext.tsx` to support new flow (deferred username, optional password)
- [ ] 3.9 Ensure backward compatibility with existing users
- [ ] 3.10 Add analytics events for each step transition and drop-off

## 4. Post-Signup Onboarding
- [ ] 4.1 Create guided first-itinerary flow triggered from signup Step 4 "Add My Trip" CTA
- [ ] 4.2 Implement profile completion progress indicator (% or step count)
- [ ] 4.3 Optimize App Store listing (screenshots, description, keywords) for conversion — separate ASO task
- [ ] 4.4 Replace or enhance existing tooltips (`AddItineraryTooltip`, `SelectItineraryTooltip`) with onboarding flow
- [ ] 4.5 Add "complete your profile" nudge for users who skip profile fields
- [ ] 4.6 Add analytics events for onboarding progress

## 5. Verification & Iteration
- [ ] 5.1 Run `npx tsc --noEmit` — zero type errors
- [ ] 5.2 Run `npm test` — all tests pass
- [ ] 5.3 Manual test: full funnel on web (landing → signup → verify → onboarding → first itinerary)
- [ ] 5.4 Manual test: full funnel on iOS and Android
- [ ] 5.5 Verify analytics events fire correctly in dev
- [ ] 5.6 Verify Google Ads conversion tracking receives events
- [ ] 5.7 Deploy and monitor Clarity sessions for first 48 hours
- [ ] 5.8 Compare conversion rate week-over-week after launch

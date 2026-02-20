% Google Ads → TravalPass Ads Prototype: Field-by-field mapping

Purpose
- Capture the step-by-step Google Ads "Create a campaign" flow and map each step to a pragmatic, prioritized field set for the TravalPass ads prototype (MVP).

How to use
- Use this file to implement UI fields, backend models, and analytics hooks in priority order. Keep the prototype minimal: implement the "Recommended prototype fields" column first.

1) Account & onboarding
- Google Ads: business name, website, linked accounts (YouTube, Google Business Profile), billing country/timezone, payment method.
- Prototype (recommended): advertiser profile (name, display URL), optional `linkExternalAccount` boolean, billing contact placeholder. Capture timezone for reporting.

2) Campaign objective / goal
- Google Ads: objective selector (Sales, Leads, Website traffic, Brand awareness, App installs).
- Prototype (recommended): `objective` enum {Awareness, Traffic, Conversions, VideoViews}. Objective drives available creative templates and reporting buckets.

3) Campaign type
- Google Ads: Search, Display, Video, Shopping, Performance Max.
- Prototype (recommended MVP): `type` enum {SearchLike, VideoFeed, NativeItinerary}. Start with `VideoFeed` + `NativeItinerary` placements.

4) Campaign settings
- Google Ads fields: campaign name, start/end dates, ad schedule, locations, languages, networks.
- Prototype (recommended): `name`, `startTs | endTs`, `locations[]` (geo by city/country/radius), `adSchedule` (optional for MVP). Default network -> app placements.

5) Budget & bidding
- Google Ads: daily budget, total budget, bidding strategy (Manual CPC, Maximize clicks, Target CPA), bid limits.
- Prototype (recommended): `budgetCents` (daily), `billingModel` {CPM,CPC}, optional `maxBidCents` for CPC. Keep simple: fixed daily budget + model selection.

6) Targeting
- Google Ads: keywords (Search), audiences, demographics, remarketing lists, topics, affinity, in-market.
- Prototype (recommended): `targeting` object with keys: `locations`, `destinations` (itinerary destinations), `dateRanges` (travel window), `ageRange` (optional), `interests` (predefined buckets e.g., beach, adventure, food). Keyword-like matching -> `keywords[]` (optional later).

7) Ad groups / grouping
- Google Ads: ad groups (theme + keyword set) with group-level bids.
- Prototype (recommended): skip for MVP — campaigns directly contain creatives; add lightweight `adGroup` later if needed for finer controls.

8) Creatives & assets
- Google Ads: responsive assets (headlines, descriptions), image uploads, video uploads, asset combinations, ad extensions.
- Prototype (recommended): `creatives[]` with `type` (image|video), `headline`, `body`, `cta` (from set), `assetUrl`, `thumbUrl`, `aspectRatio`. Provide immediate live preview for each placement type.

9) Conversion tracking & measurement
- Google Ads: conversion actions, pixel, global site tag, Google Analytics linking.
- Prototype (recommended): expose `conversionActions[]` names and map platform hooks to events: `ad_impression`, `ad_click`, `ad_conversion`. Provide recommended analytics event names and payload schema in the campaign summary (so experiments can wire to GA/Firebase).

10) Review & launch + policy checks
- Google Ads: preview, policy checks, submit, billing verification.
- Prototype (recommended): preview for each placement, client-side validation (file types, lengths), basic automated moderation checks on upload, and a final `validateCampaign()` step before creating campaign record. Show errors inline.

11) Reporting & billing
- Google Ads: realtime metrics, spend, geo breakdown, conversions, attribution windows.
- Prototype (recommended MVP): aggregated counters for impressions, clicks, spend; per-placement breakdown and CSV export for reconciliation. Tie spend to prepay balance and decrement on events.

Priority implementation checklist (MVP order)
- 1: Campaign objective + type + name + dates + daily budget + billingModel
- 2: Targeting (locations, destinations, date ranges, interest buckets)
- 3: Creative upload + simple builder (headline, body, CTA) + preview for VideoFeed
- 4: Ad selection API (`/ads/select`) and client impression logging (`/events`)
- 5: Reporting counters (impressions, clicks, spend) and mapping to analytics events
- 6: Basic moderation checks and preview validation

Notes
- Keep the prototype UX small and opinionated — map objectives to a restricted set of templates (e.g., Awareness -> VideoFeed template). Defer auction/bidding and advanced audience features (remarketing lists, custom intent) to post‑MVP.

References
- Google Ads help: "Set up your first campaign" and related docs (internal link captured in project research).

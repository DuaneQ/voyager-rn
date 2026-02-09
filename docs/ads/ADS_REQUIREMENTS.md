% TravalPass — Ads Requirements (Single Doc)

Status: Draft — single source of truth for Ads PWA (ads.travalpass.com)

1. Purpose
- Build a self‑serve advertiser PWA (ads.travalpass.com) for local businesses and travel brands. The PWA will allow advertisers to create campaigns, upload creatives (images/videos), set targeting (location, itinerary destination, travel dates, demographics, behaviors), and pay via Stripe. Ads are delivered into the existing TravalPass apps (React Native mobile + web) in three placements: Video Feed, Itinerary Feed, and Promotion slots in AI Itinerary / Add Itinerary.

2. High Level Goals
- Monetize via predictable pricing for advertisers (CPM primary, CPC optional).
- Preserve end‑user experience and privacy, allow opt‑out and ad flagging.
- Reuse repo components (video upload, feeds, Cloud Functions, Stripe) where possible.

3. Scope (MVP)
- Advertiser PWA: account onboarding, campaign CRUD, creative upload, targeting, budget, Stripe prepay.
- Backend: campaign store, creatives store, ad selection callable endpoint, impression/click event ingestion, basic reporting counters.
- Client changes: render ads in Video Feed, Itinerary Feed, AI Itinerary/ Add Itinerary slots; log impressions and clicks.
- Moderation: basic automated checks + manual moderation queue for flagged creatives.

4. Placements & UX
- Video Feed: inline video/image ad cards integrated into existing feed; ads should look native but labeled "Sponsored".
- Itinerary Feed: promoted itinerary cards (native card UI), placement within feed.
- AI Itinerary / Add Itinerary: small promotion slot on itinerary detail and add flows (native promoted suggestion).

5. Targeting Dimensions
- Location (country / region / city / radius)
- Itinerary destination (match campaign city → itinerary.destination)
- Travel dates (match `startDay` / `endDay` ranges)
- Demographics (age, gender) — only if user consent given
- Behavioral signals (video engagement thresholds, recent searches)

6. Monetization
- Supported models for MVP:
  - CPM (Cost per 1,000 impressions) — primary model for brand awareness placements.
  - CPC (Cost per click) — optional for performance campaigns.
- No auction/bidding in MVP; use deterministic selection (priority + rotation) and support pricing tiers.

7. Key Metrics (must capture)
- Impressions (ads rendered in viewable area)
- Clicks (user taps/clicks creative or CTA)
- CTR (clicks / impressions)
- Spend (charged to advertiser)
- eCPM (revenue / impressions * 1000)
- Video metrics: play starts, watch time, VCR (25/50/100%)
- Unique reach & frequency, geo breakdown, device/platform

8. Creative Specs (MVP — follow FB/Google/TikTok parity)
- Image: JPG/PNG; 1:1 (1080x1080) and 1.91:1 (1200x628); max 5 MB
- Video: MP4 (H.264), AAC; aspect ratios 9:16, 1:1, 16:9; up to 1080p; recommended 6–30s; max 50 MB (MVP); captions recommended
- Text: Headline <=60 chars, Body <=125 chars, CTA from set {Book, Visit, Call, Learn More}

9. Privacy, Consent & Compliance
- Add app-level personalized ads toggle; provide opt‑out.
- Use hashed identifiers for targeting; avoid storing PII in ad event logs.
- Update Privacy Policy and TOS; ensure App Store / Play compliance; honor iOS ATT requirements.

10. Moderation & Abuse
- Automated checks at upload for file types, sizes, and obvious policy violations.
- User flagging: clients can flag ads; flagged items go to manual moderation queue and may be suspended.

11. Integration Points (reuse existing repo)
- Video upload + `VideoService` / `useVideoUpload` — creative ingestion and storage.
- Video renderer components (`VideoCardV2`, `VideoGrid`) — render video/image creatives.
- Itinerary hooks (`useAllItineraries`, `useAIGeneratedItineraries`) — for destination-based targeting.
- Stripe integration — payments and prepay flows.
- Cloud Functions (httpsCallable) — ad selection and event ingestion endpoints.

12. Minimal Data Model (MVP)
- `campaigns`: id, advertiserId, name, startTs, endTs, budgetCents, model ('CPM'|'CPC'), placements[], targeting, status, priority
- `creatives`: id, campaignId, type ('image'|'video'), storageUrl, thumbnailUrl, width, height, durationSec, status
- `events`: id, eventType('impression'|'click'), campaignId, creativeId, impressionId, hashedUserId?, placement, ts

13. API Surface (high-level)
- POST /campaigns — create campaign (advertiser authenticated)
- GET /campaigns/:id — campaign details
- POST /campaigns/:id/creatives — upload creative
- POST /ads/select — returns ad for placement (server-side selection)
- POST /events — log impression/click
- GET /reports/campaign/:id — aggregated metrics

14. Security & Anti‑Fraud
- Rate limit event ingestion; validate impression window (prevent repeated impression spam).
- Monitor click patterns for anomalies; suspend campaigns with suspicious activity.

15. Operational & Cost Considerations
- Store creatives on Cloud Storage + CDN to control egress costs.
- Stream `events` into BigQuery (or export) for analytics and billing reconciliation as volume grows.
- Estimate storage and read/write costs in pilot phase; include Stripe fees in pricing model.

16. Deliverables & Next Steps
1. Finalize this requirements doc with sign-off (product/legal/engineering).
2. Design API contracts (detailed request/response) and data schema migrations.
3. Prototype PWA skeleton (auth + campaign CRUD + creative upload) and secure hosting plan.
4. Implement server-side `selectAd` + `events` endpoints (staging) and client integration hooks.
5. Pilot with 3–5 local advertisers; collect metrics and iterate pricing.

17. Decisions Needed
- Confirm placements UI: full-width promoted itinerary vs inline native card for itinerary feed.
- Confirm prepay vs postpay for MVP (recommend prepay).
- Confirm which demographic fields can be used for targeting (product/legal).

Document history
- Created: 2026-02-07

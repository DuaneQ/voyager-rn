% TravalPass Ads — PRD (MVP)

Status: Draft

Purpose
- Create a simple, self‑serve advertising product for local businesses and travel brands that delivers ads into:
  - Video Feed (video/image creatives)
  - Itinerary feed (promoted itinerary cards)
  - Promotion slots in AI Itinerary and Add Itinerary flows

High‑level goals
- Monetize with low operational overhead and predictable pricing for advertisers.
- Preserve user experience and privacy; allow opt‑out and user flagging.
- Reuse existing repo infrastructure (video upload, feeds, Cloud Functions, Stripe).

Monetization model (MVP)
- Supported models: CPM (primary) and CPC (optional). No auction bidding.
- CPM: charge per 1,000 impressions for brand/awareness placements (video feed, itinerary feed).
- CPC: optional performance option for campaigns that want pay‑per‑click (book/visit) billing.
- CPA: deferred — implement later when conversion tracking and cost model are clear.

Metrics (must capture)
- Impressions: each time an ad creative is rendered in a viewable position.
- Clicks: user clicks/taps the ad CTA or creative.
- CTR (click through rate): clicks / impressions (simple quality indicator).
- Spend: money charged to advertiser (by CPM or CPC).
- eCPM: (revenue / impressions) * 1000.
- Video metrics: play starts, watch time, video completion rates (VCR) at 25/50/100%.
- Unique reach and frequency, platform (iOS/Android/web), geo breakdown.

Targeting
- Dimensions to support in MVP:
  - Location (country / region / city / radius)
  - Itinerary destination matching (match campaign city → itinerary.destination)
  - Travel dates (match `startDay`/`endDay` ranges)
  - Demographics from profile (age, gender) — only with user consent
  - Behavioural signals (video engagement thresholds, recent searches)

Creative specifications (industry‑standard, FB/Google/TikTok parity)
- Image ads
  - Formats: JPG, PNG
  % TravalPass Ads — PRD (MVP)

  Status: Final — Drafted single consolidated PRD

  Owner: TravalPass Product

  Purpose
  - Build a self‑serve advertiser PWA (ads.travalpass.com) for local businesses and travel brands. The PWA enables campaign creation, creative upload, targeting, and Stripe prepay billing. Ads are delivered natively into TravalPass consumer apps (iOS, Android, Web) at these placements: Video Feed, Itinerary Feed, AI Itinerary and Add Itinerary promotion slots.

  Scope (MVP)
  - Advertiser PWA: onboarding, campaign CRUD, creative upload, targeting, budgets, Stripe prepay.
  - Backend: campaign/creative store, server-side ad selection endpoint, impression/click ingestion, basic reporting counters.
  - Client changes: render ads in Video Feed, Itinerary Feed, AI Itinerary/Add Itinerary; log impressions and clicks; user flagging.

  Goals
  - Enable advertisers to launch campaigns quickly with minimal ops.
  - Monetize via CPM (primary) and CPC (optional); no auction bidding.
  - Preserve user trust, privacy, and UX; provide opt‑out and flagging.

  Out of scope (MVP)
  - Auction bidding, CPA billing, native advertiser mobile app, advanced ML fraud detection, automated refunds.

  Ad Placements & UX Rules
  - Video Feed: inline native video/image cards labeled "Sponsored"; frequency caps enforced.
  - Itinerary Feed: promoted itinerary cards displayed inline.
  - AI Itinerary / Add Itinerary: small contextual promotion slot.
  - Ads must not block core flows; users can flag ads and see "why am I seeing this?" info.

  Targeting
  - Supported: location, itinerary destination, travel dates, platform.
  - Conditional (consent required): age, gender.
  - Deferred: retargeting, lookalikes.

  Monetization & Billing
  - Models: CPM (default) and CPC (optional). Both impressions and clicks logged; billing based on campaign model.
  - Pricing: flat tiers (no auction), minimum campaign spend enforced, Stripe prepay (credits) for MVP.

  Billable Event Rules
  - Billable Impression (CPM): >=50% visible and >=1 second on screen, campaign active and within budget, frequency cap not exceeded.
  - Billable Click (CPC): one billable click per user×ad per 24h, must follow a valid impression and pass anomaly checks.

  Creative Specs
  - Image: JPG/PNG; 1:1 (1080×1080) & 1.91:1 (1200×628); max 5 MB.
  - Video: MP4 (H.264), AAC; 9:16, 1:1, 16:9; <=1080p; bitrate <=8 Mbps (<=5 Mbps recommended); 6–30s recommended, <=60s max; max 50 MB; captions recommended.
  - Text: Headline <=60 chars; Body <=125 chars; CTA from standard set.

  Moderation & Abuse
  - Automated upload checks for format and size; user flagging sends creatives to moderation queue; admins can pause/reject creatives.

  Privacy & Compliance
  - App-level personalized ads toggle; hashed identifiers only; no PII exposure to advertisers; ATT respected on iOS; update Privacy Policy/TOS.

  Metrics & Reporting
  - Capture: impressions (total & billable), clicks (total & billable), CTR, spend, eCPM/eCPC, video metrics (starts, watch time, VCR), reach & frequency, geo/platform breakdown.
  - Reporting UI: daily aggregates, CSV export.

  Minimal Data Model
  - Campaign: id, advertiserId, name, startTs, endTs, billingModel, rates, budgetCents, spentCents, placements[], targeting, status, priority.
  - Creative: id, campaignId, type, storageUrl, thumbnailUrl, width, height, durationSec, status.
  - Event: id, type(impression|click), campaignId, creativeId, impressionId, hashedUserId?, placement, ts, billed(bool), nonBillableReason?

  API Surface (high-level)
  - POST /campaigns
  - GET /campaigns/:id
  - POST /campaigns/:id/creatives
  - POST /ads/select
  - POST /events
  - GET /reports/campaign/:id

  Security & Anti‑Fraud (MVP)
  - Rate-limit event ingestion; deduplicate clicks; frequency caps; budget pacing; anomaly flagging; automatic campaign pause and manual review for disputes.

  Operational Notes
  - Store creatives in Cloud Storage + CDN; stream events to BigQuery for analytics if needed; estimate storage/egress costs and include in pricing decisions.

  Delivery Plan (recommended)
  - Week 1: schema + API + ad selection + event ingestion
  - Week 2: PWA advertiser UI (auth, campaign CRUD, upload) + Stripe prepay
  - Week 3: client ad renderer + logging + frequency caps
  - Week 4: moderation + pilot

  Launch Criteria
  - End-to-end campaign flow verified; billing accurate and auditable; ads labeled; no blocking UX issues; pilot advertisers active.

  Decisions Needed
  - Confirm placements UI (full-width promoted itinerary vs inline native card).
  - Confirm prepay vs postpay (recommend prepay).
  - Confirm demographic fields allowed for targeting.

  Document History
  - Created: 2026-02-07
  - Consolidated: 2026-02-07

Cloud Storage + CDN for creatives

Stripe for payments (prepay only)

4. Ad Placements (MVP)
Supported Placements

Video Feed

Inline native cards

Video or image creatives

Clearly labeled “Sponsored”

Itinerary Feed

Promoted itinerary cards

Inline native placement

AI Itinerary / Add Itinerary

Small native promotion slot

Contextual to destination

UX Rules (Hard Requirements)

Ads must never block core flows

Frequency caps enforced

“Sponsored” label always visible

User can flag ads

“Why am I seeing this?” explanation

5. Targeting (MVP)
Supported

Location (country / region / city / radius)

Itinerary destination match

Travel date overlap

Platform (iOS / Android / Web)

Conditional (Consent Required)

Age

Gender

Deferred

Retargeting

Lookalikes

Advanced behavioral segments

6. Monetization & Billing
Billing Models

Each campaign selects one primary model:

CPM (default)

CPC (optional)

Both impressions and clicks are always logged, but only the selected model is billed.

Pricing

Flat pricing tiers (no auction)

Minimum campaign spend enforced

Stripe prepay only (credits)

7. Billable Event Definitions
Billable Impression (CPM)

An impression is billable if:

≥ 50% of creative visible

≥ 1 second on screen

Campaign active, approved, in budget

Frequency cap not exceeded

Billable Click (CPC)

A click is billable only if:

One click per user × ad × 24h

Follows a valid impression

Results in ≥ 800ms meaningful interaction

Passes frequency & anomaly checks

Non-billable clicks are logged but never charged.

8. Anti-Fraud & Safeguards (MVP)
Required

Click deduplication

Frequency caps (impressions & clicks)

Budget pacing

Rate-limited event ingestion

Anomaly flagging (CTR spikes, clustered clicks)

Enforcement

Automatic campaign pause

Manual admin review

Credits issued for approved disputes

9. Metrics & Reporting
Required Metrics

Impressions (total / billable)

Clicks (total / billable)

CTR

Spend

eCPM / eCPC

Video metrics (start, watch time, 25/50/100%)

Reach & frequency

Geo + platform breakdown

MVP Reporting UI

Daily aggregates (table view)

CSV export

No charts required

10. Creative Specifications
Image

JPG / PNG

1:1 (1080×1080), 1.91:1 (1200×628)

Max 5 MB

Video

MP4 (H.264), AAC audio

9:16, 1:1, 16:9

≤ 1080p, ≤ 8 Mbps (≤ 5 Mbps recommended)

6–30s recommended, ≤ 60s max

Max 50 MB

Captions recommended

Text

Headline ≤ 60 chars

Body ≤ 125 chars

CTA from standard set

11. Moderation & Policy

Automated upload checks (type, size, format)

User flagging from consumer apps

Manual moderation queue

Admin ability to pause / reject creatives

12. Privacy & Compliance

Personalized ads opt-out

Hashed identifiers only

No PII exposed to advertisers

ATT respected (iOS)

Updated Privacy Policy & TOS

App Store & Play compliance required

13. Data Model (MVP)
Campaign
id, advertiserId, name, startTs, endTs,
billingModel, rates, budget, spent,
placements[], targeting, status, priority

Creative
id, campaignId, type, storageUrl,
thumbnailUrl, width, height, duration, status

Event
id, type, campaignId, creativeId,
impressionId, hashedUserId?, placement, ts,
billed, nonBillableReason?

14. API Surface (MVP)

POST /campaigns

GET /campaigns/:id

POST /campaigns/:id/creatives

POST /ads/select

POST /events

GET /reports/campaign/:id

15. Delivery Plan
Week 1

Schema + API implementation

Ad selection + event ingestion

Week 2

Advertiser PWA (auth, CRUD, upload)

Stripe prepay

Week 3

Client ad rendering

Logging + frequency caps

Week 4

Moderation + pilot launch

Pricing & pacing tuning

16. Launch Criteria

End-to-end campaign flow works

Billing is accurate and auditable

Ads are clearly labeled

No blocking UX issues

Pilot advertisers active

17. Final Decisions (Locked)

✅ Web dashboard only

✅ CPM + guarded CPC

✅ Prepay billing

❌ No auction

❌ No CPA in MVP
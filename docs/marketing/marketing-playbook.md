Marketing Playbook — Customer-First Validation & Quick Experiments

Purpose
- Single, consolidated playbook combining: customer-first guidance, GA tracking plan, FB post variants, survey + interview questions, analysis plan, and Google Sheets setup.
- Use as the single source for running short validation experiments in travel communities.

Core thesis
- Follow the "All In Startup" approach: learn from paying or high-intent users early via low-cost experiments (landing pages, presales, FB posts, concierge MVPs) and prioritize feature development by evidence.

Key objectives & KPIs
- Acquisition: sign-ups, landing-page conversions.
- Activation/Engagement: average session duration (engagement_time), DAU/WAU, D1/D7 retention.
- Intent: % willing-to-pay (WTP), % opt-in for interviews/presale.
- Efficiency: CAC, conversion by channel.

Customer-first summary (from customer-first.md)
- Validate before building: presales, landing pages, manual MVPs.
- Use sales & interviews as primary learning — iterate product based on buyer behavior.
- Track sign-ups AND quality of use (session time, retention).

Quick experiment: FB group test (A/B)
- Three conversational posts (no survey tone): Companion / Itinerary / Video feed.
- Use distinct variant tag (A|B|C) and group/source param in form links to attribute responses.
- Keep posts casual, ask one-line prompts, collect replies in comments or structured form.

Three conversational captions (ready to post)
- Variant A — Companions
  "Hey — quick question from a fellow traveler. When was the last time you wanted a travel buddy and couldn’t find one? Tell me in one line what stopped you."
- Variant B — Itineraries
  "I just spent forever planning a trip — what part do you always dread? One quick line, please."
- Variant C — Video Feed
  "When you need a fast travel tip or local idea, where do you go? One line — and do you trust it?"

Form + fields (if using a short form)
- Screener: travel frequency and traveler type.
- Core fields: `group`, `variant`, `travels_per_year`, `planning_pain`, `current_solution`, `wtp_bucket`, `opt_in_chat` (optional), `email` (optional).
- Use unique link per group or `?variant=A&group=Name` params.

Survey & interview questions (short)
- Problems: hard to find companions; cross-site logistics; short/trustworthy tips; coordinating with friends; other.
- Interest probe: Not / Maybe / Definitely for each feature (companion / itinerary / video feed).
- Open: what do you use today to solve this?
- WTP buckets and opt-in for follow-up interviews.
  - Interview guide: 15 min script included in this playbook.

Analysis & decision rules (digestible)
- Compute per-respondent: problem_score, interest_score, wtp_score, high_intent flag.
- Aggregate: % reporting each problem, mean interest per feature, % WTP threshold, % opt-ins.
- Decision thresholds: market signal if a feature has >=20% "Very" interest AND >=15% WTP or >=15% opt-in.
- Prioritize features by interest × feasibility (use prioritization matrix).

Google Sheets & reporting (summary)
- Import responses to `Responses` sheet; add computed columns: `willing_to_pay_binary`, `high_intent`.
- Summary sheet: total responses, responses by variant, % willing-to-pay, % opt-ins by variant.
- Charts: variant counts, WTP distribution stacked bar, % WTP per variant, top pain themes, funnel (reach→clicks→completions→opt-ins).
  - See the "Google Sheets & reporting" section above for formulas and chart steps.

Presentation deliverables
- One-page executive summary: sample size, top feature, % very interested, % willing to pay, recommendation.
- Slides: variant performance, WTP distribution, top pain themes with quotes, funnel, recommended experiments.

Next experiments by outcome
- Match wins: concierge matching pilot (manual), track match success & retention.
- Itinerary wins: pay-per-itinerary service or sold credits trial.
- Video feed wins: curated short feed prototype; measure daily engagement & shares.

Files & resources (in this repo)
- `docs/marketing/marketing-playbook.md` — canonical playbook (this file).
- `docs/marketing/customer-first.md` — GA tracking notes and background (reference).
- `docs/marketing/facebook-responses-template.csv` — CSV sample import
- `docs/marketing/images/*.svg` — 1200×1200 headline assets

Note: supporting drafts and setup docs were consolidated into this playbook to avoid duplication. If you prefer archived copies, I can move them to `docs/marketing/archive/` instead of deleting.

How to use this Playbook (practical)
1. Pick target FB groups and post one variant per group (or stagger). Keep wording identical except `variant` tag.
2. Collect comments &/or form responses for 7–14 days or until target sample (min 30/variant).
3. Import responses to the sheet, run the Summary metrics, and review mid-test at ~50 responses.
4. Run 10–20 interviews from high-intent respondents to validate qualitative insights.
5. Decide (pivot/prioritize/scale) using decision rules; record the decision in `customer-first.md`.

Suggested ownership & cadence
- Owner: Product lead or growth lead (runs posts + responses). Analyst: owner or contractor to update Google Sheet daily. Weekly sync to review early signals.

Quick checklist before posting
- Confirm group rules and moderator permission if required.
- Prepare one form link per variant with `variant` param.
- Upload one 1200×1200 image per post (SVGs in `docs/marketing/images` can be exported).
- Setup Google Sheet and named ranges before importing.

Status
- This Playbook consolidates the existing marketing docs into a single reference. Originals remain in `docs/marketing/` for traceability.


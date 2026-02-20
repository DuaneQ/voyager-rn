Customer-first Marketing (based on "All In Startup")

Purpose
- Capture a customer-first marketing approach that prioritizes validated demand and evidence over product push.
- Define KPIs and analytics events (Google Analytics / Firebase Analytics) to measure both sign-ups and real user engagement (time-on-app).

Summary of the approach
- Validate before building at scale: run small, fast experiments (landing pages, presales, concierge MVPs) to confirm real willingness to buy or use.
- Use sales and discovery conversations as the primary learning mechanism — track outcomes and iterate.
- Prioritize metrics that matter to business viability: conversion, CAC, LTV, and actual user engagement (average session duration / engagement time).

Primary objectives & KPIs
- Acquisition: sign-ups (convert visitors → sign-ups). KPIs: weekly sign-ups, conversion rate (landing page → sign-up).
- Activation & engagement: time-on-app per session (average engagement time), daily active users (DAU), weekly active users (WAU), retention (D1, D7, D30).
- Efficiency: CAC (cost-per-acquisition) and conversion rate by channel.
- Revenue (longer-term): paid conversions, LTV, payback period.

Why session time matters
- Sign-ups alone are insufficient: users who sign up but never engage don't create value. Measuring session duration (or engagement_time) helps distinguish casual sign-ups vs meaningful users.
- Use session metrics to prioritize product improvements that increase engagement and retention, not just acquisition.

Recommended Google Analytics (GA4 / Firebase) tracking plan
- Use GA4 or Firebase Analytics SDK for consistent event naming. Track all events with clear names and parameters.

Core events to log
- `app_open` / `first_open` — when user opens the app. (built-in)
- `screen_view` — with parameter `screen_name` (built-in / standard).
- `sign_up` — params: `method` (email|google|apple), `plan` (if applicable), `source` (referrer or campaign).
- `session_start` — (GA4 built-in). Use engagement metrics from GA4 for session duration (`engagement_time_msec`).
- `engaged_session` or `engagement_time` (optional custom event) — send aggregated engagement time if needed for bespoke dashboards.
- `complete_onboarding` — mark activation milestone.
- `purchase` / `subscribe` — if monetization exists.

Event parameter suggestions
- `source`, `medium`, `campaign` — for acquisition attribution.
- `user_type` — new|returning.
- `experiment` — name of the presale/experiment or landing page variant.

Implementation notes (React Native / Expo)
- Use `@react-native-firebase/analytics` or `expo-firebase-analytics` depending on stack.
- Log events where they naturally occur (e.g., `logEvent('sign_up', {method, source})` after successful sign-up).
- For session/engagement time: rely on GA4's built-in engagement metrics where possible. If you must send custom engagement time, calculate durable engagement time and log periodically or on app background/exit.

Naming conventions
- Use lower_snake_case for event names and parameters.
- Keep event names short and consistent across platforms.

Dashboards & reports to build in GA4
- Acquisition funnel: landing page → sign-up → activation (complete_onboarding).
- Conversion by channel: campaign / source / medium → sign-ups and cost metrics (if importing cost data from ad platforms).
- Engagement overview: average engagement time per user, sessions per user, DAU/MAU.
- Retention cohorts: D1, D7, D30 and rolling retention graphs.
- Funnel explorations: measure drop-off points and optimize the highest-leak steps.

Quick experiments (customer-first) to run
- Landing page presale: create a short landing page describing the core value prop + a clear CTA to pre-sign or reserve. Measure conversion and experiment variants (A/B copy, price/test offers).
- Concierge MVP: manually deliver the service for the first customers and collect feedback; track how many convert to paying vs how many churn.
- Early-bird purchase test: take payment or refundable deposit to validate willingness to pay.
- Discovery interviews: target 10–20 interviews with prospect customers; use an interview script focused on problems, frequency, and willingness to pay.

Measurement thresholds (example benchmarks to iterate against)
- Landing page conversion: target 5–10% for a validated landing page (benchmark varies by audience).
- Activation rate: percent of sign-ups who reach `complete_onboarding` within 7 days — aim >30% initially and improve over time.
- Average session duration: aim for meaningful sessions (e.g., >2 minutes) depending on app use case; focus on upward trend rather than absolute at first.
- Retention: D7 > 20% is a strong early sign for many consumer apps (varies by category).

Playbook: how to run a customer-first campaign
1. Hypothesis: e.g., "Digital nomads will pre-pay for a personalized travel route builder if it saves them time." Write the hypothesis and the measurable outcome.
2. Experiment design: landing page + limited presale spots. Create two variants (different value props). Set tracking for campaign source, experiment name.
3. Run acquisition (small paid spend + organic outreach to community forums and partners).
4. Measure: conversions, sign-ups, and session engagement for users who sign up. Interview 5–10 sign-ups within first week.
5. Decide: pivot, iterate, or scale based on conversion + engagement data.

Action items for the team
- Instrument the GA4/Firebase events listed above and confirm they appear in real-time before running experiments.
- Create a GA4 dashboard with Acquisition, Engagement, and Retention tabs.
- Build a landing page template and one presale experiment for the next 2 weeks.
- Run 10 discovery interviews in parallel with the landing page to collect qualitative signals.

Appendix: sample sign-up logging (pseudo-code)

```ts
// Example using firebase analytics
import analytics from '@react-native-firebase/analytics';

async function recordSignUp(method: string, source?: string) {
  await analytics().logEvent('sign_up', {
    method,
    source: source || 'organic',
  });
}

// Record screen view
await analytics().logScreenView({screen_name: 'OnboardingStep1'});
```

Notes & references
- This document follows the customer-first validation philosophy advocated by Diana Kander in "All In Startup": use early sales and tests to validate demand before scaling product development.
- Focus on both acquisition (sign-ups) and quality of usage (session duration, engagement) when deciding to iterate or scale.

Files changed
- Added: docs/marketing/customer-first.md



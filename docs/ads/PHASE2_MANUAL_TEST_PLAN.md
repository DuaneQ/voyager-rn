# Phase 2 — Manual Test Plan
**Itinerary Feed & AI Slot Ad Delivery**

**Date**: March 21, 2026  
**Environment**: `mundo1-dev` (development Firebase project)  
**Branch**: `phase2_rn`

---

## Prerequisites

### 1. Verify a live `itinerary_feed` test campaign exists

Run the check script:
```bash
cd /Users/icebergslim/projects/voyager-RN
node check-campaigns.js
```

You should see at least one `active` campaign with `placement: itinerary_feed`.

If **none exist**, seed one directly in the Firebase Console (`mundo1-dev` → Firestore → `ads_campaigns` collection) with these required fields:

```json
{
  "status": "active",
  "placement": "itinerary_feed",
  "creativeType": "image",
  "name": "Phase 2 Test — Itinerary Feed",
  "businessName": "Test Hotel Co",
  "primaryText": "Book your dream stay!",
  "cta": "Book Now",
  "landingUrl": "https://example.com",
  "assetUrl": "https://picsum.photos/800/400",
  "billingModel": "cpm",
  "startDate": "2026-03-01",
  "endDate": "2026-12-31",
  "dailyBudget": 100,
  "totalBudget": 1000,
  "spentToday": 0,
  "totalSpent": 0
}
```

> **Targeting note**: Omit `targetDestination`, `targetGender`, `ageFrom`, `ageTo` to make it broad-match (serves all users regardless of context).

### 2. Verify a live `ai_slot` test campaign exists

Similarly check for `placement: ai_slot`. Seed if missing:

```json
{
  "status": "active",
  "placement": "ai_slot",
  "creativeType": "image",
  "name": "Phase 2 Test — AI Slot",
  "businessName": "Tokyo Tours Co",
  "primaryText": "Guided tours in Tokyo!",
  "cta": "Explore Now",
  "landingUrl": "https://example.com/tokyo",
  "assetUrl": "https://picsum.photos/800/400",
  "billingModel": "cpc",
  "startDate": "2026-03-01",
  "endDate": "2026-12-31",
  "dailyBudget": 100,
  "totalBudget": 1000,
  "spentToday": 0,
  "totalSpent": 0
}
```

### 3. Open Metro / Dev console
```bash
cd /Users/icebergslim/projects/voyager-RN
npm start
```
Keep the Metro terminal visible — the `[🎯 ADS-TEST]` log lines are essential for verifying ad delivery.

### 4. Have an itinerary on the test account
The TravalMatch page (iOS/Android/Web) requires at least one saved itinerary to trigger ad fetching. If your test account has none, create one via the app's **Add Itinerary** button.

---

## Test Cases

---

### T1 — Itinerary Feed: Ad fetched when itinerary selected

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open the app, navigate to **TravalMatch** tab | Page loads, shows itinerary selector |
| 2 | Select an itinerary from the dropdown | — |
| 3 | Watch Metro console | `[🎯 ADS-TEST] useAdDelivery(itinerary_feed) → selectAds context:` log appears with `destination`, `travelStartDate`, `travelEndDate` fields |
| 4 | Watch Metro console | `[🎯 ADS-TEST] useAdDelivery(itinerary_feed) ← N ad(s):` appears with `N ≥ 1` |

**Pass criterion**: Ads are fetched with the correct context immediately after itinerary selection.

---

### T2 — Itinerary Feed: Interstitial appears after exactly 3 like/dislike actions

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Complete T1 (itinerary selected, ads fetched) | Organic `ItineraryCard` visible |
| 2 | Press ✕ or ✈️ twice | Still showing organic card |
| 3 | Press ✕ or ✈️ a 3rd time | **Sponsored interstitial card slides in**, replacing the organic card |

**Pass criterion**: The `SponsoredItineraryCard` replaces the organic card on the 3rd action. No ad appears before the 3rd action.

---

### T3 — Itinerary Feed: Sponsored card renders correctly

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Trigger the interstitial (from T2) | — |
| 2 | Inspect the card | Shows business name (e.g. "Test Hotel Co"), primary text ("Book your dream stay!"), a CTA button ("Book Now"), and a **Sponsored** badge |
| 3 | Inspect Metro console | `[🎯 ADS-TEST] trackImpression QUEUED: <campaignId>` log appears exactly once |

**Pass criterion**: Card renders all fields; impression event is queued in the tracker.

---

### T4 — Itinerary Feed: CTA press fires click and dismisses ad

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | With sponsored card showing, press **Book Now** | Browser/in-app link opens (or attempts to — simulator may not open external URLs) |
| 2 | Watch Metro console | `[🎯 ADS-TEST] trackClick QUEUED: <campaignId>` log appears |
| 3 | Observe app | Card dismisses; organic `ItineraryCard` returns |

**Pass criterion**: Click event queued AND ad dismissed on CTA press.

---

### T5 — Itinerary Feed: Dismiss (✕) dismisses without click event

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Trigger the interstitial again (do 3 more actions from a fresh state / re-select itinerary) | Sponsored card appears |
| 2 | Press the **✕** dismiss button on the card | Card disappears; organic card returns |
| 3 | Watch Metro console | `trackClick` log does **NOT** appear; only the original `trackImpression` from T3 |

**Pass criterion**: Dismiss does not fire a click event.

---

### T6 — Itinerary Feed: Events flush to server within 10 seconds

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Complete T3 (impression queued) | — |
| 2 | Wait 10–12 seconds | `[🎯 ADS-TEST] useAdTracking FLUSHING 1 event(s):` appears in Metro console |
| 3 | Metro console | `FLUSH RESULT: processed=1 skipped=0` |
| 4 | Open Firebase Console → `ads_campaigns` → the test campaign doc | `impressions` counter has incremented (or `logAdEvents` Firestore log entry visible) |

**Pass criterion**: Impression event reaches the server and is processed without errors.

---

### T7 — Itinerary Feed: Impression deduplicated within session

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Dismiss the ad (T5) | Organic card returned |
| 2 | Do 3 more actions to trigger the same campaign again | Sponsored card appears |
| 3 | Watch Metro console | `[🎯 ADS-TEST] trackImpression DEDUPED (already sent this session): <campaignId>` log appears, NOT a new QUEUED log |

**Pass criterion**: Second impression for the same campaign is deduplicated — no double billing.

---

### T8 — Itinerary Feed: Counter persists across itinerary switches

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Start with a fresh state (re-open app or navigate away and back) | — |
| 2 | Select itinerary A. Do 2 actions (dislike/like). | No ad yet |
| 3 | Select a **different** itinerary B | Counter persists (still at 2) |
| 4 | Do 1 more action | Ad appears immediately (3rd total action across session) |
| 5 | Do 2 more actions after the ad is dismissed | No new ad yet |
| 6 | Do 1 more action | Next ad appears (6th total action, every 3rd triggers ad) |

**Pass criterion**: Ad trigger counter is cumulative across the entire session, spanning itinerary switches.

---

### T9 — Itinerary Feed: Targeting context — gender and age

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Ensure your test account has `dob` and `gender` set in Profile | — |
| 2 | Select an itinerary | — |
| 3 | Watch Metro console for `selectAds context:` log | JSON includes `"gender": "Male"/"Female"` and `"age": <number>` matching your profile |

**Pass criterion**: Demographic context is passed to `selectAds`.

---

### T10 — Itinerary Feed: Targeting context — travel preferences

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Ensure your test account has a saved Travel Preferences profile with activities and a travel style set | — |
| 2 | Select an itinerary | — |
| 3 | Watch Metro console for `selectAds context:` log | JSON includes `"activityPreferences": [...]` and `"travelStyles": [...]` |

**Pass criterion**: Activity/style preferences from the user's travel profile are sent for ad targeting.

---

### T11 — AI Slot: Real campaign ad appears in AI itinerary promotions section

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Navigate to **AI Itineraries** tab (or open an existing AI itinerary) | AI itinerary view loads |
| 2 | Scroll to the **Promotions** section | Section is visible |
| 3 | Watch Metro console | `[🎯 ADS-TEST] useAdDelivery(ai_slot) ← N ad(s):` with `N ≥ 1` |
| 4 | Inspect the promotions list | The first item(s) show campaign data (business name "Tokyo Tours Co", CTA "Explore Now") rather than AI-generated hallucinated promotions |

**Pass criterion**: Real campaign ads appear at the top of the promotions list, above any AI-generated ones.

---

### T12 — AI Slot: Impression tracked when promotion card is visible

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Complete T11 (real ad visible in promotions) | — |
| 2 | Expand the Promotions section if collapsed | — |
| 3 | Watch Metro console | `[🎯 ADS-TEST] trackImpression QUEUED: <campaignId>` appears |
| 4 | Wait 10–12 seconds | `FLUSHING … FLUSH RESULT: processed=1 skipped=0` |

**Pass criterion**: Impression event queued on visibility and flushed to server.

---

### T13 — AI Slot: Click tracked on CTA press

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | With a real ad promotion visible (T11), press its CTA button | External URL opens (or attempts to) |
| 2 | Watch Metro console | `[🎯 ADS-TEST] trackClick QUEUED: <campaignId>` appears |

**Pass criterion**: Click event queued on CTA press.

---

### T14 — AI Slot: Broad-match ad appears regardless of destination

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open an AI itinerary with destination **Paris** | — |
| 2 | Confirm `[🎯 ADS-TEST] useAdDelivery(ai_slot)` context log shows `"destination": "Paris"` | — |
| 3 | The Tokyo Tours Co ad (no `targetDestination` set) still appears | Broad-match campaign appears for non-matching destination |

**Pass criterion**: Campaigns without a `targetDestination` serve to all destinations.

---

### T15 — Negative: No ad when daily budget exhausted

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | In Firebase Console, set the test campaign's `spentToday` to equal its `dailyBudget` (e.g. both = 100) | — |
| 2 | Re-select an itinerary (forces a fresh `selectAds` call) | — |
| 3 | Do 3 actions | No sponsored card appears |
| 4 | Metro console | `[🎯 ADS-TEST] DROPPED … dailyBudget` or `useAdDelivery(itinerary_feed) ← 0 ad(s)` |
| 5 | Reset `spentToday` to 0 after the test | — |

**Pass criterion**: Exhausted-budget campaign is excluded from the response.

---

### T16 — Negative: Gender-targeted ad excluded for wrong gender

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Create a second test campaign with `placement: itinerary_feed`, `targetGender: "Male"` | — |
| 2 | Log in as a test account with `gender: "Female"` in profile | — |
| 3 | Select an itinerary and watch Metro console `selectAds` logs | `DROPPED … targetGender=Male ≠ userGender=Female` appears for that campaign |
| 4 | The gender-targeted campaign does NOT appear in the ad pool | — |

**Pass criterion**: Gender hard filter correctly excludes ineligible campaigns.

---

## Results Log

| Test | Date | Tester | Platform | Pass / Fail | Notes |
|------|------|--------|----------|-------------|-------|
| T1 | | | iOS/Android/Web | | |
| T2 | | | | | |
| T3 | | | | | |
| T4 | | | | | |
| T5 | | | | | |
| T6 | | | | | |
| T7 | | | | | |
| T8 | | | | | |
| T9 | | | | | |
| T10 | | | | | |
| T11 | | | | | |
| T12 | | | | | |
| T13 | | | | | |
| T14 | | | | | |
| T15 | | | | | |
| T16 | | | | | |

---

## Debug Commands

### Watch only ad delivery logs
```bash
npx expo start 2>&1 | grep "ADS-TEST"
```

### Re-check campaigns in dev Firestore
```bash
cd /Users/icebergslim/projects/voyager-RN && node check-campaigns.js
```

### Force flush tracking events (navigate away from ad screen in-app)
The `useAdTracking` hook flushes on unmount, so navigating to a different tab forces any buffered events to send immediately.

---

## What to do when a test fails

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `← 0 ad(s)` in console | No active campaigns for this placement | Seed campaign via Firestore Console |
| `← 0 ad(s)` + context shows correct destination | `endDate` in the past | Set `endDate` to a future date |
| `DROPPED … dailyBudget` unexpectedly | `spentToday ≥ dailyBudget` | Reset `spentToday` to 0 |
| `DROPPED … targetGender ≠ ...` | Gender hard filter | Seed a broad-match campaign (no `targetGender`) |
| Sponsored card never appears on 3rd action | `sponsoredAds.length === 0` at that moment | Confirm `selectAds` returned ads (check T1 first) |
| Impression/click not in console | Hook mock still in place / wrong build | Confirm you're running a dev build, not a test runner |
| `FLUSH RESULT: processed=0 skipped=1` | Event deduplication (expected for T7) | Confirm this is the second impression for the same campaign |

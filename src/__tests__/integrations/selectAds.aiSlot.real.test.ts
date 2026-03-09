/**
 * Integration Tests — selectAds ai_slot targeting
 *
 * Covers the manual E2E test cases for intent-based ad placements:
 *   3.3  Activity preference targeting (positive + negative)
 *   3.4  Travel style targeting (positive + negative)
 *   3.5  Destination string matching (positive + negative)
 *   3.6  Travel date range overlap (positive + no-dates = still eligible)
 *   4.2  Seen campaign penalty (seen campaign ranks below unseen peer)
 *
 * Strategy — rank-based assertions:
 *   Each test seeds a "signal" campaign (has the targeting field being tested)
 *   alongside a "blank" campaign (no targeting fields → always scores 0 on that
 *   dimension). With a matching userContext the signal campaign must appear at a
 *   lower index (higher rank) than the blank campaign. With a non-matching
 *   context the two campaigns are expected to be at equal score or the blank
 *   may outrank the signal.
 *
 * Cleanup:
 *   ALL seeded campaign IDs are tracked in `createdCampaignIds` and deleted in
 *   afterAll. Both the campaign doc AND any daily_metrics sub-collection docs
 *   are removed.
 *
 * Cost per run:
 *   - Firestore reads/writes: ~60–80 operations (well within free tier)
 *   - Cloud Function invocations: ~12
 *   - No external API calls (Google Places, OpenAI, etc.)
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Remove emulator overrides — we call the LIVE dev environment.
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIREBASE_FUNCTIONS_EMULATOR;

const FIREBASE_API_KEY = 'AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0';
const PROJECT_ID = 'mundo1-dev';
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net`;
const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname, '..', '..', '..', 'mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json',
);

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for today in UTC — safe for campaign startDate/endDate. */
function todayUTC(): string {
  return offsetDate(0);
}

/** Returns YYYY-MM-DD offset by `days` from today (UTC). */
function offsetDate(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ── Admin SDK ─────────────────────────────────────────────────────────────────

let adminApp: admin.app.App;
function getAdminDb(): admin.firestore.Firestore {
  if (!adminApp) {
    adminApp = admin.initializeApp(
      { credential: admin.credential.cert(SERVICE_ACCOUNT_PATH) },
      `selectAds-aiSlot-test-${Date.now()}`,
    );
  }
  return adminApp.firestore();
}

// ── Guard — skip on CI runners without service account ───────────────────────

const canRunLive = fs.existsSync(SERVICE_ACCOUNT_PATH);
const describeIfLive = canRunLive ? describe : describe.skip;

// ─────────────────────────────────────────────────────────────────────────────

describeIfLive('selectAds — ai_slot intent-based targeting (Live Integration)', () => {
  let authToken: string;
  const createdCampaignIds: string[] = [];

  // ── Shared campaign base (ai_slot, always active, no targeting fields) ──────

  /** Minimal ai_slot campaign — zero targeting fields → scores 0 on every
   *  preference/destination/date dimension. Used as the "blank" baseline. */
  const blankBase = {
    uid: 'test-advertiser-uid',
    status: 'active',
    placement: 'ai_slot',
    isUnderReview: false,
    startDate: offsetDate(-7),
    endDate: offsetDate(30),
    creativeType: 'image',
    assetUrl: 'https://example.com/test-blank.jpg',
    primaryText: 'Blank Ad',
    cta: 'Learn More',
    landingUrl: 'https://example.com/blank',
    billingModel: 'cpm',
    budgetAmount: '100.00',
    budgetCents: 10000,
    totalImpressions: 0,
    totalClicks: 0,
  };

  // Helper — seed a campaign and register for cleanup
  async function seedCampaign(id: string, overrides: Record<string, unknown>): Promise<void> {
    const db = getAdminDb();
    await db.collection('ads_campaigns').doc(id).set({ ...blankBase, name: id, ...overrides });
    createdCampaignIds.push(id);
  }

  // Helper — call the live selectAds function
  async function selectAds(payload: Record<string, unknown>): Promise<any[]> {
    const res = await fetch(`${FUNCTION_URL}/selectAds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: payload }),
    });
    const json = await res.json();
    return json?.result?.ads ?? [];
  }

  // ── beforeAll — authenticate ──────────────────────────────────────────────
  beforeAll(async () => {
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'feedback@travalpass.com',
          password: '1111111111',
          returnSecureToken: true,
        }),
      },
    );
    const authData = await authRes.json();
    if (!authData.idToken) throw new Error('Auth failed: ' + JSON.stringify(authData));
    authToken = authData.idToken;
  }, 30000);

  // ── afterAll — delete all seeded campaigns ────────────────────────────────
  afterAll(async () => {
    const db = getAdminDb();
    await Promise.all(
      createdCampaignIds.map(async (id) => {
        try {
          // Delete any daily_metrics sub-collection docs first
          const metricsSnap = await db
            .collection('ads_campaigns')
            .doc(id)
            .collection('daily_metrics')
            .get();
          await Promise.all(metricsSnap.docs.map((d) => d.ref.delete()));
          await db.collection('ads_campaigns').doc(id).delete();
        } catch {
          // Best-effort
        }
      }),
    );
    try { await adminApp?.delete(); } catch { /* ignore */ }
  }, 30000);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.3  Activity preference targeting
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3.3 Activity preference targeting', () => {
    const TS = Date.now();
    const signalId = `__test_aiSlot_actPref_signal_${TS}`;
    const blankId  = `__test_aiSlot_actPref_blank_${TS}`;

    beforeAll(async () => {
      await seedCampaign(signalId, {
        targetActivityPreferences: ['Cultural', 'Food & Dining'],
      });
      await seedCampaign(blankId, {});
    }, 20000);

    it('positive — activity overlap ranks signal campaign above blank', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        userContext: {
          activityPreferences: ['cultural', 'food'],
        },
      });

      const signalIdx = ads.findIndex((a) => a.campaignId === signalId);
      const blankIdx  = ads.findIndex((a) => a.campaignId === blankId);

      expect(signalIdx).toBeGreaterThanOrEqual(0); // signal must appear
      expect(blankIdx).toBeGreaterThanOrEqual(0);  // blank must appear
      expect(signalIdx).toBeLessThan(blankIdx);    // signal ranked higher
    }, 20000);

    it('negative — no activity overlap; signal does not outrank blank', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        userContext: {
          activityPreferences: ['hiking', 'adventure'],
        },
      });

      const signalIdx = ads.findIndex((a) => a.campaignId === signalId);
      const blankIdx  = ads.findIndex((a) => a.campaignId === blankId);

      // Both must still appear (soft scoring — no hard exclusion)
      expect(signalIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);
      // Signal must NOT rank strictly above blank (equal or worse)
      expect(signalIdx).toBeGreaterThanOrEqual(blankIdx);
    }, 20000);

    it('negative — omitting activityPreferences omits preference scoring for signal', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        // No userContext — nothing to match against
      });

      const signalIdx = ads.findIndex((a) => a.campaignId === signalId);
      const blankIdx  = ads.findIndex((a) => a.campaignId === blankId);

      expect(signalIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);
      // With no context score is 0 for both — tie → order is undefined, not asserted
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.4  Travel style targeting
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3.4 Travel style targeting', () => {
    const TS = Date.now();
    const signalId = `__test_aiSlot_style_signal_${TS}`;
    const blankId  = `__test_aiSlot_style_blank_${TS}`;

    beforeAll(async () => {
      await seedCampaign(signalId, {
        targetTravelStyles: ['luxury'],
      });
      await seedCampaign(blankId, {});
    }, 20000);

    it('positive — style overlap ranks signal above blank', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        userContext: { travelStyles: ['luxury'] },
      });

      const signalIdx = ads.findIndex((a) => a.campaignId === signalId);
      const blankIdx  = ads.findIndex((a) => a.campaignId === blankId);

      expect(signalIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);
      expect(signalIdx).toBeLessThan(blankIdx);
    }, 20000);

    it('negative — mismatched style; signal does not outrank blank', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        userContext: { travelStyles: ['budget'] },
      });

      const signalIdx = ads.findIndex((a) => a.campaignId === signalId);
      const blankIdx  = ads.findIndex((a) => a.campaignId === blankId);

      expect(signalIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);
      expect(signalIdx).toBeGreaterThanOrEqual(blankIdx);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.5  Destination targeting
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3.5 Destination targeting', () => {
    const TS = Date.now();
    const signalId = `__test_aiSlot_dest_signal_${TS}`;
    const blankId  = `__test_aiSlot_dest_blank_${TS}`;

    beforeAll(async () => {
      // ai_slot stores destination in the `location` field (not targetDestination)
      await seedCampaign(signalId, { location: 'Detroit, MI, USA' });
      await seedCampaign(blankId, {});
    }, 20000);

    it('positive — matching destination ranks signal above blank (+2)', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        userContext: { destination: 'Detroit, MI, USA' },
      });

      const signalIdx = ads.findIndex((a) => a.campaignId === signalId);
      const blankIdx  = ads.findIndex((a) => a.campaignId === blankId);

      expect(signalIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);
      expect(signalIdx).toBeLessThan(blankIdx);
    }, 20000);

    it('negative — different destination; signal does not outrank blank', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        userContext: { destination: 'Tokyo, Japan' },
      });

      const signalIdx = ads.findIndex((a) => a.campaignId === signalId);
      const blankIdx  = ads.findIndex((a) => a.campaignId === blankId);

      expect(signalIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);
      expect(signalIdx).toBeGreaterThanOrEqual(blankIdx);
    }, 20000);

    it('positive — partial destination match (city substring) still scores', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        userContext: { destination: 'Detroit' }, // substring of 'Detroit, MI, USA'
      });

      const signalIdx = ads.findIndex((a) => a.campaignId === signalId);
      const blankIdx  = ads.findIndex((a) => a.campaignId === blankId);

      expect(signalIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);
      expect(signalIdx).toBeLessThan(blankIdx);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.6  Travel date overlap targeting
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3.6 Travel date overlap targeting', () => {
    const TS = Date.now();
    const overlapId   = `__test_aiSlot_dates_overlap_${TS}`;
    const noOverlapId = `__test_aiSlot_dates_nooverlap_${TS}`;
    const blankId     = `__test_aiSlot_dates_blank_${TS}`;

    beforeAll(async () => {
      // Campaign whose target travel window overlaps with user's trip next week
      await seedCampaign(overlapId, {
        targetTravelStartDate: offsetDate(5),
        targetTravelEndDate: offsetDate(15),
      });
      // Campaign whose target travel window is in the past — no overlap
      await seedCampaign(noOverlapId, {
        targetTravelStartDate: offsetDate(-60),
        targetTravelEndDate: offsetDate(-30),
      });
      await seedCampaign(blankId, {});
    }, 20000);

    it('positive — overlapping travel dates ranks overlap campaign above blank', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        userContext: {
          travelStartDate: offsetDate(7),  // user trip: +7 to +10 days
          travelEndDate: offsetDate(10),
        },
      });

      const overlapIdx = ads.findIndex((a) => a.campaignId === overlapId);
      const blankIdx   = ads.findIndex((a) => a.campaignId === blankId);

      expect(overlapIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);
      expect(overlapIdx).toBeLessThan(blankIdx);
    }, 20000);

    it('negative — non-overlapping travel dates; noOverlap campaign does not outrank blank', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        userContext: {
          travelStartDate: offsetDate(7),
          travelEndDate: offsetDate(10),
        },
      });

      const noOverlapIdx = ads.findIndex((a) => a.campaignId === noOverlapId);
      const blankIdx     = ads.findIndex((a) => a.campaignId === blankId);

      expect(noOverlapIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);
      // noOverlap should NOT rank above blank
      expect(noOverlapIdx).toBeGreaterThanOrEqual(blankIdx);
    }, 20000);

    it('eligibility — campaign with target dates is still returned when user has no dates', async () => {
      // A campaign targeting specific dates must not be excluded when the user
      // has no travel dates in context (no-dates = no penalty, not hard filter).
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        // No travelStartDate / travelEndDate in userContext
      });

      const overlapIdx = ads.findIndex((a) => a.campaignId === overlapId);
      expect(overlapIdx).toBeGreaterThanOrEqual(0);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4.2  Seen campaign penalty
  // ═══════════════════════════════════════════════════════════════════════════

  describe('4.2 Seen campaign penalty', () => {
    const TS = Date.now();
    const seenId   = `__test_aiSlot_seen_campaign_${TS}`;
    const freshId  = `__test_aiSlot_fresh_campaign_${TS}`;

    beforeAll(async () => {
      // Both campaigns are identical (same blank targeting) so they tie on score.
      // The seen penalty should be the only differentiator.
      await seedCampaign(seenId, {});
      await seedCampaign(freshId, {});
    }, 20000);

    it('without seenCampaignIds both campaigns are eligible', async () => {
      const ads = await selectAds({ placement: 'ai_slot', limit: 20 });

      const seenIdx  = ads.findIndex((a) => a.campaignId === seenId);
      const freshIdx = ads.findIndex((a) => a.campaignId === freshId);

      expect(seenIdx).toBeGreaterThanOrEqual(0);
      expect(freshIdx).toBeGreaterThanOrEqual(0);
    }, 20000);

    it('seen campaign ranks below (or equal to) fresh campaign when marked seen', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        seenCampaignIds: [seenId],
      });

      const seenIdx  = ads.findIndex((a) => a.campaignId === seenId);
      const freshIdx = ads.findIndex((a) => a.campaignId === freshId);

      // Both must still appear (seen ≠ excluded, only penalised)
      expect(seenIdx).toBeGreaterThanOrEqual(0);
      expect(freshIdx).toBeGreaterThanOrEqual(0);

      // Fresh campaign must rank at least as high as the seen one
      expect(freshIdx).toBeLessThanOrEqual(seenIdx);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Combined scoring — multiple signals accumulate
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Combined multi-signal scoring', () => {
    const TS = Date.now();
    const fullMatchId  = `__test_aiSlot_full_match_${TS}`;
    const partialId    = `__test_aiSlot_partial_${TS}`;
    const blankId      = `__test_aiSlot_combined_blank_${TS}`;

    beforeAll(async () => {
      // Full match: destination + activity + style all match the context below
      await seedCampaign(fullMatchId, {
        location: 'Detroit, MI, USA',
        targetActivityPreferences: ['Cultural', 'Food & Dining'],
        targetTravelStyles: ['luxury'],
      });
      // Partial match: only style matches
      await seedCampaign(partialId, {
        targetTravelStyles: ['luxury'],
      });
      await seedCampaign(blankId, {});
    }, 20000);

    it('full-match campaign outranks partial-match which outranks blank', async () => {
      const ads = await selectAds({
        placement: 'ai_slot',
        limit: 20,
        userContext: {
          destination: 'Detroit, MI, USA',
          activityPreferences: ['cultural', 'food'],
          travelStyles: ['luxury'],
        },
      });

      const fullIdx    = ads.findIndex((a) => a.campaignId === fullMatchId);
      const partialIdx = ads.findIndex((a) => a.campaignId === partialId);
      const blankIdx   = ads.findIndex((a) => a.campaignId === blankId);

      expect(fullIdx).toBeGreaterThanOrEqual(0);
      expect(partialIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);

      expect(fullIdx).toBeLessThan(partialIdx);
      expect(partialIdx).toBeLessThan(blankIdx);
    }, 20000);
  });
});

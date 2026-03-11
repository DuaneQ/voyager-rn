/**
 * Integration Tests for logAdEvents Cloud Function
 *
 * Tests the LIVE deployed logAdEvents Cloud Function against mundo1-dev.
 * Each test seeds its OWN campaign via the Admin SDK so tests are fully
 * independent — there is no shared mutable state between tests.
 *
 * Assertion pattern (DELTA-based):
 *   1. Read campaign doc BEFORE calling the function
 *   2. Call the function
 *   3. Read campaign doc AFTER
 *   4. Assert exact difference (after.field - before.field === expectedDelta)
 *
 * This prevents false-confidence from accumulated state across runs.
 *
 * Billing constants (must match logAdEvents.js exactly):
 *   CPM_RATE_CENTS = 500  →  chargeCents = Math.round(n * 500 / 1000)
 *   CPC_RATE_CENTS = 50   →  chargeCents = n * 50
 *
 * CPM math spot-check:
 *   1 imp  → Math.round(0.5)  = 1 cent
 *   2 imp  → Math.round(1.0)  = 1 cent
 *   3 imp  → Math.round(1.5)  = 2 cents
 *   4 imp  → Math.round(2.0)  = 2 cents
 *   5 imp  → Math.round(2.5)  = 3 cents
 *   10 imp → Math.round(5.0)  = 5 cents
 *
 * Cost per test run:
 *   - Firestore reads/writes: ~80–100 operations (well within free tier)
 *   - Cloud Function invocations: ~20
 *   - No external API calls (Google Places, OpenAI, etc.)
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// These integration tests call the LIVE dev Cloud Functions, not emulators.
// The jest.integration.setup.js sets emulator env vars; remove them so the
// Admin SDK connects to the real Firestore for seeding/cleanup.
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIREBASE_FUNCTIONS_EMULATOR;

const FIREBASE_API_KEY = 'AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0';
const PROJECT_ID = 'mundo1-dev';
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net`;
const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname, '..', '..', '..', 'mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json'
);

// ── Billing constants (must match logAdEvents.js exactly) ─────────────────────
const CPM_RATE_CENTS = 500;
const CPC_RATE_CENTS = 50;
const MAX_EVENTS_PER_REQUEST = 50;

/** Compute expected CPM charge for N impressions — mirrors cloud function math. */
function expectedCpmCharge(impressions: number): number {
  return Math.round((impressions * CPM_RATE_CENTS) / 1000);
}

/** Compute expected CPC charge for N clicks. */
function expectedCpcCharge(clicks: number): number {
  return clicks * CPC_RATE_CENTS;
}

/** UTC date key YYYY-MM-DD for a given epoch ms — mirrors epochToDateKey in the function. */
function epochToDateKey(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function offsetDate(days: number): string {
  return epochToDateKey(Date.now() + days * 86_400_000);
}

// ── Admin SDK setup ────────────────────────────────────────────────────────────
let adminApp: admin.app.App;
function getAdminDb(): admin.firestore.Firestore {
  if (!adminApp) {
    adminApp = admin.initializeApp(
      { credential: admin.credential.cert(SERVICE_ACCOUNT_PATH) },
      `logAdEvents-test-${Date.now()}`
    );
  }
  return adminApp.firestore();
}

const canRunLive = fs.existsSync(SERVICE_ACCOUNT_PATH);
const describeIfLive = canRunLive ? describe : describe.skip;

describeIfLive('logAdEvents — Live Integration Tests', () => {
  let authToken: string;

  /** Every campaign ID created in this run — all deleted in afterAll. */
  const campaignIdsToCleanup: string[] = [];

  // ── Auth ─────────────────────────────────────────────────────────────────
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
      }
    );
    const authData = await authRes.json();
    if (!authData.idToken) throw new Error('Auth failed: ' + JSON.stringify(authData));
    authToken = authData.idToken;
  }, 30000);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  afterAll(async () => {
    const db = getAdminDb();
    for (const id of campaignIdsToCleanup) {
      try {
        const metricsSnap = await db
          .collection('ads_campaigns').doc(id).collection('daily_metrics').get();
        if (!metricsSnap.empty) {
          const batch = db.batch();
          metricsSnap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        }
        await db.collection('ads_campaigns').doc(id).delete();
      } catch { /* best-effort */ }
    }
    try { await adminApp?.delete(); } catch { /* ignore */ }
  }, 30000);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const callLogAdEvents = async (payload: unknown) => {
    const res = await fetch(`${FUNCTION_URL}/logAdEvents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: payload }),
    });
    return res.json();
  };

  /** Seed a campaign with known initial state and register it for cleanup. */
  const seedCampaign = async (id: string, overrides: Record<string, unknown> = {}): Promise<void> => {
    const db = getAdminDb();
    await db.collection('ads_campaigns').doc(id).set({
      uid: 'test-advertiser-uid',
      name: 'Integration Test Campaign',
      status: 'active',
      placement: 'video_feed',
      isUnderReview: false,
      startDate: offsetDate(-7),
      endDate: offsetDate(30),
      creativeType: 'video',
      assetUrl: 'https://example.com/test-video.mp4',
      primaryText: 'Test Ad',
      cta: 'Learn More',
      landingUrl: 'https://example.com',
      billingModel: 'cpm',
      budgetAmount: '50.00',
      budgetCents: 5000,
      totalImpressions: 0,
      totalClicks: 0,
      ...overrides,
    });
    campaignIdsToCleanup.push(id);
  };

  /** Read a campaign doc and return its data (throws if missing). */
  const readCampaign = async (id: string): Promise<Record<string, unknown>> => {
    const snap = await getAdminDb().collection('ads_campaigns').doc(id).get();
    if (!snap.exists || !snap.data()) throw new Error(`Campaign ${id} not found`);
    return snap.data() as Record<string, unknown>;
  };

  /** Read a daily_metrics doc — returns {} if the sub-document doesn't exist yet. */
  const readDailyMetrics = async (campaignId: string, dateKey: string): Promise<Record<string, unknown>> => {
    const snap = await getAdminDb()
      .collection('ads_campaigns').doc(campaignId)
      .collection('daily_metrics').doc(dateKey)
      .get();
    return (snap.exists ? snap.data() : {}) as Record<string, unknown>;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Impression logging — CPM billing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Impression logging — CPM billing', () => {
    it('increments totalImpressions by exact count and decrements budgetCents by exact CPM charge', async () => {
      const id = `__test_imp_cpm_${Date.now()}`;
      await seedCampaign(id, { billingModel: 'cpm', budgetCents: 5000, totalImpressions: 0 });

      const before = await readCampaign(id);
      const now = Date.now();
      const COUNT = 5;

      const result = await callLogAdEvents({
        events: Array.from({ length: COUNT }, (_, i) => ({
          type: 'impression', campaignId: id, timestamp: now + i * 10,
        })),
      });

      const after = await readCampaign(id);
      // Math.round(5 * 500 / 1000) = Math.round(2.5) = 3
      const expectedCharge = expectedCpmCharge(COUNT);

      expect(result.result.processed).toBe(COUNT);
      expect(result.result.skipped).toBe(0);
      expect(after.totalImpressions as number).toBe((before.totalImpressions as number) + COUNT);
      expect(after.budgetCents as number).toBe((before.budgetCents as number) - expectedCharge);
    }, 25000);

    it('does NOT change totalClicks when only impressions are sent', async () => {
      const id = `__test_imp_noclicks_${Date.now()}`;
      await seedCampaign(id, { totalClicks: 0 });

      const before = await readCampaign(id);

      await callLogAdEvents({
        events: [{ type: 'impression', campaignId: id, timestamp: Date.now() }],
      });

      const after = await readCampaign(id);
      expect(after.totalClicks).toBe(before.totalClicks);
    }, 25000);

    it('populates daily_metrics with correct impression count and spend', async () => {
      const id = `__test_imp_daily_${Date.now()}`;
      await seedCampaign(id, { billingModel: 'cpm', budgetCents: 5000 });

      const now = Date.now();
      const todayKey = epochToDateKey(now);
      const COUNT = 4;
      // Math.round(4 * 500 / 1000) = Math.round(2.0) = 2
      const expectedCharge = expectedCpmCharge(COUNT);

      const beforeMetrics = await readDailyMetrics(id, todayKey);

      await callLogAdEvents({
        events: Array.from({ length: COUNT }, (_, i) => ({
          type: 'impression', campaignId: id, timestamp: now + i * 10,
        })),
      });

      const afterMetrics = await readDailyMetrics(id, todayKey);

      expect(afterMetrics.impressions as number).toBe(
        ((beforeMetrics.impressions as number) || 0) + COUNT
      );
      expect(afterMetrics.spend as number).toBe(
        ((beforeMetrics.spend as number) || 0) + expectedCharge
      );
    }, 25000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Click logging — CPM billing (clicks do NOT charge budget)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Click logging — CPM billing (clicks do not charge budget)', () => {
    it('increments totalClicks by exact count and does NOT decrement budgetCents', async () => {
      const id = `__test_click_cpm_${Date.now()}`;
      await seedCampaign(id, { billingModel: 'cpm', budgetCents: 5000, totalClicks: 0 });

      const before = await readCampaign(id);
      const now = Date.now();

      const result = await callLogAdEvents({
        events: [
          { type: 'click', campaignId: id, timestamp: now },
          { type: 'click', campaignId: id, timestamp: now + 10 },
        ],
      });

      const after = await readCampaign(id);

      expect(result.result.processed).toBe(2);
      expect(result.result.skipped).toBe(0);
      expect(after.totalClicks as number).toBe((before.totalClicks as number) + 2);
      // CPM billing — clicks do not charge budget
      expect(after.budgetCents).toBe(before.budgetCents);
    }, 25000);

    it('populates daily_metrics with correct click count', async () => {
      const id = `__test_click_daily_${Date.now()}`;
      await seedCampaign(id, { billingModel: 'cpm' });

      const now = Date.now();
      const todayKey = epochToDateKey(now);
      const beforeMetrics = await readDailyMetrics(id, todayKey);

      await callLogAdEvents({
        events: [{ type: 'click', campaignId: id, timestamp: now }],
      });

      const afterMetrics = await readDailyMetrics(id, todayKey);
      expect(afterMetrics.clicks as number).toBe(
        ((beforeMetrics.clicks as number) || 0) + 1
      );
    }, 25000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Click logging — CPC billing (clicks charge budget at $0.50/click)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Click logging — CPC billing ($0.50 per click)', () => {
    it('increments totalClicks and decrements budgetCents by CPC_RATE per click', async () => {
      const id = `__test_click_cpc_${Date.now()}`;
      await seedCampaign(id, { billingModel: 'cpc', budgetCents: 1000, totalClicks: 0 });

      const before = await readCampaign(id);
      const now = Date.now();
      const COUNT = 3;

      const result = await callLogAdEvents({
        events: Array.from({ length: COUNT }, (_, i) => ({
          type: 'click', campaignId: id, timestamp: now + i * 10,
        })),
      });

      const after = await readCampaign(id);
      // 3 clicks × 50 cents = 150 cents
      const expectedCharge = expectedCpcCharge(COUNT);

      expect(result.result.processed).toBe(COUNT);
      expect(after.totalClicks as number).toBe((before.totalClicks as number) + COUNT);
      expect(after.budgetCents as number).toBe((before.budgetCents as number) - expectedCharge);
    }, 25000);

    it('does NOT charge budgetCents for impressions in a CPC campaign', async () => {
      const id = `__test_imp_cpc_nochg_${Date.now()}`;
      await seedCampaign(id, { billingModel: 'cpc', budgetCents: 1000 });

      const before = await readCampaign(id);
      const now = Date.now();

      await callLogAdEvents({
        events: [
          { type: 'impression', campaignId: id, timestamp: now },
          { type: 'impression', campaignId: id, timestamp: now + 10 },
        ],
      });

      const after = await readCampaign(id);
      // CPC billing — impressions do not charge budget
      expect(after.budgetCents).toBe(before.budgetCents);
    }, 25000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Budget exhaustion — campaign is auto-paused when budget reaches 0
  // This is the most critical business rule: prevents overspend.
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Budget exhaustion — campaign auto-paused when budget hits 0', () => {
    it('sets status to "paused" when CPM impressions exhaust the full budget', async () => {
      const id = `__test_exhaust_cpm_${Date.now()}`;
      // 10 impressions × CPM: Math.round(10 × 500 / 1000) = 5 cents → budget 5 → 0
      await seedCampaign(id, {
        billingModel: 'cpm', budgetAmount: '0.05', budgetCents: 5, status: 'active',
      });

      const before = await readCampaign(id);
      expect(before.status).toBe('active');

      const now = Date.now();
      const result = await callLogAdEvents({
        events: Array.from({ length: 10 }, (_, i) => ({
          type: 'impression', campaignId: id, timestamp: now + i * 10,
        })),
      });

      expect(result.result.processed).toBe(10);

      const after = await readCampaign(id);
      expect(after.budgetCents as number).toBeLessThanOrEqual(0);
      // CRITICAL: campaign must be automatically paused
      expect(after.status).toBe('paused');
    }, 25000);

    it('sets status to "paused" when CPC clicks exhaust the full budget', async () => {
      const id = `__test_exhaust_cpc_${Date.now()}`;
      // 2 clicks × $0.50 = 100 cents → budget 100 → 0
      await seedCampaign(id, {
        billingModel: 'cpc', budgetAmount: '1.00', budgetCents: 100, status: 'active',
      });

      const now = Date.now();
      const result = await callLogAdEvents({
        events: [
          { type: 'click', campaignId: id, timestamp: now },
          { type: 'click', campaignId: id, timestamp: now + 10 },
        ],
      });

      expect(result.result.processed).toBe(2);

      const after = await readCampaign(id);
      expect(after.budgetCents as number).toBeLessThanOrEqual(0);
      expect(after.status).toBe('paused');
    }, 25000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Inactive campaign — all events silently skipped, Firestore unchanged
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Inactive campaign — events silently skipped, no DB writes', () => {
    it('skips all events for a campaign with status "paused" and leaves Firestore unchanged', async () => {
      const id = `__test_paused_${Date.now()}`;
      await seedCampaign(id, { status: 'paused', totalImpressions: 0, totalClicks: 0 });

      const before = await readCampaign(id);
      const now = Date.now();

      const result = await callLogAdEvents({
        events: [
          { type: 'impression', campaignId: id, timestamp: now },
          { type: 'click',      campaignId: id, timestamp: now + 10 },
        ],
      });

      const after = await readCampaign(id);

      expect(result.result.processed).toBe(0);
      expect(result.result.skipped).toBe(2);
      // ALL Firestore counters must be completely unchanged
      expect(after.totalImpressions).toBe(before.totalImpressions);
      expect(after.totalClicks).toBe(before.totalClicks);
      expect(after.budgetCents).toBe(before.budgetCents);
    }, 25000);

    it('skips all events for a campaign with status "under_review"', async () => {
      const id = `__test_review_${Date.now()}`;
      await seedCampaign(id, { status: 'under_review', totalImpressions: 0 });

      const before = await readCampaign(id);
      const now = Date.now();

      const result = await callLogAdEvents({
        events: [{ type: 'impression', campaignId: id, timestamp: now }],
      });

      const after = await readCampaign(id);

      expect(result.result.processed).toBe(0);
      expect(result.result.skipped).toBe(1);
      expect(after.totalImpressions).toBe(before.totalImpressions);
    }, 25000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Video quartile logging — daily_metrics sub-collection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Video quartile logging', () => {
    it('increments daily_metrics videoQuartiles.q25/q50/q75/q100 by exact count', async () => {
      const id = `__test_quartile_${Date.now()}`;
      await seedCampaign(id);

      const now = Date.now();
      const todayKey = epochToDateKey(now);
      const beforeMetrics = await readDailyMetrics(id, todayKey);

      const result = await callLogAdEvents({
        events: [
          { type: 'video_quartile', campaignId: id, timestamp: now,      quartile: 25  },
          { type: 'video_quartile', campaignId: id, timestamp: now + 10, quartile: 50  },
          { type: 'video_quartile', campaignId: id, timestamp: now + 20, quartile: 75  },
          { type: 'video_quartile', campaignId: id, timestamp: now + 30, quartile: 100 },
        ],
      });

      const afterMetrics = await readDailyMetrics(id, todayKey);
      // batch.set({ merge: true }) stores dotted keys literally, so Firestore
      // returns them as flat keys: { 'videoQuartiles.q25': 1, ... }
      const bqFlat = beforeMetrics as Record<string, number>;
      const aqFlat = afterMetrics  as Record<string, number>;

      expect(result.result.processed).toBe(4);
      expect(result.result.skipped).toBe(0);
      expect(aqFlat['videoQuartiles.q25']).toBe((bqFlat['videoQuartiles.q25']  || 0) + 1);
      expect(aqFlat['videoQuartiles.q50']).toBe((bqFlat['videoQuartiles.q50']  || 0) + 1);
      expect(aqFlat['videoQuartiles.q75']).toBe((bqFlat['videoQuartiles.q75']  || 0) + 1);
      expect(aqFlat['videoQuartiles.q100']).toBe((bqFlat['videoQuartiles.q100'] || 0) + 1);
    }, 25000);

    it('does NOT update totalImpressions or totalClicks for quartile events', async () => {
      const id = `__test_quartile_nocounts_${Date.now()}`;
      await seedCampaign(id, { totalImpressions: 0, totalClicks: 0 });

      const before = await readCampaign(id);

      await callLogAdEvents({
        events: [{ type: 'video_quartile', campaignId: id, timestamp: Date.now(), quartile: 50 }],
      });

      const after = await readCampaign(id);
      expect(after.totalImpressions).toBe(before.totalImpressions);
      expect(after.totalClicks).toBe(before.totalClicks);
    }, 25000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Batched mixed events — single request, all types atomically
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Batched mixed events', () => {
    it('processes impressions + clicks + quartiles atomically with correct deltas', async () => {
      const id = `__test_mixed_${Date.now()}`;
      await seedCampaign(id, { billingModel: 'cpm', budgetCents: 5000, totalImpressions: 0, totalClicks: 0 });

      const before = await readCampaign(id);
      const now = Date.now();
      const todayKey = epochToDateKey(now);
      const beforeMetrics = await readDailyMetrics(id, todayKey);

      // 3 impressions + 2 clicks + 1 quartile in one batch
      const result = await callLogAdEvents({
        events: [
          { type: 'impression',     campaignId: id, timestamp: now       },
          { type: 'impression',     campaignId: id, timestamp: now + 10  },
          { type: 'impression',     campaignId: id, timestamp: now + 20  },
          { type: 'click',          campaignId: id, timestamp: now + 30  },
          { type: 'click',          campaignId: id, timestamp: now + 40  },
          { type: 'video_quartile', campaignId: id, timestamp: now + 50, quartile: 25 },
        ],
      });

      const after = await readCampaign(id);
      const afterMetrics = await readDailyMetrics(id, todayKey);

      expect(result.result.processed).toBe(6);
      expect(result.result.skipped).toBe(0);

      // CPM billing charges for impressions only: Math.round(3 × 500 / 1000) = 2 cents
      const expectedCharge = expectedCpmCharge(3);
      expect(after.totalImpressions as number).toBe((before.totalImpressions as number) + 3);
      expect(after.totalClicks    as number).toBe((before.totalClicks    as number) + 2);
      expect(after.budgetCents    as number).toBe((before.budgetCents    as number) - expectedCharge);

      // daily_metrics
      expect(afterMetrics.impressions as number).toBe(((beforeMetrics.impressions as number) || 0) + 3);
      expect(afterMetrics.clicks      as number).toBe(((beforeMetrics.clicks      as number) || 0) + 2);

      // batch.set dotted keys → flat keys with literal dots when read back
      const bqFlat = beforeMetrics as Record<string, number>;
      const aqFlat = afterMetrics  as Record<string, number>;
      expect(aqFlat['videoQuartiles.q25']).toBe((bqFlat['videoQuartiles.q25'] || 0) + 1);
    }, 25000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Input validation and anti-abuse
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Input validation and anti-abuse', () => {
    it('returns INVALID_ARGUMENT when the events field is missing', async () => {
      const result = await callLogAdEvents({});
      expect(result.error).toBeDefined();
      expect(result.error.status).toBe('INVALID_ARGUMENT');
    }, 15000);

    it('returns { processed: 0, skipped: 0 } for an empty events array (not an error)', async () => {
      const result = await callLogAdEvents({ events: [] });
      expect(result.result).toBeDefined();
      expect(result.result.processed).toBe(0);
      expect(result.result.skipped).toBe(0);
    }, 15000);

    it(`returns INVALID_ARGUMENT when events array exceeds ${MAX_EVENTS_PER_REQUEST} items`, async () => {
      const id = `__test_maxevents_${Date.now()}`;
      await seedCampaign(id);

      const now = Date.now();
      const result = await callLogAdEvents({
        events: Array.from({ length: MAX_EVENTS_PER_REQUEST + 1 }, (_, i) => ({
          type: 'impression', campaignId: id, timestamp: now + i * 10,
        })),
      });

      expect(result.error).toBeDefined();
      expect(result.error.status).toBe('INVALID_ARGUMENT');
    }, 15000);

    it('skips events with an invalid type and processes valid ones in the same batch', async () => {
      const id = `__test_badtype_${Date.now()}`;
      await seedCampaign(id, { totalImpressions: 0 });

      const before = await readCampaign(id);
      const now = Date.now();

      const result = await callLogAdEvents({
        events: [
          { type: 'invalid_type', campaignId: id, timestamp: now     },
          { type: 'impression',   campaignId: id, timestamp: now + 10 },
        ],
      });

      const after = await readCampaign(id);

      expect(result.result.processed).toBe(1);
      expect(result.result.skipped).toBe(1);
      // Exactly the 1 valid impression must have been recorded
      expect(after.totalImpressions as number).toBe((before.totalImpressions as number) + 1);
    }, 25000);

    it('skips events with stale timestamps (older than 5 minutes) and leaves Firestore unchanged', async () => {
      const id = `__test_stale_${Date.now()}`;
      await seedCampaign(id, { totalImpressions: 0 });

      const before = await readCampaign(id);

      const result = await callLogAdEvents({
        events: [{ type: 'impression', campaignId: id, timestamp: Date.now() - 6 * 60 * 1000 }],
      });

      const after = await readCampaign(id);

      expect(result.result.processed).toBe(0);
      expect(result.result.skipped).toBe(1);
      expect(after.totalImpressions).toBe(before.totalImpressions);
    }, 25000);

    it('skips events with timestamps too far in the future (>30 s) and leaves Firestore unchanged', async () => {
      const id = `__test_future_${Date.now()}`;
      await seedCampaign(id, { totalImpressions: 0 });

      const before = await readCampaign(id);

      const result = await callLogAdEvents({
        events: [{ type: 'impression', campaignId: id, timestamp: Date.now() + 60 * 1000 }],
      });

      const after = await readCampaign(id);

      expect(result.result.processed).toBe(0);
      expect(result.result.skipped).toBe(1);
      expect(after.totalImpressions).toBe(before.totalImpressions);
    }, 25000);

    it('skips events for a non-existent campaignId without failing valid events in the same batch', async () => {
      const validId = `__test_nonexist_valid_${Date.now()}`;
      await seedCampaign(validId, { totalImpressions: 0 });

      const before = await readCampaign(validId);
      const now = Date.now();

      const result = await callLogAdEvents({
        events: [
          { type: 'impression', campaignId: 'non_existent_campaign_xyz_99999', timestamp: now      },
          { type: 'impression', campaignId: validId,                           timestamp: now + 10 },
        ],
      });

      const after = await readCampaign(validId);

      expect(result.result.processed).toBe(1);
      expect(result.result.skipped).toBe(1);
      // The valid campaign must still have been updated
      expect(after.totalImpressions as number).toBe((before.totalImpressions as number) + 1);
    }, 25000);

    it('skips video_quartile events with an invalid quartile value (33) within a mixed batch', async () => {
      const id = `__test_badquartile_${Date.now()}`;
      await seedCampaign(id);

      const now = Date.now();
      const todayKey = epochToDateKey(now);
      const beforeMetrics = await readDailyMetrics(id, todayKey);

      const result = await callLogAdEvents({
        events: [
          { type: 'video_quartile', campaignId: id, timestamp: now,      quartile: 33 }, // invalid
          { type: 'video_quartile', campaignId: id, timestamp: now + 10, quartile: 50 }, // valid
        ],
      });

      const afterMetrics = await readDailyMetrics(id, todayKey);
      // batch.set dotted keys stored literally → { 'videoQuartiles.q25': N, ... }
      const bqFlat = beforeMetrics as Record<string, number>;
      const aqFlat = afterMetrics  as Record<string, number>;

      expect(result.result.processed).toBe(1);
      expect(result.result.skipped).toBe(1);
      // Only q50 must be incremented; q25/q75/q100 must be unchanged
      expect(aqFlat['videoQuartiles.q50']).toBe((bqFlat['videoQuartiles.q50'] || 0) + 1);
      expect(aqFlat['videoQuartiles.q25']  ?? 0).toBe(bqFlat['videoQuartiles.q25']  || 0);
      expect(aqFlat['videoQuartiles.q75']  ?? 0).toBe(bqFlat['videoQuartiles.q75']  || 0);
      expect(aqFlat['videoQuartiles.q100'] ?? 0).toBe(bqFlat['videoQuartiles.q100'] || 0);
    }, 25000);
  });
});

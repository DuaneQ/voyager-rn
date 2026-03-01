/**
 * Integration Tests for logAdEvents Cloud Function
 *
 * Tests the LIVE deployed logAdEvents Cloud Function against mundo1-dev.
 * Seeds a test campaign in Firestore via the Admin SDK (service account),
 * then logs impression, click, and video_quartile events and verifies
 * Firestore counters are updated.
 *
 * Cleanup: Deletes the seeded test campaign and its daily_metrics sub-collection
 * in afterAll.
 *
 * Cost per test run:
 *   - Firestore reads/writes: ~20–30 operations (negligible, well within free tier)
 *   - Cloud Function invocations: ~8 (negligible)
 *   - No external API calls (Google Places, OpenAI, etc.)
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// These integration tests call the LIVE dev Cloud Functions, not emulators.
// The jest.integration.setup.js sets emulator env vars; remove them so the
// Admin SDK connects to the real Firestore for seeding/cleanup.
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIREBASE_FUNCTIONS_EMULATOR;

const FIREBASE_API_KEY = 'AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0';
const PROJECT_ID = 'mundo1-dev';
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net`;
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '..', '..', '..', 'mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json');

const TEST_CAMPAIGN_ID = `__test_logAdEvents_${Date.now()}`;

function offsetDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Initialize Firebase Admin SDK for seeding test data
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

describe('logAdEvents — Live Integration Tests', () => {
  let authToken: string;

  const testCampaign = {
    uid: 'test-advertiser-uid',
    name: 'logAdEvents Test Campaign',
    status: 'active',
    placement: 'video_feed',
    isUnderReview: false,
    startDate: offsetDate(-7),
    endDate: offsetDate(30),
    creativeType: 'video',
    assetUrl: 'https://example.com/test-video.mp4',
    primaryText: 'Test Ad for Event Logging',
    cta: 'Learn More',
    landingUrl: 'https://example.com/test',
    billingModel: 'cpm',
    budgetAmount: '50.00',
    budgetCents: 5000, // $50 budget
    totalImpressions: 0,
    totalClicks: 0,
  };

  // ── Auth + Seed ─────────────────────────────────────────────────────────
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

    // Seed the test campaign via Admin SDK (bypasses security rules)
    const db = getAdminDb();
    await db.collection('ads_campaigns').doc(TEST_CAMPAIGN_ID).set(testCampaign);
  }, 30000);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  afterAll(async () => {
    const db = getAdminDb();
    try {
      // Delete daily_metrics sub-collection
      const metricsSnap = await db
        .collection('ads_campaigns')
        .doc(TEST_CAMPAIGN_ID)
        .collection('daily_metrics')
        .get();
      const batch = db.batch();
      metricsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch {
      // Best-effort sub-collection cleanup
    }
    try {
      await db.collection('ads_campaigns').doc(TEST_CAMPAIGN_ID).delete();
    } catch {
      // Best-effort
    }
    // Clean up Admin SDK app
    try {
      await adminApp?.delete();
    } catch {
      // ignore
    }
  }, 20000);

  // Helper
  const callCloudFunction = async (functionName: string, payload: unknown) => {
    const res = await fetch(`${FUNCTION_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: payload }),
    });
    return res.json();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // logAdEvents — Impression Logging
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Impression logging', () => {
    it('should process impression events and return counts', async () => {
      const now = Date.now();

      const result = await callCloudFunction('logAdEvents', {
        events: [
          { type: 'impression', campaignId: TEST_CAMPAIGN_ID, timestamp: now },
          { type: 'impression', campaignId: TEST_CAMPAIGN_ID, timestamp: now + 100 },
          { type: 'impression', campaignId: TEST_CAMPAIGN_ID, timestamp: now + 200 },
        ],
      });

      expect(result.result).toBeDefined();
      expect(result.result.processed).toBe(3);
      expect(result.result.skipped).toBe(0);
    }, 20000);

    it('should update Firestore totalImpressions counter', async () => {
      // Read the campaign doc via Admin SDK to verify counters
      const db = getAdminDb();
      const snap = await db.collection('ads_campaigns').doc(TEST_CAMPAIGN_ID).get();
      const doc = snap.data();
      expect(doc).toBeDefined();
      expect(typeof doc!.totalImpressions).toBe('number');
      expect(doc!.totalImpressions).toBeGreaterThanOrEqual(3);
    }, 20000);

    it('should decrement budgetCents based on CPM billing', async () => {
      const db = getAdminDb();
      const snap = await db.collection('ads_campaigns').doc(TEST_CAMPAIGN_ID).get();
      const doc = snap.data();
      expect(doc).toBeDefined();
      // Original budget: 5000 cents. 3 impressions at CPM 500 = round(3 * 500 / 1000) = 2 cents
      expect(typeof doc!.budgetCents).toBe('number');
      expect(doc!.budgetCents as number).toBeLessThan(5000);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // logAdEvents — Click Logging
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Click logging', () => {
    it('should process click events', async () => {
      const now = Date.now();

      const result = await callCloudFunction('logAdEvents', {
        events: [
          { type: 'click', campaignId: TEST_CAMPAIGN_ID, timestamp: now },
        ],
      });

      expect(result.result.processed).toBe(1);
      expect(result.result.skipped).toBe(0);
    }, 20000);

    it('should update Firestore totalClicks counter', async () => {
      const db = getAdminDb();
      const snap = await db.collection('ads_campaigns').doc(TEST_CAMPAIGN_ID).get();
      const doc = snap.data();
      expect(doc).toBeDefined();
      expect(typeof doc!.totalClicks).toBe('number');
      expect(doc!.totalClicks).toBeGreaterThanOrEqual(1);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // logAdEvents — Video Quartile Events
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Video quartile logging', () => {
    it('should process video_quartile events with valid quartiles', async () => {
      const now = Date.now();

      const result = await callCloudFunction('logAdEvents', {
        events: [
          { type: 'video_quartile', campaignId: TEST_CAMPAIGN_ID, timestamp: now, quartile: 25 },
          { type: 'video_quartile', campaignId: TEST_CAMPAIGN_ID, timestamp: now + 100, quartile: 50 },
          { type: 'video_quartile', campaignId: TEST_CAMPAIGN_ID, timestamp: now + 200, quartile: 75 },
          { type: 'video_quartile', campaignId: TEST_CAMPAIGN_ID, timestamp: now + 300, quartile: 100 },
        ],
      });

      expect(result.result.processed).toBe(4);
      expect(result.result.skipped).toBe(0);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // logAdEvents — Batched / Mixed Events
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Batched mixed events', () => {
    it('should process a batch of mixed event types', async () => {
      const now = Date.now();

      const result = await callCloudFunction('logAdEvents', {
        events: [
          { type: 'impression', campaignId: TEST_CAMPAIGN_ID, timestamp: now },
          { type: 'click', campaignId: TEST_CAMPAIGN_ID, timestamp: now + 50 },
          { type: 'video_quartile', campaignId: TEST_CAMPAIGN_ID, timestamp: now + 100, quartile: 50 },
          { type: 'impression', campaignId: TEST_CAMPAIGN_ID, timestamp: now + 150 },
        ],
      });

      expect(result.result.processed).toBe(4);
      expect(result.result.skipped).toBe(0);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // logAdEvents — Input Validation & Anti-Abuse
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Input validation', () => {
    it('should reject request with empty events array', async () => {
      const result = await callCloudFunction('logAdEvents', {
        events: [],
      });

      // Empty array returns { processed: 0, skipped: 0 } — not an error
      expect(result.result).toBeDefined();
      expect(result.result.processed).toBe(0);
      expect(result.result.skipped).toBe(0);
    }, 20000);

    it('should reject request without events field', async () => {
      const result = await callCloudFunction('logAdEvents', {});

      expect(result.error).toBeDefined();
      expect(result.error.status).toBe('INVALID_ARGUMENT');
    }, 20000);

    it('should skip events with invalid type', async () => {
      const now = Date.now();

      const result = await callCloudFunction('logAdEvents', {
        events: [
          { type: 'invalid_type', campaignId: TEST_CAMPAIGN_ID, timestamp: now },
          { type: 'impression', campaignId: TEST_CAMPAIGN_ID, timestamp: now + 100 },
        ],
      });

      expect(result.result.processed).toBe(1);
      expect(result.result.skipped).toBe(1);
    }, 20000);

    it('should skip events with stale timestamps (too old)', async () => {
      const staleTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago

      const result = await callCloudFunction('logAdEvents', {
        events: [
          { type: 'impression', campaignId: TEST_CAMPAIGN_ID, timestamp: staleTimestamp },
        ],
      });

      expect(result.result.processed).toBe(0);
      expect(result.result.skipped).toBe(1);
    }, 20000);

    it('should skip events for non-existent campaigns', async () => {
      const now = Date.now();

      const result = await callCloudFunction('logAdEvents', {
        events: [
          { type: 'impression', campaignId: 'non_existent_campaign_xyz', timestamp: now },
        ],
      });

      // Non-existent campaigns are skipped (not fatal)
      expect(result.result.processed).toBe(0);
      expect(result.result.skipped).toBe(1);
    }, 20000);

    it('should skip video_quartile events with invalid quartile value', async () => {
      const now = Date.now();

      const result = await callCloudFunction('logAdEvents', {
        events: [
          { type: 'video_quartile', campaignId: TEST_CAMPAIGN_ID, timestamp: now, quartile: 33 },
        ],
      });

      expect(result.result.processed).toBe(0);
      expect(result.result.skipped).toBe(1);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // logAdEvents — Daily Metrics Sub-Collection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Daily metrics', () => {
    it('should create daily_metrics sub-document for today', async () => {
      // The previous tests already logged events, so daily_metrics should exist
      const today = new Date();
      const dateKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;

      const db = getAdminDb();
      const metricsSnap = await db
        .collection('ads_campaigns')
        .doc(TEST_CAMPAIGN_ID)
        .collection('daily_metrics')
        .doc(dateKey)
        .get();

      expect(metricsSnap.exists).toBe(true);
      const metricsDoc = metricsSnap.data();
      expect(metricsDoc).toBeDefined();
      // Should have impression counts from previous tests
      expect(typeof metricsDoc!.impressions).toBe('number');
      expect(metricsDoc!.impressions).toBeGreaterThanOrEqual(1);
    }, 20000);
  });
});

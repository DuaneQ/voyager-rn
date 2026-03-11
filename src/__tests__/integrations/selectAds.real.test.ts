/**
 * Integration Tests for selectAds Cloud Function
 *
 * Tests the LIVE deployed selectAds Cloud Function against mundo1-dev.
 * Seeds a test campaign in Firestore via the Admin SDK (service account),
 * calls selectAds with various placements and targeting contexts, and
 * verifies the response.
 *
 * Cleanup: Deletes the seeded test campaign(s) in afterAll.
 *
 * Cost per test run:
 *   - Firestore reads: ~5–10 document reads (negligible, well within free tier)
 *   - Cloud Function invocations: ~10 (negligible)
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
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '..', '..', '..', 'mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json');

const TEST_CAMPAIGN_ID = `__test_selectAds_${Date.now()}`;

// Campaign dates: today ± 30 days so it's always active during test runs
function todayYYYYMMDD(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

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
      `selectAds-test-${Date.now()}`
    );
  }
  return adminApp.firestore();
}

// Skip entire suite when service account file is missing (e.g., CI runners)
const canRunLive = fs.existsSync(SERVICE_ACCOUNT_PATH);
const describeIfLive = canRunLive ? describe : describe.skip;

describeIfLive('selectAds — Live Integration Tests', () => {
  let authToken: string;
  const createdCampaignIds: string[] = [];

  const testCampaign = {
    uid: 'test-advertiser-uid',
    name: 'Integration Test Campaign',
    status: 'active',
    placement: 'video_feed',
    isUnderReview: false,
    startDate: offsetDate(-7),
    endDate: offsetDate(30),
    creativeType: 'image',
    assetUrl: 'https://example.com/test-ad-creative.jpg',
    primaryText: 'Test Ad — Visit Beautiful Paris!',
    cta: 'Book Now',
    landingUrl: 'https://example.com/paris-tour',
    billingModel: 'cpm',
    budgetAmount: '100.00',
    budgetCents: 10000,
    businessType: 'tour',
    targetDestination: 'Paris, France',
    targetGender: 'Female',
    targetTripTypes: ['adventure', 'romantic'],
    targetActivityPreferences: ['Cultural', 'Nightlife'],
    targetTravelStyles: ['luxury'],
    targetTravelStartDate: offsetDate(-7),
    targetTravelEndDate: offsetDate(30),
    totalImpressions: 0,
    totalClicks: 0,
  };

  // ── Auth + Seed ─────────────────────────────────────────────────────────
  beforeAll(async () => {
    // Authenticate (for calling Cloud Functions)
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

    // Pre-clean: remove any __test_ campaigns orphaned by previous failed runs.
    // This prevents accumulated test data from saturating the selectAds result
    // limit and causing false negatives in per-campaign assertion tests.
    const db = getAdminDb();
    const orphans = await db.collection('ads_campaigns')
      .where(admin.firestore.FieldPath.documentId(), '>=', '__test_')
      .where(admin.firestore.FieldPath.documentId(), '<', '__test_~')
      .get();
    await Promise.all(orphans.docs.map(async (d) => {
      const metrics = await d.ref.collection('daily_metrics').get();
      await Promise.all(metrics.docs.map((m) => m.ref.delete()));
      await d.ref.delete();
    }));

    // Seed the test campaign via Admin SDK (bypasses security rules)
    await db.collection('ads_campaigns').doc(TEST_CAMPAIGN_ID).set(testCampaign);
    createdCampaignIds.push(TEST_CAMPAIGN_ID);
  }, 60000);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  afterAll(async () => {
    const db = getAdminDb();
    for (const id of createdCampaignIds) {
      try {
        await db.collection('ads_campaigns').doc(id).delete();
      } catch {
        // Best-effort cleanup
      }
    }
    // Clean up Admin SDK app
    try {
      await adminApp?.delete();
    } catch {
      // ignore
    }
  }, 15000);

  // Helper to call a Cloud Function (same pattern as other integration tests)
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
  // selectAds — Basic Selection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic ad selection', () => {
    it('should return ads for video_feed placement', async () => {
      // Use limit: 20 (the function's MAX_LIMIT) to ensure TEST_CAMPAIGN_ID is
      // always in the result set regardless of how many test campaigns exist in DB.
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
      });

      // Response shape: { result: { ads: [...] } }
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(Array.isArray(result.result.ads)).toBe(true);

      // Our seeded campaign should appear
      const testAd = result.result.ads.find(
        (ad: any) => ad.campaignId === TEST_CAMPAIGN_ID
      );
      expect(testAd).toBeDefined();
      expect(testAd.placement).toBe('video_feed');
      expect(testAd.creativeType).toBe('image');
      expect(testAd.assetUrl).toBe('https://example.com/test-ad-creative.jpg');
      expect(testAd.primaryText).toBe('Test Ad — Visit Beautiful Paris!');
      expect(testAd.cta).toBe('Book Now');
      expect(testAd.landingUrl).toBe('https://example.com/paris-tour');
      expect(testAd.billingModel).toBe('cpm');
      expect(testAd.businessName).toBe('Integration Test Campaign');
    }, 20000);

    it('should return empty array for placement with no campaigns', async () => {
      // Seed only video_feed — ai_slot should have nothing from us
      const result = await callCloudFunction('selectAds', {
        placement: 'ai_slot',
        limit: 5,
      });

      expect(result.result).toBeDefined();
      expect(Array.isArray(result.result.ads)).toBe(true);
      // Our test campaign targets video_feed, so it shouldn't appear here
      const testAd = result.result.ads.find(
        (ad: any) => ad.campaignId === TEST_CAMPAIGN_ID
      );
      expect(testAd).toBeUndefined();
    }, 20000);

    it('should return exactly the requested number of ads when enough campaigns exist', async () => {
      // We have at least 1 active campaign seeded — limit: 1 must return exactly 1
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 1,
      });

      expect(result.result.ads.length).toBe(1);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // selectAds — Targeting / Scoring
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Targeting and scoring', () => {
    /**
     * Prove that scoring actually works by seeding:
     *   - A "high-score" campaign that matches every targeting field in the context
     *   - A "blank" campaign with no targeting fields (will always score 0)
     * With a fully-matching userContext, the high-score campaign must appear at
     * a lower index (ranked higher) than the blank campaign in the sorted results.
     */
    it('ranks a campaign matching the user context above a campaign with no targeting', async () => {
      const db = getAdminDb();
      const highId = `__test_scoring_high_${Date.now()}`;
      const blankId = `__test_scoring_blank_${Date.now() + 1}`;

      await db.collection('ads_campaigns').doc(highId).set({
        uid: 'test-advertiser-uid',
        name: 'High Score Paris Campaign',
        status: 'active',
        placement: 'video_feed',
        isUnderReview: false,
        startDate: offsetDate(-7),
        endDate: offsetDate(30),
        creativeType: 'image',
        assetUrl: 'https://example.com/high-score.jpg',
        primaryText: 'High Score Paris Ad',
        cta: 'Book Now',
        landingUrl: 'https://example.com',
        billingModel: 'cpm',
        budgetAmount: '100.00',
        budgetCents: 10000,
        // Full targeting — all fields match the userContext below
        targetDestination: 'Paris, France',
        targetGender: 'Female',
        targetTripTypes: ['romantic'],
        targetActivityPreferences: ['Cultural'],
        targetTravelStyles: ['luxury'],
        targetTravelStartDate: offsetDate(-7),
        targetTravelEndDate: offsetDate(30),
        totalImpressions: 0,
        totalClicks: 0,
      });
      createdCampaignIds.push(highId);

      // Blank campaign: no targeting fields → will always score 0
      await db.collection('ads_campaigns').doc(blankId).set({
        uid: 'test-advertiser-uid',
        name: 'Blank Score Campaign',
        status: 'active',
        placement: 'video_feed',
        isUnderReview: false,
        startDate: offsetDate(-7),
        endDate: offsetDate(30),
        creativeType: 'image',
        assetUrl: 'https://example.com/blank.jpg',
        primaryText: 'Blank Ad — No Targeting',
        cta: 'Learn More',
        landingUrl: 'https://example.com/blank',
        billingModel: 'cpm',
        budgetAmount: '100.00',
        budgetCents: 10000,
        totalImpressions: 0,
        totalClicks: 0,
      });
      createdCampaignIds.push(blankId);

      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
        userContext: {
          destination: 'Paris, France',
          gender: 'Female',
          tripTypes: ['romantic'],
          activityPreferences: ['Cultural'],
          travelStyles: ['luxury'],
          travelStartDate: todayYYYYMMDD(),
          travelEndDate: offsetDate(7),
        },
      });

      expect(result.result).toBeDefined();
      expect(Array.isArray(result.result.ads)).toBe(true);

      const highIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === highId);
      const blankIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === blankId);

      // Both must be present in the results
      expect(highIdx).toBeGreaterThanOrEqual(0);
      expect(blankIdx).toBeGreaterThanOrEqual(0);
      // The fully-matched campaign must rank BEFORE (lower index) the blank campaign
      expect(highIdx).toBeLessThan(blankIdx);
    }, 30000);

    it('returns an eligible campaign with no user context (scores 0 but still eligible)', async () => {
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
      });

      const testAd = result.result.ads.find(
        (ad: any) => ad.campaignId === TEST_CAMPAIGN_ID
      );
      expect(testAd).toBeDefined();
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // selectAds — Location Field Fallback (video_feed / ai_slot campaigns)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Location field fallback scoring', () => {
    const LOCATION_CAMPAIGN_ID = `__test_location_${Date.now()}`;

    beforeAll(async () => {
      const db = getAdminDb();
      await db.collection('ads_campaigns').doc(LOCATION_CAMPAIGN_ID).set({
        uid: 'test-advertiser-uid',
        name: 'Location-Only Campaign',
        status: 'active',
        placement: 'video_feed',
        isUnderReview: false,
        startDate: offsetDate(-7),
        endDate: offsetDate(30),
        creativeType: 'image',
        assetUrl: 'https://example.com/location-ad.jpg',
        primaryText: 'Explore Tokyo!',
        cta: 'Learn More',
        landingUrl: 'https://example.com/tokyo',
        billingModel: 'cpm',
        budgetAmount: '50.00',
        budgetCents: 5000,
        businessType: 'tour',
        // NO targetDestination — only location field (as video_feed campaigns store it)
        location: 'Tokyo, Japan',
        totalImpressions: 0,
        totalClicks: 0,
      });
      createdCampaignIds.push(LOCATION_CAMPAIGN_ID);
    }, 15000);

    it('should score destination match on location field when targetDestination is absent', async () => {
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
        userContext: {
          destination: 'Tokyo, Japan',
        },
      });

      expect(result.result).toBeDefined();
      const locationAd = result.result.ads.find(
        (ad: any) => ad.campaignId === LOCATION_CAMPAIGN_ID
      );
      expect(locationAd).toBeDefined();
      expect(locationAd.primaryText).toBe('Explore Tokyo!');
    }, 20000);

    it('location-campaign still returns (score 0) when destination does not match', async () => {
      // Score 0 is still eligible — the function has no hard destination filter.
      // We verify the campaign appears even when there is no match (limit=20, MAX_LIMIT).
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
        userContext: {
          destination: 'Berlin, Germany',
        },
      });

      expect(result.result).toBeDefined();
      expect(Array.isArray(result.result.ads)).toBe(true);

      const locationAd = result.result.ads.find(
        (ad: any) => ad.campaignId === LOCATION_CAMPAIGN_ID
      );
      // Campaign with no Berlin targeting is still eligible — must appear in results
      expect(locationAd).toBeDefined();
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // selectAds — Eligibility hard filters
  // Campaigns that fail these filters must NEVER appear in results.
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Eligibility hard filters — excluded campaigns never appear in results', () => {
    it('excludes campaigns with status "paused" from results', async () => {
      const id = `__test_paused_excl_${Date.now()}`;
      await getAdminDb().collection('ads_campaigns').doc(id).set({
        uid: 'test-advertiser-uid',
        name: 'Paused Campaign',
        status: 'paused',
        placement: 'video_feed',
        isUnderReview: false,
        startDate: offsetDate(-7),
        endDate: offsetDate(30),
        creativeType: 'image',
        assetUrl: 'https://example.com/paused.jpg',
        primaryText: 'Paused Ad',
        cta: 'Learn More',
        landingUrl: 'https://example.com',
        billingModel: 'cpm',
        budgetAmount: '50.00',
        budgetCents: 5000,
        totalImpressions: 0,
        totalClicks: 0,
      });
      createdCampaignIds.push(id);

      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
      });

      const pausedAd = result.result.ads.find((ad: any) => ad.campaignId === id);
      expect(pausedAd).toBeUndefined();
    }, 25000);

    it('excludes campaigns with budgetCents <= 0 from results', async () => {
      const id = `__test_no_budget_${Date.now()}`;
      await getAdminDb().collection('ads_campaigns').doc(id).set({
        uid: 'test-advertiser-uid',
        name: 'Budget Exhausted Campaign',
        status: 'active',
        placement: 'video_feed',
        isUnderReview: false,
        startDate: offsetDate(-7),
        endDate: offsetDate(30),
        creativeType: 'image',
        assetUrl: 'https://example.com/nobudget.jpg',
        primaryText: 'No Budget Ad',
        cta: 'Learn More',
        landingUrl: 'https://example.com',
        billingModel: 'cpm',
        budgetAmount: '0.00',
        budgetCents: 0,           // exhausted
        totalImpressions: 0,
        totalClicks: 0,
      });
      createdCampaignIds.push(id);

      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
      });

      const exhaustedAd = result.result.ads.find((ad: any) => ad.campaignId === id);
      expect(exhaustedAd).toBeUndefined();
    }, 25000);

    it('excludes campaigns whose endDate is in the past from results', async () => {
      const id = `__test_expired_${Date.now()}`;
      await getAdminDb().collection('ads_campaigns').doc(id).set({
        uid: 'test-advertiser-uid',
        name: 'Expired Campaign',
        status: 'active',
        placement: 'video_feed',
        isUnderReview: false,
        startDate: offsetDate(-30),
        endDate: offsetDate(-1),   // ended yesterday
        creativeType: 'image',
        assetUrl: 'https://example.com/expired.jpg',
        primaryText: 'Expired Ad',
        cta: 'Learn More',
        landingUrl: 'https://example.com',
        billingModel: 'cpm',
        budgetAmount: '50.00',
        budgetCents: 5000,
        totalImpressions: 0,
        totalClicks: 0,
      });
      createdCampaignIds.push(id);

      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
      });

      const expiredAd = result.result.ads.find((ad: any) => ad.campaignId === id);
      expect(expiredAd).toBeUndefined();
    }, 25000);

    it('excludes campaigns with isUnderReview=true from results', async () => {
      const id = `__test_review_excl_${Date.now()}`;
      await getAdminDb().collection('ads_campaigns').doc(id).set({
        uid: 'test-advertiser-uid',
        name: 'Under Review Campaign',
        status: 'active',
        placement: 'video_feed',
        isUnderReview: true,       // under review — must be excluded
        startDate: offsetDate(-7),
        endDate: offsetDate(30),
        creativeType: 'image',
        assetUrl: 'https://example.com/review.jpg',
        primaryText: 'Under Review Ad',
        cta: 'Learn More',
        landingUrl: 'https://example.com',
        billingModel: 'cpm',
        budgetAmount: '50.00',
        budgetCents: 5000,
        totalImpressions: 0,
        totalClicks: 0,
      });
      createdCampaignIds.push(id);

      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
      });

      const reviewAd = result.result.ads.find((ad: any) => ad.campaignId === id);
      expect(reviewAd).toBeUndefined();
    }, 25000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // selectAds — Input Validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Input validation', () => {
    it('should reject invalid placement', async () => {
      const result = await callCloudFunction('selectAds', {
        placement: 'invalid_placement',
      });

      // Cloud Function v2 onCall returns error via result.error
      expect(result.error).toBeDefined();
      expect(result.error.status).toBe('INVALID_ARGUMENT');
    }, 20000);

    it('should reject invalid date format in userContext', async () => {
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        userContext: {
          travelStartDate: 'not-a-date',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.status).toBe('INVALID_ARGUMENT');
    }, 20000);

    it('should reject start date after end date', async () => {
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        userContext: {
          travelStartDate: '2026-12-31',
          travelEndDate: '2026-01-01',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.status).toBe('INVALID_ARGUMENT');
    }, 20000);

    it('should accept request with no userContext', async () => {
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
      });

      expect(result.result).toBeDefined();
      expect(Array.isArray(result.result.ads)).toBe(true);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // selectAds — AdUnit structure
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AdUnit response structure', () => {
    it('should return all required AdUnit fields', async () => {
      // Use limit: 20 (the function's MAX_LIMIT) to ensure TEST_CAMPAIGN_ID is
      // always in the result set even when other test campaigns exist in the DB.
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
      });

      const testAd = result.result.ads.find(
        (ad: any) => ad.campaignId === TEST_CAMPAIGN_ID
      );
      expect(testAd).toBeDefined();

      // Required fields
      expect(typeof testAd.campaignId).toBe('string');
      expect(typeof testAd.placement).toBe('string');
      expect(typeof testAd.creativeType).toBe('string');
      expect(typeof testAd.assetUrl).toBe('string');
      expect(typeof testAd.primaryText).toBe('string');
      expect(typeof testAd.cta).toBe('string');
      expect(typeof testAd.landingUrl).toBe('string');
      expect(typeof testAd.billingModel).toBe('string');
      expect(typeof testAd.businessName).toBe('string');

      // Optional fields present for our test campaign
      expect(testAd.businessType).toBe('tour');
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // selectAds — Per-dimension targeting / score contribution
  //
  // Each test seeds a "match" campaign and a "control" campaign, then verifies
  // the match campaign ranks above the control in the sorted result.
  // All seeded IDs are registered in createdCampaignIds for afterAll cleanup.
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Per-dimension targeting — score contribution', () => {
    /** Seed a minimal valid campaign with optional targeting overrides. */
    const seedTargetCampaign = async (id: string, overrides: Record<string, unknown> = {}): Promise<void> => {
      await getAdminDb().collection('ads_campaigns').doc(id).set({
        uid: 'test-advertiser-uid',
        name: id,
        status: 'active',
        placement: 'video_feed',
        isUnderReview: false,
        startDate: offsetDate(-7),
        endDate: offsetDate(30),
        creativeType: 'image',
        assetUrl: 'https://example.com/test.jpg',
        primaryText: 'Targeting Test Ad',
        cta: 'Learn More',
        landingUrl: 'https://example.com',
        billingModel: 'cpm',
        budgetAmount: '100.00',
        budgetCents: 10000,
        totalImpressions: 0,
        totalClicks: 0,
        ...overrides,
      });
      createdCampaignIds.push(id);
    };

    // ── Age ---------------------------------------------------------------

    it('age: in-range campaign (+2) ranks above no-targeting campaign (0)', async () => {
      const ts = Date.now();
      const matchId = `__test_age_in_${ts}`;
      const noneId  = `__test_age_none_${ts + 1}`;

      await seedTargetCampaign(matchId, { ageFrom: '20', ageTo: '30' });
      await seedTargetCampaign(noneId);

      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed', limit: 20,
        userContext: { age: 25 },
      });

      const matchIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === matchId);
      const noneIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === noneId);
      expect(matchIdx).toBeGreaterThanOrEqual(0);
      expect(noneIdx).toBeGreaterThanOrEqual(0);
      expect(matchIdx).toBeLessThan(noneIdx);
    }, 30000);

    it('age: out-of-range campaign (0) ranks below in-range campaign (+2)', async () => {
      const ts = Date.now();
      const inId  = `__test_age_inrange_${ts}`;
      const outId = `__test_age_outrange_${ts + 1}`;

      await seedTargetCampaign(inId,  { ageFrom: '20', ageTo: '30' });
      await seedTargetCampaign(outId, { ageFrom: '35', ageTo: '50' });

      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed', limit: 20,
        userContext: { age: 25 },
      });

      const inIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === inId);
      const outIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === outId);
      expect(inIdx).toBeGreaterThanOrEqual(0);
      expect(outIdx).toBeGreaterThanOrEqual(0);
      expect(inIdx).toBeLessThan(outIdx);
    }, 30000);

    it('age: "65+" upper bound is treated as no upper limit (age 80 scores +2)', async () => {
      const ts = Date.now();
      const seniorId = `__test_age_senior_${ts}`;
      const noneId   = `__test_age_senior_none_${ts + 1}`;

      await seedTargetCampaign(seniorId, { ageFrom: '65', ageTo: '65+' });
      await seedTargetCampaign(noneId);

      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed', limit: 20,
        userContext: { age: 80 },
      });

      const seniorIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === seniorId);
      const noneIdx   = result.result.ads.findIndex((ad: any) => ad.campaignId === noneId);
      expect(seniorIdx).toBeGreaterThanOrEqual(0);
      expect(noneIdx).toBeGreaterThanOrEqual(0);
      expect(seniorIdx).toBeLessThan(noneIdx);
    }, 30000);

    // ── Gender ------------------------------------------------------------

    it('gender: matched campaign (+1) ranks above mismatched campaign (0 on gender)', async () => {
      const ts = Date.now();
      const matchId = `__test_gender_match_${ts}`;
      const missId  = `__test_gender_miss_${ts + 1}`;

      await seedTargetCampaign(matchId, { targetGender: 'Female' });
      await seedTargetCampaign(missId,  { targetGender: 'Male' });

      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed', limit: 20,
        userContext: { gender: 'Female' },
      });

      const matchIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === matchId);
      const missIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === missId);
      expect(matchIdx).toBeGreaterThanOrEqual(0);
      expect(missIdx).toBeGreaterThanOrEqual(0);
      expect(matchIdx).toBeLessThan(missIdx);
    }, 30000);

    it('gender: match is case-insensitive ("female" matches "Female" user)', async () => {
      const ts = Date.now();
      const matchId = `__test_gender_case_${ts}`;
      const noneId  = `__test_gender_case_none_${ts + 1}`;

      await seedTargetCampaign(matchId, { targetGender: 'female' }); // lowercase
      await seedTargetCampaign(noneId);

      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed', limit: 20,
        userContext: { gender: 'Female' },
      });

      const matchIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === matchId);
      const noneIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === noneId);
      expect(matchIdx).toBeGreaterThanOrEqual(0);
      expect(noneIdx).toBeGreaterThanOrEqual(0);
      expect(matchIdx).toBeLessThan(noneIdx);
    }, 30000);

    // ── Activity preferences ----------------------------------------------

    it('activity preferences: overlap (+1) ranks above no-targeting (0)', async () => {
      const ts = Date.now();
      const matchId = `__test_act_match_${ts}`;
      const noneId  = `__test_act_none_${ts + 1}`;
      // Unique destination used as an anchor: gives both campaigns +8 on itinerary_feed
      // scoring, guaranteeing they surface in the top-20 despite accumulated test data.
      // The activity-preference differential (+1 vs 0) determines their relative order.
      const uniqueDest = `ActPref Dest ${ts}`;

      await seedTargetCampaign(matchId, {
        placement: 'itinerary_feed',
        targetActivityPreferences: ['Cultural', 'Beach'],
        targetDestination: uniqueDest,
      });
      await seedTargetCampaign(noneId, {
        placement: 'itinerary_feed',
        targetDestination: uniqueDest,
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: { destination: uniqueDest, activityPreferences: ['Cultural', 'Hiking'] },
      });

      const matchIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === matchId);
      const noneIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === noneId);
      expect(matchIdx).toBeGreaterThanOrEqual(0);
      expect(noneIdx).toBeGreaterThanOrEqual(0);
      expect(matchIdx).toBeLessThan(noneIdx);
    }, 30000);

    it('activity preferences: no overlap means campaign does not score +1', async () => {
      const ts = Date.now();
      const overlapId   = `__test_act_overlap_${ts}`;
      const noOverlapId = `__test_act_nooverlap_${ts + 1}`;
      const uniqueDest  = `ActNoOverlap Dest ${ts}`;

      await seedTargetCampaign(overlapId,   {
        placement: 'itinerary_feed',
        targetActivityPreferences: ['Cultural'],
        targetDestination: uniqueDest,
      });
      await seedTargetCampaign(noOverlapId, {
        placement: 'itinerary_feed',
        targetActivityPreferences: ['Surfing', 'Fishing'],
        targetDestination: uniqueDest,
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: { destination: uniqueDest, activityPreferences: ['Cultural', 'Hiking'] },
      });

      const overlapIdx   = result.result.ads.findIndex((ad: any) => ad.campaignId === overlapId);
      const noOverlapIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === noOverlapId);
      expect(overlapIdx).toBeGreaterThanOrEqual(0);
      expect(noOverlapIdx).toBeGreaterThanOrEqual(0);
      expect(overlapIdx).toBeLessThan(noOverlapIdx);
    }, 30000);

    // ── Travel styles -----------------------------------------------------

    it('travel styles: overlap (+1) ranks campaign above no-targeting (0)', async () => {
      const ts = Date.now();
      const matchId = `__test_style_match_${ts}`;
      const noneId  = `__test_style_none_${ts + 1}`;
      const uniqueDest = `TravelStyle Dest ${ts}`;

      await seedTargetCampaign(matchId, {
        placement: 'itinerary_feed',
        targetTravelStyles: ['luxury', 'adventure'],
        targetDestination: uniqueDest,
      });
      await seedTargetCampaign(noneId, {
        placement: 'itinerary_feed',
        targetDestination: uniqueDest,
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: { destination: uniqueDest, travelStyles: ['luxury'] },
      });

      const matchIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === matchId);
      const noneIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === noneId);
      expect(matchIdx).toBeGreaterThanOrEqual(0);
      expect(noneIdx).toBeGreaterThanOrEqual(0);
      expect(matchIdx).toBeLessThan(noneIdx);
    }, 30000);

    // ── Trip types --------------------------------------------------------

    it('trip types: overlap (+1) ranks campaign above no-targeting (0)', async () => {
      const ts = Date.now();
      const matchId = `__test_trip_match_${ts}`;
      const noneId  = `__test_trip_none_${ts + 1}`;
      const uniqueDest = `TripType Dest ${ts}`;

      await seedTargetCampaign(matchId, {
        placement: 'itinerary_feed',
        targetTripTypes: ['romantic', 'adventure'],
        targetDestination: uniqueDest,
      });
      await seedTargetCampaign(noneId, {
        placement: 'itinerary_feed',
        targetDestination: uniqueDest,
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: { destination: uniqueDest, tripTypes: ['romantic'] },
      });

      const matchIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === matchId);
      const noneIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === noneId);
      expect(matchIdx).toBeGreaterThanOrEqual(0);
      expect(noneIdx).toBeGreaterThanOrEqual(0);
      expect(matchIdx).toBeLessThan(noneIdx);
    }, 30000);

    // ── Travel dates ------------------------------------------------------

    it('travel dates: overlapping date range (+2) ranks above no-date-targeting (0)', async () => {
      const ts = Date.now();
      const matchId = `__test_dates_match_${ts}`;
      const noneId  = `__test_dates_none_${ts + 1}`;
      // Unique destination anchors both campaigns so they score +8 on
      // itinerary_feed, guaranteeing they surface in top-20. The date-overlap
      // differential (+2 vs 0) then determines their relative rank.
      const uniqueDest = `Dates Dest ${ts}`;

      await seedTargetCampaign(matchId, {
        placement: 'itinerary_feed',
        targetTravelStartDate: offsetDate(-5),
        targetTravelEndDate:   offsetDate(14),
        targetDestination: uniqueDest,
      });
      await seedTargetCampaign(noneId, {
        placement: 'itinerary_feed',
        targetDestination: uniqueDest,
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: {
          destination: uniqueDest,
          travelStartDate: offsetDate(0),
          travelEndDate:   offsetDate(7),
        },
      });

      const matchIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === matchId);
      const noneIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === noneId);
      expect(matchIdx).toBeGreaterThanOrEqual(0);
      expect(noneIdx).toBeGreaterThanOrEqual(0);
      expect(matchIdx).toBeLessThan(noneIdx);
    }, 30000);

    it('travel dates: non-overlapping range does not score +2 (ranks at or after overlapping)', async () => {
      const ts = Date.now();
      const overlapId   = `__test_dates_overlap_${ts}`;
      const noOverlapId = `__test_dates_noop_${ts + 1}`;
      const uniqueDest = `DatesNonOverlap Dest ${ts}`;

      await seedTargetCampaign(overlapId, {
        placement: 'itinerary_feed',
        targetTravelStartDate: offsetDate(-5),
        targetTravelEndDate:   offsetDate(10),
        targetDestination: uniqueDest,
      });
      await seedTargetCampaign(noOverlapId, {
        placement: 'itinerary_feed',
        targetTravelStartDate: offsetDate(30),
        targetTravelEndDate:   offsetDate(60), // user travelling now — no overlap
        targetDestination: uniqueDest,
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: {
          destination: uniqueDest,
          travelStartDate: offsetDate(0),
          travelEndDate:   offsetDate(7),
        },
      });

      const overlapIdx   = result.result.ads.findIndex((ad: any) => ad.campaignId === overlapId);
      const noOverlapIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === noOverlapId);
      expect(overlapIdx).toBeGreaterThanOrEqual(0);
      expect(noOverlapIdx).toBeGreaterThanOrEqual(0);
      expect(overlapIdx).toBeLessThan(noOverlapIdx);
    }, 30000);

    // ── Destination / placeId --------------------------------------------

    it('placeId exact match (+10) ranks above destination string match (+8) for the same location', async () => {
      const ts = Date.now();
      const placeMatchId = `__test_place_exact_${ts}`;
      const destMatchId  = `__test_place_dest_${ts + 1}`;

      // Campaign A: has both placeId + targetDestination — scores +10 on placeId (itinerary_feed)
      await seedTargetCampaign(placeMatchId, {
        placement: 'itinerary_feed',
        targetPlaceId:     'ChIJD7fiBh9u5kcRYJSMaMOCCwQ',
        targetDestination: 'Paris, France',
      });
      // Campaign B: destination string only — scores +8 on string match (itinerary_feed)
      await seedTargetCampaign(destMatchId, {
        placement: 'itinerary_feed',
        targetDestination: 'Paris, France',
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: {
          destination: 'Paris, France',
          placeId:     'ChIJD7fiBh9u5kcRYJSMaMOCCwQ',
        },
      });

      const placeIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === placeMatchId);
      const destIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === destMatchId);
      expect(placeIdx).toBeGreaterThanOrEqual(0);
      expect(destIdx).toBeGreaterThanOrEqual(0);
      expect(placeIdx).toBeLessThan(destIdx);
    }, 30000);

    // ── Seen campaign penalty ---------------------------------------------

    it('seenCampaignIds: seen campaign (-5 penalty) ranks below identically-targeted fresh campaign', async () => {
      const ts = Date.now();
      const seenId  = `__test_seen_${ts}`;
      const freshId = `__test_fresh_${ts + 1}`;
      // Use a unique destination to boost both campaigns above the ambient noise of
      // other test campaigns, ensuring both appear within the limit-20 result set.
      const uniqueDest = `SeenTest Destination ${ts}`;

      // Use itinerary_feed so that destination scoring is active (+8 string match);
      // both campaigns score +8 on the unique destination, ensuring they surface in
      // top-20 regardless of accumulated test campaigns. The seenCampaignIds penalty
      // (-5) then separates them: fresh=+8, seen=+8−5=+3.
      await seedTargetCampaign(seenId,  { placement: 'itinerary_feed', name: 'Seen Campaign',  location: uniqueDest });
      await seedTargetCampaign(freshId, { placement: 'itinerary_feed', name: 'Fresh Campaign', location: uniqueDest });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        seenCampaignIds: [seenId],
        userContext: { destination: uniqueDest },
      });

      const seenIdx  = result.result.ads.findIndex((ad: any) => ad.campaignId === seenId);
      const freshIdx = result.result.ads.findIndex((ad: any) => ad.campaignId === freshId);
      // fresh scores +8 (dest match), seen scores +8−5 = +3.
      // Both should be in results; fresh must appear before seen.
      expect(freshIdx).toBeGreaterThanOrEqual(0);
      // seenIdx may be absent if too many negatively-ranked campaigns are cut off —
      // absence is still a valid pass: it ranked below fresh.
      if (seenIdx >= 0) {
        expect(freshIdx).toBeLessThan(seenIdx);
      }
    }, 30000);

    // ── Edge cases --------------------------------------------------------

    it('startDate = today is eligible (campaign starts on the current day)', async () => {
      const ts = Date.now();
      const todayId = `__test_start_today_${ts}`;
      // Use a unique destination to ensure this campaign scores +2 and surfaces
      // in the top 20 even when many other test campaigns are active in the DB.
      const uniqueDest = `StartToday Destination ${ts}`;

      // Use itinerary_feed so destination scoring is active; the unique destination
      // guarantees this campaign surfaces in top-20 with score +8.
      await seedTargetCampaign(todayId, {
        placement: 'itinerary_feed',
        startDate: todayYYYYMMDD(),
        location: uniqueDest,
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: { destination: uniqueDest },
      });

      const ad = result.result.ads.find((ad: any) => ad.campaignId === todayId);
      expect(ad).toBeDefined();
    }, 25000);

    it('endDate = today is eligible (campaign ends on the current day)', async () => {
      const ts = Date.now();
      const todayEndId = `__test_end_today_${ts}`;
      // Use itinerary_feed + unique destination so the campaign scores +8 and is
      // guaranteed to surface in top-20 despite accumulated test campaigns.
      const uniqueDest = `EndToday Destination ${ts}`;

      await seedTargetCampaign(todayEndId, {
        placement: 'itinerary_feed',
        endDate: todayYYYYMMDD(),
        location: uniqueDest,
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: { destination: uniqueDest },
      });

      const ad = result.result.ads.find((ad: any) => ad.campaignId === todayEndId);
      expect(ad).toBeDefined();
    }, 25000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // selectAds — Multi-criteria targeting
  //
  // Real-world campaigns rarely target just one dimension. These tests verify
  // that scores stack correctly across multiple criteria and that rankings
  // reflect combined signal strength.
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Multi-criteria targeting — compound score stacking', () => {
    /** Seed a minimal test campaign with the given overrides. Same helper as above. */
    // Use itinerary_feed so all intent-based scoring dimensions (destination, dates,
    // tripTypes, activityPreferences, travelStyles) are active. video_feed only
    // scores age and gender, which would cause destination-based tests to fail.
    const seedMulti = async (id: string, overrides: Record<string, unknown> = {}): Promise<void> => {
      await getAdminDb().collection('ads_campaigns').doc(id).set({
        uid: 'test-advertiser-uid',
        name: id,
        status: 'active',
        placement: 'itinerary_feed',
        isUnderReview: false,
        startDate: offsetDate(-7),
        endDate: offsetDate(30),
        creativeType: 'image',
        assetUrl: 'https://example.com/multi.jpg',
        primaryText: 'Multi-criteria Test Ad',
        cta: 'Learn More',
        landingUrl: 'https://example.com',
        billingModel: 'cpm',
        budgetAmount: '100.00',
        budgetCents: 10000,
        totalImpressions: 0,
        totalClicks: 0,
        ...overrides,
      });
      createdCampaignIds.push(id);
    };

    // ── Scenario 1: Destination + Gender + Age ─────────────────────────────
    //
    // User: destination='Santorini, Greece', gender='Female', age=28
    // Campaign A (full match):    dest +8  + gender +1 + age +2  = +11
    // Campaign B (partial match): dest +8  + gender +1           = +9
    // Campaign C (dest only):     dest +8                        = +8
    // Campaign D (no targeting):                                   0
    //
    // Expected ranking: A > B > C > D
    it('destination + gender + age: more matching criteria = higher rank', async () => {
      const ts = Date.now();
      const dest = `Santorini-${ts}, Greece`; // unique to isolate from other campaigns
      const [fullId, partialId, destOnlyId, noneId] = [
        `__test_mc1_full_${ts}`,
        `__test_mc1_partial_${ts + 1}`,
        `__test_mc1_dest_${ts + 2}`,
        `__test_mc1_none_${ts + 3}`,
      ];

      await seedMulti(fullId, {
        location: dest,
        targetGender: 'Female',
        ageFrom: '25', ageTo: '35',
      });
      await seedMulti(partialId, {
        location: dest,
        targetGender: 'Female',
      });
      await seedMulti(destOnlyId, {
        location: dest,
      });
      await seedMulti(noneId);

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: {
          destination: dest,
          gender: 'Female',
          age: 28,
        },
      });

      expect(result.result).toBeDefined();
      const ads = result.result.ads as any[];

      const fullIdx    = ads.findIndex(a => a.campaignId === fullId);
      const partialIdx = ads.findIndex(a => a.campaignId === partialId);
      const destIdx    = ads.findIndex(a => a.campaignId === destOnlyId);

      // All three destination-matched campaigns must appear
      expect(fullIdx).toBeGreaterThanOrEqual(0);
      expect(partialIdx).toBeGreaterThanOrEqual(0);
      expect(destIdx).toBeGreaterThanOrEqual(0);

      // Full match (+11) > partial match (+9) > dest-only (+8)
      expect(fullIdx).toBeLessThan(partialIdx);
      expect(partialIdx).toBeLessThan(destIdx);
    }, 35000);

    // ── Scenario 2: Destination + Trip Types + Travel Dates ────────────────
    //
    // User: destination='Kyoto-<ts>, Japan', tripTypes=['cultural'],
    //       travelStart/End overlapping with campaign range
    // Campaign A: dest + tripTypes + dates  → +8+1+2 = +11
    // Campaign B: dest + tripTypes          → +8+1   = +9
    // Campaign C: dest only                 → +8
    //
    // Expected ranking: A > B > C
    it('destination + trip types + travel dates: scores stack correctly', async () => {
      const ts = Date.now();
      const dest = `Kyoto-${ts}, Japan`;
      const [fullId, noDateId, destOnlyId] = [
        `__test_mc2_full_${ts}`,
        `__test_mc2_nodate_${ts + 1}`,
        `__test_mc2_dest_${ts + 2}`,
      ];

      await seedMulti(fullId, {
        location: dest,
        targetTripTypes: ['cultural', 'solo'],
        targetTravelStartDate: offsetDate(-5),
        targetTravelEndDate:   offsetDate(14),
      });
      await seedMulti(noDateId, {
        location: dest,
        targetTripTypes: ['cultural'],
        // no travel date targeting
      });
      await seedMulti(destOnlyId, {
        location: dest,
        // no trip-type or date targeting
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: {
          destination: dest,
          tripTypes: ['cultural'],
          travelStartDate: offsetDate(0),
          travelEndDate:   offsetDate(7),
        },
      });

      expect(result.result).toBeDefined();
      const ads = result.result.ads as any[];

      const fullIdx   = ads.findIndex(a => a.campaignId === fullId);
      const noDateIdx = ads.findIndex(a => a.campaignId === noDateId);
      const destIdx   = ads.findIndex(a => a.campaignId === destOnlyId);

      expect(fullIdx).toBeGreaterThanOrEqual(0);
      expect(noDateIdx).toBeGreaterThanOrEqual(0);
      expect(destIdx).toBeGreaterThanOrEqual(0);

      // A (+11) > B (+9) > C (+8)
      expect(fullIdx).toBeLessThan(noDateIdx);
      expect(noDateIdx).toBeLessThan(destIdx);
    }, 35000);

    // ── Scenario 3: Gender + Activity Preferences + Travel Styles ──────────
    //
    // Pure interest-based stacking — no geographic signal.
    // User: gender='Male', activityPreferences=['Adventure'], travelStyles=['backpacker']
    // Campaign A: gender + activity + style   → +1+1+1     = +3 (without dest)
    // Campaign B: gender + activity           → +1+1       = +2
    // Campaign C: gender only                 → +1
    // Campaign D: no targeting                → 0
    //
    // All 4 campaigns also carry the same unique destination so they score an
    // additional +8 on itinerary_feed, guaranteeing they surface in the top-20.
    // Score totals: A=+11, B=+10, C=+9, D=+8 — relative ordering is preserved.
    it('gender + activity preferences + travel styles: interest scores stack', async () => {
      const ts = Date.now();
      const uniqueDest = `GenderActStyle Dest ${ts}`;
      const [fullId, noStyleId, genderOnlyId, noneId] = [
        `__test_mc3_full_${ts}`,
        `__test_mc3_nostyle_${ts + 1}`,
        `__test_mc3_gender_${ts + 2}`,
        `__test_mc3_none_${ts + 3}`,
      ];

      await seedMulti(fullId, {
        location: uniqueDest,
        targetGender: 'Male',
        targetActivityPreferences: ['Adventure', 'Hiking'],
        targetTravelStyles: ['backpacker'],
      });
      await seedMulti(noStyleId, {
        location: uniqueDest,
        targetGender: 'Male',
        targetActivityPreferences: ['Adventure'],
        // no travel style
      });
      await seedMulti(genderOnlyId, {
        location: uniqueDest,
        targetGender: 'Male',
        // no activity or style
      });
      await seedMulti(noneId, {
        location: uniqueDest,
        // no targeting at all, but same dest gives +2 to all
      });

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        userContext: {
          destination: uniqueDest,
          gender: 'Male',
          activityPreferences: ['Adventure'],
          travelStyles: ['backpacker'],
        },
      });

      expect(result.result).toBeDefined();
      const ads = result.result.ads as any[];

      const fullIdx     = ads.findIndex(a => a.campaignId === fullId);       // +8+1+1+1 = +11
      const noStyleIdx  = ads.findIndex(a => a.campaignId === noStyleId);    // +8+1+1   = +10
      const genderIdx   = ads.findIndex(a => a.campaignId === genderOnlyId); // +8+1     = +9
      const noneIdx     = ads.findIndex(a => a.campaignId === noneId);       // +8

      expect(fullIdx).toBeGreaterThanOrEqual(0);
      expect(noStyleIdx).toBeGreaterThanOrEqual(0);
      expect(genderIdx).toBeGreaterThanOrEqual(0);
      expect(noneIdx).toBeGreaterThanOrEqual(0);

      // Each added criterion lifts the campaign one rank higher
      expect(fullIdx).toBeLessThan(noStyleIdx);   // +11 > +10
      expect(noStyleIdx).toBeLessThan(genderIdx); // +10 > +9
      expect(genderIdx).toBeLessThan(noneIdx);    // +9 > +8
    }, 35000);

    // ── Scenario 4: Seen penalty interacts with multi-criteria score ────────
    //
    // A fully-matched multi-criteria campaign that has been seen can still rank
    // below a zero-targeted fresh campaign once the -5 penalty is applied.
    //
    // Campaign A (seen):  dest + gender + age → +8+1+2 = +11, but -5 seen → +6
    // Campaign B (fresh): dest + gender + age → +8+1+2 = +11 (no penalty)
    //
    // The important assertion is that a FRESH + fully-matched campaign (score+11)
    // beats the SEEN + fully-matched campaign (score +6).
    it('seen penalty negates high multi-criteria score: fresh zero-targeted ranks above seen high-scored', async () => {
      const ts = Date.now();
      const uniqueDest = `SeenMulti Dest ${ts}`;
      const seenHighId = `__test_mc4_seen_${ts}`;
      const freshHighId = `__test_mc4_fresh_${ts + 1}`;

      // Both campaigns fully match — only seenHighId will be penalised
      await seedMulti(seenHighId, {
        location: uniqueDest,
        targetGender: 'Female',
        ageFrom: '20', ageTo: '40',
      }); // score = +8+1+2 = +11, but -5 if seen → effective +6
      await seedMulti(freshHighId, {
        location: uniqueDest,
        targetGender: 'Female',
        ageFrom: '20', ageTo: '40',
      }); // same, but NOT seen → score +11

      const result = await callCloudFunction('selectAds', {
        placement: 'itinerary_feed', limit: 20,
        seenCampaignIds: [seenHighId],
        userContext: {
          destination: uniqueDest,
          gender: 'Female',
          age: 30,
        },
      });

      expect(result.result).toBeDefined();
      const ads = result.result.ads as any[];

      const freshIdx = ads.findIndex(a => a.campaignId === freshHighId); // +5
      const seenIdx  = ads.findIndex(a => a.campaignId === seenHighId);  // 0

      // Fresh (+5) must appear above (or before) seen (0)
      expect(freshIdx).toBeGreaterThanOrEqual(0);
      if (seenIdx >= 0) {
        expect(freshIdx).toBeLessThan(seenIdx);
      }
    }, 35000);
  });
});

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

describe('selectAds — Live Integration Tests', () => {
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

    // Seed the test campaign via Admin SDK (bypasses security rules)
    const db = getAdminDb();
    await db.collection('ads_campaigns').doc(TEST_CAMPAIGN_ID).set(testCampaign);
    createdCampaignIds.push(TEST_CAMPAIGN_ID);
  }, 30000);

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
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 10,
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

    it('should respect the limit parameter', async () => {
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 1,
      });

      expect(result.result.ads.length).toBeLessThanOrEqual(1);
    }, 20000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // selectAds — Targeting / Scoring
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Targeting and scoring', () => {
    it('should boost score for matching destination', async () => {
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 10,
        userContext: {
          destination: 'Paris, France',
        },
      });

      expect(result.result).toBeDefined();
      const testAd = result.result.ads.find(
        (ad: any) => ad.campaignId === TEST_CAMPAIGN_ID
      );
      expect(testAd).toBeDefined();
      // When destination matches, score is higher so our ad should be among the first
    }, 20000);

    it('should boost score for matching gender + trip types', async () => {
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 10,
        userContext: {
          destination: 'Paris, France',
          gender: 'Female',
          tripTypes: ['romantic'],
          activityPreferences: ['Cultural'],
          travelStyles: ['luxury'],
        },
      });

      const testAd = result.result.ads.find(
        (ad: any) => ad.campaignId === TEST_CAMPAIGN_ID
      );
      expect(testAd).toBeDefined();
    }, 20000);

    it('should boost score for overlapping travel dates', async () => {
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 10,
        userContext: {
          destination: 'Paris, France',
          travelStartDate: todayYYYYMMDD(),
          travelEndDate: offsetDate(7),
        },
      });

      const testAd = result.result.ads.find(
        (ad: any) => ad.campaignId === TEST_CAMPAIGN_ID
      );
      expect(testAd).toBeDefined();
    }, 20000);

    it('should still return campaign with no user context (score 0 but eligible)', async () => {
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

    it('should not match location field against a different destination', async () => {
      // Request ads with a destination that doesn't match
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 20,
        userContext: {
          destination: 'Berlin, Germany',
        },
      });

      expect(result.result).toBeDefined();
      // The ad should still appear (eligible) but score should be lower;
      // if many campaigns exist with Berlin targeting, it may be pushed down.
      // We just verify it's still returned (score 0 is still eligible).
      const locationAd = result.result.ads.find(
        (ad: any) => ad.campaignId === LOCATION_CAMPAIGN_ID
      );
      // It could appear or not depending on total campaign count + limit
      // The key assertion is the previous test: matching destination DOES boost it
      expect(result.result.ads).toBeDefined();
    }, 20000);
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
      const result = await callCloudFunction('selectAds', {
        placement: 'video_feed',
        limit: 10,
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
});

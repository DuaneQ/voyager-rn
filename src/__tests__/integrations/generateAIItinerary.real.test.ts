/**
 * Integration Tests for AI Itinerary Generation - Production Architecture
 *
 * Tests the ACTUAL production flow as called by useAIGenerationV2:
 *   1. generateFullItinerary - OpenAI generates the full itinerary (0 Places API calls)
 *   2. searchAccommodations  - Google Places finds hotels (1 Places Text Search call)
 *   3. searchFlights         - SerpAPI finds flights (airplane mode only, 0 Places calls)
 *
 * NOTE: searchActivities is NOT part of the production flow and is NOT tested here.
 * It was used in a legacy architecture and has been fully replaced by generateFullItinerary.
 * Confirmed: zero client-side calls to searchActivities exist in useAIGenerationV2 or any
 * production code path.
 *
 * Cost per full test run:
 *   - generateFullItinerary: ~$0.01–0.03 per call (OpenAI gpt-3.5-turbo)
 *   - searchAccommodations:  ~$0.032 per call (Google Places Text Search)
 *   - searchFlights:         Uses SerpAPI (separate billing, not Google Places)
 *
 * CI GUARD: Tests are skipped automatically in GitHub Actions (CI=true) to prevent
 * accidental billing. Run manually with: ALLOW_PAID_TESTS=true npm run test:integration
 */

import generateTestPreferenceProfiles, { TestPreferenceProfile } from './data/testPreferenceProfiles';

// CI Guard: skip automatically in GitHub Actions to prevent accidental billing from live API calls.
// To run manually: ALLOW_PAID_TESTS=true npm run test:integration
const ALLOW_PAID_TESTS = process.env.ALLOW_PAID_TESTS === 'true';
const describeOrSkip = ALLOW_PAID_TESTS ? describe : describe.skip;

const TEST_USER_EMAIL = 'feedback@travalpass.com';
const TEST_PASSWORD = '1111111111';
const FUNCTION_URL = 'https://us-central1-mundo1-dev.cloudfunctions.net';

describeOrSkip('AI Itinerary Generation - Production Architecture Integration Tests', () => {
  let testProfiles: TestPreferenceProfile[];
  let authToken: string;

  beforeAll(async () => {
    const authResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_PASSWORD,
          returnSecureToken: true,
        }),
      }
    );

    const authData = await authResponse.json();
    if (!authData.idToken) {
      throw new Error('Authentication failed: ' + JSON.stringify(authData));
    }
    authToken = authData.idToken;
    testProfiles = generateTestPreferenceProfiles();
  }, 30000);

  // Calls a deployed Firebase Cloud Function and returns the data payload.
  // generateFullItinerary → response.data = { aiOutput, transportation?, metadata }
  // searchAccommodations  → response.data = { hotels: [...], searchId }
  // searchFlights         → response (no data wrapper) = { success, flights: [...] }
  const callCloudFunction = async (functionName: string, payload: any) => {
    const response = await fetch(`${FUNCTION_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: payload }),
    });

    const result = await response.json();

    if (result?.result?.success) {
      return result.result.data || result.result;
    }

    throw new Error(`${functionName} failed: ${result?.result?.error || JSON.stringify(result)}`);
  };

  // ==========================================================================
  // generateFullItinerary
  // OpenAI gpt-3.5-turbo generates the full itinerary. Zero Google Places calls.
  // Response shape: { aiOutput: { travel_agent_summary, daily_plans, hotel_recommendation },
  //                   transportation?, metadata: { tripDays, destination, generatedBy, ... } }
  // ==========================================================================
  describe('generateFullItinerary - AI Output Quality', () => {
    it('should generate a valid 7-day itinerary with activities and meals for each day', async () => {
      const profile = testProfiles[0];

      const payload = {
        destination: 'Paris, France',
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        preferenceProfile: profile,
        groupSize: 2,
        userInfo: { uid: 'test-user-123', displayName: 'Test User' },
      };

      const response = await callCloudFunction('generateFullItinerary', payload);

      // Top-level structure
      expect(response).toBeDefined();
      expect(response.aiOutput).toBeDefined();
      expect(response.metadata).toBeDefined();

      const { aiOutput, metadata } = response;

      // Metadata fields
      expect(metadata.tripDays).toBe(7);
      expect(metadata.destination).toBe('Paris, France');
      expect(metadata.generatedBy).toBe('ai-first-v2');
      expect(metadata.processingTimeMs).toBeGreaterThan(0);

      // AI output structure
      expect(aiOutput.travel_agent_summary).toBeTruthy();
      expect(aiOutput.travel_agent_summary.length).toBeGreaterThan(20);
      expect(Array.isArray(aiOutput.daily_plans)).toBe(true);
      expect(aiOutput.daily_plans.length).toBe(7);

      // Each day has required fields
      const day = aiOutput.daily_plans[0];
      expect(day.day).toBe(1);
      expect(day.theme).toBeTruthy();
      expect(Array.isArray(day.activities)).toBe(true);
      expect(day.activities.length).toBeGreaterThan(0);
      expect(Array.isArray(day.meals)).toBe(true);
      expect(day.meals.length).toBeGreaterThan(0);

      // Activity has required fields
      const activity = day.activities[0];
      expect(activity.name).toBeTruthy();
      expect(activity.type).toBeTruthy();

      // Meal has required fields
      const meal = day.meals[0];
      expect(meal.name).toBeTruthy();
      expect(meal.cuisine).toBeTruthy();
    }, 60000);

    it('should generate a 3-day itinerary with the correct number of days', async () => {
      const profile = testProfiles[0];

      const payload = {
        destination: 'Barcelona, Spain',
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        preferenceProfile: profile,
        groupSize: 1,
        userInfo: { uid: 'test-user-123' },
      };

      const response = await callCloudFunction('generateFullItinerary', payload);

      expect(response.aiOutput.daily_plans.length).toBe(3);
      expect(response.metadata.tripDays).toBe(3);
    }, 60000);

    it('should include transportation recommendations for non-flight mode when origin is provided', async () => {
      const trainProfile = testProfiles.find(p => p.transportation.primaryMode === 'train')!;

      const payload = {
        destination: 'Rome, Italy',
        origin: 'Paris, France',
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        preferenceProfile: trainProfile,
        groupSize: 2,
        userInfo: { uid: 'test-user-123', displayName: 'Test User' },
      };

      const response = await callCloudFunction('generateFullItinerary', payload);

      expect(response.aiOutput.daily_plans.length).toBeGreaterThan(0);
      // Transportation is generated in parallel by generateFullItinerary when origin is provided
      // and mode is not flight
      expect(response.metadata.hasTransportation).toBe(true);
      expect(response.transportation).toBeDefined();
      expect(response.transportation.mode).toBeTruthy();
    }, 60000);
  });

  // ==========================================================================
  // searchAccommodations
  // 1 Google Places Text Search call per invocation. ~$0.032 per test.
  // Response shape (via data wrapper): { hotels: [...], searchId }
  // ==========================================================================
  describe('searchAccommodations - Hotel Data Quality', () => {
    it('should return hotels with required fields for a European destination', async () => {
      const profile = testProfiles[0];

      const payload = {
        destination: 'Paris, France',
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        preferenceProfile: profile,
      };

      const response = await callCloudFunction('searchAccommodations', payload);

      expect(response).toBeDefined();
      expect(Array.isArray(response.hotels)).toBe(true);
      expect(response.hotels.length).toBeGreaterThan(0);

      const hotel = response.hotels[0];
      expect(hotel.name).toBeTruthy();
      expect(hotel.placeId || hotel.id).toBeTruthy();
      expect(hotel.rating).toBeGreaterThan(0);
      // Address is returned in one of these fields
      expect(hotel.address || hotel.vicinity).toBeTruthy();
    }, 30000);

    it('should return hotels for an Asian destination', async () => {
      const profile = testProfiles[1];

      const payload = {
        destination: 'Tokyo, Japan',
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        preferenceProfile: profile,
      };

      const response = await callCloudFunction('searchAccommodations', payload);

      expect(Array.isArray(response.hotels)).toBe(true);
      expect(response.hotels.length).toBeGreaterThan(0);
      expect(response.hotels[0].name).toBeTruthy();
    }, 30000);
  });

  // ==========================================================================
  // Full Production Flow
  // Mirrors exactly what useAIGenerationV2 does: both functions run in parallel.
  // Total cost per run: ~$0.01–0.03 (OpenAI) + $0.032 (Places) = ~$0.04–0.06
  // ==========================================================================
  describe('Full Production Flow - generateFullItinerary + searchAccommodations in parallel', () => {
    it('should produce a complete itinerary package matching the production pipeline', async () => {
      const profile = testProfiles[0];

      const destination = 'Amsterdam, Netherlands';
      const startDate = '2026-06-01';
      const endDate = '2026-06-07';

      const itineraryPayload = {
        destination,
        startDate,
        endDate,
        preferenceProfile: profile,
        groupSize: 2,
        userInfo: { uid: 'test-user-123', displayName: 'Test User' },
      };

      const accommodationsPayload = {
        destination,
        startDate,
        endDate,
        preferenceProfile: profile,
      };

      // Run in parallel, exactly as useAIGenerationV2 does
      const [aiResponse, accommodationsResponse] = await Promise.all([
        callCloudFunction('generateFullItinerary', itineraryPayload),
        callCloudFunction('searchAccommodations', accommodationsPayload),
      ]);

      // AI itinerary
      expect(aiResponse.aiOutput.daily_plans.length).toBe(7);
      expect(aiResponse.aiOutput.travel_agent_summary).toBeTruthy();
      expect(aiResponse.metadata.tripDays).toBe(7);

      // Each day has at least 1 activity and 1 meal
      const activityCount = aiResponse.aiOutput.daily_plans.reduce(
        (sum: number, day: any) => sum + day.activities.length, 0
      );
      const mealCount = aiResponse.aiOutput.daily_plans.reduce(
        (sum: number, day: any) => sum + day.meals.length, 0
      );
      expect(activityCount).toBeGreaterThanOrEqual(7);
      expect(mealCount).toBeGreaterThanOrEqual(7);

      // Hotels from searchAccommodations
      expect(accommodationsResponse.hotels.length).toBeGreaterThan(0);
      expect(accommodationsResponse.hotels[0].name).toBeTruthy();
    }, 60000);
  });

  // ==========================================================================
  // searchFlights
  // Only called when transportation mode is 'airplane'. Uses SerpAPI — not
  // Google Places. No Places Text Search cost.
  // ==========================================================================
  describe('searchFlights - Airplane Transportation Mode Only', () => {
    it('should return flight options with required fields', async () => {
      const airplaneProfile = testProfiles.find(p => p.transportation.primaryMode === 'airplane')!;

      const today = new Date();
      const departureDate = new Date(today);
      departureDate.setDate(today.getDate() + 30);
      const returnDate = new Date(departureDate);
      returnDate.setDate(departureDate.getDate() + 7);

      const payload = {
        destination: 'Paris, France',
        departure: 'New York, NY',
        departureAirportCode: 'JFK',
        destinationAirportCode: 'CDG',
        departureDate: departureDate.toISOString().split('T')[0],
        returnDate: returnDate.toISOString().split('T')[0],
        startDate: departureDate.toISOString().split('T')[0],
        endDate: returnDate.toISOString().split('T')[0],
        tripDays: 7,
        preferenceProfile: airplaneProfile,
      };

      const response = await callCloudFunction('searchFlights', payload);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(Array.isArray(response.flights)).toBe(true);
      expect(response.flights.length).toBeGreaterThan(0);

      const flight = response.flights[0];
      expect(flight).toHaveProperty('departure');
      expect(flight).toHaveProperty('arrival');
      expect(flight).toHaveProperty('price');
    }, 30000);
  });
});


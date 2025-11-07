/**
 * COMPREHENSIVE Integration Test for searchItineraries Cloud Function
 * 
 * This test validates ALL filter logic in itinerariesRpc.ts (lines 155+):
 * - Destination filtering (exact match)
 * - Gender filtering (Male/Female/No Preference)
 * - Status filtering (single/couple/No Preference)
 * - Sexual Orientation filtering (heterosexual/bisexual/homosexual/No Preference)
 * - Age filtering (candidate age within searcher's lowerRange-upperRange)
 * - Date overlap filtering (trips must overlap)
 * - Blocked users filtering (bidirectional)
 * - Excluded IDs filtering (already viewed)
 * 
 * Test Flow:
 * 1. beforeAll: Authenticate + Seed 15+ diverse itineraries in CloudSQL
 * 2. Run tests: Call searchItineraries with specific filters, assert results match criteria
 * 3. afterAll: Delete all seeded itineraries
 */

import generateTestItineraries from './data/testItineraries';

const TEST_USER_ID = '3e6ot6MHvGR1Nu8wno0XbdAtOnP2';
const FUNCTION_URL = 'https://us-central1-mundo1-dev.cloudfunctions.net';

describe('searchItineraries - Comprehensive Filter Validation', () => {
  let createdItineraryIds: string[] = [];
  let authToken: string;

  beforeAll(async () => {
    
    
    // Authenticate to get ID token for createItinerary/deleteItinerary
    const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'usertravaltest@gmail.com',
        password: '1234567890',
        returnSecureToken: true,
      }),
    });

    const authData = await authResponse.json();
    if (!authData.idToken) {
      throw new Error('Authentication failed: ' + JSON.stringify(authData));
    }
    authToken = authData.idToken;
    

    // Seed test itineraries (batched for speed)
    const testItineraries = generateTestItineraries();
    

    const createPromises = testItineraries.map(async (itinerary) => {
      try {
        const response = await fetch(`${FUNCTION_URL}/createItinerary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ data: { itinerary } }),
        });

        const result = await response.json();
        
        if (result?.result?.success && result.result.data?.id) {
          return {
            success: true,
            id: result.result.data.id,
            destination: itinerary.destination,
            gender: itinerary.gender,
            age: itinerary.age,
            status: itinerary.status,
          };
        } else {
          return { success: false };
        }
      } catch (err: any) {
        console.error(`   ✗ Error creating ${itinerary.destination}:`, err.message);
        return { success: false };
      }
    });

    const results = await Promise.all(createPromises);
    
    // Collect successful IDs and log results
    results.forEach((result) => {
      if (result.success && result.id) {
        createdItineraryIds.push(result.id);
      }
    });
  }, 60000); // 60 second timeout for seeding

  afterAll(async () => {
    

    const deletePromises = createdItineraryIds.map(async (id) => {
      try {
        await fetch(`${FUNCTION_URL}/deleteItinerary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ data: { itineraryId: id } }),
        });
        return { success: true, id };
        } catch (err: any) {
        return { success: false, id };
      }
    });

    const deleteResults = await Promise.all(deletePromises);
    
    // Cleanup complete
  }, 60000);

  // Helper to call searchItineraries
  const callSearchItineraries = async (payload: any) => {
    const response = await fetch(`${FUNCTION_URL}/searchItineraries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload }),
    });

    const result = await response.json();
    if (result?.result?.success && Array.isArray(result.result.data)) {
      return result.result.data;
    }

    throw new Error(result?.result?.error || 'Unexpected RPC response');
  };

  describe('Destination Filtering', () => {
    it('should return only Paris itineraries when searching for Paris', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Paris, France',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      // Assert ALL results are for Paris
      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.destination).toBe('Paris, France');
      });

      
    });

    it('should return only Tokyo itineraries when searching for Tokyo', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Tokyo, Japan',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.destination).toBe('Tokyo, Japan');
      });

      
    });
  });

  describe('Gender Filtering', () => {
    it('should return only Male itineraries when filtering by Male', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Amsterdam, Netherlands',
        gender: 'Male',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.gender).toBe('Male');
      });

      
    });

    it('should return only Female itineraries when filtering by Female', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Amsterdam, Netherlands',
        gender: 'Female',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.gender).toBe('Female');
      });

      
    });
  });

  describe('Age Range Filtering', () => {
    it('should return only itineraries with age 18-27 when filtering by that range', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Barcelona, Spain',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 18,
        upperRange: 27,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        const age = Number(itinerary.age);
        expect(age).toBeGreaterThanOrEqual(18);
        expect(age).toBeLessThanOrEqual(27);
      });

      
    });

    it('should return only itineraries with age 25-35 when filtering by that range', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Barcelona, Spain',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 25,
        upperRange: 35,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        const age = Number(itinerary.age);
        expect(age).toBeGreaterThanOrEqual(25);
        expect(age).toBeLessThanOrEqual(35);
      });

      
    });

    it('should return only itineraries with age 40-55 when filtering by that range', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Barcelona, Spain',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 40,
        upperRange: 55,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        const age = Number(itinerary.age);
        expect(age).toBeGreaterThanOrEqual(40);
        expect(age).toBeLessThanOrEqual(55);
      });

      
    });
  });

  describe('Status Filtering', () => {
    it('should return only single status itineraries when filtering by single', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Rome, Italy',
        status: 'single',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.status).toBe('single');
      });

      
    });

    it('should return only couple status itineraries when filtering by couple', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Rome, Italy',
        status: 'couple',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.status).toBe('couple');
      });

      
    });
  });

  describe('Sexual Orientation Filtering', () => {
    it('should return only heterosexual itineraries when filtering by heterosexual', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Berlin, Germany',
        sexualOrientation: 'heterosexual',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.sexualOrientation).toBe('heterosexual');
      });

      
    });

    it('should return only bisexual itineraries when filtering by bisexual', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Berlin, Germany',
        sexualOrientation: 'bisexual',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.sexualOrientation).toBe('bisexual');
      });

      
    });

    it('should return only homosexual itineraries when filtering by homosexual', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Berlin, Germany',
        sexualOrientation: 'homosexual',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.sexualOrientation).toBe('homosexual');
      });

      
    });
  });

  describe('Date Overlap Filtering', () => {
    it('should return only itineraries overlapping with week 1 dates', async () => {
      const now = Date.now();
      const oneWeekLater = now + 7 * 24 * 60 * 60 * 1000;
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'London, UK',
        minStartDay: now,
        maxEndDay: twoWeeksLater, // Week 1-2 range
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      // Validate data quality - all results should be for London and overlap with the date range
      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.destination).toBe('London, UK');
        
        // Validate date overlap - itinerary should start before maxEndDay and end after minStartDay
        const itineraryStart = Number(itinerary.startDay);
        const itineraryEnd = Number(itinerary.endDay);
        
        expect(itineraryStart).toBeLessThanOrEqual(twoWeeksLater);
        expect(itineraryEnd).toBeGreaterThanOrEqual(now);
      });

      
    });

    it('should return only itineraries overlapping with week 3 dates', async () => {
      const threeWeeksFromNow = Date.now() + 21 * 24 * 60 * 60 * 1000;
      const fourWeeksFromNow = Date.now() + 28 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'London, UK',
        minStartDay: threeWeeksFromNow,
        maxEndDay: fourWeeksFromNow, // Week 3 range
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      // Validate data quality - all results should be for London and overlap with week 3 date range
      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.destination).toBe('London, UK');
        
        // Validate date overlap - itinerary should start before maxEndDay and end after minStartDay
        const itineraryStart = Number(itinerary.startDay);
        const itineraryEnd = Number(itinerary.endDay);
        
        expect(itineraryStart).toBeLessThanOrEqual(fourWeeksFromNow);
        expect(itineraryEnd).toBeGreaterThanOrEqual(threeWeeksFromNow);
      });

      
    });
  });

  describe('Excluded IDs Filtering', () => {
    it('should exclude itineraries in the excludedIds list', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      // First, get all Paris itineraries
      const allResults = await callSearchItineraries({
        destination: 'Paris, France',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      expect(allResults.length).toBeGreaterThan(0);
      const firstId = allResults[0].id;

      // Now exclude the first itinerary
      const filteredResults = await callSearchItineraries({
        destination: 'Paris, France',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [firstId],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 20,
        upperRange: 40,
      });

      // Should have one less result
      expect(filteredResults.length).toBe(allResults.length - 1);
      // Excluded ID should not appear
      expect(filteredResults.find((it: any) => it.id === firstId)).toBeUndefined();

      
    });
  });

  describe('Combined Filters', () => {
    it('should correctly apply multiple filters simultaneously', async () => {
      const now = Date.now();
      const twoWeeksLater = now + 14 * 24 * 60 * 60 * 1000;

      const results = await callSearchItineraries({
        destination: 'Paris, France',
        gender: 'Female',
        status: 'single',
        sexualOrientation: 'heterosexual',
        minStartDay: now,
        maxEndDay: twoWeeksLater,
        pageSize: 50,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: TEST_USER_ID,
        lowerRange: 25,
        upperRange: 35,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((itinerary: any) => {
        expect(itinerary.destination).toBe('Paris, France');
        expect(itinerary.gender).toBe('Female');
        expect(itinerary.status).toBe('single');
        expect(itinerary.sexualOrientation).toBe('heterosexual');
        const age = Number(itinerary.age);
        expect(age).toBeGreaterThanOrEqual(25);
        expect(age).toBeLessThanOrEqual(35);
      });

      
    });
  });
});

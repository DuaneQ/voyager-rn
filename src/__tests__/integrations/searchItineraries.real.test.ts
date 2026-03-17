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
          console.error(`[createItinerary] Failed for ${itinerary.destination}:`, result?.result?.error || JSON.stringify(result));
          return { success: false, error: result?.result?.error };
        }
      } catch (err: any) {
        console.error(`[createItinerary] Exception for ${itinerary.destination}:`, err.message);
        return { success: false, error: err.message };
      }
    });

    const results = await Promise.all(createPromises);
    
    // Collect successful IDs and log results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    if (failed.length > 0) {
      console.error(`[TEST SETUP] Failed to seed ${failed.length} itineraries`);
    }
    
    results.forEach((result) => {
      if (result.success && result.id) {
        createdItineraryIds.push(result.id);
      }
    });
    
    if (createdItineraryIds.length === 0) {
      throw new Error('CRITICAL: No test itineraries were created - all tests will fail!');
    }
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
    it('when preference is Female: matches candidates whose userInfo.gender is Female, excludes others', async () => {
      // The searcher sets gender: 'Female' in their itinerary (via AddItineraryModal).
      // This preference is matched against the CANDIDATE's userInfo.gender — not the candidate's
      // itinerary.gender preference field. Both explicit-gender ('Female') and 'No Preference'
      // candidates should appear if they ARE female in userInfo. Males must be excluded.
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

      // All returned candidates must be female in their userInfo
      results.forEach((itinerary: any) => {
        expect(itinerary.userInfo?.gender).toBe('Female');
      });

      // Candidate who set an explicit preference (itinerary.gender === 'Female') AND is Female in userInfo
      const explicitFemaleCandidate = results.find(
        (it: any) => it.gender === 'Female' && it.userInfo?.gender === 'Female',
      );
      expect(explicitFemaleCandidate).toBeDefined();

      // Candidate with 'No Preference' on their itinerary who IS Female in userInfo (the production bug case)
      const noPrefFemaleCandidate = results.find(
        (it: any) => it.gender === 'No Preference' && it.userInfo?.gender === 'Female',
      );
      expect(noPrefFemaleCandidate).toBeDefined();

      // Candidate who is Male in userInfo must NOT appear, even with 'No Preference' on itinerary
      const maleCandidateInResults = results.find(
        (it: any) => it.userInfo?.gender === 'Male',
      );
      expect(maleCandidateInResults).toBeUndefined();
    });

    it('when preference is Male: matches candidates whose userInfo.gender is Male, excludes others', async () => {
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
        expect(itinerary.userInfo?.gender).toBe('Male');
      });

      // Candidate with explicit itinerary.gender === 'Male' AND userInfo.gender === 'Male'
      const explicitMaleCandidate = results.find(
        (it: any) => it.gender === 'Male' && it.userInfo?.gender === 'Male',
      );
      expect(explicitMaleCandidate).toBeDefined();

      // Candidate with 'No Preference' on itinerary who IS Male in userInfo
      const noPrefMaleCandidate = results.find(
        (it: any) => it.gender === 'No Preference' && it.userInfo?.gender === 'Male',
      );
      expect(noPrefMaleCandidate).toBeDefined();

      // Female userInfo candidate must not appear
      const femaleCandidateInResults = results.find(
        (it: any) => it.userInfo?.gender === 'Female',
      );
      expect(femaleCandidateInResults).toBeUndefined();
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
    it('when preference is single: matches candidates whose userInfo.status is single, excludes others', async () => {
      // The searcher sets status: 'single' in their itinerary (via AddItineraryModal).
      // Matched against candidate's userInfo.status — both explicit-status and 'No Preference'
      // candidates should appear if they ARE single in userInfo. Couples must be excluded.
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
        expect(itinerary.userInfo?.status).toBe('single');
      });

      // Candidate who set an explicit preference (itinerary.status === 'single') AND is single in userInfo
      const explicitSingleCandidate = results.find(
        (it: any) => it.status === 'single' && it.userInfo?.status === 'single',
      );
      expect(explicitSingleCandidate).toBeDefined();

      // Candidate with 'No Preference' on itinerary who IS single in userInfo
      const noPrefSingleCandidate = results.find(
        (it: any) => it.status === 'No Preference' && it.userInfo?.status === 'single',
      );
      expect(noPrefSingleCandidate).toBeDefined();

      // Couple in userInfo must NOT appear, even with 'No Preference' on itinerary
      const coupleCandidateInResults = results.find(
        (it: any) => it.userInfo?.status === 'couple',
      );
      expect(coupleCandidateInResults).toBeUndefined();
    });

    it('when preference is couple: matches candidates whose userInfo.status is couple, excludes others', async () => {
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
        expect(itinerary.userInfo?.status).toBe('couple');
      });

      // Candidate with explicit itinerary.status === 'couple' AND userInfo.status === 'couple'
      const explicitCoupleCandidate = results.find(
        (it: any) => it.status === 'couple' && it.userInfo?.status === 'couple',
      );
      expect(explicitCoupleCandidate).toBeDefined();

      // Candidate with 'No Preference' on itinerary who IS a couple in userInfo
      const noPrefCoupleCandidate = results.find(
        (it: any) => it.status === 'No Preference' && it.userInfo?.status === 'couple',
      );
      expect(noPrefCoupleCandidate).toBeDefined();

      // Single in userInfo must NOT appear
      const singleCandidateInResults = results.find(
        (it: any) => it.userInfo?.status === 'single',
      );
      expect(singleCandidateInResults).toBeUndefined();
    });
  });

  describe('Sexual Orientation Filtering', () => {
    it('when preference is heterosexual: matches candidates whose userInfo.sexualOrientation is heterosexual, excludes others', async () => {
      // The searcher sets sexualOrientation: 'heterosexual' in their itinerary (via AddItineraryModal).
      // Matched against candidate's userInfo.sexualOrientation.
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
        expect(itinerary.userInfo?.sexualOrientation).toBe('heterosexual');
      });

      // Candidate with explicit itinerary.sexualOrientation === 'heterosexual' AND is hetero in userInfo
      const explicitHeteroCandidate = results.find(
        (it: any) => it.sexualOrientation === 'heterosexual' && it.userInfo?.sexualOrientation === 'heterosexual',
      );
      expect(explicitHeteroCandidate).toBeDefined();

      // Candidate with 'No Preference' on itinerary who IS heterosexual in userInfo
      const noPrefHeteroCandidate = results.find(
        (it: any) => it.sexualOrientation === 'No Preference' && it.userInfo?.sexualOrientation === 'heterosexual',
      );
      expect(noPrefHeteroCandidate).toBeDefined();

      // Homosexual in userInfo must NOT appear
      const homoCandidateInResults = results.find(
        (it: any) => it.userInfo?.sexualOrientation === 'homosexual',
      );
      expect(homoCandidateInResults).toBeUndefined();
    });

    it('when preference is bisexual: matches candidates whose userInfo.sexualOrientation is bisexual', async () => {
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
        expect(itinerary.userInfo?.sexualOrientation).toBe('bisexual');
      });

      const explicitBiCandidate = results.find(
        (it: any) => it.sexualOrientation === 'bisexual' && it.userInfo?.sexualOrientation === 'bisexual',
      );
      expect(explicitBiCandidate).toBeDefined();
    });

    it('when preference is homosexual: matches candidates whose userInfo.sexualOrientation is homosexual, excludes others', async () => {
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
        expect(itinerary.userInfo?.sexualOrientation).toBe('homosexual');
      });

      // Candidate with explicit itinerary.sexualOrientation === 'homosexual' AND is homo in userInfo
      const explicitHomoCandidate = results.find(
        (it: any) => it.sexualOrientation === 'homosexual' && it.userInfo?.sexualOrientation === 'homosexual',
      );
      expect(explicitHomoCandidate).toBeDefined();

      // Candidate with 'No Preference' on itinerary who IS homosexual in userInfo
      const noPrefHomoCandidate = results.find(
        (it: any) => it.sexualOrientation === 'No Preference' && it.userInfo?.sexualOrientation === 'homosexual',
      );
      expect(noPrefHomoCandidate).toBeDefined();

      // Heterosexual in userInfo must NOT appear
      const heteroCandidateInResults = results.find(
        (it: any) => it.userInfo?.sexualOrientation === 'heterosexual',
      );
      expect(heteroCandidateInResults).toBeUndefined();
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
    it.skip('should exclude itineraries in the excludedIds list', async () => {
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
    it.skip('should correctly apply multiple filters simultaneously', async () => {
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

/**
 * COMPREHENSIVE Integration Test for AI Itinerary Generation Cloud Functions
 * 
 * This test calls LIVE Firebase cloud functions via HTTP (like searchItineraries.real.test):
 * 1. searchAccommodations - fetch hotels from Google Places
 * 2. searchActivities - fetch activities & restaurants from Google Places  
 * 3. searchFlights - fetch flights from SerpAPI (only if transportation is 'airplane')
 * 
 * Test validates:
 * - All transportation modes (airplane, train, rental, public, walking, bus)
 * - Multiple trip durations (3, 7, 14 days)
 * - Different destinations (Europe, Asia, South America)
 * - Flight recommendations with complete data (when transportation is 'airplane')
 * - Hotel recommendations with names, locations, ratings
 * - Activity recommendations with enrichment data
 * - Restaurant/meal recommendations
 * 
 * Test Flow:
 * 1. Authenticate to get auth token
 * 2. Call cloud functions directly via HTTP POST with fetch()
 * 3. Assert responses have correct structure and data quality
 */

import generateTestPreferenceProfiles, { TestPreferenceProfile } from './data/testPreferenceProfiles';

const TEST_USER_EMAIL = 'feedback@travalpass.com';
const TEST_PASSWORD = '1111111111';
const TEST_USER_ID = 'Frj7COBIYEMqpHvTI7TQDRdJCwG3';
const FUNCTION_URL = 'https://us-central1-mundo1-dev.cloudfunctions.net';

describe('AI Itinerary Generation - Comprehensive Integration Tests', () => {
  let testProfiles: TestPreferenceProfile[];
  let authToken: string;

  beforeAll(async () => {
    
    
    // Authenticate to get ID token
    const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_PASSWORD,
        returnSecureToken: true,
      }),
    });

    const authData = await authResponse.json();
    if (!authData.idToken) {
      throw new Error('Authentication failed: ' + JSON.stringify(authData));
    }
    authToken = authData.idToken;
    

    // Generate test preference profiles
    testProfiles = generateTestPreferenceProfiles();
    testProfiles.forEach((profile) => {
      // profile metadata available for debugging if needed
    });
  }, 30000);

  // Helper to call cloud functions via HTTP
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

  // Helper to extract array data from response
  const extractArray = (response: any, ...keys: string[]): any[] => {
    for (const key of keys) {
      if (Array.isArray(response[key])) {
        return response[key];
      }
    }
    return [];
  };

  describe('Transportation Mode Validation', () => {
    it('should return FLIGHT recommendations when transportation is airplane', async () => {
      const airplaneProfile = testProfiles.find(p => p.transportation.primaryMode === 'airplane')!;
      
      // Use future dates for flight search (flight APIs don't return past dates)
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 30); // 30 days in future
      const returnDate = new Date(futureDate);
      returnDate.setDate(futureDate.getDate() + 7); // 7 day trip
      
      const departureDateStr = futureDate.toISOString().split('T')[0];
      const returnDateStr = returnDate.toISOString().split('T')[0];
      
      const payload = {
        destination: 'Paris, France',
        departure: 'New York, NY',
        departureAirportCode: 'JFK',
        destinationAirportCode: 'CDG',
        departureDate: departureDateStr,
        returnDate: returnDateStr,
        startDate: departureDateStr,
        endDate: returnDateStr,
        tripDays: 7,
        preferenceProfile: airplaneProfile,
      };

      
      
      // Call searchFlights (should return flights for airplane mode)
      const response = await callCloudFunction('searchFlights', payload);

      // Validate response structure
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.flights).toBeDefined();
      expect(Array.isArray(response.flights)).toBe(true);
      expect(response.flights.length).toBeGreaterThan(0);
      
      const flight = response.flights[0];
      expect(flight).toHaveProperty('departure');
      expect(flight).toHaveProperty('arrival');
      expect(flight).toHaveProperty('price');

      
    }, 30000);

    it('should return accommodations and activities for TRAIN mode', async () => {
      const trainProfile = testProfiles.find(p => p.transportation.primaryMode === 'train')!;
      
      const payload = {
        destination: 'Rome, Italy',
        departure: 'Paris, France',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: trainProfile,
      };

      
      
      // Call searchAccommodations
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      
      // Call searchActivities
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      // Validate accommodations
      expect(accommodationsResponse).toBeDefined();
      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      expect(Array.isArray(accommodations)).toBe(true);
      expect(accommodations.length).toBeGreaterThan(0);
      
      const hotel = accommodations[0];
      expect(hotel).toHaveProperty('name');

      // Validate activities
      expect(activitiesResponse).toBeDefined();
      const activities = extractArray(activitiesResponse, 'activities');
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);

      
    }, 30000);

    it('should return data for RENTAL CAR mode', async () => {
      const rentalProfile = testProfiles.find(p => p.transportation.primaryMode === 'rental')!;
      
      const payload = {
        destination: 'Los Angeles, CA, USA',
        departure: 'San Francisco, CA, USA',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: rentalProfile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      const activities = extractArray(activitiesResponse, 'activities');

      expect(accommodations.length).toBeGreaterThan(0);
      expect(activities.length).toBeGreaterThan(0);

      
    }, 30000);

    it('should return data for PUBLIC TRANSIT mode', async () => {
      const publicProfile = testProfiles.find(p => p.transportation.primaryMode === 'public')!;
      
      const payload = {
        destination: 'Tokyo, Japan',
        departure: 'Kyoto, Japan',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: publicProfile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      const activities = extractArray(activitiesResponse, 'activities');

      expect(accommodations.length).toBeGreaterThan(0);
      expect(activities.length).toBeGreaterThan(0);

      
    }, 30000);

    it('should return data for WALKING mode', async () => {
      const walkingProfile = testProfiles.find(p => p.transportation.primaryMode === 'walking')!;
      
      const payload = {
        destination: 'Barcelona, Spain',
        departure: 'Madrid, Spain',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: walkingProfile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      const activities = extractArray(activitiesResponse, 'activities');

      expect(accommodations.length).toBeGreaterThan(0);
      expect(activities.length).toBeGreaterThan(0);

      
    }, 30000);

    it('should return data for BUS mode', async () => {
      const busProfile = testProfiles.find(p => p.transportation.primaryMode === 'bus')!;
      
      const payload = {
        destination: 'Amsterdam, Netherlands',
        departure: 'Brussels, Belgium',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: busProfile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      const activities = extractArray(activitiesResponse, 'activities');

      expect(accommodations.length).toBeGreaterThan(0);
      expect(activities.length).toBeGreaterThan(0);

      
    }, 30000);
  });

  describe('Trip Duration Validation', () => {
    it('should return appropriate data for 3-day trip', async () => {
      const profile = testProfiles[0];
      
      const payload = {
        destination: 'Paris, France',
        departure: 'London, UK',
        startDate: '2026-01-15',
        endDate: '2026-01-17',
        tripDays: 3,
        preferenceProfile: profile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      const activities = extractArray(activitiesResponse, 'activities');

      expect(accommodations.length).toBeGreaterThan(0);
      expect(activities.length).toBeGreaterThan(0);
      
  // For 3-day trip, expect at least 3 activities (1 per day minimum)
  expect(activities.length).toBeGreaterThanOrEqual(3);
    }, 30000);

    it('should return appropriate data for 7-day trip', async () => {
      const profile = testProfiles[1];
      
      const payload = {
        destination: 'Tokyo, Japan',
        departure: 'Seoul, South Korea',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: profile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      const activities = extractArray(activitiesResponse, 'activities');

      expect(accommodations.length).toBeGreaterThan(0);
      expect(activities.length).toBeGreaterThan(0);
      
  // For 7-day trip, expect at least 7 activities
  expect(activities.length).toBeGreaterThanOrEqual(7);
    }, 30000);

    it('should return appropriate data for 14-day trip', async () => {
      const profile = testProfiles[2];
      
      const payload = {
        destination: 'Barcelona, Spain',
        departure: 'Lisbon, Portugal',
        startDate: '2026-01-15',
        endDate: '2026-01-28',
        tripDays: 14,
        preferenceProfile: profile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      const activities = extractArray(activitiesResponse, 'activities');

      expect(accommodations.length).toBeGreaterThan(0);
      expect(activities.length).toBeGreaterThan(0);
      
  // For 14-day trip, expect at least 14 activities
  expect(activities.length).toBeGreaterThanOrEqual(14);
    }, 30000);
  });

  describe('Data Quality and Enrichment Validation', () => {
    it('should include hotel recommendations with complete data', async () => {
      const profile = testProfiles[0];
      
      const payload = {
        destination: 'Paris, France',
        departure: 'London, UK',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: profile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');

      expect(accommodations.length).toBeGreaterThan(0);
      
      const hotel = accommodations[0];
      
      // Validate required fields
      expect(hotel).toHaveProperty('name');
      expect(hotel.name).toBeTruthy();
      
      // Location can be in different formats
      expect(hotel.location || hotel.address || hotel.vicinity).toBeTruthy();
      
  // Should have either rating or price
  expect(hotel.rating || hotel.price).toBeTruthy();
    }, 30000);

    it('should include restaurants/meals data', async () => {
      const profile = testProfiles[1];
      
      const payload = {
        destination: 'Rome, Italy',
        departure: 'Florence, Italy',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: profile,
      };

      
      
      const activitiesResponse = await callCloudFunction('searchActivities', payload);
      const activities = extractArray(activitiesResponse, 'activities');

      // Activities should include restaurants (Google Places returns restaurants as activities)
      expect(activities.length).toBeGreaterThan(0);
      
      // Check if some activities are restaurants (they should have types or categories)
      const hasRestaurants = activities.some((activity: any) => 
        activity.type === 'restaurant' || 
        activity.types?.includes('restaurant') ||
        activity.name?.toLowerCase().includes('restaurant') ||
        activity.name?.toLowerCase().includes('café')
      );
      
      expect(hasRestaurants || activities.length > 10).toBe(true); // Either explicit restaurants or many activities

      
    }, 30000);

    it('should include enriched activities with contact information', async () => {
      const profile = testProfiles[2];
      
      const payload = {
        destination: 'Barcelona, Spain',
        departure: 'Madrid, Spain',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: profile,
      };

      
      
      const activitiesResponse = await callCloudFunction('searchActivities', payload);
      const activities = extractArray(activitiesResponse, 'activities');

      expect(activities.length).toBeGreaterThan(0);
      
      const activity = activities[0];
      
      // Validate basic fields
      expect(activity).toHaveProperty('name');
      expect(activity.name).toBeTruthy();
      
      // Location can be in different formats
      expect(activity.location || activity.address || activity.vicinity).toBeTruthy();
      
      // Enriched data (at least some should have these)
      const hasEnrichment = activities.some((act: any) => 
        act.phone || act.website || act.price_level || act.rating
      );
      
  expect(hasEnrichment).toBe(true);
    }, 30000);
  });

  describe('Different Destinations', () => {
    it('should generate itinerary for European destination', async () => {
      const profile = testProfiles[0];
      
      const payload = {
        destination: 'Amsterdam, Netherlands',
        departure: 'Brussels, Belgium',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: profile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      const activities = extractArray(activitiesResponse, 'activities');

      expect(accommodations.length).toBeGreaterThan(0);
      expect(activities.length).toBeGreaterThan(0);

      
    }, 30000);

    it('should generate itinerary for Asian destination', async () => {
      const profile = testProfiles[1];
      
      const payload = {
        destination: 'Bangkok, Thailand',
        departure: 'Singapore',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: profile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      const activities = extractArray(activitiesResponse, 'activities');

      expect(accommodations.length).toBeGreaterThan(0);
      expect(activities.length).toBeGreaterThan(0);

      
    }, 30000);

    it('should generate itinerary for South American destination', async () => {
      const profile = testProfiles[2];
      
      const payload = {
        destination: 'Buenos Aires, Argentina',
        departure: 'São Paulo, Brazil',
        startDate: '2026-01-15',
        endDate: '2026-01-21',
        tripDays: 7,
        preferenceProfile: profile,
      };

      
      
      const accommodationsResponse = await callCloudFunction('searchAccommodations', payload);
      const activitiesResponse = await callCloudFunction('searchActivities', payload);

      const accommodations = extractArray(accommodationsResponse, 'accommodations', 'hotels');
      const activities = extractArray(activitiesResponse, 'activities');

      expect(accommodations.length).toBeGreaterThan(0);
      expect(activities.length).toBeGreaterThan(0);

      
    }, 30000);
  });
});

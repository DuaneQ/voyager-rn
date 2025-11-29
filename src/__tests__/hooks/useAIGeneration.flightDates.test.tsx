/**
 * Unit tests for useAIGeneration flight date field mapping fix
 * 
 * Tests that the hook correctly maps startDate/endDate to departureDate/returnDate
 * when calling the searchFlights cloud function.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAIGeneration } from '../../hooks/useAIGeneration';
import { httpsCallable } from 'firebase/functions';
import type { AIGenerationRequest } from '../../types/AIGeneration';

// Mock Firebase
jest.mock('../../config/firebaseConfig', () => ({
  functions: {},
  auth: { currentUser: { uid: 'test-user-123' } },
  getAuthInstance: jest.fn(() => ({ currentUser: { uid: 'test-user-123' } })),
}));

// Mock httpsCallable
const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

describe('useAIGeneration - Flight Date Field Mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should map startDate to departureDate and endDate to returnDate for flight searches', async () => {
    // Track what arguments each cloud function receives
    const mockSearchFlightsCalls: any[] = [];
    const mockSearchAccommodationsCalls: any[] = [];
    const mockSearchActivitiesCalls: any[] = [];

    mockHttpsCallable.mockImplementation((functions, functionName) => {
      // Return a callable function that returns a promise with data property
      return jest.fn((args) => {
        if (functionName === 'searchFlights') {
          mockSearchFlightsCalls.push(args);
          return Promise.resolve({ data: { success: true, flights: [] } });
        }
        if (functionName === 'searchAccommodations') {
          mockSearchAccommodationsCalls.push(args);
          return Promise.resolve({ data: { success: true, hotels: [] } });
        }
        if (functionName === 'searchActivities') {
          mockSearchActivitiesCalls.push(args);
          return Promise.resolve({ data: { success: true, activities: [], restaurants: [] } });
        }
        if (functionName === 'generateItineraryWithAI') {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: {
                assistant: JSON.stringify({
                  dailyPlans: [],
                  overview: 'Test itinerary'
                })
              }
            } 
          });
        }
        if (functionName === 'createItinerary') {
          return Promise.resolve({ data: { success: true, id: 'test-itinerary-id' } });
        }
        return Promise.resolve({ data: { success: true } });
      }) as any;
    });

    const { result } = renderHook(() => useAIGeneration());

    const request: AIGenerationRequest = {
      destination: 'Paris, France',
      destinationAirportCode: 'CDG',
      departure: 'New York, NY',
      departureAirportCode: 'JFK',
      startDate: '2025-12-01',
      endDate: '2025-12-07',
      tripType: 'leisure',
      preferenceProfileId: 'profile-1',
      userInfo: {
        uid: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com',
        gender: 'prefer-not-to-say',
        dob: '1990-01-01',
        status: 'single',
        sexualOrientation: 'prefer-not-to-say',
        blocked: []
      },
      preferenceProfile: {
        id: 'profile-1',
        name: 'Test Profile',
        userId: 'test-user-123',
        isDefault: true,
        travelStyle: 'mid-range',
        budgetRange: { min: 50, max: 200, currency: 'USD' },
        activities: [],
        foodPreferences: {
          dietaryRestrictions: [],
          cuisineTypes: [],
          foodBudgetLevel: 'medium'
        },
        accommodation: {
          type: 'hotel',
          starRating: 3,
          minUserRating: 3.5
        },
        transportation: {
          primaryMode: 'flight' // This should trigger flight search
        },
        groupSize: {
          preferred: 2,
          sizes: [1, 2]
        },
        accessibility: {
          mobilityNeeds: false,
          visualNeeds: false,
          hearingNeeds: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      flightPreferences: {
        class: 'economy',
        stopPreference: 'any',
        preferredAirlines: []
      }
    };

    await waitFor(async () => {
      await result.current.generateItinerary(request);
    }, { timeout: 10000 });

    // Verify searchFlights was called with correct date field names
    expect(mockSearchFlightsCalls.length).toBeGreaterThan(0);
    const flightCallArgs = mockSearchFlightsCalls[0];
    
    expect(flightCallArgs).toMatchObject({
      departureAirportCode: 'JFK',
      destinationAirportCode: 'CDG',
      departureDate: '2025-12-01', // NOT startDate
      returnDate: '2025-12-07', // NOT endDate
      cabinClass: 'ECONOMY',
      stops: 'ANY'
    });

    // Verify it does NOT include startDate/endDate in the flight payload
    expect(flightCallArgs).not.toHaveProperty('startDate');
    expect(flightCallArgs).not.toHaveProperty('endDate');
  });

  it('should NOT include basePayload fields in flight search', async () => {
    // Track what arguments each cloud function receives
    const mockSearchFlightsCalls: any[] = [];

    mockHttpsCallable.mockImplementation((functions, functionName) => {
      return jest.fn((args) => {
        if (functionName === 'searchFlights') {
          mockSearchFlightsCalls.push(args);
          return Promise.resolve({ data: { success: true, flights: [] } });
        }
        if (functionName === 'searchAccommodations') {
          return Promise.resolve({ data: { success: true, hotels: [] } });
        }
        if (functionName === 'searchActivities') {
          return Promise.resolve({ data: { success: true, activities: [], restaurants: [] } });
        }
        if (functionName === 'generateItineraryWithAI') {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: {
                assistant: JSON.stringify({
                  dailyPlans: [],
                  overview: 'Test itinerary'
                })
              }
            } 
          });
        }
        if (functionName === 'createItinerary') {
          return Promise.resolve({ data: { success: true, id: 'test-itinerary-id' } });
        }
        return Promise.resolve({ data: { success: true } });
      }) as any;
    });

    const { result } = renderHook(() => useAIGeneration());

    const request: AIGenerationRequest = {
      destination: 'London, UK',
      destinationAirportCode: 'LHR',
      departure: 'Boston, MA',
      departureAirportCode: 'BOS',
      startDate: '2025-12-10',
      endDate: '2025-12-17',
      tripType: 'business',
      preferenceProfileId: 'profile-2',
      userInfo: {
        uid: 'test-user-456',
        username: 'businessuser',
        email: 'business@example.com',
        gender: 'male',
        dob: '1985-05-15',
        status: 'married',
        sexualOrientation: 'straight',
        blocked: []
      },
      preferenceProfile: {
        id: 'profile-2',
        name: 'Business Profile',
        userId: 'test-user-456',
        isDefault: true,
        travelStyle: 'luxury',
        budgetRange: { min: 100, max: 500, currency: 'USD' },
        activities: [],
        foodPreferences: {
          dietaryRestrictions: [],
          cuisineTypes: [],
          foodBudgetLevel: 'high'
        },
        accommodation: {
          type: 'hotel',
          starRating: 4,
          minUserRating: 4.0
        },
        transportation: {
          primaryMode: 'airplane' // Also triggers flight search
        },
        groupSize: {
          preferred: 1,
          sizes: [1]
        },
        accessibility: {
          mobilityNeeds: false,
          visualNeeds: false,
          hearingNeeds: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      flightPreferences: {
        class: 'business',
        stopPreference: 'non-stop',
        preferredAirlines: ['AA', 'DL']
      }
    };

    await waitFor(async () => {
      await result.current.generateItinerary(request);
    }, { timeout: 10000 });

    // Verify flight payload does NOT include destination, days, preferenceProfile, etc
    expect(mockSearchFlightsCalls.length).toBeGreaterThan(0);
    const flightCallArgs = mockSearchFlightsCalls[0];
    expect(flightCallArgs).not.toHaveProperty('destination');
    expect(flightCallArgs).not.toHaveProperty('days');
    expect(flightCallArgs).not.toHaveProperty('preferenceProfile');
    expect(flightCallArgs).not.toHaveProperty('userInfo');
    expect(flightCallArgs).not.toHaveProperty('tripType');
    expect(flightCallArgs).not.toHaveProperty('mustInclude');
    expect(flightCallArgs).not.toHaveProperty('mustAvoid');
    expect(flightCallArgs).not.toHaveProperty('specialRequests');

    // Verify it ONLY has flight-specific fields
    expect(Object.keys(flightCallArgs).sort()).toEqual([
      'cabinClass',
      'departureAirportCode',
      'departureDate',
      'destinationAirportCode',
      'preferredAirlines',
      'returnDate',
      'stops'
    ].sort());
  });

  it('should handle missing fields error for flight search', async () => {
    mockHttpsCallable.mockImplementation((functions, functionName) => {
      return jest.fn((args) => {
        if (functionName === 'searchFlights') {
          return Promise.reject(new Error('Missing fields: departureDate'));
        }
        if (functionName === 'searchAccommodations') {
          return Promise.resolve({ data: { success: true, hotels: [] } });
        }
        if (functionName === 'searchActivities') {
          return Promise.resolve({ data: { success: true, activities: [], restaurants: [] } });
        }
        if (functionName === 'generateItineraryWithAI') {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: {
                assistant: JSON.stringify({
                  dailyPlans: [],
                  overview: 'Test itinerary'
                })
              }
            } 
          });
        }
        return Promise.resolve({ data: { success: true } });
      }) as any;
    });

    const { result } = renderHook(() => useAIGeneration());

    const request: AIGenerationRequest = {
      destination: 'Tokyo, Japan',
      destinationAirportCode: 'NRT',
      departure: 'San Francisco, CA',
      departureAirportCode: 'SFO',
      startDate: '2025-12-20',
      endDate: '2025-12-27',
      tripType: 'leisure',
      preferenceProfileId: 'profile-3',
      userInfo: {
        uid: 'test-user-789',
        username: 'traveler',
        email: 'traveler@example.com',
        gender: 'female',
        dob: '1992-03-20',
        status: 'single',
        sexualOrientation: 'straight',
        blocked: []
      },
      preferenceProfile: {
        id: 'profile-3',
        name: 'Adventure Profile',
        userId: 'test-user-789',
        isDefault: true,
        travelStyle: 'budget',
        budgetRange: { min: 25, max: 100, currency: 'USD' },
        activities: [],
        foodPreferences: {
          dietaryRestrictions: [],
          cuisineTypes: [],
          foodBudgetLevel: 'low'
        },
        accommodation: {
          type: 'hostel',
          starRating: 2,
          minUserRating: 3.0
        },
        transportation: {
          primaryMode: 'flight'
        },
        groupSize: {
          preferred: 2,
          sizes: [2]
        },
        accessibility: {
          mobilityNeeds: false,
          visualNeeds: false,
          hearingNeeds: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      flightPreferences: {
        class: 'economy',
        stopPreference: 'one-stop',
        preferredAirlines: []
      }
    };

    const response = await result.current.generateItinerary(request);

    expect(response.success).toBe(false);
    expect(response.error).toContain('Missing fields: departureDate');
  });
});

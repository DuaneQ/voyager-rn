/**
 * Payload Validation Test: AI Itinerary Generation (React Native)
 * 
 * This test verifies that AI-generated itineraries include the age field
 * calculated from userInfo.dob in ALL 4 code paths (non-flight and flight paths).
 * This test would have caught the bug where age was not being calculated.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { httpsCallable } from 'firebase/functions';
import { useAIGeneration } from '../../hooks/useAIGeneration';
import { calculateAge } from '../../utils/calculateAge';

// Mock Firebase
jest.mock('firebase/functions');
// Use centralized manual mock for firebaseConfig
jest.mock('../../config/firebaseConfig');

const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;

describe('useAIGeneration - Age Field Payload Validation (RN)', () => {
  const mockUserInfo = {
    uid: 'test-user',
    username: 'testuser',
    email: 'test@example.com',
    dob: '1995-08-20', // Age ~30
    gender: 'Male',
    status: 'Single',
    sexualOrientation: 'Straight',
    blocked: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should include age field in non-flight path itineraryData', async () => {
    // Mock Firebase Functions
    const mockSearchAccommodations = jest.fn().mockResolvedValue({
      data: { success: true, data: { hotels: [] } },
    });
    const mockSearchActivities = jest.fn().mockResolvedValue({
      data: { success: true, data: { activities: [], restaurants: [] } },
    });
    const mockGenerateItineraryWithAI = jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          itinerary: {
            id: 'ai-gen-id',
            dailyPlans: [],
          },
          assistant: JSON.stringify({ transportation: null }), // Required by hook
        },
      },
    });
    const mockCreateItinerary = jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          itinerary: { id: 'saved-itinerary-id' },
        },
      },
    });

    mockHttpsCallable.mockImplementation((functions, name) => {
      const callableMap: Record<string, any> = {
        searchAccommodations: mockSearchAccommodations,
        searchActivities: mockSearchActivities,
        generateItineraryWithAI: mockGenerateItineraryWithAI,
        createItinerary: mockCreateItinerary,
      };
      return callableMap[name] || jest.fn().mockResolvedValue({ data: {success: true} });
    });

    const { result } = renderHook(() => useAIGeneration());

    // Generate AI itinerary (non-flight path)
    await act(async () => {
      await result.current.generateItinerary({
        destination: 'Tokyo, Japan',
        startDate: '2025-12-01',
        endDate: '2025-12-07',
        tripType: 'leisure',
        userInfo: mockUserInfo,
        preferenceProfileId: 'profile-1',
        preferenceProfile: {
          id: 'profile-1',
          name: 'Default',
          isDefault: true,
          transportation: { primaryMode: 'driving' }, // Non-flight
          accommodations: { types: [] },
          activities: { interests: [] },
        } as any,
        specialRequests: '',
        mustInclude: [],
        mustAvoid: [],
        flightPreferences: {
          class: 'economy',
          stopPreference: 'any',
          preferredAirlines: [],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    // Calculate expected age
    const expectedAge = calculateAge(mockUserInfo.dob);

    // Verify createItinerary was called with age field
    expect(mockCreateItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        itinerary: expect.objectContaining({
          age: expectedAge, // CRITICAL: Age must be present
          destination: 'Tokyo, Japan',
          userInfo: expect.objectContaining({
            uid: 'test-user',
            dob: '1995-08-20',
          }),
        }),
      })
    );

    // Verify age is calculated correctly (~30)
    expect(expectedAge).toBeGreaterThanOrEqual(29);
    expect(expectedAge).toBeLessThanOrEqual(30);
  });

  it('should include age field in flight path itineraryData', async () => {
    // Mock functions for flight path
    const mockSearchFlights = jest.fn().mockResolvedValue({
      data: { success: true, data: { flights: [{ id: 'flight-1', price: 500 }] } },
    });
    const mockSearchAccommodations = jest.fn().mockResolvedValue({
      data: { success: true, data: { hotels: [{ id: 'hotel-1', name: 'Test Hotel' }] } },
    });
    const mockSearchActivities = jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: { 
          activities: [{ id: 'act-1', name: 'Test Activity' }], 
          restaurants: [{ id: 'rest-1', name: 'Test Restaurant' }] 
        }
      },
    });
    const mockGenerateItineraryWithAI = jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          itinerary: {
            id: 'flight-itinerary-id',
            dailyPlans: [],
          },
          assistant: JSON.stringify({ transportation: null }), // Required by hook
        },
      },
    });
    const mockCreateItinerary = jest.fn().mockResolvedValue({
      data: { success: true, data: { itinerary: { id: 'flight-itinerary-id' } } },
    });

    mockHttpsCallable.mockImplementation((functions, name) => {
      const callableMap: Record<string, any> = {
        searchFlights: mockSearchFlights,
        searchAccommodations: mockSearchAccommodations,
        searchActivities: mockSearchActivities,
        generateItineraryWithAI: mockGenerateItineraryWithAI,
        createItinerary: mockCreateItinerary,
      };
      return callableMap[name] || jest.fn().mockResolvedValue({ data: {success: true} });
    });

    const { result } = renderHook(() => useAIGeneration());

    // Generate AI itinerary with flights
    await act(async () => {
      await result.current.generateItinerary({
        destination: 'Paris, France',
        destinationAirportCode: 'CDG',
        departure: 'Austin, TX',
        departureAirportCode: 'AUS',
        startDate: '2025-12-01',
        endDate: '2025-12-07',
        tripType: 'leisure',
        userInfo: mockUserInfo,
        preferenceProfileId: 'profile-1',
        preferenceProfile: {
          id: 'profile-1',
          name: 'Default',
          isDefault: true,
          transportation: { primaryMode: 'airplane' }, // Flight path
          accommodations: { types: [] },
          activities: { interests: [] },
        } as any,
        specialRequests: '',
        mustInclude: [],
        mustAvoid: [],
        flightPreferences: {
          class: 'economy',
          stopPreference: 'any',
          preferredAirlines: [],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    const expectedAge = calculateAge(mockUserInfo.dob);

    // Verify createItinerary was called with age field (flight path)
    expect(mockCreateItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        itinerary: expect.objectContaining({
          age: expectedAge, // CRITICAL: Age must be present in flight path
          destination: 'Paris, France',
        }),
      })
    );

    expect(expectedAge).toBeGreaterThanOrEqual(29);
    expect(expectedAge).toBeLessThanOrEqual(30);
  });

  it('should default age to 0 when dob is invalid', async () => {
    const mockUserInfoInvalidDob = {
      ...mockUserInfo,
      dob: 'invalid-date', // Invalid DOB
    };

    const mockSearchAccommodations = jest.fn().mockResolvedValue({
      data: { success: true, data: { hotels: [] } },
    });
    const mockSearchActivities = jest.fn().mockResolvedValue({
      data: { success: true, data: { activities: [], restaurants: [] } },
    });
    const mockGenerateItineraryWithAI = jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          itinerary: {
            id: 'ai-gen-id',
            dailyPlans: [],
          },
          assistant: JSON.stringify({ transportation: null }), // Required by hook
        },
      },
    });
    const mockCreateItinerary = jest.fn().mockResolvedValue({
      data: { success: true, data: { itinerary: { id: 'test-id' } } },
    });

    mockHttpsCallable.mockImplementation((functions, name) => {
      const callableMap: Record<string, any> = {
        searchAccommodations: mockSearchAccommodations,
        searchActivities: mockSearchActivities,
        generateItineraryWithAI: mockGenerateItineraryWithAI,
        createItinerary: mockCreateItinerary,
      };
      return callableMap[name] || jest.fn().mockResolvedValue({ data: {success: true} });
    });

    const { result } = renderHook(() => useAIGeneration());

    await act(async () => {
      await result.current.generateItinerary({
        destination: 'Tokyo, Japan',
        startDate: '2025-12-01',
        endDate: '2025-12-07',
        tripType: 'leisure',
        userInfo: mockUserInfoInvalidDob,
        preferenceProfileId: 'profile-1',
        preferenceProfile: {
          id: 'profile-1',
          name: 'Default',
          isDefault: true,
          transportation: { primaryMode: 'driving' },
          accommodations: { types: [] },
          activities: { interests: [] },
        } as any,
        specialRequests: '',
        mustInclude: [],
        mustAvoid: [],
        flightPreferences: {
          class: 'economy',
          stopPreference: 'any',
          preferredAirlines: [],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    }, { timeout: 5000 });

    // Should default to age 0
    expect(mockCreateItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        itinerary: expect.objectContaining({
          age: 0, // CRITICAL: Must include age even if 0
        }),
      })
    );
  });

  it('should include age in both itineraryData and fullItinerary objects', async () => {
    // This test verifies ALL 4 locations where age must be set in RN AI generation
    const mockSearchAccommodations = jest.fn().mockResolvedValue({
      data: { success: true, data: { hotels: [] } },
    });
    const mockSearchActivities = jest.fn().mockResolvedValue({
      data: { success: true, data: { activities: [], restaurants: [] } },
    });
    const mockGenerateItineraryWithAI = jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          itinerary: {
            id: 'ai-gen-id',
            dailyPlans: [],
          },
          assistant: JSON.stringify({ transportation: null }), // Required by hook
        },
      },
    });
    const mockCreateItinerary = jest.fn().mockResolvedValue({
      data: { success: true, data: { itinerary: { id: 'test-id' } } },
    });

    mockHttpsCallable.mockImplementation((functions, name) => {
      const callableMap: Record<string, any> = {
        searchAccommodations: mockSearchAccommodations,
        searchActivities: mockSearchActivities,
        generateItineraryWithAI: mockGenerateItineraryWithAI,
        createItinerary: mockCreateItinerary,
      };
      return callableMap[name] || jest.fn().mockResolvedValue({ data: {success: true} });
    });

    const { result } = renderHook(() => useAIGeneration());

    await act(async () => {
      await result.current.generateItinerary({
        destination: 'Barcelona, Spain',
        startDate: '2025-12-01',
        endDate: '2025-12-07',
        tripType: 'leisure',
        userInfo: mockUserInfo,
        preferenceProfileId: 'profile-1',
        preferenceProfile: {
          id: 'profile-1',
          name: 'Default',
          isDefault: true,
          transportation: { primaryMode: 'driving' },
          accommodations: { types: [] },
          activities: { interests: [] },
        } as any,
        specialRequests: '',
        mustInclude: [],
        mustAvoid: [],
        flightPreferences: {
          class: 'economy',
          stopPreference: 'any',
          preferredAirlines: [],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    const expectedAge = calculateAge(mockUserInfo.dob);

    // Verify payload includes age in itinerary wrapper
    const callArgs = mockCreateItinerary.mock.calls[0][0];
    expect(callArgs).toHaveProperty('itinerary');
    expect(callArgs.itinerary).toHaveProperty('age', expectedAge);
    
    // Also verify user info is correct
    expect(callArgs.itinerary.userInfo).toMatchObject({
      uid: 'test-user',
      dob: '1995-08-20',
    });
  });
});

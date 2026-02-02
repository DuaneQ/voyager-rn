/**
 * Unit Tests for useAIGenerationV2 Hook
 * 
 * Tests the AI-First Itinerary Generation architecture:
 * - includeFlights detection from various primaryMode values
 * - Transportation JSON parsing (wrapped vs unwrapped format)
 * - Defensive handling of malformed/non-string primaryMode values
 * - Error handling
 * 
 * These tests prevent regressions in critical AI generation logic.
 */

import { renderHook, act } from '@testing-library/react-native';

// Mock firebase/functions with inline jest.fn() to avoid TDZ from jest hoisting
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));

// Use centralized firebaseConfig mock
jest.mock('../../config/firebaseConfig');

// Mock utility functions
jest.mock('../../utils/sanitizeInput', () => ({
  sanitizeAIGenerationRequest: jest.fn((request) => ({
    ...request,
    destination: request.destination || 'Paris',
    startDate: request.startDate || '2026-02-01',
    endDate: request.endDate || '2026-02-07',
  })),
}));

jest.mock('../../utils/profileDefaults', () => ({
  applyProfileDefaults: jest.fn((profile) => profile),
}));

jest.mock('../../utils/calculateAge', () => ({
  calculateAge: jest.fn(() => 30),
}));

jest.mock('../../utils/transformAIOutput', () => ({
  transformAIOutput: jest.fn(() => ({
    response: {
      data: {
        itinerary: { days: [] },
        metadata: {},
        costBreakdown: {},
      },
    },
  })),
  createVerifiedPlacesMap: jest.fn(() => new Map()),
  extractPlaceNames: jest.fn(() => ['Eiffel Tower', 'Louvre Museum']),
}));

// Get references to mocked modules
const mockedFunctions = jest.requireMock('firebase/functions');
const mockedProfileDefaults = jest.requireMock('../../utils/profileDefaults');

// Now import the hook under test
import { useAIGenerationV2 } from '../../hooks/useAIGenerationV2';

// Mock user info that satisfies the full userInfo interface
const mockUserInfo = {
  uid: 'user-123',
  username: 'TestUser',
  gender: 'Male',
  dob: '1990-01-01',
  status: 'single',
  sexualOrientation: 'heterosexual',
  email: 'test@example.com',
  blocked: [] as string[],
};

// Base request that satisfies required fields of AIGenerationRequest
const baseRequest = {
  destination: 'Paris',
  startDate: '2026-02-01',
  endDate: '2026-02-07',
  userInfo: mockUserInfo,
  tripType: 'leisure' as const,
  preferenceProfileId: 'pref-123',
};

describe('useAIGenerationV2', () => {
  // Default successful responses for each cloud function
  const mockAIResponse = {
    success: true,
    data: {
      aiOutput: {
        days: [{ day: 1, activities: [] }],
        travel_agent_summary: 'Great trip!',
      },
    },
  };

  const mockAccommodationsResponse = {
    success: true,
    data: {
      searchId: 'search-123',
      hotels: [{ name: 'Hotel Paris', price: 150 }],
    },
  };

  const mockFlightsResponse = {
    success: true,
    data: {
      flights: [{ airline: 'Air France', price: 500 }],
    },
  };

  const mockTransportationResponse = {
    success: true,
    data: {
      assistant: JSON.stringify({
        transportation: {
          recommended: 'metro',
          options: ['metro', 'bus', 'taxi'],
        },
      }),
    },
  };

  const mockSaveResponse = {
    success: true,
    data: { id: 'itinerary-123' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Reset mocks
    mockedProfileDefaults.applyProfileDefaults.mockImplementation((profile: any) => profile);
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useAIGenerationV2());

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.progress.stage).toBe('initializing');
      expect(result.current.progress.percent).toBe(5);
      expect(typeof result.current.generateItinerary).toBe('function');
      expect(typeof result.current.cancelGeneration).toBe('function');
    });
  });

  describe('includeFlights Detection', () => {
    it('should call searchFlights when primaryMode is airplane and airport codes provided', async () => {
      const searchFlightsMock = jest.fn(() => Promise.resolve({ data: mockFlightsResponse }));
      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.resolve({ data: mockAccommodationsResponse }));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'searchFlights') return searchFlightsMock;
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      mockedProfileDefaults.applyProfileDefaults.mockImplementation(() => ({
        transportation: { primaryMode: 'airplane' },
      }));

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        await result.current.generateItinerary({
          ...baseRequest,
          travelPreferences: { transportation: { primaryMode: 'airplane' } },
          departureAirportCode: 'LHR',
          destinationAirportCode: 'CDG',
        });
      });

      // Verify searchFlights was called
      expect(searchFlightsMock).toHaveBeenCalled();
    });

    it('should call searchFlights when primaryMode is "flight" (case insensitive)', async () => {
      const searchFlightsMock = jest.fn(() => Promise.resolve({ data: mockFlightsResponse }));
      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.resolve({ data: mockAccommodationsResponse }));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'searchFlights') return searchFlightsMock;
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      mockedProfileDefaults.applyProfileDefaults.mockReturnValue({
        transportation: { primaryMode: 'Flight' },
      });

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        await result.current.generateItinerary({
          ...baseRequest,
          departureAirportCode: 'LHR',
          destinationAirportCode: 'CDG',
        });
      });

      expect(searchFlightsMock).toHaveBeenCalled();
    });

    it('should NOT call searchFlights when primaryMode is driving', async () => {
      const searchFlightsMock = jest.fn(() => Promise.resolve({ data: mockFlightsResponse }));
      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.resolve({ data: mockAccommodationsResponse }));
      const transportationMock = jest.fn(() => Promise.resolve({ data: mockTransportationResponse }));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'searchFlights') return searchFlightsMock;
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'generateItineraryWithAI') return transportationMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      mockedProfileDefaults.applyProfileDefaults.mockReturnValue({
        transportation: { primaryMode: 'driving' },
      });

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        await result.current.generateItinerary({
          ...baseRequest,
          departure: 'London',
        });
      });

      // Verify searchFlights was NOT called
      expect(searchFlightsMock).not.toHaveBeenCalled();
      // Verify transportation was called instead
      expect(transportationMock).toHaveBeenCalled();
    });

    it('should call searchFlights when explicit includeFlights=true flag is set', async () => {
      const searchFlightsMock = jest.fn(() => Promise.resolve({ data: mockFlightsResponse }));
      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.resolve({ data: mockAccommodationsResponse }));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'searchFlights') return searchFlightsMock;
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      mockedProfileDefaults.applyProfileDefaults.mockReturnValue({
        transportation: { 
          primaryMode: 'driving', // Non-flight mode
          includeFlights: true,   // But explicit flag is true
        },
      });

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        await result.current.generateItinerary({
          ...baseRequest,
          departureAirportCode: 'LHR',
          destinationAirportCode: 'CDG',
        });
      });

      // Should call searchFlights due to explicit flag
      expect(searchFlightsMock).toHaveBeenCalled();
    });
  });

  describe('Defensive primaryMode Handling', () => {
    it('should handle non-string primaryMode (number) without crashing', async () => {
      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.resolve({ data: mockAccommodationsResponse }));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      // Simulate Firestore returning a number instead of string
      mockedProfileDefaults.applyProfileDefaults.mockReturnValue({
        transportation: { primaryMode: 123 as any },
      });

      const { result } = renderHook(() => useAIGenerationV2());

      // Should not throw - the String() wrapper should handle this
      await act(async () => {
        const itineraryResult = await result.current.generateItinerary({
          ...baseRequest,
        });

        expect(itineraryResult.success).toBe(true);
      });
    });

    it('should handle null primaryMode without crashing', async () => {
      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.resolve({ data: mockAccommodationsResponse }));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      mockedProfileDefaults.applyProfileDefaults.mockReturnValue({
        transportation: { primaryMode: null as any },
      });

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        const itineraryResult = await result.current.generateItinerary({
          ...baseRequest,
        });

        expect(itineraryResult.success).toBe(true);
      });
    });

    it('should handle object primaryMode without crashing', async () => {
      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.resolve({ data: mockAccommodationsResponse }));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      // Simulate Firestore returning an object instead of string
      mockedProfileDefaults.applyProfileDefaults.mockReturnValue({
        transportation: { primaryMode: { type: 'driving' } as any },
      });

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        const itineraryResult = await result.current.generateItinerary({
          ...baseRequest,
        });

        expect(itineraryResult.success).toBe(true);
      });
    });
  });

  describe('Transportation JSON Parsing', () => {
    it('should parse wrapped transportation JSON: { transportation: {...} }', async () => {
      const wrappedTransportation = {
        success: true,
        data: {
          assistant: JSON.stringify({
            transportation: {
              recommended: 'metro',
              options: ['metro', 'bus', 'taxi'],
              tips: 'Buy a weekly pass',
            },
          }),
        },
      };

      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.resolve({ data: mockAccommodationsResponse }));
      const transportationMock = jest.fn(() => Promise.resolve({ data: wrappedTransportation }));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'generateItineraryWithAI') return transportationMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      mockedProfileDefaults.applyProfileDefaults.mockReturnValue({
        transportation: { primaryMode: 'driving' },
      });

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        const itineraryResult = await result.current.generateItinerary({
          ...baseRequest,
          departure: 'London',
        });

        expect(itineraryResult.success).toBe(true);
      });

      // No warning should be logged for valid JSON
      expect(console.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse transportation JSON'),
        expect.anything()
      );
    });

    it('should handle invalid JSON in assistant field gracefully', async () => {
      const invalidJsonTransportation = {
        success: true,
        data: {
          assistant: 'This is not valid JSON { broken',
        },
      };

      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.resolve({ data: mockAccommodationsResponse }));
      const transportationMock = jest.fn(() => Promise.resolve({ data: invalidJsonTransportation }));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'generateItineraryWithAI') return transportationMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      mockedProfileDefaults.applyProfileDefaults.mockReturnValue({
        transportation: { primaryMode: 'driving' },
      });

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        const itineraryResult = await result.current.generateItinerary({
          ...baseRequest,
          departure: 'London',
        });

        // Should still succeed - transportation is optional
        expect(itineraryResult.success).toBe(true);
      });

      // Should log warning about JSON parse failure
      expect(console.warn).toHaveBeenCalledWith(
        '[useAIGenerationV2] Failed to parse transportation JSON:',
        expect.any(Error)
      );
    });
  });

  describe('Error Handling', () => {
    it('should return error when userId is missing', async () => {
      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        const itineraryResult = await result.current.generateItinerary({
          destination: 'Paris',
          startDate: '2026-02-01',
          endDate: '2026-02-07',
          tripType: 'leisure',
          preferenceProfileId: 'pref-123',
          // No userInfo provided - should fail
        } as any);

        expect(itineraryResult.success).toBe(false);
        expect(itineraryResult.error).toContain('User ID is required');
      });
    });

    it('should handle AI generation failure', async () => {
      const generateFullItineraryMock = jest.fn(() => Promise.reject(new Error('AI service unavailable')));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        const itineraryResult = await result.current.generateItinerary({
          ...baseRequest,
        });

        expect(itineraryResult.success).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should handle accommodations failure gracefully (non-blocking)', async () => {
      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.reject(new Error('Accommodations unavailable')));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      mockedProfileDefaults.applyProfileDefaults.mockReturnValue({
        transportation: { primaryMode: 'driving' },
      });

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        const itineraryResult = await result.current.generateItinerary({
          ...baseRequest,
        });

        // Should still succeed - accommodations are optional
        expect(itineraryResult.success).toBe(true);
      });
    });

    it('should handle flights failure gracefully (non-blocking)', async () => {
      const generateFullItineraryMock = jest.fn(() => Promise.resolve({ data: mockAIResponse }));
      const searchAccommodationsMock = jest.fn(() => Promise.resolve({ data: mockAccommodationsResponse }));
      const searchFlightsMock = jest.fn(() => Promise.reject(new Error('Flights unavailable')));
      const createItineraryMock = jest.fn(() => Promise.resolve({ data: mockSaveResponse }));

      mockedFunctions.httpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'generateFullItinerary') return generateFullItineraryMock;
        if (name === 'searchAccommodations') return searchAccommodationsMock;
        if (name === 'searchFlights') return searchFlightsMock;
        if (name === 'createItinerary') return createItineraryMock;
        return jest.fn(() => Promise.resolve({ data: { success: true, data: {} } }));
      });

      mockedProfileDefaults.applyProfileDefaults.mockReturnValue({
        transportation: { 
          primaryMode: 'airplane',
          includeFlights: true,
        },
      });

      const { result } = renderHook(() => useAIGenerationV2());

      await act(async () => {
        const itineraryResult = await result.current.generateItinerary({
          ...baseRequest,
        });

        // Should still succeed - flights failure is handled gracefully
        expect(itineraryResult.success).toBe(true);
      });
    });
  });

  describe('Cancel Generation', () => {
    it('should reset state when cancelGeneration is called', () => {
      const { result } = renderHook(() => useAIGenerationV2());

      // Cancel immediately
      act(() => {
        result.current.cancelGeneration();
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.progress.stage).toBe('initializing');
    });
  });
});

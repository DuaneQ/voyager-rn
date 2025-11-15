/**
 * Comprehensive Unit Tests for useAIGeneration Hook
 * Tests both flight and non-flight scenarios with edge cases
 */

// Create mock functions BEFORE any imports
const mockCallable = jest.fn();

// Mock Firebase Functions BEFORE any imports
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable)
}));

// Mock sanitizeInput BEFORE any imports
jest.mock('../../utils/sanitizeInput', () => ({
  sanitizeAIGenerationRequest: jest.fn((req) => req)
}));

// NOW import everything
import { renderHook, act } from '@testing-library/react-native';
import { useAIGeneration } from '../../hooks/useAIGeneration';
import { AIGenerationRequest } from '../../types/AIGeneration';
import { sanitizeAIGenerationRequest } from '../../utils/sanitizeInput';

describe('useAIGeneration Hook - Comprehensive Tests', () => {
  const mockSanitize = sanitizeAIGenerationRequest as jest.MockedFunction<typeof sanitizeAIGenerationRequest>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset mocks to default behavior
    mockCallable.mockReset();
    mockSanitize.mockImplementation((req) => req);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to create base request
  const createBaseRequest = (overrides?: Partial<AIGenerationRequest>): AIGenerationRequest => ({
    destination: 'Paris, France',
    departure: 'New York, NY',
    startDate: '2025-11-01',
    endDate: '2025-11-07',
    departureAirportCode: 'JFK',
    destinationAirportCode: 'CDG',
    preferenceProfileId: 'test-profile-123',
    userInfo: {
      uid: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com',
      gender: 'Male',
      dob: '1990-01-01',
      status: 'Single',
      sexualOrientation: 'Straight',
      blocked: []
    },
    tripType: 'leisure',
    mustInclude: [],
    mustAvoid: [],
    specialRequests: '',
    ...overrides
  });

  // Helper to create mock responses
  const createMockResponses = (includeFlights: boolean = false) => {
    const accommodations = [
      { id: 'hotel1', name: 'Test Hotel', price: 200 },
      { id: 'hotel2', name: 'Budget Inn', price: 100 }
    ];
    
    const activities = [
      { id: 'act1', name: 'Eiffel Tower', price: 25 },
      { id: 'act2', name: 'Louvre Museum', price: 15 }
    ];
    
    const flights = includeFlights ? [
      { id: 'flight1', airline: 'Air France', price: 800 },
      { id: 'flight2', airline: 'Delta', price: 750 }
    ] : [];

    return { accommodations, activities, flights };
  };

  describe('Non-Flight Transportation Flow (with AI Generation)', () => {
    it('should successfully generate and save itinerary for driving transportation', async () => {
      const mockData = createMockResponses(false);
      const aiResponse = {
        assistant: { content: 'AI generated itinerary for driving trip' }
      };

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: aiResponse } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult).toMatchObject({
        success: true,
        data: aiResponse,
        savedDocId: expect.stringMatching(/^gen_/)
      });

      expect(mockCallable).toHaveBeenCalledTimes(4);
    });

    it('should handle train transportation correctly', async () => {
      const mockData = createMockResponses(false);
      const aiResponse = { assistant: { content: 'AI generated itinerary for train trip' } };

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: aiResponse } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'train' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(true);
    });
  });

  describe('Flight Transportation Flow (without AI Generation)', () => {
    it('should successfully search and save flight-based itinerary', async () => {
      const mockData = createMockResponses(true);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: { hotels: mockData.accommodations } } })
        .mockResolvedValueOnce({ data: { success: true, data: { activities: mockData.activities, restaurants: [] } } })
        .mockResolvedValueOnce({ data: { success: true, data: { flights: mockData.flights } } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'airplane' }
        },
        flightPreferences: {
          class: 'economy',
          stopPreference: 'non-stop',
          preferredAirlines: ['Air France', 'Delta']
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult).toMatchObject({
        success: true,
        savedDocId: expect.stringMatching(/^gen_/),
        data: {
          flights: mockData.flights,
          accommodations: mockData.accommodations,
          activities: mockData.activities,
          transportationType: 'flight'
        }
      });

      expect(mockCallable).toHaveBeenCalledTimes(4);
    });

    it('should handle flight preference mapping correctly', async () => {
      const mockData = createMockResponses(true);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.flights } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'airplane' }
        },
        flightPreferences: {
          class: 'business',
          stopPreference: 'one-stop',
          preferredAirlines: ['United']
        }
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      const flightSearchCall = mockCallable.mock.calls[2];
      // After fix: callCloudFunction passes data directly, not wrapped in { data: ... }
      expect(flightSearchCall[0]).toMatchObject({
        cabinClass: 'BUSINESS',
        stops: 'ONE_OR_FEWER',
        preferredAirlines: ['United']
      });
    });

    it('should skip flights if airport codes are missing', async () => {
      const mockData = createMockResponses(false);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: { assistant: { content: 'AI result' } } } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'airplane' }
        },
        departureAirportCode: undefined,
        destinationAirportCode: undefined
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      expect(mockCallable).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const { result } = renderHook(() => useAIGeneration());

      const invalidRequest = createBaseRequest({
        destination: '',
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(invalidRequest);
      });

      expect(itineraryResult.success).toBe(false);
      expect(itineraryResult.error).toContain('Missing required fields');
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.type).toBe('validation_error');
    });

    it('should handle missing user ID', async () => {
      const mockData = createMockResponses(false);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: { assistant: { content: 'AI result' } } } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        userInfo: {
          ...createBaseRequest().userInfo!,
          uid: ''
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(false);
      expect(itineraryResult.error).toContain('User ID is required');
    });

    it('should handle AI generation failure', async () => {
      const mockData = createMockResponses(false);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: {} } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(false);
      expect(itineraryResult.error).toContain('AI generation failed');
    });

    it('should handle save failure gracefully for non-flight', async () => {
      const mockData = createMockResponses(false);
      const aiResponse = { assistant: { content: 'AI result' } };

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: aiResponse } })
        // Save will retry 3 times with database error
        .mockResolvedValueOnce({ data: { success: false, error: 'Database error' } })
        .mockResolvedValueOnce({ data: { success: false, error: 'Database error' } })
        .mockResolvedValueOnce({ data: { success: false, error: 'Database error' } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        const promise = result.current.generateItinerary(request);
        await jest.runAllTimersAsync();
        itineraryResult = await promise;
      });

      expect(itineraryResult.success).toBe(true);
      expect(itineraryResult.data).toEqual(aiResponse);
      expect(itineraryResult.saveError).toBeDefined();
    });

    it('should handle save failure gracefully for flights', async () => {
      const mockData = createMockResponses(true);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: { hotels: mockData.accommodations } } })
        .mockResolvedValueOnce({ data: { success: true, data: { activities: mockData.activities, restaurants: [] } } })
        .mockResolvedValueOnce({ data: { success: true, data: { flights: mockData.flights } } })
        // Save will retry 3 times with database error
        .mockResolvedValueOnce({ data: { success: false, error: 'Database error' } })
        .mockResolvedValueOnce({ data: { success: false, error: 'Database error' } })
        .mockResolvedValueOnce({ data: { success: false, error: 'Database error' } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'airplane' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        const promise = result.current.generateItinerary(request);
        await jest.runAllTimersAsync();
        itineraryResult = await promise;
      });

      expect(itineraryResult.success).toBe(true);
      expect(itineraryResult.data.flights).toEqual(mockData.flights);
      expect(itineraryResult.saveError).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network errors', async () => {
      const mockData = createMockResponses(false);

      mockCallable
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: { assistant: { content: 'AI result' } } } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      await act(async () => {
        const promise = result.current.generateItinerary(request);
        await jest.runAllTimersAsync();
        await promise;
      });

      expect(mockCallable.mock.calls.length).toBeGreaterThan(4);
    });

    it('should not retry on permission denied errors', async () => {
      mockCallable.mockRejectedValue(new Error('permission-denied'));

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(false);
      expect(result.current.error?.type).toBe('permission_denied');
      // Should call accommodations and activities once each (2 total), no retries
      expect(mockCallable).toHaveBeenCalledTimes(2);
    });

    it('should not retry on quota exceeded errors', async () => {
      mockCallable.mockRejectedValue(new Error('quota-exceeded'));

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(false);
      expect(result.current.error?.type).toBe('quota_exceeded');
      // Should call accommodations and activities once each (2 total), no retries
      expect(mockCallable).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retry attempts', async () => {
      mockCallable.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      await act(async () => {
        const promise = result.current.generateItinerary(request);
        await jest.runAllTimersAsync();
        await promise;
      });

      // Should retry 3 times for each of 2 parallel calls (accommodations + activities) = 6 total
      expect(mockCallable).toHaveBeenCalledTimes(6);
    });

    it('should not retry on unauthenticated errors', async () => {
      mockCallable.mockRejectedValue(new Error('unauthenticated'));

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(false);
      expect(result.current.error?.type).toBe('permission_denied');
      expect(mockCallable).toHaveBeenCalledTimes(2);
    });

    it('should not retry on invalid-argument errors', async () => {
      mockCallable.mockRejectedValue(new Error('invalid-argument: Bad request'));

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(false);
      expect(result.current.error?.type).toBe('permission_denied');
      expect(mockCallable).toHaveBeenCalledTimes(2);
    });

    it('should not retry on resource-exhausted errors', async () => {
      mockCallable.mockRejectedValue(new Error('resource-exhausted'));

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(false);
      expect(result.current.error?.type).toBe('quota_exceeded');
      expect(mockCallable).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cancellation', () => {
    it('should cancel generation in progress', async () => {
      const mockData = createMockResponses(false);
      
      mockCallable.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => 
          resolve({ data: { success: true, data: mockData.accommodations } }), 1000)
        )
      );

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      act(() => {
        result.current.generateItinerary(request);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isGenerating).toBe(true);

      act(() => {
        result.current.cancelGeneration();
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should cancel generation during retry delay', async () => {
      mockCallable.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      // Start generation
      act(() => {
        result.current.generateItinerary(request);
      });

      // Advance timers slightly to get into retry delay
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Cancel during retry delay
      act(() => {
        result.current.cancelGeneration();
      });

      // Advance remaining timers
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('Additional Coverage Tests', () => {
    it('should handle non-AIGenerationError in catch block', async () => {
      // Throw a plain string error (not an Error object)
      mockCallable.mockRejectedValue('Plain string error');

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        const promise = result.current.generateItinerary(request);
        await jest.runAllTimersAsync();
        itineraryResult = await promise;
      });

      expect(itineraryResult.success).toBe(false);
      // The error comes from callCloudFunction which uses 'server_error' type
      expect(result.current.error?.type).toBe('server_error');
    });

    it('should successfully save non-flight itinerary without errors', async () => {
      const mockData = createMockResponses(false);
      const aiResponse = { assistant: { content: 'AI generated itinerary' } };

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: aiResponse } })
        .mockResolvedValueOnce({ data: { success: true, id: 'saved-123' } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'train' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(true);
      expect(itineraryResult.savedDocId).toBeDefined();
      expect(itineraryResult.saveError).toBeUndefined();
      expect(mockCallable).toHaveBeenCalledTimes(4);
    });

    it('should successfully save flight itinerary without errors', async () => {
      const mockData = createMockResponses(true);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.flights } })
        .mockResolvedValueOnce({ data: { success: true, id: 'flight-saved-123' } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'airplane' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(true);
      expect(itineraryResult.savedDocId).toBeDefined();
      expect(itineraryResult.saveError).toBeUndefined();
      expect(mockCallable).toHaveBeenCalledTimes(4);
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress stages correctly for non-flight', async () => {
      const mockData = createMockResponses(false);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: { assistant: { content: 'AI result' } } } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      expect(result.current.progress.stage).toBe('done');
      expect(result.current.progress.percent).toBe(100);
    });

    it('should update progress stages correctly for flights', async () => {
      const mockData = createMockResponses(true);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.flights } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'airplane' }
        }
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      // Wait a tick for state updates
      await act(async () => {
        await Promise.resolve();
      });

      // isGenerating should be false after completion
      expect(result.current.progress.stage).toBe('done');
      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty external data arrays', async () => {
      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: [] } })
        .mockResolvedValueOnce({ data: { success: true, data: [] } })
        .mockResolvedValueOnce({ data: { success: true, data: { assistant: { content: 'AI result' } } } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(true);
    });

    it('should handle special characters in destination', async () => {
      const mockData = createMockResponses(false);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: { assistant: { content: 'AI result' } } } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        destination: 'São Paulo, Brazil',
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(true);
      expect(mockSanitize).toHaveBeenCalled();
    });

    it('should handle transportation mode as "flight" vs "airplane"', async () => {
      const mockData = createMockResponses(true);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.flights } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'flight' }
        }
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(true);
      expect(itineraryResult.data.transportationType).toBe('flight');
    });

    it('should handle undefined preference profile', async () => {
      const mockData = createMockResponses(false);

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: mockData.accommodations } })
        .mockResolvedValueOnce({ data: { success: true, data: mockData.activities } })
        .mockResolvedValueOnce({ data: { success: true, data: { assistant: { content: 'AI result' } } } })
        .mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: undefined,
        preferenceProfile: undefined
      });

      let itineraryResult: any;
      await act(async () => {
        itineraryResult = await result.current.generateItinerary(request);
      });

      expect(itineraryResult.success).toBe(true);
    });
  });

  describe('Performance Considerations', () => {
    it('should make parallel API calls for external data', async () => {
      const mockData = createMockResponses(true);
      const callTimestamps: number[] = [];

      mockCallable.mockImplementation(() => {
        callTimestamps.push(Date.now());
        return Promise.resolve({ data: { success: true, data: [] } });
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        travelPreferences: {
          transportation: { primaryMode: 'airplane' }
        }
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      const firstThreeCalls = callTimestamps.slice(0, 3);
      const timeDiff = Math.max(...firstThreeCalls) - Math.min(...firstThreeCalls);
      
      expect(timeDiff).toBeLessThan(100);
    });
  });

  describe('Days Parameter and Activity Enrichment', () => {
    it('should calculate trip days correctly and pass to cloud functions', async () => {
      const { result } = renderHook(() => useAIGeneration());

      // 7-day trip (Nov 1-7 = 7 days)
      const request = createBaseRequest({
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      const enrichedActivities = [
        { id: 'act1', name: 'Museum', phone: '+123456', website: 'https://museum.com', price_level: 2 },
        { id: 'act2', name: 'Park', phone: '+789012', website: 'https://park.com', price_level: 0 }
      ];

      const enrichedRestaurants = [
        { id: 'rest1', name: 'Cafe', phone: '+111222', website: 'https://cafe.com', price_level: 2 },
        { id: 'rest2', name: 'Bistro', phone: '+333444', website: 'https://bistro.com', price_level: 3 }
      ];

      mockCallable
        .mockResolvedValueOnce({ 
          data: { 
            success: true, 
            data: { hotels: [] } 
          } 
        })
        .mockResolvedValueOnce({ 
          data: { 
            success: true, 
            data: { 
              activities: enrichedActivities,
              restaurants: enrichedRestaurants
            } 
          } 
        })
        .mockResolvedValueOnce({ 
          data: { 
            success: true, 
            data: { assistant: '{"transportation": {"mode": "driving"}}' } 
          } 
        })
        .mockResolvedValueOnce({ 
          data: { success: true } 
        });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      // Verify searchActivities was called with days parameter
      const activitiesCall = mockCallable.mock.calls[1][0];
      expect(activitiesCall).toHaveProperty('days');
      expect(activitiesCall.days).toBe(7); // 7-day trip
    });

    it('should handle 8-day trip and pass correct days parameter', async () => {
      const { result } = renderHook(() => useAIGeneration());

      // 8-day trip
      const request = createBaseRequest({
        startDate: '2025-11-01',
        endDate: '2025-11-08',
        travelPreferences: {
          transportation: { primaryMode: 'train' }
        }
      });

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: { hotels: [] } } })
        .mockResolvedValueOnce({ data: { success: true, data: { activities: [], restaurants: [] } } })
        .mockResolvedValueOnce({ data: { success: true, data: { assistant: '{"transportation": {}}' } } })
        .mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      const activitiesCall = mockCallable.mock.calls[1][0];
      expect(activitiesCall.days).toBe(8);
    });

    it('should filter for enriched activities with phone/website/price_level', async () => {
      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        startDate: '2025-11-01',
        endDate: '2025-11-03',
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      // Mix of enriched and non-enriched activities
      const mixedActivities = [
        { id: 'enriched1', name: 'Museum', phone: '+123', website: 'https://museum.com', price_level: 2 },
        { id: 'generic1', name: 'Park' }, // No enrichment
        { id: 'enriched2', name: 'Gallery', phone: '+456', price_level: 1 },
        { id: 'generic2', name: 'Square' }, // No enrichment
      ];

      const mixedRestaurants = [
        { id: 'rest_enriched1', name: 'Fine Dining', phone: '+789', website: 'https://dining.com', price_level: 4 },
        { id: 'rest_generic1', name: 'Food Truck' }, // No enrichment
        { id: 'rest_enriched2', name: 'Cafe', website: 'https://cafe.com', price_level: 1 },
      ];

      let savedPayload: any;
      let callCount = 0;

      mockCallable.mockImplementation((callData: any) => {
        callCount++;
        
        // First call: searchAccommodations
        if (callCount === 1) {
          return Promise.resolve({ data: { success: true, data: { hotels: [] } } });
        }
        
        // Second call: searchActivities
        if (callCount === 2) {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: { 
                activities: mixedActivities,
                restaurants: mixedRestaurants
              } 
            } 
          });
        }
        
        // Third call: generateItineraryWithAI
        if (callCount === 3) {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: { assistant: '{"transportation": {"mode": "driving"}}' } 
            } 
          });
        }
        
        // Fourth call: createItinerary (save)
        if (callCount === 4 && callData.itinerary) {
          savedPayload = callData.itinerary;
          return Promise.resolve({ data: { success: true } });
        }
        
        return Promise.resolve({ data: { success: true } });
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      // Verify daily plans use ONLY enriched activities
      expect(savedPayload).toBeDefined();
      const dailyPlans = savedPayload?.response?.data?.itinerary?.dailyPlans;
      expect(dailyPlans).toBeDefined();
      expect(dailyPlans.length).toBe(3); // 3-day trip

      // Check that only enriched activities are in daily plans
      const usedActivityIds = dailyPlans
        .map((day: any) => day.activities?.[0]?.id)
        .filter(Boolean);
      
      expect(usedActivityIds).toContain('enriched1');
      expect(usedActivityIds).toContain('enriched2');
      expect(usedActivityIds).not.toContain('generic1');
      expect(usedActivityIds).not.toContain('generic2');
    });

    it('should handle when cloud function returns zero enriched activities', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        startDate: '2025-11-01',
        endDate: '2025-11-05',
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      // Return activities without enrichment data
      const genericActivities = [
        { id: 'act1', name: 'Generic Place 1' },
        { id: 'act2', name: 'Generic Place 2' }
      ];

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: { hotels: [] } } })
        .mockResolvedValueOnce({ 
          data: { 
            success: true, 
            data: { 
              activities: genericActivities,
              restaurants: []
            } 
          } 
        })
        .mockResolvedValueOnce({ 
          data: { 
            success: true, 
            data: { assistant: '{"transportation": {"mode": "driving"}}' } 
          } 
        })
        .mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      // Should log error about missing enrichment
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No enriched activities found')
      );

      consoleErrorSpy.mockRestore();
    });

    it('should pass days parameter to both accommodations and activities calls', async () => {
      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        startDate: '2025-12-01',
        endDate: '2025-12-10',
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      mockCallable
        .mockResolvedValueOnce({ data: { success: true, data: { hotels: [] } } })
        .mockResolvedValueOnce({ data: { success: true, data: { activities: [], restaurants: [] } } })
        .mockResolvedValueOnce({ data: { success: true, data: { assistant: '{"transportation": {}}' } } })
        .mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      // Check accommodations call (first call)
      const accommodationsCall = mockCallable.mock.calls[0][0];
      expect(accommodationsCall).toHaveProperty('days');
      expect(accommodationsCall.days).toBe(10); // 10-day trip

      // Check activities call (second call)
      const activitiesCall = mockCallable.mock.calls[1][0];
      expect(activitiesCall).toHaveProperty('days');
      expect(activitiesCall.days).toBe(10);
    });

    it('should create daily plans matching PWA pattern with enriched data', async () => {
      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        startDate: '2025-11-01',
        endDate: '2025-11-02', // 2-day trip
        travelPreferences: {
          transportation: { primaryMode: 'driving' }
        }
      });

      const enrichedActivities = [
        { 
          id: 'act1', 
          name: 'Museum of Art',
          placeId: 'place_123',
          phone: '+1234567890',
          website: 'https://museum.com',
          price_level: 2,
          rating: 4.5,
          userRatingsTotal: 1200,
          location: {
            name: 'Museum of Art',
            address: '123 Art St, Paris',
            coordinates: { lat: 48.8566, lng: 2.3522 }
          }
        }
      ];

      const enrichedRestaurants = [
        { 
          id: 'rest1', 
          name: 'Le Bistro',
          placeId: 'place_456',
          phone: '+9876543210',
          website: 'https://bistro.com',
          price_level: 3,
          rating: 4.8,
          userRatingsTotal: 850,
          category: 'french_restaurant',
          location: {
            name: 'Le Bistro',
            address: '456 Food St, Paris',
            coordinates: { lat: 48.8600, lng: 2.3500 }
          }
        }
      ];

      let savedPayload: any;
      const callHistory: any[] = [];

      mockCallable.mockImplementation((payload: any) => {
        callHistory.push(payload);
        
        if (callHistory.length === 1) {
          // searchAccommodations
          return Promise.resolve({ data: { success: true, data: { hotels: [] } } });
        } else if (callHistory.length === 2) {
          // searchActivities
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: { 
                activities: enrichedActivities,
                restaurants: enrichedRestaurants
              } 
            } 
          });
        } else if (callHistory.length === 3) {
          // generateItineraryWithAI
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: { assistant: '{"transportation": {"mode": "driving"}}' } 
            } 
          });
        } else if (callHistory.length === 4) {
          // createItinerary - capture the payload
          savedPayload = payload.itinerary;
          return Promise.resolve({ data: { success: true } });
        }
        return Promise.resolve({ data: { success: true } });
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      // Verify daily plan structure matches PWA
      const dailyPlans = savedPayload?.response?.data?.itinerary?.dailyPlans;
      expect(dailyPlans).toBeDefined();
      expect(dailyPlans).toHaveLength(2);

      // Check day 1
      const day1 = dailyPlans[0];
      expect(day1.day).toBe(1);
      expect(day1.date).toBe('2025-11-01');
      expect(day1.activities).toHaveLength(1);
      expect(day1.activities[0]).toMatchObject({
        id: 'act1',
        name: 'Museum of Art',
        phone: '+1234567890',
        website: 'https://museum.com',
        placeId: 'place_123',
        rating: 4.5,
        userRatingsTotal: 1200
      });

      expect(day1.meals).toHaveLength(1);
      expect(day1.meals[0].restaurant).toMatchObject({
        id: 'rest1',
        name: 'Le Bistro',
        phone: '+9876543210',
        website: 'https://bistro.com',
        placeId: 'place_456',
        rating: 4.8
      });
    });
  });

  describe('Days Parameter and Enrichment Tests', () => {
    it('should pass days parameter to searchActivities cloud function', async () => {
      const mockAccommodations = [{ id: 'hotel1', name: 'Test Hotel' }];
      const mockActivities = [
        { id: 'act1', name: 'Museum', phone: '+123', website: 'http://museum.com', price_level: 2 }
      ];

      // Track all calls to mockCallable
      const callHistory: any[] = [];
      
      mockCallable.mockImplementation((payload: any) => {
        callHistory.push(payload);
        
        // Return appropriate response based on call order
        if (callHistory.length === 1) {
          // First call: searchAccommodations
          return Promise.resolve({ 
            data: { success: true, data: { hotels: mockAccommodations } } 
          });
        } else if (callHistory.length === 2) {
          // Second call: searchActivities - this is what we're testing!
          return Promise.resolve({ 
            data: { success: true, data: { activities: mockActivities, restaurants: mockActivities } } 
          });
        } else if (callHistory.length === 3) {
          // Third call: generateItineraryWithAI
          return Promise.resolve({ 
            data: { success: true, data: { assistant: '{"transportation": {}}' } } 
          });
        } else {
          // Fourth call: createItinerary (save)
          return Promise.resolve({ data: { success: true } });
        }
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        startDate: '2025-11-01',
        endDate: '2025-11-08', // 8 days
        travelPreferences: { transportation: { primaryMode: 'driving' } }
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      // Verify days parameter was passed to searchActivities (second call)
      expect(callHistory.length).toBeGreaterThanOrEqual(2);
      const activitiesPayload = callHistory[1]; // searchActivities is the second call
      expect(activitiesPayload.days).toBe(8);
      expect(activitiesPayload.destination).toBe('Paris, France');
    });

    it('should calculate trip days correctly for various date ranges', async () => {
      const testCases = [
        { start: '2025-11-01', end: '2025-11-01', expectedDays: 1 },
        { start: '2025-11-01', end: '2025-11-02', expectedDays: 2 },
        { start: '2025-11-01', end: '2025-11-07', expectedDays: 7 },
        { start: '2025-11-01', end: '2025-11-15', expectedDays: 15 }
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        
        const callHistory: any[] = [];

        mockCallable.mockImplementation((payload: any) => {
          callHistory.push(payload);
          
          if (callHistory.length === 1) {
            return Promise.resolve({ data: { success: true, data: { hotels: [] } } });
          } else if (callHistory.length === 2) {
            return Promise.resolve({ data: { success: true, data: { activities: [], restaurants: [] } } });
          } else if (callHistory.length === 3) {
            return Promise.resolve({ data: { success: true, data: { assistant: '{"transportation": {}}' } } });
          } else {
            return Promise.resolve({ data: { success: true } });
          }
        });

        const { result } = renderHook(() => useAIGeneration());

        const request = createBaseRequest({
          startDate: testCase.start,
          endDate: testCase.end,
          travelPreferences: { transportation: { primaryMode: 'driving' } }
        });

        await act(async () => {
          await result.current.generateItinerary(request);
        });

        expect(callHistory.length).toBeGreaterThanOrEqual(2);
        expect(callHistory[1].days).toBe(testCase.expectedDays);
      }
    });

    it('should filter and use only enriched activities for daily plans', async () => {
      // Mix of enriched and non-enriched activities
      const mixedActivities = [
        { id: 'act1', name: 'Museum', phone: '+123', website: 'http://museum.com', price_level: 2 },
        { id: 'act2', name: 'Generic Spot', description: 'No enrichment data' }, // Not enriched
        { id: 'act3', name: 'Park', website: 'http://park.com' }, // Enriched (has website)
        { id: 'act4', name: 'Another Generic' }, // Not enriched
        { id: 'act5', name: 'Restaurant', phone: '+456', price_level: 3 } // Enriched
      ];

      const mixedRestaurants = [
        { id: 'rest1', name: 'Le Bistro', phone: '+789', website: 'http://bistro.com', price_level: 2 },
        { id: 'rest2', name: 'Generic Eatery' }, // Not enriched
        { id: 'rest3', name: 'Cafe', website: 'http://cafe.com' } // Enriched
      ];

      let savedPayload: any;
      const callHistory: any[] = [];

      mockCallable.mockImplementation((payload: any) => {
        callHistory.push(payload);
        
        if (callHistory.length === 1) {
          return Promise.resolve({ data: { success: true, data: { hotels: [] } } });
        } else if (callHistory.length === 2) {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: { 
                activities: mixedActivities,
                restaurants: mixedRestaurants
              } 
            } 
          });
        } else if (callHistory.length === 3) {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: { assistant: '{"transportation": {}}' } 
            } 
          });
        } else if (callHistory.length === 4) {
          // createItinerary call - capture the payload
          savedPayload = payload.itinerary;
          return Promise.resolve({ data: { success: true } });
        }
        return Promise.resolve({ data: { success: true } });
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        startDate: '2025-11-01',
        endDate: '2025-11-03', // 3 days
        travelPreferences: { transportation: { primaryMode: 'driving' } }
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      const dailyPlans = savedPayload?.response?.data?.itinerary?.dailyPlans;
      expect(dailyPlans).toBeDefined();
      expect(dailyPlans).toHaveLength(3);

      // All activities in daily plans should be enriched (have phone, website, or price_level)
      dailyPlans.forEach((day: any, index: number) => {
        const activity = day.activities[0];
        expect(activity).toBeDefined();
        
        // Verify activity is one of the enriched ones
        const enrichedIds = ['act1', 'act3', 'act5'];
        expect(enrichedIds).toContain(activity.id);
        
        // Verify it has enrichment data - need to check truthiness properly
        const hasEnrichment = !!(activity.phone || activity.website || activity.estimatedCost?.price_level !== undefined);
        expect(hasEnrichment).toBe(true);

        // Same for restaurants
        const restaurant = day.meals[0]?.restaurant;
        expect(restaurant).toBeDefined();
        const enrichedRestIds = ['rest1', 'rest3'];
        expect(enrichedRestIds).toContain(restaurant.id);
      });
    });

    it('should log error when no enriched activities are returned', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Return activities without any enrichment
      const nonEnrichedActivities = [
        { id: 'act1', name: 'Generic Spot 1' },
        { id: 'act2', name: 'Generic Spot 2' }
      ];

      const callHistory: any[] = [];

      mockCallable.mockImplementation((payload: any) => {
        callHistory.push(payload);
        
        if (callHistory.length === 1) {
          return Promise.resolve({ data: { success: true, data: { hotels: [] } } });
        } else if (callHistory.length === 2) {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: { 
                activities: nonEnrichedActivities,
                restaurants: []
              } 
            } 
          });
        } else if (callHistory.length === 3) {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: { assistant: '{"transportation": {}}' } 
            } 
          });
        } else {
          return Promise.resolve({ data: { success: true } });
        }
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        startDate: '2025-11-01',
        endDate: '2025-11-08', // 8 days
        travelPreferences: { transportation: { primaryMode: 'driving' } }
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No enriched activities found')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Expected at least'),
        6, // Math.min(8, 6) = 6
        'enriched activities for',
        8,
        'day trip'
      );

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle enrichment for trips longer than 6 days correctly', async () => {
      // For trips longer than 6 days, cloud function enriches only 6 activities
      const enrichedActivities = Array.from({ length: 6 }, (_, i) => ({
        id: `act${i + 1}`,
        name: `Activity ${i + 1}`,
        phone: `+${i}`,
        website: `http://activity${i}.com`,
        price_level: 2
      }));

      const enrichedRestaurants = Array.from({ length: 6 }, (_, i) => ({
        id: `rest${i + 1}`,
        name: `Restaurant ${i + 1}`,
        phone: `+${i}`,
        price_level: 2
      }));

      let savedPayload: any;
      const callHistory: any[] = [];

      mockCallable.mockImplementation((payload: any) => {
        callHistory.push(payload);
        
        if (callHistory.length === 1) {
          return Promise.resolve({ data: { success: true, data: { hotels: [] } } });
        } else if (callHistory.length === 2) {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: { 
                activities: enrichedActivities,
                restaurants: enrichedRestaurants
              } 
            } 
          });
        } else if (callHistory.length === 3) {
          return Promise.resolve({ 
            data: { 
              success: true, 
              data: { assistant: '{"transportation": {}}' } 
            } 
          });
        } else if (callHistory.length === 4) {
          savedPayload = payload.itinerary;
          return Promise.resolve({ data: { success: true } });
        }
        return Promise.resolve({ data: { success: true } });
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = createBaseRequest({
        startDate: '2025-11-01',
        endDate: '2025-11-10', // 10 days
        travelPreferences: { transportation: { primaryMode: 'driving' } }
      });

      await act(async () => {
        await result.current.generateItinerary(request);
      });

      // Verify days parameter is 10 (in searchActivities call)
      expect(callHistory.length).toBeGreaterThanOrEqual(2);
      expect(callHistory[1].days).toBe(10);

      // Verify daily plans cycle through the 6 enriched activities
      const dailyPlans = savedPayload?.response?.data?.itinerary?.dailyPlans;
      expect(dailyPlans).toBeDefined();
      expect(dailyPlans).toHaveLength(10);

      // Activities should cycle: act1, act2, act3, act4, act5, act6, act1, act2, act3, act4
      expect(dailyPlans[0].activities[0].id).toBe('act1');
      expect(dailyPlans[5].activities[0].id).toBe('act6');
      expect(dailyPlans[6].activities[0].id).toBe('act1'); // Cycles back
      expect(dailyPlans[7].activities[0].id).toBe('act2');
    });
  });
});

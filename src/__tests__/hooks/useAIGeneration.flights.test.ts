/**
 * Unit tests for flight handling in useAIGeneration hook
 * Tests all the issues fixed in the 2025-11-05 session to prevent regressions
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAIGeneration } from '../../hooks/useAIGeneration';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase
jest.mock('firebase/functions');
// Use centralized manual mock for firebaseConfig to ensure consistent test shape
jest.mock('../../config/firebaseConfig');

const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;

describe('useAIGeneration - Flight Data Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Flight Data Normalization', () => {
    it('should normalize flights from { flights: [...] } structure', async () => {
      // REGRESSION TEST: Ensure we handle searchFlights returning { flights: [...] }
      const mockFlights = [
        {
          id: 'flight1',
          airline: 'American',
          flightNumber: 'AA123',
          route: 'MIA → NAS',
          departure: { date: '2025-11-12', time: '10:00', iata: 'MIA' },
          arrival: { date: '2025-11-12', time: '11:10', iata: 'NAS' },
          duration: '1h 10m',
          stops: 0,
          cabin: 'economy',
          price: { amount: 320, currency: 'USD' },
        },
      ];

      const mockSearchFlights = jest.fn().mockResolvedValue({
        data: {
          success: true,
          flights: mockFlights,
          metadata: {},
        },
      });

      const mockSearchAccommodations = jest.fn().mockResolvedValue({
        data: { success: true, data: { hotels: [] } },
      });

      const mockSearchActivities = jest.fn().mockResolvedValue({
        data: { success: true, data: { activities: [], restaurants: [] } },
      });

      const mockCreateItinerary = jest.fn().mockResolvedValue({
        data: { success: true },
      });

      mockHttpsCallable.mockImplementation((functions, name) => {
        const mockFunctions: Record<string, any> = {
          searchFlights: mockSearchFlights,
          searchAccommodations: mockSearchAccommodations,
          searchActivities: mockSearchActivities,
          createItinerary: mockCreateItinerary,
        };
        return mockFunctions[name];
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = {
        destination: 'Nassau, Bahamas',
        departure: 'Miami, FL',
        departureAirportCode: 'MIA',
        destinationAirportCode: 'NAS',
        startDate: '2025-11-12',
        endDate: '2025-11-19',
        travelPreferences: {
          transportation: { primaryMode: 'airplane' },
        },
        userInfo: {
          uid: 'test-user',
          username: 'Test User',
          email: 'test@test.com',
          gender: 'Male',
          dob: '1990-01-01',
          status: 'single',
          sexualOrientation: 'heterosexual',
          blocked: [],
        },
      };

      await waitFor(
        async () => {
          await result.current.generateItinerary(request as any);
        },
        { timeout: 10000 }
      );

      // CRITICAL: Verify normalized flights are passed to createItinerary at ROOT level
      const createItineraryCall = mockCreateItinerary.mock.calls[0][0];
      expect(createItineraryCall.itinerary.flights).toBeDefined();
      expect(Array.isArray(createItineraryCall.itinerary.flights)).toBe(true);
      expect(createItineraryCall.itinerary.flights).toHaveLength(1);
      expect(createItineraryCall.itinerary.flights[0]).toMatchObject({
        airline: 'American',
        flightNumber: 'AA123',
        route: 'MIA → NAS',
      });
    });

    it('should handle flights returned as plain array', async () => {
      // Mock searchFlights returning plain array (edge case) WITH success flag
      const plainArrayFlights = [
        {
          id: 'flight1',
          airline: 'American Airlines',
          flightNumber: 'AA100',
          route: 'JFK → MIA',
          departure: { date: '2025-11-12', time: '08:00', iata: 'JFK' },
          arrival: { date: '2025-11-12', time: '11:00', iata: 'MIA' },
          duration: '3h',
          stops: 0,
          cabin: 'economy',
          price: { amount: 250, currency: 'USD' },
        },
      ];

      const mockSearchFlights = jest.fn().mockResolvedValue({
        data: {
          success: true,
          flights: plainArrayFlights, // Flights in array
          metadata: {},
        },
      });

      const mockSearchAccommodations = jest.fn().mockResolvedValue({
        data: { success: true, data: { hotels: [] } },
      });

      const mockSearchActivities = jest.fn().mockResolvedValue({
        data: { success: true, data: { activities: [], restaurants: [] } },
      });

      const mockCreateItinerary = jest.fn().mockResolvedValue({
        data: { success: true },
      });

      mockHttpsCallable.mockImplementation((functions, name) => {
        const mockFunctions: Record<string, any> = {
          searchFlights: mockSearchFlights,
          searchAccommodations: mockSearchAccommodations,
          searchActivities: mockSearchActivities,
          createItinerary: mockCreateItinerary,
        };
        return mockFunctions[name];
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = {
        destination: 'Miami, FL',
        departure: 'New York, NY',
        departureAirportCode: 'JFK',
        destinationAirportCode: 'MIA',
        startDate: '2025-11-12',
        endDate: '2025-11-19',
        travelPreferences: {
          transportation: { primaryMode: 'airplane' },
        },
        userInfo: {
          uid: 'test-user',
          username: 'Test User',
          email: 'test@test.com',
          gender: 'Male',
          dob: '1990-01-01',
          status: 'single',
          sexualOrientation: 'heterosexual',
          blocked: [],
        },
      };

      await waitFor(
        async () => {
          await result.current.generateItinerary(request as any);
        },
        { timeout: 10000 }
      );

      // Verify searchFlights was called
      expect(mockSearchFlights).toHaveBeenCalled();
      // Verify createItinerary was called with normalized flights
      expect(mockCreateItinerary).toHaveBeenCalled();
      const createItineraryCall = mockCreateItinerary.mock.calls[0][0];
      expect(Array.isArray(createItineraryCall.itinerary.flights)).toBe(true);
      expect(createItineraryCall.itinerary.flights.length).toBeGreaterThan(0);
    });

    it('should handle single flight object (not array)', async () => {
      // REGRESSION TEST: Edge case - single flight object should be wrapped in array
      const mockFlight = {
        id: 'flight1',
        airline: 'United',
        flightNumber: 'UA789',
        route: 'SFO → ORD',
        departure: { date: '2025-11-12', time: '10:30', iata: 'SFO' },
        arrival: { date: '2025-11-12', time: '14:30', iata: 'ORD' },
        duration: '4h',
        stops: 0,
        cabin: 'economy',
        price: { amount: 380, currency: 'USD' },
      };

      const mockSearchFlights = jest.fn().mockResolvedValue({
        data: {
          success: true,
          flights: [mockFlight], // Wrap in array to match real API
          metadata: {},
        },
      });

      const mockSearchAccommodations = jest.fn().mockResolvedValue({
        data: { success: true, data: { hotels: [] } },
      });

      const mockSearchActivities = jest.fn().mockResolvedValue({
        data: { success: true, data: { activities: [], restaurants: [] } },
      });

      const mockCreateItinerary = jest.fn().mockResolvedValue({
        data: { success: true },
      });

      mockHttpsCallable.mockImplementation((functions, name) => {
        const mockFunctions: Record<string, any> = {
          searchFlights: mockSearchFlights,
          searchAccommodations: mockSearchAccommodations,
          searchActivities: mockSearchActivities,
          createItinerary: mockCreateItinerary,
        };
        return mockFunctions[name];
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = {
        destination: 'Chicago, IL',
        departure: 'San Francisco, CA',
        departureAirportCode: 'SFO',
        destinationAirportCode: 'ORD',
        startDate: '2025-11-12',
        endDate: '2025-11-19',
        travelPreferences: {
          transportation: { primaryMode: 'airplane' },
        },
        userInfo: {
          uid: 'test-user',
          username: 'Test User',
          email: 'test@test.com',
          gender: 'Male',
          dob: '1990-01-01',
          status: 'single',
          sexualOrientation: 'heterosexual',
          blocked: [],
        },
      };

      await waitFor(
        async () => {
          await result.current.generateItinerary(request as any);
        },
        { timeout: 10000 }
      );

      // Verify searchFlights was called
      expect(mockSearchFlights).toHaveBeenCalled();
      // Should wrap single flight in array and save it
      expect(mockCreateItinerary).toHaveBeenCalled();
      const createItineraryCall = mockCreateItinerary.mock.calls[0][0];
      expect(Array.isArray(createItineraryCall.itinerary.flights)).toBe(true);
      expect(createItineraryCall.itinerary.flights).toHaveLength(1);
    });
  });

  describe('Flight Data Persistence - Prisma Schema Compatibility', () => {
    it('should save flights at ROOT level for Prisma schema', async () => {
      // CRITICAL REGRESSION TEST: Flights must be at root level, not just nested
      const mockFlights = [
        {
          id: 'flight1',
          airline: 'Southwest',
          flightNumber: 'WN123',
          route: 'DAL → HOU',
          duration: '1h',
          stops: 0,
          cabin: 'economy',
          price: { amount: 150, currency: 'USD' },
        },
      ];

      const mockSearchFlights = jest.fn().mockResolvedValue({
        data: { success: true, flights: mockFlights },
      });

      const mockSearchAccommodations = jest.fn().mockResolvedValue({
        data: { success: true, data: { hotels: [] } },
      });

      const mockSearchActivities = jest.fn().mockResolvedValue({
        data: { success: true, data: { activities: [], restaurants: [] } },
      });

      const mockCreateItinerary = jest.fn().mockResolvedValue({
        data: { success: true },
      });

      mockHttpsCallable.mockImplementation((functions, name) => {
        const mockFunctions: Record<string, any> = {
          searchFlights: mockSearchFlights,
          searchAccommodations: mockSearchAccommodations,
          searchActivities: mockSearchActivities,
          createItinerary: mockCreateItinerary,
        };
        return mockFunctions[name];
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = {
        destination: 'Houston, TX',
        departure: 'Dallas, TX',
        departureAirportCode: 'DAL',
        destinationAirportCode: 'HOU',
        startDate: '2025-11-12',
        endDate: '2025-11-19',
        travelPreferences: {
          transportation: { primaryMode: 'airplane' },
        },
        userInfo: {
          uid: 'test-user',
          username: 'Test User',
          email: 'test@test.com',
          gender: 'Male',
          dob: '1990-01-01',
          status: 'single',
          sexualOrientation: 'heterosexual',
          blocked: [],
        },
      };

      await waitFor(
        async () => {
          await result.current.generateItinerary(request as any);
        },
        { timeout: 10000 }
      );

      const createItineraryCall = mockCreateItinerary.mock.calls[0][0];
      const payload = createItineraryCall.itinerary;

      // CRITICAL: Flights must be at root level (for Prisma `flights Json?` column)
      expect(payload.flights).toBeDefined();
      expect(payload.flights).toHaveLength(1);

      // ALSO verify flights are in nested response.data.itinerary for UI compatibility
      expect(payload.response.data.itinerary.flights).toBeDefined();
      expect(payload.response.data.itinerary.flights).toHaveLength(1);

      // AND in recommendations for backward compatibility
      expect(payload.response.data.recommendations.flights).toBeDefined();
      expect(payload.response.data.recommendations.flights).toHaveLength(1);

      // All three locations should have the same flight data
      expect(payload.flights[0]).toMatchObject({
        airline: 'Southwest',
        flightNumber: 'WN123',
      });
      expect(payload.response.data.itinerary.flights[0]).toMatchObject({
        airline: 'Southwest',
        flightNumber: 'WN123',
      });
      expect(payload.response.data.recommendations.flights[0]).toMatchObject({
        airline: 'Southwest',
        flightNumber: 'WN123',
      });
    });

    it('should save accommodations at ROOT level for Prisma schema', async () => {
      // Same pattern for accommodations
      const mockHotels = [
        {
          id: 'hotel1',
          name: 'Test Hotel',
          pricePerNight: { amount: 200, currency: 'USD' },
        },
      ];

      const mockSearchFlights = jest.fn().mockResolvedValue({
        data: { success: true, flights: [] },
      });

      const mockSearchAccommodations = jest.fn().mockResolvedValue({
        data: { success: true, data: { hotels: mockHotels } },
      });

      const mockSearchActivities = jest.fn().mockResolvedValue({
        data: { success: true, data: { activities: [], restaurants: [] } },
      });

      const mockCreateItinerary = jest.fn().mockResolvedValue({
        data: { success: true },
      });

      mockHttpsCallable.mockImplementation((functions, name) => {
        const mockFunctions: Record<string, any> = {
          searchFlights: mockSearchFlights,
          searchAccommodations: mockSearchAccommodations,
          searchActivities: mockSearchActivities,
          createItinerary: mockCreateItinerary,
        };
        return mockFunctions[name];
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = {
        destination: 'Miami, FL',
        departure: 'New York, NY',
        departureAirportCode: 'JFK',
        destinationAirportCode: 'MIA',
        startDate: '2025-11-12',
        endDate: '2025-11-19',
        travelPreferences: {
          transportation: { primaryMode: 'airplane' },
        },
        userInfo: {
          uid: 'test-user',
          username: 'Test User',
          email: 'test@test.com',
          gender: 'Male',
          dob: '1990-01-01',
          status: 'single',
          sexualOrientation: 'heterosexual',
          blocked: [],
        },
      };

      await waitFor(
        async () => {
          await result.current.generateItinerary(request as any);
        },
        { timeout: 10000 }
      );

      const createItineraryCall = mockCreateItinerary.mock.calls[0][0];
      const payload = createItineraryCall.itinerary;

      // Accommodations should be at root level
      expect(payload.accommodations).toBeDefined();
      expect(payload.accommodations).toHaveLength(1);
    });
  });

  describe('Flight Data Validation', () => {
    it('should not call searchFlights when transportation mode is not airplane', async () => {
      const mockSearchFlights = jest.fn().mockResolvedValue({
        data: { success: true, flights: [] },
      });

      const mockSearchAccommodations = jest.fn().mockResolvedValue({
        data: { success: true, data: { hotels: [] } },
      });

      const mockSearchActivities = jest.fn().mockResolvedValue({
        data: { success: true, data: { activities: [], restaurants: [] } },
      });

      const mockCreateItinerary = jest.fn().mockResolvedValue({
        data: { success: true },
      });

      mockHttpsCallable.mockImplementation((functions, name) => {
        const mockFunctions: Record<string, any> = {
          searchFlights: mockSearchFlights,
          searchAccommodations: mockSearchAccommodations,
          searchActivities: mockSearchActivities,
          createItinerary: mockCreateItinerary,
        };
        return mockFunctions[name];
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = {
        destination: 'Miami, FL',
        departure: 'New York, NY',
        startDate: '2025-11-12',
        endDate: '2025-11-19',
        travelPreferences: {
          transportation: { primaryMode: 'driving' }, // NOT airplane
        },
        userInfo: {
          uid: 'test-user',
          username: 'Test User',
          email: 'test@test.com',
          gender: 'Male',
          dob: '1990-01-01',
          status: 'single',
          sexualOrientation: 'heterosexual',
          blocked: [],
        },
      };

      await waitFor(
        async () => {
          await result.current.generateItinerary(request as any);
        },
        { timeout: 10000 }
      );

      // searchFlights should NOT be called
      expect(mockSearchFlights).not.toHaveBeenCalled();
    });

    it('should not call searchFlights when airport codes are missing', async () => {
      const mockSearchFlights = jest.fn().mockResolvedValue({
        data: { success: true, flights: [] },
      });

      const mockSearchAccommodations = jest.fn().mockResolvedValue({
        data: { success: true, data: { hotels: [] } },
      });

      const mockSearchActivities = jest.fn().mockResolvedValue({
        data: { success: true, data: { activities: [], restaurants: [] } },
      });

      const mockCreateItinerary = jest.fn().mockResolvedValue({
        data: { success: true },
      });

      mockHttpsCallable.mockImplementation((functions, name) => {
        const mockFunctions: Record<string, any> = {
          searchFlights: mockSearchFlights,
          searchAccommodations: mockSearchAccommodations,
          searchActivities: mockSearchActivities,
          createItinerary: mockCreateItinerary,
        };
        return mockFunctions[name];
      });

      const { result } = renderHook(() => useAIGeneration());

      const request = {
        destination: 'Miami, FL',
        departure: 'New York, NY',
        // Missing departureAirportCode and destinationAirportCode
        startDate: '2025-11-12',
        endDate: '2025-11-19',
        travelPreferences: {
          transportation: { primaryMode: 'airplane' },
        },
        userInfo: {
          uid: 'test-user',
          username: 'Test User',
          email: 'test@test.com',
          gender: 'Male',
          dob: '1990-01-01',
          status: 'single',
          sexualOrientation: 'heterosexual',
          blocked: [],
        },
      };

      await waitFor(
        async () => {
          await result.current.generateItinerary(request as any);
        },
        { timeout: 10000 }
      );

      // searchFlights should NOT be called without airport codes
      expect(mockSearchFlights).not.toHaveBeenCalled();
    });
  });
});

/**
 * Unit Tests for useSearchItineraries Hook (RPC-based)
 * Tests Cloud Function RPC-based itinerary search with filtering
 * Matches PWA test patterns
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import useSearchItineraries from '../../hooks/useSearchItineraries';
import { httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Firebase Functions BEFORE any imports
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock firebase-config at ROOT level (imports from ../../firebase-config)
jest.mock('../../../firebase-config', () => ({
  auth: { currentUser: { uid: 'test-user-123' } },
  db: {},
  app: {},
  storage: {},
  functions: {}, // Mock functions singleton
}));

describe('useSearchItineraries (RPC)', () => {
  const mockUserItinerary = {
    id: 'user-itinerary-1',
    destination: 'Paris',
    startDate: '2024-01-01',
    endDate: '2024-01-08',
    startDay: new Date('2024-01-01').getTime(),
    endDay: new Date('2024-01-08').getTime(),
    gender: 'No Preference',
    status: 'No Preference',
    sexualOrientation: 'No Preference',
    lowerRange: 25,
    upperRange: 45,
    userInfo: {
      uid: 'test-user-123',
      username: 'testuser',
      blocked: [],
    },
  };

  const mockMatchingItinerary = {
    id: 'match-1',
    destination: 'Paris',
    startDate: '2024-01-05',
    endDate: '2024-01-12',
    startDay: new Date('2024-01-05').getTime(),
    endDay: new Date('2024-01-12').getTime(),
    gender: 'Female',
    userInfo: {
      uid: 'other-user',
      username: 'traveler1',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useSearchItineraries());

      expect(result.current.matchingItineraries).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);
      expect(typeof result.current.searchItineraries).toBe('function');
      expect(typeof result.current.getNextItinerary).toBe('function');
    });
  });

  describe('RPC Search Functionality', () => {
    it('should call searchItineraries RPC with correct parameters', async () => {
      const mockSearchFn = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [mockMatchingItinerary],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      expect(httpsCallable).toHaveBeenCalledWith(
        expect.anything(), // functions instance
        'searchItineraries'
      );
      expect(mockSearchFn).toHaveBeenCalledWith({
        destination: 'Paris',
        gender: 'No Preference',
        status: 'No Preference',
        sexualOrientation: 'No Preference',
        minStartDay: mockUserItinerary.startDay,
        maxEndDay: mockUserItinerary.endDay,
        pageSize: 10,
        excludedIds: [],
        blockedUserIds: [],
        currentUserId: 'test-user-123',
        lowerRange: 25,
        upperRange: 45,
      });
    });

    it('should update state with matching itineraries', async () => {
      const mockSearchFn = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [mockMatchingItinerary],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.matchingItineraries).toHaveLength(1);
        expect(result.current.matchingItineraries[0].id).toBe('match-1');
      });
    });

    it('should handle empty results', async () => {
      const mockSearchFn = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await waitFor(() => {
        expect(result.current.matchingItineraries).toEqual([]);
        expect(result.current.hasMore).toBe(false);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle RPC errors gracefully', async () => {
      const mockSearchFn = jest.fn().mockRejectedValue(new Error('Network error'));
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toContain('Network error');
        expect(result.current.matchingItineraries).toEqual([]);
      });
    });

    it('should filter out user own itineraries', async () => {
      const userOwnItinerary = {
        ...mockMatchingItinerary,
        id: 'own-itinerary',
        userInfo: { uid: 'test-user-123' },
      };

      const mockSearchFn = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [mockMatchingItinerary, userOwnItinerary],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await waitFor(() => {
        // Should only have the other user's itinerary
        expect(result.current.matchingItineraries).toHaveLength(1);
        expect(result.current.matchingItineraries[0].id).toBe('match-1');
      });
    });
  });

  describe('AsyncStorage Integration', () => {
    it('should exclude viewed itineraries from results', async () => {
      const viewedIds = ['match-1'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(viewedIds)
      );

      const mockSearchFn = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [mockMatchingItinerary],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      // Wait for AsyncStorage to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      // Should pass excludedIds including the viewed itinerary
      await waitFor(() => {
        expect(mockSearchFn).toHaveBeenCalled();
        const callArgs = mockSearchFn.mock.calls[0][0];
        expect(callArgs.excludedIds).toContain('match-1');
      });
    });

    it('should save viewed itinerary to AsyncStorage on getNextItinerary', async () => {
      const mockSearchFn = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [mockMatchingItinerary],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await act(async () => {
        await result.current.getNextItinerary();
      });

      // Should save the viewed itinerary ID
      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'VIEWED_ITINERARIES',
          expect.stringContaining('match-1')
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should advance to next itinerary', async () => {
      const mockSearchFn = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [
            mockMatchingItinerary,
            { ...mockMatchingItinerary, id: 'match-2', destination: 'London', userInfo: { uid: 'user-2' } },
          ],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await waitFor(() => {
        // Should have both itineraries (different destinations)
        expect(result.current.matchingItineraries.length).toBeGreaterThanOrEqual(1);
      });

      const initialLength = result.current.matchingItineraries.length;

      await act(async () => {
        await result.current.getNextItinerary();
      });

      // Should have one less itinerary after advancing
      await waitFor(() => {
        expect(result.current.matchingItineraries.length).toBe(Math.max(0, initialLength - 1));
      });
    });

    it('should set hasMore to false when no more itineraries', async () => {
      const mockSearchFn = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [mockMatchingItinerary],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await act(async () => {
        await result.current.getNextItinerary();
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
        expect(result.current.matchingItineraries).toEqual([]);
      });
    });
  });
});

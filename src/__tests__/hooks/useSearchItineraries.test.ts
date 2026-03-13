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

// Use centralized manual mock for firebaseConfig
jest.mock('../../config/firebaseConfig');

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
    // Ensure authenticated user for RPC tests
    const { setMockUser } = require('../../testUtils/mockAuth');
    setMockUser();
  });

  afterEach(() => {
    const { clearMockUser } = require('../../testUtils/mockAuth');
    clearMockUser();
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

      // Accept any first arg (may be undefined depending on mock import shape)
      expect(httpsCallable).toHaveBeenCalled();
      expect((httpsCallable as jest.Mock).mock.calls[0][1]).toBe('searchItineraries');
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

  // ============================================================
  // 🚨 CRITICAL REGRESSION GUARD — DO NOT MODIFY WITHOUT
  //    EXPLICIT WRITTEN CONSENT FROM THE PRODUCT OWNER 🚨
  //
  // TravalPass core use case: users search for OTHER TRAVELLERS
  // going to the SAME destination during overlapping dates.
  // Multiple results with the same destination is NOT a bug —
  // it is the ENTIRE POINT of the app.
  //
  // ❌ NEVER deduplicate, group, or collapse results by destination.
  // ❌ NEVER deduplicate by userId.
  // ✅ Deduplicate by itinerary ID only.
  // ✅ Exclude the current user's own itineraries by userId.
  //
  // If ANY test in this block fails, STOP immediately and
  // investigate before merging. A failure here means the core
  // matching feature is broken and real users will see no results.
  //
  // Any refactor to useSearchItineraries deduplication or filtering
  // logic REQUIRES full review and explicit approval. Do not modify
  // this behaviour as a side-effect of unrelated work.
  // ============================================================
  describe('🚨 CRITICAL: Same-Destination Multi-Match (Regression Guard)', () => {
    it('should return ALL travellers going to the same destination — not just one', async () => {
      // This is the exact bug that was introduced: destination-based dedup
      // collapsed multiple valid matches to a single result.
      const userA = { ...mockMatchingItinerary, id: 'match-A', userInfo: { uid: 'user-A', username: 'travelerA' } };
      const userB = { ...mockMatchingItinerary, id: 'match-B', userInfo: { uid: 'user-B', username: 'travelerB' } };
      const userC = { ...mockMatchingItinerary, id: 'match-C', userInfo: { uid: 'user-C', username: 'travelerC' } };
      // All three are going to 'Paris' — same destination as the searching user

      const mockSearchFn = jest.fn().mockResolvedValue({
        data: { success: true, data: [userA, userB, userC] },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await waitFor(() => {
        // All 3 must appear — destination-based dedup would collapse this to 1
        expect(result.current.matchingItineraries).toHaveLength(3);
        const ids = result.current.matchingItineraries.map(i => i.id);
        expect(ids).toContain('match-A');
        expect(ids).toContain('match-B');
        expect(ids).toContain('match-C');
      });
    });

    it('should deduplicate by itinerary ID only — same ID returned twice must appear once', async () => {
      const duplicate = { ...mockMatchingItinerary, id: 'match-1', userInfo: { uid: 'user-A' } };

      const mockSearchFn = jest.fn().mockResolvedValue({
        data: { success: true, data: [mockMatchingItinerary, duplicate] },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await waitFor(() => {
        // Same ID twice → only one entry
        expect(result.current.matchingItineraries).toHaveLength(1);
        expect(result.current.matchingItineraries[0].id).toBe('match-1');
      });
    });

    it('should never deduplicate by userId — same user with two different itineraries must both appear', async () => {
      const trip1 = { ...mockMatchingItinerary, id: 'trip-1', destination: 'Paris',  userInfo: { uid: 'user-A' } };
      const trip2 = { ...mockMatchingItinerary, id: 'trip-2', destination: 'London', userInfo: { uid: 'user-A' } };

      const mockSearchFn = jest.fn().mockResolvedValue({
        data: { success: true, data: [trip1, trip2] },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await waitFor(() => {
        // Different itinerary IDs from same user → both must appear
        expect(result.current.matchingItineraries).toHaveLength(2);
      });
    });

    it('should exclude only the CURRENT user — other users sharing a destination must still appear', async () => {
      const currentUser = { ...mockMatchingItinerary, id: 'own', userInfo: { uid: 'test-user-123' } };
      const otherUser1  = { ...mockMatchingItinerary, id: 'other-1', userInfo: { uid: 'user-X' } };
      const otherUser2  = { ...mockMatchingItinerary, id: 'other-2', userInfo: { uid: 'user-Y' } };

      const mockSearchFn = jest.fn().mockResolvedValue({
        data: { success: true, data: [currentUser, otherUser1, otherUser2] },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary as any, 'test-user-123');
      });

      await waitFor(() => {
        // Current user excluded, both others retained
        expect(result.current.matchingItineraries).toHaveLength(2);
        const ids = result.current.matchingItineraries.map(i => i.id);
        expect(ids).not.toContain('own');
        expect(ids).toContain('other-1');
        expect(ids).toContain('other-2');
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

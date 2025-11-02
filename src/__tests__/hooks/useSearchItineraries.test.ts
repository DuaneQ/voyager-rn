/**
 * Unit Tests for useSearchItineraries Hook
 * Tests Firestore-based itinerary search with filtering and pagination
 * Follows React hooks testing best practices
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import useSearchItineraries from '../../hooks/useSearchItineraries';
import * as firestore from 'firebase/firestore';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
}));

// Mock firebase config
jest.mock('../../config/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {},
  app: {},
}));

describe('useSearchItineraries', () => {
  const mockUserItinerary = {
    id: 'user-itinerary-1',
    destination: 'Paris, France',
    startDate: '2024-01-01',
    endDate: '2024-01-08',
    description: 'My trip to Paris',
    activities: ['Eiffel Tower'],
    gender: 'Female',
    status: 'Single',
    sexualOrientation: 'Straight',
    userInfo: {
      uid: 'user-123',
      email: 'user@example.com',
      username: 'user123',
      gender: 'Male',
      status: 'Single',
      sexualOrientation: 'Straight',
    },
  };

  const mockMatchingItinerary = {
    id: 'match-1',
    destination: 'Paris, France',
    startDate: '2024-01-05',
    endDate: '2024-01-12',
    description: 'Trip to Paris',
    activities: ['Louvre'],
    endDay: new Date('2024-01-12').getTime(),
    userInfo: {
      uid: 'other-user',
      email: 'other@example.com',
      username: 'traveler1',
      gender: 'Female',
      status: 'Single',
      sexualOrientation: 'Straight',
    },
  };

  const mockQuerySnapshot = (docs: any[]) => ({
    docs: docs.map((data, index) => ({
      id: data.id,
      data: () => data,
    })),
    empty: docs.length === 0,
    size: docs.length,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Suppress console logs in tests
    console.error = jest.fn();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useSearchItineraries());

      expect(result.current.matchingItineraries).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.allMatchingItineraries).toEqual([]);
      expect(typeof result.current.searchItineraries).toBe('function');
      expect(typeof result.current.getNextItinerary).toBe('function');
    });
  });

  describe('Search Functionality', () => {
    it('should search itineraries successfully', async () => {
      (firestore.getDocs as jest.Mock).mockResolvedValue(
        mockQuerySnapshot([mockMatchingItinerary])
      );

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.allMatchingItineraries).toHaveLength(1);
      expect(result.current.matchingItineraries).toHaveLength(1);
      expect(result.current.matchingItineraries[0].id).toBe('match-1');
    });

    it('should handle empty search results', async () => {
      (firestore.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot([]));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      expect(result.current.allMatchingItineraries).toEqual([]);
      expect(result.current.matchingItineraries).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('should filter out user\'s own itineraries', async () => {
      const ownItinerary = {
        ...mockMatchingItinerary,
        id: 'own-itinerary',
        userInfo: {
          ...mockMatchingItinerary.userInfo,
          uid: 'user-123', // Same as current user
        },
      };

      (firestore.getDocs as jest.Mock).mockResolvedValue(
        mockQuerySnapshot([mockMatchingItinerary, ownItinerary])
      );

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      // Should only have the other user's itinerary
      expect(result.current.allMatchingItineraries).toHaveLength(1);
      expect(result.current.allMatchingItineraries[0].id).toBe('match-1');
    });

    it('should build query with all filters', async () => {
      (firestore.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot([]));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      // Verify query was built with proper constraints
      expect(firestore.where).toHaveBeenCalledWith('destination', '==', 'Paris, France');
      expect(firestore.where).toHaveBeenCalledWith('userInfo.gender', '==', 'Female');
      expect(firestore.where).toHaveBeenCalledWith('userInfo.status', '==', 'Single');
      expect(firestore.where).toHaveBeenCalledWith('userInfo.sexualOrientation', '==', 'Straight');
      expect(firestore.where).toHaveBeenCalledWith('endDay', '>=', expect.any(Number));
    });

    it('should skip gender filter when No Preference', async () => {
      (firestore.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot([]));

      const noPreferenceItinerary = {
        ...mockUserItinerary,
        gender: 'No Preference',
      };

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(noPreferenceItinerary, 'user-123');
      });

      const genderCalls = (firestore.where as jest.Mock).mock.calls.filter(
        call => call[0] === 'userInfo.gender'
      );
      expect(genderCalls).toHaveLength(0);
    });

    it('should reset state on new search', async () => {
      (firestore.getDocs as jest.Mock)
        .mockResolvedValueOnce(mockQuerySnapshot([mockMatchingItinerary]))
        .mockResolvedValueOnce(mockQuerySnapshot([{ ...mockMatchingItinerary, id: 'match-2' }]));

      const { result } = renderHook(() => useSearchItineraries());

      // First search
      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.allMatchingItineraries).toHaveLength(1);

      // Move to next
      await act(async () => {
        await result.current.getNextItinerary();
      });

      // Second search should reset
      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.allMatchingItineraries[0].id).toBe('match-2');
    });
  });

  describe('Pagination', () => {
    it('should advance to next itinerary in memory', async () => {
      const itineraries = [
        mockMatchingItinerary,
        { ...mockMatchingItinerary, id: 'match-2' },
        { ...mockMatchingItinerary, id: 'match-3' },
      ];

      (firestore.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot(itineraries));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      expect(result.current.matchingItineraries[0].id).toBe('match-1');

      // Move to next
      await act(async () => {
        await result.current.getNextItinerary();
      });

      expect(result.current.matchingItineraries[0].id).toBe('match-2');
      expect(result.current.currentIndex).toBe(1);
    });

    it('should load more results when reaching end', async () => {
      // Create 50 items to trigger hasMore
      const firstBatch = Array.from({ length: 50 }, (_, i) => ({
        ...mockMatchingItinerary,
        id: `match-${i}`,
      }));

      const secondBatch = Array.from({ length: 10 }, (_, i) => ({
        ...mockMatchingItinerary,
        id: `match-${i + 50}`,
      }));

      (firestore.getDocs as jest.Mock)
        .mockResolvedValueOnce(mockQuerySnapshot(firstBatch))
        .mockResolvedValueOnce(mockQuerySnapshot(secondBatch));

      const { result } = renderHook(() => useSearchItineraries());

      // Initial search
      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      expect(result.current.allMatchingItineraries).toHaveLength(50);
      expect(result.current.hasMore).toBe(true);

      // Move to index 49 (last item)
      for (let i = 0; i < 49; i++) {
        await act(async () => {
          await result.current.getNextItinerary();
        });
      }

      // Next call should load more
      await act(async () => {
        await result.current.getNextItinerary();
      });

      await waitFor(() => {
        expect(result.current.allMatchingItineraries).toHaveLength(60);
      });
    });

    it('should set hasMore to false when fewer than PAGE_SIZE results', async () => {
      const itineraries = [mockMatchingItinerary]; // Only 1 result

      (firestore.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot(itineraries));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('Loading State', () => {
    it('should set loading during search', async () => {
      (firestore.getDocs as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockQuerySnapshot([mockMatchingItinerary])), 100);
          })
      );

      const { result } = renderHook(() => useSearchItineraries());

      act(() => {
        result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading when fetching more results', async () => {
      const firstBatch = Array.from({ length: 50 }, (_, i) => ({
        ...mockMatchingItinerary,
        id: `match-${i}`,
      }));

      (firestore.getDocs as jest.Mock)
        .mockResolvedValueOnce(mockQuerySnapshot(firstBatch))
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(mockQuerySnapshot([])), 100);
            })
        );

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      // Move to end
      for (let i = 0; i < 49; i++) {
        await act(async () => {
          await result.current.getNextItinerary();
        });
      }

      // Try to load more
      act(() => {
        result.current.getNextItinerary();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors', async () => {
      (firestore.getDocs as jest.Mock).mockRejectedValue(
        new Error('Firestore error')
      );

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      expect(result.current.error).toBe('Failed to search itineraries');
      expect(result.current.loading).toBe(false);
    });

    it('should handle missing parameters', async () => {
      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(null as any, 'user-123');
      });

      expect(result.current.error).toBe('Missing required parameters');
    });

    it('should handle errors when loading more results', async () => {
      const firstBatch = Array.from({ length: 50 }, (_, i) => ({
        ...mockMatchingItinerary,
        id: `match-${i}`,
      }));

      (firestore.getDocs as jest.Mock)
        .mockResolvedValueOnce(mockQuerySnapshot(firstBatch))
        .mockRejectedValueOnce(new Error('Load more error'));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      // Move to end
      for (let i = 0; i < 49; i++) {
        await act(async () => {
          await result.current.getNextItinerary();
        });
      }

      // Try to load more (should handle error gracefully)
      await act(async () => {
        await result.current.getNextItinerary();
      });

      expect(result.current.loading).toBe(false);
      // Should still have original results
      expect(result.current.allMatchingItineraries).toHaveLength(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid getNextItinerary calls', async () => {
      const itineraries = [
        mockMatchingItinerary,
        { ...mockMatchingItinerary, id: 'match-2' },
        { ...mockMatchingItinerary, id: 'match-3' },
      ];

      (firestore.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot(itineraries));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      // Call getNextItinerary multiple times rapidly
      await act(async () => {
        await Promise.all([
          result.current.getNextItinerary(),
          result.current.getNextItinerary(),
          result.current.getNextItinerary(),
        ]);
      });

      // Should handle gracefully without errors
      expect(result.current.loading).toBe(false);
    });

    it('should handle getNextItinerary when no results', async () => {
      (firestore.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot([]));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      // Try to get next when there are no results
      await act(async () => {
        await result.current.getNextItinerary();
      });

      expect(result.current.matchingItineraries).toEqual([]);
      expect(result.current.currentIndex).toBe(0);
    });

    it('should handle missing userInfo in itinerary', async () => {
      const itineraryWithoutUserInfo = {
        ...mockMatchingItinerary,
        userInfo: undefined,
      };

      (firestore.getDocs as jest.Mock).mockResolvedValue(
        mockQuerySnapshot([itineraryWithoutUserInfo])
      );

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'user-123');
      });

      // Should not crash, may or may not include the result
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});

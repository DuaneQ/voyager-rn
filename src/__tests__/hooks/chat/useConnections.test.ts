/**
 * Unit Tests for useConnections Hook
 * Tests connection subscription, pagination, and cleanup
 */

// Mock Firebase Firestore - must be before imports
const mockOnSnapshot = jest.fn();
const mockGetDocs = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockStartAfter = jest.fn();

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  limit: (...args: any[]) => mockLimit(...args),
  startAfter: (...args: any[]) => mockStartAfter(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { useConnections } from '../../../hooks/chat/useConnections';

describe('useConnections', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockUnsubscribe = jest.fn();
    mockCollection.mockReturnValue({ type: 'collection' });
    mockQuery.mockReturnValue({ type: 'query' });
    mockWhere.mockReturnValue({ type: 'where' });
    mockOrderBy.mockReturnValue({ type: 'orderBy' });
    mockLimit.mockReturnValue({ type: 'limit' });
    mockStartAfter.mockReturnValue({ type: 'startAfter' });
    
    // Default onSnapshot behavior - call snapshot callback immediately
    mockOnSnapshot.mockImplementation((q, onSuccess, onError) => {
      // Immediately call success with empty snapshot
      setTimeout(() => {
        onSuccess({
          docs: [],
          size: 0,
        });
      }, 0);
      return mockUnsubscribe;
    });
    
    // Default getDocs behavior
    mockGetDocs.mockResolvedValue({
      docs: [],
      size: 0,
    });
  });

  describe('initialization', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useConnections('user123'));
      
      expect(result.current.loading).toBe(true);
      expect(result.current.connections).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle null userId gracefully', async () => {
      const { result } = renderHook(() => useConnections(null));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.connections).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it('should setup Firestore query with correct parameters', async () => {
      const { result } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(mockCollection).toHaveBeenCalledWith({}, 'connections');
      expect(mockWhere).toHaveBeenCalledWith('users', 'array-contains', 'user123');
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe('real-time updates', () => {
    it('should process snapshot data correctly', async () => {
      const mockDocs = [
        {
          id: 'conn1',
          data: () => ({
            users: ['user123', 'user456'],
            itineraryIds: ['itin1'],
            itineraries: [{ id: 'itin1', destination: 'Paris' }],
            createdAt: { seconds: 1234567890, nanoseconds: 0 },
            unreadCounts: { user123: 2 },
            addedUsers: [],
          }),
        },
        {
          id: 'conn2',
          data: () => ({
            users: ['user123', 'user789'],
            itineraryIds: [],
            itineraries: [],
            createdAt: { seconds: 1234567800, nanoseconds: 0 },
            unreadCounts: {},
            addedUsers: ['user789'],
          }),
        },
      ];

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          onSuccess({
            docs: mockDocs,
            size: 2,
          });
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.connections).toHaveLength(2);
      expect(result.current.connections[0].id).toBe('conn1');
      expect(result.current.connections[0].users).toEqual(['user123', 'user456']);
      expect(result.current.connections[1].id).toBe('conn2');
    });

    it('should handle empty connections', async () => {
      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          onSuccess({
            docs: [],
            size: 0,
          });
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.connections).toEqual([]);
      expect(result.current.hasMore).toBe(false);
    });

    it('should set hasMore correctly based on page size', async () => {
      const mockDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `conn${i}`,
        data: () => ({
          users: ['user123'],
          itineraryIds: [],
          itineraries: [],
          createdAt: { seconds: 1234567890 - i, nanoseconds: 0 },
          unreadCounts: {},
          addedUsers: [],
        }),
      }));

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          onSuccess({
            docs: mockDocs,
            size: 10,
          });
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.hasMore).toBe(true);
    });

    it('should handle snapshot errors', async () => {
      const testError = new Error('Firestore snapshot error');
      
      mockOnSnapshot.mockImplementation((q, onSuccess, onError) => {
        setTimeout(() => {
          onError(testError);
        }, 0);
        return mockUnsubscribe;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.error).toBe(testError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching connections:', testError);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('pagination', () => {
    it('should load more connections when hasMore is true', async () => {
      const mockDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `conn${i}`,
        data: () => ({
          users: ['user123'],
          itineraryIds: [],
          itineraries: [],
          createdAt: { seconds: 1234567890 - i, nanoseconds: 0 },
          unreadCounts: {},
          addedUsers: [],
        }),
      }));

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          onSuccess({
            docs: mockDocs,
            size: 10,
          });
        }, 0);
        return mockUnsubscribe;
      });

      const moreDocs = Array.from({ length: 5 }, (_, i) => ({
        id: `conn${10 + i}`,
        data: () => ({
          users: ['user123'],
          itineraryIds: [],
          itineraries: [],
          createdAt: { seconds: 1234567880 - i, nanoseconds: 0 },
          unreadCounts: {},
          addedUsers: [],
        }),
      }));

      mockGetDocs.mockResolvedValue({
        docs: moreDocs,
        size: 5,
      });

      const { result } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.connections).toHaveLength(10);
      
      await result.current.loadMore();
      
      await waitFor(() => {
        expect(result.current.connections).toHaveLength(15);
      });
      
      expect(mockGetDocs).toHaveBeenCalled();
      expect(mockStartAfter).toHaveBeenCalled();
    });

    it('should not load more if hasMore is false', async () => {
      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          onSuccess({
            docs: [],
            size: 0,
          });
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      await result.current.loadMore();
      
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('should not load more if userId is null', async () => {
      const { result } = renderHook(() => useConnections(null));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      await result.current.loadMore();
      
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('should handle loadMore errors gracefully', async () => {
      const mockDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `conn${i}`,
        data: () => ({
          users: ['user123'],
          itineraryIds: [],
          itineraries: [],
          createdAt: { seconds: 1234567890 - i, nanoseconds: 0 },
          unreadCounts: {},
          addedUsers: [],
        }),
      }));

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          onSuccess({
            docs: mockDocs,
            size: 10,
          });
        }, 0);
        return mockUnsubscribe;
      });

      const testError = new Error('Load more error');
      mockGetDocs.mockRejectedValue(testError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      await result.current.loadMore();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading more connections:', testError);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('refresh', () => {
    it('should cleanup previous listener before refresh', async () => {
      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          onSuccess({
            docs: [],
            size: 0,
          });
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
      
      result.current.refresh();
      
      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
      
      expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
    });

    it('should trigger new subscription on refresh', async () => {
      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          onSuccess({
            docs: [],
            size: 0,
          });
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
      
      // Refresh should trigger new subscription
      result.current.refresh();
      
      // Wait for re-render to complete
      await waitFor(() => {
        expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
      });
      
      // Should have unsubscribed from the old listener
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          onSuccess({
            docs: [],
            size: 0,
          });
        }, 0);
        return mockUnsubscribe;
      });

      const { result, unmount } = renderHook(() => useConnections('user123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should unsubscribe when userId changes', async () => {
      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          onSuccess({
            docs: [],
            size: 0,
          });
        }, 0);
        return mockUnsubscribe;
      });

      const { result, rerender } = renderHook(
        ({ userId }) => useConnections(userId),
        { initialProps: { userId: 'user123' } }
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
      
      rerender({ userId: 'user456' });
      
      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
      
      expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
    });
  });
});

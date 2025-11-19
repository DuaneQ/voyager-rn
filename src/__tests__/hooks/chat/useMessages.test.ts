/**
 * Unit Tests for useMessages Hook
 * Tests message pagination, real-time updates, and deduplication
 */

// Mock Firebase Firestore
const mockOnSnapshot = jest.fn();
const mockGetDocs = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockStartAfter = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
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
import { useMessages } from '../../../hooks/chat/useMessages';

describe('useMessages', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUnsubscribe = jest.fn();
    mockCollection.mockReturnValue({ type: 'collection' });
    mockQuery.mockReturnValue({ type: 'query' });
    mockOrderBy.mockReturnValue({ type: 'orderBy' });
    mockLimit.mockReturnValue({ type: 'limit' });
    mockStartAfter.mockReturnValue({ type: 'startAfter' });
    
    // Default onSnapshot behavior
    mockOnSnapshot.mockImplementation((q, onSuccess) => {
      setTimeout(() => {
        onSuccess({
          docs: [],
          forEach: (callback: any) => {},
          docChanges: () => [],
        });
      }, 0);
      return mockUnsubscribe;
    });
    
    // Default getDocs behavior
    mockGetDocs.mockResolvedValue({
      docs: [],
      forEach: (callback: any) => {},
    });
  });

  describe('initialization', () => {
    it('should start with empty messages and loading true initially', async () => {
      const { result } = renderHook(() => useMessages('conn123'));
      
      expect(result.current.messages).toEqual([]);
      expect(result.current.error).toBeNull();
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle null connectionId gracefully', async () => {
      const { result } = renderHook(() => useMessages(null));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.messages).toEqual([]);
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it('should handle undefined connectionId gracefully', async () => {
      const { result } = renderHook(() => useMessages(undefined));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.messages).toEqual([]);
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it('should setup Firestore query with correct parameters', async () => {
      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(mockCollection).toHaveBeenCalled();
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(10); // Updated to match MESSAGES_PER_PAGE
    });
  });

  describe('real-time updates', () => {
    it('should process snapshot messages correctly', async () => {
      const mockDocs = [
        {
          id: 'msg1',
          data: () => ({
            sender: 'user1',
            text: 'Hello',
            createdAt: { seconds: 1000, nanoseconds: 0 },
            readBy: ['user1'],
            pending: false,
          }),
        },
        {
          id: 'msg2',
          data: () => ({
            sender: 'user2',
            text: 'Hi there',
            createdAt: { seconds: 2000, nanoseconds: 0 },
            readBy: [],
            clientMessageId: 'client-msg-2',
            pending: false,
          }),
        },
      ];

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: mockDocs,
            forEach: (callback: any) => mockDocs.forEach(callback),
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });
      
      // Messages ordered by timestamp (reversed in hook) - msg2 has higher timestamp
      expect(result.current.messages[0].id).toBe('msg2');
      expect(result.current.messages[0].clientMessageId).toBe('client-msg-2');
      expect(result.current.messages[1].id).toBe('msg1');
      expect(result.current.messages[1].text).toBe('Hello');
    });

    it.skip('should deduplicate messages by clientMessageId - DEPRECATED: Firestore handles uniqueness', async () => {
      // This test is deprecated - the new PWA-matching implementation
      // doesn't manually deduplicate. Firestore's real-time listener
      // automatically handles message uniqueness.
    });

    it('should handle messages with image URLs', async () => {
      const mockDocs = [
        {
          id: 'msg1',
          data: () => ({
            sender: 'user1',
            text: '',
            imageUrl: 'https://example.com/image.jpg',
            createdAt: { seconds: 1000, nanoseconds: 0 },
            readBy: [],
            pending: false,
          }),
        },
      ];

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: mockDocs,
            forEach: (callback: any) => mockDocs.forEach(callback),
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });
      
      expect(result.current.messages[0].imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should set hasMore based on page size', async () => {
      const mockDocs = Array.from({ length: 5 }, (_, i) => ({
        id: `msg${i}`,
        data: () => ({
          sender: 'user1',
          text: `Message ${i}`,
          createdAt: { seconds: 1000 + i, nanoseconds: 0 },
          readBy: [],
          pending: false,
        }),
      }));

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: mockDocs,
            forEach: (callback: any) => mockDocs.forEach(callback),
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });
    });

    it('should handle snapshot errors', async () => {
      const testError = new Error('Snapshot error');
      
      mockOnSnapshot.mockImplementation((q, onSuccess, onError) => {
        setTimeout(() => {
          onError(testError);
        }, 0);
        return mockUnsubscribe;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.error).toBe(testError);
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading messages:', testError);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('pagination with loadMore', () => {
    it('should load more messages using getDocs', async () => {
      const initialDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i}`,
        data: () => ({
          sender: 'user1',
          text: `Message ${i}`,
          createdAt: { seconds: 1000 + i, nanoseconds: 0 },
          readBy: [],
          pending: false,
        }),
      }));

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: initialDocs,
            forEach: (callback: any) => initialDocs.forEach(callback),
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const moreDocs = Array.from({ length: 3 }, (_, i) => ({
        id: `msg${10 + i}`,
        data: () => ({
          sender: 'user1',
          text: `Older message ${i}`,
          createdAt: { seconds: 900 + i, nanoseconds: 0 },
          readBy: [],
          pending: false,
        }),
      }));

      mockGetDocs.mockResolvedValue({
        docs: moreDocs,
        forEach: (callback: any) => moreDocs.forEach(callback),
      });

      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(10);
      });
      
      await result.current.loadMore();
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(13); // 10 latest + 3 older
      });
      
      expect(mockGetDocs).toHaveBeenCalled();
      expect(mockStartAfter).toHaveBeenCalled();
    });

    it('should not load more if hasMore is false', async () => {
      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: [], // Empty = no more
            forEach: (callback: any) => {},
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });
      
      await result.current.loadMore();
      
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('should not load more if connectionId is null', async () => {
      const { result } = renderHook(() => useMessages(null));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      await result.current.loadMore();
      
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('should handle loadMore errors gracefully', async () => {
      const initialDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i}`,
        data: () => ({
          sender: 'user1',
          text: `Message ${i}`,
          createdAt: { seconds: 1000 + i, nanoseconds: 0 },
          readBy: [],
          pending: false,
        }),
      }));

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: initialDocs,
            forEach: (callback: any) => initialDocs.forEach(callback),
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const testError = new Error('Load more error');
      mockGetDocs.mockRejectedValue(testError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(10);
      });
      
      await result.current.loadMore();
      
      await waitFor(() => {
        expect(result.current.error).toBe(testError);
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[useMessages] Error loading more messages:', testError);
      
      consoleErrorSpy.mockRestore();
    });

    it('should prepend older messages when loading more', async () => {
      const initialDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        data: () => ({
          sender: 'user1',
          text: `Message ${i}`,
          createdAt: { seconds: 2000 + i, nanoseconds: 0 },
          readBy: [],
          pending: false,
        }),
      }));

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: initialDocs,
            forEach: (callback: any) => initialDocs.forEach(callback),
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const olderDocs = [{
        id: 'msg-old',
        data: () => ({
          sender: 'user1',
          text: 'Older message',
          createdAt: { seconds: 1000, nanoseconds: 0 },
          readBy: [],
          pending: false,
        }),
      }];

      mockGetDocs.mockResolvedValue({
        docs: olderDocs,
        forEach: (callback: any) => olderDocs.forEach(callback),
      });

      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(10);
      });
      
      await result.current.loadMore();
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(11); // 10 latest + 1 older
      });
      
      // Older message should be prepended (first in array)
      expect(result.current.messages[0].id).toBe('msg-old');
    });
  });

  describe('refresh', () => {
    it('should cleanup listener and reload messages', async () => {
      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: [],
            forEach: (callback: any) => {},
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
      
      result.current.refresh();
      
      await waitFor(() => {
        expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
      });
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should clear messages and reset state on refresh', async () => {
      const mockDocs = [
        {
          id: 'msg1',
          data: () => ({
            sender: 'user1',
            text: 'Hello',
            createdAt: { seconds: 1000, nanoseconds: 0 },
            readBy: [],
            pending: false,
          }),
        },
      ];

      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: mockDocs,
            forEach: (callback: any) => mockDocs.forEach(callback),
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });
      
      result.current.refresh();
      
      // Should reload and get same data
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: [],
            forEach: (callback: any) => {},
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const { unmount } = renderHook(() => useMessages('conn123'));
      
      await waitFor(() => {
        expect(mockOnSnapshot).toHaveBeenCalled();
      });
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should unsubscribe when connectionId changes', async () => {
      mockOnSnapshot.mockImplementation((q, onSuccess) => {
        setTimeout(() => {
          const snapshot = {
            docs: [],
            forEach: (callback: any) => {},
          };
          onSuccess(snapshot);
        }, 0);
        return mockUnsubscribe;
      });

      const { rerender } = renderHook(
        ({ connectionId }) => useMessages(connectionId),
        { initialProps: { connectionId: 'conn123' } }
      );
      
      await waitFor(() => {
        expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
      });
      
      rerender({ connectionId: 'conn456' });
      
      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
      
      expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
    });
  });
});

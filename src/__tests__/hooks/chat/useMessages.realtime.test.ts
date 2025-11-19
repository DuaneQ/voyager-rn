/**
 * Integration Tests for useMessages Real-Time Message Appending
 * Tests the new docChanges() functionality that preserves existing messages
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
const mockOnSnapshot = jest.fn();
const mockGetDocs = jest.fn();
const mockCollection = jest.fn(() => 'messages-ref');
const mockQuery = jest.fn(() => 'query-ref');
const mockOrderBy = jest.fn(() => 'orderBy-ref');
const mockLimit = jest.fn(() => 'limit-ref');
const mockStartAfter = jest.fn(() => 'startAfter-ref');

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((...args: any[]) => mockCollection(...args)),
  query: jest.fn((...args: any[]) => mockQuery(...args)),
  orderBy: jest.fn((...args: any[]) => mockOrderBy(...args)),
  limit: jest.fn((...args: any[]) => mockLimit(...args)),
  startAfter: jest.fn((...args: any[]) => mockStartAfter(...args)),
  onSnapshot: jest.fn((...args: any[]) => mockOnSnapshot(...args)),
  getDocs: jest.fn((...args: any[]) => mockGetDocs(...args)),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    fromDate: (date: Date) => ({
      seconds: date.getTime() / 1000,
      nanoseconds: 0,
      toDate: () => date,
    }),
  },
}));

jest.mock('../../../../firebase-config', () => ({ db: {} }));

import { useMessages } from '../../../hooks/chat/useMessages';

describe('useMessages - Real-Time Message Appending', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
  });

  it('should display messages without erasing on new message', async () => {
    let snapshotCallback: any;

    // Firestore returns desc order (newest first)
    const initialMessages = [
      {
        id: 'msg-2',
        data: () => ({
          sender: 'user-2',
          text: 'Second message',
          createdAt: Timestamp.fromDate(new Date('2025-01-01T10:01:00Z')),
          readBy: ['user-2'],
          clientMessageId: 'client-2',
        }),
      },
      {
        id: 'msg-1',
        data: () => ({
          sender: 'user-1',
          text: 'First message',
          createdAt: Timestamp.fromDate(new Date('2025-01-01T10:00:00Z')),
          readBy: ['user-1'],
          clientMessageId: 'client-1',
        }),
      },
    ];

    // Setup onSnapshot mock
    mockOnSnapshot.mockImplementation((q, callback) => {
      snapshotCallback = callback;
      
      // Initial load
      setTimeout(() => {
        callback({
          docs: initialMessages,
          forEach: (cb: any) => initialMessages.forEach(cb),
          docChanges: () => initialMessages.map(doc => ({ type: 'added', doc })),
        });
      }, 0);
      
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useMessages('conn-123'));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
    // After reverse: oldest first
    expect(result.current.messages[0].text).toBe('First message');
    expect(result.current.messages[1].text).toBe('Second message');

    // Simulate new message arriving - Firestore returns all 3 (desc order)
    const newMessage = {
      id: 'msg-3',
      data: () => ({
        sender: 'user-1',
        text: 'Third message',
        createdAt: Timestamp.fromDate(new Date('2025-01-01T10:02:00Z')),
        readBy: ['user-1'],
        clientMessageId: 'client-3',
      }),
    };

    act(() => {
      snapshotCallback({
        docs: [newMessage, ...initialMessages], // Firestore desc order
        forEach: (cb: any) => [newMessage, ...initialMessages].forEach(cb),
        docChanges: () => [
          {
            type: 'added',
            doc: newMessage,
          },
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
    });

    // Verify all messages present, oldest first after reverse
    expect(result.current.messages[0].text).toBe('First message');
    expect(result.current.messages[1].text).toBe('Second message');
    expect(result.current.messages[2].text).toBe('Third message');
  });

  it('should handle image messages without erasing text messages', async () => {
    let snapshotCallback: any;

    // Firestore desc order
    const textMessages = [
      {
        id: 'msg-2',
        data: () => ({
          sender: 'user-2',
          text: 'Text message 2',
          createdAt: Timestamp.fromDate(new Date('2025-01-01T10:01:00Z')),
          readBy: ['user-2'],
          clientMessageId: 'client-2',
        }),
      },
      {
        id: 'msg-1',
        data: () => ({
          sender: 'user-1',
          text: 'Text message 1',
          createdAt: Timestamp.fromDate(new Date('2025-01-01T10:00:00Z')),
          readBy: ['user-1'],
          clientMessageId: 'client-1',
        }),
      },
    ];

    mockOnSnapshot.mockImplementation((q, callback) => {
      snapshotCallback = callback;
      
      setTimeout(() => {
        callback({
          docs: textMessages,
          forEach: (cb: any) => textMessages.forEach(cb),
          docChanges: () => textMessages.map(doc => ({ type: 'added', doc })),
        });
      }, 0);
      
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useMessages('conn-123'));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    // Simulate image message upload - Firestore returns all 3 desc
    const imageMessage = {
      id: 'msg-3',
      data: () => ({
        sender: 'user-1',
        text: 'Check this out!',
        imageUrl: 'https://storage.example.com/image.jpg',
        createdAt: Timestamp.fromDate(new Date('2025-01-01T10:02:00Z')),
        readBy: ['user-1'],
        clientMessageId: 'client-3',
      }),
    };

    act(() => {
      snapshotCallback({
        docs: [imageMessage, ...textMessages], // Firestore desc order
        forEach: (cb: any) => [imageMessage, ...textMessages].forEach(cb),
        docChanges: () => [
          {
            type: 'added',
            doc: imageMessage,
          },
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
    });

    // After reverse: oldest first
    expect(result.current.messages[0].text).toBe('Text message 1');
    expect(result.current.messages[1].text).toBe('Text message 2');
    expect(result.current.messages[2].text).toBe('Check this out!');
    expect(result.current.messages[2].imageUrl).toBe('https://storage.example.com/image.jpg');
  });

  it('should deduplicate messages by clientMessageId', async () => {
    let snapshotCallback: any;

    const message = {
      id: 'msg-1',
      data: () => ({
        sender: 'user-1',
        text: 'Duplicate test',
        createdAt: Timestamp.fromDate(new Date('2025-01-01T10:00:00Z')),
        readBy: ['user-1'],
        clientMessageId: 'client-duplicate',
      }),
    };

    mockOnSnapshot.mockImplementation((q, callback) => {
      snapshotCallback = callback;
      
      setTimeout(() => {
        callback({
          docs: [message],
          forEach: (cb: any) => [message].forEach(cb),
          docChanges: () => [{ type: 'added', doc: message }],
        });
      }, 0);
      
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useMessages('conn-123'));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    // Try to add same message again (same clientMessageId)
    act(() => {
      snapshotCallback({
        docs: [message],
        forEach: (cb: any) => [message].forEach(cb),
        docChanges: () => [
          {
            type: 'added',
            doc: message,
          },
        ],
      });
    });

    // Give it time to process
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should still only have 1 message (deduplicated)
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].clientMessageId).toBe('client-duplicate');
  });

  it('should maintain chronological order when new messages arrive', async () => {
    let snapshotCallback: any;

    const msg1 = {
      id: 'msg-1',
      data: () => ({
        sender: 'user-1',
        text: 'First',
        createdAt: Timestamp.fromDate(new Date('2025-01-01T10:00:00Z')),
        readBy: ['user-1'],
        clientMessageId: 'client-1',
      }),
    };

    mockOnSnapshot.mockImplementation((q, callback) => {
      snapshotCallback = callback;
      
      setTimeout(() => {
        callback({
          docs: [msg1], // Firestore desc order (only 1 message)
          forEach: (cb: any) => [msg1].forEach(cb),
          docChanges: () => [{ type: 'added', doc: msg1 }],
        });
      }, 0);
      
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useMessages('conn-123'));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    const msg2 = {
      id: 'msg-2',
      data: () => ({
        sender: 'user-1',
        text: 'Second',
        createdAt: Timestamp.fromDate(new Date('2025-01-01T10:01:00Z')),
        readBy: ['user-1'],
        clientMessageId: 'client-2',
      }),
    };

    const msg3 = {
      id: 'msg-3',
      data: () => ({
        sender: 'user-1',
        text: 'Third',
        createdAt: Timestamp.fromDate(new Date('2025-01-01T10:02:00Z')),
        readBy: ['user-1'],
        clientMessageId: 'client-3',
      }),
    };

    // Add msg2 - Firestore returns desc order [msg2, msg1]
    act(() => {
      snapshotCallback({
        docs: [msg2, msg1], // desc order
        forEach: (cb: any) => [msg2, msg1].forEach(cb),
        docChanges: () => [{ type: 'added', doc: msg2 }],
      });
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    // Then add msg3 - Firestore returns desc order [msg3, msg2, msg1]
    act(() => {
      snapshotCallback({
        docs: [msg3, msg2, msg1], // desc order
        forEach: (cb: any) => [msg3, msg2, msg1].forEach(cb),
        docChanges: () => [{ type: 'added', doc: msg3 }],
      });
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
    });

    // After reverse: oldest first
    expect(result.current.messages[0].text).toBe('First');
    expect(result.current.messages[1].text).toBe('Second');
    expect(result.current.messages[2].text).toBe('Third');
  });
});

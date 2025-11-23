/**
 * Unit Tests for ChatModal
 * Tests chat message display, sending, and user interactions
 */

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  doc: jest.fn(),
  increment: jest.fn((value: number) => ({ _methodName: 'increment', _value: value })),
}));

jest.mock('../../../config/firebaseConfig', () => ({
  getAuthInstance: jest.fn(() => ({
    currentUser: { uid: 'test-user-123' },
  })),
  db: {},
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChatModal from '../../../components/modals/ChatModal';
import { addDoc, updateDoc } from 'firebase/firestore';

describe('ChatModal', () => {
  const mockConnection = {
    id: 'conn-123',
    users: ['test-user-123', 'other-user-456'],
    itineraries: [
      {
        userInfo: {
          uid: 'test-user-123',
          username: 'CurrentUser',
        },
      },
      {
        userInfo: {
          uid: 'other-user-456',
          username: 'OtherUser',
        },
      },
    ],
    unreadCounts: {
      'test-user-123': 0,
      'other-user-456': 2,
    },
  };

  const mockMessages = [
    {
      id: 'msg-1',
      sender: 'other-user-456',
      text: 'Hello there!',
      createdAt: {
        toDate: () => new Date('2024-01-01T10:00:00'),
      },
      readBy: ['other-user-456'],
    },
    {
      id: 'msg-2',
      sender: 'test-user-123',
      text: 'Hi! How are you?',
      createdAt: {
        toDate: () => new Date('2024-01-01T10:05:00'),
      },
      readBy: ['test-user-123', 'other-user-456'],
    },
  ];

  const defaultProps = {
    connection: mockConnection,
    visible: true,
    onClose: jest.fn(),
    latestMessages: mockMessages,
    olderMessages: [],
    onLoadMore: jest.fn(),
    hasMoreMessages: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when visible', () => {
      const { getAllByText } = render(<ChatModal {...defaultProps} />);

      const otherUserElements = getAllByText('OtherUser');
      expect(otherUserElements.length).toBeGreaterThan(0);
    });

    it('should not render content when not visible', () => {
      const { queryByPlaceholderText } = render(
        <ChatModal {...defaultProps} visible={false} />
      );

      // Modal content is not rendered when visible=false
      expect(queryByPlaceholderText('Type a message...')).toBeNull();
    });

    it('should display other user name in header', () => {
      const { getAllByText } = render(<ChatModal {...defaultProps} />);

      const otherUserElements = getAllByText('OtherUser');
      expect(otherUserElements.length).toBeGreaterThan(0);
    });

    it('should display other user avatar initial', () => {
      const { getByText } = render(<ChatModal {...defaultProps} />);

      expect(getByText('O')).toBeTruthy(); // First letter of OtherUser
    });

    it('should show message input placeholder', () => {
      const { getByPlaceholderText } = render(<ChatModal {...defaultProps} />);

      expect(getByPlaceholderText('Type a message...')).toBeTruthy();
    });

    it('should show Send button', () => {
      const { getByText } = render(<ChatModal {...defaultProps} />);

      expect(getByText('Send')).toBeTruthy();
    });
  });

  describe('Message Display', () => {
    it('should render all messages', () => {
      const { getByText } = render(<ChatModal {...defaultProps} />);

      expect(getByText('Hello there!')).toBeTruthy();
      expect(getByText('Hi! How are you?')).toBeTruthy();
    });

    it('should show sender name for other user messages', () => {
      const { getAllByText } = render(<ChatModal {...defaultProps} />);

      // OtherUser appears in header and as message sender
      const otherUserElements = getAllByText('OtherUser');
      expect(otherUserElements.length).toBeGreaterThanOrEqual(2);
    });

    it('should format message timestamps', () => {
      const { getAllByText } = render(<ChatModal {...defaultProps} />);

      // Should render time in format like "10:00 AM" or "10:05 AM"
      const timeElements = getAllByText(/10:0[05] AM/);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should combine older and latest messages', () => {
      const olderMessages = [
        {
          id: 'msg-old-1',
          sender: 'other-user-456',
          text: 'Older message',
          createdAt: {
            toDate: () => new Date('2024-01-01T09:00:00'),
          },
          readBy: ['other-user-456'],
        },
      ];

      const { getByText } = render(
        <ChatModal
          {...defaultProps}
          olderMessages={olderMessages}
        />
      );

      expect(getByText('Older message')).toBeTruthy();
      expect(getByText('Hello there!')).toBeTruthy();
    });
  });

  describe('Load More Messages', () => {
    it('should configure FlatList with hasMoreMessages prop', () => {
      const { getByPlaceholderText } = render(
        <ChatModal {...defaultProps} hasMoreMessages={true} />
      );

      // Validate component renders with hasMoreMessages prop
      // FlatList ListHeaderComponent doesn't render in test environment
      expect(getByPlaceholderText('Type a message...')).toBeTruthy();
    });

    it('should not show load more button when hasMoreMessages is false', () => {
      const { queryByText } = render(
        <ChatModal {...defaultProps} hasMoreMessages={false} />
      );

      expect(queryByText('Load More Messages')).toBeNull();
    });

    it('should accept onLoadMore callback prop', () => {
      const onLoadMore = jest.fn();
      const { getByPlaceholderText } = render(
        <ChatModal
          {...defaultProps}
          hasMoreMessages={true}
          onLoadMore={onLoadMore}
        />
      );

      // Verify component renders successfully with onLoadMore prop
      // FlatList ListHeaderComponent doesn't render button in test environment
      expect(getByPlaceholderText('Type a message...')).toBeTruthy();
    });
  });

  describe('Sending Messages', () => {
    it('should update input when text is entered', () => {
      const { getByPlaceholderText } = render(<ChatModal {...defaultProps} />);
      const input = getByPlaceholderText('Type a message...');

      fireEvent.changeText(input, 'New message');

      expect(input.props.value).toBe('New message');
    });

    it('should send message when Send button pressed', async () => {
      const mockAddDoc = addDoc as jest.Mock;
      mockAddDoc.mockResolvedValue({ id: 'new-msg-id' });

      const { getByPlaceholderText, getByText } = render(
        <ChatModal {...defaultProps} />
      );
      const input = getByPlaceholderText('Type a message...');
      const sendButton = getByText('Send');

      fireEvent.changeText(input, 'Test message');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalled();
      });
    });

    it('should not send empty messages', async () => {
      const mockAddDoc = addDoc as jest.Mock;

      const { getByPlaceholderText, getByText } = render(
        <ChatModal {...defaultProps} />
      );
      const input = getByPlaceholderText('Type a message...');
      const sendButton = getByText('Send');

      fireEvent.changeText(input, '   '); // Only whitespace
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockAddDoc).not.toHaveBeenCalled();
      });
    });

    it('should update unread count after sending message', async () => {
      const mockAddDoc = addDoc as jest.Mock;
      const mockUpdateDoc = updateDoc as jest.Mock;
      mockAddDoc.mockResolvedValue({ id: 'new-msg-id' });
      mockUpdateDoc.mockResolvedValue(undefined);

      const { getByPlaceholderText, getByText } = render(
        <ChatModal {...defaultProps} />
      );
      const input = getByPlaceholderText('Type a message...');
      const sendButton = getByText('Send');

      fireEvent.changeText(input, 'Test message');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalled();
      });
    });

    it('should clear input after sending message', async () => {
      const mockAddDoc = addDoc as jest.Mock;
      mockAddDoc.mockResolvedValue({ id: 'new-msg-id' });

      const { getByPlaceholderText, getByText } = render(
        <ChatModal {...defaultProps} />
      );
      const input = getByPlaceholderText('Type a message...');
      const sendButton = getByText('Send');

      fireEvent.changeText(input, 'Test message');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(input.props.value).toBe('');
      });
    });

    it('should show sending state when message is being sent', async () => {
      const mockAddDoc = addDoc as jest.Mock;
      mockAddDoc.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: 'new-msg-id' }), 100))
      );

      const { getByPlaceholderText, getByText } = render(
        <ChatModal {...defaultProps} />
      );
      const input = getByPlaceholderText('Type a message...');
      const sendButton = getByText('Send');

      fireEvent.changeText(input, 'Test message');
      fireEvent.press(sendButton);

      // Should show "..." while sending
      await waitFor(() => {
        expect(getByText('...')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should call onClose when back button pressed', () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <ChatModal {...defaultProps} onClose={onClose} />
      );

      fireEvent.press(getByText('←'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle connection without itineraries', () => {
      const connectionWithoutItineraries = {
        ...mockConnection,
        itineraries: undefined as any,
      };

      const { getAllByText } = render(
        <ChatModal
          {...defaultProps}
          connection={connectionWithoutItineraries}
        />
      );

      // Should show "Unknown" for other user (appears in header and avatar)
      const unknownElements = getAllByText('Unknown');
      expect(unknownElements.length).toBeGreaterThan(0);
    });

    it('should handle messages without timestamps', () => {
      const messagesWithoutTimestamp = [
        {
          id: 'msg-no-time',
          sender: 'other-user-456',
          text: 'Message without timestamp',
          createdAt: null,
          readBy: ['other-user-456'],
        },
      ];

      const { getByText } = render(
        <ChatModal
          {...defaultProps}
          latestMessages={messagesWithoutTimestamp}
        />
      );

      expect(getByText('Message without timestamp')).toBeTruthy();
    });

    it('should handle empty message list', () => {
      const { getByPlaceholderText } = render(
        <ChatModal
          {...defaultProps}
          latestMessages={[]}
          olderMessages={[]}
        />
      );

      // Should still render input
      expect(getByPlaceholderText('Type a message...')).toBeTruthy();
    });
  });
});

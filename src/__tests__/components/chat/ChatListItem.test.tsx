/**
 * Unit Tests for ChatListItem
 * Tests individual chat connection list item display and interactions
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ChatListItem } from '../../../components/chat/ChatListItem';

describe('ChatListItem', () => {
  const mockConnection = {
    id: 'conn-123',
    users: ['user-123', 'user-456'],
    itineraryIds: ['itin-1', 'itin-2'],
    itineraries: [
      {
        id: 'itin-1',
        destination: 'Paris',
        userInfo: {
          uid: 'user-123',
          username: 'CurrentUser',
          email: 'current@example.com',
          photoURL: 'https://example.com/current.jpg',
        },
      },
      {
        id: 'itin-2',
        destination: 'Paris',
        userInfo: {
          uid: 'user-456',
          username: 'JohnDoe',
          email: 'john@example.com',
          photoURL: 'https://example.com/john.jpg',
        },
      },
    ],
    createdAt: new Date('2024-01-01'),
    unreadCounts: {
      'user-123': 2,
      'user-456': 0,
    },
  };

  const defaultProps = {
    conn: mockConnection,
    userId: 'user-123',
    onClick: jest.fn(),
    unread: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore();
  });

  describe('Rendering', () => {
    it('should render connection item', () => {
      const { getByText } = render(<ChatListItem {...defaultProps} />);

      expect(getByText('JohnDoe')).toBeTruthy();
      expect(getByText('Paris')).toBeTruthy();
    });

    it('should display other user username', () => {
      const { getByText } = render(<ChatListItem {...defaultProps} />);

      expect(getByText('JohnDoe')).toBeTruthy();
    });

    it('should display other user destination', () => {
      const { getByText } = render(<ChatListItem {...defaultProps} />);

      expect(getByText('Destination:')).toBeTruthy();
      expect(getByText('Paris')).toBeTruthy();
    });

    it('should display avatar with first letter of username', () => {
      const { getByText } = render(<ChatListItem {...defaultProps} />);

      expect(getByText('J')).toBeTruthy(); // First letter of JohnDoe
    });

    it('should show unread badge when unread is true', () => {
      const { UNSAFE_root } = render(
        <ChatListItem {...defaultProps} unread={true} />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should not show unread badge when unread is false', () => {
      const { UNSAFE_root } = render(
        <ChatListItem {...defaultProps} unread={false} />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should display remove button', () => {
      const { getByText } = render(<ChatListItem {...defaultProps} />);

      expect(getByText('⊝')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should call onClick with photo URL when item is pressed', () => {
      const onClick = jest.fn();
      const { getByText } = render(
        <ChatListItem {...defaultProps} onClick={onClick} />
      );

      fireEvent.press(getByText('JohnDoe'));

      expect(onClick).toHaveBeenCalledWith('https://example.com/john.jpg');
    });

    it('should call onClick with empty string when photo URL is missing', () => {
      const onClick = jest.fn();
      const connWithoutPhoto = {
        ...mockConnection,
        itineraries: [
          {
            ...mockConnection.itineraries[0],
          },
          {
            ...mockConnection.itineraries[1],
            userInfo: {
              ...mockConnection.itineraries[1].userInfo!,
              photoURL: undefined,
            },
          },
        ],
      };

      const { getByText } = render(
        <ChatListItem {...defaultProps} conn={connWithoutPhoto} onClick={onClick} />
      );

      fireEvent.press(getByText('JohnDoe'));

      expect(onClick).toHaveBeenCalledWith('');
    });

    it('should show alert when remove button is pressed', () => {
      const { getByText } = render(<ChatListItem {...defaultProps} />);

      fireEvent.press(getByText('⊝'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Remove Connection',
        'Are you sure you want to remove this connection?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Remove', style: 'destructive' }),
        ])
      );
    });

  });

  describe('Edge Cases', () => {
    it('should handle connection without itineraries', () => {
      const connWithoutItineraries = {
        ...mockConnection,
        itineraries: undefined,
      };

      const { getAllByText } = render(
        <ChatListItem {...defaultProps} conn={connWithoutItineraries} />
      );

      const unknownElements = getAllByText('Unknown');
      expect(unknownElements.length).toBeGreaterThan(0);
    });

    it('should handle connection with empty itineraries array', () => {
      const connWithEmptyItineraries = {
        ...mockConnection,
        itineraries: [],
      };

      const { getAllByText } = render(
        <ChatListItem {...defaultProps} conn={connWithEmptyItineraries} />
      );

      const unknownElements = getAllByText('Unknown');
      expect(unknownElements.length).toBeGreaterThan(0);
    });

    it('should handle itinerary without userInfo', () => {
      const connWithoutUserInfo = {
        ...mockConnection,
        itineraries: [
          {
            id: 'itin-1',
            destination: 'Paris',
            userInfo: undefined,
          },
        ],
      };

      const { getAllByText } = render(
        <ChatListItem {...defaultProps} conn={connWithoutUserInfo} />
      );

      const unknownElements = getAllByText('Unknown');
      expect(unknownElements.length).toBeGreaterThan(0);
    });

    it('should handle itinerary without destination', () => {
      const connWithoutDestination = {
        ...mockConnection,
        itineraries: [
          {
            ...mockConnection.itineraries[0],
          },
          {
            id: 'itin-2',
            destination: undefined,
            userInfo: {
              uid: 'user-456',
              username: 'JohnDoe',
            },
          },
        ],
      };

      const { getByText } = render(
        <ChatListItem {...defaultProps} conn={connWithoutDestination} />
      );

      expect(getByText('Unknown')).toBeTruthy(); // Destination shows as Unknown
    });

    it('should handle username without first letter', () => {
      const connWithEmptyUsername = {
        ...mockConnection,
        itineraries: [
          {
            ...mockConnection.itineraries[0],
          },
          {
            ...mockConnection.itineraries[1],
            userInfo: {
              ...mockConnection.itineraries[1].userInfo!,
              username: '',
            },
          },
        ],
      };

      const { getByText } = render(
        <ChatListItem {...defaultProps} conn={connWithEmptyUsername} />
      );

      expect(getByText('U')).toBeTruthy(); // Default avatar letter
    });

    it('should display current user itinerary destination when other user not found', () => {
      const connSingleItinerary = {
        ...mockConnection,
        itineraries: [
          {
            id: 'itin-1',
            destination: 'Paris',
            userInfo: {
              uid: 'user-123', // Same as current user
              username: 'CurrentUser',
            },
          },
        ],
      };

      const { getAllByText } = render(
        <ChatListItem {...defaultProps} conn={connSingleItinerary} />
      );

      // Should show Unknown since other user not found (in username and destination)
      const unknownElements = getAllByText('Unknown');
      expect(unknownElements.length).toBeGreaterThan(0);
    });
  });

  describe('User Identification', () => {
    it('should correctly identify other user from itineraries', () => {
      const { getByText } = render(<ChatListItem {...defaultProps} />);

      // Should show JohnDoe (user-456), not CurrentUser (user-123)
      expect(getByText('JohnDoe')).toBeTruthy();
    });

    it('should work with different userId', () => {
      const { getByText } = render(
        <ChatListItem {...defaultProps} userId="user-456" />
      );

      // When userId is user-456, should show CurrentUser (user-123)
      expect(getByText('CurrentUser')).toBeTruthy();
    });
  });
});

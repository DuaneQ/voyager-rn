/**
 * ChatConnectionItem Unit Tests
 * 
 * Test Plan:
 * 1. Renders connection with user info
 * 2. Displays other user's username
 * 3. Shows last message preview
 * 4. Displays unread count badge
 * 5. Shows relative timestamp
 * 6. Handles press event
 * 7. Shows default avatar when no photo
 * 8. Displays itinerary summary (destination and dates)
 */

// Mock the default profile image asset BEFORE any component imports
jest.mock('../../../assets/images/default-profile.png', () => 'default-profile.png', { virtual: true });

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Connection } from '../../../types/Connection';

// Mock Firestore Timestamp
const mockTimestamp = (date: Date) => ({
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
});

const Timestamp = {
  fromDate: (date: Date) => mockTimestamp(date),
  now: () => mockTimestamp(new Date()),
};

// Mock formatDate utility
jest.mock('../../../utils/formatDate', () => ({
  formatMessageTime: jest.fn((timestamp) => {
    if (!timestamp) return '';
    return '2h ago';
  }),
}));

// Import after mocks
const { ChatConnectionItem } = require('../../../components/chat/ChatConnectionItem');

describe('ChatConnectionItem', () => {
  const mockUserId = 'user-123';
  
  const baseMockConnection: Connection = {
    id: 'conn-1',
    users: ['user-123', 'user-456'],
    itineraryIds: ['itin-1', 'itin-2'],
    itineraries: [
      {
        id: 'itin-1',
        destination: 'Paris, France',
        startDate: '2025-06-01',
        endDate: '2025-06-10',
        userInfo: {
          uid: 'user-123',
          username: 'currentuser',
          email: 'current@example.com',
          gender: 'Female',
          dob: '1995-05-15',
          status: 'single',
          sexualOrientation: 'heterosexual',
        },
      },
      {
        id: 'itin-2',
        destination: 'Tokyo, Japan',
        startDate: '2025-07-15',
        endDate: '2025-07-25',
        userInfo: {
          uid: 'user-456',
          username: 'traveler1',
          email: 'traveler@example.com',
          gender: 'Male',
          dob: '1992-08-20',
          status: 'single',
          sexualOrientation: 'heterosexual',
        },
      },
    ],
    createdAt: Timestamp.fromDate(new Date('2025-01-01')),
    unreadCounts: {
      'user-123': 3,
    },
    lastMessagePreview: {
      text: 'Hey, when are you arriving?',
      sender: 'user-456',
      createdAt: Timestamp.fromDate(new Date()),
    },
  };

  it('should render connection with correct user info', () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ChatConnectionItem
        connection={baseMockConnection}
        userId={mockUserId}
        onPress={mockOnPress}
      />
    );

    expect(getByText('traveler1')).toBeTruthy();
  });

  it('should display last message preview', () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ChatConnectionItem
        connection={baseMockConnection}
        userId={mockUserId}
        onPress={mockOnPress}
      />
    );

    // Component shows sender + message
    expect(getByText(/Hey, when are you arriving?/)).toBeTruthy();
  });

  it('should display unread count badge when unread messages exist', () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ChatConnectionItem
        connection={baseMockConnection}
        userId={mockUserId}
        onPress={mockOnPress}
      />
    );

    expect(getByText('3')).toBeTruthy();
  });

  it('should not display unread badge when count is zero', () => {
    const connectionWithNoUnread: Connection = {
      ...baseMockConnection,
      unreadCounts: {
        'user-123': 0,
      },
    };

    const mockOnPress = jest.fn();

    const { queryByText } = render(
      <ChatConnectionItem
        connection={connectionWithNoUnread}
        userId={mockUserId}
        onPress={mockOnPress}
      />
    );

    // Should not show "0" badge
    expect(queryByText('0')).toBeNull();
  });

  it('should display relative timestamp', () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ChatConnectionItem
        connection={baseMockConnection}
        userId={mockUserId}
        onPress={mockOnPress}
      />
    );

    expect(getByText('2h ago')).toBeTruthy();
  });

  it('should call onPress when item is pressed', () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ChatConnectionItem
        connection={baseMockConnection}
        userId={mockUserId}
        onPress={mockOnPress}
      />
    );

    const item = getByText('traveler1');
    fireEvent.press(item.parent?.parent as any);

    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should display "Unknown" when no user info available', () => {
    const connectionWithoutUserInfo: Connection = {
      ...baseMockConnection,
      itineraries: [],
    };

    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ChatConnectionItem
        connection={connectionWithoutUserInfo}
        userId={mockUserId}
        onPress={mockOnPress}
      />
    );

    expect(getByText('Unknown')).toBeTruthy();
  });

  it('should display itinerary destination', () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ChatConnectionItem
        connection={baseMockConnection}
        userId={mockUserId}
        onPress={mockOnPress}
      />
    );

    // Should show the other user's destination
    expect(getByText(/Tokyo, Japan/)).toBeTruthy();
  });

  it('should handle connection without last message preview', () => {
    const connectionWithoutPreview: Connection = {
      ...baseMockConnection,
      lastMessagePreview: undefined,
    };

    const mockOnPress = jest.fn();

    const { queryByText } = render(
      <ChatConnectionItem
        connection={connectionWithoutPreview}
        userId={mockUserId}
        onPress={mockOnPress}
      />
    );

    // Should not crash, may show default text or nothing
    expect(queryByText('Hey, when are you arriving?')).toBeNull();
  });

  it('should handle group chat display (more than 2 users)', () => {
    const groupConnection: Connection = {
      ...baseMockConnection,
      users: ['user-123', 'user-456', 'user-789'],
      itineraries: [
        ...baseMockConnection.itineraries,
        {
          id: 'itin-3',
          destination: 'London, UK',
          startDate: '2025-08-01',
          endDate: '2025-08-10',
          userInfo: {
            uid: 'user-789',
            username: 'traveler2',
            email: 'traveler2@example.com',
            gender: 'Female',
            dob: '1993-03-10',
            status: 'single',
            sexualOrientation: 'heterosexual',
          },
        },
      ],
    };

    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ChatConnectionItem
        connection={groupConnection}
        userId={mockUserId}
        onPress={mockOnPress}
      />
    );

    // Should show multiple names for group chat
    expect(getByText(/traveler1/)).toBeTruthy();
  });
});

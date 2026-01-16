/**
 * ChatPage Unit Tests
 * 
 * Test Plan:
 * 1. Renders loading state correctly
 * 2. Renders empty state with helpful message when no connections
 * 3. Renders connections list with user info and photos
 * 4. Handles navigation to ChatThread when connection is tapped
 * 5. Handles error state and retry functionality
 * 6. Displays unread message counts correctly
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChatPage from '../../pages/ChatPage';
import { useConnections } from '../../hooks/chat/useConnections';
import { useRemoveConnection } from '../../hooks/useRemoveConnection';
import { useNavigation } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';

// Mock dependencies
jest.mock('../../hooks/chat/useConnections');
jest.mock('../../hooks/useRemoveConnection');
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn(),
  doc: jest.fn(),
  Timestamp: {
    fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 }),
  },
}));
jest.mock('../../config/firebaseConfig', () => ({
  db: {},
}));

const mockNavigate = jest.fn();
const mockRemoveConnection = jest.fn(() => Promise.resolve({ success: true }));
const mockUseConnections = useConnections as jest.MockedFunction<typeof useConnections>;
const mockUseRemoveConnection = useRemoveConnection as jest.MockedFunction<typeof useRemoveConnection>;
const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;

// Mock UserProfileContext
const mockUserProfile = {
  uid: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  photoURL: 'https://example.com/photo.jpg',
};

// Wrapper component with context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { UserProfileContext } = require('../../context/UserProfileContext');
  return (
    <UserProfileContext.Provider value={{ userProfile: mockUserProfile, setUserProfile: jest.fn(), isLoading: false }}>
      {children}
    </UserProfileContext.Provider>
  );
};

describe('ChatPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as any);
    mockUseRemoveConnection.mockReturnValue(mockRemoveConnection);
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading is true', () => {
      mockUseConnections.mockReturnValue({
        connections: [],
        loading: true,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
      });

      const { getByText } = render(<ChatPage />, { wrapper: TestWrapper });
      
      expect(getByText('Loading connections...')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should show empty state message when no connections exist', () => {
      mockUseConnections.mockReturnValue({
        connections: [],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
      });

      const { getByText } = render(<ChatPage />, { wrapper: TestWrapper });
      
      expect(getByText('No Connections Yet')).toBeTruthy();
      expect(getByText(/This is your chat page/i)).toBeTruthy();
      expect(getByText(/To match with travelers/i)).toBeTruthy();
      expect(getByText(/Stay Safe/i)).toBeTruthy();
    });
  });

  describe('Connections List', () => {
    it('should render connections list with user info', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          users: ['test-user-123', 'other-user-1'],
          itineraryIds: ['itin-1'],
          itineraries: [
            {
              id: 'itin-1',
              destination: 'Paris, France',
              startDate: '2025-06-01',
              endDate: '2025-06-10',
              userInfo: {
                uid: 'other-user-1',
                username: 'traveler1',
                email: 'traveler1@example.com',
                gender: 'Female',
                dob: '1995-05-15',
                status: 'single',
                sexualOrientation: 'heterosexual',
              },
            },
          ],
          createdAt: Timestamp.fromDate(new Date('2025-01-01')),
          unreadCounts: {
            'test-user-123': 3,
          },
        },
        {
          id: 'conn-2',
          users: ['test-user-123', 'other-user-2'],
          itineraryIds: ['itin-2'],
          itineraries: [
            {
              id: 'itin-2',
              destination: 'Tokyo, Japan',
              startDate: '2025-07-15',
              endDate: '2025-07-25',
              userInfo: {
                uid: 'other-user-2',
                username: 'traveler2',
                email: 'traveler2@example.com',
                gender: 'Male',
                dob: '1992-08-20',
                status: 'single',
                sexualOrientation: 'heterosexual',
              },
            },
          ],
          createdAt: Timestamp.fromDate(new Date('2025-01-02')),
          unreadCounts: {
            'test-user-123': 0,
          },
        },
      ];

      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
      });

      const { getByText, queryByText } = render(<ChatPage />, { wrapper: TestWrapper });
      
      // Check first connection
      expect(getByText('traveler1')).toBeTruthy();
      expect(getByText('Paris, France')).toBeTruthy();
      // Date formatting depends on timezone - accept either May 31/Jun 1 and Jun 9/10
      expect(getByText(/(May 31|Jun 1), 2025.*(Jun 9|Jun 10), 2025/)).toBeTruthy();
      expect(getByText('3')).toBeTruthy(); // Unread count
      
      // Check second connection
      expect(getByText('traveler2')).toBeTruthy();
      expect(getByText('Tokyo, Japan')).toBeTruthy();
      // Date formatting depends on timezone - accept either Jul 14/15 and Jul 24/25
      expect(getByText(/(Jul 14|Jul 15), 2025.*(Jul 24|Jul 25), 2025/)).toBeTruthy();
      
      // No unread badge for second connection
      expect(queryByText('0')).toBeFalsy();
    });

    it('should navigate to ChatThread when connection is tapped', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          users: ['test-user-123', 'other-user-1'],
          itineraryIds: ['itin-1'],
          itineraries: [
            {
              id: 'itin-1',
              destination: 'Paris, France',
              startDate: '2025-06-01',
              endDate: '2025-06-10',
              userInfo: {
                uid: 'other-user-1',
                username: 'traveler1',
                email: 'traveler1@example.com',
                gender: 'Female',
                dob: '1995-05-15',
                status: 'single',
                sexualOrientation: 'heterosexual',
              },
            },
          ],
          createdAt: Timestamp.fromDate(new Date('2025-01-01')),
          unreadCounts: {},
        },
      ];

      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
      });

      const { getByText } = render(<ChatPage />, { wrapper: TestWrapper });
      
      const connectionItem = getByText('traveler1');
      fireEvent.press(connectionItem.parent?.parent as any);
      
      expect(mockNavigate).toHaveBeenCalledWith('ChatThread', {
        connectionId: 'conn-1',
        otherUserName: 'traveler1',
      });
    });
  });

  describe('Error State', () => {
    it('should show error message and retry button when error occurs', () => {
      const mockError = new Error('Failed to load connections');
      const mockRefresh = jest.fn();

      mockUseConnections.mockReturnValue({
        connections: [],
        loading: false,
        error: mockError,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: mockRefresh,
      });

      const { getByText } = render(<ChatPage />, { wrapper: TestWrapper });
      
      expect(getByText('Error loading connections')).toBeTruthy();
      expect(getByText('Failed to load connections')).toBeTruthy();
      
      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);
      
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('User Info Display', () => {
    it('should display username when available', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          users: ['test-user-123', 'other-user-1'],
          itineraryIds: ['itin-1'],
          itineraries: [
            {
              id: 'itin-1',
              destination: 'Paris, France',
              startDate: '2025-06-01',
              endDate: '2025-06-10',
              userInfo: {
                uid: 'other-user-1',
                username: 'traveler1',
                email: 'traveler1@example.com',
                gender: 'Female',
                dob: '1995-05-15',
                status: 'single',
                sexualOrientation: 'heterosexual',
              },
            },
          ],
          createdAt: Timestamp.fromDate(new Date('2025-01-01')),
          unreadCounts: {},
        },
      ];

      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
      });

      const { getByText } = render(<ChatPage />, { wrapper: TestWrapper });
      expect(getByText('traveler1')).toBeTruthy();
    });

    it('should fallback to email when username is not available', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          users: ['test-user-123', 'other-user-1'],
          itineraryIds: ['itin-1'],
          itineraries: [
            {
              id: 'itin-1',
              destination: 'Paris, France',
              startDate: '2025-06-01',
              endDate: '2025-06-10',
              userInfo: {
                uid: 'other-user-1',
                username: '',
                email: 'noname@example.com',
                gender: 'Female',
                dob: '1995-05-15',
                status: 'single',
                sexualOrientation: 'heterosexual',
              },
            },
          ],
          createdAt: Timestamp.fromDate(new Date('2025-01-01')),
          unreadCounts: {},
        },
      ];

      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
      });

      const { getByText } = render(<ChatPage />, { wrapper: TestWrapper });
      expect(getByText('noname@example.com')).toBeTruthy();
    });

    it('should show "Unknown User" when no user info is available', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          users: ['test-user-123', 'other-user-1'],
          itineraryIds: ['itin-1'],
          itineraries: [
            {
              id: 'itin-1',
              destination: 'Paris, France',
              startDate: '2025-06-01',
              endDate: '2025-06-10',
            },
          ],
          createdAt: Timestamp.fromDate(new Date('2025-01-01')),
          unreadCounts: {},
        },
      ];

      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
      });

      const { getByText } = render(<ChatPage />, { wrapper: TestWrapper });
      expect(getByText('Unknown User')).toBeTruthy();
    });
  });

  describe('Refresh Functionality', () => {
    it('should call refresh when pull-to-refresh is triggered', async () => {
      const mockRefresh = jest.fn();
      const mockConnections = [
        {
          id: 'conn-1',
          users: ['test-user-123', 'other-user-1'],
          itineraryIds: ['itin-1'],
          itineraries: [
            {
              id: 'itin-1',
              destination: 'Paris, France',
              startDate: '2025-06-01',
              endDate: '2025-06-10',
              userInfo: {
                uid: 'other-user-1',
                username: 'traveler1',
                email: 'traveler1@example.com',
                gender: 'Female',
                dob: '1995-05-15',
                status: 'single',
                sexualOrientation: 'heterosexual',
              },
            },
          ],
          createdAt: Timestamp.fromDate(new Date('2025-01-01')),
          unreadCounts: {},
        },
      ];

      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: mockRefresh,
      });

      const { getByTestId, UNSAFE_getByType } = render(<ChatPage />, { wrapper: TestWrapper });
      
      // Find FlatList and trigger refresh
      const flatList = UNSAFE_getByType(require('react-native').FlatList);
      await fireEvent(flatList, 'refresh');
      
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});

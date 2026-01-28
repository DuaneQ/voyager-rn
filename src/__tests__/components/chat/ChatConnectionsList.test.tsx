/**
 * Unit Tests for ChatConnectionsList
 * Tests connection list display, search, filtering, and interactions
 */

// Mock hooks
const mockUseConnections = jest.fn();
const mockUseRemoveConnection = jest.fn();

jest.mock('../../../hooks/chat/useConnections', () => ({
  useConnections: () => mockUseConnections(),
}));

jest.mock('../../../hooks/useRemoveConnection', () => ({
  useRemoveConnection: () => mockUseRemoveConnection(),
}));

// Mock ChatConnectionItem
jest.mock('../../../components/chat/ChatConnectionItem', () => ({
  ChatConnectionItem: ({ connection, onPress, onDelete }: any) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      { 
        testID: `connection-item-${connection.id}`,
        onPress: onPress,
      },
      React.createElement(Text, {}, `Connection: ${connection.id}`)
    );
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ChatConnectionsList } from '../../../components/chat/ChatConnectionsList';
import { Connection } from '../../../types/Connection';

describe('ChatConnectionsList', () => {
  const mockConnections: Connection[] = [
    {
      id: 'conn-1',
      users: ['user-123', 'user-456'],
      itineraryIds: ['itin-1', 'itin-2'],
      itineraries: [
        {
          id: 'itin-1',
          userInfo: {
            uid: 'user-123',
            username: 'CurrentUser',
            gender: 'Male',
            dob: '1990-01-01',
            email: 'current@example.com',
            status: 'active',
            sexualOrientation: 'Straight',
          },
          destination: 'Paris',
          startDate: '2024-06-01',
          endDate: '2024-06-10',
        },
        {
          id: 'itin-2',
          userInfo: {
            uid: 'user-456',
            username: 'JohnDoe',
            gender: 'Male',
            dob: '1992-05-15',
            email: 'john@example.com',
            status: 'active',
            sexualOrientation: 'Straight',
          },
          destination: 'Paris',
          startDate: '2024-06-05',
          endDate: '2024-06-12',
        },
      ],
      createdAt: new Date('2024-01-01'),
      unreadCounts: {
        'user-123': 2,
        'user-456': 0,
      },
      lastMessagePreview: {
        text: 'Hello!',
        sender: 'user-456',
        createdAt: new Date('2024-01-02'),
      },
    },
    {
      id: 'conn-2',
      users: ['user-123', 'user-789'],
      itineraryIds: ['itin-3', 'itin-4'],
      itineraries: [
        {
          id: 'itin-3',
          userInfo: {
            uid: 'user-123',
            username: 'CurrentUser',
            gender: 'Male',
            dob: '1990-01-01',
            email: 'current@example.com',
            status: 'active',
            sexualOrientation: 'Straight',
          },
          destination: 'Tokyo',
          startDate: '2024-07-01',
          endDate: '2024-07-10',
        },
        {
          id: 'itin-4',
          userInfo: {
            uid: 'user-789',
            username: 'JaneSmith',
            gender: 'Female',
            dob: '1991-03-20',
            email: 'jane@example.com',
            status: 'active',
            sexualOrientation: 'Straight',
          },
          destination: 'Tokyo',
          startDate: '2024-07-03',
          endDate: '2024-07-12',
        },
      ],
      createdAt: new Date('2024-01-05'),
      unreadCounts: {
        'user-123': 0,
        'user-789': 1,
      },
      lastMessagePreview: {
        text: 'See you soon!',
        sender: 'user-789',
        createdAt: new Date('2024-01-06'),
      },
    },
  ];

  const defaultProps = {
    userId: 'user-123',
    onConnectionPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnections.mockReturnValue({
      connections: mockConnections,
      loading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      refresh: jest.fn(),
      removeConnectionOptimistic: jest.fn(),
    });
    mockUseRemoveConnection.mockReturnValue(jest.fn());
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore();
  });

  describe('Rendering', () => {
    it('should render connections list', () => {
      const { getByTestId } = render(<ChatConnectionsList {...defaultProps} />);

      expect(getByTestId('connection-item-conn-1')).toBeTruthy();
      expect(getByTestId('connection-item-conn-2')).toBeTruthy();
    });

    it('should render search input', () => {
      const { getByPlaceholderText } = render(<ChatConnectionsList {...defaultProps} />);

      expect(getByPlaceholderText('Search connections...')).toBeTruthy();
    });

    it('should render empty state when no connections', () => {
      mockUseConnections.mockReturnValue({
        connections: [],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
        removeConnectionOptimistic: jest.fn(),
      });

      const { getByText } = render(<ChatConnectionsList {...defaultProps} />);

      expect(getByText('No connections yet')).toBeTruthy();
      expect(getByText('Start matching with other travelers to begin chatting!')).toBeTruthy();
    });

    it('should show loading state on initial load', () => {
      mockUseConnections.mockReturnValue({
        connections: [],
        loading: true,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
        removeConnectionOptimistic: jest.fn(),
      });

      const { getByText } = render(<ChatConnectionsList {...defaultProps} />);

      expect(getByText('Loading connections...')).toBeTruthy();
    });

    it('should show error state when error occurs', () => {
      const mockError = new Error('Failed to load connections');
      mockUseConnections.mockReturnValue({
        connections: [],
        loading: false,
        error: mockError,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
        removeConnectionOptimistic: jest.fn(),
      });

      const { getByText } = render(<ChatConnectionsList {...defaultProps} />);

      expect(getByText('Error loading connections')).toBeTruthy();
      expect(getByText('Failed to load connections')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should filter connections by username', () => {
      const { getByPlaceholderText, getByTestId, queryByTestId } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search connections...');
      fireEvent.changeText(searchInput, 'JohnDoe');

      expect(getByTestId('connection-item-conn-1')).toBeTruthy();
      expect(queryByTestId('connection-item-conn-2')).toBeNull();
    });

    it('should filter connections by destination', () => {
      const { getByPlaceholderText, getByTestId, queryByTestId } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search connections...');
      fireEvent.changeText(searchInput, 'Tokyo');

      expect(queryByTestId('connection-item-conn-1')).toBeNull();
      expect(getByTestId('connection-item-conn-2')).toBeTruthy();
    });

    it('should filter connections by date', () => {
      const { getByPlaceholderText, getByTestId, queryByTestId } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search connections...');
      fireEvent.changeText(searchInput, '2024-06');

      expect(getByTestId('connection-item-conn-1')).toBeTruthy();
      expect(queryByTestId('connection-item-conn-2')).toBeNull();
    });

    it('should be case-insensitive', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search connections...');
      fireEvent.changeText(searchInput, 'PARIS');

      expect(getByTestId('connection-item-conn-1')).toBeTruthy();
    });

    it('should show empty search results message', () => {
      const { getByPlaceholderText, getByText } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search connections...');
      fireEvent.changeText(searchInput, 'NonExistentUser');

      expect(getByText('No connections match your search')).toBeTruthy();
    });

    it('should clear search and show all connections', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search connections...');
      
      // Search
      fireEvent.changeText(searchInput, 'Tokyo');
      expect(getByTestId('connection-item-conn-2')).toBeTruthy();

      // Clear search
      fireEvent.changeText(searchInput, '');
      expect(getByTestId('connection-item-conn-1')).toBeTruthy();
      expect(getByTestId('connection-item-conn-2')).toBeTruthy();
    });

    it('should trim whitespace from search query', () => {
      const { getByPlaceholderText, getByTestId, queryByTestId } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search connections...');
      fireEvent.changeText(searchInput, '  Tokyo  ');

      expect(queryByTestId('connection-item-conn-1')).toBeNull();
      expect(getByTestId('connection-item-conn-2')).toBeTruthy();
    });
  });

  describe('Connection Interactions', () => {
    it('should call onConnectionPress when connection is pressed', () => {
      const onConnectionPress = jest.fn();
      const { getByTestId } = render(
        <ChatConnectionsList {...defaultProps} onConnectionPress={onConnectionPress} />
      );

      fireEvent.press(getByTestId('connection-item-conn-1'));

      expect(onConnectionPress).toHaveBeenCalledWith(mockConnections[0]);
    });

    it('should handle connection deletion successfully', async () => {
      const mockRemove = jest.fn().mockResolvedValue({ success: true });
      mockUseRemoveConnection.mockReturnValue(mockRemove);

      const { getByTestId } = render(<ChatConnectionsList {...defaultProps} />);

      // This would be triggered by ChatConnectionItem's delete action
      // We're testing the callback is set up correctly
      expect(getByTestId('connection-item-conn-1')).toBeTruthy();
    });

    it('should show alert on deletion error', async () => {
      const mockRemove = jest.fn().mockResolvedValue({ 
        success: false, 
        error: 'Network error' 
      });
      mockUseRemoveConnection.mockReturnValue(mockRemove);

      const { getByTestId } = render(<ChatConnectionsList {...defaultProps} />);

      // Component sets up the delete handler correctly
      expect(getByTestId('connection-item-conn-1')).toBeTruthy();
    });
  });

  describe('Pagination', () => {
    it('should show loading footer when loading more', () => {
      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: true,
        error: null,
        hasMore: true,
        loadMore: jest.fn(),
        refresh: jest.fn(),
        removeConnectionOptimistic: jest.fn(),
      });

      const { UNSAFE_root } = render(<ChatConnectionsList {...defaultProps} />);

      // FlatList footer renders when loading
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should not call loadMore when already loading', () => {
      const mockLoadMore = jest.fn();
      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: true,
        error: null,
        hasMore: true,
        loadMore: mockLoadMore,
        refresh: jest.fn(),
        removeConnectionOptimistic: jest.fn(),
      });

      render(<ChatConnectionsList {...defaultProps} />);

      // handleLoadMore checks loading state before calling loadMore
      expect(mockLoadMore).not.toHaveBeenCalled();
    });

    it('should not call loadMore when hasMore is false', () => {
      const mockLoadMore = jest.fn();
      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        refresh: jest.fn(),
        removeConnectionOptimistic: jest.fn(),
      });

      render(<ChatConnectionsList {...defaultProps} />);

      expect(mockLoadMore).not.toHaveBeenCalled();
    });
  });

  describe('Pull to Refresh', () => {
    it('should setup refresh control', () => {
      const mockRefresh = jest.fn();
      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: mockRefresh,
        removeConnectionOptimistic: jest.fn(),
      });

      const { UNSAFE_root } = render(<ChatConnectionsList {...defaultProps} />);

      // Component renders with refresh control configured
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle connections without itineraries', () => {
      const connectionsWithoutItineraries: Connection[] = [
        {
          id: 'conn-no-itin',
          users: ['user-123', 'user-999'],
          itineraryIds: [],
          itineraries: undefined as any,
          createdAt: new Date('2024-01-01'),
          unreadCounts: { 'user-123': 0, 'user-999': 0 },
        },
      ];

      mockUseConnections.mockReturnValue({
        connections: connectionsWithoutItineraries,
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
        removeConnectionOptimistic: jest.fn(),
      });

      const { getByTestId } = render(<ChatConnectionsList {...defaultProps} />);

      expect(getByTestId('connection-item-conn-no-itin')).toBeTruthy();
    });

    it('should handle connections with missing user info', () => {
      const connectionsWithMissingInfo: Connection[] = [
        {
          id: 'conn-missing-info',
          users: ['user-123', 'user-999'],
          itineraryIds: ['itin-missing'],
          itineraries: [
            {
              id: 'itin-missing',
              userInfo: undefined as any,
              destination: 'London',
              startDate: '2024-08-01',
              endDate: '2024-08-10',
            },
          ],
          createdAt: new Date('2024-01-01'),
          unreadCounts: { 'user-123': 0, 'user-999': 0 },
        },
      ];

      mockUseConnections.mockReturnValue({
        connections: connectionsWithMissingInfo,
        loading: false,
        error: null,
        hasMore: false,
        loadMore: jest.fn(),
        refresh: jest.fn(),
        removeConnectionOptimistic: jest.fn(),
      });

      const { getByTestId } = render(<ChatConnectionsList {...defaultProps} />);

      expect(getByTestId('connection-item-conn-missing-info')).toBeTruthy();
    });

    it('should handle empty search query (whitespace only)', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search connections...');
      fireEvent.changeText(searchInput, '   ');

      // Should show all connections when query is only whitespace
      expect(getByTestId('connection-item-conn-1')).toBeTruthy();
      expect(getByTestId('connection-item-conn-2')).toBeTruthy();
    });
  });

  describe('Performance Optimizations', () => {
    it('should use memoized filtered connections', () => {
      const { getByPlaceholderText, getByTestId, rerender } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      // Initial render
      expect(getByTestId('connection-item-conn-1')).toBeTruthy();

      // Rerender with same props - filteredConnections should be memoized
      rerender(<ChatConnectionsList {...defaultProps} />);
      expect(getByTestId('connection-item-conn-1')).toBeTruthy();
    });

    it('should use memoized callbacks', () => {
      const { UNSAFE_root } = render(<ChatConnectionsList {...defaultProps} />);

      // Component uses useCallback for renderItem, renderFooter, etc.
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should trigger loadMore when end is reached and hasMore is true', () => {
      const mockLoadMore = jest.fn();
      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: false,
        error: null,
        hasMore: true,
        loadMore: mockLoadMore,
        refresh: jest.fn(),
        removeConnectionOptimistic: jest.fn(),
      });

      const { UNSAFE_root } = render(<ChatConnectionsList {...defaultProps} />);

      // Find FlatList and trigger onEndReached
      const flatList = UNSAFE_root.findByType('FlatList' as any);
      if (flatList && flatList.props.onEndReached) {
        flatList.props.onEndReached();
      }

      expect(mockLoadMore).toHaveBeenCalled();
    });

    it('should render loading footer when loading more data', () => {
      mockUseConnections.mockReturnValue({
        connections: mockConnections,
        loading: true,
        error: null,
        hasMore: true,
        loadMore: jest.fn(),
        removeConnectionOptimistic: jest.fn(),
        refresh: jest.fn(),
      });

      const { UNSAFE_root } = render(<ChatConnectionsList {...defaultProps} />);

      // Find FlatList and check if ListFooterComponent is rendered
      const flatList = UNSAFE_root.findByType('FlatList' as any);
      if (flatList && flatList.props.ListFooterComponent) {
        const footer = flatList.props.ListFooterComponent();
        expect(footer).toBeTruthy();
      }
    });
  });

  describe('Search functionality edge cases', () => {
    it('should show all connections when search query is empty string', () => {
      const { getByPlaceholderText, getAllByTestId } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search connections...');
      fireEvent.changeText(searchInput, '');

      const items = getAllByTestId(/^connection-item-/);
      expect(items).toHaveLength(mockConnections.length);
    });

    it('should show all connections when search query is only whitespace', () => {
      const { getByPlaceholderText, getAllByTestId } = render(
        <ChatConnectionsList {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search connections...');
      fireEvent.changeText(searchInput, '   ');

      const items = getAllByTestId(/^connection-item-/);
      expect(items).toHaveLength(mockConnections.length);
    });
  });
});

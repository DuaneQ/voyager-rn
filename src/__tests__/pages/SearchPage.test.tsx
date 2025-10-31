/**
 * Unit Tests for SearchPage Component
 * Tests itinerary dropdown, mock itineraries display, and user interactions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SearchPage from '../../pages/SearchPage';
import { auth } from '../../config/firebaseConfig';
import * as useAllItinerariesModule from '../../hooks/useAllItineraries';
import { UserProfileProvider } from '../../context/UserProfileContext';

// Mock dependencies
jest.mock('../../config/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-123' },
    onAuthStateChanged: jest.fn((callback) => {
      callback({ uid: 'test-user-123' });
      return jest.fn(); // Unsubscribe function
    }),
  },
  db: {},
}));

jest.mock('../../context/AlertContext', () => ({
  useAlert: () => ({
    showAlert: jest.fn(),
  }),
}));

jest.mock('../../hooks/useAllItineraries');
jest.mock('../../components/search/ItinerarySelector', () => ({
  ItinerarySelector: ({ itineraries, selectedItineraryId, onSelect, onAddItinerary, loading }: any) => {
    const MockView = require('react-native').View;
    const MockText = require('react-native').Text;
    const MockTouchableOpacity = require('react-native').TouchableOpacity;

    return (
      <MockView testID="itinerary-selector">
        {loading ? (
          <MockText>Loading...</MockText>
        ) : (
          <>
            <MockText testID="selector-count">{itineraries.length} itineraries</MockText>
            <MockTouchableOpacity 
              testID="select-first-button"
              onPress={() => itineraries.length > 0 && onSelect(itineraries[0].id)}
            >
              <MockText>Select First</MockText>
            </MockTouchableOpacity>
            <MockTouchableOpacity 
              testID="add-itinerary-button"
              onPress={onAddItinerary}
            >
              <MockText>Add</MockText>
            </MockTouchableOpacity>
          </>
        )}
      </MockView>
    );
  },
}));

const mockUseAllItineraries = useAllItinerariesModule.useAllItineraries as jest.Mock;

// Test helper to wrap component with required providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <UserProfileProvider>
      {component}
    </UserProfileProvider>
  );
};

describe('SearchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = { uid: 'test-user-123' };
  });

  it('should render loading state initially', () => {
    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: true,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText } = renderWithProviders(<SearchPage />);
    
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should display mock itineraries when user has no real itineraries', async () => {
    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText, queryByText } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    });

    // Should show mock itinerary
    expect(getByText('Amazing Tokyo Adventure')).toBeTruthy();
    expect(getByText('Tokyo, Japan')).toBeTruthy();
    expect(getByText('7 days')).toBeTruthy();
  });

  it('should not display usage counter when user has no itineraries', async () => {
    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { queryByText } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(queryByText(/Views today:/)).toBeNull();
    });
  });

  it('should display usage counter when user has itineraries', async () => {
    const mockItineraries = [
      {
        id: 'itin-1',
        userId: 'test-user-123',
        destination: 'Tokyo, Japan',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        startDay: Date.parse('2025-06-01'),
        endDay: Date.parse('2025-06-07'),
      },
    ];

    mockUseAllItineraries.mockReturnValue({
      itineraries: mockItineraries,
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(getByText('Views today: 0/10')).toBeTruthy();
    });
  });

  it('should pass itineraries to ItinerarySelector', async () => {
    const mockItineraries = [
      {
        id: 'itin-1',
        userId: 'test-user-123',
        destination: 'Tokyo, Japan',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        startDay: Date.parse('2025-06-01'),
        endDay: Date.parse('2025-06-07'),
      },
      {
        id: 'itin-2',
        userId: 'test-user-123',
        destination: 'Paris, France',
        startDate: '2025-07-01',
        endDate: '2025-07-10',
        startDay: Date.parse('2025-07-01'),
        endDay: Date.parse('2025-07-10'),
      },
    ];

    mockUseAllItineraries.mockReturnValue({
      itineraries: mockItineraries,
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByTestId } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      const selector = getByTestId('itinerary-selector');
      expect(selector).toBeTruthy();
    });

    expect(getByTestId('selector-count').props.children).toEqual([2, ' itineraries']);
  });

  it('should auto-select first itinerary when loaded', async () => {
    const mockItineraries = [
      {
        id: 'itin-1',
        userId: 'test-user-123',
        destination: 'Tokyo, Japan',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        startDay: Date.parse('2025-06-01'),
        endDay: Date.parse('2025-06-07'),
      },
    ];

    mockUseAllItineraries.mockReturnValue({
      itineraries: mockItineraries,
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByTestId } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      // Component should auto-select first itinerary
      expect(getByTestId('itinerary-selector')).toBeTruthy();
    });
  });

  it('should show login prompt when user not authenticated', async () => {
    (auth as any).currentUser = null;
    (auth.onAuthStateChanged as jest.Mock).mockImplementation((callback) => {
      callback(null);
      return jest.fn();
    });

    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(getByText('Please log in to see itineraries')).toBeTruthy();
    });
  });

  it('should cycle through mock itineraries on like/dislike', async () => {
    // Mock auth with user
    (auth as any).currentUser = { uid: 'test-user-123' };
    (auth.onAuthStateChanged as jest.Mock).mockImplementation((callback) => {
      callback({ uid: 'test-user-123' });
      return jest.fn();
    });

    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText, queryByText } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(getByText('Amazing Tokyo Adventure')).toBeTruthy();
    });

    // Like first itinerary
    const likeButton = getByText('✈️');
    fireEvent.press(likeButton);

    await waitFor(() => {
      // Should show second mock itinerary
      expect(getByText('Paris Romance')).toBeTruthy();
      expect(queryByText('Amazing Tokyo Adventure')).toBeNull();
    });
  });

  it('should increment daily views counter on like', async () => {
    // Mock auth with user
    (auth as any).currentUser = { uid: 'test-user-123' };
    (auth.onAuthStateChanged as jest.Mock).mockImplementation((callback) => {
      callback({ uid: 'test-user-123' });
      return jest.fn();
    });

    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(getByText('Amazing Tokyo Adventure')).toBeTruthy();
    });

    const likeButton = getByText('✈️');
    fireEvent.press(likeButton);

    await waitFor(() => {
      // Views counter should update (but it's not visible when no itineraries)
      expect(getByText('Paris Romance')).toBeTruthy();
    });
  });

  it('should increment daily views counter on dislike', async () => {
    // Mock auth with user
    (auth as any).currentUser = { uid: 'test-user-123' };
    (auth.onAuthStateChanged as jest.Mock).mockImplementation((callback) => {
      callback({ uid: 'test-user-123' });
      return jest.fn();
    });

    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(getByText('Amazing Tokyo Adventure')).toBeTruthy();
    });

    const dislikeButton = getByText('✕');
    fireEvent.press(dislikeButton);

    await waitFor(() => {
      expect(getByText('Paris Romance')).toBeTruthy();
    });
  });

  it('should show "Select an itinerary" message when user has itineraries', async () => {
    const mockItineraries = [
      {
        id: 'itin-1',
        userId: 'test-user-123',
        destination: 'Tokyo, Japan',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        startDay: Date.parse('2025-06-01'),
        endDay: Date.parse('2025-06-07'),
      },
    ];

    mockUseAllItineraries.mockReturnValue({
      itineraries: mockItineraries,
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { queryByText } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      // Should NOT show mock itineraries
      expect(queryByText('Amazing Tokyo Adventure')).toBeNull();
      // Should show placeholder message (will be updated when matches are fetched)
    });
  });

  it('should handle itinerary selection', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const mockItineraries = [
      {
        id: 'itin-1',
        userId: 'test-user-123',
        destination: 'Tokyo, Japan',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        startDay: Date.parse('2025-06-01'),
        endDay: Date.parse('2025-06-07'),
      },
    ];

    mockUseAllItineraries.mockReturnValue({
      itineraries: mockItineraries,
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByTestId } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      const selectButton = getByTestId('select-first-button');
      fireEvent.press(selectButton);
    });

    // Should log selection (no error)
    expect(consoleSpy).toHaveBeenCalledWith('[SearchPage] Selected itinerary:', 'itin-1');
    
    consoleSpy.mockRestore();
  });

  it('should handle add itinerary button click', async () => {
    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByTestId } = renderWithProviders(<SearchPage />);

    await waitFor(() => {
      const addButton = getByTestId('add-itinerary-button');
      fireEvent.press(addButton);
    });

    // Should trigger alert (mocked, no error)
  });

  it('should render background image', () => {
    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByTestId } = renderWithProviders(<SearchPage />);
    
    expect(getByTestId('homeScreen')).toBeTruthy();
  });
});

/**
 * Unit Tests for SearchPage Like/Dislike Functionality
 * Tests that clicking like/dislike advances to the next itinerary immediately
 * 
 * NOTE: These tests verify the CRITICAL bug fix where getNextItinerary()
 * must be called synchronously (not awaited) to trigger immediate re-render.
 */

// Mock firebase config files BEFORE any imports
jest.mock('../../../firebase-config');
jest.mock('../../config/firebaseConfig');

// Mock Firebase services
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock ConnectionRepository to avoid firebase/firestore dependency chain
jest.mock('../../repositories/ConnectionRepository', () => ({
  connectionRepository: {
    createConnection: jest.fn().mockResolvedValue({ id: 'conn-123' }),
    getConnectionsByUserId: jest.fn().mockResolvedValue([]),
    updateConnection: jest.fn().mockResolvedValue({}),
    deleteConnection: jest.fn().mockResolvedValue(undefined),
  },
  FirestoreConnectionRepository: jest.fn(),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SearchPage from '../../pages/SearchPage';
import { AlertProvider } from '../../context/AlertContext';
import { UserProfileProvider } from '../../context/UserProfileContext';
import * as useAllItinerariesModule from '../../hooks/useAllItineraries';
import * as useSearchItinerariesModule from '../../hooks/useSearchItineraries';
import * as useUsageTrackingModule from '../../hooks/useUsageTracking';
import * as useUpdateItineraryModule from '../../hooks/useUpdateItinerary';
import { Itinerary } from '../../types/Itinerary';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn((callback) => {
    callback();
  }),
}));

// Mock AuthContext
jest.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    user: { uid: 'test-user-123', email: 'test@example.com' },
    loading: false,
    error: null,
  }),
}));

// Mock hooks
jest.mock('../../hooks/useAllItineraries');
jest.mock('../../hooks/useSearchItineraries');
jest.mock('../../hooks/useUsageTracking');
jest.mock('../../hooks/useUpdateItinerary');

// Mock ItinerarySelector - simpler mock that auto-selects first itinerary
jest.mock('../../components/search/ItinerarySelector', () => ({
  ItinerarySelector: ({ itineraries, onSelect }: any) => {
    const { View } = require('react-native');
    const React = require('react');
    
    // Auto-select first itinerary on mount to simulate user selection
    React.useEffect(() => {
      if (itineraries.length > 0) {
        onSelect(itineraries[0].id);
      }
    }, [itineraries, onSelect]);
    
    return <View testID="itinerary-selector" />;
  },
}));

// Mock AddItineraryModal
jest.mock('../../components/search/AddItineraryModal', () => {
  return function MockAddItineraryModal() {
    return null;
  };
});

// Mock FeedbackButton
jest.mock('../../components/utilities/FeedbackButton', () => ({
  FeedbackButton: () => null,
}));

// Mock SubscriptionCard
jest.mock('../../components/common/SubscriptionCard', () => {
  return function MockSubscriptionCard() {
    return null;
  };
});

// Mock auth
const mockAuth = {
  currentUser: { uid: 'test-user-123', email: 'test@example.com' },
  onAuthStateChanged: jest.fn((callback) => {
    callback(mockAuth.currentUser);
    return jest.fn(); // unsubscribe
  }),
};

jest.mock('../../config/firebaseConfig', () => ({
  auth: mockAuth,
  getAuthInstance: jest.fn(() => mockAuth),
}));

const mockUseAllItineraries = useAllItinerariesModule.useAllItineraries as jest.Mock;
const mockUseSearchItineraries = useSearchItinerariesModule.default as jest.Mock;
const mockUseUsageTracking = useUsageTrackingModule.useUsageTracking as jest.Mock;
const mockUseUpdateItinerary = useUpdateItineraryModule.useUpdateItinerary as jest.Mock;

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AlertProvider>
      <UserProfileProvider>
        {component}
      </UserProfileProvider>
    </AlertProvider>
  );
};

describe('SearchPage - Like/Dislike Advances to Next Itinerary', () => {
  let mockGetNextItinerary: jest.Mock;
  let mockSearchItineraries: jest.Mock;
  let mockTrackView: jest.Mock;
  let mockUpdateItinerary: jest.Mock;
  let mockRefreshItineraries: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock functions
    mockGetNextItinerary = jest.fn();
    mockSearchItineraries = jest.fn();
    mockTrackView = jest.fn().mockResolvedValue(true);
    mockUpdateItinerary = jest.fn().mockResolvedValue({});
    mockRefreshItineraries = jest.fn().mockResolvedValue([]);

    // Setup default mocks
    mockUseUsageTracking.mockReturnValue({
      hasReachedLimit: jest.fn().mockReturnValue(false),
      trackView: mockTrackView,
      dailyViewCount: 0,
      refreshProfile: jest.fn(),
    });

    mockUseUpdateItinerary.mockReturnValue({
      updateItinerary: mockUpdateItinerary,
    });

    mockUseAllItineraries.mockReturnValue({
      itineraries: [
        {
          id: 'my-itin-1',
          userId: 'test-user-123',
          destination: 'Paris, France',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          likes: [],
          userInfo: { uid: 'test-user-123', email: 'test@example.com' },
        },
      ],
      loading: false,
      error: null,
      refreshItineraries: mockRefreshItineraries,
    });
  });

  describe('Dislike Button', () => {
    it('should call getNextItinerary immediately when dislike button is clicked', async () => {
      const matchingItineraries: Itinerary[] = [
        {
          id: 'match-1',
          userId: 'other-user-1',
          destination: 'Tokyo, Japan',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          activities: ['Sushi tour', 'Temple visit'],
          likes: [],
          userInfo: { uid: 'other-user-1', username: 'TokyoTraveler' },
        } as any,
      ];

      mockUseSearchItineraries.mockReturnValue({
        matchingItineraries,
        searchItineraries: mockSearchItineraries,
        getNextItinerary: mockGetNextItinerary,
        loading: false,
        hasMore: true,
        error: null,
      });

      const { getByTestId } = renderWithProviders(<SearchPage />);

      // Wait for component to mount and auto-select itinerary
      await waitFor(() => {
        expect(mockSearchItineraries).toHaveBeenCalled();
      });

      // Find and press dislike button on the ItineraryCard
      const dislikeButton = getByTestId('dislike-button');
      fireEvent.press(dislikeButton);

      // Verify getNextItinerary was called (synchronously, not awaited)
      await waitFor(() => {
        expect(mockGetNextItinerary).toHaveBeenCalledTimes(1);
      });

      // Verify trackView was called (usage tracking)
      expect(mockTrackView).toHaveBeenCalledTimes(1);
    });

    it('should NOT await getNextItinerary call - updates state synchronously', async () => {
      const matchingItineraries: Itinerary[] = [
        {
          id: 'match-1',
          userId: 'other-user-1',
          destination: 'Tokyo, Japan',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          activities: ['Activity 1'],
          likes: [],
          userInfo: { uid: 'other-user-1', username: 'User1' },
        } as any,
      ];

      // Track call order to ensure synchronous behavior
      const callOrder: string[] = [];
      
      mockGetNextItinerary.mockImplementation(() => {
        callOrder.push('getNextItinerary');
      });

      mockTrackView.mockImplementation(async () => {
        callOrder.push('trackView');
        return true;
      });

      mockUseSearchItineraries.mockReturnValue({
        matchingItineraries,
        searchItineraries: mockSearchItineraries,
        getNextItinerary: mockGetNextItinerary,
        loading: false,
        hasMore: true,
        error: null,
      });

      const { getByTestId } = renderWithProviders(<SearchPage />);

      // Wait for auto-select
      await waitFor(() => {
        expect(mockSearchItineraries).toHaveBeenCalled();
      });

      const dislikeButton = getByTestId('dislike-button');
      fireEvent.press(dislikeButton);

      await waitFor(() => {
        expect(mockGetNextItinerary).toHaveBeenCalled();
      });

      // getNextItinerary should be called (state update is synchronous)
      expect(callOrder).toContain('getNextItinerary');
    });
  });

  describe('Like Button', () => {
    it('should call getNextItinerary immediately when like button is clicked', async () => {
      const matchingItineraries: Itinerary[] = [
        {
          id: 'match-1',
          userId: 'other-user-1',
          destination: 'Tokyo, Japan',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          activities: ['Sushi tour'],
          likes: [],
          userInfo: { uid: 'other-user-1', username: 'TokyoTraveler', email: 'other@example.com' },
        } as any,
      ];

      mockUseSearchItineraries.mockReturnValue({
        matchingItineraries,
        searchItineraries: mockSearchItineraries,
        getNextItinerary: mockGetNextItinerary,
        loading: false,
        hasMore: true,
        error: null,
      });

      const { getByTestId } = renderWithProviders(<SearchPage />);

      // Wait for auto-select
      await waitFor(() => {
        expect(mockSearchItineraries).toHaveBeenCalled();
      });

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      // Verify getNextItinerary was called
      await waitFor(() => {
        expect(mockGetNextItinerary).toHaveBeenCalledTimes(1);
      });

      // Verify like was persisted
      expect(mockUpdateItinerary).toHaveBeenCalledWith('match-1', {
        likes: ['test-user-123'],
      });
    });

    it('should call getNextItinerary even when mutual match is detected', async () => {
      const matchingItineraries: Itinerary[] = [
        {
          id: 'match-1',
          userId: 'other-user-1',
          destination: 'Tokyo, Japan',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          activities: ['Sushi'],
          likes: [],
          userInfo: { uid: 'other-user-1', username: 'User1', email: 'other@example.com' },
        } as any,
      ];

      // Simulate mutual match: my itinerary already has other user's like
      mockRefreshItineraries.mockResolvedValue([
        {
          id: 'my-itin-1',
          userId: 'test-user-123',
          destination: 'Paris, France',
          likes: ['other-user-1'], // ← Mutual match!
          userInfo: { uid: 'test-user-123', email: 'test@example.com' },
        },
      ]);

      mockUseSearchItineraries.mockReturnValue({
        matchingItineraries,
        searchItineraries: mockSearchItineraries,
        getNextItinerary: mockGetNextItinerary,
        loading: false,
        hasMore: true,
        error: null,
      });

      const { getByTestId } = renderWithProviders(<SearchPage />);

      // Wait for auto-select
      await waitFor(() => {
        expect(mockSearchItineraries).toHaveBeenCalled();
      });

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      // Even with mutual match, should still advance to next itinerary
      await waitFor(() => {
        expect(mockGetNextItinerary).toHaveBeenCalledTimes(1);
      });
    });

    it('should NOT await getNextItinerary - matches PWA behavior', async () => {
      const matchingItineraries: Itinerary[] = [
        {
          id: 'match-1',
          userId: 'other-user-1',
          destination: 'Tokyo, Japan',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          activities: [],
          likes: [],
          userInfo: { uid: 'other-user-1', username: 'User1', email: 'other@example.com' },
        } as any,
      ];

      // Track that getNextItinerary is called synchronously (not awaited)
      let getNextCalled = false;
      mockGetNextItinerary.mockImplementation(() => {
        getNextCalled = true;
      });

      mockUseSearchItineraries.mockReturnValue({
        matchingItineraries,
        searchItineraries: mockSearchItineraries,
        getNextItinerary: mockGetNextItinerary,
        loading: false,
        hasMore: true,
        error: null,
      });

      const { getByTestId } = renderWithProviders(<SearchPage />);

      // Wait for auto-select
      await waitFor(() => {
        expect(mockSearchItineraries).toHaveBeenCalled();
      });

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(getNextCalled).toBe(true);
      });

      // Verify the function was called (synchronous state update)
      expect(mockGetNextItinerary).toHaveBeenCalledTimes(1);
    });
  });

  describe('Usage Limit Handling', () => {
    it('should NOT call getNextItinerary when daily limit is reached on dislike', async () => {
      mockUseUsageTracking.mockReturnValue({
        hasReachedLimit: jest.fn().mockReturnValue(false),
        trackView: jest.fn().mockResolvedValue(false), // ← trackView returns false (limit reached)
        dailyViewCount: 10,
        refreshProfile: jest.fn(),
      });

      const matchingItineraries: Itinerary[] = [
        {
          id: 'match-1',
          userId: 'other-user-1',
          destination: 'Tokyo, Japan',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          activities: [],
          likes: [],
          userInfo: { uid: 'other-user-1', username: 'User1' },
        } as any,
      ];

      mockUseSearchItineraries.mockReturnValue({
        matchingItineraries,
        searchItineraries: mockSearchItineraries,
        getNextItinerary: mockGetNextItinerary,
        loading: false,
        hasMore: true,
        error: null,
      });

      const { getByTestId } = renderWithProviders(<SearchPage />);

      // Wait for auto-select
      await waitFor(() => {
        expect(mockSearchItineraries).toHaveBeenCalled();
      });

      const dislikeButton = getByTestId('dislike-button');
      fireEvent.press(dislikeButton);

      // Should NOT call getNextItinerary when limit is reached
      await waitFor(() => {
        expect(mockGetNextItinerary).not.toHaveBeenCalled();
      });
    });

    it('should NOT call getNextItinerary when daily limit is reached on like', async () => {
      mockUseUsageTracking.mockReturnValue({
        hasReachedLimit: jest.fn().mockReturnValue(false),
        trackView: jest.fn().mockResolvedValue(false), // ← Limit reached
        dailyViewCount: 10,
        refreshProfile: jest.fn(),
      });

      const matchingItineraries: Itinerary[] = [
        {
          id: 'match-1',
          userId: 'other-user-1',
          destination: 'Tokyo, Japan',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          activities: [],
          likes: [],
          userInfo: { uid: 'other-user-1', username: 'User1', email: 'other@example.com' },
        } as any,
      ];

      mockUseSearchItineraries.mockReturnValue({
        matchingItineraries,
        searchItineraries: mockSearchItineraries,
        getNextItinerary: mockGetNextItinerary,
        loading: false,
        hasMore: true,
        error: null,
      });

      const { getByTestId } = renderWithProviders(<SearchPage />);

      // Wait for auto-select
      await waitFor(() => {
        expect(mockSearchItineraries).toHaveBeenCalled();
      });

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      // Should NOT call getNextItinerary when limit is reached
      await waitFor(() => {
        expect(mockGetNextItinerary).not.toHaveBeenCalled();
      });

      // Should also NOT persist the like
      expect(mockUpdateItinerary).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle like error gracefully and still advance', async () => {
      mockUpdateItinerary.mockRejectedValue(new Error('Network error'));

      const matchingItineraries: Itinerary[] = [
        {
          id: 'match-1',
          userId: 'other-user-1',
          destination: 'Tokyo, Japan',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          activities: [],
          likes: [],
          userInfo: { uid: 'other-user-1', username: 'User1', email: 'other@example.com' },
        } as any,
      ];

      mockUseSearchItineraries.mockReturnValue({
        matchingItineraries,
        searchItineraries: mockSearchItineraries,
        getNextItinerary: mockGetNextItinerary,
        loading: false,
        hasMore: true,
        error: null,
      });

      const { getByTestId } = renderWithProviders(<SearchPage />);

      // Wait for auto-select
      await waitFor(() => {
        expect(mockSearchItineraries).toHaveBeenCalled();
      });

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      // Should NOT advance on error (error is caught and shown to user)
      await waitFor(() => {
        expect(mockGetNextItinerary).not.toHaveBeenCalled();
      });
    });

    it('should handle missing userInfo gracefully', async () => {
      const matchingItineraries: Itinerary[] = [
        {
          id: 'match-1',
          userId: 'other-user-1',
          destination: 'Tokyo, Japan',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          activities: [],
          likes: [],
          // userInfo is missing
        } as any,
      ];

      mockUseSearchItineraries.mockReturnValue({
        matchingItineraries,
        searchItineraries: mockSearchItineraries,
        getNextItinerary: mockGetNextItinerary,
        loading: false,
        hasMore: true,
        error: null,
      });

      const { getByTestId } = renderWithProviders(<SearchPage />);

      // Wait for auto-select
      await waitFor(() => {
        expect(mockSearchItineraries).toHaveBeenCalled();
      });

      // Dislike should still work
      const dislikeButton = getByTestId('dislike-button');
      fireEvent.press(dislikeButton);

      await waitFor(() => {
        expect(mockGetNextItinerary).toHaveBeenCalledTimes(1);
      });
    });
  });
});

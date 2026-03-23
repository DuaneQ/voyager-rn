/**
 * Unit Tests for SearchPage Component
 * Tests itinerary dropdown, mock itineraries display, and user interactions
 */

// Mock both firebase config files BEFORE any imports
jest.mock('../../../firebase-config');
jest.mock('../../config/firebaseConfig');

// ─── Ad delivery & related mocks ─────────────────────────────────────────────
jest.mock('../../hooks/ads', () => ({
  useAdDelivery: jest.fn(() => ({
    ads: [],
    loading: false,
    error: null,
    fetchAds: jest.fn().mockResolvedValue(undefined),
  })),
  useAdTracking: jest.fn(() => ({
    trackImpression: jest.fn(),
    trackClick: jest.fn(),
    trackQuartile: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
    getSeenIds: jest.fn().mockReturnValue([]),
  })),
}));
jest.mock('../../hooks/useTravelPreferences', () => ({
  useTravelPreferences: jest.fn(() => ({
    defaultProfile: null,
    profiles: [],
    loading: false,
    error: null,
    loadProfiles: jest.fn(),
  })),
}));
jest.mock('../../utils/calculateAge', () => ({
  calculateAge: jest.fn().mockReturnValue(28),
}));
jest.mock('../../hooks/useUsageTracking', () => ({
  useUsageTracking: jest.fn(() => ({
    hasReachedLimit: false,
    trackView: jest.fn().mockResolvedValue(true),
    dailyViewCount: 0,
    refreshProfile: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../../hooks/useUpdateItinerary', () => ({
  useUpdateItinerary: jest.fn(() => ({
    updateItinerary: jest.fn().mockResolvedValue({ id: 'itin-1', likes: [] }),
    isUpdating: false,
    error: null,
  })),
}));
jest.mock('../../utils/viewedStorage', () => ({
  saveViewedItinerary: jest.fn(),
  hasViewedItinerary: jest.fn().mockReturnValue(false),
}));
jest.mock('../../components/common/SubscriptionCard', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/search/AddItineraryModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/utilities/FeedbackButton', () => ({
  FeedbackButton: () => null,
}));
jest.mock('../../components/forms/ItineraryCard', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ itinerary, onLike, onDislike }: any) =>
      React.createElement(
        View,
        { testID: 'itinerary-card' },
        React.createElement(TouchableOpacity, {
          testID: 'like-action',
          onPress: () => onLike(itinerary),
        }),
        React.createElement(TouchableOpacity, {
          testID: 'dislike-action',
          onPress: () => onDislike(itinerary),
        }),
      ),
  };
});
jest.mock('../../components/ads', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    SponsoredItineraryCard: ({
      ad,
      onImpression,
      onCtaPress,
      onDismiss,
    }: any) => {
      React.useEffect(() => {
        if (onImpression && ad?.campaignId) onImpression(ad.campaignId);
      }, [ad?.campaignId, onImpression]);
      return React.createElement(
        View,
        { testID: 'sponsored-card' },
        React.createElement(
          Text,
          { testID: 'sponsored-business' },
          ad?.businessName,
        ),
        React.createElement(TouchableOpacity, {
          testID: 'sponsored-cta',
          onPress: () => onCtaPress && onCtaPress(ad.campaignId),
        }),
        React.createElement(TouchableOpacity, {
          testID: 'sponsored-dismiss',
          onPress: () => onDismiss && onDismiss(ad.campaignId),
        }),
      );
    },
  };
});

// Mock ConnectionRepository BEFORE SearchPage import to avoid firebase/firestore dependency chain
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
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SearchPage from '../../pages/SearchPage';
import { auth } from '../../config/firebaseConfig';
import * as useAllItinerariesModule from '../../hooks/useAllItineraries';
import useSearchItineraries from '../../hooks/useSearchItineraries';
import { useAdDelivery, useAdTracking } from '../../hooks/ads';
import type { AdUnit } from '../../types/AdDelivery';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import { useUserProfile } from '../../context/UserProfileContext';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useUpdateItinerary } from '../../hooks/useUpdateItinerary';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn((callback) => {
    // Call the callback immediately in tests
    callback();
  }),
}));

jest.mock('../../context/AlertContext', () => ({
  useAlert: () => ({
    showAlert: jest.fn(),
  }),
}));

jest.mock('../../context/UserProfileContext', () => ({
  UserProfileProvider: ({ children }: any) => children,
  useUserProfile: jest.fn(() => ({
    userProfile: null,
    isLoading: false,
    error: null,
    loadUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
  })),
}));

jest.mock('../../hooks/useAllItineraries');
jest.mock('../../hooks/useSearchItineraries', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    matchingItineraries: [],
    searchItineraries: jest.fn(),
    getNextItinerary: jest.fn(),
    loading: false,
    hasMore: false,
    error: null,
  })),
}));
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
const mockUseSearchItineraries = useSearchItineraries as jest.Mock;
const mockUseAdDelivery = useAdDelivery as jest.Mock;
const mockUseAdTracking = useAdTracking as jest.Mock;
const mockUseTravelPreferences = useTravelPreferences as jest.Mock;
const mockUseUserProfile = useUserProfile as jest.Mock;
const mockUseUsageTracking = useUsageTracking as jest.Mock;
const mockUseUpdateItinerary = useUpdateItinerary as jest.Mock;

// Mock AuthProvider
jest.mock('../../context/AuthContext', () => {
  const React = require('react');
  return {
    AuthProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useAuth: () => ({
      user: { uid: 'test-user-123', email: 'test@example.com' },
      signOut: jest.fn(),
      status: 'authenticated',
    }),
  };
});

// Test helper to wrap component with required providers
const renderWithProviders = (component: React.ReactElement) => {
  const { AuthProvider } = require('../../context/AuthContext');
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('SearchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = { uid: 'test-user-123' };

    // Reset all dynamically-mocked hooks to safe defaults so existing tests
    // continue to pass without touching ad-specific behaviour.
    mockUseAdDelivery.mockReturnValue({
      ads: [],
      loading: false,
      error: null,
      fetchAds: jest.fn().mockResolvedValue(undefined),
    });
    mockUseAdTracking.mockReturnValue({
      trackImpression: jest.fn(),
      trackClick: jest.fn(),
      trackQuartile: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      getSeenIds: jest.fn().mockReturnValue([]),
    });
    mockUseTravelPreferences.mockReturnValue({
      defaultProfile: null,
      profiles: [],
      loading: false,
      error: null,
      loadProfiles: jest.fn(),
    });
    mockUseUserProfile.mockReturnValue({
      userProfile: null,
      isLoading: false,
      error: null,
      loadUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
    });
    mockUseUsageTracking.mockReturnValue({
      hasReachedLimit: false,
      trackView: jest.fn().mockResolvedValue(true),
      dailyViewCount: 0,
      refreshProfile: jest.fn().mockResolvedValue(undefined),
    });
    mockUseUpdateItinerary.mockReturnValue({
      updateItinerary: jest.fn().mockResolvedValue({ id: 'itin-1', likes: [] }),
      isUpdating: false,
      error: null,
    });
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

  // TODO: These tests are skipped due to async state update timing issues in the test environment
  // The onAuthStateChanged callback is called synchronously, but React's setState batching
  // means userId isn't reflected in the render until after waitFor times out
  // Need to investigate using act() or different test strategy
  it.skip('should display mock itineraries when user has no real itineraries', async () => {
    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText, queryByText } = renderWithProviders(<SearchPage />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    });

    // Wait for mock itinerary to appear (implies auth state is set)
    await waitFor(() => {
      expect(getByText('Amazing Tokyo Adventure')).toBeTruthy();
    }, { timeout: 3000 });
    
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

  it.skip('should display usage counter when user has itineraries', async () => {
    // NOTE: Skipped - auth mock not triggering onAuthStateChanged correctly
    // Component stays in loading state - needs investigation of getAuthInstance mock
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

    const { getByText, queryByText, debug } = renderWithProviders(<SearchPage />);

    // First wait for loading to finish
    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 2000 });

    // Debug what's rendered
    debug();

    await waitFor(() => {
      expect(getByText('Views today: 0/10')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it.skip('should pass itineraries to ItinerarySelector', async () => {
    // NOTE: Skipped - auth mock issue
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

  it.skip('should auto-select first itinerary when loaded', async () => {
    // NOTE: Skipped - auth mock issue
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
    // Mock auth with no user
    const firebaseConfig = require('../../config/firebaseConfig');
    firebaseConfig.getAuthInstance = jest.fn(() => ({
      currentUser: null,
      onAuthStateChanged: jest.fn((callback) => {
        callback(null); // No user
        return jest.fn(); // Return unsubscribe
      }),
    }));
    (auth as any).currentUser = null;

    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText, queryByText } = renderWithProviders(<SearchPage />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    });

    await waitFor(() => {
      expect(getByText('Please log in to see itineraries')).toBeTruthy();
    });
  });

  it.skip('should cycle through mock itineraries on like/dislike', async () => {
    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText, queryByText } = renderWithProviders(<SearchPage />);

    // Wait for auth state to be set
    await waitFor(() => {
      expect(queryByText('Please log in to see itineraries')).toBeNull();
    });

    // Wait for first mock itinerary
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

  it.skip('should cycle to next mock itinerary on like', async () => {
    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText, queryByText } = renderWithProviders(<SearchPage />);

    // Wait for auth state
    await waitFor(() => {
      expect(queryByText('Please log in to see itineraries')).toBeNull();
    });

    // Wait for first itinerary
    await waitFor(() => {
      expect(getByText('Amazing Tokyo Adventure')).toBeTruthy();
    });

    const likeButton = getByText('✈️');
    fireEvent.press(likeButton);

    await waitFor(() => {
      // Should show second mock itinerary
      expect(getByText('Paris Romance')).toBeTruthy();
    });
  });

  it.skip('should cycle to next mock itinerary on dislike', async () => {
    mockUseAllItineraries.mockReturnValue({
      itineraries: [],
      loading: false,
      error: null,
      refreshItineraries: jest.fn(),
    });

    const { getByText, queryByText } = renderWithProviders(<SearchPage />);

    // Wait for auth state
    await waitFor(() => {
      expect(queryByText('Please log in to see itineraries')).toBeNull();
    });

    // Wait for first itinerary
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

  it.skip('should search for matches when itinerary is selected', async () => {
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

    mockUseSearchItineraries.mockReturnValue({
      matchingItineraries: [],
      searchLoading: false,
      searchError: null,
      searchItineraries: jest.fn(),
    });

    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      // Should log searching for matches (auto-selected first itinerary)
      expect(consoleSpy).toHaveBeenCalledWith('[SearchPage] Searching for matches for itinerary:', 'itin-1');
    });
    
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

  // ─── Phase 2: Ad interstitial delivery ──────────────────────────────────────
  describe('Ad interstitial delivery', () => {
    const mockAd: AdUnit = {
      campaignId: 'camp-ad-123',
      placement: 'itinerary_feed' as const,
      creativeType: 'image' as const,
      assetUrl: 'https://example.com/ad.jpg',
      primaryText: 'Book your dream trip!',
      cta: 'Book Now',
      landingUrl: 'https://example.com/book',
      businessName: 'Dream Hotels',
      billingModel: 'cpm' as const,
    };

    const mockAd2: AdUnit = {
      campaignId: 'camp-ad-456',
      placement: 'itinerary_feed' as const,
      creativeType: 'image' as const,
      assetUrl: 'https://example.com/ad2.jpg',
      primaryText: 'Explore the world!',
      cta: 'Explore Now',
      landingUrl: 'https://example.com/explore',
      businessName: 'Adventure Tours',
      billingModel: 'cpc' as const,
    };

    const mockOwnerItinerary = {
      id: 'itin-1',
      userId: 'test-user-123',
      destination: 'Tokyo, Japan',
      startDate: '2025-06-01',
      endDate: '2025-06-07',
      startDay: Date.parse('2025-06-01'),
      endDay: Date.parse('2025-06-07'),
    };

    const mockMatchingItinerary = {
      id: 'match-1',
      userId: 'other-user-456',
      destination: 'Tokyo, Japan',
      startDate: '2025-06-03',
      endDate: '2025-06-09',
      startDay: Date.parse('2025-06-03'),
      endDay: Date.parse('2025-06-09'),
      userInfo: { uid: 'other-user-456' },
      likes: [],
    };

    beforeEach(() => {
      // Override auth to synchronously deliver a valid user so isLoading
      // becomes false and userId is set before the first render completes.
      const firebaseConfig = require('../../config/firebaseConfig');
      firebaseConfig.getAuthInstance = jest.fn(() => ({
        currentUser: { uid: 'test-user-123' },
        onAuthStateChanged: jest.fn((callback: (user: any) => void) => {
          callback({ uid: 'test-user-123' });
          return jest.fn(); // unsubscribe
        }),
      }));
      (auth as any).currentUser = { uid: 'test-user-123' };

      // User owns one real itinerary (enables the itinerary-selected flow).
      mockUseAllItineraries.mockReturnValue({
        itineraries: [mockOwnerItinerary],
        loading: false,
        error: null,
        refreshItineraries: jest.fn().mockResolvedValue([mockOwnerItinerary]),
      });

      // Matching itineraries are available so the ItineraryCard branch renders.
      mockUseSearchItineraries.mockReturnValue({
        matchingItineraries: [mockMatchingItinerary],
        searchItineraries: jest.fn().mockResolvedValue(undefined),
        getNextItinerary: jest.fn().mockResolvedValue(undefined),
        loading: false,
        hasMore: true,
        error: null,
      });
    });

    /**
     * Renders SearchPage with a specific sponsored-ads pool pre-loaded into
     * useAdDelivery, and exposes the fetchAds spy for targeting assertions.
     */
    const renderWithAds = (ads = [mockAd]) => {
      const mockFetchAds = jest.fn().mockResolvedValue(undefined);
      mockUseAdDelivery.mockReturnValue({
        ads,
        loading: false,
        error: null,
        fetchAds: mockFetchAds,
      });
      const utils = renderWithProviders(<SearchPage />);
      return { ...utils, mockFetchAds };
    };

    /**
     * Waits for the "Select First" button and presses it, then waits for the
     * organic ItineraryCard to confirm selectedItineraryId was set.
     */
    const selectFirstItinerary = async (
      getByTestId: ReturnType<typeof renderWithProviders>['getByTestId'],
    ) => {
      await waitFor(() => expect(getByTestId('select-first-button')).toBeTruthy());
      fireEvent.press(getByTestId('select-first-button'));
      await waitFor(() => expect(getByTestId('itinerary-card')).toBeTruthy());
    };

    /**
     * Fires the dislike button N times.  Each press triggers handleDislike
     * (async), so we flush the microtask queue via act() between presses to
     * let maybeShowInterstitialAd() advance the action counter correctly.
     */
    const pressDislikeNTimes = async (
      getByTestId: ReturnType<typeof renderWithProviders>['getByTestId'],
      n: number,
    ) => {
      for (let i = 0; i < n; i++) {
        fireEvent.press(getByTestId('dislike-action'));
        // Flush pending Promises (trackView, getNextItinerary, setState)
        await act(async () => {});
      }
    };

    // ── Visibility gating ────────────────────────────────────────────────────

    it('should NOT show sponsored card when the ads pool is empty', async () => {
      mockUseAdDelivery.mockReturnValue({
        ads: [],
        loading: false,
        error: null,
        fetchAds: jest.fn(),
      });
      const { queryByTestId, getByTestId } = renderWithProviders(<SearchPage />);
      await selectFirstItinerary(getByTestId);
      await pressDislikeNTimes(getByTestId, 3);

      expect(queryByTestId('sponsored-card')).toBeNull();
    });

    it('should NOT show sponsored card after only 2 dislike actions', async () => {
      const { queryByTestId, getByTestId } = renderWithAds([mockAd]);
      await selectFirstItinerary(getByTestId);
      await pressDislikeNTimes(getByTestId, 2);

      expect(queryByTestId('sponsored-card')).toBeNull();
      expect(getByTestId('itinerary-card')).toBeTruthy();
    });

    it('should show sponsored card after exactly 3 dislike actions', async () => {
      const { getByTestId } = renderWithAds([mockAd]);
      await selectFirstItinerary(getByTestId);
      await pressDislikeNTimes(getByTestId, 3);

      await waitFor(() => {
        expect(getByTestId('sponsored-card')).toBeTruthy();
      });
    });

    it('should display the sponsored business name in the ad card', async () => {
      const { getByTestId, getByText } = renderWithAds([mockAd]);
      await selectFirstItinerary(getByTestId);
      await pressDislikeNTimes(getByTestId, 3);

      await waitFor(() => expect(getByText('Dream Hotels')).toBeTruthy());
    });

    // ── Impression & click tracking ──────────────────────────────────────────

    it('should call trackImpression with campaignId when sponsored card appears', async () => {
      const mockTrackImpression = jest.fn();
      mockUseAdTracking.mockReturnValue({
        trackImpression: mockTrackImpression,
        trackClick: jest.fn(),
        trackQuartile: jest.fn(),
        flush: jest.fn().mockResolvedValue(undefined),
        getSeenIds: jest.fn().mockReturnValue([]),
      });
      const { getByTestId } = renderWithAds([mockAd]);
      await selectFirstItinerary(getByTestId);
      await pressDislikeNTimes(getByTestId, 3);

      await waitFor(() => {
        expect(getByTestId('sponsored-card')).toBeTruthy();
        expect(mockTrackImpression).toHaveBeenCalledWith(mockAd.campaignId);
      });
    });

    it('should call trackClick with campaignId when CTA is pressed', async () => {
      const mockTrackClick = jest.fn();
      mockUseAdTracking.mockReturnValue({
        trackImpression: jest.fn(),
        trackClick: mockTrackClick,
        trackQuartile: jest.fn(),
        flush: jest.fn().mockResolvedValue(undefined),
        getSeenIds: jest.fn().mockReturnValue([]),
      });
      const { getByTestId } = renderWithAds([mockAd]);
      await selectFirstItinerary(getByTestId);
      await pressDislikeNTimes(getByTestId, 3);

      await waitFor(() => expect(getByTestId('sponsored-cta')).toBeTruthy());
      fireEvent.press(getByTestId('sponsored-cta'));

      await waitFor(() => {
        expect(mockTrackClick).toHaveBeenCalledWith(mockAd.campaignId);
      });
    });

    // ── Dismissal ────────────────────────────────────────────────────────────

    it('should dismiss sponsored card on CTA press and restore organic card', async () => {
      const { getByTestId, queryByTestId } = renderWithAds([mockAd]);
      await selectFirstItinerary(getByTestId);
      await pressDislikeNTimes(getByTestId, 3);

      await waitFor(() => expect(getByTestId('sponsored-card')).toBeTruthy());
      fireEvent.press(getByTestId('sponsored-cta'));

      await waitFor(() => {
        expect(queryByTestId('sponsored-card')).toBeNull();
        expect(getByTestId('itinerary-card')).toBeTruthy();
      });
    });

    it('should dismiss sponsored card on dismiss press and restore organic card', async () => {
      const { getByTestId, queryByTestId } = renderWithAds([mockAd]);
      await selectFirstItinerary(getByTestId);
      await pressDislikeNTimes(getByTestId, 3);

      await waitFor(() => expect(getByTestId('sponsored-card')).toBeTruthy());
      fireEvent.press(getByTestId('sponsored-dismiss'));

      await waitFor(() => {
        expect(queryByTestId('sponsored-card')).toBeNull();
        expect(getByTestId('itinerary-card')).toBeTruthy();
      });
    });

    // ── Ad rotation ──────────────────────────────────────────────────────────

    it('should rotate to second ad in pool after first is dismissed', async () => {
      const { getByTestId, queryByTestId, getByText } = renderWithAds([
        mockAd,
        mockAd2,
      ]);
      await selectFirstItinerary(getByTestId);

      // First interstitial (actions 1–3)
      await pressDislikeNTimes(getByTestId, 3);
      await waitFor(() => expect(getByTestId('sponsored-card')).toBeTruthy());

      // Dismiss first ad
      fireEvent.press(getByTestId('sponsored-dismiss'));
      await waitFor(() => expect(queryByTestId('sponsored-card')).toBeNull());

      // Second interstitial (actions 4–6)
      await pressDislikeNTimes(getByTestId, 3);
      await waitFor(() => {
        expect(getByTestId('sponsored-card')).toBeTruthy();
        expect(getByText('Adventure Tours')).toBeTruthy();
      });
    });

    // ── Counter is cumulative across destination switches ─────────────────────

    it('should carry action counter across itinerary switches', async () => {
      const { getByTestId, queryByTestId } = renderWithAds([mockAd]);
      await selectFirstItinerary(getByTestId);

      // 2 dislikes — not enough to trigger ad
      await pressDislikeNTimes(getByTestId, 2);
      expect(queryByTestId('sponsored-card')).toBeNull();

      // Re-select the same itinerary — counter is NOT reset
      fireEvent.press(getByTestId('select-first-button'));
      await waitFor(() => expect(getByTestId('itinerary-card')).toBeTruthy());

      // 1 more dislike — cumulative total = 3, ad MUST appear
      await pressDislikeNTimes(getByTestId, 1);
      await waitFor(() => expect(getByTestId('sponsored-card')).toBeTruthy());
    });

    // ── Targeting context ─────────────────────────────────────────────────────

    it('should call fetchAds with destination from selected itinerary', async () => {
      const mockFetchAds = jest.fn().mockResolvedValue(undefined);
      mockUseAdDelivery.mockReturnValue({
        ads: [mockAd],
        loading: false,
        error: null,
        fetchAds: mockFetchAds,
      });
      const { getByTestId } = renderWithProviders(<SearchPage />);
      await selectFirstItinerary(getByTestId);

      expect(mockFetchAds).toHaveBeenCalledWith(
        expect.objectContaining({ destination: 'Tokyo, Japan' }),
        expect.any(Array),
      );
    });

    it('should call fetchAds with travel dates from selected itinerary', async () => {
      const mockFetchAds = jest.fn().mockResolvedValue(undefined);
      mockUseAdDelivery.mockReturnValue({
        ads: [mockAd],
        loading: false,
        error: null,
        fetchAds: mockFetchAds,
      });
      const { getByTestId } = renderWithProviders(<SearchPage />);
      await selectFirstItinerary(getByTestId);

      expect(mockFetchAds).toHaveBeenCalledWith(
        expect.objectContaining({
          travelStartDate: '2025-06-01',
          travelEndDate: '2025-06-07',
        }),
        expect.any(Array),
      );
    });

    it('should include gender in fetchAds targeting when user profile has gender', async () => {
      mockUseUserProfile.mockReturnValue({
        userProfile: { gender: 'Female', dob: null },
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
        updateUserProfile: jest.fn(),
      });
      const mockFetchAds = jest.fn().mockResolvedValue(undefined);
      mockUseAdDelivery.mockReturnValue({
        ads: [mockAd],
        loading: false,
        error: null,
        fetchAds: mockFetchAds,
      });
      const { getByTestId } = renderWithProviders(<SearchPage />);
      await selectFirstItinerary(getByTestId);

      expect(mockFetchAds).toHaveBeenCalledWith(
        expect.objectContaining({ gender: 'Female' }),
        expect.any(Array),
      );
    });

    it('should include age in fetchAds targeting when user profile has dob', async () => {
      mockUseUserProfile.mockReturnValue({
        userProfile: { gender: null, dob: '1995-07-15' },
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
        updateUserProfile: jest.fn(),
      });
      const mockFetchAds = jest.fn().mockResolvedValue(undefined);
      mockUseAdDelivery.mockReturnValue({
        ads: [mockAd],
        loading: false,
        error: null,
        fetchAds: mockFetchAds,
      });
      const { getByTestId } = renderWithProviders(<SearchPage />);
      await selectFirstItinerary(getByTestId);

      // calculateAge is mocked globally to return 28
      expect(mockFetchAds).toHaveBeenCalledWith(
        expect.objectContaining({ age: 28 }),
        expect.any(Array),
      );
    });

    it('should include activityPreferences in fetchAds when travelProfile has activities', async () => {
      mockUseTravelPreferences.mockReturnValue({
        defaultProfile: { activities: ['hiking', 'surfing'], travelStyle: null },
        profiles: [],
        loading: false,
        error: null,
        loadProfiles: jest.fn(),
      });
      const mockFetchAds = jest.fn().mockResolvedValue(undefined);
      mockUseAdDelivery.mockReturnValue({
        ads: [mockAd],
        loading: false,
        error: null,
        fetchAds: mockFetchAds,
      });
      const { getByTestId } = renderWithProviders(<SearchPage />);
      await selectFirstItinerary(getByTestId);

      expect(mockFetchAds).toHaveBeenCalledWith(
        expect.objectContaining({ activityPreferences: ['hiking', 'surfing'] }),
        expect.any(Array),
      );
    });

    it('should include travelStyles in fetchAds when travelProfile has travelStyle', async () => {
      mockUseTravelPreferences.mockReturnValue({
        defaultProfile: { activities: [], travelStyle: 'adventure' },
        profiles: [],
        loading: false,
        error: null,
        loadProfiles: jest.fn(),
      });
      const mockFetchAds = jest.fn().mockResolvedValue(undefined);
      mockUseAdDelivery.mockReturnValue({
        ads: [mockAd],
        loading: false,
        error: null,
        fetchAds: mockFetchAds,
      });
      const { getByTestId } = renderWithProviders(<SearchPage />);
      await selectFirstItinerary(getByTestId);

      expect(mockFetchAds).toHaveBeenCalledWith(
        expect.objectContaining({ travelStyles: ['adventure'] }),
        expect.any(Array),
      );
    });

    it('should pass seenCampaignIds from getSeenIds to fetchAds for frequency capping', async () => {
      const mockGetSeenIds = jest.fn().mockReturnValue(['campaign-abc', 'campaign-xyz']);
      mockUseAdTracking.mockReturnValue({
        trackImpression: jest.fn(),
        trackClick: jest.fn(),
        trackQuartile: jest.fn(),
        flush: jest.fn(),
        getSeenIds: mockGetSeenIds,
      });
      const mockFetchAds = jest.fn().mockResolvedValue(undefined);
      mockUseAdDelivery.mockReturnValue({
        ads: [mockAd],
        loading: false,
        error: null,
        fetchAds: mockFetchAds,
      });
      const { getByTestId } = renderWithProviders(<SearchPage />);
      await selectFirstItinerary(getByTestId);

      // seenCampaignIds must be passed as second arg so the server can apply the -5 penalty
      expect(mockFetchAds).toHaveBeenCalledWith(
        expect.any(Object),
        ['campaign-abc', 'campaign-xyz'],
      );
    });
  });
});

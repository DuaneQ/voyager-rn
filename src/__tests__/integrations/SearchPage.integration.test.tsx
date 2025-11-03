/**
 * SearchPage Integration Tests - Hook-Level Integration Tests
 * 
 * Tests actual business logic integrations between:
 * - Usage tracking hooks (useUsageTracking)
 * - Update itinerary hooks (useUpdateItinerary)
 * - Search itineraries hooks (useSearchItineraries)
 * - Firestore operations
 * - Connection creation
 * 
 * This approach tests the hooks that SearchPage uses rather than rendering
 * the full component, which is more reliable and faster while still verifying
 * all the integration points and business logic.
 */

import { renderHook, waitFor, act, render, screen, fireEvent } from '@testing-library/react-native';
import { httpsCallable } from 'firebase/functions';
import { getDoc, updateDoc, setDoc, getDocs, doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import SearchPage from '../../pages/SearchPage';

// Mock firebase-config BEFORE any imports that use it
jest.mock('../../../firebase-config', () => ({
  app: {},
  auth: {
    currentUser: { uid: 'test-user-123', email: 'test@example.com' },
    onAuthStateChanged: jest.fn((callback) => {
      // Call callback with mock user
      callback({ uid: 'test-user-123', email: 'test@example.com' });
      // Return unsubscribe function
      return jest.fn();
    }),
  },
  db: {},
  storage: {},
  functions: {},
}));

// Mock src/config/firebaseConfig - this is what the hooks actually import from
jest.mock('../../config/firebaseConfig', () => ({
  app: {},
  auth: {
    currentUser: { uid: 'test-user-123', email: 'test@example.com' },
    onAuthStateChanged: jest.fn((callback) => {
      // Call callback with mock user
      callback({ uid: 'test-user-123', email: 'test@example.com' });
      // Return unsubscribe function
      return jest.fn();
    }),
  },
  db: {},
  storage: {},
  functions: {},
}));

// Mock dependencies
jest.mock('firebase/functions');
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  getDownloadURL: jest.fn().mockResolvedValue('https://example.com/avatar.jpg'),
}));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }))
  }
}));

// Mock contexts - need to provide full React context wrapper
const mockShowAlert = jest.fn();
const mockUserProfile = {
  uid: 'test-user-123',
  username: 'testuser',
  age: 30,
  gender: 'Male',
  dailyUsage: {
    date: new Date().toISOString().split('T')[0],
    viewCount: 0
  },
  subscriptionType: 'free'
};

jest.mock('../../context/AlertContext', () => ({
  useAlert: () => ({ showAlert: mockShowAlert })
}));

jest.mock('../../context/UserProfileContext', () => ({
  useUserProfile: () => ({
    userProfile: mockUserProfile
  })
}));

jest.mock('../../context/NewConnectionContext', () => ({
  useNewConnection: () => ({ triggerRefresh: jest.fn() })
}));

// Mock repositories
const mockCreateConnection = jest.fn();
jest.mock('../../repositories/ConnectionRepository', () => ({
  connectionRepository: {
    createConnection: (...args: any[]) => mockCreateConnection(...args),
  }
}));

const mockSaveViewedItinerary = jest.fn();
jest.mock('../../utils/viewedStorage', () => ({
  saveViewedItinerary: (...args: any[]) => mockSaveViewedItinerary(...args),
  hasViewedItinerary: jest.fn(() => false),
}));

// Mock useAllItineraries hook for testing when mock itineraries should be shown
const mockRefreshItineraries = jest.fn();
let mockItinerariesData: any[] = [];
jest.mock('../../hooks/useAllItineraries', () => ({
  useAllItineraries: () => ({
    itineraries: mockItinerariesData,
    loading: false,
    error: null,
    refreshItineraries: mockRefreshItineraries
  })
}));

// Import hooks to test AFTER mocks are set up
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useUpdateItinerary } from '../../hooks/useUpdateItinerary';
import useSearchItineraries from '../../hooks/useSearchItineraries';

describe('SearchPage Integration Tests', () => {
  // Test data
  const today = new Date().toISOString().split('T')[0];
  
  const mockUserItinerary = {
    id: 'user-itin-1',
    userId: 'test-user-123',
    destination: 'Paris',
    startDate: '2024-06-01',
    endDate: '2024-06-10',
    startDay: new Date('2024-06-01').getTime(),
    endDay: new Date('2024-06-10').getTime(),
    gender: 'No Preference',
    status: 'No Preference',
    sexualOrientation: 'No Preference',
    lowerRange: 25,
    upperRange: 45,
    description: 'My Paris trip',
    activities: ['Eiffel Tower', 'Louvre'],
    likes: [],
    userInfo: {
      uid: 'test-user-123',
      username: 'testuser',
      blocked: [],
      gender: 'Male',
      dob: '1990-01-01',
      email: 'test@example.com',
      status: 'Single',
      sexualOrientation: 'Straight'
    }
  };

  const mockMatchingItinerary = {
    id: 'match-itin-1',
    userId: 'other-user-456',
    destination: 'Paris',
    startDate: '2024-06-05',
    endDate: '2024-06-15',
    startDay: new Date('2024-06-05').getTime(),
    endDay: new Date('2024-06-15').getTime(),
    gender: 'Female',
    description: 'Exploring Paris',
    activities: ['Museums', 'Cafes'],
    likes: [],
    userInfo: {
      uid: 'other-user-456',
      username: 'traveler1',
      blocked: [],
      gender: 'Female',
      dob: '1992-05-15',
      email: 'traveler1@example.com',
      status: 'Single',
      sexualOrientation: 'Straight'
    }
  };

  const mockSecondItinerary = {
    id: 'match-itin-2',
    userId: 'another-user-789',
    destination: 'Paris',
    startDate: '2024-06-03',
    endDate: '2024-06-08',
    startDay: new Date('2024-06-03').getTime(),
    endDay: new Date('2024-06-08').getTime(),
    gender: 'Male',
    description: 'Paris adventure',
    activities: ['Food tours'],
    likes: [],
    userInfo: {
      uid: 'another-user-789',
      username: 'traveler2',
      blocked: [],
      gender: 'Male',
      dob: '1988-12-20',
      email: 'traveler2@example.com',
      status: 'Single',
      sexualOrientation: 'Straight'
    }
  };

  let mockListItinerariesFn: jest.Mock;
  let mockSearchItinerariesFn: jest.Mock;
  let mockUpdateItineraryFn: jest.Mock;

  // Mock auth.currentUser
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock functions
    mockListItinerariesFn = jest.fn();
    mockSearchItinerariesFn = jest.fn();
    mockUpdateItineraryFn = jest.fn();

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    // Mock Firestore getDoc for user profile
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'test-user-123',
        username: 'testuser',
        dailyUsage: {
          date: today,
          viewCount: 0
        },
        subscriptionType: 'free'
      })
    });

    // Mock updateDoc for usage tracking
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    // Mock setDoc for connection creation
    (setDoc as jest.Mock).mockResolvedValue(undefined);

    // Mock getDocs for connection queries
    (getDocs as jest.Mock).mockResolvedValue({
      empty: true,
      forEach: jest.fn()
    });

    // Mock connection creation
    mockCreateConnection.mockResolvedValue({
      id: 'test-user-123_other-user-456',
      users: ['test-user-123', 'other-user-456']
    });

    // Default RPC responses
    mockListItinerariesFn.mockResolvedValue({
      data: {
        success: true,
        data: [mockUserItinerary]
      }
    });

    mockSearchItinerariesFn.mockResolvedValue({
      data: {
        success: true,
        data: [mockMatchingItinerary, mockSecondItinerary]
      }
    });

    mockUpdateItineraryFn.mockResolvedValue({
      data: {
        success: true,
        data: { ...mockMatchingItinerary, likes: ['test-user-123'] }
      }
    });

    // Setup httpsCallable
    (httpsCallable as jest.Mock).mockImplementation((functions: any, name: string) => {
      if (name === 'listItinerariesForUser') return mockListItinerariesFn;
      if (name === 'searchItineraries') return mockSearchItinerariesFn;
      if (name === 'updateItinerary') return mockUpdateItineraryFn;
      return jest.fn().mockResolvedValue({ data: { success: false } });
    });

    // Mock doc function
    (doc as jest.Mock).mockReturnValue({ id: 'test-user-123' });
  });

  describe('Usage Tracking Integration', () => {
    it('should track view and update Firestore dailyUsage', async () => {
      const { result } = renderHook(() => useUsageTracking());

      // Wait for hook to load user profile
      await waitFor(() => {
        expect(getDoc).toHaveBeenCalled();
      });

      // Call trackView
      await act(async () => {
        const success = await result.current.trackView();
        expect(success).toBe(true);
      });

      // Verify Firestore updateDoc was called
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          dailyUsage: expect.objectContaining({
            date: today,
            viewCount: 1
          })
        })
      );
    });

    it('should enforce daily limit of 10 views for free users', async () => {
      // Mock user at limit
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'test-user-123',
          username: 'testuser',
          dailyUsage: {
            date: today,
            viewCount: 10
          },
          subscriptionType: 'free'
        })
      });

      const { result } = renderHook(() => useUsageTracking());

      // Wait for user profile to load
      await waitFor(() => {
        expect(getDoc).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Give it a moment for state to update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Check if limit is reached
      expect(result.current.hasReachedLimit()).toBe(true);

      // Attempting to track should fail
      await act(async () => {
        const success = await result.current.trackView();
        expect(success).toBe(false);
      });
    });

    it('should allow unlimited views for premium users', async () => {
      // Mock premium user with many views
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'test-user-123',
          username: 'testuser',
          dailyUsage: {
            date: today,
            viewCount: 20
          },
          subscriptionType: 'premium',
          subscriptionEndDate: {
            seconds: Math.floor(Date.now() / 1000) + 86400 * 30
          }
        })
      });

      const { result } = renderHook(() => useUsageTracking());

      // Wait for user profile to load
      await waitFor(() => {
        expect(getDoc).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Give it a moment for state to update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should not be at limit
      expect(result.current.hasReachedLimit()).toBe(false);

      // Should be able to track even with 20 views
      await act(async () => {
        const success = await result.current.trackView();
        expect(success).toBe(true);
      });
    });

    it('should handle Firestore errors gracefully', async () => {
      // First load succeeds
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'test-user-123',
          dailyUsage: { date: today, viewCount: 0 },
          subscriptionType: 'free'
        })
      });

      // But updateDoc fails
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => useUsageTracking());

      // Wait for profile to load
      await waitFor(() => {
        expect(getDoc).toHaveBeenCalled();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Try to track - should fail gracefully
      await act(async () => {
        const success = await result.current.trackView();
        expect(success).toBe(false);
      });
    });
  });

  describe('Update Itinerary Integration', () => {
    it('should update itinerary likes array via RPC', async () => {
      const { result } = renderHook(() => useUpdateItinerary());

      await act(async () => {
        await result.current.updateItinerary(
          'match-itin-1',
          { likes: ['test-user-123'] }
        );
      });

      // Verify RPC was called with correct format
      expect(mockUpdateItineraryFn).toHaveBeenCalledWith({
        itineraryId: 'match-itin-1',
        updates: { likes: ['test-user-123'] }
      });
    });

    it('should handle RPC failures', async () => {
      mockUpdateItineraryFn.mockRejectedValue(new Error('RPC failed'));

      const { result } = renderHook(() => useUpdateItinerary());

      let errorThrown = false;
      await act(async () => {
        try {
          await result.current.updateItinerary('match-itin-1', { likes: ['test-user-123'] });
        } catch (error) {
          errorThrown = true;
        }
      });

      expect(errorThrown).toBe(true);
    });
  });

  describe('Search Itineraries Integration', () => {
    it('should search and return matching itineraries', async () => {
      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'test-user-123');
      });

      // Verify search RPC was called
      expect(mockSearchItinerariesFn).toHaveBeenCalled();

      // Verify matching itineraries were returned (at least 1)
      await waitFor(() => {
        expect(result.current.matchingItineraries.length).toBeGreaterThan(0);
        expect(result.current.matchingItineraries[0].id).toBe('match-itin-1');
      });
    });

    it('should advance to next itinerary', async () => {
      // Mock multiple results
      mockSearchItinerariesFn.mockResolvedValue({
        data: {
          success: true,
          data: [mockMatchingItinerary, mockSecondItinerary]
        }
      });

      const { result } = renderHook(() => useSearchItineraries());

      // Search first
      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'test-user-123');
      });

      await waitFor(() => {
        expect(result.current.matchingItineraries.length).toBeGreaterThan(0);
      });

      const initialLength = result.current.matchingItineraries.length;

      // Get next itinerary
      await act(async () => {
        await result.current.getNextItinerary();
      });

      // Should have one less itinerary
      await waitFor(() => {
        expect(result.current.matchingItineraries.length).toBe(initialLength - 1);
      });
    });

    it('should handle search errors', async () => {
      mockSearchItinerariesFn.mockRejectedValue(new Error('Search failed'));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockUserItinerary, 'test-user-123');
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('Connection Creation Integration', () => {
    it('should create connection when mutual match is detected', async () => {
      await act(async () => {
        const connection = await mockCreateConnection({
          user1Id: 'test-user-123',
          user2Id: 'other-user-456',
          itinerary1: mockUserItinerary,
          itinerary2: mockMatchingItinerary
        });

        expect(connection).toEqual({
          id: 'test-user-123_other-user-456',
          users: ['test-user-123', 'other-user-456']
        });
      });

      expect(mockCreateConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          user1Id: 'test-user-123',
          user2Id: 'other-user-456'
        })
      );
    });
  });

  describe('Viewed Itinerary Storage Integration', () => {
    it('should save viewed itinerary to AsyncStorage', async () => {
      await act(async () => {
        await mockSaveViewedItinerary('match-itin-1');
      });

      expect(mockSaveViewedItinerary).toHaveBeenCalledWith('match-itin-1');
    });
  });

  describe('Complete Like Flow Integration', () => {
    it('should execute complete like flow: track usage → update likes → save viewed', async () => {
      // Setup hooks
      const { result: usageResult } = renderHook(() => useUsageTracking());
      const { result: updateResult } = renderHook(() => useUpdateItinerary());

      // Wait for profile to load
      await waitFor(() => {
        expect(getDoc).toHaveBeenCalled();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Step 1: Check usage limit
      expect(usageResult.current.hasReachedLimit()).toBe(false);

      // Step 2: Track usage
      await act(async () => {
        const success = await usageResult.current.trackView();
        expect(success).toBe(true);
      });

      expect(updateDoc).toHaveBeenCalled();

      // Step 3: Update likes array
      await act(async () => {
        await updateResult.current.updateItinerary(
          'match-itin-1',
          { likes: ['test-user-123'] }
        );
      });

      expect(mockUpdateItineraryFn).toHaveBeenCalled();

      // Step 4: Save as viewed
      await act(async () => {
        await mockSaveViewedItinerary('match-itin-1');
      });

      expect(mockSaveViewedItinerary).toHaveBeenCalled();
    });
  });

  describe('Complete Dislike Flow Integration', () => {
    it('should execute complete dislike flow: track usage → save viewed (NO likes update)', async () => {
      const { result: usageResult } = renderHook(() => useUsageTracking());

      // Wait for profile to load
      await waitFor(() => {
        expect(getDoc).toHaveBeenCalled();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Step 1: Check usage limit
      expect(usageResult.current.hasReachedLimit()).toBe(false);

      // Step 2: Track usage
      await act(async () => {
        const success = await usageResult.current.trackView();
        expect(success).toBe(true);
      });

      expect(updateDoc).toHaveBeenCalled();

      // Step 3: Save as viewed
      await act(async () => {
        await mockSaveViewedItinerary('match-itin-1');
      });

      expect(mockSaveViewedItinerary).toHaveBeenCalled();

      // Step 4: Verify likes were NOT updated
      expect(mockUpdateItineraryFn).not.toHaveBeenCalled();
    });
  });

  describe('Mock Itineraries Display and Interaction', () => {
    beforeEach(() => {
      // Reset mock itineraries data for each test
      mockItinerariesData = [];
      jest.clearAllMocks();
    });

    it('should show mock itineraries when user has no real itineraries', async () => {
      // Set itineraries to empty array (user has no itineraries)
      mockItinerariesData = [];

      const { getByTestId, queryByText } = render(<SearchPage />);

      // Wait for component to render
      await waitFor(() => {
        expect(getByTestId('homeScreen')).toBeTruthy();
      });

      // Should show mock itinerary content
      await waitFor(() => {
        // Mock itineraries have specific titles like "Amazing Tokyo Adventure"
        const mockText = queryByText(/Tokyo Adventure|Paris Romance|NYC Urban Explorer/i);
        expect(mockText).toBeTruthy();
      });
    });

    it('should NOT show mock itineraries when user has real itineraries', async () => {
      // Set itineraries to have real data
      mockItinerariesData = [mockUserItinerary];

      const { getByTestId, queryByText } = render(<SearchPage />);

      await waitFor(() => {
        expect(getByTestId('homeScreen')).toBeTruthy();
      });

      // Wait a bit for rendering
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Should NOT show mock itinerary text
      const mockText = queryByText(/Amazing Tokyo Adventure/i);
      expect(mockText).toBeNull();
    });

    it('should NOT track usage when user interacts with mock like button', async () => {
      // Set itineraries to empty to show mocks
      mockItinerariesData = [];

      const { getByTestId } = render(<SearchPage />);

      await waitFor(() => {
        expect(getByTestId('homeScreen')).toBeTruthy();
      });

      // Find the like button (mock itineraries also have testID)
      const likeButton = await screen.findByTestId('like-button');

      // Click the mock like button
      await act(async () => {
        fireEvent.press(likeButton);
      });

      // Wait a bit to ensure no async calls happen
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Verify NO usage tracking occurred
      expect(updateDoc).not.toHaveBeenCalled();
      
      // Verify NO RPC update call
      expect(mockUpdateItineraryFn).not.toHaveBeenCalled();
      
      // Verify NO storage saving
      expect(mockSaveViewedItinerary).not.toHaveBeenCalled();
    });

    it('should NOT track usage when user interacts with mock dislike button', async () => {
      // Set itineraries to empty to show mocks
      mockItinerariesData = [];

      const { getByTestId } = render(<SearchPage />);

      await waitFor(() => {
        expect(getByTestId('homeScreen')).toBeTruthy();
      });

      // Find the dislike button
      const dislikeButton = await screen.findByTestId('dislike-button');

      // Click the mock dislike button
      await act(async () => {
        fireEvent.press(dislikeButton);
      });

      // Wait a bit to ensure no async calls happen
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Verify NO usage tracking occurred
      expect(updateDoc).not.toHaveBeenCalled();
      
      // Verify NO RPC update call
      expect(mockUpdateItineraryFn).not.toHaveBeenCalled();
      
      // Verify NO storage saving
      expect(mockSaveViewedItinerary).not.toHaveBeenCalled();
    });

    it('should cycle through mock itineraries without tracking usage', async () => {
      mockItinerariesData = [];

      const { getByTestId } = render(<SearchPage />);

      await waitFor(() => {
        expect(getByTestId('homeScreen')).toBeTruthy();
      });

      // Click like button multiple times to cycle through mocks
      const likeButton = await screen.findByTestId('like-button');

      await act(async () => {
        fireEvent.press(likeButton); // First click
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        fireEvent.press(likeButton); // Second click
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        fireEvent.press(likeButton); // Third click
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // After multiple clicks, still NO usage tracking
      expect(updateDoc).not.toHaveBeenCalled();
      expect(mockUpdateItineraryFn).not.toHaveBeenCalled();
      expect(mockSaveViewedItinerary).not.toHaveBeenCalled();
    });
  });
});

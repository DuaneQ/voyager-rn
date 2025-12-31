/**
 * Unit Tests for useUsageTracking Hook
 * Tests daily usage limits, premium validation, and Firestore integration
 * Follows React hooks testing best practices
 */

import { renderHook, act, waitFor, cleanup } from '@testing-library/react-native';

// Mock Firebase Firestore BEFORE importing the hook so the hook picks up the
// mocked functions at module-import time.
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((db, collection, id) => ({ collection, id })),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

// Ensure centralized firebaseConfig mock is applied before importing the hook
jest.mock('../../config/firebaseConfig');

import * as firestore from 'firebase/firestore';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { setMockUser, clearMockUser } from '../../testUtils/mockAuth';

describe('useUsageTracking', () => {
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const getYesterdayString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const mockFreeUser = {
    username: 'freeuser',
    email: 'free@example.com',
    subscriptionType: 'free',
    dailyUsage: {
      date: getTodayString(),
      viewCount: 3,
      aiItineraries: { date: getTodayString(), count: 2 },
    },
  };

  const mockPremiumUser = {
    username: 'premiumuser',
    email: 'premium@example.com',
    subscriptionType: 'premium',
    subscriptionEndDate: {
      seconds: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
      nanoseconds: 0,
    },
    dailyUsage: {
      date: getTodayString(),
      viewCount: 15,
      aiItineraries: { date: getTodayString(), count: 10 },
    },
  };

  const mockExpiredPremiumUser = {
    ...mockPremiumUser,
    subscriptionEndDate: {
      seconds: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
      nanoseconds: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    // Ensure mocked auth reports an authenticated test user by default
    setMockUser();
    
    // Reset mocks and restore implementations
    (firestore.getDoc as jest.Mock).mockReset();
    (firestore.updateDoc as jest.Mock).mockReset();
    // Restore doc implementation (gets cleared by resetAllMocks)
    (firestore.doc as jest.Mock).mockImplementation((db, collection, id) => ({ collection, id }));
  });

  afterEach(async () => {
    // Force synchronous cleanup
    cleanup();
    
    // Clear all timers
    jest.clearAllTimers();
    
    // Wait for pending operations
    await new Promise(resolve => setImmediate(resolve));
    
    clearMockUser();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });

      const { result } = renderHook(() => useUsageTracking());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.dailyViewCount).toBe(0);
      expect(result.current.dailyAICount).toBe(0);
      expect(typeof result.current.trackView).toBe('function');
      expect(typeof result.current.hasPremium).toBe('function');
      expect(typeof result.current.hasReachedLimit).toBe('function');
    });

    it('should load user profile on mount', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.userProfile?.username).toBe('freeuser');
      expect(result.current.dailyViewCount).toBe(3);
      expect(result.current.dailyAICount).toBe(2);
    });

    it('should handle missing user profile', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(firestore.getDoc).toHaveBeenCalled();
      });

      expect(result.current.userProfile).toBeNull();
    });
  });

  describe('Premium Validation', () => {
    it('should identify premium user with valid subscription', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockPremiumUser,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasPremium()).toBe(true);
    });

    it('should reject expired premium subscription', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockExpiredPremiumUser,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasPremium()).toBe(false);
    });

    it('should reject free user as non-premium', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasPremium()).toBe(false);
    });

    it('should handle missing subscription end date', async () => {
      const userWithoutEndDate = {
        ...mockPremiumUser,
        subscriptionEndDate: null,
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userWithoutEndDate,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasPremium()).toBe(false);
    });

    it('should handle Firestore Timestamp with toDate method', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30);
      const userWithTimestamp = {
        ...mockPremiumUser,
        subscriptionEndDate: {
          toDate: () => futureDate,
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userWithTimestamp,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasPremium()).toBe(true);
    });

    it('should handle invalid date format', async () => {
      const userWithInvalidDate = {
        ...mockPremiumUser,
        subscriptionEndDate: 'invalid-date',
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userWithInvalidDate,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasPremium()).toBe(false);
    });
  });

  describe('Daily View Tracking', () => {
    it('should track view successfully for free user', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'users' }),
        {
          dailyUsage: expect.objectContaining({
            date: getTodayString(),
            viewCount: 4, // 3 + 1
          }),
        }
      );
    });

    it('should prevent tracking when limit reached', async () => {
      const userAtLimit = {
        ...mockFreeUser,
        dailyUsage: {
          date: getTodayString(),
          viewCount: 10, // At limit
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userAtLimit,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasReachedLimit()).toBe(true);

      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(false);
      expect(firestore.updateDoc).not.toHaveBeenCalled();
    });

    it('should allow premium user to track beyond limit', async () => {
      const premiumAtLimit = {
        ...mockPremiumUser,
        dailyUsage: {
          date: getTodayString(),
          viewCount: 15, // Beyond free limit
        },
      };

      // Mock getDoc to return premium user data both on initial load and when trackView calls it
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => premiumAtLimit,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasReachedLimit()).toBe(false);

      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(true);
      // trackView returns true immediately for premium users WITHOUT updating Firestore
      expect(firestore.getDoc).toHaveBeenCalledTimes(2); // Once on mount, once in trackView
      expect(firestore.updateDoc).not.toHaveBeenCalled(); // Premium users don't update usage
    });

    it('should reset count for new day', async () => {
      const userYesterday = {
        ...mockFreeUser,
        dailyUsage: {
          date: getYesterdayString(),
          viewCount: 10,
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userYesterday,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasReachedLimit()).toBe(false);

      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'users' }),
        {
          dailyUsage: expect.objectContaining({
            date: getTodayString(),
            viewCount: 1, // Reset to 1
          }),
        }
      );
    });

    it('should handle Firestore errors during tracking', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });
      (firestore.updateDoc as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error tracking view:', expect.any(Error));
    });

    it('should handle missing user profile during tracking', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(firestore.getDoc).toHaveBeenCalled();
      });

      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(false);
      // trackView now just returns false without logging when profile doesn't exist
    });
  });

  describe('AI Creation Tracking', () => {
    it('should track AI creation for free user', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      let success;
      await act(async () => {
        success = await result.current.trackAICreation();
      });

      expect(success).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'users' }),
        {
          ['dailyUsage.aiItineraries']: expect.objectContaining({
              date: getTodayString(),
              count: 3, // 2 + 1
          }),
        }
      );
    });

    it('should prevent AI creation when limit reached for free user', async () => {
      const userAtAILimit = {
        ...mockFreeUser,
        dailyUsage: {
          ...mockFreeUser.dailyUsage,
          aiItineraries: {
            date: getTodayString(),
            count: 5, // At free limit
          },
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userAtAILimit,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasReachedAILimit()).toBe(true);

      let success;
      await act(async () => {
        success = await result.current.trackAICreation();
      });

      expect(success).toBe(false);
      expect(firestore.updateDoc).not.toHaveBeenCalled();
    });

    it('should allow premium user higher AI limit', async () => {
      const premiumUser = {
        ...mockPremiumUser,
        dailyUsage: {
          ...mockPremiumUser.dailyUsage,
          aiItineraries: {
            date: getTodayString(),
            count: 10, // Beyond free limit, but within premium limit
          },
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => premiumUser,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasReachedAILimit()).toBe(false);

      let success;
      await act(async () => {
        success = await result.current.trackAICreation();
      });

      expect(success).toBe(true);
    });

    it('should prevent premium user at premium limit', async () => {
      const premiumAtLimit = {
        ...mockPremiumUser,
        dailyUsage: {
          ...mockPremiumUser.dailyUsage,
          aiItineraries: {
            date: getTodayString(),
            count: 20, // At premium limit
          },
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => premiumAtLimit,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.hasReachedAILimit()).toBe(true);

      let success;
      await act(async () => {
        success = await result.current.trackAICreation();
      });

      expect(success).toBe(false);
    });

    it('should calculate remaining AI creations correctly', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.getRemainingAICreations()).toBe(3); // 5 - 2
    });

    it('should calculate remaining AI creations for premium user', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockPremiumUser,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.getRemainingAICreations()).toBe(10); // 20 - 10
    });

    it('should reset AI count for new day', async () => {
      const userYesterday = {
        ...mockFreeUser,
        dailyUsage: {
          date: getYesterdayString(),
          viewCount: 5,
          aiItineraries: {
            date: getYesterdayString(),
            count: 5,
          },
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userYesterday,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.getRemainingAICreations()).toBe(5); // Full limit

      let success;
      await act(async () => {
        success = await result.current.trackAICreation();
      });

      expect(success).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          ['dailyUsage.aiItineraries']: expect.objectContaining({
              date: getTodayString(),
              count: 1, // Reset to 1
          }),
        }
      );
    });
  });

  describe('Loading State', () => {
    it('should set loading during view tracking', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });
      
      let resolveUpdate: () => void;
      const updatePromise = new Promise<void>(resolve => {
        resolveUpdate = resolve;
      });
      (firestore.updateDoc as jest.Mock).mockImplementation(() => updatePromise);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Start tracking WITHOUT act (so we can check loading mid-operation)
      const trackPromise = result.current.trackView();

      // Check loading becomes true
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Now resolve and complete
      resolveUpdate!();
      await act(async () => {
        await trackPromise;
      });

      // Check loading returns to false
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading during AI tracking', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });
      
      let resolveUpdate: () => void;
      const updatePromise = new Promise<void>(resolve => {
        resolveUpdate = resolve;
      });
      (firestore.updateDoc as jest.Mock).mockImplementation(() => updatePromise);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Start tracking WITHOUT act
      const trackPromise = result.current.trackAICreation();

      // Check loading becomes true
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve and complete
      resolveUpdate!();
      await act(async () => {
        await trackPromise;
      });

      // Ensure state fully settles
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined userId', async () => {
      const authModule = require('../../config/firebaseConfig');
      authModule.auth.currentUser = null;

      const { result } = renderHook(() => useUsageTracking());

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current.userProfile).toBeNull();
      });

      // Restore
      authModule.auth.currentUser = { uid: 'test-user-123' };
    });

    it('should handle missing dailyUsage in profile', async () => {
      const userWithoutUsage = {
        username: 'testuser',
        email: 'test@example.com',
        subscriptionType: 'free',
        // No dailyUsage field
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userWithoutUsage,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Wait for derived state to update
      await waitFor(() => {
        expect(result.current.dailyViewCount).toBe(0);
      });

      expect(result.current.hasReachedLimit()).toBe(false);
      expect(result.current.dailyAICount).toBe(0);

      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          dailyUsage: expect.objectContaining({
            date: getTodayString(),
            viewCount: 1,
          }),
        })
      );
    });

    it('should return 0 remaining when no user profile', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(firestore.getDoc).toHaveBeenCalled();
      });

      // Wait for state to fully settle
      await waitFor(() => {
        expect(result.current.userProfile).toBeNull();
      });

      expect(result.current.getRemainingAICreations()).toBe(0);
    });

    it('should handle Firestore profile load error', async () => {
      (firestore.getDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error loading user profile:', expect.any(Error));
      });

      // Wait for state to settle after error
      await waitFor(() => {
        expect(result.current.userProfile).toBeNull();
      });
    });
  });

  describe('Stale Data Race Condition Tests', () => {
    it('should fetch fresh data before enforcing limit in trackView', async () => {
      // Initial state: user has 3 views
      const userWith3Views = {
        ...mockFreeUser,
        dailyUsage: {
          date: getTodayString(),
          viewCount: 3,
        },
      };

      // Updated state: user now has 10 views (at limit)
      const userWith10Views = {
        ...mockFreeUser,
        dailyUsage: {
          date: getTodayString(),
          viewCount: 10,
        },
      };

      // First call (on mount): return 3 views
      // Second call (in trackView): return 10 views (simulating external update)
      let callCount = 0;
      (firestore.getDoc as jest.Mock).mockImplementation(() => {
        callCount++;
        const userData = callCount === 1 ? userWith3Views : userWith10Views;
        return Promise.resolve({
          exists: () => true,
          data: () => userData,
        });
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Local state shows 3 views, but Firestore has 10
      expect(result.current.dailyViewCount).toBe(3);
      expect(result.current.hasReachedLimit()).toBe(false); // Based on stale local state

      // trackView should fetch fresh data and detect the limit
      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      // Should be blocked because fresh data shows 10 views
      expect(success).toBe(false);
      expect(firestore.getDoc).toHaveBeenCalledTimes(2); // Once on mount, once in trackView
      expect(firestore.updateDoc).not.toHaveBeenCalled(); // Should not update
      
      // Wait for all state updates to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle race condition when user edits Firestore directly', async () => {
      // Simulates: user manually sets viewCount to 10 in Firestore
      // while app still has old state with viewCount=5
      const initialUser = {
        ...mockFreeUser,
        dailyUsage: {
          date: getTodayString(),
          viewCount: 5,
        },
      };

      const updatedUser = {
        ...mockFreeUser,
        dailyUsage: {
          date: getTodayString(),
          viewCount: 10, // Manually edited to limit
        },
      };

      // Mock sequence: initial load shows 5, trackView fetches fresh 10
      let callCount = 0;
      (firestore.getDoc as jest.Mock).mockImplementation(() => {
        callCount++;
        const userData = callCount === 1 ? initialUser : updatedUser;
        return Promise.resolve({
          exists: () => true,
          data: () => userData,
        });
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.dailyViewCount).toBe(5);

      // Try to track - should fetch fresh data and be blocked
      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(false);
      expect(firestore.updateDoc).not.toHaveBeenCalled();
    });

    it('should use fresh data even if refreshProfile was just called', async () => {
      // Simulates SearchPage calling refreshProfile then immediately tracking
      const user9Views = {
        ...mockFreeUser,
        dailyUsage: {
          date: getTodayString(),
          viewCount: 9,
        },
      };

      const user10Views = {
        ...mockFreeUser,
        dailyUsage: {
          date: getTodayString(),
          viewCount: 10,
        },
      };

      // Mock: refreshProfile gets 9, but trackView gets 10 (another tab/device incremented)
      let callCount = 0;
      (firestore.getDoc as jest.Mock).mockImplementation(() => {
        callCount++;
        // Call 1: initial load (9 views)
        // Call 2: refreshProfile (9 views)
        // Call 3: trackView (10 views - updated by other device)
        const userData = callCount <= 2 ? user9Views : user10Views;
        return Promise.resolve({
          exists: () => true,
          data: () => userData,
        });
      });

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Simulate refreshProfile call
      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(result.current.dailyViewCount).toBe(9);

      // Now try to track - should get fresh data showing 10
      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(false); // Blocked due to fresh data
      expect(firestore.getDoc).toHaveBeenCalledTimes(3);
      
      // Wait for state to settle
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should allow tracking if fresh data shows under limit', async () => {
      const userUnderLimit = {
        ...mockFreeUser,
        dailyUsage: {
          date: getTodayString(),
          viewCount: 8,
        },
      };

      (firestore.getDoc as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          exists: () => true,
          data: () => userUnderLimit,
        })
      );
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'users' }),
        {
          dailyUsage: expect.objectContaining({
            date: getTodayString(),
            viewCount: 9, // Incremented from 8
          }),
        }
      );
      
      // Wait for state to settle
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle premium user with stale local state', async () => {
      // Local state shows expired premium, but fresh data shows active premium
      const expiredPremium = {
        ...mockPremiumUser,
        subscriptionEndDate: {
          seconds: Math.floor(Date.now() / 1000) - 86400, // Expired
          nanoseconds: 0,
        },
        dailyUsage: {
          date: getTodayString(),
          viewCount: 15,
        },
      };

      const activePremium = {
        ...mockPremiumUser,
        subscriptionEndDate: {
          seconds: Math.floor(Date.now() / 1000) + 86400 * 30, // Active
          nanoseconds: 0,
        },
        dailyUsage: {
          date: getTodayString(),
          viewCount: 15,
        },
      };

      // First call: expired premium, second call: active premium
      let callCount = 0;
      (firestore.getDoc as jest.Mock).mockImplementation(() => {
        callCount++;
        const userData = callCount === 1 ? expiredPremium : activePremium;
        return Promise.resolve({
          exists: () => true,
          data: () => userData,
        });
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Local state shows expired
      expect(result.current.hasPremium()).toBe(false);

      // trackView should fetch fresh data and allow tracking
      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(true); // Premium user can track
      expect(firestore.updateDoc).not.toHaveBeenCalled(); // Premium users don't update count
      
      // Wait for all state updates
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should prevent double-increment with rapid successive calls', async () => {
      const user5Views = {
        ...mockFreeUser,
        dailyUsage: {
          date: getTodayString(),
          viewCount: 5,
        },
      };

      (firestore.getDoc as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          exists: () => true,
          data: () => user5Views,
        })
      );
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Make two rapid calls
      let success1, success2;
      await act(async () => {
        const promise1 = result.current.trackView();
        const promise2 = result.current.trackView();
        [success1, success2] = await Promise.all([promise1, promise2]);
      });

      // Both should succeed (each fetches fresh data independently)
      expect(success1).toBe(true);
      expect(success2).toBe(true);
      
      // Both should call updateDoc (Firebase handles race condition with transactions if needed)
      expect(firestore.updateDoc).toHaveBeenCalledTimes(2);
      
      // Wait for all operations to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Date Boundary Tests - Daily Reset', () => {
    it('should allow view tracking on new day after reaching limit on previous day', async () => {
      // User reached limit (10 views) yesterday
      const userYesterdayLimit = {
        username: 'testuser',
        email: 'test@example.com',
        subscriptionType: 'free',
        dailyUsage: {
          date: getYesterdayString(),
          viewCount: 10, // Hit the limit yesterday
          aiItineraries: {
            date: getYesterdayString(),
            count: 0,
          },
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userYesterdayLimit,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Should NOT be limited because it's a new day
      expect(result.current.hasReachedLimit()).toBe(false);
      expect(result.current.userProfile?.dailyUsage?.viewCount).toBe(10);
      expect(result.current.userProfile?.dailyUsage?.date).toBe(getYesterdayString());

      // Should successfully track view on new day
      let success;
      await act(async () => {
        success = await result.current.trackView();
      });

      expect(success).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          dailyUsage: expect.objectContaining({
            date: getTodayString(), // Reset to today
            viewCount: 1, // Reset to 1
          }),
        }
      );
    });

    it('should allow AI creation on new day after reaching limit on previous day', async () => {
      // User reached AI limit (5 creations) yesterday
      const userYesterdayAILimit = {
        username: 'testuser',
        email: 'test@example.com',
        subscriptionType: 'free',
        dailyUsage: {
          date: getYesterdayString(),
          viewCount: 3,
          aiItineraries: {
            date: getYesterdayString(),
            count: 5, // Hit the AI limit yesterday
          },
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userYesterdayAILimit,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Should NOT be limited because it's a new day
      expect(result.current.hasReachedAILimit()).toBe(false);
      expect(result.current.getRemainingAICreations()).toBe(5); // Full limit available

      // Should successfully track AI creation on new day
      let success;
      await act(async () => {
        success = await result.current.trackAICreation();
      });

      expect(success).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          ['dailyUsage.aiItineraries']: expect.objectContaining({
            date: getTodayString(), // Reset to today
            count: 1, // Reset to 1
          }),
        }
      );
    });

    it('should handle multiple days with limit - user hits limit two days in a row', async () => {
      // Day 1: User hits AI limit
      const userDay1Limit = {
        username: 'testuser',
        email: 'test@example.com',
        subscriptionType: 'free',
        dailyUsage: {
          date: getYesterdayString(),
          viewCount: 8,
          aiItineraries: {
            date: getYesterdayString(),
            count: 5, // Hit limit on day 1
          },
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userDay1Limit,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Day 2: Should be able to create AI itineraries again
      expect(result.current.hasReachedAILimit()).toBe(false);

      // Create 5 AI itineraries on day 2
      for (let i = 1; i <= 5; i++) {
        // Mock fresh data showing current count
        const userDay2Progress = {
          ...userDay1Limit,
          dailyUsage: {
            ...userDay1Limit.dailyUsage,
            aiItineraries: {
              date: getTodayString(),
              count: i - 1, // Current count before this creation
            },
          },
        };

        (firestore.getDoc as jest.Mock).mockResolvedValue({
          exists: () => true,
          data: () => userDay2Progress,
        });

        let success;
        await act(async () => {
          success = await result.current.trackAICreation();
        });

        expect(success).toBe(true);
      }

      // After 5 creations on day 2, should now be limited
      const userDay2Limit = {
        ...userDay1Limit,
        dailyUsage: {
          ...userDay1Limit.dailyUsage,
          aiItineraries: {
            date: getTodayString(),
            count: 5, // Hit limit on day 2
          },
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userDay2Limit,
      });

      // Refresh profile to get latest data
      await act(async () => {
        await result.current.refreshProfile();
      });

      await waitFor(() => {
        expect(result.current.hasReachedAILimit()).toBe(true);
      });

      expect(result.current.getRemainingAICreations()).toBe(0);
    });

    it('should allow both view and AI tracking on new day after hitting both limits', async () => {
      // User hit both limits yesterday
      const userYesterdayBothLimits = {
        username: 'testuser',
        email: 'test@example.com',
        subscriptionType: 'free',
        dailyUsage: {
          date: getYesterdayString(),
          viewCount: 10, // Hit view limit
          aiItineraries: {
            date: getYesterdayString(),
            count: 5, // Hit AI limit
          },
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userYesterdayBothLimits,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Both limits should be reset for new day
      expect(result.current.hasReachedLimit()).toBe(false);
      expect(result.current.hasReachedAILimit()).toBe(false);
      expect(result.current.getRemainingAICreations()).toBe(5);

      // Should successfully track view on new day
      let viewSuccess;
      await act(async () => {
        viewSuccess = await result.current.trackView();
      });
      expect(viewSuccess).toBe(true);

      // Should successfully track AI creation on new day
      let aiSuccess;
      await act(async () => {
        aiSuccess = await result.current.trackAICreation();
      });
      expect(aiSuccess).toBe(true);

      // Verify both were reset to new day
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          dailyUsage: expect.objectContaining({
            date: getTodayString(),
            viewCount: 1,
          }),
        }
      );

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          ['dailyUsage.aiItineraries']: expect.objectContaining({
            date: getTodayString(),
            count: 1,
          }),
        }
      );
    });

    it('should handle premium user with expired limits from previous day', async () => {
      // Premium user had limits yesterday (shouldn't happen but testing edge case)
      const premiumUserYesterdayLimits = {
        username: 'premiumuser',
        email: 'premium@example.com',
        subscriptionType: 'premium',
        subscriptionEndDate: { toDate: () => new Date('2026-12-31') },
        dailyUsage: {
          date: getYesterdayString(),
          viewCount: 10,
          aiItineraries: {
            date: getYesterdayString(),
            count: 5,
          },
        },
      };

      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => premiumUserYesterdayLimits,
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Premium users should never be limited regardless of date
      expect(result.current.hasReachedLimit()).toBe(false);
      expect(result.current.hasReachedAILimit()).toBe(false);
      expect(result.current.hasPremium()).toBe(true);

      // Premium users don't track usage (unlimited)
      let success;
      await act(async () => {
        success = await result.current.trackView();
      });
      expect(success).toBe(true);
      expect(firestore.updateDoc).not.toHaveBeenCalled(); // Premium users don't update Firestore
    });
  });
});

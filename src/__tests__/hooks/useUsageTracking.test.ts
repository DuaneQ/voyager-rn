/**
 * Unit Tests for useUsageTracking Hook
 * Tests daily usage limits, premium validation, and Firestore integration
 * Follows React hooks testing best practices
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

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
  });

  afterEach(() => {
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
        expect.anything(),
        expect.objectContaining({
          dailyUsage: expect.objectContaining({
            date: getTodayString(),
            viewCount: 4, // 3 + 1
          }),
        })
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
      expect(firestore.updateDoc).toHaveBeenCalled();
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
        expect.anything(),
        expect.objectContaining({
          dailyUsage: expect.objectContaining({
            date: getTodayString(),
            viewCount: 1, // Reset to 1
          }),
        })
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
      expect(console.error).toHaveBeenCalledWith('No user ID or profile found');
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
        expect.anything(),
        expect.objectContaining({
          dailyUsage: expect.objectContaining({
            aiItineraries: expect.objectContaining({
              date: getTodayString(),
              count: 3, // 2 + 1
            }),
          }),
        })
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
        expect.objectContaining({
          dailyUsage: expect.objectContaining({
            aiItineraries: expect.objectContaining({
              date: getTodayString(),
              count: 1, // Reset to 1
            }),
          }),
        })
      );
    });
  });

  describe('Loading State', () => {
    it('should set loading during view tracking', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });
      (firestore.updateDoc as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      act(() => {
        result.current.trackView();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading during AI tracking', async () => {
      (firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockFreeUser,
      });
      (firestore.updateDoc as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      act(() => {
        result.current.trackAICreation();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined userId', async () => {
      const authModule = require('../../config/firebaseConfig');
      authModule.auth.currentUser = null;

      const { result } = renderHook(() => useUsageTracking());

      expect(result.current.userProfile).toBeNull();

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

      expect(result.current.hasReachedLimit()).toBe(false);
      expect(result.current.dailyViewCount).toBe(0);
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

      expect(result.current.getRemainingAICreations()).toBe(0);
    });

    it('should handle Firestore profile load error', async () => {
      (firestore.getDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => useUsageTracking());

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error loading user profile:', expect.any(Error));
      });

      expect(result.current.userProfile).toBeNull();
    });
  });
});

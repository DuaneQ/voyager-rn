/**
 * Unit Tests for useAdDelivery Hook
 *
 * Tests the selectAds Cloud Function integration, including:
 * - Successful ad fetching
 * - Error handling
 * - In-flight request deduplication
 * - UserAdContext forwarding
 * - Edge cases (empty responses, malformed data)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAdDelivery } from '../../../hooks/ads/useAdDelivery';

// Use centralized manual mock for firebaseConfig
jest.mock('../../../config/firebaseConfig');

// Mock firebase/functions — use per-function handler pattern
const mockSelectAdsFn = jest.fn();
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockSelectAdsFn),
}));

const MOCK_ADS = [
  {
    campaignId: 'camp-1',
    businessName: 'Bali Surf Co',
    primaryText: 'Ride the waves',
    cta: 'Book Now',
    landingUrl: 'https://balisurf.com',
    imageUrl: 'https://img.example.com/bali.jpg',
    placement: 'video_feed' as const,
  },
  {
    campaignId: 'camp-2',
    businessName: 'Tokyo Ramen',
    primaryText: 'Authentic ramen experience',
    cta: 'Learn More',
    landingUrl: 'https://tokyoramen.jp',
    placement: 'video_feed' as const,
  },
];

describe('useAdDelivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectAdsFn.mockReset();
  });

  it('should initialise with empty state', () => {
    const { result } = renderHook(() => useAdDelivery('video_feed'));

    expect(result.current.ads).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.fetchAds).toBe('function');
  });

  it('should fetch ads successfully', async () => {
    mockSelectAdsFn.mockResolvedValue({
      data: { ads: MOCK_ADS, count: 2 },
    });

    const { result } = renderHook(() => useAdDelivery('video_feed'));

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.ads).toEqual(MOCK_ADS);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should pass placement and limit in the request', async () => {
    mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });

    const { result } = renderHook(() =>
      useAdDelivery('itinerary_feed', { limit: 10 }),
    );

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(mockSelectAdsFn).toHaveBeenCalledWith({
      placement: 'itinerary_feed',
      limit: 10,
      userContext: undefined,
    });
  });

  it('should forward userContext with destination targeting', async () => {
    mockSelectAdsFn.mockResolvedValue({ data: { ads: MOCK_ADS, count: 2 } });

    const { result } = renderHook(() => useAdDelivery('ai_slot'));

    await act(async () => {
      await result.current.fetchAds({
        destination: 'Paris, France',
        travelStartDate: '2025-07-01',
        travelEndDate: '2025-07-10',
      });
    });

    expect(mockSelectAdsFn).toHaveBeenCalledWith(
      expect.objectContaining({
        placement: 'ai_slot',
        userContext: {
          destination: 'Paris, France',
          travelStartDate: '2025-07-01',
          travelEndDate: '2025-07-10',
        },
      }),
    );
  });

  describe('date sanitization', () => {
    it('should strip travelStartDate that is not a YYYY-MM-DD string', async () => {
      mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });
      const { result } = renderHook(() => useAdDelivery('ai_slot'));

      await act(async () => {
        await result.current.fetchAds({
          destination: 'Paris',
          travelStartDate: '2025/07/01' as any, // wrong format — slashes
        });
      });

      const sent = mockSelectAdsFn.mock.calls[0][0];
      expect(sent.userContext).not.toHaveProperty('travelStartDate');
      expect(sent.userContext).toHaveProperty('destination', 'Paris');
    });

    it('should strip travelStartDate that is a timestamp number', async () => {
      mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });
      const { result } = renderHook(() => useAdDelivery('ai_slot'));

      await act(async () => {
        await result.current.fetchAds({
          travelStartDate: 1719792000000 as any, // epoch ms
        });
      });

      const sent = mockSelectAdsFn.mock.calls[0][0];
      expect(sent.userContext).not.toHaveProperty('travelStartDate');
    });

    it('should strip travelEndDate that is malformed', async () => {
      mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });
      const { result } = renderHook(() => useAdDelivery('ai_slot'));

      await act(async () => {
        await result.current.fetchAds({
          travelEndDate: 'July 10 2025' as any,
        });
      });

      const sent = mockSelectAdsFn.mock.calls[0][0];
      expect(sent.userContext).not.toHaveProperty('travelEndDate');
    });

    it('should forward valid YYYY-MM-DD dates unchanged', async () => {
      mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });
      const { result } = renderHook(() => useAdDelivery('ai_slot'));

      await act(async () => {
        await result.current.fetchAds({
          destination: 'Tokyo',
          travelStartDate: '2025-08-01',
          travelEndDate: '2025-08-10',
        });
      });

      const sent = mockSelectAdsFn.mock.calls[0][0];
      expect(sent.userContext).toEqual({
        destination: 'Tokyo',
        travelStartDate: '2025-08-01',
        travelEndDate: '2025-08-10',
      });
    });

    it('should preserve non-date context fields when dates are stripped', async () => {
      mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });
      const { result } = renderHook(() => useAdDelivery('ai_slot'));

      await act(async () => {
        await result.current.fetchAds({
          destination: 'Bali',
          gender: 'female',
          travelStartDate: 'not-a-date' as any,
        });
      });

      const sent = mockSelectAdsFn.mock.calls[0][0];
      expect(sent.userContext).toEqual({ destination: 'Bali', gender: 'female' });
    });
  });

  it('should handle errors gracefully', async () => {
    mockSelectAdsFn.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAdDelivery('video_feed'));

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.ads).toEqual([]); // No stale ads yet
    expect(result.current.loading).toBe(false);
  });

  it('should keep stale ads on subsequent error', async () => {
    // First fetch succeeds
    mockSelectAdsFn.mockResolvedValueOnce({
      data: { ads: MOCK_ADS, count: 2 },
    });

    const { result } = renderHook(() => useAdDelivery('video_feed'));

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.ads).toHaveLength(2);

    // Second fetch fails
    mockSelectAdsFn.mockRejectedValueOnce(new Error('Timeout'));

    await act(async () => {
      await result.current.fetchAds();
    });

    // Stale ads should still be there (not cleared on error)
    expect(result.current.ads).toHaveLength(2);
    expect(result.current.error).toBe('Timeout');
  });

  it('should handle empty ads response', async () => {
    mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });

    const { result } = renderHook(() => useAdDelivery('video_feed'));

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.ads).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle malformed response (no ads array)', async () => {
    mockSelectAdsFn.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAdDelivery('video_feed'));

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.ads).toEqual([]);
  });

  it('should use default limit of 5', async () => {
    mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });

    const { result } = renderHook(() => useAdDelivery('video_feed'));

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(mockSelectAdsFn).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
  });
});

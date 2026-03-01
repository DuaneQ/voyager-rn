/**
 * Unit Tests for useAdTracking Hook
 *
 * Tests batched event tracking including:
 * - Impression deduplication per session
 * - Click tracking
 * - Quartile tracking
 * - Manual flush
 * - Silent error handling (no re-enqueue)
 * - Event timestamps
 */

import { renderHook, act } from '@testing-library/react-native';
import { useAdTracking } from '../../../hooks/ads/useAdTracking';

// Use centralized manual mock for firebaseConfig
jest.mock('../../../config/firebaseConfig');

// Mock firebase/functions
const mockLogAdEventsFn = jest.fn();
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockLogAdEventsFn),
}));

describe('useAdTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogAdEventsFn.mockResolvedValue({
      data: { processed: 1, skipped: 0 },
    });
  });

  describe('trackImpression', () => {
    it('should buffer an impression event', () => {
      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackImpression('camp-1');
      });

      // Nothing sent yet — still in buffer
      expect(mockLogAdEventsFn).not.toHaveBeenCalled();
    });

    it('should deduplicate impressions for the same campaignId', async () => {
      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackImpression('camp-1');
        result.current.trackImpression('camp-1');
        result.current.trackImpression('camp-1');
      });

      // Flush to check what was buffered
      await act(async () => {
        await result.current.flush();
      });

      // Only one impression should be sent
      const call = mockLogAdEventsFn.mock.calls[0][0];
      const impressionEvents = call.events.filter(
        (e: any) => e.type === 'impression',
      );
      expect(impressionEvents).toHaveLength(1);
      expect(impressionEvents[0].campaignId).toBe('camp-1');
    });

    it('should track different campaignIds separately', async () => {
      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackImpression('camp-1');
        result.current.trackImpression('camp-2');
        result.current.trackImpression('camp-3');
      });

      await act(async () => {
        await result.current.flush();
      });

      const call = mockLogAdEventsFn.mock.calls[0][0];
      expect(call.events).toHaveLength(3);
    });

    it('should ignore empty campaignId', async () => {
      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackImpression('');
      });

      await act(async () => {
        await result.current.flush();
      });

      // flush is a no-op when buffer is empty
      expect(mockLogAdEventsFn).not.toHaveBeenCalled();
    });
  });

  describe('trackClick', () => {
    it('should buffer a click event', async () => {
      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackClick('camp-1');
      });

      await act(async () => {
        await result.current.flush();
      });

      const call = mockLogAdEventsFn.mock.calls[0][0];
      expect(call.events).toHaveLength(1);
      expect(call.events[0].type).toBe('click');
      expect(call.events[0].campaignId).toBe('camp-1');
    });

    it('should NOT deduplicate clicks (user can click multiple times)', async () => {
      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackClick('camp-1');
        result.current.trackClick('camp-1');
      });

      await act(async () => {
        await result.current.flush();
      });

      const call = mockLogAdEventsFn.mock.calls[0][0];
      const clickEvents = call.events.filter((e: any) => e.type === 'click');
      expect(clickEvents).toHaveLength(2);
    });

    it('should ignore empty campaignId', async () => {
      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackClick('');
      });

      await act(async () => {
        await result.current.flush();
      });

      expect(mockLogAdEventsFn).not.toHaveBeenCalled();
    });
  });

  describe('trackQuartile', () => {
    it('should buffer a video_quartile event with quartile value', async () => {
      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackQuartile('camp-1', 25);
      });

      await act(async () => {
        await result.current.flush();
      });

      const call = mockLogAdEventsFn.mock.calls[0][0];
      expect(call.events).toHaveLength(1);
      expect(call.events[0].type).toBe('video_quartile');
      expect(call.events[0].quartile).toBe(25);
    });
  });

  describe('flush', () => {
    it('should be a no-op when buffer is empty', async () => {
      const { result } = renderHook(() => useAdTracking());

      await act(async () => {
        await result.current.flush();
      });

      expect(mockLogAdEventsFn).not.toHaveBeenCalled();
    });

    it('should send all buffered events in one call', async () => {
      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackImpression('camp-1');
        result.current.trackClick('camp-2');
        result.current.trackQuartile('camp-3', 50);
      });

      await act(async () => {
        await result.current.flush();
      });

      expect(mockLogAdEventsFn).toHaveBeenCalledTimes(1);
      const call = mockLogAdEventsFn.mock.calls[0][0];
      expect(call.events).toHaveLength(3);
    });

    it('should clear the buffer after flush', async () => {
      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackImpression('camp-1');
      });

      await act(async () => {
        await result.current.flush();
      });

      expect(mockLogAdEventsFn).toHaveBeenCalledTimes(1);

      // Second flush should be a no-op
      await act(async () => {
        await result.current.flush();
      });

      expect(mockLogAdEventsFn).toHaveBeenCalledTimes(1);
    });

    it('should silently handle server errors', async () => {
      mockLogAdEventsFn.mockRejectedValue(new Error('Server 500'));

      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackClick('camp-1');
      });

      // Should not throw
      await act(async () => {
        await result.current.flush();
      });

      // Events should be dropped, not re-enqueued
      await act(async () => {
        await result.current.flush();
      });

      expect(mockLogAdEventsFn).toHaveBeenCalledTimes(1); // only the failed call
    });
  });

  describe('event timestamps', () => {
    it('should include client-side timestamp on all events', async () => {
      const now = 1700000000000;
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => now);

      const { result } = renderHook(() => useAdTracking());

      act(() => {
        result.current.trackImpression('camp-1');
      });

      await act(async () => {
        await result.current.flush();
      });

      const event = mockLogAdEventsFn.mock.calls[0][0].events[0];
      expect(event.timestamp).toBe(now);

      Date.now = originalDateNow;
    });
  });
});

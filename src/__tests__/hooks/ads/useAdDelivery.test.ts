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

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAdDelivery, clearAdsCache, filterExpiredAds } from '../../../hooks/ads/useAdDelivery';
import { AdSeenProvider, useAdSeen } from '../../../context/AdSeenContext';

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
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(AdSeenProvider, null, children);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectAdsFn.mockReset();
    // Reset the module-level session cache so tests start with a clean slate
    clearAdsCache();
  });

  it('should initialise with empty state', () => {
    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    expect(result.current.ads).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.fetchAds).toBe('function');
  });

  it('should fetch ads successfully', async () => {
    mockSelectAdsFn.mockResolvedValue({
      data: { ads: MOCK_ADS, count: 2 },
    });

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.ads).toEqual(MOCK_ADS);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should pass placement and limit in the request', async () => {
    mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });

    const { result } = renderHook(
      () => useAdDelivery('itinerary_feed', { limit: 10 }),
      { wrapper },
    );

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(mockSelectAdsFn).toHaveBeenCalledWith({
      placement: 'itinerary_feed',
      limit: 10,
      userContext: undefined,
      seenCampaignIds: [],
    });
  });

  it('should forward userContext with destination targeting', async () => {
    mockSelectAdsFn.mockResolvedValue({ data: { ads: MOCK_ADS, count: 2 } });

    const { result } = renderHook(() => useAdDelivery('ai_slot'), { wrapper });

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

  it('should handle errors gracefully', async () => {
    mockSelectAdsFn.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

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

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

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

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.ads).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle malformed response (no ads array)', async () => {
    mockSelectAdsFn.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.ads).toEqual([]);
  });

  it('should use default limit of 5', async () => {
    mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(mockSelectAdsFn).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
  });

  it('should seed initial state from session cache on remount (simulates web navigation)', async () => {
    // First "mount" — fetch succeeds and populates cache
    mockSelectAdsFn.mockResolvedValueOnce({ data: { ads: MOCK_ADS, count: 2 } });
    const { result: firstMount, unmount } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    await act(async () => {
      await firstMount.current.fetchAds();
    });
    expect(firstMount.current.ads).toHaveLength(2);

    // Unmount (simulates navigating away on web with React Router)
    unmount();

    // Second "mount" — no fetch yet; initial state should come from cache
    const { result: secondMount } = renderHook(() => useAdDelivery('video_feed'), { wrapper });
    expect(secondMount.current.ads).toHaveLength(2);
    expect(secondMount.current.ads[0].campaignId).toBe('camp-1');
  });

  it('should not preserve cache across placements', async () => {
    // Populate cache for video_feed
    mockSelectAdsFn.mockResolvedValueOnce({ data: { ads: MOCK_ADS, count: 2 } });
    const { result, unmount } = renderHook(() => useAdDelivery('video_feed'), { wrapper });
    await act(async () => { await result.current.fetchAds(); });
    unmount();

    // A different placement should still start empty
    const { result: aiResult } = renderHook(() => useAdDelivery('ai_slot'), { wrapper });
    expect(aiResult.current.ads).toHaveLength(0);
  });

  it('clearAdsCache clears all placements', async () => {
    mockSelectAdsFn.mockResolvedValueOnce({ data: { ads: MOCK_ADS, count: 2 } });
    const { result, unmount } = renderHook(() => useAdDelivery('video_feed'), { wrapper });
    await act(async () => { await result.current.fetchAds(); });
    unmount();

    // Clear the cache (as called on sign-out)
    clearAdsCache();

    // Remount should start empty
    const { result: fresh } = renderHook(() => useAdDelivery('video_feed'), { wrapper });
    expect(fresh.current.ads).toHaveLength(0);
  });

  describe('AdSeenContext integration', () => {
    it('forwards seen campaign IDs from context to the selectAds function', async () => {
      mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });

      const { result } = renderHook(
        () => ({ delivery: useAdDelivery('video_feed'), seen: useAdSeen() }),
        { wrapper },
      );

      // Pre-register two seen campaigns in the context
      act(() => {
        result.current.seen.addSeenId('seen-camp-1');
        result.current.seen.addSeenId('seen-camp-2');
      });

      await act(async () => {
        await result.current.delivery.fetchAds();
      });

      const callPayload = mockSelectAdsFn.mock.calls[0][0];
      expect(callPayload.seenCampaignIds).toContain('seen-camp-1');
      expect(callPayload.seenCampaignIds).toContain('seen-camp-2');
    });

    it('forwards an empty seenCampaignIds array when no impressions have been tracked', async () => {
      mockSelectAdsFn.mockResolvedValue({ data: { ads: [], count: 0 } });

      const { result } = renderHook(() => useAdDelivery('ai_slot'), { wrapper });

      await act(async () => {
        await result.current.fetchAds();
      });

      const callPayload = mockSelectAdsFn.mock.calls[0][0];
      expect(callPayload.seenCampaignIds).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// Section 5.3 / 5.4 / 5.5 — Client-side expiry guard (filterExpiredAds)
// ---------------------------------------------------------------------------
// All tests in this suite pin the clock to 2026-03-10 so date comparisons
// are deterministic regardless of when the CI job runs.
//
//   TODAY      = '2026-03-10'
//   YESTERDAY  = '2026-03-09'   ← expired endDate  (5.3)
//   TOMORROW   = '2026-03-11'   ← future startDate  (5.4)
// ---------------------------------------------------------------------------

const TODAY_DATE = new Date('2026-03-10T12:00:00');
const TODAY = '2026-03-10';
const YESTERDAY = '2026-03-09';
const TOMORROW = '2026-03-11';

/** Minimal AdUnit factory so tests only specify the fields they care about. */
function makeAd(overrides: Partial<{
  campaignId: string;
  startDate: string;
  endDate: string;
}>): import('../../../types/AdDelivery').AdUnit {
  return {
    campaignId: overrides.campaignId ?? 'test-camp',
    businessName: 'Test Co',
    primaryText: 'Test ad',
    cta: 'Click',
    landingUrl: 'https://example.com',
    placement: 'video_feed',
    ...(overrides.startDate !== undefined && { startDate: overrides.startDate }),
    ...(overrides.endDate !== undefined && { endDate: overrides.endDate }),
  } as import('../../../types/AdDelivery').AdUnit;
}

describe('filterExpiredAds — direct unit tests (Section 5.3 / 5.4 / 5.5)', () => {
  let warnSpy: jest.SpyInstance;
  let dateSpy: jest.SpyInstance;
  // Keep a reference to the real Date constructor to avoid infinite recursion
  // when mockImplementation itself calls `new Date(...)`.
  const RealDate = global.Date;

  beforeAll(() => {
    // Mock the no-arg Date constructor (`new Date()`) to return a pinned date.
    // This is the only call site affected by todayLocalYYYYMMDD().
    // We intentionally do NOT use jest.useFakeTimers because that also fakes
    // setTimeout, which causes @testing-library/react-native cleanup to timeout.
    dateSpy = jest
      .spyOn(global, 'Date')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation((...args: any[]) => {
        if (args.length === 0) return new RealDate(TODAY_DATE);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new (RealDate as any)(...args);
      });
  });

  afterAll(() => {
    dateSpy.mockRestore();
  });

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // ── Section 5.5 ──────────────────────────────────────────────────────────
  describe('5.5 — ads with no date fields', () => {
    it('passes through an ad with neither startDate nor endDate', () => {
      const ad = makeAd({});
      expect(filterExpiredAds([ad])).toHaveLength(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not log a warning when there are no date fields', () => {
      filterExpiredAds([makeAd({})]);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ── Section 5.3 ──────────────────────────────────────────────────────────
  describe('5.3 — expired ads (endDate in the past)', () => {
    it('filters out an ad whose endDate is yesterday', () => {
      const ad = makeAd({ endDate: YESTERDAY });
      expect(filterExpiredAds([ad])).toHaveLength(0);
    });

    it('logs a CLIENT EXPIRY GUARD warning for an expired ad', () => {
      const ad = makeAd({ campaignId: 'expired-camp', endDate: YESTERDAY });
      filterExpiredAds([ad]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('CLIENT EXPIRY GUARD: ad expired'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('campaignId=expired-camp'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`endDate=${YESTERDAY}`),
      );
    });

    it('keeps an ad whose endDate is today (endDate < today is false)', () => {
      const ad = makeAd({ endDate: TODAY });
      expect(filterExpiredAds([ad])).toHaveLength(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ── Section 5.4 ──────────────────────────────────────────────────────────
  describe('5.4 — not-yet-started ads (startDate in the future)', () => {
    it('filters out an ad whose startDate is tomorrow', () => {
      const ad = makeAd({ startDate: TOMORROW });
      expect(filterExpiredAds([ad])).toHaveLength(0);
    });

    it('logs a CLIENT EXPIRY GUARD warning for a not-yet-started ad', () => {
      const ad = makeAd({ campaignId: 'future-camp', startDate: TOMORROW });
      filterExpiredAds([ad]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('CLIENT EXPIRY GUARD: ad not yet started'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('campaignId=future-camp'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`startDate=${TOMORROW}`),
      );
    });

    it('keeps an ad whose startDate is today (startDate > today is false)', () => {
      const ad = makeAd({ startDate: TODAY });
      expect(filterExpiredAds([ad])).toHaveLength(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ── Mixed-batch edge cases ────────────────────────────────────────────────
  describe('mixed batches', () => {
    it('returns only valid ads from a batch containing expired and valid ads', () => {
      const expired = makeAd({ campaignId: 'dead', endDate: YESTERDAY });
      const valid = makeAd({ campaignId: 'live', endDate: TODAY });
      const noDates = makeAd({ campaignId: 'nodates' });

      const result = filterExpiredAds([expired, valid, noDates]);
      expect(result.map((a) => a.campaignId)).toEqual(['live', 'nodates']);
    });

    it('returns only valid ads from a batch containing future and valid ads', () => {
      const future = makeAd({ campaignId: 'future', startDate: TOMORROW });
      const valid = makeAd({ campaignId: 'live', startDate: TODAY });

      const result = filterExpiredAds([future, valid]);
      expect(result.map((a) => a.campaignId)).toEqual(['live']);
    });

    it('filters an ad that has only endDate set and it has passed', () => {
      // startDate absent — only endDate matters
      const ad = makeAd({ endDate: YESTERDAY });
      expect(filterExpiredAds([ad])).toHaveLength(0);
    });

    it('filters an ad that has only startDate set and is in the future', () => {
      // endDate absent — only startDate matters
      const ad = makeAd({ startDate: TOMORROW });
      expect(filterExpiredAds([ad])).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Hook-level integration: filterExpiredAds exercised via fetchAds
// ---------------------------------------------------------------------------
describe('filterExpiredAds — via useAdDelivery hook (Section 5.3 / 5.4 / 5.5)', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(AdSeenProvider, null, children);

  let warnSpy: jest.SpyInstance;
  let dateSpy: jest.SpyInstance;
  const RealDate = global.Date;

  beforeAll(() => {
    dateSpy = jest
      .spyOn(global, 'Date')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation((...args: any[]) => {
        if (args.length === 0) return new RealDate(TODAY_DATE);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new (RealDate as any)(...args);
      });
  });

  afterAll(() => {
    dateSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectAdsFn.mockReset();
    clearAdsCache();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('5.3 — removes an expired ad from result.current.ads after fetchAds', async () => {
    const expiredAd = makeAd({ campaignId: 'exp', endDate: YESTERDAY });
    mockSelectAdsFn.mockResolvedValue({ data: { ads: [expiredAd], count: 1 } });

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.ads).toHaveLength(0);
  });

  it('5.4 — removes a not-yet-started ad from result.current.ads after fetchAds', async () => {
    const futureAd = makeAd({ campaignId: 'fut', startDate: TOMORROW });
    mockSelectAdsFn.mockResolvedValue({ data: { ads: [futureAd], count: 1 } });

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.ads).toHaveLength(0);
  });

  it('5.5 — keeps an ad with no date fields in result.current.ads after fetchAds', async () => {
    const noDatesAd = makeAd({ campaignId: 'nodates' });
    mockSelectAdsFn.mockResolvedValue({ data: { ads: [noDatesAd], count: 1 } });

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(result.current.ads).toHaveLength(1);
    expect(result.current.ads[0].campaignId).toBe('nodates');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('5.3 — logs CLIENT EXPIRY GUARD warning when fetchAds receives an expired ad', async () => {
    const expiredAd = makeAd({ campaignId: 'exp-warn', endDate: YESTERDAY });
    mockSelectAdsFn.mockResolvedValue({ data: { ads: [expiredAd], count: 1 } });

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('CLIENT EXPIRY GUARD: ad expired'),
    );
  });

  it('5.4 — logs CLIENT EXPIRY GUARD warning when fetchAds receives a future ad', async () => {
    const futureAd = makeAd({ campaignId: 'fut-warn', startDate: TOMORROW });
    mockSelectAdsFn.mockResolvedValue({ data: { ads: [futureAd], count: 1 } });

    const { result } = renderHook(() => useAdDelivery('video_feed'), { wrapper });

    await act(async () => {
      await result.current.fetchAds();
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('CLIENT EXPIRY GUARD: ad not yet started'),
    );
  });
});

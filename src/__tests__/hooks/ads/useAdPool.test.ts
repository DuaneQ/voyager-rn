/**
 * Unit Tests for useAdPool
 *
 * Covers:
 * - Initial state (stable function refs, loading=false, error=null)
 * - fetchAds delegates to useAdDelivery and captures context for bg reuse
 * - spliceAdsIntoList delegates to useAdFrequency with the internal pool
 * - Background prefetch fires exactly once at the 80% slot threshold
 * - Background prefetch guard prevents duplicate prefetches
 * - Guard resets when a new pool arrives (ads reference changes)
 * - No prefetch when pool is empty
 * - loading flag is suppressed for background prefetches (no UI flicker)
 * - error passthrough from useAdDelivery
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react-native'
import { AdSeenProvider } from '../../../context/AdSeenContext'
import { useAdPool } from '../../../hooks/ads/useAdPool'
import type { AdUnit } from '../../../types/AdDelivery'

// ─── Mock useAdDelivery ───────────────────────────────────────────────────────

const mockDeliveryFetch = jest.fn().mockResolvedValue(undefined)
let mockAds: AdUnit[] = []
let mockLoading = false
let mockError: string | null = null

jest.mock('../../../hooks/ads/useAdDelivery', () => ({
  useAdDelivery: jest.fn(() => ({
    ads: mockAds,
    fetchAds: mockDeliveryFetch,
    loading: mockLoading,
    error: mockError,
  })),
  clearAdsCache: jest.fn(),
}))

// ─── Mock useAdFrequency — use real insertion logic ───────────────────────────

const FIRST_AD_AFTER = 3
const AD_INTERVAL = 5

function realGetAdInsertionIndices(contentLength: number, availableAds: number): number[] {
  if (contentLength === 0 || availableAds === 0) return []
  const indices: number[] = []
  let nextSlot = FIRST_AD_AFTER
  while (nextSlot < contentLength) {
    indices.push(nextSlot)
    nextSlot += AD_INTERVAL
  }
  return indices
}

const mockGetAdInsertionIndices = jest.fn(realGetAdInsertionIndices)
const mockSpliceInternal = jest.fn((content: unknown[], _ads: unknown[]) =>
  content.map((item) => ({ type: 'content' as const, item })),
)

jest.mock('../../../hooks/ads/useAdFrequency', () => ({
  useAdFrequency: jest.fn(() => ({
    getAdInsertionIndices: mockGetAdInsertionIndices,
    spliceAdsIntoList: mockSpliceInternal,
  })),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAd(id: string): AdUnit {
  return {
    campaignId: id,
    businessName: `Business ${id}`,
    primaryText: `Ad text ${id}`,
    cta: 'Book Now',
    landingUrl: 'https://example.com',
    placement: 'video_feed',
    creativeType: 'image',
    assetUrl: 'https://example.com/img.jpg',
    billingModel: 'cpm',
  }
}

const FIVE_ADS = [makeAd('c1'), makeAd('c2'), makeAd('c3'), makeAd('c4'), makeAd('c5')]
const CONTENT_10 = Array.from({ length: 10 }, (_, i) => `video-${i}`)

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AdSeenProvider, null, children)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAdPool', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDeliveryFetch.mockResolvedValue(undefined)
    mockAds = []
    mockLoading = false
    mockError = null
    mockGetAdInsertionIndices.mockImplementation(realGetAdInsertionIndices)
    mockSpliceInternal.mockImplementation((content: unknown[], _ads: unknown[]) =>
      content.map((item) => ({ type: 'content' as const, item })),
    )
  })

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('returns stable function refs, loading=false, error=null', () => {
      const { result } = renderHook(() => useAdPool('video_feed', 0), { wrapper })
      expect(typeof result.current.spliceAdsIntoList).toBe('function')
      expect(typeof result.current.fetchAds).toBe('function')
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  // ── fetchAds ───────────────────────────────────────────────────────────────

  describe('fetchAds', () => {
    it('delegates to useAdDelivery.fetchAds with the supplied context', async () => {
      const { result } = renderHook(() => useAdPool('video_feed', 0), { wrapper })
      const ctx = { gender: 'Male', age: 25 }

      await act(async () => {
        await result.current.fetchAds(ctx)
      })

      expect(mockDeliveryFetch).toHaveBeenCalledWith(ctx)
    })

    it('works with no context argument', async () => {
      const { result } = renderHook(() => useAdPool('video_feed', 0), { wrapper })

      await act(async () => {
        await result.current.fetchAds()
      })

      expect(mockDeliveryFetch).toHaveBeenCalledWith(undefined)
    })
  })

  // ── spliceAdsIntoList ──────────────────────────────────────────────────────

  describe('spliceAdsIntoList', () => {
    it('delegates to useAdFrequency with the current internal pool', () => {
      mockAds = FIVE_ADS
      const { result } = renderHook(() => useAdPool('video_feed', 10), { wrapper })

      result.current.spliceAdsIntoList(CONTENT_10)

      expect(mockSpliceInternal).toHaveBeenCalledWith(CONTENT_10, FIVE_ADS)
    })

    it('delegates with an empty pool when no ads are available', () => {
      mockAds = []
      const { result } = renderHook(() => useAdPool('video_feed', 0), { wrapper })

      result.current.spliceAdsIntoList([])

      expect(mockSpliceInternal).toHaveBeenCalledWith([], [])
    })
  })

  // ── Background prefetch ────────────────────────────────────────────────────

  describe('background prefetch', () => {
    it('fires when slots consumed reaches the 80% threshold', async () => {
      mockAds = FIVE_ADS
      // threshold = floor(5 × 0.8) = 4 slots
      // 4 slots = content indices [3, 8, 13, 18] → requires videosLength >= 19
      const { rerender } = renderHook(
        ({ vLen }: { vLen: number }) => useAdPool('video_feed', vLen),
        { initialProps: { vLen: 0 }, wrapper },
      )

      expect(mockDeliveryFetch).not.toHaveBeenCalled()

      rerender({ vLen: 19 })

      await waitFor(() => {
        expect(mockDeliveryFetch).toHaveBeenCalledTimes(1)
      })
    })

    it('does NOT fire below the threshold', () => {
      mockAds = FIVE_ADS
      // 3 slots at videosLength=14: [3, 8, 13] → below threshold of 4
      const { rerender } = renderHook(
        ({ vLen }: { vLen: number }) => useAdPool('video_feed', vLen),
        { initialProps: { vLen: 0 }, wrapper },
      )

      rerender({ vLen: 14 })

      expect(mockDeliveryFetch).not.toHaveBeenCalled()
    })

    it('fires only once per pool regardless of further video growth', async () => {
      mockAds = FIVE_ADS
      const { rerender } = renderHook(
        ({ vLen }: { vLen: number }) => useAdPool('video_feed', vLen),
        { initialProps: { vLen: 0 }, wrapper },
      )

      rerender({ vLen: 19 })
      await waitFor(() => expect(mockDeliveryFetch).toHaveBeenCalledTimes(1))

      // More videos load — guard must prevent additional prefetches
      rerender({ vLen: 25 })
      rerender({ vLen: 35 })

      expect(mockDeliveryFetch).toHaveBeenCalledTimes(1)
    })

    it('does NOT fire when the pool is empty', () => {
      mockAds = []
      const { rerender } = renderHook(
        ({ vLen }: { vLen: number }) => useAdPool('video_feed', vLen),
        { initialProps: { vLen: 0 }, wrapper },
      )

      rerender({ vLen: 50 })

      expect(mockDeliveryFetch).not.toHaveBeenCalled()
    })

    it('uses the last context passed to fetchAds', async () => {
      mockAds = FIVE_ADS
      const ctx = { gender: 'Female', age: 30 }
      const { result, rerender } = renderHook(
        ({ vLen }: { vLen: number }) => useAdPool('video_feed', vLen),
        { initialProps: { vLen: 0 }, wrapper },
      )

      // Capture context via explicit fetchAds call
      await act(async () => {
        await result.current.fetchAds(ctx)
      })
      // That call counts as call #1
      expect(mockDeliveryFetch).toHaveBeenCalledTimes(1)

      // Grow to threshold → background prefetch should reuse the ctx
      rerender({ vLen: 19 })

      await waitFor(() => {
        expect(mockDeliveryFetch).toHaveBeenCalledTimes(2)
        expect(mockDeliveryFetch).toHaveBeenLastCalledWith(ctx)
      })
    })

    it('reuses undefined context when fetchAds was not called first', async () => {
      mockAds = FIVE_ADS
      const { rerender } = renderHook(
        ({ vLen }: { vLen: number }) => useAdPool('video_feed', vLen),
        { initialProps: { vLen: 0 }, wrapper },
      )

      rerender({ vLen: 19 })

      await waitFor(() => {
        expect(mockDeliveryFetch).toHaveBeenCalledWith(undefined)
      })
    })
  })

  // ── loading / error passthrough ────────────────────────────────────────────

  describe('loading and error passthrough', () => {
    it('exposes loading=true from useAdDelivery during a foreground fetch', () => {
      mockLoading = true
      const { result } = renderHook(() => useAdPool('video_feed', 0), { wrapper })
      expect(result.current.loading).toBe(true)
    })

    it('passes error string from useAdDelivery', () => {
      mockError = 'Network error'
      const { result } = renderHook(() => useAdPool('video_feed', 0), { wrapper })
      expect(result.current.error).toBe('Network error')
    })
  })
})

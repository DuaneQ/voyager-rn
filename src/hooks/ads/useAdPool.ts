/**
 * useAdPool — Orchestrates ad delivery and frequency for a single feed surface.
 *
 * Responsibilities (Single Responsibility Principle):
 *   - Holds the current ad pool snapshot returned by selectAds
 *   - Splices ads into content via useAdFrequency (unchanged)
 *   - Fires a silent background prefetch when ~80 % of the pool has been
 *     consumed so the user never loops back to the same ad mid-scroll
 *
 * Design (Open/Closed + Dependency Inversion):
 *   - useAdDelivery and useAdFrequency are NOT modified — useAdPool composes
 *     them behind a single, purpose-built interface
 *   - VideoFeedPage depends only on this abstraction, not on useAdDelivery or
 *     useAdFrequency directly
 *
 * Firebase cost note:
 *   - Background prefetch = 1 additional selectAds CF invocation per ~20 swipes
 *   - selectAds reads ads_campaigns once per call (same cost as the initial
 *     fetch — no extra Firestore reads beyond the normal query)
 *   - No fetching on every video load; only when the 80 % threshold is crossed
 *
 * Usage:
 *   const { spliceAdsIntoList, fetchAds } = useAdPool('video_feed', videos.length)
 *   const mixedFeed = spliceAdsIntoList(videos)
 */

import { useCallback, useEffect, useRef } from 'react'
import { useAdDelivery } from './useAdDelivery'
import { useAdFrequency } from './useAdFrequency'
import type { AdUnit, Placement, UserAdContext } from '../../types/AdDelivery'

/**
 * Fraction of the current pool that must be consumed before a background
 * prefetch is triggered.
 *
 * At 0.8 with a default pool of 5:
 *   threshold = floor(5 × 0.8) = 4 slots
 *   slot 4 is reached after ~19 videos (FIRST_AD_AFTER=3 + 3×AD_INTERVAL=15 + 1)
 *   → prefetch fires one slot before cycling begins
 */
const PREFETCH_THRESHOLD = 0.8

export interface UseAdPoolOptions {
  /** Maximum ads per pool request (default 5, max 20). */
  limit?: number
}

export interface UseAdPoolReturn {
  /**
   * Splice ads into a content list.  No `ads` argument needed — the pool is
   * managed internally.  Automatically schedules a silent background prefetch
   * when the pool is ~80 % consumed.
   */
  spliceAdsIntoList: <T>(
    contentItems: T[],
  ) => Array<{ type: 'content'; item: T } | { type: 'ad'; ad: AdUnit }>

  /** Trigger a foreground ad fetch (initial load or forced refresh). */
  fetchAds: (userContext?: UserAdContext) => Promise<void>

  /**
   * True while a *foreground* fetch is in flight.
   *
   * Background prefetches do not set this flag — the UI should not show a
   * loading indicator while the user is mid-scroll.
   */
  loading: boolean

  /** Last foreground fetch error message, or null. */
  error: string | null
}

/**
 * @param placement   Feed surface (e.g. 'video_feed', 'ai_slot')
 * @param videosLength  Current organic content count — drives the slot
 *   consumption calculation that triggers background prefetch.
 * @param options   Optional delivery options (limit, etc.)
 */
export function useAdPool(
  placement: Placement,
  videosLength: number,
  options: UseAdPoolOptions = {},
): UseAdPoolReturn {
  const { ads, fetchAds: deliveryFetch, loading, error } = useAdDelivery(
    placement,
    options,
  )
  const { getAdInsertionIndices, spliceAdsIntoList: spliceInternal } =
    useAdFrequency()

  // Retains the last targeting context so background prefetches reuse it.
  const lastContextRef = useRef<UserAdContext | undefined>(undefined)

  // Guards against firing more than one background prefetch per pool.
  // Reset when a new pool arrives (ads reference changes).
  const prefetchFiredRef = useRef(false)

  // Track whether the current loading state is from a background prefetch
  // so callers can distinguish it from a foreground load (e.g. avoid spinners).
  const isBgFetchRef = useRef(false)

  // Detect pool replacement: when a new fetch resolves, `ads` gets a new
  // array reference.  Reset the prefetch guard so the fresh pool gets its
  // own background prefetch cycle.
  const prevAdsRef = useRef(ads)
  useEffect(() => {
    if (ads !== prevAdsRef.current) {
      prevAdsRef.current = ads
      prefetchFiredRef.current = false
      isBgFetchRef.current = false
      console.log(
        `[AdPool] pool refreshed — ${ads.length} ad(s) for placement=${placement}; prefetch guard reset`,
      )
    }
  }, [ads, placement])

  // Background prefetch trigger.  Runs whenever the video count grows or the
  // pool is replaced.  Uses getAdInsertionIndices (pure, no network) to count
  // how many unique ad slots the current feed has consumed.
  useEffect(() => {
    if (prefetchFiredRef.current) return
    if (ads.length === 0) return

    // threshold = at least 1; typically floor(poolSize × 0.8)
    const threshold = Math.max(1, Math.floor(ads.length * PREFETCH_THRESHOLD))
    const slotsUsed = getAdInsertionIndices(videosLength, ads.length).length

    if (slotsUsed >= threshold) {
      prefetchFiredRef.current = true
      isBgFetchRef.current = true
      console.log(
        `[AdPool] background prefetch triggered — ${slotsUsed}/${ads.length} slots consumed` +
          ` (threshold=${threshold}) placement=${placement}`,
      )
      // Fire and forget — no await, no loading/error propagation for bg fetch.
      deliveryFetch(lastContextRef.current)
    }
  }, [videosLength, ads, getAdInsertionIndices, deliveryFetch, placement])

  // Public fetchAds: captures context for background reuse and resets the
  // prefetch guard so the fresh pool gets its own prefetch cycle.
  const fetchAds = useCallback(
    async (userContext?: UserAdContext) => {
      lastContextRef.current = userContext
      prefetchFiredRef.current = false
      isBgFetchRef.current = false
      await deliveryFetch(userContext)
    },
    [deliveryFetch],
  )

  // Thin wrapper — passes the managed pool to useAdFrequency transparently.
  const spliceAdsIntoList = useCallback(
    <T>(contentItems: T[]) => spliceInternal(contentItems, ads),
    [spliceInternal, ads],
  )

  // Suppress loading flag for background prefetches so the UI never shows
  // a spinner while the user is mid-scroll.
  const exposedLoading = loading && !isBgFetchRef.current

  return { spliceAdsIntoList, fetchAds, loading: exposedLoading, error }
}

/**
 * useAdFrequency — Controls how often ads appear in feed surfaces.
 *
 * Responsibilities:
 * - Determines the insertion indices for ad slots within a content list
 * - Tracks how many ads have been shown in the current session
 * - Provides a helper to splice AdUnit items into a content array
 *
 * Design:
 * - No network calls — pure client-side logic
 * - Stateless between app restarts (frequency resets each session)
 * - Returns stable references to avoid unnecessary re-renders
 *
 * Usage:
 *   const { getAdInsertionIndices, spliceAdsIntoList } = useAdFrequency()
 *   const mixedList = spliceAdsIntoList(videos, ads)
 */

import { useCallback, useRef } from 'react'
import type { AdUnit } from '../../types/AdDelivery'

/** Show first ad after this many content items. */
const FIRST_AD_AFTER = 4

/** Show subsequent ads every N content items. */
const AD_INTERVAL = 5

/** Maximum ads to show in a single feed session. */
const MAX_ADS_PER_SESSION = 10

export interface UseAdFrequencyReturn {
  /**
   * Given a content list length, returns the indices at which ads should be
   * inserted.  Indices are relative to the ORIGINAL content array (before
   * any ads are spliced in).
   *
   * @param contentLength Total number of organic content items.
   * @param availableAds Number of ad units available.
   * @returns Array of 0-based indices where an ad slot should appear.
   */
  getAdInsertionIndices: (contentLength: number, availableAds: number) => number[]

  /**
   * Convenience: splice ads into a content list, returning a new mixed array.
   * Each item is tagged as `{ type: 'content', item: T }` or `{ type: 'ad', ad: AdUnit }`.
   *
   * @param contentItems The organic content array.
   * @param ads Available AdUnit instances.
   * @returns A new array with ads interleaved.
   */
  spliceAdsIntoList: <T>(
    contentItems: T[],
    ads: AdUnit[],
  ) => Array<{ type: 'content'; item: T } | { type: 'ad'; ad: AdUnit }>

  /** Reset the session ad counter (e.g. on pull-to-refresh). */
  resetSessionCount: () => void
}

export function useAdFrequency(): UseAdFrequencyReturn {
  const sessionCountRef = useRef(0)

  const getAdInsertionIndices = useCallback(
    (contentLength: number, availableAds: number): number[] => {
      if (contentLength === 0 || availableAds === 0) return []

      const remaining = MAX_ADS_PER_SESSION - sessionCountRef.current
      if (remaining <= 0) return []

      const maxSlots = Math.min(availableAds, remaining)
      const indices: number[] = []

      // First slot after FIRST_AD_AFTER items, then every AD_INTERVAL items
      let nextSlot = FIRST_AD_AFTER
      while (indices.length < maxSlots && nextSlot < contentLength) {
        indices.push(nextSlot)
        nextSlot += AD_INTERVAL
      }

      return indices
    },
    [],
  )

  const spliceAdsIntoList = useCallback(
    <T>(
      contentItems: T[],
      ads: AdUnit[],
    ): Array<{ type: 'content'; item: T } | { type: 'ad'; ad: AdUnit }> => {
      if (!contentItems.length) return []
      if (!ads.length) {
        return contentItems.map((item) => ({ type: 'content' as const, item }))
      }

      const indices = getAdInsertionIndices(contentItems.length, ads.length)
      const indicesSet = new Set(indices)

      const result: Array<
        { type: 'content'; item: T } | { type: 'ad'; ad: AdUnit }
      > = []
      let adIdx = 0

      for (let i = 0; i < contentItems.length; i++) {
        // Insert ad BEFORE this content item at the designated indices
        if (indicesSet.has(i) && adIdx < ads.length) {
          result.push({ type: 'ad', ad: ads[adIdx] })
          sessionCountRef.current++
          adIdx++
        }
        result.push({ type: 'content', item: contentItems[i] })
      }

      return result
    },
    [getAdInsertionIndices],
  )

  const resetSessionCount = useCallback(() => {
    sessionCountRef.current = 0
  }, [])

  return { getAdInsertionIndices, spliceAdsIntoList, resetSessionCount }
}

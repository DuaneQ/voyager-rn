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

import { useCallback } from 'react'
import type { AdUnit } from '../../types/AdDelivery'

/** Show first ad after this many content items. */
const FIRST_AD_AFTER = 4

/** Show subsequent ads every N content items. */
const AD_INTERVAL = 5

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

}

export function useAdFrequency(): UseAdFrequencyReturn {
  const getAdInsertionIndices = useCallback(
    (contentLength: number, availableAds: number): number[] => {
      if (contentLength === 0 || availableAds === 0) return []

      const indices: number[] = []

      // First slot after FIRST_AD_AFTER items, then every AD_INTERVAL items.
      // No cap on total slots — ads cycle through the available pool so every
      // 5th video has an ad regardless of how long the feed is.
      let nextSlot = FIRST_AD_AFTER
      while (nextSlot < contentLength) {
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
        result.push({ type: 'content', item: contentItems[i] })
        // Insert ad AFTER this content item at the designated indices.
        // Ads cycle through the available pool so the feed never runs dry.
        if (indicesSet.has(i)) {
          result.push({ type: 'ad', ad: ads[adIdx % ads.length] })
          adIdx++
        }
      }

      return result
    },
    [getAdInsertionIndices],
  )

  return { getAdInsertionIndices, spliceAdsIntoList }
}

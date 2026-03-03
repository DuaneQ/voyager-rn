/**
 * useAdDelivery — Fetches ads from the selectAds Cloud Function for a given
 * placement surface and optional user targeting context.
 *
 * - Calls `selectAds` via httpsCallable
 * - Returns ads[], loading, error, and a refetch trigger
 * - Stores the latest fetched ads in component state
 * - Deduplicates in-flight requests
 *
 * Usage:
 *   const { ads, loading, error, fetchAds } = useAdDelivery('video_feed')
 *   // Once you have itinerary context:
 *   fetchAds({ destination: 'Paris', travelStartDate: '2025-07-01', ... })
 */

import { useState, useCallback, useRef, useMemo } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../config/firebaseConfig'
import type {
  AdUnit,
  Placement,
  UserAdContext,
  SelectAdsRequest,
  SelectAdsResponse,
} from '../../types/AdDelivery'

export interface UseAdDeliveryOptions {
  /** Maximum ads to request (default 5, max 20). */
  limit?: number
}

export interface UseAdDeliveryReturn {
  /** Currently loaded ads for this placement. */
  ads: AdUnit[]
  /** Whether a request is in flight. */
  loading: boolean
  /** Last error message, or null. */
  error: string | null
  /** Trigger a fetch with optional user targeting context and seen campaign IDs. */
  fetchAds: (userContext?: UserAdContext, seenCampaignIds?: string[]) => Promise<void>
}

export function useAdDelivery(
  placement: Placement,
  options: UseAdDeliveryOptions = {},
): UseAdDeliveryReturn {
  const { limit = 5 } = options

  const [ads, setAds] = useState<AdUnit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guard against concurrent fetches
  const inFlightRef = useRef(false)

  // Stable callable reference
  const selectAdsFn = useMemo(
    () =>
      httpsCallable<SelectAdsRequest, SelectAdsResponse>(functions, 'selectAds'),
    [],
  )

  const fetchAds = useCallback(
    async (userContext?: UserAdContext, seenCampaignIds?: string[]) => {
      // Deduplicate in-flight requests
      if (inFlightRef.current) return
      inFlightRef.current = true
      setLoading(true)
      setError(null)

      try {
        console.log(`[AdDelivery] fetching placement=${placement} limit=${limit}`, userContext ?? 'no context')
        const result = await selectAdsFn({
          placement,
          limit,
          userContext,
          seenCampaignIds,
        })

        const response = result.data
        if (response && Array.isArray(response.ads)) {
          console.log(`[AdDelivery] ✓ ${response.ads.length} ad(s) received for ${placement}:`, response.ads.map(a => a.campaignId))
          setAds(response.ads)
        } else {
          console.warn(`[AdDelivery] no ads in response for ${placement}`)
          setAds([])
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load ads'
        console.error(`[AdDelivery] ✗ fetchAds error (${placement}):`, err)
        setError(message)
        // Don't clear existing ads on error — stale ads are better than none
      } finally {
        inFlightRef.current = false
        setLoading(false)
      }
    },
    [placement, limit, selectAdsFn],
  )

  return { ads, loading, error, fetchAds }
}

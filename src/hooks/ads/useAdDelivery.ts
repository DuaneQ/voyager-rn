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
import { useAdSeen } from '../../context/AdSeenContext'
import type { Placement as _Placement } from '../../types/AdDelivery'
import type { AdUnit as _AdUnit } from '../../types/AdDelivery'

/**
 * Module-level session cache keyed by placement.
 *
 * WHY: On web (React Router), navigating away from a tab unmounts the component
 * and resets useState to []. When the user comes back and the network is down,
 * the re-fetch fails and the feed appears empty even though we had ads moments ago.
 *
 * This cache survives component unmount/remount for the lifetime of the browser
 * tab / JS module. It is cleared on sign-out so one user never sees another's ads.
 *
 * On native (React Navigation), tabs stay mounted so state already persists —
 * the cache is a no-op there (just seeds the initial state that was already empty).
 */
const _sessionAdsCache = new Map<string, _AdUnit[]>()

/** Clear cached ads for one or all placements. Call on sign-out. */
export function clearAdsCache(placement?: _Placement): void {
  if (placement) {
    _sessionAdsCache.delete(placement)
  } else {
    _sessionAdsCache.clear()
  }
}

/** Return today as YYYY-MM-DD in local time (avoids UTC-shift issues). */
function todayLocalYYYYMMDD(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Client-side expiry guard — defense-in-depth for ads cached across a session
 * boundary (e.g. app open at 11:58pm, campaign expires at midnight).
 *
 * The server ALWAYS filters on date, so expired ads should never be returned
 * in a fresh fetch.  This guard catches the rare case where already-fetched
 * ads are still in state when the calendar day rolls over.
 *
 * Exported for unit testing only — prefer testing behaviour through the hook.
 */
export function filterExpiredAds(ads: import('../../types/AdDelivery').AdUnit[]): import('../../types/AdDelivery').AdUnit[] {
  const today = todayLocalYYYYMMDD()
  return ads.filter((ad) => {
    // If the CF didn't return dates (older deployment), let the ad through.
    if (!ad.startDate && !ad.endDate) return true

    if (ad.startDate && ad.startDate > today) {
      console.warn(
        `[AdDelivery] ⚠ CLIENT EXPIRY GUARD: ad not yet started — filtered out` +
        ` campaignId=${ad.campaignId} startDate=${ad.startDate} today=${today}`,
      )
      return false
    }
    if (ad.endDate && ad.endDate < today) {
      console.warn(
        `[AdDelivery] ⚠ CLIENT EXPIRY GUARD: ad expired — filtered out` +
        ` campaignId=${ad.campaignId} endDate=${ad.endDate} today=${today}`,
      )
      return false
    }
    return true
  })
}
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
  /** Trigger a fetch with optional user targeting context. Seen campaign IDs
   * are read automatically from AdSeenContext and sent to the server for the
   * -5 seen penalty. */
  fetchAds: (userContext?: UserAdContext) => Promise<void>
}

export function useAdDelivery(
  placement: Placement,
  options: UseAdDeliveryOptions = {},
): UseAdDeliveryReturn {
  const { limit = 5 } = options

  const { getSeenIds } = useAdSeen()

  // Seed from cache so remounts (React Router web navigation) immediately
  // show the last successfully fetched ads rather than an empty state.
  const [ads, setAds] = useState<AdUnit[]>(() => _sessionAdsCache.get(placement) ?? [])
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
    async (userContext?: UserAdContext) => {
      // Deduplicate in-flight requests
      if (inFlightRef.current) return
      inFlightRef.current = true
      setLoading(true)
      setError(null)

      try {
        const seenCampaignIds = getSeenIds()
        if (seenCampaignIds.length > 0) {
          console.log(
            `[AdDelivery] seenCampaignIds (${seenCampaignIds.length}): [${seenCampaignIds.join(', ')}]`,
          )
        }
        console.log(`[AdDelivery] fetching placement=${placement} limit=${limit}`, userContext ?? 'no context')
        const result = await selectAdsFn({
          placement,
          limit,
          userContext,
          seenCampaignIds,
        })

        const response = result.data
        if (response && Array.isArray(response.ads)) {
          const serverCount = response.ads.length
          console.log(
            `[AdDelivery] ✓ ${serverCount} ad(s) received from server for placement=${placement}:`,
            response.ads.map((a) => ({
              campaignId: a.campaignId,
              businessName: a.businessName,
              creativeType: a.creativeType,
              startDate: a.startDate ?? 'n/a',
              endDate: a.endDate ?? 'n/a',
            })),
          )
          const valid = filterExpiredAds(response.ads)
          if (valid.length < serverCount) {
            console.warn(
              `[AdDelivery] CLIENT EXPIRY GUARD removed ${serverCount - valid.length}` +
              ` stale ad(s) — ${valid.length} remain for placement=${placement}`,
            )
          }
          _sessionAdsCache.set(placement, valid)
          setAds(valid)
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
    [placement, limit, selectAdsFn, getSeenIds],
  )

  return { ads, loading, error, fetchAds }
}

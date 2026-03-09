/**
 * useAdTracking — Batches and sends ad impression/click/quartile events to
 * the logAdEvents Cloud Function.
 *
 * Key design decisions:
 * - Events are buffered in memory and flushed every FLUSH_INTERVAL_MS or
 *   when the buffer reaches MAX_BUFFER_SIZE.
 * - On unmount, any remaining events are flushed synchronously (best-effort).
 * - Impressions are deduplicated per campaignId within a session to prevent
 *   inflated counts when a component re-renders.
 * - All timestamps are client-side epoch ms; the server validates freshness.
 *
 * Usage:
 *   const { trackImpression, trackClick, trackQuartile } = useAdTracking()
 *   // When an ad becomes visible:
 *   trackImpression(ad.campaignId)
 *   // When user taps CTA:
 *   trackClick(ad.campaignId)
 *   // When video reaches 25%:
 *   trackQuartile(ad.campaignId, 25)
 */

import { useCallback, useRef, useEffect, useMemo } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../config/firebaseConfig'
import { useAdSeen } from '../../context/AdSeenContext'
import type {
  AdEvent,
  VideoQuartile,
  LogAdEventsRequest,
  LogAdEventsResponse,
} from '../../types/AdDelivery'

/** Flush buffered events every 10 seconds. */
const FLUSH_INTERVAL_MS = 10_000

/** Flush immediately when buffer reaches this size. */
const MAX_BUFFER_SIZE = 20

export interface UseAdTrackingReturn {
  /**
   * Record an impression for a campaign.
   * Deduplicated: calling multiple times for the same campaignId in the same
   * session only sends one event.
   * Also registers the campaign in AdSeenContext so useAdDelivery can apply
   * the server-side seen penalty across the full session.
   */
  trackImpression: (campaignId: string) => void
  /** Record a click-through for a campaign. */
  trackClick: (campaignId: string) => void
  /** Record a video quartile milestone. */
  trackQuartile: (campaignId: string, quartile: VideoQuartile) => void
  /** Force-flush any buffered events (useful before navigation). */
  flush: () => Promise<void>
}

export function useAdTracking(): UseAdTrackingReturn {
  const { addSeenId } = useAdSeen()
  const bufferRef = useRef<AdEvent[]>([])
  const impressionSetRef = useRef<Set<string>>(new Set())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const logAdEventsFn = useMemo(
    () =>
      httpsCallable<LogAdEventsRequest, LogAdEventsResponse>(
        functions,
        'logAdEvents',
      ),
    [],
  )

  /**
   * Send buffered events to the server.
   * Non-throwing: errors are logged but never propagated to callers.
   */
  const flush = useCallback(async () => {
    const events = bufferRef.current
    if (events.length === 0) return

    // Swap buffer to avoid double-sends
    bufferRef.current = []

    const impressions = events.filter(e => e.type === 'impression').length
    const clicks = events.filter(e => e.type === 'click').length
    const quartiles = events.filter(e => e.type === 'video_quartile').length
    const uniqueCampaigns = [...new Set(events.map(e => e.campaignId))]
    console.log(
      `[AdTracking] flushing ${events.length} event(s) — impressions=${impressions} clicks=${clicks} quartiles=${quartiles}` +
      ` campaignIds=[${uniqueCampaigns.join(', ')}]`,
    )

    try {
      const result = await logAdEventsFn({ events })
      const { processed, skipped } = result.data
      console.log(`[AdTracking] ✓ flush complete processed=${processed} skipped=${skipped}`)
      if (skipped > 0) {
        console.warn(`[useAdTracking] ${skipped} events skipped by server`)
      }
    } catch (err) {
      console.error('[useAdTracking] flush failed:', err)
      // Silently drop — we do NOT re-enqueue to avoid infinite retry loops.
      // Lost events are acceptable at this traffic level; the server's
      // budget enforcement will reconcile on the next batch.
    }
  }, [logAdEventsFn])

  // Start periodic flush timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (bufferRef.current.length > 0) {
        flush()
      }
    }, FLUSH_INTERVAL_MS)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      // Best-effort flush on unmount
      if (bufferRef.current.length > 0) {
        flush()
      }
    }
  }, [flush])

  /** Push an event into the buffer, auto-flushing if full. */
  const enqueue = useCallback(
    (event: AdEvent) => {
      bufferRef.current.push(event)
      if (bufferRef.current.length >= MAX_BUFFER_SIZE) {
        flush()
      }
    },
    [flush],
  )

  const trackImpression = useCallback(
    (campaignId: string) => {
      if (!campaignId) return
      // Deduplicate within this session
      if (impressionSetRef.current.has(campaignId)) {
        console.log(`[AdTracking] impression deduped (already tracked) campaignId=${campaignId}`)
        return
      }
      impressionSetRef.current.add(campaignId)
      addSeenId(campaignId)
      console.log(`[AdTracking] impression queued campaignId=${campaignId}`)
      enqueue({
        type: 'impression',
        campaignId,
        timestamp: Date.now(),
      })
    },
    [enqueue],
  )

  const trackClick = useCallback(
    (campaignId: string) => {
      if (!campaignId) return
      console.log(`[AdTracking] click queued campaignId=${campaignId}`)
      enqueue({
        type: 'click',
        campaignId,
        timestamp: Date.now(),
      })
    },
    [enqueue],
  )

  const trackQuartile = useCallback(
    (campaignId: string, quartile: VideoQuartile) => {
      if (!campaignId) return
      console.log(`[AdTracking] quartile=${quartile}% queued campaignId=${campaignId}`)
      enqueue({
        type: 'video_quartile',
        campaignId,
        timestamp: Date.now(),
        quartile,
      })
    },
    [enqueue],
  )

  return { trackImpression, trackClick, trackQuartile, flush }
}

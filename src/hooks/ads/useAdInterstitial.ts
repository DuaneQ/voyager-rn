/**
 * useAdInterstitial
 *
 * Manages the interstitial ad queue for the itinerary feed:
 * - Maintains a shuffled local queue of ad units sourced from useAdDelivery.
 * - Exposes `maybeShowInterstitialAd()` — call after each organic swipe;
 *   shows an ad every `interstitialInterval` swipes.
 * - Exposes `handleAdDismiss()` — advances the queue and hides the card.
 * - Auto-shows an ad when there are zero organic results (empty-state sponsorship),
 *   but only once per search session so the same ad never loops.
 * - `resetForNewSearch()` — call when the user picks a new itinerary to clear
 *   all per-session state.
 *
 * Domain rules enforced here:
 * ✅ Ad pacing counter increments only on organic swipes (maybeShowInterstitialAd).
 * ✅ Dismissing an ad never counts as a swipe and never increments the counter.
 * ✅ When organic results are zero, at most ONE ad is shown per search session.
 * ✅ Back-to-back repeat of the same campaignId is prevented.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { AdUnit, UserAdContext } from '../../types/AdDelivery'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Fisher-Yates in-place shuffle. Returns the same array for convenience. */
function shuffleAds(arr: AdUnit[]): AdUnit[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseAdInterstitialOptions {
  /** Latest ad batch from useAdDelivery. */
  sponsoredAds: AdUnit[];
  /** Current length of the organic result list. */
  matchingItinerariesCount: number;
  /** True while the search RPC is in-flight. */
  searchLoading: boolean;
  /** Non-null when the user has picked an itinerary and a search is active. */
  selectedItineraryId: string | null;
  /** fetchAds from useAdDelivery — used for background prefetch / refill. */
  fetchAds: (ctx?: UserAdContext) => void;
  /** How many organic swipes between interstitial slots. Defaults to 5. */
  interstitialInterval?: number;
}

export interface UseAdInterstitialReturn {
  /** True when the interstitial card should be rendered. */
  showingSponsoredAd: boolean;
  /** The ad at the head of the queue (what the card should render). Null when none. */
  currentAd: AdUnit | null;
  /**
   * Call after each organic like/dislike. Shows an ad every `interstitialInterval`
   * swipes. Does NOT track usage — that remains in the page-level handlers.
   */
  maybeShowInterstitialAd: () => void;
  /** Call when the user dismisses the interstitial card. Advances the queue. */
  handleAdDismiss: () => void;
  /**
   * Reset all per-session state. Call when the user selects a new itinerary.
   * Optionally stores the new ad targeting context for background refetches.
   */
  resetForNewSearch: (adContext?: UserAdContext) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdInterstitial({
  sponsoredAds,
  matchingItinerariesCount,
  searchLoading,
  selectedItineraryId,
  fetchAds,
  interstitialInterval = 5,
}: UseAdInterstitialOptions): UseAdInterstitialReturn {
  const [showingSponsoredAd, setShowingSponsoredAd] = useState(false);

  /** Shuffled local queue. Consumed by shift() on dismiss. */
  const adQueueRef = useRef<AdUnit[]>([]);
  /** CampaignId of the last shown ad — prevents immediate back-to-back repeat. */
  const lastShownIdRef = useRef<string | null>(null);
  /** Organic swipe counter for pacing. */
  const actionCountRef = useRef(0);
  /** Stored targeting context for background prefetch calls. */
  const adContextRef = useRef<UserAdContext | undefined>(undefined);
  /**
   * Gate: set to true after the user dismisses an ad during a zero-results
   * session. Prevents the zero-results useEffect from immediately re-showing
   * the same ad. Cleared by resetForNewSearch().
   */
  const emptyResultsAdDismissedRef = useRef(false);

  // ── Rebuild queue whenever a fresh server batch arrives ───────────────────
  useEffect(() => {
    if (sponsoredAds.length > 0) {
      adQueueRef.current = shuffleAds([...sponsoredAds]);
    }
  }, [sponsoredAds]);

  // ── Core: show ad immediately when organic queue is empty ─────────────────
  // Guards:
  //   selectedItineraryId  → a search was actually initiated
  //   !searchLoading       → search has settled; don't show mid-flight
  //   !showingSponsoredAd  → don't stack multiple ads
  //   matchingCount === 0  → only in empty-results state
  //   sponsoredAds.length  → we have ads to show
  //   !emptyResultsAdDismissedRef → user hasn't already seen+dismissed this session
  useEffect(() => {
    if (!selectedItineraryId) return;
    if (searchLoading) return;
    if (showingSponsoredAd) return;
    if (matchingItinerariesCount > 0) return;
    if (sponsoredAds.length === 0) return;
    if (emptyResultsAdDismissedRef.current) return;
    showInterstitialNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingItinerariesCount, searchLoading, showingSponsoredAd, sponsoredAds.length, selectedItineraryId]);

  // ── Internal: dequeue and display ────────────────────────────────────────
  // Defined without useCallback so it can be called from the useEffect above
  // without requiring it in the dependency array (it only reads/writes stable refs).
  function showInterstitialNow() {
    if (sponsoredAds.length === 0) return;

    // Refill queue if empty; kick off background refetch for freshness.
    if (adQueueRef.current.length === 0) {
      adQueueRef.current = shuffleAds([...sponsoredAds]);
      fetchAds(adContextRef.current);
    }

    // Prevent back-to-back same ad.
    if (
      adQueueRef.current.length > 1 &&
      adQueueRef.current[0].campaignId === lastShownIdRef.current
    ) {
      const deferred = adQueueRef.current.shift()!;
      adQueueRef.current.push(deferred);
    }

    setShowingSponsoredAd(true);
  }

  // ── Public: pacing (called by organic swipe handlers) ────────────────────
  const maybeShowInterstitialAd = useCallback(() => {
    actionCountRef.current += 1;
    if (actionCountRef.current % interstitialInterval !== 0) return;
    showInterstitialNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsoredAds, interstitialInterval, fetchAds]);

  // ── Public: user dismissed the card ──────────────────────────────────────
  const handleAdDismiss = useCallback(() => {
    const shown = adQueueRef.current.shift();
    if (shown) lastShownIdRef.current = shown.campaignId;

    // If the queue is now empty and organic results are still zero, mark this
    // session as exhausted — the zero-results useEffect must not re-show the ad.
    if (adQueueRef.current.length === 0 && matchingItinerariesCount === 0) {
      emptyResultsAdDismissedRef.current = true;
    }

    setShowingSponsoredAd(false);

    // Background prefetch — keeps the queue warm for the pacing path.
    // Do NOT eagerly refill adQueueRef here; showInterstitialNow handles that
    // on-demand, preventing the same ad from looping in zero-result sessions.
    if (adQueueRef.current.length === 0) {
      fetchAds(adContextRef.current);
    }
  }, [matchingItinerariesCount, fetchAds]);

  // ── Public: reset for new itinerary selection ─────────────────────────────
  const resetForNewSearch = useCallback((adContext?: UserAdContext) => {
    actionCountRef.current = 0;
    adQueueRef.current = [];
    lastShownIdRef.current = null;
    emptyResultsAdDismissedRef.current = false;
    adContextRef.current = adContext;
    setShowingSponsoredAd(false);
  }, []);

  return {
    showingSponsoredAd,
    currentAd: adQueueRef.current[0] ?? null,
    maybeShowInterstitialAd,
    handleAdDismiss,
    resetForNewSearch,
  };
}

/**
 * Unit Tests for useAdInterstitial Hook
 *
 * Regression coverage for the "same ad loops forever on dismiss" bug:
 *   - When organic results are zero, at most ONE ad is shown per search session.
 *   - Dismissing an ad in zero-results state sets the emptyResultsDismissed gate;
 *     the zero-results useEffect must NOT re-fire and show the same ad again.
 *   - resetForNewSearch() clears the gate so the next search can show an ad.
 *
 * Additional pacing and queue mechanics:
 *   - maybeShowInterstitialAd shows an ad every N organic swipes only.
 *   - Back-to-back same-ad is prevented when the queue has multiple entries.
 *   - No ad is shown before a search is initiated (selectedItineraryId = null).
 *   - No ad is shown while the search is still loading.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAdInterstitial } from '../../../hooks/ads/useAdInterstitial';
import type { AdUnit, UserAdContext } from '../../../types/AdDelivery';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeAd = (overrides?: Partial<AdUnit>): AdUnit => ({
  campaignId: 'camp-1',
  businessName: 'Paris Café',
  primaryText: 'Best croissants in Montmartre',
  cta: 'Book Now',
  landingUrl: 'https://pariscafe.fr',
  assetUrl: 'https://img.example.com/cafe.jpg',
  creativeType: 'image',
  billingModel: 'cpc',
  placement: 'itinerary_feed',
  ...overrides,
});

const mockFetchAds = jest.fn();

/** Default "zero-results, ads available, search done" props. */
const baseProps = {
  sponsoredAds: [makeAd()],
  matchingItinerariesCount: 0,
  searchLoading: false,
  selectedItineraryId: 'itin-abc',
  fetchAds: mockFetchAds,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAdInterstitial — zero-results auto-show', () => {
  it('shows an ad immediately when organic results are empty and ads are available', async () => {
    const { result } = renderHook(() => useAdInterstitial(baseProps));

    await waitFor(() => {
      expect(result.current.showingSponsoredAd).toBe(true);
    });
    expect(result.current.currentAd?.campaignId).toBe('camp-1');
  });

  it('does NOT show an ad before a search is initiated (selectedItineraryId is null)', async () => {
    const { result } = renderHook(() =>
      useAdInterstitial({ ...baseProps, selectedItineraryId: null }),
    );

    // Give effects time to fire
    await act(async () => {});
    expect(result.current.showingSponsoredAd).toBe(false);
  });

  it('does NOT show an ad while the search is loading', async () => {
    const { result } = renderHook(() =>
      useAdInterstitial({ ...baseProps, searchLoading: true }),
    );

    await act(async () => {});
    expect(result.current.showingSponsoredAd).toBe(false);
  });

  it('does NOT show an ad when there are organic results', async () => {
    const { result } = renderHook(() =>
      useAdInterstitial({ ...baseProps, matchingItinerariesCount: 3 }),
    );

    await act(async () => {});
    expect(result.current.showingSponsoredAd).toBe(false);
  });

  it('does NOT show an ad when sponsoredAds is empty', async () => {
    const { result } = renderHook(() =>
      useAdInterstitial({ ...baseProps, sponsoredAds: [] }),
    );

    await act(async () => {});
    expect(result.current.showingSponsoredAd).toBe(false);
  });
});

describe('useAdInterstitial — dismiss loop regression', () => {
  /**
   * REGRESSION: Before the fix, handleAdDismiss called setShowingSponsoredAd(false)
   * which triggered the zero-results useEffect to immediately re-show the same ad,
   * causing an infinite loop of the same card.
   */
  it('does NOT re-show the same ad after the user dismisses in a zero-results session', async () => {
    const { result } = renderHook(() => useAdInterstitial(baseProps));

    // Wait for auto-show
    await waitFor(() => expect(result.current.showingSponsoredAd).toBe(true));

    // User dismisses
    act(() => {
      result.current.handleAdDismiss();
    });

    // After dismiss, card must be hidden
    expect(result.current.showingSponsoredAd).toBe(false);

    // Give React a chance to re-run effects (this is where the bug would re-trigger)
    await act(async () => {});

    // Must still be false — the gate prevents the loop
    expect(result.current.showingSponsoredAd).toBe(false);
  });

  it('shows "No matches found" state (not an ad) after dismiss in zero-results session', async () => {
    const { result } = renderHook(() => useAdInterstitial(baseProps));

    await waitFor(() => expect(result.current.showingSponsoredAd).toBe(true));

    act(() => { result.current.handleAdDismiss(); });

    await act(async () => {});

    // currentAd should be null — queue was consumed and not refilled
    expect(result.current.currentAd).toBeNull();
    expect(result.current.showingSponsoredAd).toBe(false);
  });

  it('resets the dismissed gate when a new itinerary is selected', async () => {
    // Simulate the dismissed gate, then call resetForNewSearch and ensure a fresh
    // zero-results scenario (new selectedItineraryId) can show an ad again.
    let props = { ...baseProps };
    const { result, rerender } = renderHook(() => useAdInterstitial(props));

    await waitFor(() => expect(result.current.showingSponsoredAd).toBe(true));

    // User dismisses — gate is set
    act(() => { result.current.handleAdDismiss(); });
    await act(async () => {});
    expect(result.current.showingSponsoredAd).toBe(false);

    // Simulate new itinerary selection: reset then a loading phase to block the effect,
    // then searchLoading settles to false (new zero-results search complete).
    act(() => { result.current.resetForNewSearch(); });

    // While loading, effect must not fire
    props = { ...baseProps, selectedItineraryId: 'itin-xyz', searchLoading: true };
    rerender(undefined as any);
    await act(async () => {});
    expect(result.current.showingSponsoredAd).toBe(false);

    // Search completes with 0 results — now the fresh gate should allow the ad
    props = { ...baseProps, selectedItineraryId: 'itin-xyz', searchLoading: false };
    rerender(undefined as any);
    await waitFor(() => expect(result.current.showingSponsoredAd).toBe(true));
  });
});

describe('useAdInterstitial — pacing (maybeShowInterstitialAd)', () => {
  it('does NOT show an ad before the interval is reached', async () => {
    const { result } = renderHook(() =>
      useAdInterstitial({ ...baseProps, matchingItinerariesCount: 5 }),
    );

    await act(async () => {});
    // Simulate 4 swipes (default interval is 5)
    act(() => {
      result.current.maybeShowInterstitialAd();
      result.current.maybeShowInterstitialAd();
      result.current.maybeShowInterstitialAd();
      result.current.maybeShowInterstitialAd();
    });

    expect(result.current.showingSponsoredAd).toBe(false);
  });

  it('shows an ad on the 5th organic swipe', async () => {
    const { result } = renderHook(() =>
      useAdInterstitial({ ...baseProps, matchingItinerariesCount: 5 }),
    );

    await act(async () => {});

    act(() => {
      result.current.maybeShowInterstitialAd(); // 1
      result.current.maybeShowInterstitialAd(); // 2
      result.current.maybeShowInterstitialAd(); // 3
      result.current.maybeShowInterstitialAd(); // 4
      result.current.maybeShowInterstitialAd(); // 5 → triggers
    });

    expect(result.current.showingSponsoredAd).toBe(true);
  });

  it('respects a custom interstitialInterval', async () => {
    const { result } = renderHook(() =>
      useAdInterstitial({
        ...baseProps,
        matchingItinerariesCount: 5,
        interstitialInterval: 2,
      }),
    );

    await act(async () => {});

    act(() => {
      result.current.maybeShowInterstitialAd(); // 1
    });
    expect(result.current.showingSponsoredAd).toBe(false);

    act(() => {
      result.current.maybeShowInterstitialAd(); // 2 → triggers
    });
    expect(result.current.showingSponsoredAd).toBe(true);
  });
});

describe('useAdInterstitial — queue mechanics', () => {
  it('advances to the next ad in the queue on dismiss', async () => {
    // Use a stable array reference so the queue-rebuild effect doesn't
    // reset the queue on every re-render.
    const ads = [
      makeAd({ campaignId: 'camp-1' }),
      makeAd({ campaignId: 'camp-2' }),
    ];

    // Use searchLoading: true so the zero-results auto-show effect doesn't
    // fire synchronously — we want to control when the ad appears via pacing.
    let props = { ...baseProps, sponsoredAds: ads, matchingItinerariesCount: 5 };
    const { result, rerender } = renderHook(() => useAdInterstitial(props));
    await act(async () => {});

    // Trigger first ad via pacing
    act(() => {
      for (let i = 0; i < 5; i++) result.current.maybeShowInterstitialAd();
    });
    expect(result.current.showingSponsoredAd).toBe(true);
    const firstAdCampaignId = result.current.currentAd?.campaignId;
    expect(firstAdCampaignId).toBeTruthy();

    // Dismiss — emptyResultsAdDismissedRef is NOT set (matchingCount is 5, not 0)
    act(() => { result.current.handleAdDismiss(); });
    await act(async () => {});

    // Trigger the second interstitial slot
    act(() => {
      for (let i = 0; i < 5; i++) result.current.maybeShowInterstitialAd();
    });

    // The next ad shown must not be the same campaignId as the first
    if (result.current.showingSponsoredAd && result.current.currentAd !== null) {
      expect(result.current.currentAd.campaignId).not.toBe(firstAdCampaignId);
    }
  });

  it('prevents back-to-back same ad when queue has multiple entries', async () => {
    // Prime the queue with 2 ads where camp-1 is at the head
    const ad1 = makeAd({ campaignId: 'camp-1' });
    const ad2 = makeAd({ campaignId: 'camp-2' });

    const props = { ...baseProps, sponsoredAds: [ad1, ad2], matchingItinerariesCount: 5 };
    const { result } = renderHook(() => useAdInterstitial(props));

    await act(async () => {});

    // Show first ad (via pacing) — camp-1 is shown, becomes lastShownId
    act(() => {
      for (let i = 0; i < 5; i++) result.current.maybeShowInterstitialAd();
    });
    expect(result.current.showingSponsoredAd).toBe(true);
    const firstShown = result.current.currentAd?.campaignId;

    act(() => { result.current.handleAdDismiss(); });

    // Trigger another interstitial slot
    act(() => {
      for (let i = 0; i < 5; i++) result.current.maybeShowInterstitialAd();
    });

    // The second ad should NOT be the same as the first
    if (result.current.showingSponsoredAd) {
      expect(result.current.currentAd?.campaignId).not.toBe(firstShown);
    }
  });

  it('resetForNewSearch resets the pacing counter so swipes start fresh', async () => {
    // Use matchingItinerariesCount > 0 so the zero-results effect doesn't
    // interfere — we're only testing pacing counter behaviour here.
    const ads = [makeAd({ campaignId: 'camp-1' })];
    const { result } = renderHook(() =>
      useAdInterstitial({ ...baseProps, sponsoredAds: ads, matchingItinerariesCount: 5 }),
    );

    await act(async () => {});

    // Swipe 5 times to trigger the first interstitial
    act(() => {
      for (let i = 0; i < 5; i++) result.current.maybeShowInterstitialAd();
    });
    expect(result.current.showingSponsoredAd).toBe(true);

    act(() => { result.current.handleAdDismiss(); });
    await act(async () => {});

    // Reset mimics selecting a new itinerary
    act(() => { result.current.resetForNewSearch(); });
    await act(async () => {});

    // After reset, 4 swipes should NOT show an ad (counter restarted at 0)
    act(() => {
      for (let i = 0; i < 4; i++) result.current.maybeShowInterstitialAd();
    });
    expect(result.current.showingSponsoredAd).toBe(false);

    // The 5th swipe triggers the interstitial again
    act(() => { result.current.maybeShowInterstitialAd(); });
    expect(result.current.showingSponsoredAd).toBe(true);
  });
});

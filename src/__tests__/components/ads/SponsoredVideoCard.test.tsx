/**
 * Unit Tests for SponsoredVideoCard Component
 *
 * Tests rendering, accessibility, impression tracking, and CTA interaction.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { useVideoPlayer } from 'expo-video';

jest.mock('../../../config/firebaseConfig');

import { SponsoredVideoCard } from '../../../components/ads/SponsoredVideoCard';
import type { AdUnit } from '../../../types/AdDelivery';

// Mock Linking.openURL
jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

const makeAd = (overrides?: Partial<AdUnit>): AdUnit => ({
  campaignId: 'camp-test-1',
  businessName: 'Bali Surf School',
  primaryText: 'Catch the best waves in Bali',
  cta: 'Book Now',
  landingUrl: 'https://balisurf.com',
  assetUrl: 'https://img.example.com/bali.jpg',
  creativeType: 'image',
  billingModel: 'cpm',
  placement: 'video_feed',
  ...overrides,
});

/** Ad with creativeType=video so the quartile polling useEffect does NOT return early. */
const makeVideoAd = (overrides?: Partial<AdUnit>): AdUnit =>
  makeAd({
    campaignId: 'camp-test-video',
    creativeType: 'video',
    assetUrl: 'https://video.example.com/ad.mp4',
    muxPlaybackUrl: undefined,
    ...overrides,
  });

/** Minimal mock player — override currentTime/duration per test as needed. */
function makePlayer(overrides?: { currentTime?: number; duration?: number }) {
  return {
    currentTime: overrides?.currentTime ?? 0,
    duration: overrides?.duration ?? 0,
    playing: false,
    muted: false,
    loop: false,
    play: jest.fn(),
    pause: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    remove: jest.fn(),
  };
}

describe('SponsoredVideoCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Sponsored badge', () => {
    const { getByText } = render(
      <SponsoredVideoCard ad={makeAd()} isActive={false} />,
    );

    expect(getByText('Sponsored')).toBeTruthy();
  });

  it('renders business name', () => {
    const { getByText } = render(
      <SponsoredVideoCard ad={makeAd()} isActive={false} />,
    );

    expect(getByText('Bali Surf School')).toBeTruthy();
  });

  it('renders primary text', () => {
    const { getByText } = render(
      <SponsoredVideoCard ad={makeAd()} isActive={false} />,
    );

    expect(getByText('Catch the best waves in Bali')).toBeTruthy();
  });

  it('renders CTA button with correct text', () => {
    const { getByText } = render(
      <SponsoredVideoCard ad={makeAd()} isActive={false} />,
    );

    expect(getByText('Book Now')).toBeTruthy();
  });

  it('renders default CTA when cta is not provided', () => {
    const { getByText } = render(
      <SponsoredVideoCard
        ad={makeAd({ cta: undefined })}
        isActive={false}
      />,
    );

    expect(getByText('Learn More')).toBeTruthy();
  });

  describe('Impression tracking', () => {
    it('fires onImpression when isActive becomes true', () => {
      const onImpression = jest.fn();

      const { rerender } = render(
        <SponsoredVideoCard
          ad={makeAd()}
          isActive={false}
          onImpression={onImpression}
        />,
      );

      expect(onImpression).not.toHaveBeenCalled();

      rerender(
        <SponsoredVideoCard
          ad={makeAd()}
          isActive={true}
          onImpression={onImpression}
        />,
      );

      expect(onImpression).toHaveBeenCalledTimes(1);
      expect(onImpression).toHaveBeenCalledWith('camp-test-1');
    });

    it('does NOT fire onImpression again after first activation', () => {
      const onImpression = jest.fn();

      const { rerender } = render(
        <SponsoredVideoCard
          ad={makeAd()}
          isActive={true}
          onImpression={onImpression}
        />,
      );

      // Deactivate and reactivate
      rerender(
        <SponsoredVideoCard
          ad={makeAd()}
          isActive={false}
          onImpression={onImpression}
        />,
      );
      rerender(
        <SponsoredVideoCard
          ad={makeAd()}
          isActive={true}
          onImpression={onImpression}
        />,
      );

      // Should still be 1 (dedup within component)
      expect(onImpression).toHaveBeenCalledTimes(1);
    });
  });

  describe('CTA interaction', () => {
    it('calls onCtaPress with campaignId on CTA tap', () => {
      const onCtaPress = jest.fn();

      const { getByText } = render(
        <SponsoredVideoCard
          ad={makeAd()}
          isActive={false}
          onCtaPress={onCtaPress}
        />,
      );

      fireEvent.press(getByText('Book Now'));

      expect(onCtaPress).toHaveBeenCalledWith('camp-test-1');
    });

    it('opens landing URL via Linking on CTA tap', () => {
      const { getByText } = render(
        <SponsoredVideoCard ad={makeAd()} isActive={false} />,
      );

      fireEvent.press(getByText('Book Now'));

      expect(Linking.openURL).toHaveBeenCalledWith('https://balisurf.com');
    });
  });

  describe('Accessibility', () => {
    it('has accessible label on CTA button', () => {
      const { getByLabelText } = render(
        <SponsoredVideoCard ad={makeAd()} isActive={false} />,
      );

      expect(
        getByLabelText('Book Now — opens Bali Surf School website'),
      ).toBeTruthy();
    });

    it('has accessible label on container', () => {
      const { getByLabelText } = render(
        <SponsoredVideoCard ad={makeAd()} isActive={false} />,
      );

      expect(
        getByLabelText('Sponsored ad from Bali Surf School'),
      ).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Section 9.3 — Quartile polling: inactive card fires nothing
// Section 9.2 — Quartile polling: each milestone fires exactly once
// ---------------------------------------------------------------------------
// Pattern: jest.useFakeTimers() per test; explicit unmount() + runAllTimers()
// before useRealTimers() so RNTL's afterEach cleanup runs with real timers.
// ---------------------------------------------------------------------------

describe('Quartile tracking — inactive card (Section 9.3)', () => {
  it('does not fire onQuartile when isActive is false, even at a 50% position', () => {
    jest.useFakeTimers();

    // Player at 50% — would trigger Q25 and Q50 if polling were active.
    (useVideoPlayer as jest.Mock).mockReturnValueOnce(makePlayer({ currentTime: 20, duration: 40 }));

    const onQuartile = jest.fn();
    const { unmount } = render(
      <SponsoredVideoCard ad={makeVideoAd()} isActive={false} onQuartile={onQuartile} />,
    );

    // Advance 4 potential poll cycles — interval should never have been set.
    act(() => jest.advanceTimersByTime(2000));

    expect(onQuartile).not.toHaveBeenCalled();

    unmount();
    act(() => jest.runAllTimers());
    jest.useRealTimers();
  });

  it('starts firing quartiles once the card becomes active after being inactive', () => {
    jest.useFakeTimers();

    const player = makePlayer({ currentTime: 20, duration: 40 }); // 50%
    // Use mockReturnValue (not Once) so the rerender call to useVideoPlayer
    // also returns the same player reference with duration > 0.
    (useVideoPlayer as jest.Mock).mockReturnValue(player);

    const onQuartile = jest.fn();
    const { rerender, unmount } = render(
      <SponsoredVideoCard ad={makeVideoAd()} isActive={false} onQuartile={onQuartile} />,
    );

    // Poll cycles while inactive — nothing fires.
    act(() => jest.advanceTimersByTime(1500));
    expect(onQuartile).not.toHaveBeenCalled();

    // Activate the card — polling interval starts.
    rerender(<SponsoredVideoCard ad={makeVideoAd()} isActive={true} onQuartile={onQuartile} />);
    act(() => jest.advanceTimersByTime(600));

    expect(onQuartile).toHaveBeenCalled();

    unmount();
    act(() => jest.runAllTimers());
    jest.useRealTimers();
    (useVideoPlayer as jest.Mock).mockReset();
  });

  it('stops firing quartiles when the card is deactivated mid-session', () => {
    jest.useFakeTimers();

    const player = makePlayer({ currentTime: 0, duration: 40 });
    (useVideoPlayer as jest.Mock).mockReturnValueOnce(player);

    const onQuartile = jest.fn();
    const { rerender, unmount } = render(
      <SponsoredVideoCard ad={makeVideoAd()} isActive={true} onQuartile={onQuartile} />,
    );

    // Advance to Q25.
    player.currentTime = 10;
    act(() => jest.advanceTimersByTime(600));
    expect(onQuartile).toHaveBeenCalledTimes(1);
    expect(onQuartile).toHaveBeenCalledWith('camp-test-video', 25);

    // Deactivate — interval is cleared by the useEffect cleanup.
    rerender(<SponsoredVideoCard ad={makeVideoAd()} isActive={false} onQuartile={onQuartile} />);

    // Advance to what would be Q50 — no new calls because polling stopped.
    player.currentTime = 20;
    act(() => jest.advanceTimersByTime(1200));
    expect(onQuartile).toHaveBeenCalledTimes(1);

    unmount();
    act(() => jest.runAllTimers());
    jest.useRealTimers();
  });
});

describe('Quartile tracking — dedup within single mount (Section 9.2)', () => {
  it('fires Q25 exactly once even when the player position stays at 25% across multiple polls', () => {
    jest.useFakeTimers();

    // 10/40s = 25%
    (useVideoPlayer as jest.Mock).mockReturnValueOnce(makePlayer({ currentTime: 10, duration: 40 }));

    const onQuartile = jest.fn();
    const { unmount } = render(
      <SponsoredVideoCard ad={makeVideoAd()} isActive={true} onQuartile={onQuartile} />,
    );

    // 6 poll cycles — Q25 fires on cycle 1, must not fire on cycles 2–6.
    act(() => jest.advanceTimersByTime(3000));

    expect(onQuartile).toHaveBeenCalledTimes(1);
    expect(onQuartile).toHaveBeenCalledWith('camp-test-video', 25);

    unmount();
    act(() => jest.runAllTimers());
    jest.useRealTimers();
  });

  it('fires each of Q25 / Q50 / Q75 / Q100 exactly once as video progresses', () => {
    jest.useFakeTimers();

    // duration=100 makes the math simple (currentTime = pct).
    const player = makePlayer({ currentTime: 0, duration: 100 });
    (useVideoPlayer as jest.Mock).mockReturnValueOnce(player);

    const onQuartile = jest.fn();
    const { unmount } = render(
      <SponsoredVideoCard ad={makeVideoAd()} isActive={true} onQuartile={onQuartile} />,
    );

    // ── Q25 ──────────────────────────────────────────────────────────────
    player.currentTime = 25;
    act(() => jest.advanceTimersByTime(600));
    expect(onQuartile).toHaveBeenCalledWith('camp-test-video', 25);
    expect(onQuartile).toHaveBeenCalledTimes(1);

    // Second poll at same position — no duplicate.
    act(() => jest.advanceTimersByTime(600));
    expect(onQuartile).toHaveBeenCalledTimes(1);

    // ── Q50 ──────────────────────────────────────────────────────────────
    player.currentTime = 50;
    act(() => jest.advanceTimersByTime(600));
    expect(onQuartile).toHaveBeenCalledWith('camp-test-video', 50);
    expect(onQuartile).toHaveBeenCalledTimes(2);

    // ── Q75 ──────────────────────────────────────────────────────────────
    player.currentTime = 75;
    act(() => jest.advanceTimersByTime(600));
    expect(onQuartile).toHaveBeenCalledWith('camp-test-video', 75);
    expect(onQuartile).toHaveBeenCalledTimes(3);

    // ── Q100 (triggered at effectivePct=97%) ────────────────────────────
    player.currentTime = 98;
    act(() => jest.advanceTimersByTime(600));
    expect(onQuartile).toHaveBeenCalledWith('camp-test-video', 100);
    expect(onQuartile).toHaveBeenCalledTimes(4);

    // Additional polls — all four milestones already in the Set; no more calls.
    act(() => jest.advanceTimersByTime(1200));
    expect(onQuartile).toHaveBeenCalledTimes(4);

    unmount();
    act(() => jest.runAllTimers());
    jest.useRealTimers();
  });

  it('does not re-fire Q25 when the video loops and currentTime resets below 25%', () => {
    // This is the core "replay dedup" regression covered by 9.2 — the plan specifically
    // notes that quartilesFiredRef is NOT reset during a loop; only on component remount.
    jest.useFakeTimers();

    const player = makePlayer({ currentTime: 0, duration: 40 });
    (useVideoPlayer as jest.Mock).mockReturnValueOnce(player);

    const onQuartile = jest.fn();
    const { unmount } = render(
      <SponsoredVideoCard ad={makeVideoAd()} isActive={true} onQuartile={onQuartile} />,
    );

    // First loop pass — Q25 fires at 10s/40s = 25%.
    player.currentTime = 10;
    act(() => jest.advanceTimersByTime(600));
    expect(onQuartile).toHaveBeenCalledTimes(1);
    expect(onQuartile).toHaveBeenCalledWith('camp-test-video', 25);

    // Video loops — currentTime resets to 2s (below 25%).
    player.currentTime = 2;
    act(() => jest.advanceTimersByTime(600));
    // Q25 is already in quartilesFiredRef — must NOT fire again.
    expect(onQuartile).toHaveBeenCalledTimes(1);

    // Video plays past 25% again in the second loop.
    player.currentTime = 12;
    act(() => jest.advanceTimersByTime(600));
    expect(onQuartile).toHaveBeenCalledTimes(1);

    unmount();
    act(() => jest.runAllTimers());
    jest.useRealTimers();
  });
});

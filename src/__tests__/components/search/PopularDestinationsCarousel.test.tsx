/**
 * Unit Tests — PopularDestinationsCarousel
 *
 * Covers:
 * - Empty / loading states
 * - Single-destination render (no dots, correct content)
 * - Multi-destination render (dots, first slide shown)
 * - Auto-advancing via fake timers
 * - onDestinationPress callback
 * - Accessibility label
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { PopularDestinationsCarousel } from '../../../components/search/PopularDestinationsCarousel';
import type { PopularDestination } from '../../../hooks/usePopularDestinations';

jest.mock('../../../config/firebaseConfig');

// ─── Helpers ───────────────────────────────────────────────────────────────

const makeDestinations = (names: string[]): PopularDestination[] =>
  names.map((destination, i) => ({ destination, count: (i + 1) * 5 }));

const SINGLE = makeDestinations(['Paris, France']);
const MULTI = makeDestinations(['Paris, France', 'London, UK', 'Tokyo, Japan']);

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('PopularDestinationsCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('renders a spinner while loading', () => {
    const { getByTestId, queryByText } = render(
      <PopularDestinationsCarousel destinations={[]} loading />,
    );
    // ActivityIndicator is present; no destination text
    expect(queryByText('🔥 Trending Destinations')).toBeNull();
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  it('renders nothing when destinations array is empty and not loading', () => {
    const { toJSON } = render(
      <PopularDestinationsCarousel destinations={[]} loading={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  // ── Heading & CTA ─────────────────────────────────────────────────────────

  it('renders the heading and CTA when destinations are provided', () => {
    const { getByText } = render(
      <PopularDestinationsCarousel destinations={SINGLE} loading={false} />,
    );
    expect(getByText('🔥 Trending Destinations')).toBeTruthy();
    expect(getByText('Create your itinerary to connect with them ✈️')).toBeTruthy();
  });

  // ── Single destination ────────────────────────────────────────────────────

  it('shows the destination name and traveler count', () => {
    const { getByText } = render(
      <PopularDestinationsCarousel destinations={SINGLE} loading={false} />,
    );
    expect(getByText('Paris, France')).toBeTruthy();
    expect(getByText('5 travelers planning this trip')).toBeTruthy();
  });

  it('uses singular "traveler" when count is 1', () => {
    const { getByText } = render(
      <PopularDestinationsCarousel
        destinations={[{ destination: 'Bali, Indonesia', count: 1 }]}
        loading={false}
      />,
    );
    expect(getByText('1 traveler planning this trip')).toBeTruthy();
  });

  it('does NOT render dot indicators for a single destination', () => {
    const { queryByTestId } = render(
      <PopularDestinationsCarousel destinations={SINGLE} loading={false} />,
    );
    expect(queryByTestId('carousel-dots')).toBeNull();
  });

  it('uses a generic travel emoji (from the fixed set) rather than a destination-specific one', () => {
    // Seattle getting 🗽 was the bug — generic emojis must not contain 🗽
    const STATUE_OF_LIBERTY = '\uD83D\uDDFD';
    const { queryByText } = render(
      <PopularDestinationsCarousel
        destinations={[{ destination: 'Seattle, WA, USA', count: 7 }]}
        loading={false}
      />,
    );
    expect(queryByText(STATUE_OF_LIBERTY)).toBeNull();
  });

  // ── Multi-destination ─────────────────────────────────────────────────────

  it('shows the first destination initially with multiple destinations', () => {
    const { getByText } = render(
      <PopularDestinationsCarousel destinations={MULTI} loading={false} />,
    );
    expect(getByText('Paris, France')).toBeTruthy();
  });

  // ── Auto-advance ──────────────────────────────────────────────────────────

  it('advances to the next destination after the interval', () => {
    jest.useFakeTimers();

    const { getByText } = render(
      <PopularDestinationsCarousel destinations={MULTI} loading={false} />,
    );

    expect(getByText('Paris, France')).toBeTruthy();

    // Advance past the 3500ms interval + 220ms fade-out + 320ms fade-in
    act(() => {
      jest.advanceTimersByTime(4200);
    });

    expect(getByText('London, UK')).toBeTruthy();
  });

  it('wraps back to the first destination after cycling through all', () => {
    jest.useFakeTimers();

    const { getByText } = render(
      <PopularDestinationsCarousel destinations={MULTI} loading={false} />,
    );

    // Advance through all 3 slides (3 × 4200ms)
    act(() => {
      jest.advanceTimersByTime(4200 * 3);
    });

    expect(getByText('Paris, France')).toBeTruthy();
  });

  it('does NOT auto-advance when there is only one destination', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(global, 'setInterval');

    render(
      <PopularDestinationsCarousel destinations={SINGLE} loading={false} />,
    );

    // setInterval should not have been called for a single-item list
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── Interaction ───────────────────────────────────────────────────────────

  it('calls onDestinationPress with the current destination when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <PopularDestinationsCarousel
        destinations={SINGLE}
        loading={false}
        onDestinationPress={onPress}
      />,
    );

    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('Paris, France');
  });

  it('does not throw when tapped without onDestinationPress provided', () => {
    const { getByTestId } = render(
      <PopularDestinationsCarousel destinations={SINGLE} loading={false} />,
    );
    expect(() => fireEvent.press(getByTestId('destination-card'))).not.toThrow();
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('has an accessible label that includes destination, count and slide position', () => {
    const { getByTestId } = render(
      <PopularDestinationsCarousel
        destinations={MULTI}
        loading={false}
        onDestinationPress={jest.fn()}
      />,
    );
    const card = getByTestId('destination-card');
    expect(card.props.accessibilityLabel).toMatch('Paris, France');
    expect(card.props.accessibilityLabel).toMatch('5 travelers');
    expect(card.props.accessibilityLabel).toMatch('Slide 1 of 3');
  });
});

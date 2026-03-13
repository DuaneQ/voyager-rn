/**
 * Unit Tests for SponsoredItineraryCard Component
 *
 * Tests rendering, accessibility, impression tracking, CTA interaction,
 * and dismiss behavior.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('../../../config/firebaseConfig');

import { SponsoredItineraryCard } from '../../../components/ads/SponsoredItineraryCard';
import type { AdUnit } from '../../../types/AdDelivery';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

const makeAd = (overrides?: Partial<AdUnit>): AdUnit => ({
  campaignId: 'camp-itin-1',
  businessName: 'Tokyo Ramen House',
  primaryText: 'Authentic ramen experience in Shibuya',
  cta: 'Visit Website',
  landingUrl: 'https://tokyoramen.jp',
  assetUrl: 'https://img.example.com/ramen.jpg',
  creativeType: 'image',
  billingModel: 'cpc',
  promoCode: 'TRAVEL10',
  placement: 'itinerary_feed',
  ...overrides,
});

describe('SponsoredItineraryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Sponsored badge', () => {
    const { getByText } = render(
      <SponsoredItineraryCard ad={makeAd()} />,
    );

    expect(getByText('Sponsored')).toBeTruthy();
  });

  it('renders business name', () => {
    const { getByText } = render(
      <SponsoredItineraryCard ad={makeAd()} />,
    );

    expect(getByText('Tokyo Ramen House')).toBeTruthy();
  });

  it('renders primary text', () => {
    const { getByText } = render(
      <SponsoredItineraryCard ad={makeAd()} />,
    );

    expect(getByText('Authentic ramen experience in Shibuya')).toBeTruthy();
  });

  it('renders CTA button', () => {
    const { getByText } = render(
      <SponsoredItineraryCard ad={makeAd()} />,
    );

    expect(getByText('Visit Website')).toBeTruthy();
  });

  it('renders default CTA when not provided', () => {
    const { getByText } = render(
      <SponsoredItineraryCard ad={makeAd({ cta: undefined })} />,
    );

    expect(getByText('Learn More')).toBeTruthy();
  });

  it('renders promo code when provided', () => {
    const { getByText } = render(
      <SponsoredItineraryCard ad={makeAd()} />,
    );

    expect(getByText('TRAVEL10')).toBeTruthy();
  });

  it('does not render promo code when not provided', () => {
    const { queryByText } = render(
      <SponsoredItineraryCard ad={makeAd({ promoCode: undefined })} />,
    );

    expect(queryByText('TRAVEL10')).toBeNull();
  });

  describe('Impression tracking', () => {
    it('fires onImpression when visible', () => {
      const onImpression = jest.fn();

      render(
        <SponsoredItineraryCard
          ad={makeAd()}
          isVisible={true}
          onImpression={onImpression}
        />,
      );

      expect(onImpression).toHaveBeenCalledTimes(1);
      expect(onImpression).toHaveBeenCalledWith('camp-itin-1');
    });

    it('does not fire onImpression when not visible', () => {
      const onImpression = jest.fn();

      render(
        <SponsoredItineraryCard
          ad={makeAd()}
          isVisible={false}
          onImpression={onImpression}
        />,
      );

      expect(onImpression).not.toHaveBeenCalled();
    });

    it('fires onImpression only once', () => {
      const onImpression = jest.fn();

      const { rerender } = render(
        <SponsoredItineraryCard
          ad={makeAd()}
          isVisible={true}
          onImpression={onImpression}
        />,
      );

      rerender(
        <SponsoredItineraryCard
          ad={makeAd()}
          isVisible={false}
          onImpression={onImpression}
        />,
      );

      rerender(
        <SponsoredItineraryCard
          ad={makeAd()}
          isVisible={true}
          onImpression={onImpression}
        />,
      );

      expect(onImpression).toHaveBeenCalledTimes(1);
    });
  });

  describe('CTA interaction', () => {
    it('calls onCtaPress with campaignId', () => {
      const onCtaPress = jest.fn();

      const { getByText } = render(
        <SponsoredItineraryCard
          ad={makeAd()}
          onCtaPress={onCtaPress}
        />,
      );

      fireEvent.press(getByText('Visit Website'));

      expect(onCtaPress).toHaveBeenCalledWith('camp-itin-1');
    });

    it('opens landing URL via Linking', () => {
      const { getByText } = render(
        <SponsoredItineraryCard ad={makeAd()} />,
      );

      fireEvent.press(getByText('Visit Website'));

      expect(Linking.openURL).toHaveBeenCalledWith('https://tokyoramen.jp');
    });
  });

  describe('Dismiss', () => {
    it('calls onDismiss with campaignId when dismiss button is pressed', () => {
      const onDismiss = jest.fn();

      const { getByLabelText } = render(
        <SponsoredItineraryCard
          ad={makeAd()}
          onDismiss={onDismiss}
        />,
      );

      fireEvent.press(getByLabelText('Dismiss this ad'));

      expect(onDismiss).toHaveBeenCalledWith('camp-itin-1');
    });
  });

  describe('Accessibility', () => {
    it('has accessible CTA label', () => {
      const { getByLabelText } = render(
        <SponsoredItineraryCard ad={makeAd()} />,
      );

      expect(
        getByLabelText('Visit Website — opens Tokyo Ramen House website'),
      ).toBeTruthy();
    });
  });
});

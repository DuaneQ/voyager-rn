/**
 * Unit Tests for SponsoredVideoCard Component
 *
 * Tests rendering, accessibility, impression tracking, and CTA interaction.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

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

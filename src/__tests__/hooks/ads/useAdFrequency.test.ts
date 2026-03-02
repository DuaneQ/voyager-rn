/**
 * Unit Tests for useAdFrequency Hook
 *
 * Tests ad insertion frequency logic, including:
 * - Ad insertion index calculation
 * - Content list splicing
 * - Session count tracking and limits
 * - Reset on pull-to-refresh
 * - Edge cases (empty lists, more ads than slots, etc.)
 */

import { renderHook, act } from '@testing-library/react-native';
import { useAdFrequency } from '../../../hooks/ads/useAdFrequency';
import type { AdUnit } from '../../../types/AdDelivery';

// Constants from the hook (mirrored for test assertions)
const FIRST_AD_AFTER = 4;
const AD_INTERVAL = 5;
const MAX_ADS_PER_SESSION = 10;

const makeAd = (id: string): AdUnit => ({
  campaignId: id,
  businessName: `Business ${id}`,
  primaryText: `Ad text ${id}`,
  cta: 'Learn More',
  landingUrl: `https://example.com/${id}`,
  placement: 'video_feed',
  creativeType: 'image',
  assetUrl: `https://img.example.com/${id}.jpg`,
  billingModel: 'cpm',
});

describe('useAdFrequency', () => {
  describe('getAdInsertionIndices', () => {
    it('should return empty array when no content', () => {
      const { result } = renderHook(() => useAdFrequency());

      const indices = result.current.getAdInsertionIndices(0, 3);
      expect(indices).toEqual([]);
    });

    it('should return empty array when no ads available', () => {
      const { result } = renderHook(() => useAdFrequency());

      const indices = result.current.getAdInsertionIndices(20, 0);
      expect(indices).toEqual([]);
    });

    it('should place first ad at index FIRST_AD_AFTER', () => {
      const { result } = renderHook(() => useAdFrequency());

      const indices = result.current.getAdInsertionIndices(20, 5);
      expect(indices[0]).toBe(FIRST_AD_AFTER);
    });

    it('should space subsequent ads by AD_INTERVAL', () => {
      const { result } = renderHook(() => useAdFrequency());

      const indices = result.current.getAdInsertionIndices(30, 5);
      expect(indices).toEqual([4, 9, 14, 19, 24]);
    });

    it('should not exceed available ads count', () => {
      const { result } = renderHook(() => useAdFrequency());

      const indices = result.current.getAdInsertionIndices(100, 2);
      expect(indices).toHaveLength(2);
    });

    it('should not place ads beyond content length', () => {
      const { result } = renderHook(() => useAdFrequency());

      // Only 5 items — first ad would be at index 4, next at 9 (out of range)
      const indices = result.current.getAdInsertionIndices(5, 10);
      expect(indices).toEqual([4]);
    });

    it('should return empty when content is shorter than FIRST_AD_AFTER', () => {
      const { result } = renderHook(() => useAdFrequency());

      const indices = result.current.getAdInsertionIndices(3, 5);
      expect(indices).toEqual([]);
    });
  });

  describe('spliceAdsIntoList', () => {
    it('should return content-wrapped items when no ads', () => {
      const { result } = renderHook(() => useAdFrequency());
      const content = ['a', 'b', 'c'];

      const mixed = result.current.spliceAdsIntoList(content, []);
      expect(mixed).toHaveLength(3);
      expect(mixed.every((item) => item.type === 'content')).toBe(true);
    });

    it('should return empty array when no content', () => {
      const { result } = renderHook(() => useAdFrequency());
      const ads = [makeAd('1')];

      const mixed = result.current.spliceAdsIntoList([], ads);
      expect(mixed).toEqual([]);
    });

    it('should splice ads at correct positions', () => {
      const { result } = renderHook(() => useAdFrequency());
      const content = Array.from({ length: 15 }, (_, i) => `video-${i}`);
      const ads = [makeAd('ad-1'), makeAd('ad-2')];

      const mixed = result.current.spliceAdsIntoList(content, ads);

      // Total items: 15 content + 2 ads = 17
      expect(mixed).toHaveLength(17);

      // Ad at index 4 (before content[4])
      expect(mixed[4].type).toBe('ad');
      if (mixed[4].type === 'ad') {
        expect(mixed[4].ad.campaignId).toBe('ad-1');
      }

      // Ad at index 10 (before content[9], shifted by 1 from previous ad insertion)
      expect(mixed[10].type).toBe('ad');
      if (mixed[10].type === 'ad') {
        expect(mixed[10].ad.campaignId).toBe('ad-2');
      }
    });

    it('should tag content items correctly', () => {
      const { result } = renderHook(() => useAdFrequency());
      const content = ['alpha', 'beta'];

      const mixed = result.current.spliceAdsIntoList(content, []);
      expect(mixed[0]).toEqual({ type: 'content', item: 'alpha' });
      expect(mixed[1]).toEqual({ type: 'content', item: 'beta' });
    });

    it('should tag ad items correctly', () => {
      const { result } = renderHook(() => useAdFrequency());
      const content = Array.from({ length: 10 }, (_, i) => `v-${i}`);
      const ads = [makeAd('ad-1')];

      const mixed = result.current.spliceAdsIntoList(content, ads);
      const adItem = mixed.find((item) => item.type === 'ad');

      expect(adItem).toBeDefined();
      if (adItem?.type === 'ad') {
        expect(adItem.ad.campaignId).toBe('ad-1');
      }
    });
  });

  describe('session count & MAX_ADS_PER_SESSION', () => {
    it('should respect MAX_ADS_PER_SESSION across multiple splices', () => {
      const { result } = renderHook(() => useAdFrequency());
      const content = Array.from({ length: 100 }, (_, i) => `v-${i}`);
      const ads = Array.from({ length: 15 }, (_, i) => makeAd(`ad-${i}`));

      const mixed = result.current.spliceAdsIntoList(content, ads);
      const adCount = mixed.filter((item) => item.type === 'ad').length;

      expect(adCount).toBeLessThanOrEqual(MAX_ADS_PER_SESSION);
    });
  });

  describe('resetSessionCount', () => {
    it('should allow more ads after reset', () => {
      const { result } = renderHook(() => useAdFrequency());
      const content = Array.from({ length: 100 }, (_, i) => `v-${i}`);
      const ads = Array.from({ length: 15 }, (_, i) => makeAd(`ad-${i}`));

      // First splice uses up session slots
      result.current.spliceAdsIntoList(content, ads);

      // Reset
      act(() => {
        result.current.resetSessionCount();
      });

      // Should be able to splice ads again
      const mixed2 = result.current.spliceAdsIntoList(content, ads);
      const adCount = mixed2.filter((item) => item.type === 'ad').length;

      expect(adCount).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle single content item', () => {
      const { result } = renderHook(() => useAdFrequency());

      const mixed = result.current.spliceAdsIntoList(
        ['only-one'],
        [makeAd('1')],
      );
      // Single item, FIRST_AD_AFTER=4 so no ad slots
      expect(mixed).toHaveLength(1);
      expect(mixed[0].type).toBe('content');
    });

    it('should handle exactly FIRST_AD_AFTER content items', () => {
      const { result } = renderHook(() => useAdFrequency());
      const content = Array.from({ length: FIRST_AD_AFTER }, (_, i) => `v-${i}`);

      const mixed = result.current.spliceAdsIntoList(content, [makeAd('1')]);
      // Index FIRST_AD_AFTER == content.length, so no slot (< not <=)
      expect(mixed).toHaveLength(FIRST_AD_AFTER);
    });

    it('should handle FIRST_AD_AFTER + 1 content items (exactly one slot)', () => {
      const { result } = renderHook(() => useAdFrequency());
      const content = Array.from(
        { length: FIRST_AD_AFTER + 1 },
        (_, i) => `v-${i}`,
      );

      const mixed = result.current.spliceAdsIntoList(content, [makeAd('1')]);
      expect(mixed).toHaveLength(FIRST_AD_AFTER + 2); // content + 1 ad
      expect(mixed[FIRST_AD_AFTER].type).toBe('ad');
    });
  });
});

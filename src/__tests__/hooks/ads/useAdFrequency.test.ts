/**
 * Unit Tests for useAdFrequency Hook
 *
 * Tests ad insertion frequency logic, including:
 * - Ad insertion index calculation
 * - Content list splicing
 * - Edge cases (empty lists, more ads than slots, etc.)
 */

import { renderHook } from '@testing-library/react-native';
import { useAdFrequency } from '../../../hooks/ads/useAdFrequency';
import type { AdUnit } from '../../../types/AdDelivery';

// Constants from the hook (mirrored for test assertions)
const FIRST_AD_AFTER = 4;
const AD_INTERVAL = 5;

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

      // 30 items → slots at 4, 9, 14, 19, 24, 29 (all valid positions)
      const indices = result.current.getAdInsertionIndices(30, 5);
      expect(indices).toEqual([4, 9, 14, 19, 24, 29]);
    });

    it('should generate all slots regardless of ad pool size', () => {
      const { result } = renderHook(() => useAdFrequency());

      // 100 items, only 2 unique ads — but slots should fill the whole feed
      const indices = result.current.getAdInsertionIndices(100, 2);
      // Slots at 4, 9, 14, ... 99 → 20 slots
      expect(indices).toHaveLength(20);
      expect(indices[0]).toBe(FIRST_AD_AFTER);
      expect(indices[1]).toBe(FIRST_AD_AFTER + AD_INTERVAL);
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

      // Total items: 15 content + 3 ad slots (at indices 4, 9, 14) = 18
      expect(mixed).toHaveLength(18);

      // Ad at index 5 (after content[4]) — inserts AFTER the slot item
      expect(mixed[5].type).toBe('ad');
      if (mixed[5].type === 'ad') {
        expect(mixed[5].ad.campaignId).toBe('ad-1');
      }

      // Ad at index 11 (after content[9], shifted by 1 from previous ad insertion)
      expect(mixed[11].type).toBe('ad');
      if (mixed[11].type === 'ad') {
        expect(mixed[11].ad.campaignId).toBe('ad-2');
      }
    });

    it('should cycle ads when more slots than unique ads', () => {
      const { result } = renderHook(() => useAdFrequency());
      // 10 content items → slots at index 4 and 9
      const content = Array.from({ length: 10 }, (_, i) => `v-${i}`);
      const ads = [makeAd('ad-1')]; // only one unique ad

      const mixed = result.current.spliceAdsIntoList(content, ads);
      // 10 content + 2 ad slots = 12
      expect(mixed).toHaveLength(12);
      const adItems = mixed.filter((item) => item.type === 'ad');
      expect(adItems).toHaveLength(2);
      adItems.forEach((item) => {
        if (item.type === 'ad') expect(item.ad.campaignId).toBe('ad-1');
      });
    });

    it('should fill ad slots indefinitely for a large feed', () => {
      const { result } = renderHook(() => useAdFrequency());
      // 50 content items → slots at 4, 9, 14, 19, 24, 29, 34, 39, 44, 49 = 10 slots
      const content = Array.from({ length: 50 }, (_, i) => `v-${i}`);
      const ads = [makeAd('a1'), makeAd('a2')];

      const mixed = result.current.spliceAdsIntoList(content, ads);
      expect(mixed).toHaveLength(60); // 50 content + 10 ad slots
      const adItems = mixed.filter((item) => item.type === 'ad');
      expect(adItems).toHaveLength(10);
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
      // Ad appears AFTER content[FIRST_AD_AFTER], i.e. the last position
      expect(mixed[FIRST_AD_AFTER + 1].type).toBe('ad');
    });
  });
});

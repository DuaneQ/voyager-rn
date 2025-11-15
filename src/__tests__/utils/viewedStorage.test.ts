/**
 * Unit Tests for viewedStorage utility
 * 
 * @module __tests__/utils/viewedStorage.test
 * @description Comprehensive tests for AsyncStorage-based viewed itinerary tracking.
 * Tests cover: save/get operations, cache management, legacy format handling,
 * error scenarios, and edge cases.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getViewedItineraries,
  saveViewedItinerary,
  saveViewedItineraries,
  hasViewedItinerary,
  clearViewedItineraries,
  clearCache,
  getViewedCount,
} from '../../utils/viewedStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('viewedStorage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clear internal cache
    clearCache();
  });

  describe('getViewedItineraries', () => {
    it('should return empty Set when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getViewedItineraries();

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('VIEWED_ITINERARIES');
    });

    it('should return Set with string IDs from storage', async () => {
      const mockData = JSON.stringify(['id1', 'id2', 'id3']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockData);

      const result = await getViewedItineraries();

      expect(result.size).toBe(3);
      expect(result.has('id1')).toBe(true);
      expect(result.has('id2')).toBe(true);
      expect(result.has('id3')).toBe(true);
    });

    it('should handle legacy object format {id: string}', async () => {
      const mockData = JSON.stringify([
        { id: 'legacy1' },
        { id: 'legacy2' },
        'modern3',
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockData);

      const result = await getViewedItineraries();

      expect(result.size).toBe(3);
      expect(result.has('legacy1')).toBe(true);
      expect(result.has('legacy2')).toBe(true);
      expect(result.has('modern3')).toBe(true);
    });

    it('should filter out invalid entries (null, undefined, empty)', async () => {
      const mockData = JSON.stringify([
        'valid1',
        null,
        undefined,
        '',
        'valid2',
        { id: '' },
        { id: 'valid3' },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockData);

      const result = await getViewedItineraries();

      expect(result.size).toBe(3);
      expect(result.has('valid1')).toBe(true);
      expect(result.has('valid2')).toBe(true);
      expect(result.has('valid3')).toBe(true);
    });

    it('should return empty Set on JSON parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json{');

      const result = await getViewedItineraries();

      expect(result.size).toBe(0);
    });

    it('should use cached data on subsequent calls', async () => {
      const mockData = JSON.stringify(['id1', 'id2']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockData);

      // First call
      const result1 = await getViewedItineraries();
      expect(result1.size).toBe(2);
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await getViewedItineraries();
      expect(result2.size).toBe(2);
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('saveViewedItinerary', () => {
    it('should save a new itinerary ID to storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveViewedItinerary('new-id');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'VIEWED_ITINERARIES',
        JSON.stringify(['new-id'])
      );
    });

    it('should append to existing IDs', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id1', 'id2'])
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveViewedItinerary('id3');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'VIEWED_ITINERARIES',
        JSON.stringify(['id1', 'id2', 'id3'])
      );
    });

    it('should not duplicate existing ID', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id1', 'id2'])
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveViewedItinerary('id1');

      // Should not call setItem since ID already exists
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      // Should not throw
      await expect(saveViewedItinerary('id1')).resolves.not.toThrow();
    });

    it('should update cache after saving', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveViewedItinerary('id1');
      
      // Second save should use cache
      await saveViewedItinerary('id2');

      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1); // Only first call
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveViewedItineraries', () => {
    it('should save multiple IDs at once', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveViewedItineraries(['id1', 'id2', 'id3']);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'VIEWED_ITINERARIES',
        JSON.stringify(['id1', 'id2', 'id3'])
      );
    });

    it('should merge with existing IDs without duplicates', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id1', 'id2'])
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveViewedItineraries(['id2', 'id3', 'id4']);

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const savedIds = JSON.parse(savedData);
      
      expect(savedIds).toHaveLength(4);
      expect(savedIds).toContain('id1');
      expect(savedIds).toContain('id2');
      expect(savedIds).toContain('id3');
      expect(savedIds).toContain('id4');
    });

    it('should handle empty array', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await saveViewedItineraries([]);

      // Should not save anything for empty array
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should filter out invalid IDs', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveViewedItineraries(['valid1', '', null as any, 'valid2']);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'VIEWED_ITINERARIES',
        JSON.stringify(['valid1', 'valid2'])
      );
    });
  });

  describe('hasViewedItinerary', () => {
    it('should return true for viewed itinerary', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id1', 'id2', 'id3'])
      );

      const result = await hasViewedItinerary('id2');

      expect(result).toBe(true);
    });

    it('should return false for unviewed itinerary', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id1', 'id2'])
      );

      const result = await hasViewedItinerary('id3');

      expect(result).toBe(false);
    });

    it('should return false when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await hasViewedItinerary('id1');

      expect(result).toBe(false);
    });

    it('should use cache for performance', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id1', 'id2'])
      );

      // First check loads from storage
      await hasViewedItinerary('id1');
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);

      // Second check uses cache
      await hasViewedItinerary('id2');
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearViewedItineraries', () => {
    it('should remove data from AsyncStorage', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await clearViewedItineraries();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('VIEWED_ITINERARIES');
    });

    it('should clear internal cache', async () => {
      // Setup cache with data
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id1', 'id2'])
      );
      await getViewedItineraries(); // Load cache

      // Clear
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      await clearViewedItineraries();

      // Next get should return empty set (cache set to empty Set)
      const result = await getViewedItineraries();
      
      expect(result.size).toBe(0);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('VIEWED_ITINERARIES');
      // Cache is set to empty Set, not null, so no reload needed
    });

    it('should handle errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(
        new Error('Remove error')
      );

      await expect(clearViewedItineraries()).resolves.not.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear internal cache without affecting storage', async () => {
      // Setup cache
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id1', 'id2'])
      );
      await getViewedItineraries(); // Load cache
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);

      // Clear cache only
      clearCache();

      // Next get should reload from storage
      await getViewedItineraries();
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2);
      
      // Storage should NOT be modified
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('getViewedCount', () => {
    it('should return correct count of viewed itineraries', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id1', 'id2', 'id3', 'id4'])
      );

      const count = await getViewedCount();

      expect(count).toBe(4);
    });

    it('should return 0 when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const count = await getViewedCount();

      expect(count).toBe(0);
    });

    it('should use cached data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id1', 'id2'])
      );

      await getViewedCount();
      await getViewedCount();

      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large datasets efficiently', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => `id${i}`);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(largeArray)
      );

      const result = await getViewedItineraries();

      expect(result.size).toBe(10000);
    });

    it('should handle concurrent save operations', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Simulate concurrent saves
      await Promise.all([
        saveViewedItinerary('id1'),
        saveViewedItinerary('id2'),
        saveViewedItinerary('id3'),
      ]);

      // All IDs should be saved
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const allSavedIds = calls.map(call => JSON.parse(call[1])).flat();
      
      expect(allSavedIds).toContain('id1');
      expect(allSavedIds).toContain('id2');
      expect(allSavedIds).toContain('id3');
    });

    it('should handle special characters in IDs', async () => {
      const specialIds = [
        'id-with-dashes',
        'id_with_underscores',
        'id@with@special',
        'id:with:colons',
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveViewedItineraries(specialIds);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'VIEWED_ITINERARIES',
        JSON.stringify(specialIds)
      );
    });

    it('should handle Unicode characters in IDs', async () => {
      const unicodeIds = ['日本語', 'español', 'العربية'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveViewedItineraries(unicodeIds);

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(savedData);
      expect(parsed).toEqual(unicodeIds);
    });
  });
});

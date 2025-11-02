/**
 * Viewed Itineraries Storage Utility
 * Tracks which itineraries the user has already viewed to avoid showing duplicates
 * Uses AsyncStorage (React Native) instead of localStorage (PWA)
 */

import * as storage from './storage';

const VIEWED_STORAGE_KEY = 'VIEWED_ITINERARIES';

/**
 * In-memory cache to avoid repeated AsyncStorage reads
 * Cleared when app restarts
 */
let _viewedIdsCache: Set<string> | null = null;

/**
 * Get all viewed itinerary IDs from storage
 * @returns Set of itinerary IDs
 */
export async function getViewedItineraries(): Promise<Set<string>> {
  try {
    // Return cached value if available
    if (_viewedIdsCache) {
      return new Set(_viewedIdsCache);
    }

    // Fetch from storage
    const stored = await storage.getItem(VIEWED_STORAGE_KEY);
    if (!stored) {
      _viewedIdsCache = new Set();
      return new Set();
    }

    // Parse stored JSON array
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      console.warn('[viewedStorage] Invalid stored format, expected array');
      _viewedIdsCache = new Set();
      return new Set();
    }

    // Filter to valid string IDs only
    const ids = parsed
      .filter((item: any) => {
        // Handle both plain strings and objects with id property
        if (typeof item === 'string' && item.trim() !== '') return true;
        if (item && typeof item === 'object' && typeof item.id === 'string' && item.id.trim() !== '') return true;
        return false;
      })
      .map((item: any) => typeof item === 'string' ? item : item.id);

    _viewedIdsCache = new Set(ids);
    return new Set(_viewedIdsCache);
  } catch (error) {
    console.error('[viewedStorage] Error reading viewed itineraries:', error);
    _viewedIdsCache = new Set();
    return new Set();
  }
}

/**
 * Save a single viewed itinerary ID
 * @param itineraryId - ID to save
 */
export async function saveViewedItinerary(itineraryId: string): Promise<void> {
  try {
    if (!itineraryId || typeof itineraryId !== 'string' || itineraryId.trim() === '') {
      console.warn('[viewedStorage] Invalid itinerary ID, skipping save');
      return;
    }

    // Ensure cache is initialized
    if (!_viewedIdsCache) {
      _viewedIdsCache = await getViewedItineraries();
    }

    // Skip if already viewed
    if (_viewedIdsCache.has(itineraryId)) {
      return;
    }

    // Add to cache
    _viewedIdsCache.add(itineraryId);

    // Persist to storage
    const idsArray = Array.from(_viewedIdsCache);
    await storage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(idsArray));
  } catch (error) {
    console.error('[viewedStorage] Error saving viewed itinerary:', error);
  }
}

/**
 * Save multiple viewed itinerary IDs at once
 * @param itineraryIds - Array of IDs to save
 */
export async function saveViewedItineraries(itineraryIds: string[]): Promise<void> {
  try {
    if (!Array.isArray(itineraryIds) || itineraryIds.length === 0) {
      return;
    }

    // Ensure cache is initialized
    if (!_viewedIdsCache) {
      _viewedIdsCache = await getViewedItineraries();
    }

    // Add all valid IDs to cache
    let hasChanges = false;
    for (const id of itineraryIds) {
      if (id && typeof id === 'string' && id.trim() !== '' && !_viewedIdsCache.has(id)) {
        _viewedIdsCache.add(id);
        hasChanges = true;
      }
    }

    // Persist if there were changes
    if (hasChanges) {
      const idsArray = Array.from(_viewedIdsCache);
      await storage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(idsArray));
    }
  } catch (error) {
    console.error('[viewedStorage] Error saving viewed itineraries:', error);
  }
}

/**
 * Check if an itinerary has been viewed
 * @param itineraryId - ID to check
 * @returns true if viewed, false otherwise
 */
export async function hasViewedItinerary(itineraryId: string): Promise<boolean> {
  try {
    if (!itineraryId || typeof itineraryId !== 'string') {
      return false;
    }

    // Ensure cache is initialized
    if (!_viewedIdsCache) {
      _viewedIdsCache = await getViewedItineraries();
    }

    return _viewedIdsCache.has(itineraryId);
  } catch (error) {
    console.error('[viewedStorage] Error checking viewed itinerary:', error);
    return false;
  }
}

/**
 * Clear all viewed itineraries (for testing or reset)
 */
export async function clearViewedItineraries(): Promise<void> {
  try {
    await storage.removeItem(VIEWED_STORAGE_KEY);
    _viewedIdsCache = new Set();
  } catch (error) {
    console.error('[viewedStorage] Error clearing viewed itineraries:', error);
  }
}

/**
 * Clear the in-memory cache (useful for testing)
 */
export function clearCache(): void {
  _viewedIdsCache = null;
}

/**
 * Get count of viewed itineraries
 * @returns Number of viewed itineraries
 */
export async function getViewedCount(): Promise<number> {
  try {
    if (!_viewedIdsCache) {
      _viewedIdsCache = await getViewedItineraries();
    }
    return _viewedIdsCache.size;
  } catch (error) {
    console.error('[viewedStorage] Error getting viewed count:', error);
    return 0;
  }
}

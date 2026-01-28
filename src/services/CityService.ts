/**
 * City Service Implementation
 * 
 * Provides fast, offline city search using static data from country-state-city package.
 * No API calls required - 148K+ cities with coordinates.
 * 
 * Benefits:
 * - Zero cost (no Google Places API calls)
 * - Fast (<10ms search vs 200-500ms API)
 * - Works offline
 * - Includes coordinates (solves Naples disambiguation bug)
 * 
 * Performance Note:
 * Loading 148K+ cities is expensive on Android (~20s on Hermes).
 * We use background preloading after app startup to avoid blocking the UI.
 * Call `preloadCities()` early in the app lifecycle for best UX.
 */

import { City as CSCCity, Country, ICity, ICountry } from 'country-state-city';
import { InteractionManager } from 'react-native';
import { City, CitySearchResult, CitySearchOptions } from '../types/City';
import { ICityService } from './interfaces/ICityService';

// Cache for country name lookups
const countryNameCache = new Map<string, string>();

// Preload state tracking
let preloadPromise: Promise<void> | null = null;
let preloadStartTime: number | null = null;

/**
 * Get full country name from ISO code with caching
 */
function getCountryName(countryCode: string): string {
  if (countryNameCache.has(countryCode)) {
    return countryNameCache.get(countryCode)!;
  }
  
  const country = Country.getCountryByCode(countryCode);
  const name = country?.name || countryCode;
  countryNameCache.set(countryCode, name);
  return name;
}

/**
 * Convert ICity from package to our City interface
 */
function convertCity(rawCity: ICity): City {
  return {
    name: rawCity.name,
    countryCode: rawCity.countryCode,
    country: getCountryName(rawCity.countryCode),
    stateCode: rawCity.stateCode,
    coordinates: {
      lat: parseFloat(rawCity.latitude || '0'),
      lng: parseFloat(rawCity.longitude || '0'),
    },
  };
}

/**
 * Parse a search query that may contain city, state, and/or country
 * Examples: "houston", "houston, tx", "houston, texas", "paris, france"
 */
function parseQuery(query: string): { cityPart: string; statePart: string; countryPart: string } {
  const parts = query.split(',').map(p => p.trim().toLowerCase()).filter(p => p.length > 0);
  
  return {
    cityPart: parts[0] || '',
    statePart: parts[1] || '',
    countryPart: parts[2] || '',
  };
}

/**
 * Check if a string matches another (starts with or equals)
 */
function matchesPart(value: string | undefined, searchPart: string): boolean {
  if (!searchPart || !value) return !searchPart; // Empty search part always matches
  const normalizedValue = value.toLowerCase();
  return normalizedValue.startsWith(searchPart) || normalizedValue === searchPart;
}

/**
 * Calculate search relevance score
 * Higher score = better match
 * Supports multi-part queries like "houston, tx" or "paris, france"
 */
function calculateScore(city: ICity, query: string, countryName: string): number {
  const { cityPart, statePart, countryPart } = parseQuery(query);
  const normalizedName = city.name.toLowerCase();
  const normalizedState = (city.stateCode || '').toLowerCase();
  const normalizedCountry = countryName.toLowerCase();
  
  let score = 0;
  
  // Must match city name first
  if (normalizedName === cityPart) {
    score += 100; // Exact city match
  } else if (normalizedName.startsWith(cityPart)) {
    score += 50; // City starts with query
  } else if (normalizedName.includes(cityPart)) {
    score += 25; // City contains query
  } else {
    return 0; // No city match, skip this result
  }
  
  // If state part provided, filter/boost by state match
  if (statePart) {
    const stateMatches = matchesPart(normalizedState, statePart);
    const countryMatches = matchesPart(normalizedCountry, statePart);
    
    if (stateMatches) {
      score += 40; // Strong boost for state match
    } else if (countryMatches) {
      score += 30; // Country match when no state provided (e.g., "paris, france")
    } else {
      return 0; // State/country filter provided but doesn't match
    }
  }
  
  // If country part provided (3-part query), must match country
  if (countryPart) {
    if (matchesPart(normalizedCountry, countryPart)) {
      score += 20;
    } else {
      return 0; // Country filter provided but doesn't match
    }
  }
  
  // Boost for shorter names (prefer "Houston" over "Houston County")
  if (score > 0) {
    score += Math.max(0, 20 - city.name.length);
  }
  
  return score;
}

/**
 * CityService - Static city database search
 * 
 * Single Responsibility: City search and lookup only
 * Open/Closed: Can extend search algorithms without modifying interface
 * Dependency Inversion: Implements ICityService interface
 * 
 * Performance: Uses prefix indexing to search only relevant cities
 * instead of iterating all 148K+ entries on each search.
 * Supports searching by city name, state, or country.
 */
export class CityService implements ICityService {
  private cities: ICity[] | null = null;
  private ready = false;
  private loadingPromise: Promise<void> | null = null;
  
  // Prefix index: maps first 2 lowercase chars to array of cities
  // e.g., "pa" -> [Paris, Panama, Palo Alto, ...]
  private cityPrefixIndex: Map<string, ICity[]> = new Map();
  
  // State index: maps lowercase state code to cities
  // e.g., "tx" -> [Houston, Dallas, Austin, ...]
  private stateIndex: Map<string, ICity[]> = new Map();
  
  // Country index: maps lowercase country name prefix to cities
  // e.g., "fr" -> all cities in France
  private countryPrefixIndex: Map<string, ICity[]> = new Map();

  constructor() {
    // Cities are loaded via preload() or on-demand in ensureLoaded()
  }

  /**
   * Build indexes for fast lookups
   * - City prefix index: first 2 chars of city name
   * - State index: full state code (for US states especially)
   * - Country prefix index: first 2 chars of country name
   */
  private buildIndexes(): void {
    if (!this.cities) return;
    
    this.cityPrefixIndex.clear();
    this.stateIndex.clear();
    this.countryPrefixIndex.clear();
    
    for (const city of this.cities) {
      // City name prefix index
      if (city.name.length >= 2) {
        const cityPrefix = city.name.substring(0, 2).toLowerCase();
        const existing = this.cityPrefixIndex.get(cityPrefix);
        if (existing) {
          existing.push(city);
        } else {
          this.cityPrefixIndex.set(cityPrefix, [city]);
        }
      }
      
      // State index (for qualifying searches like "Houston, TX")
      if (city.stateCode) {
        const stateKey = city.stateCode.toLowerCase();
        const existingState = this.stateIndex.get(stateKey);
        if (existingState) {
          existingState.push(city);
        } else {
          this.stateIndex.set(stateKey, [city]);
        }
      }
      
      // Country prefix index
      const countryName = getCountryName(city.countryCode);
      if (countryName.length >= 2) {
        const countryPrefix = countryName.substring(0, 2).toLowerCase();
        const existingCountry = this.countryPrefixIndex.get(countryPrefix);
        if (existingCountry) {
          existingCountry.push(city);
        } else {
          this.countryPrefixIndex.set(countryPrefix, [city]);
        }
      }
    }
  }

  /**
   * Initialize city data (lazy loaded)
   * Uses a promise to prevent duplicate loading and allow async waiting
   */
  private ensureLoaded(): void {
    if (this.cities) return;
    
    // If already loading, wait for that to complete
    if (this.loadingPromise) return;
    
    // Synchronous load as fallback (blocks UI - avoid if possible)
    this.cities = CSCCity.getAllCities();
    this.buildIndexes();
    this.ready = true;
  }

  /**
   * Async version of ensureLoaded - waits for preload if in progress
   */
  private async ensureLoadedAsync(): Promise<void> {
    if (this.cities) return;
    
    // If preloading is in progress, wait for it
    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }
    
    // Fallback to sync load
    this.ensureLoaded();
  }

  /**
   * Preload city data in the background
   * Call this early in app lifecycle for best UX
   * Returns a promise that resolves when loading is complete
   */
  async preload(): Promise<void> {
    if (this.cities) {
      return;
    }
    
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    
    this.loadingPromise = new Promise<void>((resolve) => {
      const startTime = Date.now();
      
      // Use setTimeout to yield to the UI thread
      // This prevents blocking the main thread during initial render
      setTimeout(() => {
        try {
          this.cities = CSCCity.getAllCities();
          this.buildIndexes();
          this.ready = true;
        } catch (error) {
          console.error('[CityService] Preload error:', error);
        }
        resolve();
      }, 0);
    });
    
    return this.loadingPromise;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Check if preload is in progress
   */
  isLoading(): boolean {
    return this.loadingPromise !== null && !this.ready;
  }

  /**
   * Search for cities by name
   * Supports partial matching (e.g., "Par" matches "Paris")
   * Uses prefix index for fast lookups (~1000x faster than full scan)
   * 
   * Search strategies:
   * 1. "Paris" -> use city prefix index
   * 2. "Paris, France" -> use city prefix, filter by country
   * 3. "Houston, TX" -> use city prefix, filter by state  
   * 4. "TX" or "Texas" -> use state index (for 2-letter) or country prefix
   */
  async searchCities(query: string, options?: CitySearchOptions): Promise<CitySearchResult[]> {
    // Wait for preload if in progress, otherwise load synchronously
    await this.ensureLoadedAsync();
    
    if (!query || query.length < 2) {
      return [];
    }

    const limit = options?.limit ?? 10;
    const { cityPart, statePart } = parseQuery(query);
    
    let candidateCities: ICity[];
    
    // Determine search strategy based on query structure
    if (cityPart.length >= 2) {
      // Primary: search by city name prefix
      const prefix = cityPart.substring(0, 2).toLowerCase();
      candidateCities = this.cityPrefixIndex.get(prefix) || [];
      
      // If we have a state/country qualifier and few results, also check state index
      if (statePart && candidateCities.length < 50) {
        // Check if statePart is a state code (2 letters)
        const stateResults = this.stateIndex.get(statePart.toLowerCase());
        if (stateResults) {
          // Merge with city results, prioritizing city matches
          const citySet = new Set(candidateCities);
          for (const city of stateResults) {
            if (!citySet.has(city) && city.name.toLowerCase().startsWith(cityPart)) {
              candidateCities.push(city);
            }
          }
        }
      }
    } else {
      // Fallback: empty results for very short queries
      candidateCities = [];
    }
    
    // Score and filter the candidate set
    const scoredCities = candidateCities
      .map(city => {
        const countryName = getCountryName(city.countryCode);
        return {
          city,
          countryName,
          score: calculateScore(city, query, countryName),
        };
      })
      .filter(item => item.score > 0);

    // Apply country filter if specified
    let filtered = scoredCities;
    if (options?.countryCodes && options.countryCodes.length > 0) {
      const codes = new Set(options.countryCodes.map(c => c.toUpperCase()));
      filtered = filtered.filter(item => codes.has(item.city.countryCode));
    }

    // Sort by score (descending)
    filtered.sort((a, b) => b.score - a.score);

    // Take top results and convert
    return filtered.slice(0, limit).map(item => {
      const city = convertCity(item.city);
      // Format: "City, State, Country" or "City, Country"
      // Only show stateCode if it's a readable abbreviation (letters only, not numbers)
      const hasReadableState = city.stateCode && /^[A-Za-z]+$/.test(city.stateCode);
      const displayName = hasReadableState
        ? `${city.name}, ${city.stateCode}, ${city.country}`
        : `${city.name}, ${city.country}`;
      return {
        city,
        score: item.score,
        displayName,
      };
    });
  }

  /**
   * Get city by coordinates (approximate match)
   * Not implemented - use searchCities instead
   */
  getCityById(cityId: number): City | null {
    // country-state-city doesn't have numeric IDs
    // This method exists for interface compliance
    return null;
  }
}

// Singleton instance for convenience
let cityServiceInstance: CityService | null = null;

/**
 * Get singleton CityService instance
 */
export function getCityService(): CityService {
  if (!cityServiceInstance) {
    cityServiceInstance = new CityService();
  }
  return cityServiceInstance;
}

/**
 * Preload cities in the background after app startup
 * Call this from AppNavigator after initial render completes
 * 
 * Uses InteractionManager.runAfterInteractions to avoid blocking
 * animations and initial navigation rendering.
 */
export function preloadCities(): void {
  if (preloadPromise) {
    return;
  }
  
  preloadStartTime = Date.now();
  
  // Wait for initial animations/interactions to complete
  InteractionManager.runAfterInteractions(() => {
    preloadPromise = getCityService().preload();
  });
}

/**
 * Check if cities are preloaded
 */
export function isCitiesPreloaded(): boolean {
  return cityServiceInstance?.isReady() ?? false;
}

/**
 * Check if preload is in progress
 */
export function isCitiesLoading(): boolean {
  return cityServiceInstance?.isLoading() ?? false;
}

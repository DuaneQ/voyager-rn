/**
 * City type definitions for static city database
 * Used for destination selection without API calls
 * 
 * Based on country-state-city package (148K+ cities with coordinates)
 */

/**
 * Represents a city from the static database
 */
export interface City {
  /** City name */
  name: string;
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "IT") */
  countryCode: string;
  /** Full country name (resolved from country code) */
  country: string;
  /** State/region code */
  stateCode: string;
  /** Geographic coordinates */
  coordinates: {
    lat: number;
    lng: number;
  };
}

/**
 * Search result with relevance scoring
 */
export interface CitySearchResult {
  city: City;
  /** Relevance score (higher = better match) */
  score: number;
  /** Display string for UI (e.g., "Naples, Italy") */
  displayName: string;
}

/**
 * Options for city search
 */
export interface CitySearchOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Minimum population filter (default: 0) */
  minPopulation?: number;
  /** Filter by country code(s) */
  countryCodes?: string[];
}

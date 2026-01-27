/**
 * City Service Interface
 * Follows Interface Segregation Principle - focused on city search only
 */

import { City, CitySearchResult, CitySearchOptions } from '../../types/City';

export interface ICityService {
  /**
   * Search for cities by name with fuzzy matching
   * @param query - Search string (e.g., "Naples", "Par", "New Yo")
   * @param options - Optional search configuration
   * @returns Promise with ranked search results
   */
  searchCities(query: string, options?: CitySearchOptions): Promise<CitySearchResult[]>;

  /**
   * Get a city by its unique ID
   * @param cityId - GeoNames city ID
   * @returns City or null if not found
   */
  getCityById(cityId: number): City | null;

  /**
   * Check if the city database is loaded and ready
   */
  isReady(): boolean;
}

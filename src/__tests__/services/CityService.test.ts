/**
 * CityService Unit Tests
 * 
 * Tests the static city database search functionality including:
 * - Basic city name search
 * - Multi-part queries (city, state, country)
 * - Prefix indexing performance
 * - Edge cases and error handling
 */

import { CityService, getCityService, preloadCities, isCitiesPreloaded } from '../../services/CityService';
import { CitySearchResult } from '../../types/City';

// Mock InteractionManager to run callbacks immediately in tests
jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => {
      callback();
      return { cancel: jest.fn() };
    },
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('CityService', () => {
  let cityService: CityService;

  beforeAll(async () => {
    // Initialize service and preload cities once for all tests
    cityService = new CityService();
    await cityService.preload();
  }, 30000); // Allow up to 30s for initial load

  describe('preload and initialization', () => {
    it('should report ready after preload', () => {
      expect(cityService.isReady()).toBe(true);
    });

    it('should not be loading after preload completes', () => {
      expect(cityService.isLoading()).toBe(false);
    });

    it('should handle multiple preload calls gracefully', async () => {
      // Second preload should return immediately
      const startTime = Date.now();
      await cityService.preload();
      const duration = Date.now() - startTime;
      
      // Should be nearly instant since already loaded
      expect(duration).toBeLessThan(100);
    });
  });

  describe('basic city search', () => {
    it('should find Paris when searching "par"', async () => {
      const results = await cityService.searchCities('par');
      
      expect(results.length).toBeGreaterThan(0);
      const parisResult = results.find(r => r.city.name === 'Paris');
      expect(parisResult).toBeDefined();
    });

    it('should find Houston when searching "hou"', async () => {
      const results = await cityService.searchCities('hou');
      
      expect(results.length).toBeGreaterThan(0);
      const houstonResult = results.find(r => r.city.name === 'Houston');
      expect(houstonResult).toBeDefined();
    });

    it('should find New York City when searching "new york"', async () => {
      const results = await cityService.searchCities('new york');
      
      expect(results.length).toBeGreaterThan(0);
      const nyResult = results.find(r => r.city.name === 'New York City');
      expect(nyResult).toBeDefined();
    });

    it('should be case-insensitive', async () => {
      const lowerResults = await cityService.searchCities('paris');
      const upperResults = await cityService.searchCities('PARIS');
      const mixedResults = await cityService.searchCities('PaRiS');
      
      // All should find Paris
      expect(lowerResults.find(r => r.city.name === 'Paris')).toBeDefined();
      expect(upperResults.find(r => r.city.name === 'Paris')).toBeDefined();
      expect(mixedResults.find(r => r.city.name === 'Paris')).toBeDefined();
    });

    it('should return empty array for queries less than 2 characters', async () => {
      const results1 = await cityService.searchCities('p');
      const results2 = await cityService.searchCities('');
      
      expect(results1).toEqual([]);
      expect(results2).toEqual([]);
    });

    it('should respect the limit option', async () => {
      const results5 = await cityService.searchCities('san', { limit: 5 });
      const results20 = await cityService.searchCities('san', { limit: 20 });
      
      expect(results5.length).toBeLessThanOrEqual(5);
      expect(results20.length).toBeLessThanOrEqual(20);
      expect(results20.length).toBeGreaterThan(results5.length);
    });
  });

  describe('multi-part queries (city, state)', () => {
    it('should find Houston, TX when searching "houston, tx"', async () => {
      const results = await cityService.searchCities('houston, tx');
      
      expect(results.length).toBeGreaterThan(0);
      const houstonTX = results.find(r => 
        r.city.name === 'Houston' && r.city.stateCode === 'TX'
      );
      expect(houstonTX).toBeDefined();
    });

    it('should filter out Houston, TX when searching "houston, al"', async () => {
      const results = await cityService.searchCities('houston, al');
      
      // Should not include Houston, TX
      const houstonTX = results.find(r => 
        r.city.name === 'Houston' && r.city.stateCode === 'TX'
      );
      expect(houstonTX).toBeUndefined();
    });

    it('should find Paris, France when searching "paris, france"', async () => {
      const results = await cityService.searchCities('paris, france');
      
      expect(results.length).toBeGreaterThan(0);
      const parisFrance = results.find(r => 
        r.city.name === 'Paris' && r.city.country === 'France'
      );
      expect(parisFrance).toBeDefined();
    });

    it('should filter out Paris, France when searching "paris, tx"', async () => {
      const results = await cityService.searchCities('paris, tx');
      
      // Should find Paris, TX but not Paris, France
      const parisTX = results.find(r => 
        r.city.name === 'Paris' && r.city.stateCode === 'TX'
      );
      const parisFrance = results.find(r => 
        r.city.name === 'Paris' && r.city.country === 'France'
      );
      
      expect(parisTX).toBeDefined();
      expect(parisFrance).toBeUndefined();
    });
  });

  describe('result format and scoring', () => {
    it('should return results with correct structure', async () => {
      const results = await cityService.searchCities('london');
      
      expect(results.length).toBeGreaterThan(0);
      const london = results[0];
      
      // Check City structure
      expect(london.city).toHaveProperty('name');
      expect(london.city).toHaveProperty('countryCode');
      expect(london.city).toHaveProperty('country');
      expect(london.city).toHaveProperty('coordinates');
      expect(london.city.coordinates).toHaveProperty('lat');
      expect(london.city.coordinates).toHaveProperty('lng');
      
      // Check CitySearchResult structure
      expect(london).toHaveProperty('score');
      expect(london).toHaveProperty('displayName');
      expect(typeof london.score).toBe('number');
      expect(typeof london.displayName).toBe('string');
    });

    it('should rank exact matches higher than partial matches', async () => {
      const results = await cityService.searchCities('paris');
      
      // Exact match "Paris" should score higher than "Parishville" etc.
      const parisIndex = results.findIndex(r => r.city.name === 'Paris');
      
      // Paris should be in top 3 results
      expect(parisIndex).toBeLessThan(3);
    });

    it('should include coordinates in results', async () => {
      const results = await cityService.searchCities('tokyo');
      
      const tokyo = results.find(r => r.city.name === 'Tokyo');
      expect(tokyo).toBeDefined();
      
      // Tokyo coordinates should be roughly correct (lat ~35.6, lng ~139.6)
      expect(tokyo!.city.coordinates.lat).toBeGreaterThan(35);
      expect(tokyo!.city.coordinates.lat).toBeLessThan(36);
      expect(tokyo!.city.coordinates.lng).toBeGreaterThan(139);
      expect(tokyo!.city.coordinates.lng).toBeLessThan(140);
    });

    it('should format displayName correctly for US cities', async () => {
      const results = await cityService.searchCities('austin, tx');
      
      const austin = results.find(r => 
        r.city.name === 'Austin' && r.city.stateCode === 'TX'
      );
      expect(austin).toBeDefined();
      
      // US cities should show "City, State, Country"
      expect(austin!.displayName).toContain('Austin');
      expect(austin!.displayName).toContain('TX');
    });

    it('should format displayName correctly for international cities', async () => {
      const results = await cityService.searchCities('tokyo');
      
      const tokyo = results.find(r => r.city.name === 'Tokyo');
      expect(tokyo).toBeDefined();
      
      // International cities should show "City, Country" (no state)
      expect(tokyo!.displayName).toContain('Tokyo');
      expect(tokyo!.displayName).toContain('Japan');
    });
  });

  describe('search performance', () => {
    it('should complete search in under 100ms', async () => {
      const startTime = Date.now();
      await cityService.searchCities('san francisco');
      const duration = Date.now() - startTime;
      
      // With prefix indexing, search should be fast
      expect(duration).toBeLessThan(100);
    });

    it('should handle rapid successive searches', async () => {
      const queries = ['pa', 'par', 'pari', 'paris'];
      const startTime = Date.now();
      
      for (const query of queries) {
        await cityService.searchCities(query);
      }
      
      const totalDuration = Date.now() - startTime;
      
      // 4 searches should complete in under 200ms total
      expect(totalDuration).toBeLessThan(200);
    });
  });

  describe('edge cases', () => {
    it('should handle queries with extra whitespace', async () => {
      const results = await cityService.searchCities('  paris  ');
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle queries with special characters gracefully', async () => {
      // Should not throw, may return empty results
      const results = await cityService.searchCities('par!@#');
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array for nonsense queries', async () => {
      const results = await cityService.searchCities('xyzqwerty');
      
      expect(results).toEqual([]);
    });

    it('should handle country filter option', async () => {
      const usOnly = await cityService.searchCities('paris', { 
        countryCodes: ['US'] 
      });
      
      // Should only find Paris, TX (not Paris, France)
      for (const result of usOnly) {
        expect(result.city.countryCode).toBe('US');
      }
    });
  });

  describe('disambiguation (Naples problem)', () => {
    it('should distinguish Naples, Italy from Naples, Florida', async () => {
      const italyResults = await cityService.searchCities('naples, italy');
      const floridaResults = await cityService.searchCities('naples, fl');
      
      const naplesItaly = italyResults.find(r => 
        r.city.name === 'Naples' && r.city.country === 'Italy'
      );
      const naplesFL = floridaResults.find(r => 
        r.city.name === 'Naples' && r.city.stateCode === 'FL'
      );
      
      expect(naplesItaly).toBeDefined();
      expect(naplesFL).toBeDefined();
      
      // They should have different coordinates
      if (naplesItaly && naplesFL) {
        expect(naplesItaly.city.coordinates.lat).not.toEqual(naplesFL.city.coordinates.lat);
      }
    });
  });
});

describe('getCityService singleton', () => {
  it('should return the same instance on multiple calls', () => {
    const instance1 = getCityService();
    const instance2 = getCityService();
    
    expect(instance1).toBe(instance2);
  });
});

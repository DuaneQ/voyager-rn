// React Native Airport Service - simplified version focused on essential functionality
import { Airport, AirportSearchResult, LocationCoordinates } from '../types/Airport';
import { IAirportService, IDistanceCalculator } from './interfaces/IAirportService';
import { DistanceCalculator } from './DistanceCalculator';
import { getGooglePlacesApiKey } from '../constants/apiConfig';
import { getAirportsForLocation } from '../data/cityAirportMappings';

export class ReactNativeAirportService implements IAirportService {
  private distanceCalculator: IDistanceCalculator;
  private apiKey: string;

  constructor(distanceCalculator?: IDistanceCalculator) {
    this.distanceCalculator = distanceCalculator || new DistanceCalculator();
    this.apiKey = getGooglePlacesApiKey();
  }

  /**
   * Search for airports near a given location using Google Places API
   */
  async searchAirportsNearLocation(
    locationName: string, 
    coordinates?: LocationCoordinates,
    maxDistance: number = 200,
    maxResults: number = 5
  ): Promise<AirportSearchResult> {
    try {
      // First get coordinates if not provided
      const searchCoordinates = coordinates || await this.getCoordinatesForLocation(locationName);
      
      if (!searchCoordinates) {
        return {
          airports: [],
          searchLocation: { name: locationName, coordinates: { lat: 0, lng: 0 } }
        };
      }

      // Search for airports using Google Places
      const airports = await this.searchAirportsWithGooglePlaces(locationName, searchCoordinates, maxDistance, maxResults);

      return {
        airports,
        searchLocation: { name: locationName, coordinates: searchCoordinates }
      };
    } catch (error) {
      console.error('Error searching airports near location:', error);
      return {
        airports: this.getFallbackAirports(locationName),
        searchLocation: { name: locationName, coordinates: { lat: 0, lng: 0 } }
      };
    }
  }

  /**
   * Get airport by IATA code - simplified version using major airports
   */
  async getAirportByIataCode(iataCode: string): Promise<Airport | null> {
    const code = iataCode.toUpperCase();
    const majorAirports = this.getMajorAirports();
    
    return majorAirports.find(airport => airport.iataCode === code) || null;
  }

  /**
   * Attempt to find an airport in the curated fallback by name or city.
   * This helps when the Places result contains no valid IATA and a guessed code is incorrect.
   */
  /**
   * Find an airport by name or city from the bundled major airports.
   * If coords are provided, prefer a candidate within a reasonable distance
   * (default 200 km) to avoid matching to similarly named airports far away.
   */
  public findAirportByName(nameOrCity: string, coords?: LocationCoordinates): Airport | null {
    if (!nameOrCity) return null;
    const normalize = (s = '') => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const major = this.getMajorAirports();

    // Exact IATA match first
    for (const a of major) {
      if (a.iataCode && a.iataCode.toLowerCase() === nameOrCity.toLowerCase()) return a;
    }

    // Tokenize and look for token overlap
    const tokenize = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(t => t.replace(/[^a-z0-9]/g, ''));
    const qTokens = tokenize(nameOrCity).filter(t => t.length >= 3);
    if (qTokens.length === 0) return null;

    // Candidate scoring with optional distance check
    let best: { airport: Airport; score: number; distance?: number } | null = null;
    for (const a of major) {
      const nName = tokenize(a.name || '');
      const nCity = tokenize(a.city || '');
      let overlap = 0;
      for (const t of qTokens) {
        if (nName.includes(t) || nCity.includes(t)) overlap++;
      }
      if (overlap === 0) continue;

      let distKm: number | undefined = undefined;
      if (coords && a.coordinates && typeof a.coordinates.lat === 'number') {
        try {
          distKm = this.distanceCalculator.calculateDistance(coords, a.coordinates);
        } catch (e) {
          // ignore distance errors
        }
      }

      // If distance is available and very large, skip this candidate
      if (typeof distKm === 'number' && distKm > 200) continue;

      const score = overlap + (typeof distKm === 'number' ? Math.max(0, 100 - distKm / 10) : 0);
      if (!best || score > best.score) {
        best = { airport: a, score, distance: distKm };
      }
    }

    return best ? best.airport : null;
  }

  /**
   * Search airports by query string
   */
  async searchAirportsByQuery(query: string): Promise<Airport[]> {
    try {
      // If it looks like an IATA code, search by code
      if (query.length === 3 && /^[A-Z]+$/i.test(query)) {
        const airport = await this.getAirportByIataCode(query.toUpperCase());
        return airport ? [airport] : [];
      }

      // STEP 1: Check curated city-to-airport mappings first
      const curatedAirportCodes = getAirportsForLocation(query);
      if (curatedAirportCodes && curatedAirportCodes.length > 0) {
        console.log(`[searchAirportsByQuery] Found ${curatedAirportCodes.length} curated airports for "${query}": ${curatedAirportCodes.join(', ')}`);
        
        // Get full airport data from OpenFlights dataset
        const major = this.getMajorAirports();
        const curatedAirports = curatedAirportCodes
          .map(code => major.find(a => a.iataCode === code))
          .filter((a): a is Airport => a !== undefined);
        
        if (curatedAirports.length > 0) {
          return curatedAirports;
        }
      }

      // STEP 2: If not in curated list, search OpenFlights dataset
      // Extract country from query if present (e.g., "Paris, France" -> "France")
      const queryParts = query.split(',').map(p => p.trim());
      const cityQuery = queryParts[0].toLowerCase();
      const countryQuery = queryParts.length > 1 ? queryParts[queryParts.length - 1].toLowerCase() : null;
      
      const major = this.getMajorAirports();
      const matches = major.filter(airport => {
        const cityMatch = airport.city.toLowerCase().includes(cityQuery);
        const nameMatch = airport.name.toLowerCase().includes(cityQuery);
        const iataMatch = airport.iataCode.toLowerCase().includes(cityQuery);
        
        // If country is specified in query, must match country too
        if (countryQuery) {
          const countryMatch = airport.country.toLowerCase().includes(countryQuery);
          return (cityMatch || nameMatch || iataMatch) && countryMatch;
        }
        
        return cityMatch || nameMatch || iataMatch;
      });
      
      // If we found airports in our dataset, return them
      if (matches.length > 0) {
        console.log(`[searchAirportsByQuery] Found ${matches.length} airports for "${query}" in OpenFlights dataset`);
        return matches;
      }
      
      // STEP 3: If no matches in our dataset, try Google Places as last resort
      console.log(`[searchAirportsByQuery] No matches in OpenFlights for "${query}", trying Google Places`);
      const result = await this.searchAirportsNearLocation(query);
      return result.airports;
    } catch (error) {
      console.error('Error searching airports by query:', error);
      return this.getFallbackAirports(query);
    }
  }

  /**
   * Get coordinates for location using Google Places Geocoding
   */
  private async getCoordinatesForLocation(locationName: string): Promise<LocationCoordinates | null> {
    try {
      if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
        console.warn('Google Places API key not configured');
        return null;
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results?.[0]) {
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }

      return null;
    } catch (error) {
      console.error('Error getting coordinates:', error);
      return null;
    }
  }

  /**
   * Search airports using Google Places API
   */
  private async searchAirportsWithGooglePlaces(
    locationName: string,
    coordinates: LocationCoordinates,
    maxDistance: number,
    maxResults: number
  ): Promise<Airport[]> {
    try {
      if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
        console.warn('Google Places API key not configured, using fallback airports');
        return this.getFallbackAirports(locationName);
      }

      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.lat},${coordinates.lng}&radius=${maxDistance * 1000}&type=airport&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results) {
        return data.results
          .slice(0, maxResults)
          .map((place: any) => this.convertGooglePlaceToAirport(place, coordinates));
      }

      return this.getFallbackAirports(locationName);
    } catch (error) {
      console.error('Error with Google Places search:', error);
      return this.getFallbackAirports(locationName);
    }
  }

  /**
   * Convert Google Places result to Airport format
   */
  private convertGooglePlaceToAirport(place: any, searchCoordinates: LocationCoordinates): Airport {
    const placeCoordinates = {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng
    };

    const distance = this.distanceCalculator.calculateDistance(searchCoordinates, placeCoordinates);
    
  // Try to extract IATA code from name (e.g., "Los Angeles International Airport (LAX)")
  const iataMatch = place.name.match(/\(([A-Z]{3})\)/);
  // If the place contains an explicit IATA, use it. Otherwise attempt a safe
  // authoritative name match against our bundled data to populate iataCode.
  let iataCode = iataMatch ? iataMatch[1] : '';

  const airport: Airport = {
    iataCode,
    name: place.name,
    city: this.extractCityFromVicinity(place.vicinity || place.name),
    country: 'Unknown', // Google Places doesn't always provide country in nearby search
    coordinates: placeCoordinates,
    distance: Math.round(distance),
    isInternational: this.isLikelyInternationalAirport(place.name)
  };

  // If we don't have an explicit IATA, try to resolve it from our bundled dataset
  // using the safer name matching helper. This restores left-side IATA codes
  // and ensures curated overrides (e.g., DCA, LGA) can be applied.
  if (!airport.iataCode) {
    try {
      const byName = this.findAirportByName(place.name);
      if (byName) {
        airport.iataCode = byName.iataCode;
        airport.country = byName.country || airport.country;
        airport.isInternational = typeof byName.isInternational === 'boolean' ? byName.isInternational : airport.isInternational;
      }
    } catch (e) {
      // ignore errors in name-based resolution — prefer missing IATA to a wrong one
      console.warn('ReactNativeAirportService: name-based IATA resolution failed', e);
    }
  }

  return airport;
  }

  /**
   * Major airports fallback data
   */
  private getMajorAirports(): Airport[] {
    // Prefer a bundled trimmed OpenFlights JSON if present (created by scripts/import-openflights.js).
    // Fall back to the curated small list if the full JSON isn't available.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const openFlightsData: any[] = require('../data/openflights.json');
      if (Array.isArray(openFlightsData) && openFlightsData.length > 0) {
        // Load curated fallback to preserve any manual isInternational flags for major hubs
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const curatedModule = require('../data/openflightsFallback');
        const curated: Airport[] = curatedModule.default || curatedModule;
        const curatedIntl = new Set(curated.filter(a => a.isInternational).map(a => a.iataCode));

        return openFlightsData
          .filter(a => a.iata && typeof a.iata === 'string' && a.iata.length === 3)
          .map(a => {
            const name = a.name || a.city || a.iata;
            const country = a.country || '';
            const inferredIntl = curatedIntl.has(a.iata) || (country && country !== 'United States') || /international|intl/i.test(name);

            return ({
              iataCode: a.iata,
              name,
              city: a.city || '',
              country,
              coordinates: { lat: a.latitude || 0, lng: a.longitude || 0 },
              isInternational: inferredIntl
            } as Airport);
          });
      }
    } catch (err) {
      // If the full JSON isn't present or fails to load, fall back to curated list below
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fallbackModule = require('../data/openflightsFallback');
    const fallback: Airport[] = fallbackModule.default || fallbackModule;
    return fallback;
  }

  /**
   * Get fallback airports for a location
   */
  private getFallbackAirports(locationName: string): Airport[] {
    const major = this.getMajorAirports();
    const query = locationName.toLowerCase();
    
    // Return relevant airports based on location name (increased from 3 to 20)
    return major.filter(airport => 
      airport.city.toLowerCase().includes(query) ||
      airport.name.toLowerCase().includes(query) ||
      airport.iataCode.toLowerCase().includes(query)
    ).slice(0, 20);
  }

  /**
   * Guess IATA code from airport name
   */
  private guessIataFromName(name: string): string {
    // Conservative fallback: do NOT invent a code. Return empty string so the
    // enrichment path can attempt authoritative lookups by name or IATA.
    // Generating guessed IATA codes produced many false positives in the wild.
    return '';
  }

  /**
   * Extract city from vicinity string
   */
  private extractCityFromVicinity(vicinity: string): string {
    return vicinity.split(',')[0].trim();
  }

  /**
   * Check if airport name suggests international airport
   */
  private isLikelyInternationalAirport(name: string): boolean {
    const internationalKeywords = ['international', 'intl', 'regional hub', 'major'];
    return internationalKeywords.some(keyword => 
      name.toLowerCase().includes(keyword)
    );
  }
}

export default ReactNativeAirportService;
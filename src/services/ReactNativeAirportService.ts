// React Native Airport Service - simplified version focused on essential functionality
import { Airport, AirportSearchResult, LocationCoordinates } from '../types/Airport';
import { IAirportService, IDistanceCalculator } from './interfaces/IAirportService';
import { DistanceCalculator } from './DistanceCalculator';
import { getGooglePlacesApiKey } from '../constants/apiConfig';

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
   * Search airports by query string
   */
  async searchAirportsByQuery(query: string): Promise<Airport[]> {
    try {
      // If it looks like an IATA code, search by code
      if (query.length === 3 && /^[A-Z]+$/i.test(query)) {
        const airport = await this.getAirportByIataCode(query.toUpperCase());
        return airport ? [airport] : [];
      }

      // Otherwise search by name/location
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
    const iataCode = iataMatch ? iataMatch[1] : this.guessIataFromName(place.name);

    return {
      iataCode,
      name: place.name,
      city: this.extractCityFromVicinity(place.vicinity || place.name),
      country: 'Unknown', // Google Places doesn't always provide country in nearby search
      coordinates: placeCoordinates,
      distance: Math.round(distance),
      isInternational: this.isLikelyInternationalAirport(place.name)
    };
  }

  /**
   * Major airports fallback data
   */
  private getMajorAirports(): Airport[] {
    return [
      { iataCode: 'JFK', name: 'John F Kennedy International Airport', city: 'New York', country: 'United States', coordinates: { lat: 40.6413, lng: -73.7781 }, isInternational: true },
      { iataCode: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', coordinates: { lat: 33.9425, lng: -118.4081 }, isInternational: true },
      { iataCode: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'United States', coordinates: { lat: 41.9786, lng: -87.9048 }, isInternational: true },
      { iataCode: 'ATL', name: 'Hartsfield Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States', coordinates: { lat: 33.6367, lng: -84.4281 }, isInternational: true },
      { iataCode: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', coordinates: { lat: 25.7932, lng: -80.2906 }, isInternational: true },
      { iataCode: 'SEA', name: 'Seattle Tacoma International Airport', city: 'Seattle', country: 'United States', coordinates: { lat: 47.4502, lng: -122.3088 }, isInternational: true },
      { iataCode: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'United States', coordinates: { lat: 39.8561, lng: -104.6737 }, isInternational: true },
      { iataCode: 'PHX', name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix', country: 'United States', coordinates: { lat: 33.4343, lng: -112.0116 }, isInternational: true },
      { iataCode: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom', coordinates: { lat: 51.4706, lng: -0.4619 }, isInternational: true },
      { iataCode: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', coordinates: { lat: 49.0097, lng: 2.5479 }, isInternational: true }
    ];
  }

  /**
   * Get fallback airports for a location
   */
  private getFallbackAirports(locationName: string): Airport[] {
    const major = this.getMajorAirports();
    const query = locationName.toLowerCase();
    
    // Return relevant airports based on location name
    return major.filter(airport => 
      airport.city.toLowerCase().includes(query) ||
      airport.name.toLowerCase().includes(query) ||
      airport.iataCode.toLowerCase().includes(query)
    ).slice(0, 3);
  }

  /**
   * Guess IATA code from airport name
   */
  private guessIataFromName(name: string): string {
    // Simple heuristic - take first 3 uppercase letters or generate from name
    const upperName = name.toUpperCase();
    const match = upperName.match(/[A-Z]{3}/);
    if (match) return match[0];
    
    // Generate from initials
    const words = name.split(' ').filter(w => w.length > 2);
    return words.slice(0, 3).map(w => w[0]).join('').toUpperCase().padEnd(3, 'X');
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
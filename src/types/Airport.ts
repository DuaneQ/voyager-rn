/**
 * Airport and location types for React Native
 * Matches PWA Airport types exactly
 */

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface Airport {
  iataCode: string; // 3-letter IATA code (e.g., "JFK", "LAX")
  name: string; // Full airport name
  city: string; // City name
  country: string; // Country name
  coordinates: LocationCoordinates;
  distance?: number; // Distance in kilometers (when searching by location)
  isInternational?: boolean; // Whether this is an international airport
}

export interface AirportSearchResult {
  airports: Airport[];
  searchLocation?: {
    name: string;
    coordinates: LocationCoordinates;
  };
}

// For backward compatibility with existing code
export interface LocationResult extends LocationCoordinates {
  name?: string;
  address?: string;
}

export default Airport;
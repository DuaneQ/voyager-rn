/**
 * AI Generation types for React Native
 * Maintains full parity with PWA AIGeneration types
 */

// Main request interface that matches PWA exactly
export interface AIGenerationRequest {
  destination: string;
  destinationAirportCode?: string; // IATA code for destination airport
  departure?: string; // Departure location for flight pricing
  departureAirportCode?: string; // IATA code for departure airport
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  budget?: {
    total: number;
    currency: 'USD' | 'EUR' | 'GBP';
  };
  groupSize?: number;
  tripType: 'leisure' | 'business' | 'adventure' | 'romantic' | 'family' | 'bachelor' | 'bachelorette';
  preferenceProfileId: string;
  specialRequests?: string;
  mustInclude?: string[];
  mustAvoid?: string[];
  
  // Flight preferences - only shown when transportation type is flights
  flightPreferences?: {
    class: 'economy' | 'premium-economy' | 'business' | 'first';
    stopPreference: 'non-stop' | 'one-stop' | 'any';
    preferredAirlines?: string[];
  };
  
  // User data passed from frontend to avoid unnecessary Firestore reads
  userInfo?: {
    uid: string;
    username: string;
    gender: string;
    dob: string;
    status: string;
    sexualOrientation: string;
    email: string;
    blocked: string[];
  };
  
  // Travel preference profile data (includes transportation mode)
  travelPreferences?: any;
  preferenceProfile?: any; // Full profile object for payload building
}

// Progress tracking for mobile UI feedback
export interface AIGenerationProgress {
  stage: 'initializing' | 'searching' | 'activities' | 'ai_generation' | 'saving' | 'done';
  percent: number;
  message?: string;
}

// Location coordinates interface
export interface Coordinates {
  lat: number;
  lng: number;
}

// Location information
export interface Location {
  name: string;
  address?: string;
  coordinates?: Coordinates;
}

// Cost estimation
export interface EstimatedCost {
  amount: number;
  currency: string;
}

// Activity definition matching PWA structure
export interface Activity {
  id: string;
  name: string;
  category: string;
  description: string;
  location: Location;
  estimatedCost: EstimatedCost;
  duration?: number; // minutes
  rating?: number;
  userRatingsTotal?: number;
  placeId?: string;
  phone?: string;
  website?: string;
  startTime?: string;
  endTime?: string;
  bookingInfo?: {
    requiresReservation?: boolean;
    bookingUrl?: string;
    phone?: string;
    advanceBookingDays?: number;
  };
}

// Restaurant/meal information
export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  location: Location;
  category: string;
  phone?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  placeId?: string;
  coordinates?: Coordinates;
  cuisine?: string;
}

// Meal definition
export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;
  timing: { time: string };
  cost: EstimatedCost;
  restaurant: Restaurant;
}

// Transportation information
export interface Transportation {
  id: string;
  type: string;
  details: any;
  cost?: EstimatedCost;
}

// Daily itinerary structure
export interface ItineraryDay {
  day: number;
  date: string; // YYYY-MM-DD format
  activities: Activity[];
  meals: Meal[];
  transportation?: Transportation[];
  notes?: string;
}

// Accommodation recommendation
export interface AccommodationRecommendation {
  id: string;
  name: string;
  description?: string;
  location: Location;
  rating?: number;
  priceRange?: string;
  amenities?: string[];
  phone?: string;
  website?: string;
  starRating?: number;
  userRating?: number;
}

// Flight information
export interface FlightRecommendation {
  id: string;
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    code: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    code: string;
    time: string;
    date: string;
  };
  duration: string;
  stops: number;
  price: EstimatedCost;
  class: string;
}

// Main itinerary structure - matches PWA exactly
export interface Itinerary {
  id: string;
  destination: string;
  departure?: string;
  startDate: string;
  endDate: string;
  description?: string;
  aiGenerated?: boolean;
  
  // Daily breakdown
  days?: ItineraryDay[];
  
  // Top-level aggregated data for UI consumption
  activities?: Activity[];
  flights?: FlightRecommendation[];
  accommodations?: AccommodationRecommendation[];
  
  // External API data
  externalData?: {
    hotelRecommendations?: any[];
    flightOptions?: any[];
    activitiesData?: any[];
  };
  
  // User and preference information
  userInfo?: any;
  travelPreferences?: any;
  
  // Metadata for filtering and display
  metadata?: {
    filtering?: any;
    generation?: {
      timestamp: string;
      version: string;
      processingTime?: number;
    };
  };
  
  // Additional fields for compatibility
  gender?: string;
  sexualOrientation?: string;
  status?: string;
  startDay?: number;
  endDay?: number;
  lowerRange?: number;
  upperRange?: number;
  likes?: any[];
}

// Result of itinerary generation
export interface ItineraryResult {
  id: string | null;
  success: boolean;
  savedDocId?: string | null;
  itinerary?: Itinerary;
  error?: string;
  data?: any; // For AI assistant responses and transport recommendations
  saveError?: string; // Error message if saving to database failed
}

// Firebase Cloud Function call result
export interface CloudFunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Retry configuration for network calls
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Error types for better error handling
export type AIGenerationErrorType = 
  | 'network_error'
  | 'validation_error'
  | 'permission_denied'
  | 'quota_exceeded'
  | 'server_error'
  | 'timeout_error'
  | 'unknown_error';

export interface AIGenerationError extends Error {
  type: AIGenerationErrorType;
  code?: string;
  details?: any;
}

// Constants for validation and form options
export const POPULAR_AIRLINES = [
  'American Airlines',
  'Delta Air Lines',
  'United Airlines',
  'Southwest Airlines',
  'JetBlue Airways',
  'Alaska Airlines',
  'British Airways',
  'Lufthansa',
  'Air France',
  'Emirates',
  'Qatar Airways',
  'Singapore Airlines'
];

export const FLIGHT_CLASSES = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium-economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First Class' }
];

export const STOP_PREFERENCES = [
  { value: 'non-stop', label: 'Non-stop flights only' },
  { value: 'one-stop', label: 'One stop maximum' },
  { value: 'any', label: 'Any number of stops' }
];
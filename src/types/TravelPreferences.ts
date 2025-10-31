/**
 * Travel Preferences Types
 * Shared schema with voyager-pwa for Firestore synchronization
 * 
 * These types MUST match the PWA implementation to ensure data compatibility
 */

import { FieldValue } from 'firebase/firestore';

export interface TravelPreferenceProfile {
  id: string;
  name: string; // "Default", "Work Travel", "Family Vacation"
  isDefault: boolean;
  
  // Core Preferences
  travelStyle: 'luxury' | 'budget' | 'mid-range' | 'backpacker';
  budgetRange: {
    min: number;
    max: number;
    currency: 'USD';
  };
  
  // Activity Preferences: selected activity keys (e.g. ['food','nature'])
  activities: string[];
  
  // Food Preferences
  foodPreferences: {
    dietaryRestrictions: string[]; // ['vegetarian', 'gluten-free', etc.]
    cuisineTypes: string[];        // ['italian', 'asian', 'local', etc.]
    foodBudgetLevel: 'low' | 'medium' | 'high';
  };
  
  // Accommodation Preferences
  accommodation: {
    type: 'hotel' | 'hostel' | 'airbnb' | 'resort' | 'any';
    starRating: number; // 1-5
    minUserRating?: number; // 1.0-5.0 (user review rating)
  };
  
  // Transportation Preferences
  transportation: {
    primaryMode: 'walking' | 'public' | 'taxi' | 'rental' | 'airplane' | 'bus' | 'train';
    maxWalkingDistance?: number; // in minutes (optional)
    // Whether this profile intends to include flight booking/search results
    includeFlights?: boolean;
  };
  
  // Group Preferences
  groupSize: {
    preferred: number;
    sizes: number[]; // [1, 3, 5, 10] for cost calculations
  };
  
  // Accessibility
  accessibility: {
    mobilityNeeds: boolean;
    visualNeeds: boolean;
    hearingNeeds: boolean;
    details?: string;
  };
  
  // Timestamps
  createdAt: Date | FieldValue;
  updatedAt: Date | FieldValue;
}

// Preference signal for learning system
export interface PreferenceSignal {
  id?: string;
  type: 'like' | 'dislike' | 'save' | 'book' | 'share' | 'view_time' | 'search';
  activityType: string;
  confidence: number;
  metadata?: {
    itineraryId?: string;
    videoId?: string;
    destination?: string;
    activities?: string[];
    query?: string;
    watchDuration?: number;
    completionRate?: number;
    source?: string;
    dataQuality?: 'high' | 'medium' | 'low' | 'inferred_from_text' | 'inferred_from_destination_and_activities';
    rawActivities?: string[];
    budgetSignal?: string;
    timestamp?: number;
  };
  timestamp?: Date | FieldValue;
  processed?: boolean;
}

// Learning metadata for preference inference
export interface PreferenceLearningMetadata {
  totalSignals: number;
  signalsSinceLastUpdate: number;
  analysisVersion: string;
}

// Inferred preferences type with confidence scores
export interface InferredTravelPreferenceProfile {
  id: string;
  basedOnProfileId: string; // Links to explicit profile
  
  // Same structure as TravelPreferenceProfile but with confidence scores
  activities: Array<{
    key: string; // activity key, e.g. 'food'
    confidence: number; // 0-1
  }>;
  
  // Inferred budget preferences
  budgetRange: {
    min: { value: number; confidence: number; };
    max: { value: number; confidence: number; };
    currency: 'USD';
  };
  
  // Inferred travel style
  travelStyle: {
    preference: 'luxury' | 'budget' | 'mid-range' | 'backpacker';
    confidence: number;
  };
  
  // Learning sources and reasoning
  metadata: {
    inferredFrom: Array<{
      source: 'likes' | 'dislikes' | 'bookings' | 'searches' | 'view_time';
      signalCount: number;
      lastSignalDate: Date;
      confidence: number;
    }>;
    reasons: string[]; // Human-readable explanations
    createdAt: Date | FieldValue;
    updatedAt: Date | FieldValue;
  };
}

// Travel preferences container in user profile
export interface UserTravelPreferences {
  profiles: TravelPreferenceProfile[];
  defaultProfileId: string | null;
  preferenceSignals: PreferenceSignal[];
  // Store inferred preferences alongside explicit ones
  inferredPreferences?: {
    profiles: InferredTravelPreferenceProfile[];
    lastAnalysisDate: Date;
    confidenceScores: Record<string, number>;
    learningMetadata: PreferenceLearningMetadata;
  };
}

// Activity definitions for UI display
export interface ActivityDefinition {
  key: string;
  label: string;
  icon: string;
  description: string;
}

// Pre-defined activities (matching PWA)
export const ACTIVITY_DEFINITIONS: ActivityDefinition[] = [
  { key: 'cultural', label: 'Cultural', icon: 'museum', description: 'Museums, historical sites, art galleries' },
  { key: 'adventure', label: 'Adventure', icon: 'hiking', description: 'Hiking, climbing, outdoor activities' },
  { key: 'relaxation', label: 'Relaxation', icon: 'spa', description: 'Spa, beach, wellness activities' },
  { key: 'nightlife', label: 'Nightlife', icon: 'moon', description: 'Bars, clubs, entertainment' },
  { key: 'shopping', label: 'Shopping', icon: 'cart', description: 'Markets, boutiques, shopping centers' },
  { key: 'food', label: 'Food & Dining', icon: 'restaurant', description: 'Restaurants, food tours, culinary experiences' },
  { key: 'nature', label: 'Nature', icon: 'leaf', description: 'Parks, gardens, natural landscapes' },
  { key: 'photography', label: 'Photography', icon: 'camera', description: 'Scenic views, photo opportunities' },
];

// Dietary restrictions options
export const DIETARY_RESTRICTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'halal',
  'kosher',
  'pescatarian',
];

// Cuisine types options
export const CUISINE_TYPES = [
  'local',
  'italian',
  'asian',
  'mexican',
  'american',
  'mediterranean',
  'french',
  'indian',
  'japanese',
  'thai',
  'street-food',
  'fine-dining',
];

// Transportation modes
export const TRANSPORTATION_MODES: Array<{
  value: TravelPreferenceProfile['transportation']['primaryMode'];
  label: string;
}> = [
  { value: 'walking', label: 'Walking' },
  { value: 'public', label: 'Public Transport' },
  { value: 'taxi', label: 'Taxi/Rideshare' },
  { value: 'rental', label: 'Car Rental' },
  { value: 'airplane', label: 'Airplane' },
  { value: 'bus', label: 'Bus' },
  { value: 'train', label: 'Train' },
];

// Accommodation types
export const ACCOMMODATION_TYPES: Array<{
  value: TravelPreferenceProfile['accommodation']['type'];
  label: string;
}> = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'resort', label: 'Resort' },
  { value: 'any', label: 'Any' },
];

// Travel styles
export const TRAVEL_STYLES: Array<{
  value: TravelPreferenceProfile['travelStyle'];
  label: string;
  description: string;
}> = [
  { value: 'budget', label: 'Budget', description: 'Cost-conscious travel' },
  { value: 'mid-range', label: 'Mid-Range', description: 'Balance of comfort and cost' },
  { value: 'luxury', label: 'Luxury', description: 'Premium experiences' },
  { value: 'backpacker', label: 'Backpacker', description: 'Minimal budget, authentic experiences' },
];

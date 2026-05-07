/**
 * API Configuration Constants
 * 
 * This file contains all API keys and configuration needed for external services.
 * In production, these should be set via environment variables or Expo constants.
 */

// Google Places API Key for location autocomplete
// Configure this via environment variables in build/runtime.
const GOOGLE_PLACES_SENTINEL = 'YOUR_GOOGLE_PLACES_API_KEY_HERE';

export const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 
  process.env.REACT_APP_GOOGLE_PLACES_API_KEY || 
  GOOGLE_PLACES_SENTINEL;

// Fallback to placeholder if no key is configured
// The app should handle graceful degradation when API key is missing
export const getGooglePlacesApiKey = (): string => {
  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === GOOGLE_PLACES_SENTINEL) {
    console.warn('Google Places API key not configured. Set GOOGLE_PLACES_API_KEY or REACT_APP_GOOGLE_PLACES_API_KEY.');
  }
  return GOOGLE_PLACES_API_KEY;
};

export default {
  GOOGLE_PLACES_API_KEY,
  getGooglePlacesApiKey,
};
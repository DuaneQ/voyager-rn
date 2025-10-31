/**
 * API Configuration Constants
 * 
 * This file contains all API keys and configuration needed for external services.
 * In production, these should be set via environment variables or Expo constants.
 */

// Google Places API Key for location autocomplete
// TODO: Set this via environment variables in production
export const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 
  process.env.REACT_APP_GOOGLE_PLACES_API_KEY || 
  'AIzaSyC4VMlBMjgmvO_K1-wPOrQP1JKTvV7zmo8'; // Replace with actual API key

// Fallback to placeholder if no key is configured
// The app should handle graceful degradation when API key is missing
export const getGooglePlacesApiKey = (): string => {
  if (GOOGLE_PLACES_API_KEY === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
    console.warn('Google Places API key not configured. Please add your API key to constants/apiConfig.ts');
  }
  return GOOGLE_PLACES_API_KEY;
};

export default {
  GOOGLE_PLACES_API_KEY,
  getGooglePlacesApiKey,
};
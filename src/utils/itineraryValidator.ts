/**
 * Itinerary Validator Utility
 * Validates itinerary objects to ensure data integrity before rendering
 * Prevents crashes from malformed data
 */

import { Itinerary, ItineraryValidation } from '../types/Itinerary';

/**
 * Validate an itinerary object for required fields and correct types
 * @param itinerary - Itinerary object to validate
 * @returns Validation result with isValid flag and error messages
 */
export function validateItinerary(itinerary: any): ItineraryValidation {
  const errors: string[] = [];

  // Check if itinerary exists
  if (!itinerary || typeof itinerary !== 'object') {
    return {
      isValid: false,
      errors: ['Itinerary is null or not an object']
    };
  }

  // Required: id (string)
  if (!itinerary.id || typeof itinerary.id !== 'string' || itinerary.id.trim() === '') {
    errors.push('Missing or invalid id (must be non-empty string)');
  }

  // Required: destination (string)
  if (!itinerary.destination || typeof itinerary.destination !== 'string' || itinerary.destination.trim() === '') {
    errors.push('Missing or invalid destination (must be non-empty string)');
  }

  // Validate startDay if present (must be safe integer or valid number)
  if (itinerary.startDay !== undefined && itinerary.startDay !== null) {
    const startDay = Number(itinerary.startDay);
    if (!Number.isSafeInteger(startDay) || startDay <= 0) {
      errors.push('Invalid startDay (must be positive integer timestamp)');
    }
  }

  // Validate endDay if present (must be safe integer or valid number)
  if (itinerary.endDay !== undefined && itinerary.endDay !== null) {
    const endDay = Number(itinerary.endDay);
    if (!Number.isSafeInteger(endDay) || endDay <= 0) {
      errors.push('Invalid endDay (must be positive integer timestamp)');
    }
  }

  // Validate date range if both dates present
  if (itinerary.startDay && itinerary.endDay) {
    const startDay = Number(itinerary.startDay);
    const endDay = Number(itinerary.endDay);
    if (startDay > endDay) {
      errors.push('startDay must be before or equal to endDay');
    }
  }

  // Validate metadata (must not be a string - should be object or undefined)
  if (itinerary.metadata !== undefined && typeof itinerary.metadata === 'string') {
    errors.push('Invalid metadata (should be object, not string)');
  }

  // Validate response (must not be a string - should be object or undefined)
  if (itinerary.response !== undefined && typeof itinerary.response === 'string') {
    errors.push('Invalid response (should be object, not string)');
  }

  // Validate likes array if present
  if (itinerary.likes !== undefined) {
    if (!Array.isArray(itinerary.likes)) {
      errors.push('likes must be an array');
    } else {
      // Check all likes are strings
      const invalidLikes = itinerary.likes.filter((like: any) => typeof like !== 'string');
      if (invalidLikes.length > 0) {
        errors.push(`likes array contains non-string values: ${invalidLikes.length} items`);
      }
    }
  }

  // Validate activities array if present
  if (itinerary.activities !== undefined) {
    if (!Array.isArray(itinerary.activities)) {
      errors.push('activities must be an array');
    } else {
      // Check all activities are strings
      const invalidActivities = itinerary.activities.filter((activity: any) => typeof activity !== 'string');
      if (invalidActivities.length > 0) {
        errors.push(`activities array contains non-string values: ${invalidActivities.length} items`);
      }
    }
  }

  // Validate userInfo if present
  if (itinerary.userInfo !== undefined) {
    if (typeof itinerary.userInfo !== 'object' || itinerary.userInfo === null) {
      errors.push('userInfo must be an object');
    } else {
      // Check required userInfo fields
      if (!itinerary.userInfo.uid || typeof itinerary.userInfo.uid !== 'string') {
        errors.push('userInfo.uid is required and must be a string');
      }
      if (itinerary.userInfo.email !== undefined && typeof itinerary.userInfo.email !== 'string') {
        errors.push('userInfo.email must be a string');
      }
      if (itinerary.userInfo.username !== undefined && typeof itinerary.userInfo.username !== 'string') {
        errors.push('userInfo.username must be a string');
      }
      if (itinerary.userInfo.blocked !== undefined && !Array.isArray(itinerary.userInfo.blocked)) {
        errors.push('userInfo.blocked must be an array');
      }
    }
  }

  // Validate age ranges if present
  if (itinerary.lowerRange !== undefined) {
    const lowerRange = Number(itinerary.lowerRange);
    if (isNaN(lowerRange) || lowerRange < 18 || lowerRange > 100) {
      errors.push('lowerRange must be a number between 18 and 100');
    }
  }

  if (itinerary.upperRange !== undefined) {
    const upperRange = Number(itinerary.upperRange);
    if (isNaN(upperRange) || upperRange < 18 || upperRange > 100) {
      errors.push('upperRange must be a number between 18 and 100');
    }
  }

  // Validate range consistency
  if (itinerary.lowerRange !== undefined && itinerary.upperRange !== undefined) {
    const lower = Number(itinerary.lowerRange);
    const upper = Number(itinerary.upperRange);
    if (lower > upper) {
      errors.push('lowerRange must be less than or equal to upperRange');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Filter out invalid itineraries from an array
 * Logs validation errors for debugging
 * @param itineraries - Array of itineraries to filter
 * @param logErrors - Whether to log validation errors (default: true in dev)
 * @returns Array of valid itineraries only
 */
export function filterValidItineraries(
  itineraries: any[],
  logErrors: boolean = __DEV__
): Itinerary[] {
  if (!Array.isArray(itineraries)) {
    console.warn('[itineraryValidator] filterValidItineraries received non-array input');
    return [];
  }

  const validItineraries: Itinerary[] = [];

  for (const itinerary of itineraries) {
    const validation = validateItinerary(itinerary);
    if (validation.isValid) {
      validItineraries.push(itinerary as Itinerary);
    } else if (logErrors && validation.errors) {
      console.warn(
        `[itineraryValidator] Invalid itinerary (id: ${itinerary?.id || 'unknown'}):`,
        validation.errors
      );
    }
  }

  return validItineraries;
}

/**
 * Quick validation check (returns boolean only)
 * @param itinerary - Itinerary to validate
 * @returns true if valid, false otherwise
 */
export function isValidItinerary(itinerary: any): itinerary is Itinerary {
  return validateItinerary(itinerary).isValid;
}

/**
 * Sanitize an itinerary object by removing invalid fields
 * Attempts to fix common issues rather than rejecting the entire object
 * @param itinerary - Itinerary to sanitize
 * @returns Sanitized itinerary or null if cannot be fixed
 */
export function sanitizeItinerary(itinerary: any): Itinerary | null {
  if (!itinerary || typeof itinerary !== 'object') {
    return null;
  }

  // Must have id and destination
  if (!itinerary.id || !itinerary.destination) {
    return null;
  }

  const sanitized: any = {
    id: String(itinerary.id),
    destination: String(itinerary.destination)
  };

  // Copy valid optional fields
  if (itinerary.gender) sanitized.gender = String(itinerary.gender);
  if (itinerary.status) sanitized.status = String(itinerary.status);
  if (itinerary.sexualOrientation) sanitized.sexualOrientation = String(itinerary.sexualOrientation);
  if (itinerary.startDate) sanitized.startDate = String(itinerary.startDate);
  if (itinerary.endDate) sanitized.endDate = String(itinerary.endDate);
  if (itinerary.description) sanitized.description = String(itinerary.description);
  if (itinerary.userId) sanitized.userId = String(itinerary.userId);

  // Sanitize numbers
  if (itinerary.startDay !== undefined) {
    const val = Number(itinerary.startDay);
    if (Number.isSafeInteger(val) && val > 0) sanitized.startDay = val;
  }
  if (itinerary.endDay !== undefined) {
    const val = Number(itinerary.endDay);
    if (Number.isSafeInteger(val) && val > 0) sanitized.endDay = val;
  }
  if (itinerary.age !== undefined) {
    const val = Number(itinerary.age);
    if (!isNaN(val) && val >= 18 && val <= 120) sanitized.age = val;
  }
  if (itinerary.lowerRange !== undefined) {
    const val = Number(itinerary.lowerRange);
    if (!isNaN(val) && val >= 18 && val <= 100) sanitized.lowerRange = val;
  }
  if (itinerary.upperRange !== undefined) {
    const val = Number(itinerary.upperRange);
    if (!isNaN(val) && val >= 18 && val <= 100) sanitized.upperRange = val;
  }

  // Sanitize arrays
  if (Array.isArray(itinerary.likes)) {
    sanitized.likes = itinerary.likes.filter((like: any) => typeof like === 'string');
  }
  if (Array.isArray(itinerary.activities)) {
    sanitized.activities = itinerary.activities.filter((activity: any) => typeof activity === 'string');
  }

  // Copy userInfo if valid
  if (itinerary.userInfo && typeof itinerary.userInfo === 'object' && itinerary.userInfo.uid) {
    sanitized.userInfo = {
      ...itinerary.userInfo,
      uid: String(itinerary.userInfo.uid)
    };
  }

  // Copy AI fields if present
  if (itinerary.ai_status) sanitized.ai_status = itinerary.ai_status;
  if (itinerary.aiGenerated) sanitized.aiGenerated = Boolean(itinerary.aiGenerated);
  if (itinerary.response && typeof itinerary.response === 'object') {
    sanitized.response = itinerary.response;
  }

  return sanitized as Itinerary;
}

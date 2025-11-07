/**
 * Input sanitization utility for AI Generation requests
 * Prevents injection attacks and malformed data while preserving functionality
 */

import { AIGenerationRequest } from '../types/AIGeneration';

export interface SanitizationLimits {
  specialRequests: number;
  mustIncludeTag: number;
  mustAvoidTag: number;
  maxTags: number;
}

const DEFAULT_LIMITS: SanitizationLimits = {
  specialRequests: 500,
  mustIncludeTag: 80,
  mustAvoidTag: 80,
  maxTags: 10,
};

/**
 * Sanitizes a single string input by removing dangerous content
 * and normalizing whitespace while preserving legitimate content
 */
export function sanitizeString(input: string, maxLength?: number): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input
    // Remove HTML tags and script elements
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Apply length limit if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }

  return sanitized;
}

/**
 * Sanitizes an array of strings (tags) with individual length limits
 * and removes duplicates while preserving order
 */
export function sanitizeStringArray(
  input: string[] | undefined,
  maxItems: number,
  maxItemLength: number
): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const item of input) {
    if (sanitized.length >= maxItems) {
      break;
    }

    const cleanItem = sanitizeString(item, maxItemLength);
    if (cleanItem && !seen.has(cleanItem.toLowerCase())) {
      seen.add(cleanItem.toLowerCase());
      sanitized.push(cleanItem);
    }
  }

  return sanitized;
}

/**
 * Sanitizes airport and city names to prevent injection while preserving
 * international characters commonly found in place names
 */
export function sanitizeLocationString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Remove HTML and scripts but preserve international characters
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    // Allow letters, numbers, spaces, hyphens, apostrophes, and common punctuation
    .replace(/[^\p{L}\p{N}\s\-'.,()&]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100); // Reasonable limit for location names
}

/**
 * Sanitizes airport codes to uppercase format
 */
export function sanitizeAirportCode(input: string | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return sanitizeString(input, 10).toUpperCase();
}

/**
 * Sanitizes userInfo object by cleaning all string fields
 */
function sanitizeUserInfo(userInfo: any): any {
  if (!userInfo || typeof userInfo !== 'object') {
    return userInfo;
  }

  const sanitized = { ...userInfo };
  
  // Sanitize string fields
  if (typeof sanitized.uid === 'string') {
    sanitized.uid = sanitizeString(sanitized.uid);
  }
  if (typeof sanitized.username === 'string') {
    sanitized.username = sanitizeString(sanitized.username);
  }
  if (typeof sanitized.email === 'string') {
    sanitized.email = sanitizeString(sanitized.email);
  }
  if (typeof sanitized.gender === 'string') {
    sanitized.gender = sanitizeString(sanitized.gender);
  }
  if (typeof sanitized.status === 'string') {
    sanitized.status = sanitizeString(sanitized.status);
  }
  if (typeof sanitized.sexualOrientation === 'string') {
    sanitized.sexualOrientation = sanitizeString(sanitized.sexualOrientation);
  }
  
  // Sanitize blocked array
  if (Array.isArray(sanitized.blocked)) {
    sanitized.blocked = sanitized.blocked
      .map(item => sanitizeString(item))
      .filter(item => item.length > 0);
  }
  
  return sanitized;
}

/**
 * Main sanitization function that cleans an entire AIGenerationRequest
 * while preserving all legitimate data and structure
 */
export function sanitizeAIGenerationRequest(
  request: AIGenerationRequest,
  limits: SanitizationLimits = DEFAULT_LIMITS
): AIGenerationRequest {
  return {
    // Basic location and date fields - sanitize but preserve structure
    destination: sanitizeLocationString(request.destination),
    destinationAirportCode: sanitizeAirportCode(request.destinationAirportCode),
    departure: sanitizeLocationString(request.departure || ''),
    departureAirportCode: sanitizeAirportCode(request.departureAirportCode),
    startDate: request.startDate, // ISO dates are safe as-is
    endDate: request.endDate,
    
    // Trip metadata - preserve original values for validation elsewhere
    tripType: request.tripType,
    preferenceProfileId: sanitizeString(request.preferenceProfileId, 100),
    
    // User input fields - primary sanitization targets
    specialRequests: request.specialRequests ? 
      sanitizeString(request.specialRequests, limits.specialRequests) : '',
    mustInclude: sanitizeStringArray(
      request.mustInclude,
      limits.maxTags,
      limits.mustIncludeTag
    ),
    mustAvoid: sanitizeStringArray(
      request.mustAvoid,
      limits.maxTags,
      limits.mustAvoidTag
    ),
    
    // Budget - preserve original values for validation elsewhere
    budget: request.budget ? {
      total: request.budget.total, // Preserve original value (validation happens elsewhere)
      currency: request.budget.currency
    } : undefined,
    
    groupSize: request.groupSize ? 
      Math.max(1, Math.min(50, Number(request.groupSize) || 1)) : undefined,
    
    // Flight preferences - preserve original values for validation elsewhere
    flightPreferences: request.flightPreferences ? {
      class: request.flightPreferences.class, // Preserve original (validation happens elsewhere)
      stopPreference: request.flightPreferences.stopPreference,
      preferredAirlines: sanitizeStringArray(
        request.flightPreferences.preferredAirlines,
        10,
        50
      )
    } : undefined,
    
    // Sanitize userInfo object
    userInfo: sanitizeUserInfo(request.userInfo),
    travelPreferences: request.travelPreferences,
  };
}

/**
 * Validates that a sanitized request has all required fields
 */
export function validateSanitizedRequest(request: AIGenerationRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!request.destination?.trim()) {
    errors.push('Destination is required');
  }
  
  if (!request.startDate) {
    errors.push('Start date is required');
  }
  
  if (!request.endDate) {
    errors.push('End date is required');
  }
  
  if (!request.preferenceProfileId) {
    errors.push('Travel preference profile is required');
  }
  
  // Validate date logic
  if (request.startDate && request.endDate) {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      errors.push('Start date cannot be in the past');
    }
    
    if (endDate <= startDate) {
      errors.push('End date must be after start date');
    }
    
    const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (tripDays > 30) {
      errors.push('Trip cannot be longer than 30 days');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
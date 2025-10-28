/**
 * Travel Preferences Validation
 * Validation rules and functions for travel preference data
 * 
 * Ported from voyager-pwa with mobile-specific adaptations
 */

import {
  TravelPreferenceProfile,
  UserTravelPreferences,
  PreferenceSignal,
  ACTIVITY_DEFINITIONS,
  DIETARY_RESTRICTIONS,
  CUISINE_TYPES,
} from '../types/TravelPreferences';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Validation rules constants
export const VALIDATION_RULES = {
  PROFILE_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9\s\-_]+$/,
  },
  BUDGET: {
    MIN: 0,
    MAX: 1000000,
    DAILY_MIN: 10,
    DAILY_MAX: 10000,
  },
  ACTIVITIES: {
    MIN: 0,
    MAX: ACTIVITY_DEFINITIONS.length,
  },
  DIETARY_RESTRICTIONS: {
    MAX: 10,
  },
  CUISINE_TYPES: {
    MAX: 15,
  },
  WALKING_DISTANCE: {
    MIN: 5,
    MAX: 120, // minutes
  },
  STAR_RATING: {
    MIN: 1,
    MAX: 5,
  },
  USER_RATING: {
    MIN: 1.0,
    MAX: 5.0,
  },
  GROUP_SIZE: {
    MIN: 1,
    MAX: 50,
    DEFAULT_SIZES: [1, 2, 4, 6, 10],
  },
  CONFIDENCE: {
    MIN: 0.0,
    MAX: 1.0,
  },
} as const;

/**
 * Validate a travel preference profile
 */
export function validateTravelPreferenceProfile(
  profile: Partial<TravelPreferenceProfile>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!profile.name || profile.name.trim().length === 0) {
    errors.push('Profile name is required');
  } else {
    // Name length
    if (profile.name.length < VALIDATION_RULES.PROFILE_NAME.MIN_LENGTH) {
      errors.push(`Profile name must be at least ${VALIDATION_RULES.PROFILE_NAME.MIN_LENGTH} character`);
    }
    if (profile.name.length > VALIDATION_RULES.PROFILE_NAME.MAX_LENGTH) {
      errors.push(`Profile name must not exceed ${VALIDATION_RULES.PROFILE_NAME.MAX_LENGTH} characters`);
    }
    // Name pattern
    if (!VALIDATION_RULES.PROFILE_NAME.PATTERN.test(profile.name)) {
      errors.push('Profile name contains invalid characters');
    }
  }

  // Travel style
  if (!profile.travelStyle) {
    errors.push('Travel style is required');
  } else if (!['luxury', 'budget', 'mid-range', 'backpacker'].includes(profile.travelStyle)) {
    errors.push('Invalid travel style');
  }

  // Budget range
  if (!profile.budgetRange) {
    errors.push('Budget range is required');
  } else {
    if (profile.budgetRange.min < VALIDATION_RULES.BUDGET.MIN) {
      errors.push(`Minimum budget must be at least ${VALIDATION_RULES.BUDGET.MIN}`);
    }
    if (profile.budgetRange.max > VALIDATION_RULES.BUDGET.MAX) {
      errors.push(`Maximum budget cannot exceed ${VALIDATION_RULES.BUDGET.MAX}`);
    }
    if (profile.budgetRange.min >= profile.budgetRange.max) {
      errors.push('Minimum budget must be less than maximum budget');
    }
    if (profile.budgetRange.currency !== 'USD') {
      errors.push('Only USD currency is currently supported');
    }

    // Daily budget warnings
    const dailyMin = profile.budgetRange.min;
    const dailyMax = profile.budgetRange.max;
    if (dailyMin < VALIDATION_RULES.BUDGET.DAILY_MIN) {
      warnings.push(`Daily budget below ${VALIDATION_RULES.BUDGET.DAILY_MIN} may limit options`);
    }
    if (dailyMax > VALIDATION_RULES.BUDGET.DAILY_MAX) {
      warnings.push(`Daily budget above ${VALIDATION_RULES.BUDGET.DAILY_MAX} is unusually high`);
    }
  }

  // Activities
  if (profile.activities) {
    if (profile.activities.length > VALIDATION_RULES.ACTIVITIES.MAX) {
      errors.push(`Cannot select more than ${VALIDATION_RULES.ACTIVITIES.MAX} activities`);
    }
    // Validate activity keys
    const validKeys = ACTIVITY_DEFINITIONS.map(a => a.key);
    const invalidActivities = profile.activities.filter(key => !validKeys.includes(key));
    if (invalidActivities.length > 0) {
      errors.push(`Invalid activity keys: ${invalidActivities.join(', ')}`);
    }
  }

  // Food preferences
  if (profile.foodPreferences) {
    const { dietaryRestrictions, cuisineTypes, foodBudgetLevel } = profile.foodPreferences;
    
    if (dietaryRestrictions && dietaryRestrictions.length > VALIDATION_RULES.DIETARY_RESTRICTIONS.MAX) {
      errors.push(`Cannot select more than ${VALIDATION_RULES.DIETARY_RESTRICTIONS.MAX} dietary restrictions`);
    }
    
    if (dietaryRestrictions) {
      const invalidRestrictions = dietaryRestrictions.filter(r => !DIETARY_RESTRICTIONS.includes(r));
      if (invalidRestrictions.length > 0) {
        errors.push(`Invalid dietary restrictions: ${invalidRestrictions.join(', ')}`);
      }
    }
    
    if (cuisineTypes && cuisineTypes.length > VALIDATION_RULES.CUISINE_TYPES.MAX) {
      errors.push(`Cannot select more than ${VALIDATION_RULES.CUISINE_TYPES.MAX} cuisine types`);
    }
    
    if (cuisineTypes) {
      const invalidCuisines = cuisineTypes.filter(c => !CUISINE_TYPES.includes(c));
      if (invalidCuisines.length > 0) {
        errors.push(`Invalid cuisine types: ${invalidCuisines.join(', ')}`);
      }
    }
    
    if (foodBudgetLevel && !['low', 'medium', 'high'].includes(foodBudgetLevel)) {
      errors.push('Invalid food budget level');
    }
  }

  // Accommodation
  if (profile.accommodation) {
    const { type, starRating, minUserRating } = profile.accommodation;
    
    if (!type) {
      errors.push('Accommodation type is required');
    } else if (!['hotel', 'hostel', 'airbnb', 'resort', 'any'].includes(type)) {
      errors.push('Invalid accommodation type');
    }
    
    if (starRating < VALIDATION_RULES.STAR_RATING.MIN || starRating > VALIDATION_RULES.STAR_RATING.MAX) {
      errors.push(`Star rating must be between ${VALIDATION_RULES.STAR_RATING.MIN} and ${VALIDATION_RULES.STAR_RATING.MAX}`);
    }
    
    if (minUserRating !== undefined) {
      if (minUserRating < VALIDATION_RULES.USER_RATING.MIN || minUserRating > VALIDATION_RULES.USER_RATING.MAX) {
        errors.push(`User rating must be between ${VALIDATION_RULES.USER_RATING.MIN} and ${VALIDATION_RULES.USER_RATING.MAX}`);
      }
    }
  }

  // Transportation
  if (profile.transportation) {
    const { primaryMode, maxWalkingDistance } = profile.transportation;
    
    const validModes = ['walking', 'public', 'taxi', 'rental', 'airplane', 'bus', 'train', 'mixed'];
    if (!primaryMode) {
      errors.push('Primary transportation mode is required');
    } else if (!validModes.includes(primaryMode)) {
      errors.push('Invalid transportation mode');
    }
    
    if (maxWalkingDistance < VALIDATION_RULES.WALKING_DISTANCE.MIN || 
        maxWalkingDistance > VALIDATION_RULES.WALKING_DISTANCE.MAX) {
      errors.push(
        `Walking distance must be between ${VALIDATION_RULES.WALKING_DISTANCE.MIN} and ${VALIDATION_RULES.WALKING_DISTANCE.MAX} minutes`
      );
    }
  }

  // Group size
  if (profile.groupSize) {
    const { preferred, sizes } = profile.groupSize;
    
    if (preferred < VALIDATION_RULES.GROUP_SIZE.MIN || preferred > VALIDATION_RULES.GROUP_SIZE.MAX) {
      errors.push(
        `Preferred group size must be between ${VALIDATION_RULES.GROUP_SIZE.MIN} and ${VALIDATION_RULES.GROUP_SIZE.MAX}`
      );
    }
    
    if (sizes && sizes.length > 0) {
      const invalidSizes = sizes.filter(
        s => s < VALIDATION_RULES.GROUP_SIZE.MIN || s > VALIDATION_RULES.GROUP_SIZE.MAX
      );
      if (invalidSizes.length > 0) {
        errors.push(`Invalid group sizes: ${invalidSizes.join(', ')}`);
      }
    }
  }

  // Accessibility
  if (profile.accessibility) {
    const { details } = profile.accessibility;
    if (details && details.length > 500) {
      errors.push('Accessibility details must not exceed 500 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate user travel preferences container
 */
export function validateUserTravelPreferences(
  preferences: Partial<UserTravelPreferences>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preferences.profiles || preferences.profiles.length === 0) {
    errors.push('At least one profile is required');
  } else {
    // Validate each profile
    preferences.profiles.forEach((profile, index) => {
      const result = validateTravelPreferenceProfile(profile);
      if (!result.isValid) {
        errors.push(`Profile "${profile.name}" (index ${index}): ${result.errors.join(', ')}`);
      }
      if (result.warnings) {
        warnings.push(`Profile "${profile.name}" (index ${index}): ${result.warnings.join(', ')}`);
      }
    });

    // Check for duplicate names
    const names = preferences.profiles.map(p => p.name.toLowerCase());
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate profile names: ${[...new Set(duplicates)].join(', ')}`);
    }

    // Check default profile
    const defaultCount = preferences.profiles.filter(p => p.isDefault).length;
    if (defaultCount === 0) {
      warnings.push('No default profile set');
    } else if (defaultCount > 1) {
      errors.push('Only one profile can be set as default');
    }

    // Validate defaultProfileId if present
    if (preferences.defaultProfileId) {
      const defaultProfile = preferences.profiles.find(p => p.id === preferences.defaultProfileId);
      if (!defaultProfile) {
        errors.push('Default profile ID does not match any profile');
      } else if (!defaultProfile.isDefault) {
        errors.push('Default profile ID points to a profile not marked as default');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate a preference signal
 */
export function validatePreferenceSignal(signal: Partial<PreferenceSignal>): ValidationResult {
  const errors: string[] = [];

  if (!signal.type) {
    errors.push('Signal type is required');
  } else {
    const validTypes = ['like', 'dislike', 'save', 'book', 'share', 'view_time', 'search'];
    if (!validTypes.includes(signal.type)) {
      errors.push(`Invalid signal type: ${signal.type}`);
    }
  }

  if (!signal.activityType || signal.activityType.trim().length === 0) {
    errors.push('Activity type is required');
  }

  if (signal.confidence === undefined || signal.confidence === null) {
    errors.push('Confidence is required');
  } else if (
    signal.confidence < VALIDATION_RULES.CONFIDENCE.MIN ||
    signal.confidence > VALIDATION_RULES.CONFIDENCE.MAX
  ) {
    errors.push(
      `Confidence must be between ${VALIDATION_RULES.CONFIDENCE.MIN} and ${VALIDATION_RULES.CONFIDENCE.MAX}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize profile name
 */
export function sanitizeProfileName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .substring(0, VALIDATION_RULES.PROFILE_NAME.MAX_LENGTH);
}

/**
 * Sanitize budget values
 */
export function sanitizeBudget(value: number): number {
  return Math.max(
    VALIDATION_RULES.BUDGET.MIN,
    Math.min(VALIDATION_RULES.BUDGET.MAX, Math.round(value))
  );
}

/**
 * Sanitize star rating
 */
export function sanitizeStarRating(value: number): number {
  return Math.max(
    VALIDATION_RULES.STAR_RATING.MIN,
    Math.min(VALIDATION_RULES.STAR_RATING.MAX, Math.round(value))
  );
}

/**
 * Sanitize user rating
 */
export function sanitizeUserRating(value: number): number {
  return Math.max(
    VALIDATION_RULES.USER_RATING.MIN,
    Math.min(VALIDATION_RULES.USER_RATING.MAX, Math.round(value * 10) / 10)
  );
}

/**
 * Sanitize walking distance
 */
export function sanitizeWalkingDistance(value: number): number {
  return Math.max(
    VALIDATION_RULES.WALKING_DISTANCE.MIN,
    Math.min(VALIDATION_RULES.WALKING_DISTANCE.MAX, Math.round(value))
  );
}

/**
 * Sanitize group size
 */
export function sanitizeGroupSize(value: number): number {
  return Math.max(
    VALIDATION_RULES.GROUP_SIZE.MIN,
    Math.min(VALIDATION_RULES.GROUP_SIZE.MAX, Math.round(value))
  );
}

/**
 * Travel Preferences Error Classes
 * Custom error types for travel preference operations
 * 
 * Ported from voyager-pwa with mobile-friendly error messages
 */

/**
 * Error codes for travel preferences operations
 */
export enum TravelPreferencesErrorCode {
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_PROFILE_NAME = 'INVALID_PROFILE_NAME',
  INVALID_BUDGET_RANGE = 'INVALID_BUDGET_RANGE',
  INVALID_ACTIVITIES = 'INVALID_ACTIVITIES',
  INVALID_FOOD_PREFERENCES = 'INVALID_FOOD_PREFERENCES',
  INVALID_ACCOMMODATION = 'INVALID_ACCOMMODATION',
  INVALID_TRANSPORTATION = 'INVALID_TRANSPORTATION',
  INVALID_GROUP_SIZE = 'INVALID_GROUP_SIZE',
  
  // Profile management errors
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  DUPLICATE_PROFILE_NAME = 'DUPLICATE_PROFILE_NAME',
  CANNOT_DELETE_DEFAULT = 'CANNOT_DELETE_DEFAULT',
  CANNOT_DELETE_LAST_PROFILE = 'CANNOT_DELETE_LAST_PROFILE',
  MAX_PROFILES_EXCEEDED = 'MAX_PROFILES_EXCEEDED',
  
  // Data persistence errors
  SAVE_FAILED = 'SAVE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  FIRESTORE_ERROR = 'FIRESTORE_ERROR',
  
  // Signal errors
  INVALID_SIGNAL = 'INVALID_SIGNAL',
  SIGNAL_SAVE_FAILED = 'SIGNAL_SAVE_FAILED',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

/**
 * Base error class for travel preferences
 */
export class TravelPreferencesError extends Error {
  constructor(
    message: string,
    public code: TravelPreferencesErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'TravelPreferencesError';
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TravelPreferencesError);
    }
  }

  /**
   * Get user-friendly error message for mobile display
   */
  getUserMessage(): string {
    switch (this.code) {
      // Validation errors
      case TravelPreferencesErrorCode.VALIDATION_FAILED:
        return 'Some fields have invalid values. Please check and try again.';
      case TravelPreferencesErrorCode.INVALID_PROFILE_NAME:
        return 'Profile name is invalid. Use only letters, numbers, spaces, and hyphens.';
      case TravelPreferencesErrorCode.INVALID_BUDGET_RANGE:
        return 'Budget range is invalid. Minimum must be less than maximum.';
      case TravelPreferencesErrorCode.INVALID_ACTIVITIES:
        return 'Invalid activity selection. Please choose from the available options.';
      case TravelPreferencesErrorCode.INVALID_FOOD_PREFERENCES:
        return 'Invalid food preferences. Please check your selections.';
      case TravelPreferencesErrorCode.INVALID_ACCOMMODATION:
        return 'Invalid accommodation settings. Please review your choices.';
      case TravelPreferencesErrorCode.INVALID_TRANSPORTATION:
        return 'Invalid transportation settings. Please select valid options.';
      case TravelPreferencesErrorCode.INVALID_GROUP_SIZE:
        return 'Group size must be between 1 and 50.';
      
      // Profile management errors
      case TravelPreferencesErrorCode.PROFILE_NOT_FOUND:
        return 'Profile not found. It may have been deleted.';
      case TravelPreferencesErrorCode.DUPLICATE_PROFILE_NAME:
        return 'A profile with this name already exists.';
      case TravelPreferencesErrorCode.CANNOT_DELETE_DEFAULT:
        return 'Cannot delete the default profile. Set another profile as default first.';
      case TravelPreferencesErrorCode.CANNOT_DELETE_LAST_PROFILE:
        return 'Cannot delete the last profile. At least one profile is required.';
      case TravelPreferencesErrorCode.MAX_PROFILES_EXCEEDED:
        return 'Maximum number of profiles reached (10). Delete a profile to create a new one.';
      
      // Data persistence errors
      case TravelPreferencesErrorCode.SAVE_FAILED:
        return 'Failed to save preferences. Please try again.';
      case TravelPreferencesErrorCode.LOAD_FAILED:
        return 'Failed to load preferences. Please check your connection.';
      case TravelPreferencesErrorCode.DELETE_FAILED:
        return 'Failed to delete profile. Please try again.';
      case TravelPreferencesErrorCode.FIRESTORE_ERROR:
        return 'Database error. Please check your connection and try again.';
      
      // Signal errors
      case TravelPreferencesErrorCode.INVALID_SIGNAL:
        return 'Invalid preference signal data.';
      case TravelPreferencesErrorCode.SIGNAL_SAVE_FAILED:
        return 'Failed to save preference learning data.';
      
      // General errors
      case TravelPreferencesErrorCode.NETWORK_ERROR:
        return 'Network error. Please check your connection.';
      case TravelPreferencesErrorCode.PERMISSION_DENIED:
        return 'Permission denied. Please sign in again.';
      case TravelPreferencesErrorCode.UNKNOWN_ERROR:
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Factory functions for common error scenarios
 */

export function createValidationError(errors: string[]): TravelPreferencesError {
  return new TravelPreferencesError(
    `Validation failed: ${errors.join(', ')}`,
    TravelPreferencesErrorCode.VALIDATION_FAILED,
    { errors }
  );
}

export function createProfileNotFoundError(profileId: string): TravelPreferencesError {
  return new TravelPreferencesError(
    `Profile not found: ${profileId}`,
    TravelPreferencesErrorCode.PROFILE_NOT_FOUND,
    { profileId }
  );
}

export function createDuplicateProfileNameError(name: string): TravelPreferencesError {
  return new TravelPreferencesError(
    `Profile name already exists: ${name}`,
    TravelPreferencesErrorCode.DUPLICATE_PROFILE_NAME,
    { name }
  );
}

export function createCannotDeleteDefaultError(): TravelPreferencesError {
  return new TravelPreferencesError(
    'Cannot delete default profile',
    TravelPreferencesErrorCode.CANNOT_DELETE_DEFAULT
  );
}

export function createCannotDeleteLastProfileError(): TravelPreferencesError {
  return new TravelPreferencesError(
    'Cannot delete the last profile',
    TravelPreferencesErrorCode.CANNOT_DELETE_LAST_PROFILE
  );
}

export function createMaxProfilesExceededError(maxProfiles: number = 10): TravelPreferencesError {
  return new TravelPreferencesError(
    `Maximum number of profiles exceeded: ${maxProfiles}`,
    TravelPreferencesErrorCode.MAX_PROFILES_EXCEEDED,
    { maxProfiles }
  );
}

export function createSaveFailedError(reason?: string): TravelPreferencesError {
  return new TravelPreferencesError(
    `Failed to save preferences: ${reason || 'Unknown error'}`,
    TravelPreferencesErrorCode.SAVE_FAILED,
    { reason }
  );
}

export function createLoadFailedError(reason?: string): TravelPreferencesError {
  return new TravelPreferencesError(
    `Failed to load preferences: ${reason || 'Unknown error'}`,
    TravelPreferencesErrorCode.LOAD_FAILED,
    { reason }
  );
}

export function createDeleteFailedError(reason?: string): TravelPreferencesError {
  return new TravelPreferencesError(
    `Failed to delete profile: ${reason || 'Unknown error'}`,
    TravelPreferencesErrorCode.DELETE_FAILED,
    { reason }
  );
}

export function createFirestoreError(error: any): TravelPreferencesError {
  let code = TravelPreferencesErrorCode.FIRESTORE_ERROR;
  let message = 'Firestore operation failed';

  // Map Firebase error codes to our error codes
  if (error.code) {
    switch (error.code) {
      case 'permission-denied':
        code = TravelPreferencesErrorCode.PERMISSION_DENIED;
        message = 'Permission denied';
        break;
      case 'unavailable':
      case 'deadline-exceeded':
        code = TravelPreferencesErrorCode.NETWORK_ERROR;
        message = 'Network error';
        break;
      default:
        message = error.message || message;
    }
  }

  return new TravelPreferencesError(message, code, { originalError: error });
}

export function createInvalidSignalError(reason: string): TravelPreferencesError {
  return new TravelPreferencesError(
    `Invalid preference signal: ${reason}`,
    TravelPreferencesErrorCode.INVALID_SIGNAL,
    { reason }
  );
}

export function createSignalSaveFailedError(reason?: string): TravelPreferencesError {
  return new TravelPreferencesError(
    `Failed to save preference signal: ${reason || 'Unknown error'}`,
    TravelPreferencesErrorCode.SIGNAL_SAVE_FAILED,
    { reason }
  );
}

/**
 * Type guard to check if an error is a TravelPreferencesError
 */
export function isTravelPreferencesError(error: any): error is TravelPreferencesError {
  return error instanceof TravelPreferencesError;
}

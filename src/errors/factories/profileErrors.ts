/**
 * Profile Error Factory
 * 
 * Translates profile-related failures into AppError instances.
 * Covers: profile not found, profile update failures, profile load failures.
 */

import { AppError, ErrorDomain, ErrorSeverity } from '../AppError';

/**
 * User's Firestore profile document was not found.
 * Common when user authenticated via Firebase Auth but has no users collection record.
 */
export function createProfileNotFoundError(userId: string): AppError {
  return new AppError({
    code: 'PROFILE_NOT_FOUND',
    message: `User profile document not found for uid: ${userId}`,
    userMessage: 'Your profile could not be found. Please try signing out and back in.',
    severity: ErrorSeverity.ERROR,
    domain: ErrorDomain.PROFILE,
    recoverable: true,
    retryAction: 'Sign Out & Retry',
    context: { userId },
  });
}

/**
 * Failed to update user profile in Firestore.
 */
export function createProfileUpdateError(rawError: unknown, userId?: string): AppError {
  const message = rawError instanceof Error ? rawError.message : String(rawError);
  return new AppError({
    code: 'PROFILE_UPDATE_FAILED',
    message: `Failed to update profile: ${message}`,
    userMessage: 'Failed to update your profile. Please try again.',
    severity: ErrorSeverity.ERROR,
    domain: ErrorDomain.PROFILE,
    recoverable: true,
    retryAction: 'Retry',
    originalError: rawError,
    context: userId ? { userId } : undefined,
  });
}

/**
 * Failed to load user profile from Firestore.
 */
export function createProfileLoadError(rawError: unknown, userId?: string): AppError {
  const message = rawError instanceof Error ? rawError.message : String(rawError);
  return new AppError({
    code: 'PROFILE_LOAD_FAILED',
    message: `Failed to load profile: ${message}`,
    userMessage: 'Failed to load your profile. Please check your connection and try again.',
    severity: ErrorSeverity.ERROR,
    domain: ErrorDomain.PROFILE,
    recoverable: true,
    retryAction: 'Retry',
    originalError: rawError,
    context: userId ? { userId } : undefined,
  });
}

/**
 * User must be authenticated to perform a profile operation.
 */
export function createNotAuthenticatedError(): AppError {
  return new AppError({
    code: 'NOT_AUTHENTICATED',
    message: 'User must be logged in to perform this action',
    userMessage: 'Please sign in to continue.',
    severity: ErrorSeverity.ERROR,
    domain: ErrorDomain.AUTH,
    recoverable: true,
    retryAction: 'Sign In',
  });
}

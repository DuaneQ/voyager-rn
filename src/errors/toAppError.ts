/**
 * toAppError — Converts any unknown caught error into an AppError
 * 
 * Use this in catch blocks where you need an AppError but don't have
 * a domain-specific factory. Prefer domain factories (createFirestoreError,
 * createProfileError, etc.) when the error source is known.
 * 
 * Handles:
 *   - AppError (pass-through — no double-wrapping)
 *   - Error instances (wraps with generic user message)
 *   - Strings (wraps as message)
 *   - null/undefined/anything else (generic fallback)
 */

import { AppError, isAppError, ErrorDomain, ErrorSeverity } from './AppError';

/**
 * Convert any caught value into a standardized AppError.
 * 
 * @param err - The caught error (any type)
 * @param domain - Optional domain to categorize the error
 * @returns An AppError instance (pass-through if already AppError)
 */
export function toAppError(err: unknown, domain?: ErrorDomain): AppError {
  // Already an AppError — return as-is (no double-wrapping)
  if (isAppError(err)) {
    return err;
  }

  // Standard Error object — wrap with safe user message
  if (err instanceof Error) {
    return new AppError({
      code: 'UNKNOWN_ERROR',
      message: err.message,
      userMessage: 'Something went wrong. Please try again.',
      domain: domain ?? ErrorDomain.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      recoverable: true,
      retryAction: 'Retry',
      originalError: err,
    });
  }

  // String — treat as technical message
  if (typeof err === 'string') {
    return new AppError({
      code: 'UNKNOWN_ERROR',
      message: err,
      userMessage: 'Something went wrong. Please try again.',
      domain: domain ?? ErrorDomain.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      recoverable: true,
      retryAction: 'Retry',
      originalError: err,
    });
  }

  // Anything else — fully generic
  return new AppError({
    code: 'UNKNOWN_ERROR',
    message: String(err),
    userMessage: 'An unexpected error occurred. Please try again.',
    domain: domain ?? ErrorDomain.UNKNOWN,
    severity: ErrorSeverity.ERROR,
    recoverable: false,
    originalError: err,
  });
}

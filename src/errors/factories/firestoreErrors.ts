/**
 * Firestore Error Factory
 * 
 * Translates raw Firestore errors into AppError instances with safe user messages.
 * This is the ONLY place that should understand raw Firestore error shapes.
 * 
 * Handles:
 *   - "No document to update" (the production bug)
 *   - not-found, permission-denied, unavailable, deadline-exceeded
 *   - Generic Firestore failures
 */

import { AppError, ErrorDomain, ErrorSeverity } from '../AppError';

/**
 * Create an AppError from a raw Firestore error.
 * 
 * @param rawError - The raw error caught from a Firestore operation
 * @param operation - Description of the operation that failed (for logging)
 * @param context - Optional additional context for debugging
 */
export function createFirestoreError(
  rawError: unknown,
  operation: string,
  context?: Record<string, unknown>
): AppError {
  const err = rawError as Record<string, unknown> | null | undefined;
  const code = (typeof err?.code === 'string') ? err.code : 'unknown';
  const message = (err instanceof Error) ? err.message : String(rawError);

  // Detect "No document to update" pattern (the production bug trigger)
  if (
    message.includes('No document to update') ||
    message.includes('NOT_FOUND') ||
    code === 'not-found'
  ) {
    return new AppError({
      code: 'FIRESTORE_DOC_NOT_FOUND',
      message: `Document not found during ${operation}: ${message}`,
      userMessage: 'Your data was not found. Please try signing out and back in.',
      severity: ErrorSeverity.ERROR,
      domain: ErrorDomain.FIRESTORE,
      recoverable: true,
      retryAction: 'Sign Out & Retry',
      originalError: rawError,
      context: { ...context, operation },
    });
  }

  switch (code) {
    case 'permission-denied':
      return new AppError({
        code: 'FIRESTORE_PERMISSION_DENIED',
        message: `Permission denied during ${operation}: ${message}`,
        userMessage: 'You don\'t have permission to perform this action. Please sign in again.',
        severity: ErrorSeverity.ERROR,
        domain: ErrorDomain.FIRESTORE,
        recoverable: true,
        retryAction: 'Sign In Again',
        originalError: rawError,
        context: { ...context, operation },
      });

    case 'unavailable':
    case 'deadline-exceeded':
      return new AppError({
        code: 'FIRESTORE_NETWORK_ERROR',
        message: `Network error during ${operation}: ${message}`,
        userMessage: 'Connection error. Please check your internet and try again.',
        severity: ErrorSeverity.WARNING,
        domain: ErrorDomain.NETWORK,
        recoverable: true,
        retryAction: 'Retry',
        originalError: rawError,
        context: { ...context, operation },
      });

    case 'already-exists':
      return new AppError({
        code: 'FIRESTORE_ALREADY_EXISTS',
        message: `Document already exists during ${operation}: ${message}`,
        userMessage: 'This item already exists.',
        severity: ErrorSeverity.WARNING,
        domain: ErrorDomain.FIRESTORE,
        recoverable: false,
        originalError: rawError,
        context: { ...context, operation },
      });

    case 'resource-exhausted':
      return new AppError({
        code: 'FIRESTORE_RATE_LIMITED',
        message: `Rate limited during ${operation}: ${message}`,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        severity: ErrorSeverity.WARNING,
        domain: ErrorDomain.FIRESTORE,
        recoverable: true,
        retryAction: 'Retry',
        originalError: rawError,
        context: { ...context, operation },
      });

    default:
      return new AppError({
        code: `FIRESTORE_ERROR`,
        message: `Firestore error during ${operation}: ${message}`,
        userMessage: 'Something went wrong. Please try again.',
        severity: ErrorSeverity.ERROR,
        domain: ErrorDomain.FIRESTORE,
        recoverable: true,
        retryAction: 'Retry',
        originalError: rawError,
        context: { ...context, operation },
      });
  }
}

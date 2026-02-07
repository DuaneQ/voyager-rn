/**
 * AppError — Base error class for standardized error handling
 * 
 * All domain-specific errors should extend or be wrapped in AppError.
 * This ensures every error carries:
 *   - A machine-readable code
 *   - A safe, user-facing message (never raw Firestore paths or stack traces)
 *   - Structured context for logging
 * 
 * Following S.O.L.I.D.:
 *   - Single Responsibility: Only handles error representation
 *   - Open/Closed: New domains added via ErrorDomain enum + factory functions
 *   - Liskov: All AppError subclasses are substitutable
 *   - Interface Segregation: Small surface — getUserMessage() is all UI needs
 *   - Dependency Inversion: Components depend on AppError, not raw Firebase errors
 */

/**
 * Severity levels for categorizing errors
 */
export enum ErrorSeverity {
  /** Informational — no action needed */
  INFO = 'info',
  /** Warning — degraded experience but not broken */
  WARNING = 'warning',
  /** Error — operation failed, user should retry */
  ERROR = 'error',
  /** Critical — app-level failure, may need restart */
  CRITICAL = 'critical',
}

/**
 * Domain identifiers for grouping related errors
 */
export enum ErrorDomain {
  AUTH = 'auth',
  PROFILE = 'profile',
  FIRESTORE = 'firestore',
  ITINERARY = 'itinerary',
  CHAT = 'chat',
  SEARCH = 'search',
  NETWORK = 'network',
  VIDEO = 'video',
  SUBSCRIPTION = 'subscription',
  TRAVEL_PREFERENCES = 'travel_preferences',
  UNKNOWN = 'unknown',
}

/**
 * Options for constructing an AppError
 */
export interface AppErrorOptions {
  /** Machine-readable error code (e.g. 'FIRESTORE_DOC_NOT_FOUND') */
  code: string;
  /** Technical message for developers/logs — may contain internal details */
  message: string;
  /** Safe, user-facing message — shown in UI. Must never contain internal paths or stack traces */
  userMessage: string;
  /** Error severity level */
  severity?: ErrorSeverity;
  /** Domain this error belongs to */
  domain: ErrorDomain;
  /** Whether the user can retry the failed operation */
  recoverable?: boolean;
  /** Label for a retry button (e.g. 'Retry', 'Sign Out & Retry') */
  retryAction?: string;
  /** The original raw error that was caught */
  originalError?: unknown;
  /** Additional structured context for debugging */
  context?: Record<string, unknown>;
}

/**
 * Base application error class
 * 
 * Wraps raw errors with safe user-facing messages and structured metadata.
 * All catch blocks should translate raw errors into AppError instances
 * before exposing them to the UI layer.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly severity: ErrorSeverity;
  public readonly domain: ErrorDomain;
  public readonly recoverable: boolean;
  public readonly retryAction?: string;
  public readonly originalError?: unknown;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.severity = options.severity ?? ErrorSeverity.ERROR;
    this.domain = options.domain;
    this.recoverable = options.recoverable ?? false;
    this.retryAction = options.retryAction;
    this.originalError = options.originalError;
    this.context = options.context;
    this.timestamp = Date.now();

    // Maintain proper stack trace (V8 engines only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Get a safe message suitable for displaying in the UI.
   * This is the ONLY method components should use for user-visible text.
   */
  getUserMessage(): string {
    return this.userMessage;
  }

  /**
   * Get a structured object suitable for logging/reporting.
   * Includes technical details that should NOT be shown to users.
   */
  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      domain: this.domain,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      context: this.context,
      originalError: this.originalError instanceof Error
        ? { message: this.originalError.message, stack: this.originalError.stack }
        : this.originalError,
    };
  }
}

/**
 * Type guard to check if an unknown error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

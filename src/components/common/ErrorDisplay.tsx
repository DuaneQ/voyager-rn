/**
 * ErrorDisplay — Reusable inline error display component
 * 
 * Shows a user-friendly error message with an optional retry button.
 * Works with AppError (preferred) or raw Error objects (backward-compatible).
 * 
 * This replaces ad-hoc patterns like:
 *   <Text>{error.message}</Text>  ← raw Firestore paths shown to users
 * 
 * With safe, standardized display:
 *   <ErrorDisplay error={error} onRetry={refresh} />
 * 
 * Usage:
 *   // With AppError (preferred)
 *   <ErrorDisplay error={appError} onRetry={() => reload()} />
 * 
 *   // With raw Error (backward-compatible)
 *   <ErrorDisplay error={rawError} onRetry={() => reload()} />
 * 
 *   // Compact mode (inline, smaller text)
 *   <ErrorDisplay error={error} compact />
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { isAppError } from '../../errors/AppError';

interface ErrorDisplayProps {
  /** The error to display. Can be AppError, Error, or string. */
  error: unknown;
  /** Optional retry callback — shows a retry button when provided */
  onRetry?: () => void;
  /** Optional custom retry button label */
  retryLabel?: string;
  /** Compact mode for inline display (smaller, no icon) */
  compact?: boolean;
  /** Optional additional action (e.g., "Sign Out") */
  onSecondaryAction?: () => void;
  /** Label for the secondary action button */
  secondaryActionLabel?: string;
}

/**
 * Get a safe user-facing message from any error type.
 * Never returns raw Firestore paths, stack traces, or internal codes.
 */
function getSafeMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.getUserMessage();
  }

  // For raw Error objects, return a generic safe message
  // Do NOT return error.message — it may contain Firestore paths
  if (error instanceof Error) {
    return 'Something went wrong. Please try again.';
  }

  if (typeof error === 'string') {
    return 'Something went wrong. Please try again.';
  }

  return 'An unexpected error occurred.';
}

/**
 * Get the retry button label
 */
function getRetryLabel(error: unknown, customLabel?: string): string {
  if (customLabel) return customLabel;
  if (isAppError(error) && error.retryAction) return error.retryAction;
  return 'Retry';
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  retryLabel,
  compact = false,
  onSecondaryAction,
  secondaryActionLabel,
}) => {
  if (!error) return null;

  const message = getSafeMessage(error);
  const buttonLabel = getRetryLabel(error, retryLabel);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactMessage}>{message}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.compactRetryButton}>
            <Text style={styles.compactRetryText}>{buttonLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      )}

      {onSecondaryAction && secondaryActionLabel && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onSecondaryAction}
        >
          <Text style={styles.secondaryButtonText}>{secondaryActionLabel}</Text>
        </TouchableOpacity>
      )}

      {__DEV__ && error instanceof Error && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            {isAppError(error) ? `[${error.code}] ${error.message}` : error.message}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    fontSize: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 300,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
    ...Platform.select({
      web: { cursor: 'pointer' } as Record<string, string>,
      default: {},
    }),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
    ...Platform.select({
      web: { cursor: 'pointer' } as Record<string, string>,
      default: {},
    }),
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFF3F3',
    borderRadius: 6,
  },
  compactMessage: {
    flex: 1,
    fontSize: 13,
    color: '#CC0000',
  },
  compactRetryButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    ...Platform.select({
      web: { cursor: 'pointer' } as Record<string, string>,
      default: {},
    }),
  },
  compactRetryText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFF9F0',
    borderRadius: 4,
    maxWidth: '90%' as unknown as number,
  },
  debugText: {
    fontSize: 10,
    color: '#996600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default ErrorDisplay;

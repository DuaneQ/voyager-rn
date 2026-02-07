/**
 * ErrorBoundary — React error boundary component
 * 
 * Catches uncaught JavaScript errors in the React component tree and
 * displays a fallback UI instead of crashing the entire app.
 * 
 * Note: This MUST be a class component because React's error boundary
 * API (getDerivedStateFromError, componentDidCatch) is only available
 * for class components. This is a React limitation, not a style choice.
 * 
 * Usage:
 *   <ErrorBoundary level="global">
 *     <App />
 *   </ErrorBoundary>
 * 
 *   <ErrorBoundary level="page" fallback={(error, reset) => <MyFallback />}>
 *     <SearchPage />
 *   </ErrorBoundary>
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback renderer. If omitted, a default fallback is shown. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Optional callback when an error is caught (for logging/reporting) */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Boundary level — affects the default fallback UI messaging */
  level?: 'page' | 'section' | 'global';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Default fallback UI displayed when an error is caught
 */
function DefaultErrorFallback({
  error,
  onReset,
  level,
}: {
  error: Error;
  onReset: () => void;
  level: string;
}) {
  const isGlobal = level === 'global';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        bounces={false}
      >
        <Text style={styles.emoji}>{isGlobal ? '😔' : '⚠️'}</Text>
        <Text style={styles.title}>
          {isGlobal ? 'Something went wrong' : 'This section encountered an error'}
        </Text>
        <Text style={styles.message}>
          {isGlobal
            ? 'The app ran into an unexpected problem. Please try again.'
            : 'An error occurred in this section. Other parts of the app should still work.'}
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={onReset}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Info</Text>
            <Text style={styles.debugText}>{error.message}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * React Error Boundary component
 * 
 * Place at the root of App.tsx (level="global") and around each
 * page/tab (level="page") to contain crashes.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const level = this.props.level ?? 'section';
    console.error(`[ErrorBoundary:${level}] Uncaught error:`, error);
    console.error(`[ErrorBoundary:${level}] Component stack:`, errorInfo.componentStack);

    // Notify parent if callback provided (for future Sentry/Crashlytics integration)
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback takes priority
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback
      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.resetError}
          level={this.props.level ?? 'section'}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer' } as Record<string, string>,
      default: {},
    }),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#FFF3F3',
    borderRadius: 8,
    maxWidth: '90%' as unknown as number,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CC0000',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    color: '#990000',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default ErrorBoundary;

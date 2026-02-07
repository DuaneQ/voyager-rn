/**
 * Global Error Handler
 * 
 * Sets up handlers for uncaught JavaScript errors and unhandled promise
 * rejections. This is a safety net — errors should be caught at lower
 * layers, but this ensures nothing crashes silently in production.
 * 
 * Call setupGlobalErrorHandlers() once at app startup (in App.tsx).
 * 
 * Platform handling:
 *   - React Native: Uses ErrorUtils.setGlobalHandler
 *   - Web: Uses window.onerror + window.onunhandledrejection
 *   - Both: Logs errors (future: send to Sentry/Crashlytics)
 */

import { Platform } from 'react-native';

let isSetup = false;

/**
 * Initialize global error handlers.
 * Safe to call multiple times — will only set up once.
 */
export function setupGlobalErrorHandlers(): void {
  if (isSetup) return;
  isSetup = true;

  // React Native global JS error handler (iOS/Android)
  if (Platform.OS !== 'web') {
    try {
      // ErrorUtils is a React Native global — not available on web
      const ErrorUtilsGlobal = (global as Record<string, unknown>).ErrorUtils as
        | {
            getGlobalHandler: () => (error: Error, isFatal: boolean) => void;
            setGlobalHandler: (handler: (error: Error, isFatal: boolean) => void) => void;
          }
        | undefined;

      if (ErrorUtilsGlobal) {
        const defaultHandler = ErrorUtilsGlobal.getGlobalHandler();

        ErrorUtilsGlobal.setGlobalHandler((error: Error, isFatal: boolean) => {
          console.error('[GlobalErrorHandler] Uncaught error:', {
            message: error.message,
            isFatal,
            stack: error.stack?.split('\n').slice(0, 5).join('\n'),
          });

          // Future: Send to error reporting service (Sentry, Crashlytics)

          // Always call the default handler to preserve RN's crash reporting
          defaultHandler(error, isFatal);
        });
      }
    } catch (err) {
      // Non-fatal: If we can't set up the handler, the default still works
      console.warn('[GlobalErrorHandler] Failed to set up native error handler:', err);
    }
  }

  // Unhandled promise rejections (all platforms)
  if (typeof globalThis !== 'undefined' && typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      console.error('[GlobalErrorHandler] Unhandled promise rejection:', {
        reason: event.reason instanceof Error
          ? { message: event.reason.message, stack: event.reason.stack?.split('\n').slice(0, 5).join('\n') }
          : event.reason,
      });

      // Future: Send to error reporting service
    });
  }
}

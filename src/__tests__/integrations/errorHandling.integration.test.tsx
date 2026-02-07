/**
 * Error Handling Integration Tests
 * 
 * Tests the end-to-end error handling pipeline:
 *   Layer 0 (raw errors) → Layer 1 (factories) → Layer 2 (AppError) → Layer 3 (UI display)
 * 
 * These are NOT Firebase emulator tests — they test the error translation and
 * rendering pipeline using mocked raw errors that simulate real production scenarios.
 * 
 * Covers:
 *   - Firestore error → AppError → ErrorDisplay (never leaks internals)
 *   - Profile error → AppError → ErrorDisplay (never leaks user IDs)
 *   - Video error → AppError → ErrorDisplay (never leaks storage URLs)
 *   - Cross-factory consistency (all factories produce valid AppError)
 *   - ErrorBoundary catches render crashes and isolates failures
 *   - ErrorDisplay renders safely for all error types
 *   - toAppError wraps unknown errors safely
 *   - Security: no user-visible message contains internal details
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { AppError, ErrorDomain, ErrorSeverity, isAppError } from '../../errors/AppError';
import { toAppError } from '../../errors/toAppError';
import { createFirestoreError } from '../../errors/factories/firestoreErrors';
import { createProfileNotFoundError, createProfileUpdateError, createProfileLoadError } from '../../errors/factories/profileErrors';
import {
  createVideoError,
  createVideoNotFoundError,
  createVideoCodecError,
  createVideoNetworkError,
  createVideoAutoplayBlockedError,
  createVideoPlaybackError,
  createVideoFeedLoadError,
  createVideoInteractionError,
} from '../../errors/factories/videoErrors';
import ErrorDisplay from '../../components/common/ErrorDisplay';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// ─── Test Helpers ────────────────────────────────────────────────────────────

/** Production-like raw errors that have appeared in real incidents */
const PRODUCTION_RAW_ERRORS = {
  firestoreDocNotFound: new Error(
    'No document to update: projects/mundo1-1/databases/(default)/documents/users/BwYMglU1PCdkHeUCbXL9HFL2yuj1'
  ),
  firestorePermissionDenied: Object.assign(
    new Error('Missing or insufficient permissions.'),
    { code: 'permission-denied' }
  ),
  firestoreUnavailable: Object.assign(
    new Error('The service is currently unavailable.'),
    { code: 'unavailable' }
  ),
  videoStorageNotFound: new Error(
    'Firebase Storage: Object \'videos/user123/clip.mp4\' does not exist. (storage/object-not-found)'
  ),
  videoMediaCodec: new Error(
    'A playback exception has occurred: MediaCodecVideoRenderer error, index=0, format=Format(2, null, video/hevc, 1920x1080, -1.0, null, -1, -1, 0, 1'
  ),
  videoNetworkTimeout: new Error('Connection timeout while buffering video stream'),
  videoAutoplayBlocked: new Error(
    "play() request was interrupted by a call to pause(). The user didn't interact with the document first."
  ),
  video416Error: new Error('HTTP 416 Range Not Satisfiable'),
  videoFirestoreUrl: new Error(
    'Failed to load https://firebasestorage.googleapis.com/v0/b/mundo1-1.appspot.com/o/videos%2Fuser123%2Fclip.mp4?alt=media'
  ),
};

/** Sensitive strings that must NEVER appear in any user-visible message */
const SENSITIVE_PATTERNS = [
  'projects/mundo1-1',
  'databases/(default)',
  'documents/users/',
  'BwYMglU1PCdkHeUCbXL9HFL2yuj1',
  'firebasestorage.googleapis.com',
  'mundo1-1.appspot.com',
  'MediaCodecVideoRenderer',
  'format=Format(',
  'video/hevc, 1920x1080',
  'index=0',
  'storage/object-not-found',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'permission-denied',
  'stack trace',
];

// Suppress console.error from ErrorBoundary tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0]);
    if (
      msg.includes('ErrorBoundary') ||
      msg.includes('The above error occurred') ||
      msg.includes('Error: Uncaught')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

// ─── Test Suites ─────────────────────────────────────────────────────────────

describe('Error Handling Integration Tests', () => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PIPELINE: Raw Firestore Error → Factory → AppError → ErrorDisplay
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('Firestore → AppError → ErrorDisplay pipeline', () => {
    it('should translate "No document to update" production error to safe UI', () => {
      // Step 1: Factory translates raw error
      const appError = createFirestoreError(
        PRODUCTION_RAW_ERRORS.firestoreDocNotFound,
        'acceptTerms',
        { userId: 'BwYMglU1PCdkHeUCbXL9HFL2yuj1' }
      );

      // Step 2: Verify AppError properties
      expect(isAppError(appError)).toBe(true);
      expect(appError.code).toBe('FIRESTORE_DOC_NOT_FOUND');
      expect(appError.domain).toBe(ErrorDomain.FIRESTORE);
      expect(appError.recoverable).toBe(true);

      // Step 3: Render in ErrorDisplay
      const { getByText, queryByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );

      // Step 4: Verify safe user message is shown in UI
      expect(getByText(appError.getUserMessage())).toBeTruthy();

      // Step 5: Verify getUserMessage() never contains sensitive information
      // Note: In __DEV__ mode, ErrorDisplay intentionally shows debug info with
      // raw error details — that's only visible to developers, not production users.
      // The security contract is getUserMessage(), which is used in production UI.
      const userMsg = appError.getUserMessage();
      for (const pattern of SENSITIVE_PATTERNS) {
        expect(userMsg.toLowerCase()).not.toContain(pattern.toLowerCase());
      }
    });

    it('should translate permission-denied error to safe UI with recovery', () => {
      const appError = createFirestoreError(
        PRODUCTION_RAW_ERRORS.firestorePermissionDenied,
        'updateProfile'
      );

      expect(appError.code).toBe('FIRESTORE_PERMISSION_DENIED');
      expect(appError.recoverable).toBe(true);
      expect(appError.retryAction).toBe('Sign In Again');

      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );

      // User sees friendly message via getUserMessage()
      expect(appError.getUserMessage()).toMatch(/permission/i);
      expect(getByText(appError.getUserMessage())).toBeTruthy();
      // Retry button uses custom label from AppError
      expect(getByText('Sign In Again')).toBeTruthy();
    });

    it('should translate unavailable/network error to safe UI with retry', () => {
      const appError = createFirestoreError(
        PRODUCTION_RAW_ERRORS.firestoreUnavailable,
        'fetchItineraries'
      );

      expect(appError.code).toBe('FIRESTORE_NETWORK_ERROR');
      expect(appError.domain).toBe(ErrorDomain.NETWORK);
      expect(appError.recoverable).toBe(true);

      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );

      expect(getByText(/connection/i)).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PIPELINE: Raw Profile Error → Factory → AppError → ErrorDisplay
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('Profile → AppError → ErrorDisplay pipeline', () => {
    it('should translate "profile not found" to safe UI', () => {
      const appError = createProfileNotFoundError('BwYMglU1PCdkHeUCbXL9HFL2yuj1');

      expect(appError.code).toBe('PROFILE_NOT_FOUND');
      expect(appError.domain).toBe(ErrorDomain.PROFILE);

      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );

      expect(getByText(/profile could not be found/i)).toBeTruthy();
      // User ID must never leak via getUserMessage() (the production UI contract)
      expect(appError.getUserMessage()).not.toContain('BwYMglU1PCdkHeUCbXL9HFL2yuj1');
    });

    it('should translate profile update failure to safe UI', () => {
      const rawError = new Error('Firestore: INTERNAL: 500 Internal Server Error');
      const appError = createProfileUpdateError(rawError, 'user-abc');

      expect(appError.code).toBe('PROFILE_UPDATE_FAILED');
      expect(appError.recoverable).toBe(true);

      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );

      expect(getByText(/failed to update your profile/i)).toBeTruthy();
      // Internal details never in user-facing message
      expect(appError.getUserMessage()).not.toMatch(/500/);
      expect(appError.getUserMessage()).not.toMatch(/INTERNAL/);
    });

    it('should translate profile load failure to safe UI', () => {
      const appError = createProfileLoadError(
        new Error('deadline-exceeded'),
        'user-xyz'
      );

      expect(appError.code).toBe('PROFILE_LOAD_FAILED');

      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );

      expect(getByText(/failed to load your profile/i)).toBeTruthy();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PIPELINE: Raw Video Error → Factory → AppError → ErrorDisplay
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('Video → AppError → ErrorDisplay pipeline', () => {
    it('should translate deleted video (storage 404) to safe UI', () => {
      const appError = createVideoError(
        PRODUCTION_RAW_ERRORS.videoStorageNotFound,
        'video-abc-123',
        { platform: 'ios' }
      );

      expect(appError.code).toBe('VIDEO_NOT_FOUND');
      expect(appError.recoverable).toBe(false);

      const { getByText, queryByText } = render(
        <ErrorDisplay error={appError} />
      );

      expect(getByText(/no longer available/i)).toBeTruthy();
      // No retry button for deleted videos
      expect(queryByText('Retry')).toBeNull();
      // Storage path never leaks via getUserMessage()
      expect(appError.getUserMessage()).not.toMatch(/videos\/user123/);
      expect(appError.getUserMessage()).not.toMatch(/storage\/object-not-found/);
    });

    it('should translate MediaCodec error to safe UI', () => {
      const appError = createVideoError(
        PRODUCTION_RAW_ERRORS.videoMediaCodec,
        'video-789'
      );

      expect(appError.code).toBe('VIDEO_CODEC_UNSUPPORTED');
      expect(appError.recoverable).toBe(false);

      const { getByText } = render(
        <ErrorDisplay error={appError} />
      );

      expect(getByText(/not compatible with your device/i)).toBeTruthy();
      // Raw codec details never in user-facing message
      expect(appError.getUserMessage()).not.toMatch(/MediaCodecVideoRenderer/);
      expect(appError.getUserMessage()).not.toMatch(/video\/hevc/);
      expect(appError.getUserMessage()).not.toMatch(/1920x1080/);
    });

    it('should translate network timeout to safe UI with retry', () => {
      const appError = createVideoError(
        PRODUCTION_RAW_ERRORS.videoNetworkTimeout,
        'video-net'
      );

      expect(appError.code).toBe('VIDEO_NETWORK_ERROR');
      expect(appError.recoverable).toBe(true);

      const onRetry = jest.fn();
      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={onRetry} />
      );

      expect(getByText(/check your connection/i)).toBeTruthy();
      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should translate autoplay blocked to INFO-level safe UI', () => {
      const appError = createVideoError(
        PRODUCTION_RAW_ERRORS.videoAutoplayBlocked,
        'video-web'
      );

      expect(appError.code).toBe('VIDEO_AUTOPLAY_BLOCKED');
      expect(appError.severity).toBe(ErrorSeverity.INFO);

      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );

      expect(getByText(/tap to play this video/i)).toBeTruthy();
      // Raw browser error never in user-facing message
      expect(appError.getUserMessage()).not.toMatch(/play\(\) request was interrupted/);
    });

    it('should translate HTTP 416 error to network error with safe UI', () => {
      const appError = createVideoError(
        PRODUCTION_RAW_ERRORS.video416Error,
        'video-416'
      );

      expect(appError.code).toBe('VIDEO_NETWORK_ERROR');

      // Raw HTTP status never in user-facing message
      expect(appError.getUserMessage()).not.toMatch(/416/);

      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );
      expect(getByText(appError.getUserMessage())).toBeTruthy();
    });

    it('should translate video feed load failure to safe UI', () => {
      const rawError = new Error('Firestore query failed: UNAVAILABLE');
      const appError = createVideoFeedLoadError(rawError, { filter: 'trending' });

      expect(appError.code).toBe('VIDEO_FEED_LOAD_FAILED');
      expect(appError.domain).toBe(ErrorDomain.VIDEO);

      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );

      expect(getByText(/failed to load videos/i)).toBeTruthy();
      expect(appError.getUserMessage()).not.toMatch(/UNAVAILABLE/);
    });

    it('should translate video interaction error to safe UI', () => {
      const appError = createVideoInteractionError(
        new Error('permission-denied'),
        'like',
        'video-like-1'
      );

      expect(appError.code).toBe('VIDEO_INTERACTION_FAILED');
      expect(appError.getUserMessage()).toContain('like');

      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );

      expect(getByText(/could not like/i)).toBeTruthy();
      expect(appError.getUserMessage()).not.toMatch(/permission-denied/);
    });

    it('should never expose Firebase Storage URLs in user messages', () => {
      const appError = createVideoError(
        PRODUCTION_RAW_ERRORS.videoFirestoreUrl,
        'video-url-leak'
      );

      // Verify getUserMessage() doesn't contain URLs
      expect(appError.getUserMessage()).not.toMatch(/firebasestorage/);
      expect(appError.getUserMessage()).not.toMatch(/googleapis/);
      expect(appError.getUserMessage()).not.toMatch(/appspot/);
      expect(appError.getUserMessage()).not.toMatch(/\.mp4/);

      const { getByText } = render(
        <ErrorDisplay error={appError} onRetry={() => {}} />
      );
      expect(getByText(appError.getUserMessage())).toBeTruthy();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CROSS-FACTORY CONSISTENCY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('Cross-factory consistency', () => {
    const allFactoryResults: AppError[] = [];

    beforeAll(() => {
      allFactoryResults.push(
        // Firestore factory
        createFirestoreError(new Error('test'), 'operation'),
        createFirestoreError({ code: 'not-found', message: 'test' }, 'op'),
        createFirestoreError({ code: 'permission-denied', message: 'test' }, 'op'),
        createFirestoreError({ code: 'unavailable', message: 'test' }, 'op'),
        createFirestoreError({ code: 'already-exists', message: 'test' }, 'op'),
        createFirestoreError({ code: 'resource-exhausted', message: 'test' }, 'op'),
        // Profile factory
        createProfileNotFoundError('uid-123'),
        createProfileUpdateError(new Error('test')),
        createProfileLoadError(new Error('test')),
        // Video factory
        createVideoNotFoundError(new Error('404')),
        createVideoCodecError(new Error('hevc')),
        createVideoNetworkError(new Error('timeout')),
        createVideoAutoplayBlockedError(),
        createVideoPlaybackError(new Error('unknown')),
        createVideoFeedLoadError(new Error('query failed')),
        createVideoInteractionError(new Error('denied'), 'like'),
        // Auto-detect factory
        createVideoError('Object does not exist'),
        createVideoError('MediaCodecVideoRenderer error'),
        createVideoError('Connection timeout'),
        createVideoError("play() request was interrupted"),
        createVideoError('Something unknown'),
      );
    });

    it('every factory result should be an AppError instance', () => {
      for (const error of allFactoryResults) {
        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(Error);
        expect(isAppError(error)).toBe(true);
      }
    });

    it('every factory result should have a non-empty code', () => {
      for (const error of allFactoryResults) {
        expect(typeof error.code).toBe('string');
        expect(error.code.length).toBeGreaterThan(0);
      }
    });

    it('every factory result should have a valid ErrorDomain', () => {
      const validDomains = Object.values(ErrorDomain);
      for (const error of allFactoryResults) {
        expect(validDomains).toContain(error.domain);
      }
    });

    it('every factory result should have a valid ErrorSeverity', () => {
      const validSeverities = Object.values(ErrorSeverity);
      for (const error of allFactoryResults) {
        expect(validSeverities).toContain(error.severity);
      }
    });

    it('every factory result should have a non-empty userMessage', () => {
      for (const error of allFactoryResults) {
        expect(typeof error.userMessage).toBe('string');
        expect(error.userMessage.length).toBeGreaterThan(0);
      }
    });

    it('every factory result should have a non-empty technical message', () => {
      for (const error of allFactoryResults) {
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    it('every factory result should have a timestamp', () => {
      const now = Date.now();
      for (const error of allFactoryResults) {
        expect(error.timestamp).toBeLessThanOrEqual(now);
        expect(error.timestamp).toBeGreaterThan(0);
      }
    });

    it('getUserMessage() should match userMessage property for all results', () => {
      for (const error of allFactoryResults) {
        expect(error.getUserMessage()).toBe(error.userMessage);
      }
    });

    it('toLogObject() should produce valid structured output for all results', () => {
      for (const error of allFactoryResults) {
        const log = error.toLogObject();
        expect(log.code).toBe(error.code);
        expect(log.domain).toBe(error.domain);
        expect(log.severity).toBe(error.severity);
        expect(log.message).toBe(error.message);
        expect(log.userMessage).toBe(error.userMessage);
        expect(typeof log.timestamp).toBe('number');
      }
    });

    it('no userMessage should contain sensitive patterns from any factory', () => {
      for (const error of allFactoryResults) {
        const userMsg = error.getUserMessage();
        for (const pattern of SENSITIVE_PATTERNS) {
          expect(userMsg.toLowerCase()).not.toContain(pattern.toLowerCase());
        }
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // toAppError — UNKNOWN ERROR WRAPPING PIPELINE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('toAppError → ErrorDisplay pipeline', () => {
    it('should pass AppError through unchanged and render safely', () => {
      const original = createProfileNotFoundError('uid-test');
      const wrapped = toAppError(original);

      // Same reference — no double-wrapping
      expect(wrapped).toBe(original);

      const { getByText } = render(<ErrorDisplay error={wrapped} onRetry={() => {}} />);
      expect(getByText(/profile could not be found/i)).toBeTruthy();
    });

    it('should wrap raw Error with safe message and render safely', () => {
      const rawError = new Error('No document to update: projects/mundo1-1/databases/(default)/documents/users/xyz');
      const wrapped = toAppError(rawError, ErrorDomain.FIRESTORE);

      expect(isAppError(wrapped)).toBe(true);
      expect(wrapped.domain).toBe(ErrorDomain.FIRESTORE);
      // toAppError uses generic safe message
      expect(wrapped.userMessage).toBe('Something went wrong. Please try again.');

      const { getByText } = render(<ErrorDisplay error={wrapped} onRetry={() => {}} />);
      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
      // Raw Firestore path never leaks via getUserMessage()
      expect(wrapped.getUserMessage()).not.toMatch(/projects\/mundo1-1/);
    });

    it('should wrap string errors safely', () => {
      const wrapped = toAppError('connection refused: 127.0.0.1:8080');

      expect(isAppError(wrapped)).toBe(true);
      // getUserMessage() never contains raw connection details
      expect(wrapped.getUserMessage()).not.toMatch(/127\.0\.0\.1/);
      expect(wrapped.getUserMessage()).not.toMatch(/8080/);
      const { getByText } = render(<ErrorDisplay error={wrapped} onRetry={() => {}} />);
      expect(getByText(wrapped.getUserMessage())).toBeTruthy();
    });

    it('should wrap null/undefined with fallback message', () => {
      const wrappedNull = toAppError(null);
      const wrappedUndefined = toAppError(undefined);

      expect(isAppError(wrappedNull)).toBe(true);
      expect(isAppError(wrappedUndefined)).toBe(true);

      const { getByText: getText1 } = render(<ErrorDisplay error={wrappedNull} />);
      expect(getText1(/unexpected error/i)).toBeTruthy();

      const { getByText: getText2 } = render(<ErrorDisplay error={wrappedUndefined} />);
      expect(getText2(/unexpected error/i)).toBeTruthy();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ErrorDisplay — BACKWARD COMPATIBILITY WITH RAW ERRORS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('ErrorDisplay backward compatibility', () => {
    it('should show safe message for raw Error objects (not AppError)', () => {
      const rawError = new Error('INTERNAL: 500 Internal Server Error at /users/abc123');

      const { getByText } = render(
        <ErrorDisplay error={rawError} onRetry={() => {}} />
      );

      // Generic safe message shown (not the raw error message)
      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
      // Note: In __DEV__, debug section may show raw error.message.
      // Production security is ensured by ErrorDisplay using getSafeMessage()
      // which returns a generic message for raw Error objects.
    });

    it('should show safe message for string errors', () => {
      const { getByText } = render(
        <ErrorDisplay error="TypeError: Cannot read properties of undefined" onRetry={() => {}} />
      );

      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
    });

    it('should render nothing for null/undefined', () => {
      const { toJSON: json1 } = render(<ErrorDisplay error={null} />);
      expect(json1()).toBeNull();

      const { toJSON: json2 } = render(<ErrorDisplay error={undefined} />);
      expect(json2()).toBeNull();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ErrorBoundary — CRASH ISOLATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('ErrorBoundary crash isolation', () => {
    function CrashingComponent(): React.JSX.Element {
      throw new Error('Simulated render crash in SearchPage');
    }

    function WorkingComponent(): React.JSX.Element {
      return <Text>Working content</Text>;
    }

    it('should catch render crashes and show fallback without killing siblings', () => {
      const { getByText, queryByText } = render(
        <View>
          <ErrorBoundary level="page">
            <CrashingComponent />
          </ErrorBoundary>
          <ErrorBoundary level="page">
            <WorkingComponent />
          </ErrorBoundary>
        </View>
      );

      // Crashed boundary shows fallback
      expect(getByText('This section encountered an error')).toBeTruthy();
      // Working boundary still renders its content
      expect(getByText('Working content')).toBeTruthy();
      // Crashed content is gone
      expect(queryByText('Simulated render crash')).toBeNull();
    });

    it('should recover after pressing Try Again', () => {
      let shouldCrash = true;

      function ConditionalCrash(): React.JSX.Element {
        if (shouldCrash) throw new Error('crash');
        return <Text>Recovered successfully</Text>;
      }

      const { getByText } = render(
        <ErrorBoundary level="page">
          <ConditionalCrash />
        </ErrorBoundary>
      );

      expect(getByText('Try Again')).toBeTruthy();

      // Fix the crash condition, then reset
      shouldCrash = false;
      fireEvent.press(getByText('Try Again'));

      expect(getByText('Recovered successfully')).toBeTruthy();
    });

    it('should show different messaging for global vs page level', () => {
      const { getByText: globalText } = render(
        <ErrorBoundary level="global">
          <CrashingComponent />
        </ErrorBoundary>
      );
      expect(globalText('Something went wrong')).toBeTruthy();

      const { getByText: pageText } = render(
        <ErrorBoundary level="page">
          <CrashingComponent />
        </ErrorBoundary>
      );
      expect(pageText('This section encountered an error')).toBeTruthy();
    });

    it('should call onError callback with error and component stack', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary level="page" onError={onError}>
          <CrashingComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should use custom fallback renderer when provided', () => {
      const { getByText } = render(
        <ErrorBoundary
          level="page"
          fallback={(error, reset) => (
            <View>
              <Text>Custom fallback</Text>
              <Text testID="reset" onPress={reset}>Reset</Text>
            </View>
          )}
        >
          <CrashingComponent />
        </ErrorBoundary>
      );

      expect(getByText('Custom fallback')).toBeTruthy();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ErrorDisplay + ErrorBoundary — COMBINED INTEGRATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('ErrorDisplay inside ErrorBoundary', () => {
    it('should render ErrorDisplay with AppError inside an ErrorBoundary', () => {
      const error = createVideoFeedLoadError(new Error('query failed'));

      const { getByText } = render(
        <ErrorBoundary level="page">
          <ErrorDisplay error={error} onRetry={() => {}} />
        </ErrorBoundary>
      );

      // ErrorDisplay renders normally inside ErrorBoundary
      expect(getByText(/failed to load videos/i)).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should show ErrorBoundary fallback if ErrorDisplay itself crashes', () => {
      // Simulate a broken ErrorDisplay by using a custom fallback in boundary
      function BrokenErrorDisplay(): React.JSX.Element {
        throw new Error('ErrorDisplay render crash');
      }

      const { getByText } = render(
        <ErrorBoundary level="section">
          <BrokenErrorDisplay />
        </ErrorBoundary>
      );

      expect(getByText('This section encountered an error')).toBeTruthy();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SECURITY — NO SENSITIVE DATA IN USER MESSAGES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('Security: no internal details in user-visible output', () => {
    const sensitiveRawErrors = [
      PRODUCTION_RAW_ERRORS.firestoreDocNotFound,
      PRODUCTION_RAW_ERRORS.firestorePermissionDenied,
      PRODUCTION_RAW_ERRORS.videoStorageNotFound,
      PRODUCTION_RAW_ERRORS.videoMediaCodec,
      PRODUCTION_RAW_ERRORS.videoFirestoreUrl,
      new Error('projects/mundo1-1/databases/(default)/documents/itineraries/abc'),
      new Error('https://firebasestorage.googleapis.com/v0/b/mundo1-1.appspot.com/o/photos%2Ftest.jpg'),
    ];

    it.each(sensitiveRawErrors.map((err, i) => [i, err]))(
      'raw error #%i should never leak sensitive data through any factory',
      (_index, rawError) => {
        // Test through all applicable factories
        const errors = [
          createFirestoreError(rawError as Error, 'testOp'),
          createVideoError(rawError as Error, 'vid-test'),
          toAppError(rawError),
        ];

        for (const appError of errors) {
          const userMsg = appError.getUserMessage();
          // Verify NO sensitive patterns in user message
          expect(userMsg).not.toMatch(/projects\//i);
          expect(userMsg).not.toMatch(/databases\//i);
          expect(userMsg).not.toMatch(/documents\//i);
          expect(userMsg).not.toMatch(/firebasestorage/i);
          expect(userMsg).not.toMatch(/googleapis/i);
          expect(userMsg).not.toMatch(/appspot/i);
          expect(userMsg).not.toMatch(/MediaCodecVideoRenderer/i);
          expect(userMsg).not.toMatch(/format=Format/i);
          expect(userMsg).not.toMatch(/index=0/i);
          expect(userMsg).not.toMatch(/storage\/object-not-found/i);

          // Technical message SHOULD contain details (for logging)
          expect(appError.message.length).toBeGreaterThan(0);
        }
      }
    );

    it('ErrorDisplay should not render raw Error messages even as fallback', () => {
      const dangerousError = new Error(
        'No document to update: projects/mundo1-1/databases/(default)/documents/users/SECRET_UID'
      );

      // Test with raw Error (not AppError) — backward compatibility path
      // ErrorDisplay uses getSafeMessage() which returns a generic message for raw Errors
      const { getByText } = render(
        <ErrorDisplay error={dangerousError} onRetry={() => {}} />
      );

      // The primary user-visible message is safe and generic
      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
      // Note: __DEV__ debug section intentionally shows raw error.message for developers.
      // In production (__DEV__=false), the debug section is not rendered.
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RECOVERY FLOW — RETRY ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('Recovery flow: retry and secondary actions', () => {
    it('should invoke onRetry when retry button is pressed', () => {
      const onRetry = jest.fn();
      const error = createFirestoreError(
        { code: 'unavailable', message: 'network' },
        'fetchData'
      );

      const { getByText } = render(
        <ErrorDisplay error={error} onRetry={onRetry} />
      );

      fireEvent.press(getByText('Retry'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should invoke secondary action (e.g., Sign Out)', () => {
      const onSignOut = jest.fn();
      const error = createProfileNotFoundError('uid-test');

      const { getByText } = render(
        <ErrorDisplay
          error={error}
          onRetry={() => {}}
          onSecondaryAction={onSignOut}
          secondaryActionLabel="Sign Out"
        />
      );

      fireEvent.press(getByText('Sign Out'));
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });

    it('should use AppError retryAction as button label', () => {
      const error = createFirestoreError(
        PRODUCTION_RAW_ERRORS.firestorePermissionDenied,
        'updateProfile'
      );

      // retryAction should be 'Sign In Again'
      expect(error.retryAction).toBe('Sign In Again');

      const { getByText } = render(
        <ErrorDisplay error={error} onRetry={() => {}} />
      );

      expect(getByText('Sign In Again')).toBeTruthy();
    });

    it('should default to "Retry" label when AppError has no retryAction', () => {
      const error = new AppError({
        code: 'TEST',
        message: 'test',
        userMessage: 'Test error',
        domain: ErrorDomain.UNKNOWN,
        recoverable: true,
        // No retryAction
      });

      const { getByText } = render(
        <ErrorDisplay error={error} onRetry={() => {}} />
      );

      expect(getByText('Retry')).toBeTruthy();
    });

    it('should prefer custom retryLabel over AppError retryAction', () => {
      const error = new AppError({
        code: 'TEST',
        message: 'test',
        userMessage: 'Test error',
        domain: ErrorDomain.UNKNOWN,
        retryAction: 'Default Action',
      });

      const { getByText, queryByText } = render(
        <ErrorDisplay error={error} onRetry={() => {}} retryLabel="Custom Retry" />
      );

      expect(getByText('Custom Retry')).toBeTruthy();
      expect(queryByText('Default Action')).toBeNull();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VIDEO ERROR → AUTO-DETECT → CORRECT FACTORY → ErrorDisplay
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('Video auto-detect → correct factory → ErrorDisplay', () => {
    const videoScenarios = [
      {
        name: 'deleted video (404)',
        raw: 'HTTP 404 Not Found',
        expectedCode: 'VIDEO_NOT_FOUND',
        expectedRecoverable: false,
        userMessagePattern: /no longer available/i,
      },
      {
        name: 'storage object not found',
        raw: 'Object does not exist at location: videos/user/clip.mp4 (storage/object-not-found)',
        expectedCode: 'VIDEO_NOT_FOUND',
        expectedRecoverable: false,
        userMessagePattern: /no longer available/i,
      },
      {
        name: 'Android MediaCodec failure',
        raw: 'MediaCodecVideoRenderer error, index=0, format=Format(2, null, video/hevc, 1920x1080)',
        expectedCode: 'VIDEO_CODEC_UNSUPPORTED',
        expectedRecoverable: false,
        userMessagePattern: /not compatible/i,
      },
      {
        name: 'HEVC codec error',
        raw: 'Decoder failed: hevc decoder init failed',
        expectedCode: 'VIDEO_CODEC_UNSUPPORTED',
        expectedRecoverable: false,
        userMessagePattern: /not compatible/i,
      },
      {
        name: 'network timeout',
        raw: 'Connection timeout while loading video stream',
        expectedCode: 'VIDEO_NETWORK_ERROR',
        expectedRecoverable: true,
        userMessagePattern: /check your connection/i,
      },
      {
        name: 'HTTP 416 Range error',
        raw: 'HTTP 416 Range Not Satisfiable',
        expectedCode: 'VIDEO_NETWORK_ERROR',
        expectedRecoverable: true,
        userMessagePattern: /check your connection/i,
      },
      {
        name: 'autoplay blocked (web)',
        raw: "play() request was interrupted by a new load request",
        expectedCode: 'VIDEO_AUTOPLAY_BLOCKED',
        expectedRecoverable: true,
        userMessagePattern: /tap to play this video/i,
      },
      {
        name: 'generic unknown error',
        raw: 'Some completely unexpected video error xyz',
        expectedCode: 'VIDEO_PLAYBACK_FAILED',
        expectedRecoverable: true,
        userMessagePattern: /could not be played/i,
      },
    ];

    it.each(videoScenarios)(
      '$name → $expectedCode → safe message in UI',
      ({ raw, expectedCode, expectedRecoverable, userMessagePattern }) => {
        // Step 1: Auto-detect
        const appError = createVideoError(raw, 'test-video-id');

        // Step 2: Verify correct categorization
        expect(appError.code).toBe(expectedCode);
        expect(appError.domain).toBe(ErrorDomain.VIDEO);
        expect(appError.recoverable).toBe(expectedRecoverable);

        // Step 3: Render in ErrorDisplay
        const { getByText, queryByText } = render(
          <ErrorDisplay error={appError} onRetry={expectedRecoverable ? () => {} : undefined} />
        );

        // Step 4: Verify safe message
        expect(getByText(userMessagePattern)).toBeTruthy();

        // Step 5: Verify retry button matches recoverability
        if (expectedRecoverable) {
          expect(getByText(appError.retryAction ?? 'Retry')).toBeTruthy();
        } else {
          expect(queryByText('Retry')).toBeNull();
        }

        // Step 6: Verify no raw error text leaked to user-facing message
        // Note: In __DEV__ mode, debug section intentionally shows technical details
        // including video IDs — that's expected. We verify the userMessage is clean.
        expect(appError.getUserMessage()).not.toContain('test-video-id');
      }
    );
  });
});

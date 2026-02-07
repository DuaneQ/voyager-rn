/**
 * Video Error Factory
 * 
 * Translates raw video playback errors into AppError instances with safe user messages.
 * This is the ONLY place that should understand raw video/player error shapes.
 * 
 * Handles:
 *   - Deleted/removed videos (Firebase Storage 404, missing resource)
 *   - Codec incompatibility (MediaCodec errors on Android, HEVC on older devices)
 *   - Network failures (timeout, offline, HTTP range errors)
 *   - Playback failures (generic player errors)
 *   - Video load failures (Firestore query failures)
 * 
 * Following S.O.L.I.D.:
 *   - Single Responsibility: Only translates video errors
 *   - Open/Closed: New video error types added here without modifying consumers
 *   - Dependency Inversion: Components depend on AppError, not raw player errors
 */

import { AppError, ErrorDomain, ErrorSeverity } from '../AppError';

/**
 * Detect the kind of video error from a raw error string or Error object.
 * Returns an AppError with a safe user-facing message.
 * 
 * @param rawError - The raw error from the video player, Firestore, or network layer
 * @param videoId - The video document ID (for logging context, never shown to users)
 * @param context - Optional additional context for debugging
 */
export function createVideoError(
  rawError: unknown,
  videoId?: string,
  context?: Record<string, unknown>
): AppError {
  const message = extractMessage(rawError);
  const lowerMessage = message.toLowerCase();

  // --- Deleted / Not Found ---
  if (
    lowerMessage.includes('not found') ||
    lowerMessage.includes('404') ||
    lowerMessage.includes('does not exist') ||
    lowerMessage.includes('no such file') ||
    lowerMessage.includes('object does not exist') ||
    lowerMessage.includes('storage/object-not-found')
  ) {
    return createVideoNotFoundError(rawError, videoId, context);
  }

  // --- Codec / Format Incompatibility ---
  if (
    lowerMessage.includes('mediacodec') ||
    lowerMessage.includes('not supported') ||
    lowerMessage.includes('decoder failed') ||
    lowerMessage.includes('hevc') ||
    lowerMessage.includes('codec') ||
    lowerMessage.includes('unsupported format') ||
    lowerMessage.includes('format not supported') ||
    lowerMessage.includes('mediacodevideorenderer')
  ) {
    return createVideoCodecError(rawError, videoId, context);
  }

  // --- Network / Connectivity ---
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('offline') ||
    lowerMessage.includes('range not satisfiable') ||
    lowerMessage.includes('416') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('load failed')
  ) {
    return createVideoNetworkError(rawError, videoId, context);
  }

  // --- Autoplay Blocked (Web) ---
  if (
    lowerMessage.includes('autoplay') ||
    lowerMessage.includes('play() request was interrupted') ||
    lowerMessage.includes('user didn\'t interact')
  ) {
    return createVideoAutoplayBlockedError(rawError, videoId, context);
  }

  // --- Generic Playback Error ---
  return createVideoPlaybackError(rawError, videoId, context);
}

/**
 * Video was deleted or removed (e.g., deleted from web, Firebase Storage 404).
 */
export function createVideoNotFoundError(
  rawError?: unknown,
  videoId?: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: 'VIDEO_NOT_FOUND',
    message: `Video not found${videoId ? `: ${videoId}` : ''}: ${extractMessage(rawError)}`,
    userMessage: 'This video is no longer available. It may have been removed.',
    severity: ErrorSeverity.WARNING,
    domain: ErrorDomain.VIDEO,
    recoverable: false, // Can't retry a deleted video
    originalError: rawError,
    context: { ...context, videoId },
  });
}

/**
 * Video codec/format is not supported on this device.
 */
export function createVideoCodecError(
  rawError?: unknown,
  videoId?: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: 'VIDEO_CODEC_UNSUPPORTED',
    message: `Video format not supported${videoId ? ` for ${videoId}` : ''}: ${extractMessage(rawError)}`,
    userMessage: 'This video format is not compatible with your device.',
    severity: ErrorSeverity.WARNING,
    domain: ErrorDomain.VIDEO,
    recoverable: false, // Retrying won't fix codec support
    originalError: rawError,
    context: { ...context, videoId },
  });
}

/**
 * Network error while loading or streaming video.
 */
export function createVideoNetworkError(
  rawError?: unknown,
  videoId?: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: 'VIDEO_NETWORK_ERROR',
    message: `Network error loading video${videoId ? ` ${videoId}` : ''}: ${extractMessage(rawError)}`,
    userMessage: 'Could not load this video. Please check your connection and try again.',
    severity: ErrorSeverity.WARNING,
    domain: ErrorDomain.VIDEO,
    recoverable: true,
    retryAction: 'Retry',
    originalError: rawError,
    context: { ...context, videoId },
  });
}

/**
 * Browser autoplay policy blocked video playback (web only).
 */
export function createVideoAutoplayBlockedError(
  rawError?: unknown,
  videoId?: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: 'VIDEO_AUTOPLAY_BLOCKED',
    message: `Autoplay blocked${videoId ? ` for ${videoId}` : ''}: ${extractMessage(rawError)}`,
    userMessage: 'Tap to play this video.',
    severity: ErrorSeverity.INFO,
    domain: ErrorDomain.VIDEO,
    recoverable: true,
    retryAction: 'Tap to Play',
    originalError: rawError,
    context: { ...context, videoId },
  });
}

/**
 * Generic video playback error (couldn't play, unknown reason).
 */
export function createVideoPlaybackError(
  rawError?: unknown,
  videoId?: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: 'VIDEO_PLAYBACK_FAILED',
    message: `Video playback failed${videoId ? ` for ${videoId}` : ''}: ${extractMessage(rawError)}`,
    userMessage: 'This video could not be played. Please try again later.',
    severity: ErrorSeverity.ERROR,
    domain: ErrorDomain.VIDEO,
    recoverable: true,
    retryAction: 'Retry',
    originalError: rawError,
    context: { ...context, videoId },
  });
}

/**
 * Failed to load video feed from Firestore.
 */
export function createVideoFeedLoadError(
  rawError?: unknown,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: 'VIDEO_FEED_LOAD_FAILED',
    message: `Failed to load video feed: ${extractMessage(rawError)}`,
    userMessage: 'Failed to load videos. Please check your connection and try again.',
    severity: ErrorSeverity.ERROR,
    domain: ErrorDomain.VIDEO,
    recoverable: true,
    retryAction: 'Retry',
    originalError: rawError,
    context,
  });
}

/**
 * Failed to perform a video interaction (like, view track, etc.)
 */
export function createVideoInteractionError(
  rawError: unknown,
  action: string,
  videoId?: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: 'VIDEO_INTERACTION_FAILED',
    message: `Video ${action} failed${videoId ? ` for ${videoId}` : ''}: ${extractMessage(rawError)}`,
    userMessage: `Could not ${action} this video. Please try again.`,
    severity: ErrorSeverity.WARNING,
    domain: ErrorDomain.VIDEO,
    recoverable: true,
    retryAction: 'Retry',
    originalError: rawError,
    context: { ...context, videoId, action },
  });
}

// --- Internal helpers ---

/**
 * Extract a string message from any error type.
 */
function extractMessage(rawError: unknown): string {
  if (!rawError) return 'Unknown error';
  if (rawError instanceof Error) return rawError.message;
  if (typeof rawError === 'string') return rawError;
  return String(rawError);
}

/**
 * Unit tests for Video Error Factory
 * Tests all video-specific error translation and safe user messages
 */

import { AppError, ErrorDomain, ErrorSeverity } from '../../../errors/AppError';
import {
  createVideoError,
  createVideoNotFoundError,
  createVideoCodecError,
  createVideoNetworkError,
  createVideoAutoplayBlockedError,
  createVideoPlaybackError,
  createVideoFeedLoadError,
  createVideoInteractionError,
} from '../../../errors/factories/videoErrors';

describe('videoErrors factory', () => {
  describe('createVideoError (auto-detect)', () => {
    it('should detect deleted/not-found video errors', () => {
      const error = createVideoError('Object does not exist at location', 'video-123');
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VIDEO_NOT_FOUND');
      expect(error.domain).toBe(ErrorDomain.VIDEO);
      expect(error.recoverable).toBe(false);
      expect(error.getUserMessage()).toBe('This video is no longer available. It may have been removed.');
      // Must NOT contain the video ID in user message
      expect(error.getUserMessage()).not.toContain('video-123');
    });

    it('should detect 404 errors', () => {
      const error = createVideoError('HTTP 404 Not Found', 'video-456');
      expect(error.code).toBe('VIDEO_NOT_FOUND');
    });

    it('should detect storage/object-not-found errors', () => {
      const error = createVideoError(new Error('storage/object-not-found'), 'vid-1');
      expect(error.code).toBe('VIDEO_NOT_FOUND');
    });

    it('should detect MediaCodec errors (Android)', () => {
      const error = createVideoError(
        'A playback exception has occurred: MediaCodecVideoRenderer error, index=0, format=Format(2, null)',
        'video-789'
      );
      expect(error.code).toBe('VIDEO_CODEC_UNSUPPORTED');
      expect(error.getUserMessage()).toBe('This video format is not compatible with your device.');
      expect(error.recoverable).toBe(false);
    });

    it('should detect "not supported" format errors', () => {
      const error = createVideoError('Video format not supported by this device (video/hevc)', 'v1');
      expect(error.code).toBe('VIDEO_CODEC_UNSUPPORTED');
    });

    it('should detect HEVC codec errors', () => {
      const error = createVideoError('Decoder failed: hevc decoder init failed', 'v2');
      expect(error.code).toBe('VIDEO_CODEC_UNSUPPORTED');
    });

    it('should detect network timeout errors', () => {
      const error = createVideoError('Connection timeout while loading video');
      expect(error.code).toBe('VIDEO_NETWORK_ERROR');
      expect(error.getUserMessage()).toBe('Could not load this video. Please check your connection and try again.');
      expect(error.recoverable).toBe(true);
    });

    it('should detect HTTP 416 Range Not Satisfiable errors', () => {
      const error = createVideoError('Range Not Satisfiable 416');
      expect(error.code).toBe('VIDEO_NETWORK_ERROR');
    });

    it('should detect autoplay blocked errors (web)', () => {
      const error = createVideoError("play() request was interrupted by a new load request");
      expect(error.code).toBe('VIDEO_AUTOPLAY_BLOCKED');
      expect(error.severity).toBe(ErrorSeverity.INFO);
      expect(error.getUserMessage()).toBe('Tap to play this video.');
    });

    it('should fall back to generic playback error for unknown errors', () => {
      const error = createVideoError('Something completely unexpected happened', 'v3');
      expect(error.code).toBe('VIDEO_PLAYBACK_FAILED');
      expect(error.getUserMessage()).toBe('This video could not be played. Please try again later.');
      expect(error.recoverable).toBe(true);
    });

    it('should handle Error objects', () => {
      const error = createVideoError(new Error('Object does not exist'));
      expect(error.code).toBe('VIDEO_NOT_FOUND');
    });

    it('should handle null/undefined errors', () => {
      const error = createVideoError(null);
      expect(error.code).toBe('VIDEO_PLAYBACK_FAILED');
      expect(error).toBeInstanceOf(AppError);
    });

    it('should include videoId in context but not in userMessage', () => {
      const error = createVideoError('Some error', 'abc-secret-id');
      expect(error.context?.videoId).toBe('abc-secret-id');
      expect(error.getUserMessage()).not.toContain('abc-secret-id');
    });

    it('should include additional context', () => {
      const error = createVideoError('Error', 'v1', { platform: 'android', videoUrl: 'https://example.com/video.mp4' });
      expect(error.context?.platform).toBe('android');
      expect(error.context?.videoUrl).toBe('https://example.com/video.mp4');
    });
  });

  describe('createVideoNotFoundError', () => {
    it('should create a VIDEO_NOT_FOUND error', () => {
      const error = createVideoNotFoundError(new Error('not found'), 'v1');
      expect(error.code).toBe('VIDEO_NOT_FOUND');
      expect(error.domain).toBe(ErrorDomain.VIDEO);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.recoverable).toBe(false);
    });

    it('should work without rawError', () => {
      const error = createVideoNotFoundError();
      expect(error.code).toBe('VIDEO_NOT_FOUND');
    });
  });

  describe('createVideoCodecError', () => {
    it('should create a VIDEO_CODEC_UNSUPPORTED error', () => {
      const error = createVideoCodecError(new Error('MediaCodec failed'), 'v2');
      expect(error.code).toBe('VIDEO_CODEC_UNSUPPORTED');
      expect(error.recoverable).toBe(false);
    });
  });

  describe('createVideoNetworkError', () => {
    it('should create a recoverable VIDEO_NETWORK_ERROR', () => {
      const error = createVideoNetworkError(new Error('timeout'), 'v3');
      expect(error.code).toBe('VIDEO_NETWORK_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.retryAction).toBe('Retry');
    });
  });

  describe('createVideoAutoplayBlockedError', () => {
    it('should create an INFO-level autoplay blocked error', () => {
      const error = createVideoAutoplayBlockedError();
      expect(error.code).toBe('VIDEO_AUTOPLAY_BLOCKED');
      expect(error.severity).toBe(ErrorSeverity.INFO);
      expect(error.recoverable).toBe(true);
    });
  });

  describe('createVideoPlaybackError', () => {
    it('should create a recoverable playback error', () => {
      const error = createVideoPlaybackError(new Error('unknown'), 'v4');
      expect(error.code).toBe('VIDEO_PLAYBACK_FAILED');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('createVideoFeedLoadError', () => {
    it('should create a feed load error', () => {
      const error = createVideoFeedLoadError(new Error('Firestore query failed'));
      expect(error.code).toBe('VIDEO_FEED_LOAD_FAILED');
      expect(error.domain).toBe(ErrorDomain.VIDEO);
      expect(error.getUserMessage()).toBe('Failed to load videos. Please check your connection and try again.');
      expect(error.recoverable).toBe(true);
    });

    it('should include context', () => {
      const error = createVideoFeedLoadError(new Error('fail'), { filter: 'liked' });
      expect(error.context?.filter).toBe('liked');
    });
  });

  describe('createVideoInteractionError', () => {
    it('should create a video interaction error with action in message', () => {
      const error = createVideoInteractionError(new Error('permission denied'), 'like', 'v5');
      expect(error.code).toBe('VIDEO_INTERACTION_FAILED');
      expect(error.getUserMessage()).toBe('Could not like this video. Please try again.');
      expect(error.context?.action).toBe('like');
      expect(error.context?.videoId).toBe('v5');
    });
  });

  describe('Safe user messages (security)', () => {
    it('should never expose Firestore paths in user messages', () => {
      const firestorePath = 'projects/mundo1-1/databases/(default)/documents/videos/BwYMglU1PCdkHeUCbXL9HFL2yuj1';
      const error = createVideoError(`No document to update: ${firestorePath}`);
      expect(error.getUserMessage()).not.toContain('projects/');
      expect(error.getUserMessage()).not.toContain('databases/');
      expect(error.getUserMessage()).not.toContain('mundo1');
    });

    it('should never expose raw error details in user messages', () => {
      const rawError = 'MediaCodecVideoRenderer error, index=0, format=Format(2, null, video/hevc, 1920x1080, -1.0, null, -1, -1, 0, 1';
      const error = createVideoError(rawError);
      expect(error.getUserMessage()).not.toContain('MediaCodecVideoRenderer');
      expect(error.getUserMessage()).not.toContain('index=0');
      expect(error.getUserMessage()).not.toContain('format=Format');
    });

    it('should never expose video URLs in user messages', () => {
      const error = createVideoError(
        'Failed to load https://firebasestorage.googleapis.com/v0/b/mundo1-1.appspot.com/o/videos%2Ftest.mp4',
        'v1'
      );
      expect(error.getUserMessage()).not.toContain('firebasestorage');
      expect(error.getUserMessage()).not.toContain('googleapis');
      expect(error.getUserMessage()).not.toContain('.mp4');
    });
  });
});

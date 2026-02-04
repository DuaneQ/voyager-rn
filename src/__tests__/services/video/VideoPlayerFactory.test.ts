/**
 * Unit tests for VideoPlayerFactory
 * Tests factory creation with different configurations and platforms
 */

import { VideoPlayerFactory } from '../../../services/video/VideoPlayerFactory';
import { ExpoVideoPlayer } from '../../../services/video/ExpoVideoPlayer';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('../../../services/video/ExpoVideoPlayer');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}));

describe('VideoPlayerFactory', () => {
  const testVideoUrl = 'https://test.com/video.mp4';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS for each test
    (Platform as any).OS = 'ios';
  });

  describe('Default Configuration', () => {
    it('should create ExpoVideoPlayer by default', () => {
      const factory = new VideoPlayerFactory();
      const player = factory.createPlayer({ videoUrl: testVideoUrl });

      expect(ExpoVideoPlayer).toHaveBeenCalledWith({ videoUrl: testVideoUrl });
      expect(player).toBeInstanceOf(ExpoVideoPlayer);
    });

    it('should use default feature flags', () => {
      const factory = new VideoPlayerFactory();
      const player = factory.createPlayer({ videoUrl: testVideoUrl });

      // Default flags should enable expo-video
      expect(ExpoVideoPlayer).toHaveBeenCalledWith({ videoUrl: testVideoUrl });
    });
  });

  describe('Feature Flag Configuration', () => {
    it('should respect useExpoVideo flag when true', () => {
      const factory = new VideoPlayerFactory({
        useExpoVideo: true,
      });
      const player = factory.createPlayer({ videoUrl: testVideoUrl });

      expect(ExpoVideoPlayer).toHaveBeenCalledWith({ videoUrl: testVideoUrl });
    });

    it('should throw when useExpoVideo flag is false (no legacy fallback)', () => {
      const factory = new VideoPlayerFactory({
        useExpoVideo: false,
      });

      expect(() => factory.createPlayer({ videoUrl: testVideoUrl })).toThrow();
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should create player on iOS', () => {
      (Platform as any).OS = 'ios';
      const factory = new VideoPlayerFactory();
      const player = factory.createPlayer({ videoUrl: testVideoUrl });

      expect(ExpoVideoPlayer).toHaveBeenCalledWith({ videoUrl: testVideoUrl });
    });

    it('should create player on Android', () => {
      (Platform as any).OS = 'android';
      const factory = new VideoPlayerFactory();
      const player = factory.createPlayer({ videoUrl: testVideoUrl });

      expect(ExpoVideoPlayer).toHaveBeenCalledWith({ videoUrl: testVideoUrl });
    });

    it('should create player on Web', () => {
      (Platform as any).OS = 'web';
      const factory = new VideoPlayerFactory();
      const player = factory.createPlayer({ videoUrl: testVideoUrl });

      expect(ExpoVideoPlayer).toHaveBeenCalledWith({ videoUrl: testVideoUrl });
    });
  });

  describe('Multiple Player Creation', () => {
    it('should create multiple independent players', () => {
      const factory = new VideoPlayerFactory();
      const player1 = factory.createPlayer({ videoUrl: 'https://test.com/video1.mp4' });
      const player2 = factory.createPlayer({ videoUrl: 'https://test.com/video2.mp4' });

      expect(ExpoVideoPlayer).toHaveBeenCalledTimes(2);
      expect(ExpoVideoPlayer).toHaveBeenNthCalledWith(1, { videoUrl: 'https://test.com/video1.mp4' });
      expect(ExpoVideoPlayer).toHaveBeenNthCalledWith(2, { videoUrl: 'https://test.com/video2.mp4' });
    });

    it('should allow different factories with different configs', () => {
      const factory1 = new VideoPlayerFactory({ useExpoVideo: true });
      const factory2 = new VideoPlayerFactory({ useExpoVideo: false });

      expect(() => factory1.createPlayer({ videoUrl: testVideoUrl })).not.toThrow();
      expect(() => factory2.createPlayer({ videoUrl: testVideoUrl })).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty video URL', () => {
      const factory = new VideoPlayerFactory();
      const player = factory.createPlayer({ videoUrl: '' });

      expect(ExpoVideoPlayer).toHaveBeenCalledWith({ videoUrl: '' });
    });

    it('should handle very long URLs', () => {
      const longUrl = 'https://test.com/' + 'a'.repeat(1000) + '.mp4';
      const factory = new VideoPlayerFactory();
      const player = factory.createPlayer({ videoUrl: longUrl });

      expect(ExpoVideoPlayer).toHaveBeenCalledWith({ videoUrl: longUrl });
    });

    it('should handle special characters in URL', () => {
      const specialUrl = 'https://test.com/video%20with%20spaces.mp4?token=abc123&expires=2026';
      const factory = new VideoPlayerFactory();
      const player = factory.createPlayer({ videoUrl: specialUrl });

      expect(ExpoVideoPlayer).toHaveBeenCalledWith({ videoUrl: specialUrl });
    });
  });

  describe('Factory Reusability', () => {
    it('should allow same factory to create multiple players', () => {
      const factory = new VideoPlayerFactory();
      
      factory.createPlayer({ videoUrl: 'video1.mp4' });
      factory.createPlayer({ videoUrl: 'video2.mp4' });
      factory.createPlayer({ videoUrl: 'video3.mp4' });

      expect(ExpoVideoPlayer).toHaveBeenCalledTimes(3);
    });

    it('should maintain configuration across multiple creates', () => {
      const factory = new VideoPlayerFactory({
        useExpoVideo: true,
      });
      
      factory.createPlayer({ videoUrl: 'video1.mp4' });
      factory.createPlayer({ videoUrl: 'video2.mp4' });

      // Both should use ExpoVideoPlayer
      expect(ExpoVideoPlayer).toHaveBeenCalledTimes(2);
    });
  });

  describe('Interface Compliance', () => {
    it('should return object implementing IVideoPlayer interface', () => {
      const factory = new VideoPlayerFactory();
      const player = factory.createPlayer({ videoUrl: testVideoUrl });

      // Verify interface methods exist (mocked implementation)
      expect(player).toHaveProperty('play');
      expect(player).toHaveProperty('pause');
      expect(player).toHaveProperty('stop');
      expect(player).toHaveProperty('seek');
      expect(player).toHaveProperty('setMuted');
      // New API exposes status via listeners rather than getStatus
      expect(player).toHaveProperty('addStatusListener');
      expect(player).toHaveProperty('getPlayer');
      expect(player).toHaveProperty('release');
    });
  });
});

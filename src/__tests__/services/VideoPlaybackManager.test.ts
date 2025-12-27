/**
 * Unit tests for VideoPlaybackManager
 * Ensures single-player guarantee, proper lifecycle management, and Android unload behavior
 */

import { Platform } from 'react-native';
import { VideoPlaybackManager, VideoPlaybackRegistration } from '../../services/video/VideoPlaybackManager';

// Mock Platform.OS
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
}));

describe('VideoPlaybackManager', () => {
  let manager: VideoPlaybackManager;
  let mockOnActiveVideoChanged: jest.Mock;
  let mockOnPlayerUnloaded: jest.Mock;
  let mockOnPlayerLoaded: jest.Mock;

  beforeEach(() => {
    mockOnActiveVideoChanged = jest.fn();
    mockOnPlayerUnloaded = jest.fn();
    mockOnPlayerLoaded = jest.fn();

    manager = new VideoPlaybackManager({
      onActiveVideoChanged: mockOnActiveVideoChanged,
      onPlayerUnloaded: mockOnPlayerUnloaded,
      onPlayerLoaded: mockOnPlayerLoaded,
    });
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe('Registration', () => {
    it('should register a video player', () => {
      const mockRegistration: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn(),
        onBecomeInactive: jest.fn(),
      };

      manager.register(mockRegistration);

      expect(manager.getRegistrationCount()).toBe(1);
    });

    it('should unregister a video player', () => {
      const mockRegistration: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn(),
        onBecomeInactive: jest.fn(),
      };

      manager.register(mockRegistration);
      manager.unregister('video1');

      expect(manager.getRegistrationCount()).toBe(0);
    });

    it('should clear active video when unregistering the active video', async () => {
      const mockRegistration: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockRegistration);
      await manager.setActiveVideo('video1');

      expect(manager.getActiveVideoId()).toBe('video1');

      manager.unregister('video1');

      expect(manager.getActiveVideoId()).toBeNull();
      expect(mockOnActiveVideoChanged).toHaveBeenCalledWith(null);
    });
  });

  describe('Single-player guarantee', () => {
    it('should activate only one video at a time', async () => {
      const mockReg1: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      const mockReg2: VideoPlaybackRegistration = {
        videoId: 'video2',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg1);
      manager.register(mockReg2);

      // Activate video1
      await manager.setActiveVideo('video1');

      expect(mockReg1.onBecomeActive).toHaveBeenCalledTimes(1);
      expect(manager.getActiveVideoId()).toBe('video1');

      // Activate video2 (should deactivate video1)
      await manager.setActiveVideo('video2');

      expect(mockReg1.onBecomeInactive).toHaveBeenCalledTimes(1);
      expect(mockReg2.onBecomeActive).toHaveBeenCalledTimes(1);
      expect(manager.getActiveVideoId()).toBe('video2');
    });

    it('should not reactivate an already active video', async () => {
      const mockReg: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg);

      // Activate video1
      await manager.setActiveVideo('video1');
      expect(mockReg.onBecomeActive).toHaveBeenCalledTimes(1);

      // Try to activate again
      await manager.setActiveVideo('video1');
      expect(mockReg.onBecomeActive).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should ignore activation of unregistered video', async () => {
      await manager.setActiveVideo('nonexistent');

      expect(manager.getActiveVideoId()).toBeNull();
      expect(mockOnActiveVideoChanged).not.toHaveBeenCalled();
    });
  });

  describe('Deactivation', () => {
    it('should deactivate all videos', async () => {
      const mockReg1: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg1);
      await manager.setActiveVideo('video1');

      expect(manager.getActiveVideoId()).toBe('video1');

      await manager.deactivateAll();

      expect(mockReg1.onBecomeInactive).toHaveBeenCalledTimes(1);
      expect(manager.getActiveVideoId()).toBeNull();
      expect(mockOnActiveVideoChanged).toHaveBeenCalledWith(null);
    });

    it('should handle deactivateAll when no video is active', async () => {
      await manager.deactivateAll();

      expect(manager.getActiveVideoId()).toBeNull();
      // Should not crash
    });
  });

  describe('Android-specific unload behavior', () => {
    beforeEach(() => {
      // Mock Platform.OS to be 'android'
      (Platform as any).OS = 'android';
    });

    afterEach(() => {
      // Reset to iOS
      (Platform as any).OS = 'ios';
    });

    it('should call onPlayerUnloaded callback after deactivation', async () => {
      const mockUnload = jest.fn().mockResolvedValue(undefined);
      const mockRef = {
        unloadAsync: mockUnload,
      } as any;

      const mockReg1: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: mockRef,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      const mockReg2: VideoPlaybackRegistration = {
        videoId: 'video2',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg1);
      manager.register(mockReg2);

      // Activate video1
      await manager.setActiveVideo('video1');

      // Activate video2 (should deactivate video1)
      await manager.setActiveVideo('video2');

      // The onBecomeInactive callback is responsible for unloading
      // VideoPlaybackManager just calls the callback and fires the event
      expect(mockReg1.onBecomeInactive).toHaveBeenCalledTimes(1);
      expect(mockOnPlayerUnloaded).toHaveBeenCalledWith('video1');
    });

    it('should call onPlayerUnloaded even if onBecomeInactive succeeds', async () => {
      const mockUnload = jest.fn().mockRejectedValue(new Error('Unload failed'));
      const mockRef = {
        unloadAsync: mockUnload,
      } as any;

      const mockReg1: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: mockRef,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      const mockReg2: VideoPlaybackRegistration = {
        videoId: 'video2',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg1);
      manager.register(mockReg2);

      await manager.setActiveVideo('video1');
      await manager.setActiveVideo('video2');

      // The callback handles its own errors, manager still fires the event
      expect(mockReg1.onBecomeInactive).toHaveBeenCalled();
      expect(mockOnPlayerUnloaded).toHaveBeenCalledWith('video1');
    });
  });

  describe('Error handling', () => {
    it('should handle onBecomeActive errors gracefully', async () => {
      const mockReg: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn().mockRejectedValue(new Error('Activation failed')),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg);

      await manager.setActiveVideo('video1');

      // Should not crash and should not set active video
      expect(manager.getActiveVideoId()).toBeNull();
      expect(mockOnPlayerLoaded).not.toHaveBeenCalled();
    });

    it('should handle onBecomeInactive errors gracefully', async () => {
      const mockReg1: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockRejectedValue(new Error('Deactivation failed')),
      };

      const mockReg2: VideoPlaybackRegistration = {
        videoId: 'video2',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg1);
      manager.register(mockReg2);

      await manager.setActiveVideo('video1');
      await manager.setActiveVideo('video2');

      // Should not crash
      expect(mockReg1.onBecomeInactive).toHaveBeenCalled();
      expect(manager.getActiveVideoId()).toBe('video2');
    });
  });

  describe('Utility methods', () => {
    it('should report correct active video', async () => {
      const mockReg: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg);
      await manager.setActiveVideo('video1');

      expect(manager.isVideoActive('video1')).toBe(true);
      expect(manager.isVideoActive('video2')).toBe(false);
    });

    it('should report correct registration count', () => {
      const mockReg1: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn(),
        onBecomeInactive: jest.fn(),
      };

      const mockReg2: VideoPlaybackRegistration = {
        videoId: 'video2',
        ref: null,
        onBecomeActive: jest.fn(),
        onBecomeInactive: jest.fn(),
      };

      expect(manager.getRegistrationCount()).toBe(0);

      manager.register(mockReg1);
      expect(manager.getRegistrationCount()).toBe(1);

      manager.register(mockReg2);
      expect(manager.getRegistrationCount()).toBe(2);

      manager.unregister('video1');
      expect(manager.getRegistrationCount()).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all registrations and deactivate active video', async () => {
      const mockReg1: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      const mockReg2: VideoPlaybackRegistration = {
        videoId: 'video2',
        ref: null,
        onBecomeActive: jest.fn(),
        onBecomeInactive: jest.fn(),
      };

      manager.register(mockReg1);
      manager.register(mockReg2);
      await manager.setActiveVideo('video1');

      expect(manager.getRegistrationCount()).toBe(2);
      expect(manager.getActiveVideoId()).toBe('video1');

      manager.cleanup();

      expect(mockReg1.onBecomeInactive).toHaveBeenCalled();
      expect(manager.getRegistrationCount()).toBe(0);
      expect(manager.getActiveVideoId()).toBeNull();
    });
  });

  describe('Event callbacks', () => {
    it('should call onActiveVideoChanged when video becomes active', async () => {
      const mockReg: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg);
      await manager.setActiveVideo('video1');

      expect(mockOnActiveVideoChanged).toHaveBeenCalledWith('video1');
    });

    it('should call onPlayerLoaded when video is activated', async () => {
      const mockReg: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg);
      await manager.setActiveVideo('video1');

      expect(mockOnPlayerLoaded).toHaveBeenCalledWith('video1');
    });

    it('should call onPlayerUnloaded when video is unloaded on Android', async () => {
      (Platform as any).OS = 'android';

      const mockUnload = jest.fn().mockResolvedValue(undefined);
      const mockRef = {
        unloadAsync: mockUnload,
      } as any;

      const mockReg1: VideoPlaybackRegistration = {
        videoId: 'video1',
        ref: mockRef,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      const mockReg2: VideoPlaybackRegistration = {
        videoId: 'video2',
        ref: null,
        onBecomeActive: jest.fn().mockResolvedValue(undefined),
        onBecomeInactive: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(mockReg1);
      manager.register(mockReg2);

      await manager.setActiveVideo('video1');
      await manager.setActiveVideo('video2');

      expect(mockOnPlayerUnloaded).toHaveBeenCalledWith('video1');

      (Platform as any).OS = 'ios';
    });
  });
});

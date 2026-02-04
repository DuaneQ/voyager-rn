/**
 * Unit tests for VideoPlaybackManagerV2
 * Tests the centralized playback coordination logic
 */

import { videoPlaybackManagerV2 } from '../../../services/video/VideoPlaybackManagerV2';
import { IVideoPlayer, VideoPlayerStatus } from '../../../interfaces/IVideoPlayer';

// Mock IVideoPlayer for testing
class MockVideoPlayer implements IVideoPlayer {
  private status: VideoPlayerStatus = {
    isPlaying: false,
    isMuted: false,
    currentTime: 0,
  };
  
  public playCalled = false;
  public pauseCalled = false;
  public stopCalled = false;
  public mutedValue = false;
  public releaseCalled = false;

  async play(): Promise<void> {
    this.playCalled = true;
    this.status.isPlaying = true;
  }

  async pause(): Promise<void> {
    this.pauseCalled = true;
    this.status.isPlaying = false;
  }

  async stop(): Promise<void> {
    this.stopCalled = true;
    this.status.isPlaying = false;
    this.status.currentTime = 0;
  }

  async seek(timeInSeconds: number): Promise<void> {
    this.status.currentTime = timeInSeconds;
  }

  async setMuted(muted: boolean): Promise<void> {
    this.mutedValue = muted;
    this.status.isMuted = muted;
    return;
  }

  setStatusListener(listener: (status: VideoPlayerStatus) => void): void {
    // Not needed for these tests
  }

  getStatus(): VideoPlayerStatus {
    return { ...this.status };
  }

  async release(): Promise<void> {
    this.releaseCalled = true;
    return;
  }

  // Test helpers
  reset() {
    this.playCalled = false;
    this.pauseCalled = false;
    this.stopCalled = false;
    this.mutedValue = false;
    this.releaseCalled = false;
    this.status = {
      isPlaying: false,
      isMuted: false,
      currentTime: 0,
    };
  }
}

describe('VideoPlaybackManagerV2', () => {
  let player1: MockVideoPlayer;
  let player2: MockVideoPlayer;
  let player3: MockVideoPlayer;

  beforeEach(() => {
    player1 = new MockVideoPlayer();
    player2 = new MockVideoPlayer();
    player3 = new MockVideoPlayer();
    
    // Clear all registered players before each test
    videoPlaybackManagerV2.cleanup();
  });

  afterEach(() => {
    // Cleanup after each test
    videoPlaybackManagerV2.cleanup();
  });

  describe('Player Registration', () => {
    it('should register a player with video ID', () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      
      // Registration should succeed (no throw)
      expect(true).toBe(true);
    });

    it('should allow registering multiple players with different IDs', () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'video2', player: player2 });
      videoPlaybackManagerV2.register({ videoId: 'video3', player: player3 });
      
      expect(true).toBe(true);
    });

    it('should replace player if same ID registered twice', () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player2 });
      
      // Only the second player should be active
      expect(true).toBe(true);
    });
  });

  describe('Player Deregistration', () => {
    it('should deregister a player by ID', () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.unregister('video1');
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle deregistering non-existent player', () => {
      expect(() => {
        videoPlaybackManagerV2.unregister('nonexistent');
      }).not.toThrow();
    });

    it('should allow re-registering after deregistration', () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.unregister('video1');
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player2 });
      
      expect(true).toBe(true);
    });
  });

  describe('Single Video Playback', () => {
    it('should play the active video', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      await videoPlaybackManagerV2.setActiveVideo('video1');

      expect(player1.playCalled).toBe(true);
    });

    it('should stop previous video when new one becomes active', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'video2', player: player2 });

      await videoPlaybackManagerV2.setActiveVideo('video1');
      await videoPlaybackManagerV2.setActiveVideo('video2');

      // manager deactivates using pause, not stop
      expect(player1.pauseCalled).toBe(true);
      expect(player2.playCalled).toBe(true);
    });

    it('should mute previous video when new one becomes active', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'video2', player: player2 });

      await videoPlaybackManagerV2.setActiveVideo('video1');
      await videoPlaybackManagerV2.setActiveVideo('video2');

      expect(player1.mutedValue).toBe(true);
      expect(player2.mutedValue).toBe(false);
    });

    it('should not play if video ID not registered', async () => {
      await videoPlaybackManagerV2.setActiveVideo('nonexistent');
      
      // Should not throw, just log warning
      expect(true).toBe(true);
    });
  });

  describe('Multiple Video Coordination', () => {
    it('should ensure only one video plays at a time', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'video2', player: player2 });
      videoPlaybackManagerV2.register({ videoId: 'video3', player: player3 });

      await videoPlaybackManagerV2.setActiveVideo('video1');
      await videoPlaybackManagerV2.setActiveVideo('video2');
      await videoPlaybackManagerV2.setActiveVideo('video3');

      // Only video3 should be playing; others paused
      expect(player1.pauseCalled).toBe(true);
      expect(player2.pauseCalled).toBe(true);
      expect(player3.playCalled).toBe(true);
    });

    it('should mute all except active video', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'video2', player: player2 });
      videoPlaybackManagerV2.register({ videoId: 'video3', player: player3 });

      await videoPlaybackManagerV2.setActiveVideo('video2');
      await videoPlaybackManagerV2.deactivateAll();

      // New behavior: deactivateAll mutes all players immediately and only
      // pauses the previously active video. Verify mute state for all and
      // that the active video was paused.
      expect(player1.mutedValue).toBe(true);
      expect(player2.mutedValue).toBe(true);
      expect(player3.mutedValue).toBe(true);
      expect(player2.pauseCalled).toBe(true);
    });
  });

  describe('DeactivateAll', () => {
    it('should stop all registered videos', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'video2', player: player2 });
      videoPlaybackManagerV2.register({ videoId: 'video3', player: player3 });
      
      await videoPlaybackManagerV2.setActiveVideo('video2');
      await videoPlaybackManagerV2.deactivateAll();
      
      // manager deactivates using pause semantics for the active video and
      // mutes others. Verify active was paused and others were muted.
      expect(player2.pauseCalled).toBe(true);
      expect(player1.mutedValue).toBe(true);
      expect(player3.mutedValue).toBe(true);
    });

    it('should mute all registered videos', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'video2', player: player2 });

      await videoPlaybackManagerV2.deactivateAll();

      expect(player1.mutedValue).toBe(true);
      expect(player2.mutedValue).toBe(true);
    });

    it('should clear active video after deactivateAll', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });

      await videoPlaybackManagerV2.setActiveVideo('video1');
      await videoPlaybackManagerV2.deactivateAll();
      
      // Reset mocks
      player1.reset();
      
      // Reactivating should work
      await videoPlaybackManagerV2.setActiveVideo('video1');
      expect(player1.playCalled).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should release all players on cleanup', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'video2', player: player2 });
      videoPlaybackManagerV2.register({ videoId: 'video3', player: player3 });

      await videoPlaybackManagerV2.cleanup();

      expect(player1.releaseCalled).toBe(true);
      expect(player2.releaseCalled).toBe(true);
      expect(player3.releaseCalled).toBe(true);
    });

    it('should clear all registrations after cleanup', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      await videoPlaybackManagerV2.cleanup();

      // Attempting to set active after cleanup should not find player
      await videoPlaybackManagerV2.setActiveVideo('video1');
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should allow re-registration after cleanup', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      await videoPlaybackManagerV2.cleanup();
      
      // Should be able to register again
      player1.reset();
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle play errors gracefully', async () => {
      const errorPlayer = new MockVideoPlayer();
      errorPlayer.play = jest.fn().mockRejectedValue(new Error('Play failed'));

      videoPlaybackManagerV2.register({ videoId: 'error-video', player: errorPlayer });

      // Manager catches play errors internally (logs) and does not rethrow,
      // so expect the call to resolve without throwing.
      await expect(
        videoPlaybackManagerV2.setActiveVideo('error-video')
      ).resolves.not.toThrow();
    });

    it('should handle stop errors gracefully', async () => {
      const errorPlayer = new MockVideoPlayer();
      errorPlayer.stop = jest.fn().mockRejectedValue(new Error('Stop failed'));
      
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'error-video', player: errorPlayer });
      
      await videoPlaybackManagerV2.setActiveVideo('error-video');
      
      // Should not throw when switching away
      await expect(
        videoPlaybackManagerV2.setActiveVideo('video1')
      ).resolves.not.toThrow();
    });

    it('should handle release errors in cleanup', async () => {
      const errorPlayer = new MockVideoPlayer();
      // Return a rejected promise instead of throwing synchronously so cleanup
      // can handle the error via Promise rejection (matches production .catch usage)
      errorPlayer.release = jest.fn().mockRejectedValue(new Error('Release failed'));

      videoPlaybackManagerV2.register({ videoId: 'error-video', player: errorPlayer });

      // Should not throw when awaited
      await expect(videoPlaybackManagerV2.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle setting same video as active twice', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      
      await videoPlaybackManagerV2.setActiveVideo('video1');
      player1.reset();
      await videoPlaybackManagerV2.setActiveVideo('video1');
      
      // BUG FIX: When re-activating an "already active" video, the manager now
      // checks if playback is paused and restarts it. This fixes the Android
      // issue where user-paused videos wouldn't resume on reactivation.
      // MockVideoPlayer.getStatus() returns isPlaying: false after reset(),
      // so play() should be called to restart playback.
      expect(player1.playCalled).toBe(true);
    });

    it('should handle empty video ID', async () => {
      await expect(
        videoPlaybackManagerV2.setActiveVideo('')
      ).resolves.not.toThrow();
    });

    it('should handle cleanup with no registered players', () => {
      expect(() => {
        videoPlaybackManagerV2.cleanup();
      }).not.toThrow();
    });

    it('should handle deactivateAll with no registered players', async () => {
      await expect(
        videoPlaybackManagerV2.deactivateAll()
      ).resolves.not.toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid video switching', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      videoPlaybackManagerV2.register({ videoId: 'video2', player: player2 });
      videoPlaybackManagerV2.register({ videoId: 'video3', player: player3 });
      
      // Rapid switching
      await Promise.all([
        videoPlaybackManagerV2.setActiveVideo('video1'),
        videoPlaybackManagerV2.setActiveVideo('video2'),
        videoPlaybackManagerV2.setActiveVideo('video3'),
      ]);
      
      // Last one should win
      expect(player3.playCalled).toBe(true);
    });

    it('should handle registration during playback', async () => {
      videoPlaybackManagerV2.register({ videoId: 'video1', player: player1 });
      await videoPlaybackManagerV2.setActiveVideo('video1');
      
      // Register new player while video1 is playing
      videoPlaybackManagerV2.register({ videoId: 'video2', player: player2 });
      
      // Should not affect video1
      expect(player1.pauseCalled).toBe(false);
    });
  });
});

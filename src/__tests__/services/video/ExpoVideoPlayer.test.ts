/**
 * Unit tests for ExpoVideoPlayer
 * Tests the expo-video wrapper implementation of IVideoPlayer interface
 */

import { ExpoVideoPlayer } from '../../../services/video/ExpoVideoPlayer';

// Mock expo-video (provide createVideoPlayer to match ExpoVideoPlayer usage)
jest.mock('expo-video', () => ({
  createVideoPlayer: jest.fn().mockImplementation((source) => {
    const listeners: Map<string, Function> = new Map();
    return {
      addListener: jest.fn((event: string, callback: Function) => {
        listeners.set(event, callback);
        return { remove: jest.fn() };
      }),
      play: jest.fn(),
      pause: jest.fn(),
      release: jest.fn(),
      remove: jest.fn(),
      replace: jest.fn(),
      seekBy: jest.fn(),
      replay: jest.fn(),
      muted: false,
      playing: false,
      status: 'idle',
      currentTime: 0,
      duration: 120,
      // Helper to trigger events in tests
      _triggerEvent: (event: string, data: any) => {
        const callback = listeners.get(event);
        if (callback) callback(data);
      },
    };
  }),
}));

describe('ExpoVideoPlayer', () => {
  let player: ExpoVideoPlayer;
  let mockVideoPlayer: any;
  const testVideoUrl = 'https://test.com/video.mp4';

  beforeEach(() => {
    jest.clearAllMocks();
    player = new ExpoVideoPlayer({ videoUrl: testVideoUrl, loop: true, muted: false, autoPlay: false });
    // Get the mock created by createVideoPlayer
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoVideo = require('expo-video');
    mockVideoPlayer = (expoVideo.createVideoPlayer as jest.Mock).mock.results[0].value;
  });

  afterEach(() => {
    player.release();
  });

  describe('Constructor and Initialization', () => {
    it('should create VideoPlayer with source', () => {
      // Ensure the expo-video createVideoPlayer was called with the URL
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const expoVideo = require('expo-video');
      expect(expoVideo.createVideoPlayer).toHaveBeenCalledWith(testVideoUrl);
    });

    it('should set up event listeners for status, time, and source changes', () => {
      expect(mockVideoPlayer.addListener).toHaveBeenCalledWith(
        'statusChange',
        expect.any(Function)
      );
      expect(mockVideoPlayer.addListener).toHaveBeenCalledWith(
        'playingChange',
        expect.any(Function)
      );
      expect(mockVideoPlayer.addListener).toHaveBeenCalledWith(
        'sourceLoad',
        expect.any(Function)
      );
    });

    it('should initialize with default status', () => {
      let latest: any;
      player.addStatusListener(s => { latest = s; });
      expect(latest.isPlaying).toBe(false);
      expect(latest.isMuted).toBe(false);
      expect(latest.currentTime).toBe(0);
      expect(latest.error).toBeUndefined();
    });
  });

  describe('Playback Controls', () => {
    it('should call play on VideoPlayer', async () => {
      await player.play();
      expect(mockVideoPlayer.play).toHaveBeenCalled();
    });

    it('should call pause on VideoPlayer', async () => {
      await player.pause();
      expect(mockVideoPlayer.pause).toHaveBeenCalled();
    });

    it('should stop by pausing and seeking to 0', async () => {
      await player.stop();
      expect(mockVideoPlayer.pause).toHaveBeenCalled();
      expect(mockVideoPlayer.currentTime).toBe(0);
    });

    it('should seek by offset', async () => {
      mockVideoPlayer.currentTime = 30;
      await player.seek(45);
      expect(mockVideoPlayer.currentTime).toBe(45);
    });

    it('should handle negative seek (rewind)', async () => {
      mockVideoPlayer.currentTime = 60;
      await player.seek(30);
      expect(mockVideoPlayer.currentTime).toBe(30);
    });
  });

  describe('Mute Control', () => {
    it('should mute the player', () => {
      player.setMuted(true);
      expect(mockVideoPlayer.muted).toBe(true);
    });

    it('should unmute the player', () => {
      player.setMuted(false);
      expect(mockVideoPlayer.muted).toBe(false);
    });

    it('should update status when muted', () => {
      let latest: any;
      player.addStatusListener(s => { latest = s; });
      // Simulate underlying event that would trigger mutedChange
      mockVideoPlayer._triggerEvent('mutedChange', { muted: true });
      expect(latest.isMuted).toBe(true);
    });
  });

  describe('Status Updates', () => {
    it('should update status when playingChange event fires', () => {
      let latest: any;
      player.addStatusListener(s => { latest = s; });
      mockVideoPlayer._triggerEvent('playingChange', { isPlaying: true });
      expect(latest.isPlaying).toBe(true);
    });

    it('should update currentTime when timeUpdate event fires', () => {
      let latest: any;
      player.addStatusListener(s => { latest = s; });
      mockVideoPlayer._triggerEvent('timeUpdate', { currentTime: 45.5 });
      expect(latest.currentTime).toBe(45.5);
    });

    it('should handle error status', () => {
      let latest: any;
      player.addStatusListener(s => { latest = s; });
      const errorMessage = 'Failed to load video';
      // Provide an Error object so wrapper can read .message
      mockVideoPlayer._triggerEvent('statusChange', { 
        status: 'error',
        error: new Error(errorMessage)
      });
      expect(latest.error).toBe(errorMessage);
    });

    it('should update duration from sourceLoad event', () => {
      let latest: any;
      player.addStatusListener(s => { latest = s; });
      mockVideoPlayer._triggerEvent('sourceLoad', { 
        duration: 180,
      });
      expect(latest.duration).toBe(180);
    });
  });

  describe('Source Change', () => {
    it('should update duration when sourceLoad event fires', () => {
      const newDuration = 200;
      let latest: any;
      player.addStatusListener(s => { latest = s; });
      mockVideoPlayer._triggerEvent('sourceLoad', { duration: newDuration });
      expect(latest.duration).toBe(newDuration);
    });
  });

  describe('Status Listener', () => {
    it('should call status listener when status changes', () => {
      const listener = jest.fn();
      player.addStatusListener(listener);

      mockVideoPlayer._triggerEvent('playingChange', { isPlaying: true });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isPlaying: true })
      );
    });

    it('should not throw if no status listener set', () => {
      expect(() => {
        mockVideoPlayer._triggerEvent('playingChange', { isPlaying: true });
      }).not.toThrow();
    });

    it('should call listener multiple times for multiple updates', () => {
      const listener = jest.fn();
      player.addStatusListener(listener);

      // Initial immediate notify + two subsequent events => 3 calls
      mockVideoPlayer._triggerEvent('playingChange', { isPlaying: true });
      mockVideoPlayer._triggerEvent('statusChange', { currentTime: 10 });
      
      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe('Resource Cleanup', () => {
    it('should call underlying release on release', () => {
      player.release();
      expect(mockVideoPlayer.release).toHaveBeenCalled();
    });

    it('should remove event listeners on release', () => {
      const removeListener = jest.fn();
      // Arrange next created mock to return a remove implementation
      const expoVideo = require('expo-video');
      (expoVideo.createVideoPlayer as jest.Mock).mockImplementationOnce((source) => {
        const listeners: Map<string, Function> = new Map();
        return {
          addListener: jest.fn((event: string, callback: Function) => {
            listeners.set(event, callback);
            return { remove: removeListener };
          }),
          play: jest.fn(),
          pause: jest.fn(),
          release: jest.fn(),
          remove: jest.fn(),
          replace: jest.fn(),
          seekBy: jest.fn(),
          replay: jest.fn(),
          muted: false,
          playing: false,
          status: 'idle',
          currentTime: 0,
          duration: 120,
          _triggerEvent: (event: string, data: any) => {
            const callback = listeners.get(event);
            if (callback) callback(data);
          },
        };
      });

      const newPlayer = new ExpoVideoPlayer({ videoUrl: testVideoUrl, loop: true, muted: false, autoPlay: false });
      newPlayer.release();

      expect(removeListener).toHaveBeenCalledTimes(5); // status, playing, time, source, muted
    });

    it('should not throw if release called multiple times', () => {
      expect(() => {
        player.release();
        player.release();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle play errors gracefully', async () => {
      mockVideoPlayer.play.mockRejectedValue(new Error('Play failed'));
      
      await expect(player.play()).rejects.toThrow('Play failed');
    });

    it('should handle pause errors gracefully', async () => {
      mockVideoPlayer.pause.mockRejectedValue(new Error('Pause failed'));
      
      await expect(player.pause()).rejects.toThrow('Pause failed');
    });

    it('should store error in status when statusChange has error', () => {
      let latest: any;
      player.addStatusListener(s => { latest = s; });

      mockVideoPlayer._triggerEvent('statusChange', {
        status: 'error',
        error: new Error('Network error')
      });

      expect(latest.error).toBe('Network error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty video URL', () => {
      const emptyPlayer = new ExpoVideoPlayer({ videoUrl: '', loop: false, muted: false, autoPlay: false });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const expoVideo = require('expo-video');
      expect(expoVideo.createVideoPlayer).toHaveBeenCalledWith('');
      emptyPlayer.release();
    });

    it('should handle undefined status values', () => {
      let latest: any;
      player.addStatusListener(s => { latest = s; });
      mockVideoPlayer._triggerEvent('statusChange', {});
      expect(latest).toBeDefined();
    });

    it('should handle seeking to current time (no-op)', async () => {
      mockVideoPlayer.currentTime = 30;
      await player.seek(30);
      expect(mockVideoPlayer.currentTime).toBe(30);
    });
  });
});

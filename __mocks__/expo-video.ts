/**
 * Mock for expo-video package
 * Used in unit tests to simulate video player functionality
 */

export interface VideoPlayer {
  playing: boolean;
  muted: boolean;
  loop: boolean;
  play: jest.Mock;
  pause: jest.Mock;
  replace: jest.Mock;
  replaceAsync: jest.Mock;
  addListener: jest.Mock;
  remove: jest.Mock;
}

const mockListeners = new Map<string, Array<(payload: any) => void>>();

// Mock for createVideoPlayer - used by SharedVideoPlayerService
export const createVideoPlayer = jest.fn((source?: string | null): VideoPlayer => {
  const player: VideoPlayer = {
    playing: false,
    muted: false,
    loop: false,
    currentTime: 0,
    duration: 0,
    play: jest.fn(() => {
      player.playing = true;
      const listeners = mockListeners.get('playingChange') || [];
      listeners.forEach(listener => listener({ isPlaying: true }));
    }),
    pause: jest.fn(() => {
      player.playing = false;
      const listeners = mockListeners.get('playingChange') || [];
      listeners.forEach(listener => listener({ isPlaying: false }));
      return Promise.resolve();
    }),
    setMuted: jest.fn((muted: boolean) => {
      player.muted = muted;
      return Promise.resolve();
    }),
    seekBy: jest.fn((offset: number) => {
      player.currentTime = (player.currentTime || 0) + offset;
      const listeners = mockListeners.get('statusChange') || [];
      listeners.forEach(listener => listener({ currentTime: player.currentTime }));
      return Promise.resolve();
    }),
    replace: jest.fn((newSource: string) => {
      // Synchronous replace
    }),
    replaceAsync: jest.fn(async (newSource: string) => {
      // Simulate async source replacement
      const listeners = mockListeners.get('sourceLoad') || [];
      setTimeout(() => {
        listeners.forEach(listener => listener({
          videoSource: { uri: newSource },
          duration: 33.506,
          availableVideoTracks: [],
          availableSubtitleTracks: [],
          availableAudioTracks: [],
        }));
      }, 0);
    }),
    addListener: jest.fn((eventName: string, callback: (payload: any) => void) => {
      if (!mockListeners.has(eventName)) {
        mockListeners.set(eventName, []);
      }
      mockListeners.get(eventName)!.push(callback);

      // Simulate sourceLoad event immediately for initial source
      if (eventName === 'sourceLoad' && source) {
        setTimeout(() => {
          callback({
            videoSource: { uri: source },
            duration: 33.506,
            availableVideoTracks: [],
            availableSubtitleTracks: [],
            availableAudioTracks: [],
          });
        }, 0);
      }

      return {
        remove: jest.fn(() => {
          const listeners = mockListeners.get(eventName);
          if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        }),
      };
    }),
    remove: jest.fn(() => Promise.resolve()),
    release: jest.fn(() => Promise.resolve()),
    // Helper to trigger events in tests
    _triggerEvent: (event: string, data: any) => {
      const listeners = mockListeners.get(event) || [];
      listeners.forEach(fn => fn(data));
    },
  };

  return player;
});

export const useVideoPlayer = jest.fn((source: string, config?: (player: VideoPlayer) => void): VideoPlayer => {
  const player: VideoPlayer = {
    playing: false,
    muted: false,
    loop: false,
    currentTime: 0,
    duration: 0,
    play: jest.fn(() => {
      player.playing = true;
      const listeners = mockListeners.get('playingChange') || [];
      listeners.forEach(listener => listener({ isPlaying: true }));
    }),
    pause: jest.fn(() => {
      player.playing = false;
      const listeners = mockListeners.get('playingChange') || [];
      listeners.forEach(listener => listener({ isPlaying: false }));
    }),
    seekBy: jest.fn((offset: number) => {
      player.currentTime = (player.currentTime || 0) + offset;
      const listeners = mockListeners.get('statusChange') || [];
      listeners.forEach(listener => listener({ currentTime: player.currentTime }));
    }),
    replace: jest.fn((newSource: string) => {
      // Synchronous replace
    }),
    replaceAsync: jest.fn(async (newSource: string) => {
      // Simulate async source replacement
      const listeners = mockListeners.get('sourceLoad') || [];
      setTimeout(() => {
        listeners.forEach(listener => listener({
          videoSource: { uri: newSource },
          duration: 33.506,
          availableVideoTracks: [],
          availableSubtitleTracks: [],
          availableAudioTracks: [],
        }));
      }, 0);
    }),
    addListener: jest.fn((eventName: string, callback: (payload: any) => void) => {
      if (!mockListeners.has(eventName)) {
        mockListeners.set(eventName, []);
      }
      mockListeners.get(eventName)!.push(callback);

      // Simulate sourceLoad event immediately
      if (eventName === 'sourceLoad') {
        setTimeout(() => {
          callback({
            videoSource: { uri: source },
            duration: 33.506, // 33.506 seconds
            availableVideoTracks: [],
            availableSubtitleTracks: [],
            availableAudioTracks: [],
          });
        }, 0);
      }

      return {
        remove: jest.fn(() => {
          const listeners = mockListeners.get(eventName);
          if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        }),
      };
    }),
    remove: jest.fn(),
    // Helper to trigger events in tests
    _triggerEvent: (event: string, data: any) => {
      const listeners = mockListeners.get(event) || [];
      listeners.forEach(fn => fn(data));
    },
  };

  // Apply config if provided
  if (config) {
    config(player);
  }

  return player;
});

export const VideoView = jest.fn(({ player, style, nativeControls, contentFit }) => {
  return null;
});

export const isPictureInPictureSupported = jest.fn(() => false);
export const clearVideoCacheAsync = jest.fn(() => Promise.resolve());
export const setVideoCacheSizeAsync = jest.fn(() => Promise.resolve());
export const getCurrentVideoCacheSize = jest.fn(() => Promise.resolve(0));

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
    remove: jest.fn(),
  };

  return player;
});

export const useVideoPlayer = jest.fn((source: string, config?: (player: VideoPlayer) => void): VideoPlayer => {
  const player: VideoPlayer = {
    playing: false,
    muted: false,
    loop: false,
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

/**
 * Empty expo-av shim for web platform
 * 
 * This file is used on web builds to completely prevent expo-av from loading.
 * The expo-av deprecation warning causes an infinite loop on iOS Safari,
 * so we stub it out entirely on web where we use expo-audio and expo-video instead.
 */

// Import React for proper component definition
import React from 'react';

// Minimal stub matching the common AVPlaybackStatus shape from expo-av
export const AVPlaybackStatus = {
  isLoaded: false,
  uri: undefined,
  positionMillis: 0,
  durationMillis: 0,
  isPlaying: false,
  isBuffering: false,
  rate: 1,
  shouldCorrectPitch: false,
  volume: 1,
  isMuted: false,
  isLooping: false,
  didJustFinish: false,
};

// Audio stub with proper Sound object structure
export const Audio = {
  setAudioModeAsync: () => Promise.resolve(),
  Sound: {
    createAsync: () => Promise.resolve({
      sound: {
        unloadAsync: () => Promise.resolve(),
        playAsync: () => Promise.resolve(),
        pauseAsync: () => Promise.resolve(),
        stopAsync: () => Promise.resolve(),
        setPositionAsync: () => Promise.resolve(),
        setIsMutedAsync: () => Promise.resolve(),
        setVolumeAsync: () => Promise.resolve(),
        getStatusAsync: () => Promise.resolve({ isLoaded: true }),
      },
      status: { isLoaded: true },
    }),
  },
};

// Video component stub - proper React component that accepts props and refs
export const Video = React.forwardRef((props, ref) => null);
Video.displayName = 'Video';

export const ResizeMode = {
  CONTAIN: 'contain',
  COVER: 'cover',
  STRETCH: 'stretch',
};

// Default export for CommonJS compatibility
export default {
  Audio,
  Video,
  ResizeMode,
  AVPlaybackStatus,
};

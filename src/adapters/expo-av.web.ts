/**
 * Web stub for expo-av
 * 
 * This file replaces expo-av on web builds using React Native's platform-specific extensions.
 * It provides minimal API surface to prevent import errors while video features are handled
 * by HTML5 <video> elements instead.
 */

import React from 'react';

// Stub Video component (never actually used on web - HTML5 video is used instead)
export const Video = React.forwardRef<any, any>((props, ref) => {
  console.warn('[expo-av stub] Video component called on web - should use HTML5 video instead');
  return null;
});

Video.displayName = 'Video';

// Stub ResizeMode (values match real expo-av for compatibility)
export const ResizeMode = {
  CONTAIN: 'contain',
  COVER: 'cover',
  STRETCH: 'stretch',
} as const;

// Stub AVPlaybackStatus (minimal interface for type compatibility)
export interface AVPlaybackStatus {
  isLoaded: boolean;
  uri?: string;
  positionMillis?: number;
  durationMillis?: number;
  isPlaying?: boolean;
  isBuffering?: boolean;
  rate?: number;
  shouldCorrectPitch?: boolean;
  volume?: number;
  isMuted?: boolean;
  isLooping?: boolean;
  didJustFinish?: boolean;
}

// Stub Audio (never used on web in this app)
export const Audio = {
  setAudioModeAsync: () => {
    console.warn('[expo-av stub] Audio.setAudioModeAsync called on web');
    return Promise.resolve();
  },
  Sound: {
    createAsync: () => {
      console.warn('[expo-av stub] Audio.Sound.createAsync called on web');
      return Promise.resolve({
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
      });
    },
  },
};

console.log('[expo-av stub] ✅ Using web stub - real expo-av NOT loaded');

export default {
  Video,
  ResizeMode,
  Audio,
};

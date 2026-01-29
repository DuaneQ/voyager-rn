/**
 * Empty expo-av shim for web platform
 * 
 * This file is used on web builds to completely prevent expo-av from loading.
 * The expo-av deprecation warning causes an infinite loop on iOS Safari,
 * so we stub it out entirely on web where we use expo-audio and expo-video instead.
 */

// Export empty stubs that match the expo-av API
export const Audio = {
  setAudioModeAsync: () => Promise.resolve(),
  Sound: {
    createAsync: () => Promise.resolve({ sound: {}, status: {} }),
  },
};

export const Video = () => null;

export const ResizeMode = {
  CONTAIN: 'contain',
  COVER: 'cover',
  STRETCH: 'stretch',
};

export const AVPlaybackStatus = {};

// Default export
export default {
  Audio,
  Video,
  ResizeMode,
  AVPlaybackStatus,
};

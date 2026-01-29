/**
 * Mock for expo-audio
 * 
 * This mock replaces expo-audio in test environments.
 * expo-audio was introduced to replace the Audio functionality from expo-av.
 */

export const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);

export const useAudioPlayer = jest.fn().mockReturnValue({
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(),
  duration: 0,
  currentTime: 0,
  playing: false,
  muted: false,
  volume: 1,
});

export const useAudioPlayerStatus = jest.fn().mockReturnValue({
  playing: false,
  currentTime: 0,
  duration: 0,
  isLoaded: false,
  isBuffering: false,
});

export const useAudioRecorder = jest.fn().mockReturnValue({
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  record: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  uri: null,
  isRecording: false,
});

export const createAudioPlayer = jest.fn().mockReturnValue({
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn().mockResolvedValue(undefined),
  release: jest.fn(),
  duration: 0,
  currentTime: 0,
  playing: false,
  muted: false,
  volume: 1,
});

export const AudioModule = {
  requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
};

export const RecordingPresets = {
  HIGH_QUALITY: {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  LOW_QUALITY: {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 64000,
  },
};

// Default export for compatibility
export default {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  createAudioPlayer,
  AudioModule,
  RecordingPresets,
};

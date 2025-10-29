// Mock for expo-av

export const Audio = {
  Sound: {
    createAsync: jest.fn().mockResolvedValue({
      sound: {
        unloadAsync: jest.fn().mockResolvedValue(undefined),
      },
      status: {
        isLoaded: true,
        durationMillis: 30000, // 30 seconds
      },
    }),
  },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
};

export const Video = jest.fn(() => null);
Video.createAsync = jest.fn().mockResolvedValue({
  sound: {
    unloadAsync: jest.fn().mockResolvedValue(undefined),
  },
  status: {
    isLoaded: true,
    durationMillis: 30000,
  },
});

export const ResizeMode = {
  CONTAIN: 'contain',
  COVER: 'cover',
  STRETCH: 'stretch',
};

export const AVPlaybackStatus = {};

export default Video;

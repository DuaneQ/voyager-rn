/**
 * Mock for react-native-video v6
 * Used by Jest tests to avoid native module issues
 */

import React from 'react';

// Mock Video component
const Video = React.forwardRef((props, ref) => {
  // Expose mock methods via ref
  React.useImperativeHandle(ref, () => ({
    seek: jest.fn(),
    resume: jest.fn(),
    pause: jest.fn(),
    presentFullscreenPlayer: jest.fn(),
    dismissFullscreenPlayer: jest.fn(),
    restoreUserInterfaceForPictureInPictureStopCompleted: jest.fn(),
    save: jest.fn().mockResolvedValue({ uri: 'mock-uri' }),
    setVolume: jest.fn(),
    getCurrentPosition: jest.fn().mockResolvedValue(0),
    setFullScreen: jest.fn(),
    setSource: jest.fn(),
    enterPictureInPicture: jest.fn(),
    exitPictureInPicture: jest.fn(),
  }));

  return React.createElement('Video', {
    ...props,
    testID: props.testID || 'mock-video',
  });
});

Video.displayName = 'Video';

export default Video;

// Export types as empty objects for TypeScript compatibility
export const VideoRef = {};
export const OnLoadData = {};
export const OnBufferData = {};
export const OnProgressData = {};

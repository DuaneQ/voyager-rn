/**
 * Mock for expo-image-picker
 * Provides mock functionality for image selection in tests
 */

export const MediaTypeOptions = {
  All: 'All',
  Videos: 'Videos',
  Images: 'Images',
};

export const requestMediaLibraryPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: 'granted', canAskAgain: true, granted: true, expires: 'never' })
);

export const launchImageLibraryAsync = jest.fn(() =>
  Promise.resolve({
    canceled: false,
    assets: [
      {
        uri: 'file:///mock-image.jpg',
        width: 1000,
        height: 1000,
        type: 'image',
      },
    ],
  })
);

export const launchCameraAsync = jest.fn(() =>
  Promise.resolve({
    canceled: false,
    assets: [
      {
        uri: 'file:///mock-camera-image.jpg',
        width: 1000,
        height: 1000,
        type: 'image',
      },
    ],
  })
);

export default {
  MediaTypeOptions,
  requestMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
  launchCameraAsync,
};

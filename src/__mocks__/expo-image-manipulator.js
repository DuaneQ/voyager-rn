/**
 * Mock for expo-image-manipulator
 * Provides mock functionality for image compression/manipulation in tests
 */

export const SaveFormat = {
  JPEG: 'jpeg',
  PNG: 'png',
  WEBP: 'webp',
};

export const FlipType = {
  Horizontal: 'horizontal',
  Vertical: 'vertical',
};

export const manipulateAsync = jest.fn((uri, actions = [], options = {}) =>
  Promise.resolve({
    uri: uri.replace('.jpg', '-compressed.jpg'),
    width: options.compress?.maxWidth || 1920,
    height: options.compress?.maxHeight || 1920,
  })
);

export default {
  SaveFormat,
  FlipType,
  manipulateAsync,
};

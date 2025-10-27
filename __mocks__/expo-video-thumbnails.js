// Mock for expo-video-thumbnails

export const getThumbnailAsync = jest.fn().mockResolvedValue({
  uri: 'file:///mock-thumbnail.jpg',
  width: 200,
  height: 200,
});

export default {
  getThumbnailAsync,
};

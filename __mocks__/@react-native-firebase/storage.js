/**
 * Mock for @react-native-firebase/storage
 */

const mockStorageReference = {
  putFile: jest.fn().mockResolvedValue({
    state: 'success',
    metadata: { fullPath: 'test/path.jpg' },
  }),
  getDownloadURL: jest.fn().mockResolvedValue('https://example.com/test.jpg'),
  delete: jest.fn().mockResolvedValue(undefined),
};

const mockStorage = jest.fn(() => ({
  ref: jest.fn(() => mockStorageReference),
}));

export default mockStorage;

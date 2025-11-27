// Mock for expo-file-system

// Mock File class for SDK 54+
class MockFile {
  constructor(uri) {
    this.uri = uri;
    this._determineSize();
  }

  _determineSize() {
    // Determine size based on URI patterns
    if (this.uri.includes('non-existent') || this.uri.includes('missing')) {
      this._shouldError = true;
      this._size = 0;
    } else if (this.uri.includes('large-image')) {
      // Used in test for file exceeding size limit
      this._shouldError = false;
      this._size = 10 * 1024 * 1024; // 10MB (exceeds 5MB max)
    } else if (this.uri.includes('large')) {
      // Used in prepareImageForUpload test
      this._shouldError = false;
      this._size = 4.5 * 1024 * 1024; // 4.5MB (triggers compression at 80% threshold)
    } else if (this.uri.includes('1mb')) {
      this._shouldError = false;
      this._size = 1024000; // 1MB exactly
    } else if (this.uri.includes('compressed')) {
      this._shouldError = false;
      this._size = 2 * 1024 * 1024; // 2MB after compression
    } else {
      this._shouldError = false;
      this._size = 2 * 1024 * 1024; // Default 2MB
    }
  }

  get size() {
    if (this._shouldError) {
      return Promise.reject(new Error('File not found'));
    }
    return Promise.resolve(this._size);
  }
}

export const File = MockFile;

export const readAsStringAsync = jest.fn().mockResolvedValue('base64encodedstring');

export const getInfoAsync = jest.fn().mockResolvedValue({
  exists: true,
  size: 1024 * 1024 * 10, // 10MB
  isDirectory: false,
  uri: 'file:///mock-file.mp4',
  modificationTime: Date.now(),
});

export const writeAsStringAsync = jest.fn().mockResolvedValue(undefined);
export const deleteAsync = jest.fn().mockResolvedValue(undefined);
export const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined);
export const copyAsync = jest.fn().mockResolvedValue(undefined);
export const moveAsync = jest.fn().mockResolvedValue(undefined);

export default {
  File,
  readAsStringAsync,
  getInfoAsync,
  writeAsStringAsync,
  deleteAsync,
  makeDirectoryAsync,
  copyAsync,
  moveAsync,
};

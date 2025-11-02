/**
 * Mock for firebase/storage
 * Provides mock Storage methods for unit tests
 */

const mockStorageRef = {
  fullPath: 'mock/path',
  name: 'mock-file',
  bucket: 'mock-bucket',
  toString: jest.fn(() => 'gs://mock-bucket/mock/path'),
};

const mockUploadTask = {
  on: jest.fn((event, next, error, complete) => {
    if (complete) complete();
    return jest.fn(); // Unsubscribe function
  }),
  then: jest.fn(() => Promise.resolve(mockUploadResult)),
  catch: jest.fn(),
};

const mockUploadResult = {
  ref: mockStorageRef,
  metadata: {
    size: 1024,
    contentType: 'image/jpeg',
    timeCreated: new Date().toISOString(),
  },
};

const mockStorage = {
  app: {},
  maxOperationRetryTime: 120000,
  maxUploadRetryTime: 600000,
};

export const getStorage = jest.fn(() => mockStorage);

export const ref = jest.fn((storage, path) => mockStorageRef);

export const uploadBytes = jest.fn(() => Promise.resolve(mockUploadResult));

export const uploadBytesResumable = jest.fn(() => mockUploadTask);

export const uploadString = jest.fn(() => Promise.resolve(mockUploadResult));

export const getDownloadURL = jest.fn(() => Promise.resolve('https://mock-storage-url.com/file.jpg'));

export const deleteObject = jest.fn(() => Promise.resolve());

export const listAll = jest.fn(() => Promise.resolve({
  items: [mockStorageRef],
  prefixes: [],
}));

export const getMetadata = jest.fn(() => Promise.resolve({
  size: 1024,
  contentType: 'image/jpeg',
  timeCreated: new Date().toISOString(),
}));

export const updateMetadata = jest.fn(() => Promise.resolve({
  size: 1024,
  contentType: 'image/jpeg',
  timeCreated: new Date().toISOString(),
}));

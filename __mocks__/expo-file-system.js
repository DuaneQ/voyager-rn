// Mock for expo-file-system

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
  readAsStringAsync,
  getInfoAsync,
  writeAsStringAsync,
  deleteAsync,
  makeDirectoryAsync,
  copyAsync,
  moveAsync,
};

// TypeScript declarations for expo-file-system mock

export interface FileInfo {
  exists: boolean;
  size: number;
  isDirectory: boolean;
  uri: string;
  modificationTime: number;
}

export const readAsStringAsync: jest.Mock<Promise<string>>;
export const getInfoAsync: jest.Mock<Promise<FileInfo>>;
export const writeAsStringAsync: jest.Mock<Promise<void>>;
export const deleteAsync: jest.Mock<Promise<void>>;
export const makeDirectoryAsync: jest.Mock<Promise<void>>;
export const copyAsync: jest.Mock<Promise<void>>;
export const moveAsync: jest.Mock<Promise<void>>;

declare const _default: {
  readAsStringAsync: typeof readAsStringAsync;
  getInfoAsync: typeof getInfoAsync;
  writeAsStringAsync: typeof writeAsStringAsync;
  deleteAsync: typeof deleteAsync;
  makeDirectoryAsync: typeof makeDirectoryAsync;
  copyAsync: typeof copyAsync;
  moveAsync: typeof moveAsync;
};

export default _default;

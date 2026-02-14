/**
 * Mock for expo-device
 * Used in Jest tests to simulate device type detection
 */

// Default to true for tests (simulate physical device)
export const isDevice = true;

export const brand = 'Apple';
export const manufacturer = 'Apple';
export const modelName = 'iPhone 14 Pro';
export const modelId = 'iPhone15,2';
export const productName = 'iPhone';
export const deviceYearClass = 2022;
export const totalMemory = 6000000000;
export const osName = 'iOS';
export const osVersion = '17.0';
export const platformApiLevel = null;

// Helper for tests to change device status
let mockIsDevice = true;
export const __setIsDevice = (value: boolean) => {
  mockIsDevice = value;
};

export const __getIsDevice = () => mockIsDevice;

export default {
  isDevice,
  brand,
  manufacturer,
  modelName,
  modelId,
  productName,
  deviceYearClass,
  totalMemory,
  osName,
  osVersion,
  platformApiLevel,
  __setIsDevice,
  __getIsDevice,
};

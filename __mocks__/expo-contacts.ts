/**
 * Mock for expo-contacts
 * Used in unit tests to avoid native module dependencies
 */

export enum PermissionStatus {
  UNDETERMINED = 'undetermined',
  GRANTED = 'granted',
  DENIED = 'denied',
}

export const requestPermissionsAsync = jest.fn(async () => ({
  status: PermissionStatus.GRANTED,
  granted: true,
  canAskAgain: true,
  expires: 'never',
}));

export const getPermissionsAsync = jest.fn(async () => ({
  status: PermissionStatus.GRANTED,
  granted: true,
  canAskAgain: true,
  expires: 'never',
}));

export const getContactsAsync = jest.fn(async () => ({
  data: [],
  hasNextPage: false,
  hasPreviousPage: false,
}));

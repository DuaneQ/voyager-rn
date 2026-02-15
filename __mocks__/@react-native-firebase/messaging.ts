/**
 * Mock for @react-native-firebase/messaging
 * Used in tests to avoid native module dependency
 */

const mockGetToken = jest.fn().mockResolvedValue('mock-fcm-token-abc123xyz');
const mockRequestPermission = jest.fn().mockResolvedValue(1); // AUTHORIZED
const mockDeleteToken = jest.fn().mockResolvedValue(undefined);
const mockOnTokenRefresh = jest.fn().mockReturnValue(jest.fn()); // returns unsubscribe

const mockMessagingInstance = {
  getToken: mockGetToken,
  requestPermission: mockRequestPermission,
  deleteToken: mockDeleteToken,
  onTokenRefresh: mockOnTokenRefresh,
};

const messaging: any = jest.fn(() => mockMessagingInstance);

// Static properties
messaging.AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export default messaging;

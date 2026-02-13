/**
 * Mock for @react-native-firebase/messaging
 * Used in Jest tests to avoid loading native modules
 */

// Create mock instance methods
const mockMessagingInstance = {
  requestPermission: jest.fn(() => Promise.resolve(1)), // AuthorizationStatus.AUTHORIZED
  getToken: jest.fn(() => Promise.resolve('mock-fcm-token-abc123xyz')),
  deleteToken: jest.fn(() => Promise.resolve()),
  onTokenRefresh: jest.fn((callback) => jest.fn()), // Return unsubscribe function
  onMessage: jest.fn((callback) => jest.fn()), // Return unsubscribe function
  onNotificationOpenedApp: jest.fn((callback) => jest.fn()), // Return unsubscribe function
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
};

// messaging() should return the instance
const messaging = jest.fn(() => mockMessagingInstance) as jest.Mock & {
  AuthorizationStatus: {
    NOT_DETERMINED: number;
    DENIED: number;
    AUTHORIZED: number;
    PROVISIONAL: number;
  };
};

// Authorization status enum
messaging.AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export default messaging;

/**
 * Mock for firebase/app
 * Used in unit tests to avoid actual Firebase initialization
 */

const mockApp = {
  name: '[DEFAULT]',
  options: {},
  automaticDataCollectionEnabled: false,
  _getProvider: jest.fn((identifier) => {
    // Mock provider for different Firebase services
    return {
      getImmediate: jest.fn(() => ({})),
      get: jest.fn(() => Promise.resolve({})),
      isInitialized: jest.fn(() => true),
    };
  }),
};

export const initializeApp = jest.fn(() => mockApp);

export const getApp = jest.fn(() => mockApp);

export const getApps = jest.fn(() => [mockApp]);

export const deleteApp = jest.fn(() => Promise.resolve());

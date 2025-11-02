/**
 * Mock for firebase/functions
 * Provides mock Cloud Functions methods for unit tests
 * Uses global handler pattern per develop_unit_tests_prompt.md
 */

const mockFunctions = {
  app: {},
  region: 'us-central1',
};

// Global handlers storage for per-RPC mocking
const globalHandlers = {};

// Mock httpsCallable that uses global handlers
export const httpsCallable = jest.fn((functions, name) => {
  return jest.fn((data) => {
    // Check if there's a global handler for this function
    const handlerKey = `__mock_httpsCallable_${name}`;
    if (global[handlerKey]) {
      return global[handlerKey](data);
    }
    
    // Default mock response
    return Promise.resolve({
      data: {
        success: true,
        data: {},
      },
    });
  });
});

export const getFunctions = jest.fn(() => mockFunctions);

export const connectFunctionsEmulator = jest.fn();

// Helper function to set up global handlers in tests
export const __setMockHandler = (functionName, handler) => {
  global[`__mock_httpsCallable_${functionName}`] = handler;
};

// Helper function to clear all mock handlers
export const __clearMockHandlers = () => {
  Object.keys(global).forEach(key => {
    if (key.startsWith('__mock_httpsCallable_')) {
      delete global[key];
    }
  });
};

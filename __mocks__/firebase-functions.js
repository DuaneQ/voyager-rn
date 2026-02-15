/**
 * Mock for Firebase Functions
 * Prevents Firebase initialization issues in Jest tests
 */

// Mock Firebase Functions
export const getFunctions = jest.fn(() => ({}));

export const httpsCallable = jest.fn((functions, functionName) => {
  return jest.fn(() => Promise.resolve({ 
    data: { 
      success: true, 
      data: [] 
    } 
  }));
});

export const HttpsCallableResult = {};

// Default export
export default {
  getFunctions,
  httpsCallable,
  HttpsCallableResult,
};
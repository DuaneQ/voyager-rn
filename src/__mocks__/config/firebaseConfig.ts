/**
 * Manual mock for src/config/firebaseConfig.ts
 * Updated to use Firebase Web SDK
 */

const mockOnAuthStateChanged = jest.fn((callback) => {
  // Immediately invoke callback with mock user (synchronously for tests)
  if (callback) {
    callback({ uid: 'test-user-123', email: 'test@example.com', emailVerified: true });
  }
  // Return unsubscribe function
  return jest.fn();
});

export const auth = {
  currentUser: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
  onAuthStateChanged: mockOnAuthStateChanged,
};

const mockDb = {};
const mockStorage = {};
const mockApp = {};
const mockFunctions = {};

// Mock Cloud Functions helpers
export const FUNCTIONS_REGION = 'us-central1';
export const FUNCTIONS_PROJECT_ID = 'mundo1-dev';
export const getCloudFunctionUrl = jest.fn((functionName: string) => 
  `https://${FUNCTIONS_REGION}-${FUNCTIONS_PROJECT_ID}.cloudfunctions.net/${functionName}`
);

export { mockApp as app, mockDb as db, mockStorage as storage, mockFunctions as functions };

/**
 * Manual mock for src/config/firebaseConfig.ts
 * Used by tests that import from src/config/firebaseConfig
 */

// Import the mocked FirebaseAuthService
jest.mock('../../services/auth/FirebaseAuthService');
const { FirebaseAuthService } = require('../../services/auth/FirebaseAuthService');

const mockDb = {};
const mockStorage = {};
const mockApp = {};
const mockFunctions = {};

// Mock getAuthInstance to match production implementation
// This creates a compatibility wrapper around FirebaseAuthService
export const getAuthInstance = jest.fn(() => {
  const currentUser = FirebaseAuthService.getCurrentUser();
  
  return {
    currentUser: currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      emailVerified: currentUser.emailVerified,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
    } : null,
    onAuthStateChanged: (callback: (user: any) => void) => {
      return FirebaseAuthService.onAuthStateChanged((firebaseUser: any) => {
        callback(firebaseUser ? {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        } : null);
      });
    },
  };
});

// Mock Cloud Functions helpers
export const FUNCTIONS_REGION = 'us-central1';
export const FUNCTIONS_PROJECT_ID = 'mundo1-dev';
export const getCloudFunctionUrl = jest.fn((functionName: string) => 
  `https://${FUNCTIONS_REGION}-${FUNCTIONS_PROJECT_ID}.cloudfunctions.net/${functionName}`
);

export { mockApp as app, mockDb as db, mockStorage as storage, mockFunctions as functions };

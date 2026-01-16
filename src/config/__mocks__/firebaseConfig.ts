// Manual Jest mock for src/config/firebaseConfig used by many unit tests.
// Updated to match Firebase Web SDK interface

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

export const functions = {};
export const db = {};
export const app = {};

export default {
  auth,
  functions,
  db,
  app,
};

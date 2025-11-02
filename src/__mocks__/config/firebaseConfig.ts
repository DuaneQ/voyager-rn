/**
 * Manual mock for src/config/firebaseConfig.ts
 * Used by tests that import from src/config/firebaseConfig
 */

const mockOnAuthStateChanged = jest.fn((callback) => {
  // Immediately invoke callback with mock user
  setTimeout(() => callback({ uid: 'test-user-123', email: 'test@example.com' }), 0);
  // Return unsubscribe function
  return jest.fn();
});

const mockAuth = {
  currentUser: { uid: 'test-user-123', email: 'test@example.com' },
  onAuthStateChanged: mockOnAuthStateChanged,
};

const mockDb = {};
const mockStorage = {};
const mockApp = {};

export { mockApp as app, mockAuth as auth, mockDb as db, mockStorage as storage };

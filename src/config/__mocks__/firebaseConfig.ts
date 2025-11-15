// Manual Jest mock for src/config/firebaseConfig used by many unit tests.
// Exports both the legacy `auth` object and the new `getAuthInstance()` helper
// so tests can rely on either shape.

export const auth = {
  currentUser: { uid: 'test-user-123', email: 'test@example.com' },
};

// Export getAuthInstance as a jest.fn so tests can spy/mock its implementation
export const getAuthInstance = jest.fn(() => auth);

export const functions = {};
export const db = {};
export const app = {};

export default {
  auth,
  getAuthInstance,
  functions,
  db,
  app,
};

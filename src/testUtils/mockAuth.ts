// Test utilities for mocking auth in unit tests
// Provides helpers to set/clear the mocked getAuthInstance in the
// central firebaseConfig manual mock.

import * as firebaseConfig from '../config/firebaseConfig';

type MockedAuth = {
  currentUser: { uid: string; email?: string } | null;
  onAuthStateChanged?: (cb: (user: any) => void) => void;
};

const DEFAULT_USER = { uid: 'test-user-123', email: 'test@example.com' };

export function setMockUser(user = DEFAULT_USER) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingAuth: any = (firebaseConfig as any).auth || {};

  // Mutate the existing auth object where possible so all imports referencing
  // the original `auth` object observe changes. This prevents divergence
  // between `auth` and the object returned from `getAuthInstance()`.
  existingAuth.currentUser = user;
  existingAuth.onAuthStateChanged = (cb: (u: any) => void) => cb(user);

  if (typeof (firebaseConfig as any).getAuthInstance === 'function') {
    // Ensure getAuthInstance returns the same auth object instance
    try {
      if ((firebaseConfig as any).getAuthInstance.mockImplementation) {
        (firebaseConfig as any).getAuthInstance.mockImplementation(() => existingAuth);
      } else {
        (firebaseConfig as any).getAuthInstance = () => existingAuth;
      }
    } catch (e) {
      // ignore
    }
  }

  // Ensure the module export points at the same object instance
  (firebaseConfig as any).auth = existingAuth;
}

export function clearMockUser() {
  const existingAuth: any = (firebaseConfig as any).auth || {};
  existingAuth.currentUser = null;
  existingAuth.onAuthStateChanged = (cb: (u: any) => void) => cb(null);

  if (typeof (firebaseConfig as any).getAuthInstance === 'function') {
    try {
      (firebaseConfig as any).getAuthInstance.mockImplementation(() => existingAuth);
    } catch (e) {
      // ignore
    }
  }

  (firebaseConfig as any).auth = existingAuth;
}

export default {
  setMockUser,
  clearMockUser,
};

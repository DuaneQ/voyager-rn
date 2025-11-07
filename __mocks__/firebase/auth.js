/**
 * Mock for firebase/auth
 * Provides mock authentication methods for unit tests
 */

const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
};

const mockAuth = {
  currentUser: mockUser,
  onAuthStateChanged: jest.fn((callback) => {
    callback(mockUser);
    return jest.fn(); // Unsubscribe function
  }),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: mockUser })),
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: mockUser })),
  signOut: jest.fn(() => Promise.resolve()),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
  sendEmailVerification: jest.fn(() => Promise.resolve()),
};

export const getAuth = jest.fn(() => mockAuth);

export const signInWithEmailAndPassword = jest.fn(() => Promise.resolve({ user: mockUser }));

export const createUserWithEmailAndPassword = jest.fn(() => Promise.resolve({ user: mockUser }));

export const signOut = jest.fn(() => Promise.resolve());

export const sendPasswordResetEmail = jest.fn(() => Promise.resolve());

export const sendEmailVerification = jest.fn(() => Promise.resolve());

export const onAuthStateChanged = jest.fn((auth, callback) => {
  callback(mockUser);
  return jest.fn(); // Unsubscribe function
});

export const updateProfile = jest.fn(() => Promise.resolve());

export const updateEmail = jest.fn(() => Promise.resolve());

export const updatePassword = jest.fn(() => Promise.resolve());

export const deleteUser = jest.fn(() => Promise.resolve());

export const reauthenticateWithCredential = jest.fn(() => Promise.resolve());

export const EmailAuthProvider = {
  credential: jest.fn(() => ({})),
};

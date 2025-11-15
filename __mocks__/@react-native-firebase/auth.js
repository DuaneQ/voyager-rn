/**
 * Mock for @react-native-firebase/auth
 */

const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  emailVerified: true,
  isAnonymous: false,
  providerData: [],
  reload: jest.fn().mockResolvedValue(undefined),
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
};

const mockAuth = jest.fn(() => ({
  currentUser: mockUser,
  onAuthStateChanged: jest.fn((callback) => {
    // Immediately invoke callback with mock user
    setTimeout(() => callback(mockUser), 0);
    // Return unsubscribe function
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockUser }),
  createUserWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockUser }),
  signOut: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  signInWithCredential: jest.fn().mockResolvedValue({ user: mockUser }),
}));

// Add GoogleAuthProvider as a static property
mockAuth.GoogleAuthProvider = {
  credential: jest.fn((idToken) => ({ providerId: 'google.com', token: idToken })),
};

export default mockAuth;

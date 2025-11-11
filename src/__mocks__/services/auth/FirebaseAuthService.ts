/**
 * Mock for FirebaseAuthService
 * This mock provides test doubles for all FirebaseAuthService methods
 */

// Mock user data
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  emailVerified: true,
  displayName: 'Test User',
  photoURL: null,
};

// Mock auth state listeners
const authStateListeners: Array<(user: any) => void> = [];

export const FirebaseAuthService = {
  // Get current user
  getCurrentUser: jest.fn(() => mockUser),

  // Auth state observer
  onAuthStateChanged: jest.fn((callback: (user: any) => void) => {
    authStateListeners.push(callback);
    // Immediately invoke with current user
    setTimeout(() => callback(mockUser), 0);
    // Return unsubscribe function
    return jest.fn(() => {
      const index = authStateListeners.indexOf(callback);
      if (index > -1) {
        authStateListeners.splice(index, 1);
      }
    });
  }),

  // Sign in
  signIn: jest.fn(async (email: string, password: string) => ({
    user: mockUser,
    token: 'mock-id-token',
  })),

  // Sign up
  signUp: jest.fn(async (email: string, password: string) => ({
    user: { ...mockUser, emailVerified: false },
    token: 'mock-id-token',
  })),

  // Sign out
  signOut: jest.fn(async () => {
    authStateListeners.forEach(listener => listener(null));
  }),

  // Send password reset email
  sendPasswordResetEmail: jest.fn(async (email: string) => undefined),

  // Send email verification
  sendEmailVerification: jest.fn(async (idToken: string) => undefined),

  // Refresh token
  refreshToken: jest.fn(async (refreshToken: string) => ({
    idToken: 'new-mock-id-token',
    refreshToken: 'new-mock-refresh-token',
    expiresIn: '3600',
  })),

  // Get ID token
  getIdToken: jest.fn(async () => 'mock-id-token'),

  // Update profile
  updateProfile: jest.fn(async (idToken: string, displayName?: string, photoURL?: string) => ({
    ...mockUser,
    displayName: displayName || mockUser.displayName,
    photoURL: photoURL || mockUser.photoURL,
  })),
};

export default FirebaseAuthService;

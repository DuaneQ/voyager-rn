/**
 * Mock for @react-native-google-signin/google-signin
 * Used when the native module is not available (dev/testing)
 */

const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn().mockResolvedValue(true),
  signIn: jest.fn().mockResolvedValue({
    user: {
      id: 'mock-google-user-id',
      email: 'test@example.com',
      name: 'Test User',
      photo: 'https://via.placeholder.com/150',
    },
    idToken: 'mock-id-token',
  }),
  signOut: jest.fn().mockResolvedValue(null),
  revokeAccess: jest.fn().mockResolvedValue(null),
  isSignedIn: jest.fn().mockResolvedValue(false),
  getCurrentUser: jest.fn().mockResolvedValue(null),
};

const statusCodes = {
  SIGN_IN_CANCELLED: '1',
  IN_PROGRESS: '2',
  PLAY_SERVICES_NOT_AVAILABLE: '3',
};

export { GoogleSignin, statusCodes };
export default GoogleSignin;

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AuthPage from '../../../../src/pages/AuthPage';
import { AlertProvider } from '../../../../src/context/AlertContext';
import { AuthProvider } from '../../../../src/context/AuthContext';

// Mock GoogleSignin native module
const mockSignIn = jest.fn();
const mockHasPlayServices = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    hasPlayServices: () => mockHasPlayServices(),
    signIn: () => mockSignIn(),
  },
}));

// Mock FirebaseAuthService and UserProfileService
const mockSignInWithGoogleIdToken = jest.fn();
const mockCreateUserProfile = jest.fn();

jest.mock('../../../../src/services/auth/FirebaseAuthService', () => ({
  FirebaseAuthService: {
    initialize: jest.fn().mockResolvedValue(null),
    onAuthStateChanged: jest.fn().mockImplementation((cb: any) => {
      // immediately call with null and return unsubscribe
      setTimeout(() => cb(null), 0);
      return () => {};
    }),
    getCurrentUser: jest.fn().mockReturnValue(null),
    signInWithGoogleIdToken: (...args: any[]) => mockSignInWithGoogleIdToken(...args),
  },
}));

jest.mock('../../../../src/services/userProfile/UserProfileService', () => ({
  UserProfileService: {
    createUserProfile: (...args: any[]) => mockCreateUserProfile(...args),
  },
}));

describe('AuthPage Google button flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default GoogleSignin behavior
    mockHasPlayServices.mockResolvedValue(true);
    mockSignIn.mockResolvedValue({ idToken: 'mock-google-id-token', user: { email: 'g@example.com' } });
  });

  const Wrapper = ({ children }: any) => (
    <AlertProvider>
      <AuthProvider>{children}</AuthProvider>
    </AlertProvider>
  );

  it('calls FirebaseAuthService.signInWithGoogleIdToken when pressing Google Sign In', async () => {
    mockSignInWithGoogleIdToken.mockResolvedValue({ uid: 'g-user-1', email: 'g@example.com', isNewUser: false });

    const { getByTestId } = render(<AuthPage />, { wrapper: Wrapper });

    const googleButton = getByTestId('google-signin-button');

    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
      expect(mockSignInWithGoogleIdToken).toHaveBeenCalledWith('mock-google-id-token');
    });
  });

  it('creates user profile on Google Sign Up when isNewUser=true', async () => {
    // Make signInWithGoogleIdToken return isNewUser true
    mockSignInWithGoogleIdToken.mockResolvedValue({ uid: 'g-user-2', email: 'newg@example.com', isNewUser: true });

    const { getByTestId } = render(<AuthPage />, { wrapper: Wrapper });

    // Switch to register mode by pressing register link on login form
    const registerLink = getByTestId('register-link');
    fireEvent.press(registerLink);

    // Now press google signup button
    const googleSignupButton = getByTestId('google-signup-button');
    fireEvent.press(googleSignupButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
      expect(mockSignInWithGoogleIdToken).toHaveBeenCalledWith('mock-google-id-token');
      expect(mockCreateUserProfile).toHaveBeenCalledWith('g-user-2', expect.objectContaining({ email: 'newg@example.com' }));
    });
  });
});

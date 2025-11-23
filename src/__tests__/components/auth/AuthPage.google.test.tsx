import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AuthPage from '../../../../src/pages/AuthPage';
import { AlertProvider } from '../../../../src/context/AlertContext';
import { AuthProvider } from '../../../../src/context/AuthContext';

// Mock GoogleSignin native module
const mockSignIn = jest.fn();
const mockHasPlayServices = jest.fn();
const mockConfigure = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (config: any) => mockConfigure(config),
    hasPlayServices: () => mockHasPlayServices(),
    signIn: () => mockSignIn(),
  },
}));

// Mock FirebaseAuthService and UserProfileService
const mockSignInWithGoogleIdToken = jest.fn();
const mockGetUserProfile = jest.fn();
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
    signOut: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../../src/services/userProfile/UserProfileService', () => ({
  UserProfileService: {
    getUserProfile: (...args: any[]) => mockGetUserProfile(...args),
    createUserProfile: (...args: any[]) => mockCreateUserProfile(...args),
  },
}));

describe('AuthPage Google button flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default GoogleSignin behavior
    mockConfigure.mockReturnValue(undefined);
    mockHasPlayServices.mockResolvedValue(true);
    mockSignIn.mockResolvedValue({ idToken: 'mock-google-id-token', user: { email: 'g@example.com' } });
  });

  const Wrapper = ({ children }: any) => (
    <AlertProvider>
      <AuthProvider>{children}</AuthProvider>
    </AlertProvider>
  );

  it('calls FirebaseAuthService.signInWithGoogleIdToken when pressing Google Sign In', async () => {
    const mockUser = { uid: 'g-user-1', email: 'g@example.com', isNewUser: false };
    mockSignInWithGoogleIdToken.mockResolvedValue(mockUser);
    
    // Mock existing user profile (sign in scenario)
    mockGetUserProfile.mockResolvedValue({ uid: 'g-user-1', email: 'g@example.com', username: 'testuser' });

    const { getByTestId } = render(<AuthPage />, { wrapper: Wrapper });

    const googleButton = getByTestId('google-signin-button');

    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
      expect(mockSignInWithGoogleIdToken).toHaveBeenCalledWith('mock-google-id-token');
      expect(mockGetUserProfile).toHaveBeenCalledWith('g-user-1');
    });
  });

  it('creates user profile on Google Sign Up when profile does not exist', async () => {
    // Make signInWithGoogleIdToken return a new user
    const mockUser = { uid: 'g-user-2', email: 'newg@example.com', displayName: 'New User', isNewUser: true };
    mockSignInWithGoogleIdToken.mockResolvedValue(mockUser);
    
    // Mock no existing profile (getUserProfile throws error)
    mockGetUserProfile.mockRejectedValue(new Error('Profile not found'));
    
    // Mock successful profile creation
    mockCreateUserProfile.mockResolvedValue({ uid: 'g-user-2', email: 'newg@example.com', username: 'New User' });

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
      expect(mockGetUserProfile).toHaveBeenCalledWith('g-user-2');
      expect(mockCreateUserProfile).toHaveBeenCalledWith('g-user-2', expect.objectContaining({ 
        email: 'newg@example.com',
        username: 'New User',
      }));
    });
  });

  describe('Scenario 1: New user tries Sign In (ACCOUNT_NOT_FOUND)', () => {
    it('should show error and switch to register mode when profile not found', async () => {
      const mockUser = { uid: 'new-user-123', email: 'newuser@gmail.com' };
      mockSignInWithGoogleIdToken.mockResolvedValue(mockUser);
      
      // Mock getUserProfile to reject (no profile)
      mockGetUserProfile.mockRejectedValue(new Error('Profile not found'));

      const { getByTestId, findByText } = render(<AuthPage />, { wrapper: Wrapper });

      // Should start on login form
      const googleSignInButton = getByTestId('google-signin-button');
      fireEvent.press(googleSignInButton);

      // Wait for error alert
      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledWith('new-user-123');
      });

      // Should now be on register form (mode switched)
      await waitFor(() => {
        const googleSignUpButton = getByTestId('google-signup-button');
        expect(googleSignUpButton).toBeTruthy();
      });
    });
  });

  describe('Scenario 2: Existing user tries Sign Up (no duplicate profile)', () => {
    it('should log in existing user without creating duplicate profile', async () => {
      const mockUser = { uid: 'existing-456', email: 'existing@gmail.com', displayName: 'Existing User' };
      mockSignInWithGoogleIdToken.mockResolvedValue(mockUser);
      
      // Mock getUserProfile to succeed (profile exists)
      mockGetUserProfile.mockResolvedValue({
        uid: 'existing-456',
        email: 'existing@gmail.com',
        username: 'existinguser'
      });

      const { getByTestId } = render(<AuthPage />, { wrapper: Wrapper });

      // Switch to register mode
      const registerLink = getByTestId('register-link');
      fireEvent.press(registerLink);

      // Press google signup button
      const googleSignupButton = getByTestId('google-signup-button');
      fireEvent.press(googleSignupButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
        expect(mockSignInWithGoogleIdToken).toHaveBeenCalledWith('mock-google-id-token');
        expect(mockGetUserProfile).toHaveBeenCalledWith('existing-456');
        // Should NOT create profile
        expect(mockCreateUserProfile).not.toHaveBeenCalled();
      });
    });
  });

  describe('Scenario 3: New user signs up successfully', () => {
    it('should create profile and show success message', async () => {
      const mockUser = { uid: 'new-789', email: 'new@gmail.com', displayName: 'New User' };
      mockSignInWithGoogleIdToken.mockResolvedValue(mockUser);
      
      // Mock no existing profile
      mockGetUserProfile.mockRejectedValue(new Error('Profile not found'));
      
      // Mock successful profile creation
      mockCreateUserProfile.mockResolvedValue({
        uid: 'new-789',
        email: 'new@gmail.com',
        username: 'New User'
      });

      const { getByTestId } = render(<AuthPage />, { wrapper: Wrapper });

      // Switch to register mode
      const registerLink = getByTestId('register-link');
      fireEvent.press(registerLink);

      // Press google signup button
      const googleSignupButton = getByTestId('google-signup-button');
      fireEvent.press(googleSignupButton);

      await waitFor(() => {
        expect(mockCreateUserProfile).toHaveBeenCalledWith('new-789', expect.objectContaining({
          email: 'new@gmail.com',
          username: 'New User',
          subscriptionType: 'free',
        }));
      });
    });
  });

  describe('Scenario 4: Existing user signs in', () => {
    it('should sign in successfully when profile exists', async () => {
      const mockUser = { uid: 'returning-101', email: 'returning@gmail.com' };
      mockSignInWithGoogleIdToken.mockResolvedValue(mockUser);
      
      // Mock profile exists
      mockGetUserProfile.mockResolvedValue({
        uid: 'returning-101',
        email: 'returning@gmail.com',
        username: 'returninguser'
      });

      const { getByTestId } = render(<AuthPage />, { wrapper: Wrapper });

      const googleSignInButton = getByTestId('google-signin-button');
      fireEvent.press(googleSignInButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
        expect(mockSignInWithGoogleIdToken).toHaveBeenCalledWith('mock-google-id-token');
        expect(mockGetUserProfile).toHaveBeenCalledWith('returning-101');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle profile creation failure gracefully', async () => {
      const mockUser = { uid: 'fail-999', email: 'fail@gmail.com', displayName: 'Fail User' };
      mockSignInWithGoogleIdToken.mockResolvedValue(mockUser);
      
      // Mock no profile
      mockGetUserProfile.mockRejectedValue(new Error('Profile not found'));
      
      // Mock profile creation failure
      mockCreateUserProfile.mockRejectedValue(new Error('Cloud Function error'));

      const { getByTestId } = render(<AuthPage />, { wrapper: Wrapper });

      // Switch to register mode
      const registerLink = getByTestId('register-link');
      fireEvent.press(registerLink);

      // Press google signup button
      const googleSignupButton = getByTestId('google-signup-button');
      fireEvent.press(googleSignupButton);

      await waitFor(() => {
        expect(mockCreateUserProfile).toHaveBeenCalled();
        // Error should be handled (not crash)
      });
    });

    it('should handle Google popup cancellation', async () => {
      // Mock user canceling Google popup
      mockSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });

      const { getByTestId } = render(<AuthPage />, { wrapper: Wrapper });

      const googleSignInButton = getByTestId('google-signin-button');
      fireEvent.press(googleSignInButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
        // Should handle cancellation gracefully
      });
    });
  });
});


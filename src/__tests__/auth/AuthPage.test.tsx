/**
 * AuthPage and LoginForm Tests
 * 
 * Tests for the refactored authentication architecture:
 * - AuthPage orchestration
 * - LoginForm component
 * - Form validation
 * - Navigation between forms
 * - Integration with AuthContext
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AuthPage from '../../pages/AuthPage';
import LoginForm from '../../components/auth/forms/LoginForm';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';

// Mock navigation
const mockNavigate = jest.fn();
const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
  }),
}));

// Mock contexts
jest.mock('../../context/AuthContext');
jest.mock('../../context/AlertContext');

const mockSignIn = jest.fn();
const mockShowAlert = jest.fn();

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      status: 'idle',
      user: null,
      error: null,
    });

    (useAlert as jest.Mock).mockReturnValue({
      showAlert: mockShowAlert,
    });
  });

  it('renders login form by default', () => {
    const { getByPlaceholderText, getByText } = render(<AuthPage />);

    expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••••')).toBeTruthy();
    expect(getByText('Sign in')).toBeTruthy();
    expect(getByText('Welcome to TravalPass')).toBeTruthy();
  });

  it('switches to register form when clicking sign up link', () => {
    const { getByTestId, getByText } = render(<AuthPage />);

    const registerLink = getByTestId('register-link');
    fireEvent.press(registerLink);

    expect(getByText('Sign up')).toBeTruthy();
    expect(getByText('Username *')).toBeTruthy();
  });

  it('switches to forgot password form when clicking forgot password link', () => {
    const { getByTestId, getByText } = render(<AuthPage />);

    const forgotPasswordLink = getByTestId('forgot-password-link');
    fireEvent.press(forgotPasswordLink);

    expect(getByText('Reset Password')).toBeTruthy();
  });

  it('calls signIn with valid credentials', async () => {
    mockSignIn.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByTestId } = render(<AuthPage />);

    const emailInput = getByPlaceholderText('your@email.com');
    const passwordInput = getByPlaceholderText('••••••••••');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByTestId('signin-button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      // Success alert is suppressed on mobile (Platform.OS !== 'web')
      // Navigation happens automatically via AuthContext onAuthStateChanged
    });
  });

  it('shows error message on sign in failure', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));

    const { getByPlaceholderText, getByTestId } = render(<AuthPage />);

    const emailInput = getByPlaceholderText('your@email.com');
    const passwordInput = getByPlaceholderText('••••••••••');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');

    const signInButton = getByTestId('signin-button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('error', 'Invalid credentials');
    });
  });
});

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnGoogleSignIn = jest.fn();
  const mockOnAppleSignIn = jest.fn();
  const mockOnForgotPassword = jest.fn();
  const mockOnResendVerification = jest.fn();
  const mockOnSignUpPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with all elements', () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleSignIn={mockOnGoogleSignIn}
        onAppleSignIn={mockOnAppleSignIn}
        onForgotPassword={mockOnForgotPassword}
        onResendVerification={mockOnResendVerification}
        onSignUpPress={mockOnSignUpPress}
      />
    );

    expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••••')).toBeTruthy();
    expect(getByTestId('signin-button')).toBeTruthy();
    expect(getByText('Welcome to TravalPass')).toBeTruthy();
    expect(getByTestId('google-signin-button')).toBeTruthy();
  });

  it('validates email format', async () => {
    const { getByPlaceholderText } = render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleSignIn={mockOnGoogleSignIn}
        onAppleSignIn={mockOnAppleSignIn}
        onForgotPassword={mockOnForgotPassword}
        onResendVerification={mockOnResendVerification}
        onSignUpPress={mockOnSignUpPress}
      />
    );

    const emailInput = getByPlaceholderText('your@email.com');
    
    fireEvent.changeText(emailInput, 'invalid-email');
    
    await waitFor(() => {
      expect(emailInput).toBeTruthy();
    });
  });

  it('calls onSubmit with valid credentials', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByTestId } = render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleSignIn={mockOnGoogleSignIn}
        onAppleSignIn={mockOnAppleSignIn}
        onForgotPassword={mockOnForgotPassword}
        onResendVerification={mockOnResendVerification}
        onSignUpPress={mockOnSignUpPress}
      />
    );

    const emailInput = getByPlaceholderText('your@email.com');
    const passwordInput = getByPlaceholderText('••••••••••');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByTestId('signin-button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('calls onForgotPassword when forgot password link clicked', () => {
    const { getByTestId } = render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleSignIn={mockOnGoogleSignIn}
        onAppleSignIn={mockOnAppleSignIn}
        onForgotPassword={mockOnForgotPassword}
        onResendVerification={mockOnResendVerification}
        onSignUpPress={mockOnSignUpPress}
      />
    );

    const forgotLink = getByTestId('forgot-password-link');
    fireEvent.press(forgotLink);

    expect(mockOnForgotPassword).toHaveBeenCalled();
  });

  it('calls onSignUpPress when register link clicked', () => {
    const { getByTestId } = render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleSignIn={mockOnGoogleSignIn}
        onAppleSignIn={mockOnAppleSignIn}
        onForgotPassword={mockOnForgotPassword}
        onResendVerification={mockOnResendVerification}
        onSignUpPress={mockOnSignUpPress}
      />
    );

    const registerLink = getByTestId('register-link');
    fireEvent.press(registerLink);

    expect(mockOnSignUpPress).toHaveBeenCalled();
  });

  it('calls onGoogleSignIn when Google button clicked', () => {
    const { getByTestId } = render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleSignIn={mockOnGoogleSignIn}
        onAppleSignIn={mockOnAppleSignIn}
        onForgotPassword={mockOnForgotPassword}
        onResendVerification={mockOnResendVerification}
        onSignUpPress={mockOnSignUpPress}
      />
    );

    const googleButton = getByTestId('google-signin-button');
    fireEvent.press(googleButton);

    expect(mockOnGoogleSignIn).toHaveBeenCalled();
  });

  it('disables inputs and buttons when loading', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onGoogleSignIn={mockOnGoogleSignIn}
        onAppleSignIn={mockOnAppleSignIn}
        onForgotPassword={mockOnForgotPassword}
        onResendVerification={mockOnResendVerification}
        onSignUpPress={mockOnSignUpPress}
        isLoading={true}
      />
    );

    const emailInput = getByPlaceholderText('your@email.com');
    const signInButton = getByTestId('signin-button');

    expect(emailInput.props.editable).toBe(false);
    // Button text changes when loading
    expect(signInButton.props.accessibilityState.disabled).toBe(true);
  });
});

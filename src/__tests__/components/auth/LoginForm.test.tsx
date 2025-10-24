/**
 * LoginForm Component Tests
 * 
 * Tests matching PWA's SignInForm.tsx functionality:
 * - Email/password validation
 * - Form submission
 * - Google Sign-In button
 * - Navigation to register, forgot password, resend verification
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginForm from '../../../components/auth/forms/LoginForm';

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnGoogleSignIn = jest.fn();
  const mockOnForgotPassword = jest.fn();
  const mockOnResendVerification = jest.fn();
  const mockOnSignUpPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onGoogleSignIn: mockOnGoogleSignIn,
    onForgotPassword: mockOnForgotPassword,
    onResendVerification: mockOnResendVerification,
    onSignUpPress: mockOnSignUpPress,
    isLoading: false,
  };

  it('renders correctly with all elements', () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <LoginForm {...defaultProps} />
    );

    expect(getByText('Sign in')).toBeTruthy();
    expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••••')).toBeTruthy();
    expect(getByTestId('signin-button')).toBeTruthy();
    expect(getByTestId('google-signin-button')).toBeTruthy();
  });

  describe('Email Validation', () => {
    it('prevents submit when email is invalid', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <LoginForm {...defaultProps} />
      );

      const emailInput = getByPlaceholderText('your@email.com');
      const submitButton = getByTestId('signin-button');
      
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('does not show error for valid email', async () => {
      const { getByPlaceholderText, queryByText } = render(
        <LoginForm {...defaultProps} />
      );

      const emailInput = getByPlaceholderText('your@email.com');
      
      fireEvent.changeText(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(queryByText('Please enter a valid email address')).toBeNull();
      });
    });

    it('accepts emails with various valid formats', async () => {
      const { getByPlaceholderText, queryByText } = render(
        <LoginForm {...defaultProps} />
      );

      const emailInput = getByPlaceholderText('your@email.com');
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
      ];

      for (const email of validEmails) {
        fireEvent.changeText(emailInput, email);
        await waitFor(() => {
          expect(queryByText('Please enter a valid email address')).toBeNull();
        });
      }
    });
  });

  describe('Password Validation', () => {
    it('prevents submit when password is too short', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <LoginForm {...defaultProps} />
      );

      const emailInput = getByPlaceholderText('your@email.com');
      const passwordInput = getByPlaceholderText('••••••••••');
      const submitButton = getByTestId('signin-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '12345');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('does not show error for password 6 or more characters', async () => {
      const { getByPlaceholderText, queryByText } = render(
        <LoginForm {...defaultProps} />
      );

      const passwordInput = getByPlaceholderText('••••••••••');
      
      fireEvent.changeText(passwordInput, '123456');

      await waitFor(() => {
        expect(queryByText('Password must be at least 6 characters')).toBeNull();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with valid credentials', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <LoginForm {...defaultProps} />
      );

      const emailInput = getByPlaceholderText('your@email.com');
      const passwordInput = getByPlaceholderText('••••••••••');
      const submitButton = getByTestId('signin-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('prevents submit with invalid email', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <LoginForm {...defaultProps} />
      );

      const emailInput = getByPlaceholderText('your@email.com');
      const passwordInput = getByPlaceholderText('••••••••••');
      const submitButton = getByTestId('signin-button');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(submitButton);

      // Should not call onSubmit with invalid email
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('prevents submit with short password', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <LoginForm {...defaultProps} />
      );

      const emailInput = getByPlaceholderText('your@email.com');
      const passwordInput = getByPlaceholderText('••••••••••');
      const submitButton = getByTestId('signin-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '12345');
      fireEvent.press(submitButton);

      // Should not call onSubmit with short password
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('prevents submit with empty fields', async () => {
      const { getByTestId } = render(<LoginForm {...defaultProps} />);

      const submitButton = getByTestId('signin-button');
      fireEvent.press(submitButton);

      // Should not call onSubmit with empty fields
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('disables inputs and buttons when loading', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <LoginForm {...defaultProps} isLoading={true} />
      );

      const emailInput = getByPlaceholderText('your@email.com');
      const passwordInput = getByPlaceholderText('••••••••••');

      // React Native TextInput uses editable prop
      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);
    });

    it('shows "SIGNING IN..." text when loading', () => {
      const { getByText } = render(
        <LoginForm {...defaultProps} isLoading={true} />
      );

      expect(getByText('SIGNING IN...')).toBeTruthy();
    });
  });

  describe('Google Sign-In', () => {
    it('calls onGoogleSignIn when Google button is pressed', () => {
      const { getByTestId } = render(<LoginForm {...defaultProps} />);

      const googleButton = getByTestId('google-signin-button');
      fireEvent.press(googleButton);

      expect(mockOnGoogleSignIn).toHaveBeenCalled();
    });

    it('does not call onGoogleSignIn when loading', () => {
      const { getByTestId } = render(
        <LoginForm {...defaultProps} isLoading={true} />
      );

      const googleButton = getByTestId('google-signin-button');
      fireEvent.press(googleButton);

      expect(mockOnGoogleSignIn).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Links', () => {
    it('calls onForgotPassword when forgot password link is pressed', () => {
      const { getByTestId } = render(<LoginForm {...defaultProps} />);

      const forgotLink = getByTestId('forgot-password-link');
      fireEvent.press(forgotLink);

      expect(mockOnForgotPassword).toHaveBeenCalled();
    });

    it('calls onResendVerification when resend verification link is pressed', () => {
      const { getByTestId } = render(<LoginForm {...defaultProps} />);

      const resendLink = getByTestId('resend-verification-link');
      fireEvent.press(resendLink);

      expect(mockOnResendVerification).toHaveBeenCalled();
    });

    it('calls onSignUpPress when register link is pressed', () => {
      const { getByTestId } = render(<LoginForm {...defaultProps} />);

      const registerLink = getByTestId('register-link');
      fireEvent.press(registerLink);

      expect(mockOnSignUpPress).toHaveBeenCalled();
    });
  });
});

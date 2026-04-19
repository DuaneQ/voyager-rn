import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterForm from '../../../components/auth/forms/RegisterForm';

describe('RegisterForm', () => {
  const mockOnEmailLink = jest.fn();
  const mockOnGoogleSignUp = jest.fn();
  const mockOnAppleSignUp = jest.fn();
  const mockOnSignInPress = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const defaultProps = {
    onEmailLink: mockOnEmailLink,
    onGoogleSignUp: mockOnGoogleSignUp,
    onAppleSignUp: mockOnAppleSignUp,
    onSignInPress: mockOnSignInPress,
    isLoading: false,
  };

  it('renders step 1 elements', () => {
    const { getByText, getByPlaceholderText, getByTestId, queryByPlaceholderText } = render(
      <RegisterForm {...defaultProps} />
    );

    expect(getByText('Sign up')).toBeTruthy();
    expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    expect(getByTestId('signup-button')).toBeTruthy();
    expect(getByTestId('google-signup-button')).toBeTruthy();
    // No username, password, or confirm password fields
    expect(queryByPlaceholderText('Username')).toBeNull();
    expect(queryByPlaceholderText('Enter your password')).toBeNull();
    expect(queryByPlaceholderText('Confirm your password')).toBeNull();
  });

  it('validates email and prevents submit on invalid', async () => {
    const { getByPlaceholderText, getByTestId, queryByText } = render(
      <RegisterForm {...defaultProps} />
    );

    const email = getByPlaceholderText('your@email.com');
    const submit = getByTestId('signup-button');

    fireEvent.changeText(email, 'not-an-email');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(queryByText('Please enter a valid email address')).toBeTruthy();
    });

    expect(mockOnEmailLink).not.toHaveBeenCalled();
  });

  it('sends email link with valid email', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <RegisterForm {...defaultProps} />
    );

    const email = getByPlaceholderText('your@email.com');
    const submit = getByTestId('signup-button');

    fireEvent.changeText(email, 'test@example.com');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(mockOnEmailLink).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows step 2 after email link sent', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <RegisterForm {...defaultProps} />
    );

    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(getByText('Check your inbox')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
      expect(getByTestId('resend-link-button')).toBeTruthy();
      expect(getByTestId('different-email-button')).toBeTruthy();
    });
  });

  it('resends link from step 2', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <RegisterForm {...defaultProps} />
    );

    // Go to step 2
    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(getByTestId('resend-link-button')).toBeTruthy();
    });

    mockOnEmailLink.mockClear();
    fireEvent.press(getByTestId('resend-link-button'));

    await waitFor(() => {
      expect(mockOnEmailLink).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('returns to step 1 when "use different email" pressed', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <RegisterForm {...defaultProps} />
    );

    // Go to step 2
    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(getByText('Check your inbox')).toBeTruthy();
    });

    // Press "Use different email"
    fireEvent.press(getByTestId('different-email-button'));

    await waitFor(() => {
      expect(getByText('Sign up')).toBeTruthy();
      expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    });
  });

  it('calls onGoogleSignUp when google button pressed', () => {
    const { getByTestId } = render(<RegisterForm {...defaultProps} />);
    const google = getByTestId('google-signup-button');
    fireEvent.press(google);
    expect(mockOnGoogleSignUp).toHaveBeenCalled();
  });

  it('calls onSignInPress when sign in link pressed', () => {
    const { getByTestId } = render(<RegisterForm {...defaultProps} />);
    const link = getByTestId('signin-link');
    fireEvent.press(link);
    expect(mockOnSignInPress).toHaveBeenCalled();
  });

  it('disables email input when loading', () => {
    const { getByPlaceholderText } = render(<RegisterForm {...defaultProps} isLoading={true} />);
    const email = getByPlaceholderText('your@email.com');
    expect(email.props.editable).toBe(false);
  });

  it('clears email error when input becomes empty', async () => {
    const { getByPlaceholderText, queryByText } = render(<RegisterForm {...defaultProps} />);
    const email = getByPlaceholderText('your@email.com');

    // Set invalid email to trigger error
    fireEvent.changeText(email, 'not-an-email');
    await waitFor(() => {
      expect(queryByText('Please enter a valid email address')).toBeTruthy();
    });

    // Clear email - error should disappear
    fireEvent.changeText(email, '');
    await waitFor(() => {
      expect(queryByText('Please enter a valid email address')).toBeNull();
    });
  });

  it('prevents submit when email is empty', async () => {
    const { getByTestId } = render(<RegisterForm {...defaultProps} />);
    const submit = getByTestId('signup-button');

    fireEvent.press(submit);

    await waitFor(() => {
      expect(mockOnEmailLink).not.toHaveBeenCalled();
    });
  });

  it('shows trust microcopy', () => {
    const { getByText } = render(<RegisterForm {...defaultProps} />);
    expect(getByText('Free forever · No card required · Just your email')).toBeTruthy();
  });
});

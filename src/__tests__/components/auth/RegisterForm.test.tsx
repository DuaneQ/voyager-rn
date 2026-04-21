import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterForm from '../../../components/auth/forms/RegisterForm';

describe('RegisterForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnGoogleSignUp = jest.fn();
  const mockOnAppleSignUp = jest.fn();
  const mockOnSignInPress = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onGoogleSignUp: mockOnGoogleSignUp,
    onAppleSignUp: mockOnAppleSignUp,
    onSignInPress: mockOnSignInPress,
    isLoading: false,
  };

  it('renders all form fields', () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <RegisterForm {...defaultProps} />
    );

    expect(getByText('Sign up')).toBeTruthy();
    expect(getByPlaceholderText('Choose a username')).toBeTruthy();
    expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    expect(getByPlaceholderText('Min 10 characters')).toBeTruthy();
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
    expect(getByTestId('signup-button')).toBeTruthy();
    expect(getByTestId('google-signup-button')).toBeTruthy();
  });

  it('shows validation errors when submit is pressed with empty required fields', async () => {
    const { getByTestId, queryByText } = render(
      <RegisterForm {...defaultProps} />
    );

    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(queryByText('Username must be at least 2 characters')).toBeTruthy();
      expect(queryByText('Please enter a valid email address')).toBeTruthy();
      expect(queryByText('Password must be at least 10 characters')).toBeTruthy();
      expect(queryByText('Passwords do not match')).toBeTruthy();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates username and shows error', async () => {
    const { getByPlaceholderText, getByTestId, queryByText } = render(
      <RegisterForm {...defaultProps} />
    );

    const username = getByPlaceholderText('Choose a username');
    const submit = getByTestId('signup-button');

    fireEvent.changeText(username, 'a');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(queryByText('Username must be at least 2 characters')).toBeTruthy();
    });
  });

  it('validates email format', async () => {
    const { getByPlaceholderText, getByTestId, queryByText } = render(
      <RegisterForm {...defaultProps} />
    );

    const username = getByPlaceholderText('Choose a username');
    const email = getByPlaceholderText('your@email.com');
    const submit = getByTestId('signup-button');

    fireEvent.changeText(username, 'validuser');
    fireEvent.changeText(email, 'not-an-email');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(queryByText('Please enter a valid email address')).toBeTruthy();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates password length', async () => {
    const { getByPlaceholderText, getByTestId, queryByText } = render(
      <RegisterForm {...defaultProps} />
    );

    const username = getByPlaceholderText('Choose a username');
    const email = getByPlaceholderText('your@email.com');
    const password = getByPlaceholderText('Min 10 characters');
    const confirm = getByPlaceholderText('Confirm your password');
    const submit = getByTestId('signup-button');

    fireEvent.changeText(username, 'validuser');
    fireEvent.changeText(email, 'test@example.com');
    fireEvent.changeText(password, '12345');
    fireEvent.changeText(confirm, '12345');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(queryByText('Password must be at least 10 characters')).toBeTruthy();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates password confirmation mismatch', async () => {
    const { getByPlaceholderText, getByTestId, queryByText } = render(
      <RegisterForm {...defaultProps} />
    );

    const username = getByPlaceholderText('Choose a username');
    const email = getByPlaceholderText('your@email.com');
    const password = getByPlaceholderText('Min 10 characters');
    const confirm = getByPlaceholderText('Confirm your password');
    const submit = getByTestId('signup-button');

    fireEvent.changeText(username, 'validuser');
    fireEvent.changeText(email, 'test@example.com');
    fireEvent.changeText(password, 'password1234');
    fireEvent.changeText(confirm, 'password9999');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(queryByText('Passwords do not match')).toBeTruthy();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits with valid credentials', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByTestId } = render(
      <RegisterForm {...defaultProps} />
    );

    const username = getByPlaceholderText('Choose a username');
    const email = getByPlaceholderText('your@email.com');
    const password = getByPlaceholderText('Min 10 characters');
    const confirm = getByPlaceholderText('Confirm your password');
    const submit = getByTestId('signup-button');

    fireEvent.changeText(username, 'testuser');
    fireEvent.changeText(email, 'test@example.com');
    fireEvent.changeText(password, 'password1234');
    fireEvent.changeText(confirm, 'password1234');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('testuser', 'test@example.com', 'password1234');
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

  it('disables inputs when loading', () => {
    const { getByPlaceholderText } = render(
      <RegisterForm {...defaultProps} isLoading={true} />
    );

    const username = getByPlaceholderText('Choose a username');
    const email = getByPlaceholderText('your@email.com');
    const password = getByPlaceholderText('Min 10 characters');
    const confirm = getByPlaceholderText('Confirm your password');

    expect(username.props.editable).toBe(false);
    expect(email.props.editable).toBe(false);
    expect(password.props.editable).toBe(false);
    expect(confirm.props.editable).toBe(false);
  });

  it('toggles password visibility', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <RegisterForm {...defaultProps} />
    );

    const password = getByPlaceholderText('Min 10 characters');
    const toggle = getByTestId('toggle-password-visibility');

    expect(password.props.secureTextEntry).toBe(true);

    fireEvent.press(toggle);

    expect(getByPlaceholderText('Min 10 characters').props.secureTextEntry).toBe(false);
  });

  it('toggles confirm password visibility', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <RegisterForm {...defaultProps} />
    );

    const confirm = getByPlaceholderText('Confirm your password');
    const toggle = getByTestId('toggle-confirm-visibility');

    expect(confirm.props.secureTextEntry).toBe(true);

    fireEvent.press(toggle);

    expect(getByPlaceholderText('Confirm your password').props.secureTextEntry).toBe(false);
  });
});


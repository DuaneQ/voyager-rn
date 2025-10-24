import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterForm from '../../../components/auth/forms/RegisterForm';

describe('RegisterForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnGoogleSignUp = jest.fn();
  const mockOnSignInPress = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onGoogleSignUp: mockOnGoogleSignUp,
    onSignInPress: mockOnSignInPress,
    isLoading: false,
  };

  it('renders all elements', () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <RegisterForm {...defaultProps} />
    );

    expect(getByText('Sign up')).toBeTruthy();
    expect(getByPlaceholderText('Username')).toBeTruthy();
    expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
    expect(getByTestId('signup-button')).toBeTruthy();
    expect(getByTestId('google-signup-button')).toBeTruthy();
  });

  it('validates username, email and password and prevents submit on invalid', async () => {
    const { getByPlaceholderText, getByTestId, queryByText } = render(
      <RegisterForm {...defaultProps} />
    );

    const username = getByPlaceholderText('Username');
    const email = getByPlaceholderText('your@email.com');
    const password = getByPlaceholderText('Enter your password');
    const confirm = getByPlaceholderText('Confirm your password');
    const submit = getByTestId('signup-button');

    // invalid entries
    fireEvent.changeText(username, 'A');
    fireEvent.changeText(email, 'not-an-email');
    fireEvent.changeText(password, 'short');
    fireEvent.changeText(confirm, 'short');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(queryByText('Username must be at least 2 characters')).toBeTruthy();
      expect(queryByText('Please enter a valid email address')).toBeTruthy();
      expect(queryByText('Password must be at least 10 characters')).toBeTruthy();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits with valid inputs', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <RegisterForm {...defaultProps} />
    );

    const username = getByPlaceholderText('Username');
    const email = getByPlaceholderText('your@email.com');
    const password = getByPlaceholderText('Enter your password');
    const confirm = getByPlaceholderText('Confirm your password');
    const submit = getByTestId('signup-button');

    fireEvent.changeText(username, 'Test User');
    fireEvent.changeText(email, 'test@example.com');
    fireEvent.changeText(password, 'longenoughpass');
    fireEvent.changeText(confirm, 'longenoughpass');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('Test User', 'test@example.com', 'longenoughpass');
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
    const { getByPlaceholderText } = render(<RegisterForm {...defaultProps} isLoading={true} />);
    const username = getByPlaceholderText('Username');
    const email = getByPlaceholderText('your@email.com');
    expect(username.props.editable).toBe(false);
    expect(email.props.editable).toBe(false);
  });
});

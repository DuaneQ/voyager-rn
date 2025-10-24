import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordForm from '../../../components/auth/forms/ForgotPasswordForm';

describe('ForgotPasswordForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnBackPress = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onBackPress: mockOnBackPress,
    isLoading: false,
  };

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <ForgotPasswordForm {...defaultProps} />
    );

    expect(getByText('Reset Password')).toBeTruthy();
    expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    expect(getByTestId('reset-password-button')).toBeTruthy();
    expect(getByTestId('back-to-login-link')).toBeTruthy();
  });

  it('validates email and prevents submit for invalid', async () => {
    const { getByPlaceholderText, getByTestId } = render(<ForgotPasswordForm {...defaultProps} />);

    const email = getByPlaceholderText('your@email.com');
    const submit = getByTestId('reset-password-button');

    fireEvent.changeText(email, 'bad-email');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it('calls onSubmit with valid email', async () => {
    const { getByPlaceholderText, getByTestId } = render(<ForgotPasswordForm {...defaultProps} />);

    const email = getByPlaceholderText('your@email.com');
    const submit = getByTestId('reset-password-button');

    fireEvent.changeText(email, 'test@example.com');
    fireEvent.press(submit);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('calls onBackPress when back link pressed', () => {
    const { getByTestId } = render(<ForgotPasswordForm {...defaultProps} />);
    const back = getByTestId('back-to-login-link');
    fireEvent.press(back);
    expect(mockOnBackPress).toHaveBeenCalled();
  });

  it('disables inputs when loading', () => {
    const { getByPlaceholderText } = render(<ForgotPasswordForm {...defaultProps} isLoading={true} />);
    const email = getByPlaceholderText('your@email.com');
    expect(email.props.editable).toBe(false);
  });
});

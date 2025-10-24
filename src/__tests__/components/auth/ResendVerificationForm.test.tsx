import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ResendVerificationForm from '../../../components/auth/forms/ResendVerificationForm';

describe('ResendVerificationForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnBackPress = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onBackPress: mockOnBackPress,
    isLoading: false,
  };

  it('renders correctly', () => {
    const { getByText, getByTestId } = render(<ResendVerificationForm {...defaultProps} />);
    expect(getByText('Resend Email Verification')).toBeTruthy();
    expect(getByTestId('resend-verification-button')).toBeTruthy();
    expect(getByTestId('back-to-login-link')).toBeTruthy();
  });

  it('calls onSubmit when button pressed', async () => {
    const { getByTestId } = render(<ResendVerificationForm {...defaultProps} />);
    const btn = getByTestId('resend-verification-button');
    fireEvent.press(btn);
    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled());
  });

  it('calls onBackPress when back link pressed', () => {
    const { getByTestId } = render(<ResendVerificationForm {...defaultProps} />);
    const back = getByTestId('back-to-login-link');
    fireEvent.press(back);
    expect(mockOnBackPress).toHaveBeenCalled();
  });

  it('disables button when loading', () => {
    const { getByTestId } = render(<ResendVerificationForm {...defaultProps} isLoading={true} />);
  const btn = getByTestId('resend-verification-button');
  // TouchableOpacity renders accessibilityState.disabled in test renderer
  expect(btn.props.accessibilityState?.disabled).toBe(true);
  });
});

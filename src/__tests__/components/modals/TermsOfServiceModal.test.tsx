/**
 * Tests for TermsOfServiceModal component (Quick Agreement)
 * Verifies modal UI and user interactions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TermsOfServiceModal } from '../../../components/modals/TermsOfServiceModal';

// Mock the full legal terms sub-modal so it doesn't require native module setup
jest.mock('../../../components/modals/legal/TermsOfServiceModal', () => ({
  TermsOfServiceModal: ({ visible }: { visible: boolean }) =>
    visible ? require('react-native').View : null,
}));

describe('TermsOfServiceModal', () => {
  const mockOnAccept = jest.fn();
  const mockOnDecline = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAccept.mockResolvedValue(undefined);
  });

  it('should render Quick Agreement title and body when visible', () => {
    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('Quick Agreement')).toBeTruthy();
    expect(getByText(/By continuing, you agree to our Terms/i)).toBeTruthy();
  });

  it('should not be visible when visible prop is false', () => {
    const { queryByText } = render(
      <TermsOfServiceModal
        visible={false}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(queryByText('Quick Agreement')).toBeFalsy();
  });

  it('should render View Terms and Continue buttons', () => {
    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('View Terms')).toBeTruthy();
    expect(getByText('Continue')).toBeTruthy();
  });

  it('should call onAccept when Continue is pressed', async () => {
    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalledTimes(1);
    });
  });

  it('should not call onAccept a second time while accepting is in progress', async () => {
    // onAccept never resolves during this test
    mockOnAccept.mockReturnValue(new Promise(() => {}));

    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const button = getByText('Continue');
    fireEvent.press(button);
    fireEvent.press(button);

    expect(mockOnAccept).toHaveBeenCalledTimes(1);
  });

  it('should show loading spinner and disable Continue when loading prop is true', () => {
    const { queryByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
        loading={true}
      />
    );

    // "Continue" text is replaced by ActivityIndicator when loading
    expect(queryByText('Continue')).toBeFalsy();
  });

  it('should display error message when error prop is provided', () => {
    const testError = new Error('Network error');
    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
        error={testError}
      />
    );

    expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
  });

  it('should handle accept errors gracefully without crashing', async () => {
    mockOnAccept.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalled();
    });

    // Modal still visible after error
    expect(getByText('Quick Agreement')).toBeTruthy();
  });
});

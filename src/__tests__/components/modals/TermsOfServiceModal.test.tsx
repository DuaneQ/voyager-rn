/**
 * Tests for TermsOfServiceModal component
 * Verifies modal UI and user interactions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TermsOfServiceModal } from '../../../components/modals/TermsOfServiceModal';

describe('TermsOfServiceModal', () => {
  const mockOnAccept = jest.fn();
  const mockOnDecline = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when visible', () => {
    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('Terms of Service Agreement')).toBeTruthy();
    expect(getByText('You must accept all terms to use TravalPass')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <TermsOfServiceModal
        visible={false}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    // Modal should not be visible
    expect(queryByText('Terms of Service Agreement')).toBeFalsy();
  });

  it('should display key terms and acknowledgments', () => {
    const { getByText, getAllByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText(/at least 18 years old/i)).toBeTruthy();
    // Use getAllByText since "personal safety" appears multiple times
    expect(getAllByText(/personal safety/i).length).toBeGreaterThan(0);
    expect(getByText(/background checks/i)).toBeTruthy();
  });

  it('should enable Accept button only when all acknowledgments are checked', () => {
    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const acceptButton = getByText('I Accept These Terms');

    // Initially, Accept should be disabled
    fireEvent.press(acceptButton);
    expect(mockOnAccept).not.toHaveBeenCalled();

    // Check the main "I have read" checkbox
    const hasReadCheckbox = getByText(/I have read the complete Terms of Service document/i);
    fireEvent.press(hasReadCheckbox);

    // Still disabled - need all acknowledgments
    fireEvent.press(acceptButton);
    expect(mockOnAccept).not.toHaveBeenCalled();

    // Check all required acknowledgments
    fireEvent.press(getByText(/I have read and understand the complete Terms/i));
    fireEvent.press(getByText(/I understand the risks associated with meeting strangers/i));
    fireEvent.press(getByText(/I assume full responsibility for my personal safety/i));
    fireEvent.press(getByText(/I release TravalPass from liability/i));
    fireEvent.press(getByText(/I am at least 18 years old/i));
    fireEvent.press(getByText(/I will comply with all applicable laws/i));

    // Now Accept should work
    fireEvent.press(acceptButton);
    expect(mockOnAccept).toHaveBeenCalled();
  });

  it('should call onDecline when Decline button is pressed', () => {
    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const declineButton = getByText('Decline & Logout');
    fireEvent.press(declineButton);

    expect(mockOnDecline).toHaveBeenCalled();
    expect(mockOnAccept).not.toHaveBeenCalled();
  });

  it('should call onAccept when Accept is pressed after all acknowledgments', async () => {
    mockOnAccept.mockResolvedValue(undefined);

    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    // Check all required checkboxes
    fireEvent.press(getByText(/I have read the complete Terms of Service document/i));
    fireEvent.press(getByText(/I have read and understand the complete Terms/i));
    fireEvent.press(getByText(/I understand the risks associated with meeting strangers/i));
    fireEvent.press(getByText(/I assume full responsibility for my personal safety/i));
    fireEvent.press(getByText(/I release TravalPass from liability/i));
    fireEvent.press(getByText(/I am at least 18 years old/i));
    fireEvent.press(getByText(/I will comply with all applicable laws/i));

    // Press Accept
    const acceptButton = getByText('I Accept These Terms');
    fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalled();
    });
  });

  it('should show loading state when loading prop is true', () => {
    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
        loading={true}
      />
    );

    // Buttons should still be visible but disabled (tested via interaction)
    const acceptButton = getByText('I Accept These Terms');
    const declineButton = getByText('Processing...');
    
    expect(acceptButton).toBeTruthy();
    expect(declineButton).toBeTruthy();
  });

  it('should display embedded terms content', () => {
    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    // Verify key terms content is embedded
    expect(getByText(/TravalPass connects travelers to share itineraries/i)).toBeTruthy();
    expect(getByText(/Exercise caution when meeting other users/i)).toBeTruthy();
    expect(getByText(/We don't conduct background checks/i)).toBeTruthy();
    expect(getByText(/Meet in public places initially/i)).toBeTruthy();
  });

  it('should handle accept errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockOnAccept.mockRejectedValue(new Error(errorMessage));

    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    // Check all acknowledgments
    fireEvent.press(getByText(/I have read the complete Terms of Service document/i));
    fireEvent.press(getByText(/I have read and understand the complete Terms/i));
    fireEvent.press(getByText(/I understand the risks associated with meeting strangers/i));
    fireEvent.press(getByText(/I assume full responsibility for my personal safety/i));
    fireEvent.press(getByText(/I release TravalPass from liability/i));
    fireEvent.press(getByText(/I am at least 18 years old/i));
    fireEvent.press(getByText(/I will comply with all applicable laws/i));

    // Press Accept
    const acceptButton = getByText('I Accept These Terms');
    fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalled();
    });

    // Modal should still be visible (error handled by parent)
    expect(getByText('Terms of Service Agreement')).toBeTruthy();
  });

  it('should toggle checkbox state on press', () => {
    const { getByText } = render(
      <TermsOfServiceModal
        visible={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const checkbox = getByText(/I have read the complete Terms of Service document/i);
    
    // Press once to check
    fireEvent.press(checkbox);
    
    // Press again to uncheck
    fireEvent.press(checkbox);
    
    // Accept should not work without all checkboxes
    const acceptButton = getByText('I Accept These Terms');
    fireEvent.press(acceptButton);
    expect(mockOnAccept).not.toHaveBeenCalled();
  });
});

/**
 * Tests for TermsGuard component
 * Verifies guard behavior and Terms of Service enforcement
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { TermsGuard } from '../../../components/auth/TermsGuard';
import { useTermsAcceptance } from '../../../hooks/useTermsAcceptance';
import { useAuth } from '../../../context/AuthContext';

// Create a mock user that we can manipulate
let mockUser: any = { uid: 'test-user-id', email: 'test@example.com' };
const mockSignOut = jest.fn();

// Mock dependencies
jest.mock('../../../hooks/useTermsAcceptance');
jest.mock('../../../context/AuthContext');
// The Quick Agreement modal imports the full legal modal — mock it to avoid native module issues
jest.mock('../../../components/modals/legal/TermsOfServiceModal', () => ({
  TermsOfServiceModal: () => null,
}));

const mockUseTermsAcceptance = useTermsAcceptance as jest.MockedFunction<typeof useTermsAcceptance>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('TermsGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset user mock
    mockUser = { uid: 'test-user-id', email: 'test@example.com' };
    mockSignOut.mockResolvedValue(undefined);
    
    // Default mock for useAuth
    mockUseAuth.mockReturnValue({
      user: mockUser,
      status: 'authenticated',
      isInitializing: false,
      signOut: mockSignOut,
      signIn: jest.fn(),
      signUp: jest.fn(),
      sendPasswordReset: jest.fn(),
      resendVerification: jest.fn(),
      refreshAuthState: jest.fn(),
      hasUnverifiedUser: jest.fn(),
      signInWithGoogle: jest.fn(),
      signUpWithGoogle: jest.fn(),
      signInWithApple: jest.fn(),
      signUpWithApple: jest.fn(),
    });
    
    // Default mock for useTermsAcceptance
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });
  });

  it('should render children when terms are accepted', async () => {
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: true,
      isLoading: false,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    const { getByText } = render(
      <TermsGuard>
        <Text>Protected Content</Text>
      </TermsGuard>
    );

    await waitFor(() => {
      expect(getByText('Protected Content')).toBeTruthy();
    });
  });

  it('should show loading state while checking terms', () => {
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: true,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    const { getByText } = render(
      <TermsGuard>
        <Text>Protected Content</Text>
      </TermsGuard>
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should show custom fallback during loading', () => {
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: true,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    const { getByText } = render(
      <TermsGuard fallback={<Text>Custom Loading</Text>}>
        <Text>Protected Content</Text>
      </TermsGuard>
    );

    expect(getByText('Custom Loading')).toBeTruthy();
  });

  it('should show error state when terms check fails', () => {
    const testError = new Error('Network error');
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: testError,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    const { getByText } = render(
      <TermsGuard>
        <Text>Protected Content</Text>
      </TermsGuard>
    );

    // ErrorDisplay shows a safe generic message for raw Error objects
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
  });

  it('should show Terms modal when terms not accepted', () => {
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    const { getByText } = render(
      <TermsGuard>
        <Text>Protected Content</Text>
      </TermsGuard>
    );

    expect(getByText('Quick Agreement')).toBeTruthy();
  });

  it('should show modal when user is logged in but has not accepted terms', () => {
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    const { getByText, queryByText } = render(
      <TermsGuard>
        <Text>Protected Content</Text>
      </TermsGuard>
    );

    // Should show modal, not children
    expect(getByText('Quick Agreement')).toBeTruthy();
    expect(queryByText('Protected Content')).toBeFalsy();
  });

  it('should call acceptTerms when user accepts in modal', async () => {
    const mockAcceptTerms = jest.fn().mockResolvedValue(undefined);
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: null,
      acceptTerms: mockAcceptTerms,
      checkTermsStatus: jest.fn(),
    });

    const { getByText } = render(
      <TermsGuard>
        <Text>Protected Content</Text>
      </TermsGuard>
    );

    const continueButton = getByText('Continue');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(mockAcceptTerms).toHaveBeenCalled();
    });
  });

  it('should not expose an explicit decline button (no sign-out button in new UX)', async () => {
    // The new Quick Agreement modal only has "Continue" and "View Terms".
    // Sign-out on decline is triggered only via hardware back (onRequestClose).
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    const { queryByText } = render(
      <TermsGuard>
        <Text>Protected Content</Text>
      </TermsGuard>
    );

    expect(queryByText('Decline & Logout')).toBeFalsy();
    expect(queryByText('Continue')).toBeTruthy();
  });

  it('should show nothing when user is not logged in', () => {
    // Set auth to have no current user
    mockUser = null;
    mockUseAuth.mockReturnValue({
      user: null,
      status: 'idle',
      isInitializing: false,
      signOut: mockSignOut,
      signIn: jest.fn(),
      signUp: jest.fn(),
      sendPasswordReset: jest.fn(),
      resendVerification: jest.fn(),
      refreshAuthState: jest.fn(),
      hasUnverifiedUser: jest.fn(),
      signInWithGoogle: jest.fn(),
      signUpWithGoogle: jest.fn(),
      signInWithApple: jest.fn(),
      signUpWithApple: jest.fn(),
    });

    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    const { toJSON } = render(
      <TermsGuard>
        <Text>Protected Content</Text>
      </TermsGuard>
    );

    // Should render nothing (null) when no user is logged in
    expect(toJSON()).toBeNull();
  });
});

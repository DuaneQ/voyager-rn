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

    expect(getByText('Terms of Service Agreement')).toBeTruthy();
    expect(getByText('You must accept all terms to use TravalPass')).toBeTruthy();
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
    expect(getByText('Terms of Service Agreement')).toBeTruthy();
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

    // Check all required checkboxes
    fireEvent.press(getByText(/I have read the complete Terms of Service document/i));
    fireEvent.press(getByText(/I have read and understand the complete Terms/i));
    fireEvent.press(getByText(/I understand the risks associated with meeting strangers/i));
    fireEvent.press(getByText(/I assume full responsibility for my personal safety/i));
    fireEvent.press(getByText(/I release TravalPass from liability/i));
    fireEvent.press(getByText(/I am at least 18 years old/i));
    fireEvent.press(getByText(/I will comply with all applicable laws/i));

    const acceptButton = getByText('I Accept These Terms');
    fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(mockAcceptTerms).toHaveBeenCalled();
    });
  });

  it('should sign out and navigate when user declines', async () => {
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

    const declineButton = getByText('Decline & Logout');
    fireEvent.press(declineButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
    
    // Note: We don't check navigation.navigate anymore because
    // the auth state change will handle the redirect to Auth screen
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

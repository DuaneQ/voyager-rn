/**
 * Tests for NotificationInitializer component
 *
 * Covers:
 * - registerForPushNotifications called at sign-in
 * - refreshTokenIfStale called on (background|inactive) → active foreground transition
 * - No-op on web platform
 * - No-op when user is signed out
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform, AppState } from 'react-native';
import { NotificationInitializer } from '../../components/common/NotificationInitializer';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRegisterForPushNotifications = jest.fn().mockResolvedValue(undefined);
const mockRefreshTokenIfStale = jest.fn().mockResolvedValue(undefined);

jest.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    registerForPushNotifications: mockRegisterForPushNotifications,
    refreshTokenIfStale: mockRefreshTokenIfStale,
    permissionStatus: null,
    fcmToken: null,
    isLoading: false,
    requestPermission: jest.fn(),
    unregisterPushNotifications: jest.fn(),
  }),
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Capture the AppState listener so tests can fire transitions manually
let appStateCallback: ((state: string) => void) | null = null;
const mockRemove = jest.fn();

jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
  appStateCallback = cb;
  return { remove: mockRemove } as any;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const signedInAuth = (uid = 'user-123') => ({
  user: { uid },
  status: 'authenticated',
});

const signedOutAuth = () => ({
  user: null,
  status: 'unauthenticated',
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NotificationInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateCallback = null;
    (Platform as any).OS = 'ios';
  });

  describe('sign-in registration', () => {
    it('calls registerForPushNotifications when user signs in', () => {
      mockUseAuth.mockReturnValue(signedInAuth());
      render(<NotificationInitializer />);
      expect(mockRegisterForPushNotifications).toHaveBeenCalledWith('user-123');
    });

    it('does not call registerForPushNotifications when signed out', () => {
      mockUseAuth.mockReturnValue(signedOutAuth());
      render(<NotificationInitializer />);
      expect(mockRegisterForPushNotifications).not.toHaveBeenCalled();
    });

    it('does not call registerForPushNotifications while auth is loading', () => {
      mockUseAuth.mockReturnValue({ user: null, status: 'loading' });
      render(<NotificationInitializer />);
      expect(mockRegisterForPushNotifications).not.toHaveBeenCalled();
    });
  });

  describe('foreground token refresh', () => {
    it('calls refreshTokenIfStale on background → active transition when signed in', () => {
      mockUseAuth.mockReturnValue(signedInAuth());
      render(<NotificationInitializer />);

      // Simulate background → active
      expect(appStateCallback).not.toBeNull();
      appStateCallback!('background');
      appStateCallback!('active');

      expect(mockRefreshTokenIfStale).toHaveBeenCalledWith('user-123');
    });

    it('calls refreshTokenIfStale on inactive → active transition when signed in', () => {
      mockUseAuth.mockReturnValue(signedInAuth());
      render(<NotificationInitializer />);

      appStateCallback!('inactive');
      appStateCallback!('active');

      expect(mockRefreshTokenIfStale).toHaveBeenCalledWith('user-123');
    });

    it('does not call refreshTokenIfStale when user is signed out', () => {
      mockUseAuth.mockReturnValue(signedOutAuth());
      render(<NotificationInitializer />);

      appStateCallback!('background');
      appStateCallback!('active');

      expect(mockRefreshTokenIfStale).not.toHaveBeenCalled();
    });

    it('does not call refreshTokenIfStale on active → active (no background transition)', () => {
      mockUseAuth.mockReturnValue(signedInAuth());
      render(<NotificationInitializer />);

      // Stays active — no background transition
      appStateCallback!('active');
      appStateCallback!('active');

      expect(mockRefreshTokenIfStale).not.toHaveBeenCalled();
    });
  });

  describe('web platform', () => {
    it('does not add an AppState listener on web', () => {
      (Platform as any).OS = 'web';
      mockUseAuth.mockReturnValue(signedInAuth());
      render(<NotificationInitializer />);

      // The foreground effect returns early on web, so no listener is added
      // (sign-in effect still fires registerForPushNotifications — that is correct)
      expect(AppState.addEventListener).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes the AppState listener on unmount', () => {
      mockUseAuth.mockReturnValue(signedInAuth());
      const { unmount } = render(<NotificationInitializer />);
      unmount();
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});

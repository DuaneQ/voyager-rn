/**
 * AuthPage.test.tsx
 *
 * Tests the ?mode= query-param initialisation logic added to AuthPage:
 *   - Default (no param)   → login form shown
 *   - ?mode=login          → login form shown
 *   - ?mode=register       → register form shown
 *   - Unknown param value  → falls back to login form
 *   - Native platform      → always defaults to login (no URLSearchParams)
 *
 * Discriminators used from the actual form components:
 *   - LoginForm   renders text "Sign in"  (LoginForm.tsx line 59)
 *   - RegisterForm renders text "Sign up" (RegisterForm.tsx line 104)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../config/firebaseConfig');

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    signIn: jest.fn(),
    signUp: jest.fn(),
    sendPasswordReset: jest.fn(),
    resendVerification: jest.fn(),
    signInWithGoogle: jest.fn(),
    signUpWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    signUpWithApple: jest.fn(),
    status: 'idle',
    user: null,
  })),
}));

jest.mock('../../context/AlertContext', () => ({
  useAlert: jest.fn(() => ({ showAlert: jest.fn() })),
}));

// Stub heavy/native sub-dependencies used by form components
jest.mock('../../utils/auth/firebaseAuthErrorMapper', () => ({
  __esModule: true,
  default: jest.fn((err) => ({ message: err?.message || 'Auth error' })),
}));

// ── Helper ───────────────────────────────────────────────────────────────────

/** Set window.location.search before importing AuthPage */
const setSearch = (search: string) => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, search },
  });
};

// Import AFTER mocks are declared (Jest hoists jest.mock calls)
import AuthPage from '../../pages/AuthPage';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AuthPage — ?mode= query param initialisation', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'web';
  });

  afterEach(() => {
    Platform.OS = originalPlatformOS;
    setSearch('');
  });

  describe('Default mode', () => {
    it('shows login form when no ?mode param is present', () => {
      setSearch('');
      const { getByText } = render(<AuthPage />);
      expect(getByText('Sign in')).toBeTruthy();
    });

    it('shows login form when search string is empty', () => {
      setSearch('?');
      const { getByText } = render(<AuthPage />);
      expect(getByText('Sign in')).toBeTruthy();
    });
  });

  describe('?mode=login', () => {
    it('shows the login form when mode=login is in the URL', () => {
      setSearch('?mode=login');
      const { getByText } = render(<AuthPage />);
      expect(getByText('Sign in')).toBeTruthy();
    });

    it('does NOT show the register form when mode=login', () => {
      setSearch('?mode=login');
      const { queryByText } = render(<AuthPage />);
      // 'SIGN UP' (uppercase button) only appears in the register form; the login form
      // has a lowercase 'Sign up' cross-link so we use the button text for uniqueness.
      expect(queryByText('SIGN UP')).toBeNull();
    });
  });

  describe('?mode=register', () => {
    it('shows the register form when mode=register is in the URL', () => {
      setSearch('?mode=register');
      const { getByText } = render(<AuthPage />);
      expect(getByText('Sign up')).toBeTruthy();
    });

    it('does NOT show the login form when mode=register', () => {
      setSearch('?mode=register');
      const { queryByText } = render(<AuthPage />);
      // 'SIGN IN' (uppercase button) only appears in the login form; the register form
      // has a lowercase 'Sign in' cross-link so we use the button text for uniqueness.
      expect(queryByText('SIGN IN')).toBeNull();
    });
  });

  describe('Unknown / invalid mode param', () => {
    it('falls back to login form for unrecognised mode value', () => {
      setSearch('?mode=somethingRandom');
      const { getByText } = render(<AuthPage />);
      expect(getByText('Sign in')).toBeTruthy();
    });

    it('falls back to login form for mode=forgot (not a valid initialMode)', () => {
      setSearch('?mode=forgot');
      const { getByText } = render(<AuthPage />);
      expect(getByText('Sign in')).toBeTruthy();
    });
  });

  describe('Non-web platforms', () => {
    it('defaults to login form on iOS regardless of URL (URLSearchParams ignored)', () => {
      Platform.OS = 'ios';
      // Even if search is set, native code ignores it
      setSearch('?mode=register');
      const { getByText } = render(<AuthPage />);
      expect(getByText('Sign in')).toBeTruthy();
    });

    it('defaults to login form on Android', () => {
      Platform.OS = 'android';
      setSearch('?mode=register');
      const { getByText } = render(<AuthPage />);
      expect(getByText('Sign in')).toBeTruthy();
    });
  });

  describe('mode=register combined with ?redirect param', () => {
    it('shows register form even when redirect param is also present', () => {
      setSearch('?mode=register&redirect=/app/search');
      const { getByText } = render(<AuthPage />);
      expect(getByText('Sign up')).toBeTruthy();
    });

    it('shows login form when mode=login with redirect param', () => {
      setSearch('?mode=login&redirect=/app/search');
      const { getByText } = render(<AuthPage />);
      expect(getByText('Sign in')).toBeTruthy();
    });
  });
});

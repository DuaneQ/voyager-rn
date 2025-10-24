import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';

// Ensure firebase/auth and react-native are mocked before requiring AuthContext
jest.mock('firebase/auth');
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

// Require after mocks so the module picks up the mocked Platform
const { AuthProvider, useAuth } = require('../../context/AuthContext');
const { signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut: firebaseSignOut } = require('firebase/auth');
const { auth } = require('../../config/firebaseConfig');

describe('AuthContext (firebase-backed)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure no leftover currentUser
    const cfg = require('../../config/firebaseConfig');
    if (cfg && cfg.auth) cfg.auth.currentUser = null;
  });

  it('initializes with idle status and no user', async () => {
    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();
    expect(result.current.status).toBe('idle');
    expect(result.current.user).toBeNull();
  });

  it('signs in successfully via firebase auth', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: { uid: 'uid-1', email: 'test@example.com', emailVerified: true, isAnonymous: false, providerData: [] } });

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'password');
    expect(result.current.status).toBe('authenticated');
    expect(result.current.user).toBeTruthy();
    expect(result.current.user?.email).toBe('test@example.com');
  });

  it('throws when firebase returns unverified email', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: { uid: 'uid-2', email: 'new@example.com', emailVerified: false, isAnonymous: false, providerData: [] } });

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    await expect(act(async () => { await result.current.signIn('new@example.com', 'password'); })).rejects.toThrow();
    expect(result.current.status).toBe('idle');
    expect(result.current.user).toBeNull();
  });

  it('signs out and clears state', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: { uid: 'uid-3', email: 'signout@example.com', emailVerified: true, isAnonymous: false, providerData: [] } });
    (firebaseSignOut as jest.Mock).mockResolvedValueOnce(undefined);

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    await act(async () => { await result.current.signIn('signout@example.com', 'password'); });
    expect(result.current.user).toBeTruthy();

    await act(async () => { await result.current.signOut(); });
    expect(firebaseSignOut).toHaveBeenCalledWith(auth);
    expect(result.current.user).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('sends password reset via firebase', async () => {
    (sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(undefined);

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    await act(async () => { await result.current.sendPasswordReset('reset@example.com'); });
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'reset@example.com');
  });

  it('resends verification when auth.currentUser exists', async () => {
    const cfg = require('../../config/firebaseConfig');
    cfg.auth.currentUser = { uid: 'uid-verify', email: 'v@example.com' };
    (sendEmailVerification as jest.Mock).mockResolvedValueOnce(undefined);

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    await act(async () => { await result.current.resendVerification(); });
    expect(sendEmailVerification).toHaveBeenCalled();
  });
});

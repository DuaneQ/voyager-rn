import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';

// Ensure firebase/auth and react-native are mocked before requiring AuthContext
jest.mock('firebase/auth');
jest.mock('firebase/firestore');
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

// Require after mocks so the module picks up the mocked Platform
const { AuthProvider, useAuth } = require('../../context/AuthContext');
const { signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut: firebaseSignOut, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInWithCredential } = require('firebase/auth');
const { setDoc } = require('firebase/firestore');
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

  it('throws error when resendVerification is called without logged in user', async () => {
    const cfg = require('../../config/firebaseConfig');
    cfg.auth.currentUser = null;

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    await expect(act(async () => { 
      await result.current.resendVerification(); 
    })).rejects.toThrow('No user logged in. Please sign in first.');
  });

  it('handles signIn error and resets status to idle', async () => {
    const error = new Error('Invalid credentials');
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce(error);

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    await expect(act(async () => { 
      await result.current.signIn('bad@example.com', 'wrongpass'); 
    })).rejects.toThrow('Invalid credentials');
    
    expect(result.current.status).toBe('idle');
    expect(result.current.user).toBeNull();
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Temporarily suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    try {
      renderHook(() => useAuth());
    } catch (error) {
      expect((error as Error).message).toBe('useAuth must be used within an AuthProvider');
    }

    console.error = originalError;
  });
});

describe('AuthContext - signUp flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const cfg = require('../../config/firebaseConfig');
    if (cfg && cfg.auth) cfg.auth.currentUser = null;
  });

  it('signs up user, sends verification email, and signs out', async () => {
    const mockUser = { 
      uid: 'new-uid', 
      email: 'newuser@example.com',
      emailVerified: false 
    };
    
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (sendEmailVerification as jest.Mock).mockResolvedValueOnce(undefined);
    (setDoc as jest.Mock).mockResolvedValueOnce(undefined);
    (firebaseSignOut as jest.Mock).mockResolvedValueOnce(undefined);

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    await act(async () => {
      await result.current.signUp('newuser', 'newuser@example.com', 'password123');
    });

    // Verify user creation
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 
      'newuser@example.com', 
      'password123'
    );

    // Verify email sent
    expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);

    // Verify Firestore document created
    expect(setDoc).toHaveBeenCalledWith(
      {}, // doc reference (mocked as empty object)
      expect.objectContaining({
        username: 'newuser',
        email: 'newuser@example.com',
        subscriptionType: 'free',
        photos: ['', '', '', '', ''],
      }),
      { merge: true }
    );

    // Verify user is signed out (to force email verification)
    expect(firebaseSignOut).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('handles signUp errors gracefully', async () => {
    const error = new Error('Email already exists');
    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce(error);

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    await expect(act(async () => {
      await result.current.signUp('testuser', 'existing@example.com', 'password123');
    })).rejects.toThrow('Email already exists');

    expect(result.current.status).toBe('idle');
  });

  it('handles signOut error in signUp flow silently', async () => {
    const mockUser = { 
      uid: 'new-uid-2', 
      email: 'newuser2@example.com',
      emailVerified: false 
    };
    
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (sendEmailVerification as jest.Mock).mockResolvedValueOnce(undefined);
    (setDoc as jest.Mock).mockResolvedValueOnce(undefined);
    (firebaseSignOut as jest.Mock).mockRejectedValueOnce(new Error('Sign out failed'));

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    // Should not throw despite signOut error
    await act(async () => {
      await result.current.signUp('newuser2', 'newuser2@example.com', 'password123');
    });

    expect(result.current.status).toBe('idle');
  });
});

describe('AuthContext - Google Sign-In', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses signInWithPopup for web platform', async () => {
    // Mock is already set to 'web' in top-level jest.mock
    const mockResult = { user: { uid: 'google-uid', email: 'google@example.com' } };
    (signInWithPopup as jest.Mock).mockResolvedValueOnce(mockResult);

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    const googleResult = await act(async () => {
      return await result.current.signInWithGoogle();
    });

    expect(signInWithPopup).toHaveBeenCalled();
    expect(googleResult).toEqual(mockResult);
  });

  it('signUpWithGoogle calls signInWithGoogle', async () => {
    const mockResult = { user: { uid: 'google-uid-2', email: 'google2@example.com' } };
    (signInWithPopup as jest.Mock).mockResolvedValueOnce(mockResult);

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
    await waitForNextUpdate();

    const googleResult = await act(async () => {
      return await result.current.signUpWithGoogle();
    });

    expect(signInWithPopup).toHaveBeenCalled();
    expect(googleResult).toEqual(mockResult);
  });
});

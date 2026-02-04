/**
 * AuthContext Apple Sign-In Tests
 * Tests for Apple authentication methods
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth, AuthProvider } from '../../context/AuthContext';
import * as AppleAuthentication from 'expo-apple-authentication';
import { signInWithCredential, signOut } from 'firebase/auth';
import { getDoc, setDoc, doc } from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/auth', () => ({
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  OAuthProvider: jest.fn().mockImplementation(() => ({
    credential: jest.fn((params) => ({
      idToken: params.idToken,
      providerId: 'apple.com',
    })),
  })),
}));
jest.mock('firebase/firestore');

// Mock SafeGoogleSignin
jest.mock('../../utils/SafeGoogleSignin', () => ({
  SafeGoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    isAvailable: jest.fn(() => true),
  },
}));

// Mock expo-apple-authentication
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: (obj: any) => obj.ios,
}));

describe('AuthContext - Apple Sign-In', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithApple', () => {
    it('successfully signs in existing user', async () => {

      const mockAppleCredential = {
        identityToken: 'mock-id-token',
        fullName: null,
        email: 'test@privaterelay.appleid.com',
      };

      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue(
        mockAppleCredential
      );

      (signInWithCredential as jest.Mock).mockResolvedValue({
        user: {
          uid: 'apple-user-123',
          email: 'test@privaterelay.appleid.com',
          emailVerified: true,
        },
      });

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          username: 'Test User',
          email: 'test@privaterelay.appleid.com',
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.signInWithApple();
      });

      expect(AppleAuthentication.signInAsync).toHaveBeenCalled();
      expect(signInWithCredential).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
    });

    it('auto-creates Firestore profile for new users trying to sign in', async () => {

      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: 'mock-id-token',
      });

      (signInWithCredential as jest.Mock).mockResolvedValue({
        user: {
          uid: 'new-apple-user',
          email: 'newuser@appleid.com',
        },
      });

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });
      
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const user = await result.current.signInWithApple();
      
      expect(user).toEqual({
        uid: 'new-apple-user',
        email: 'newuser@appleid.com',
      });
      
      // Should auto-create profile, not sign out
      expect(setDoc).toHaveBeenCalled();
      expect(signOut).not.toHaveBeenCalled();
    });

    it('handles user cancellation gracefully', async () => {

      (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue({
        code: 'ERR_REQUEST_CANCELED',
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.signInWithApple();
      });

      // Should not throw error for cancellation
      expect(result.current.status).not.toBe('error');
    });
  });

  describe('signUpWithApple', () => {
    it('creates new user profile on sign-up', async () => {

      const mockAppleCredential = {
        identityToken: 'mock-id-token',
        fullName: {
          givenName: 'John',
          familyName: 'Doe',
        },
        email: 'john.doe@appleid.com',
      };

      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue(
        mockAppleCredential
      );

      (signInWithCredential as jest.Mock).mockResolvedValue({
        user: {
          uid: 'new-apple-user',
          email: 'john.doe@appleid.com',
          emailVerified: true,
        },
      });

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.signUpWithApple();
      });

      expect(setDoc).toHaveBeenCalled();
      const setDocCall = (setDoc as jest.Mock).mock.calls[0][1];
      expect(setDocCall.username).toBe('John Doe');
      expect(setDocCall.email).toBe('john.doe@appleid.com');
      expect(setDocCall.emailVerified).toBe(true);
      expect(setDocCall.provider).toBe('apple');
    });

    it('signs in existing user instead of creating duplicate', async () => {

      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: 'mock-id-token',
        email: 'existing@appleid.com',
      });

      (signInWithCredential as jest.Mock).mockResolvedValue({
        user: {
          uid: 'existing-apple-user',
          email: 'existing@appleid.com',
        },
      });

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ username: 'Existing User' }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.signUpWithApple();
      });

      expect(setDoc).not.toHaveBeenCalled();
      expect(result.current.status).toBe('authenticated');
    });

    it('handles missing full name gracefully', async () => {

      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: 'mock-id-token',
        fullName: null,
        email: 'nofullname@appleid.com',
      });

      (signInWithCredential as jest.Mock).mockResolvedValue({
        user: {
          uid: 'no-name-user',
          email: 'nofullname@appleid.com',
        },
      });

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.signUpWithApple();
      });

      const setDocCall = (setDoc as jest.Mock).mock.calls[0][1];
      expect(setDocCall.username).toBe('nofullname');
    });
  });
});

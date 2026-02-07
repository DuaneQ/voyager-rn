/**
 * Unit tests for UserProfileContext
 * Tests profile loading, updating, and document creation
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { UserProfileProvider, useUserProfile } from '../../context/UserProfileContext';
import { auth } from '../../config/firebaseConfig';
import { getDoc, setDoc, updateDoc } from 'firebase/firestore';
import storage from '../../utils/storage';

// Mock Firebase
jest.mock('firebase/firestore');
// Use centralized manual mock for firebaseConfig, then augment the mock for this suite
jest.mock('../../config/firebaseConfig');

// Ensure the mocked auth has an onAuthStateChanged helper that immediately invokes the callback
(() => {
  const cfg = require('../../config/firebaseConfig');
  if (!cfg.auth) cfg.auth = { currentUser: null };
  if (!cfg.auth.onAuthStateChanged) {
    cfg.auth.onAuthStateChanged = jest.fn((callback: any) => {
      callback(cfg.auth.currentUser);
      return () => {};
    });
  }
})();
jest.mock('../../utils/storage');

// Simplify AuthContext for these unit tests: return the current mocked auth.currentUser
jest.mock('../../context/AuthContext', () => {
  const React = require('react');
  const cfg = require('../../config/firebaseConfig');
  return {
    AuthProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useAuth: () => ({ user: cfg.auth.currentUser }),
  };
});

describe('UserProfileContext', () => {
  const renderWithProvider = () => {
    const ref: { current: ReturnType<typeof useUserProfile> | null } = { current: null } as any;
    const Capture: React.FC = () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const ctx = useUserProfile();
      ref.current = ctx;
      return null;
    };
    const { AuthProvider } = require('../../context/AuthContext');
    const utils = render(
      <AuthProvider>
        <UserProfileProvider>
          <Capture />
        </UserProfileProvider>
      </AuthProvider>
    );

    // If the test mock swapped out getAuthInstance/auth directly, ensure FirebaseAuthService listeners are notified
    try {
      const { FirebaseAuthService } = require('../../services/auth/FirebaseAuthService');
      const cfg = require('../../config/firebaseConfig');
      const mockUser = cfg?.auth?.currentUser ? { uid: cfg.auth.currentUser.uid, email: cfg.auth.currentUser.email || null, emailVerified: !!cfg.auth.currentUser.emailVerified, displayName: cfg.auth.currentUser.displayName || null, photoURL: cfg.auth.currentUser.photoURL || null, idToken: '', refreshToken: '', expiresIn: '0' } : null;
      // Call internal notifier if available (tests can access private statics)
      if ((FirebaseAuthService as any)?.notifyAuthStateChanged) {
        (FirebaseAuthService as any).notifyAuthStateChanged(mockUser);
      }
    } catch (e) {
      // ignore - best-effort to keep tests stable
    }

    return { ...utils, ref };
  };
  const mockUserId = 'test-user-123';
  const mockProfile = {
    uid: 'test-user-123',
    username: 'testuser',
    email: 'test@example.com',
    bio: 'Test bio',
    dob: '1990-01-01',
    gender: 'Male',
    sexualOrientation: 'Heterosexual',
    edu: "Bachelor's Degree",
    drinking: 'Socially',
    smoking: 'Never',
    photos: ['', '', '', '', ''],
    subscriptionType: 'free' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = null;
    (storage.getItem as jest.Mock).mockResolvedValue(null);
    (storage.setItem as jest.Mock).mockResolvedValue(undefined);
    (storage.removeItem as jest.Mock).mockResolvedValue(undefined);
    // Default getDoc resolves quickly as non-existent
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false, data: () => null });
  });

  describe('updateProfile', () => {
    it('should use setDoc with merge:true to create document if it does not exist', async () => {
      // Setup: User is authenticated
      (auth as any).currentUser = { uid: mockUserId, emailVerified: true };
  (setDoc as jest.Mock).mockResolvedValue(undefined);
  // Ensure initial load doesn't block waiting on Firestore doc (simulate no existing doc)
  (getDoc as jest.Mock).mockResolvedValue({ exists: () => false, data: () => null });

      const { ref, findByTestId } = renderWithProvider();
      // Allow effect to run
      await act(async () => {});

      // Act: Update profile for a user with no existing document
      const updateData = {
        username: 'newuser',
        bio: 'New bio',
        gender: 'Female',
      };

      await act(async () => {
        await ref.current!.updateProfile(updateData);
      });

      // Assert: setDoc with merge was called with the updates
      expect(setDoc).toHaveBeenCalledWith(expect.anything(), updateData, { merge: true });
    });;

    it('should create document for new user who signed up but has no profile', async () => {
      // Scenario: User created via sign-up but document creation failed
      (auth as any).currentUser = { uid: mockUserId, emailVerified: true };
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false, data: () => null });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const { ref } = renderWithProvider();
      await act(async () => {});

      // User tries to complete their profile
      const profileData = {
        username: 'newuser',
        bio: 'First time user',
        dob: '1995-05-15',
        gender: 'Non-binary',
        sexualOrientation: 'Pansexual',
        edu: 'High School',
        drinking: 'Never',
        smoking: 'Never',
      };

      await act(async () => {
        await ref.current!.updateProfile(profileData);
      });

      // Should call setDoc with merge to update/create the profile
      expect(setDoc).toHaveBeenCalledWith(expect.anything(), profileData, { merge: true });
    });;

    it('should update existing profile fields', async () => {
      // Setup: User has existing profile
      (auth as any).currentUser = { uid: mockUserId, emailVerified: true };
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => mockProfile });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const { ref } = renderWithProvider();
      await act(async () => {});

      // Act: Update some fields
      const updates = {
        bio: 'Updated bio',
        drinking: 'Occasionally' as const,
      };

      await act(async () => {
        await ref.current!.updateProfile(updates);
      });

      // Assert: setDoc with merge was called with updates
      expect(setDoc).toHaveBeenCalledWith(expect.anything(), updates, { merge: true });
    });

    it('should throw error when user is not authenticated', async () => {
      (auth as any).currentUser = null;

      const { ref } = renderWithProvider();
      await act(async () => {});

      // Act & Assert
      await expect(
        act(async () => {
          await ref.current!.updateProfile({ bio: 'test' });
        })
      ).rejects.toThrow('User not authenticated');
    });

    it('should update local state after successful Firestore update', async () => {
      // Setup
      (auth as any).currentUser = { uid: mockUserId, emailVerified: true };
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => mockProfile });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const { ref } = renderWithProvider();
      await act(async () => {});

    // Initial profile loaded
  expect(ref.current!.userProfile?.username).toBe('testuser');

      // Act: Update username
      await act(async () => {
        await ref.current!.updateProfile({ username: 'updateduser' });
      });

      // Assert: Local state updated (profile should reflect the update)
      expect(ref.current!.userProfile?.username).toBe('updateduser');
    });
  });

  describe('profile loading', () => {
    it('should load profile from Firestore when user is authenticated', async () => {
      (auth as any).currentUser = { uid: mockUserId, emailVerified: true };
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => mockProfile });

      const { ref } = renderWithProvider();
      await act(async () => {});

  expect(ref.current!.userProfile).toEqual(mockProfile);
  expect(ref.current!.isLoading).toBe(false);
    });

    it('should fall back to cached profile when Firestore has no document', async () => {
    // Previously we used a cached fallback; with Cloud Functions we expect no profile
    (auth as any).currentUser = { uid: mockUserId, emailVerified: true };
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false, data: () => null });

    const { ref } = renderWithProvider();
    await act(async () => {});

  expect(ref.current!.userProfile).toBeNull();
    });

    it('should set isLoading to false when no profile found', async () => {
      (auth as any).currentUser = { uid: mockUserId, emailVerified: true };
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false, data: () => null });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      const { ref } = renderWithProvider();
      await act(async () => {});

  expect(ref.current!.userProfile).toBeNull();
  expect(ref.current!.isLoading).toBe(false);
    });
  });
});

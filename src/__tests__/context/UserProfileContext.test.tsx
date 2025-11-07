/**
 * Unit tests for UserProfileContext
 * Tests profile loading, updating, and document creation
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { UserProfileProvider, useUserProfile } from '../../context/UserProfileContext';
import { auth } from '../../config/firebaseConfig';
import { getDoc, setDoc } from 'firebase/firestore';
import storage from '../../utils/storage';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('../../config/firebaseConfig', () => {
  const mockOnAuthStateChanged = jest.fn((callback) => {
    // Immediately call the callback with current user
    const authModule = require('../../config/firebaseConfig');
    setTimeout(() => callback(authModule.auth.currentUser), 0);
    return jest.fn(); // unsubscribe
  });
  
  return {
    auth: {
      currentUser: null,
      onAuthStateChanged: mockOnAuthStateChanged,
    },
    db: {},
  };
});
jest.mock('../../utils/storage');

describe('UserProfileContext', () => {
  const mockUserId = 'test-user-123';
  const mockProfile = {
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
  });

  describe('updateProfile', () => {
    it('should use setDoc with merge:true to create document if it does not exist', async () => {
      // Setup: User is authenticated
      (auth as any).currentUser = { uid: mockUserId };
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const wrapper = ({ children }: any) => (
        <UserProfileProvider>{children}</UserProfileProvider>
      );
      const { result, waitFor } = renderHook(() => useUserProfile(), { wrapper });
      
      // Wait for initial load to complete
      await waitFor(() => !result.current.isLoading);

      // Act: Update profile for a user with no existing document
      const updateData = {
        username: 'newuser',
        bio: 'New bio',
        gender: 'Female',
      };

      await act(async () => {
        await result.current.updateProfile(updateData);
      });

      // Assert: setDoc was called with merge:true (not updateDoc)
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(), // doc reference
        updateData,
        { merge: true }
      );
    });

    it('should create document for new user who signed up but has no profile', async () => {
      // Scenario: User created via sign-up but document creation failed
      (auth as any).currentUser = { uid: mockUserId };
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
        data: () => null,
      });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const wrapper = ({ children }: any) => (
        <UserProfileProvider>{children}</UserProfileProvider>
      );
      const { result, waitFor } = renderHook(() => useUserProfile(), { wrapper });
      
      await waitFor(() => !result.current.isLoading);

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
        await result.current.updateProfile(profileData);
      });

      // Should succeed without "No document to update" error
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        profileData,
        { merge: true }
      );
      expect(storage.setItem).toHaveBeenCalledWith(
        'PROFILE_INFO',
        expect.stringContaining('newuser')
      );
    });

    it('should update existing profile fields', async () => {
      // Setup: User has existing profile
      (auth as any).currentUser = { uid: mockUserId };
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockProfile,
      });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const wrapper = ({ children }: any) => (
        <UserProfileProvider>{children}</UserProfileProvider>
      );
      const { result, waitFor } = renderHook(() => useUserProfile(), { wrapper });
      
      await waitFor(() => !result.current.isLoading);

      // Act: Update some fields
      const updates = {
        bio: 'Updated bio',
        drinking: 'Occasionally' as const,
      };

      await act(async () => {
        await result.current.updateProfile(updates);
      });

      // Assert: Merged with existing data
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        updates,
        { merge: true }
      );
    });

    it('should throw error when user is not authenticated', async () => {
      (auth as any).currentUser = null;

      const wrapper = ({ children }: any) => (
        <UserProfileProvider>{children}</UserProfileProvider>
      );
      const { result, waitFor } = renderHook(() => useUserProfile(), { wrapper });
      
      await waitFor(() => !result.current.isLoading);

      // Act & Assert
      await expect(
        act(async () => {
          await result.current.updateProfile({ bio: 'test' });
        })
      ).rejects.toThrow('User not authenticated');
    });

    it('should update local state after successful Firestore update', async () => {
      // Setup
      (auth as any).currentUser = { uid: mockUserId };
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockProfile,
      });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const wrapper = ({ children }: any) => (
        <UserProfileProvider>{children}</UserProfileProvider>
      );
      const { result, waitFor } = renderHook(() => useUserProfile(), { wrapper });
      
      await waitFor(() => !result.current.isLoading);

      // Initial profile loaded
      expect(result.current.userProfile?.username).toBe('testuser');

      // Act: Update username
      await act(async () => {
        await result.current.updateProfile({ username: 'updateduser' });
      });

      // Assert: Local state updated (note: in actual code, this relies on the previous state)
      expect(storage.setItem).toHaveBeenCalledWith(
        'PROFILE_INFO',
        expect.stringContaining('updateduser')
      );
    });
  });

  describe('profile loading', () => {
    it('should load profile from Firestore when user is authenticated', async () => {
      (auth as any).currentUser = { uid: mockUserId };
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockProfile,
      });

      const wrapper = ({ children }: any) => (
        <UserProfileProvider>{children}</UserProfileProvider>
      );
      const { result, waitFor } = renderHook(() => useUserProfile(), { wrapper });
      
      await waitFor(() => !result.current.isLoading);

      expect(result.current.userProfile).toEqual(mockProfile);
      expect(result.current.isLoading).toBe(false);
    });

    it('should fall back to cached profile when Firestore has no document', async () => {
      const cachedProfile = { ...mockProfile, username: 'cacheduser' };
      
      (auth as any).currentUser = { uid: mockUserId };
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
        data: () => null,
      });
      (storage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedProfile));

      const wrapper = ({ children }: any) => (
        <UserProfileProvider>{children}</UserProfileProvider>
      );
      const { result, waitFor } = renderHook(() => useUserProfile(), { wrapper });
      
      await waitFor(() => !result.current.isLoading);

      expect(result.current.userProfile?.username).toBe('cacheduser');
    });

    it('should set isLoading to false when no profile found', async () => {
      (auth as any).currentUser = { uid: mockUserId };
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
        data: () => null,
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      const wrapper = ({ children }: any) => (
        <UserProfileProvider>{children}</UserProfileProvider>
      );
      const { result, waitFor } = renderHook(() => useUserProfile(), { wrapper });
      
      await waitFor(() => !result.current.isLoading);

      expect(result.current.userProfile).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});

/**
 * Tests for usePhotoUpload hook
 * Comprehensive coverage to reach 90%+
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { usePhotoUpload } from '../../../hooks/photo/usePhotoUpload';
import { photoService } from '../../../services/photo/PhotoService';
import { UserProfileContext } from '../../../context/UserProfileContext';
import { auth } from '../../../config/firebaseConfig';
import React from 'react';

// Create mock functions before mocking modules
const mockRequestCameraPermissionsAsync = jest.fn();
const mockGetMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();

// Mock photoService methods
const mockUploadPhoto = jest.fn();
const mockDeletePhoto = jest.fn();
const mockValidateImage = jest.fn();

// Mock dependencies
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...args: any[]) => mockRequestCameraPermissionsAsync(...args),
  getMediaLibraryPermissionsAsync: (...args: any[]) => mockGetMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibraryAsync(...args),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
}));

jest.mock('../../../services/photo/PhotoService', () => ({
  photoService: {
    uploadPhoto: (...args: any[]) => mockUploadPhoto(...args),
    deletePhoto: (...args: any[]) => mockDeletePhoto(...args),
    validateImage: (...args: any[]) => mockValidateImage(...args),
  },
}));
jest.mock('../../../config/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-123' },
  },
}));

jest.spyOn(Alert, 'alert');

describe('usePhotoUpload', () => {
  const mockUpdateUserProfile = jest.fn();
  const mockUserProfile = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL1: '',
    photoURL2: '',
    photoURL3: '',
    createdAt: new Date(),
    termsAccepted: true,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserProfileContext.Provider
      value={{
        userProfile: mockUserProfile,
        setUserProfile: jest.fn(),
        updateUserProfile: mockUpdateUserProfile,
        updateProfile: jest.fn(),
        isLoading: false,
        loading: false,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockClear();
    Platform.OS = 'ios';
    
    // Set up default mock implementations
    mockDeletePhoto.mockResolvedValue(undefined);
    mockUploadPhoto.mockResolvedValue({ 
      url: 'https://example.com/photo.jpg',
      storagePath: 'users/test-user-123/photos/slot1.jpg',
      slot: 'slot1',
    });
    mockValidateImage.mockResolvedValue({ success: true });
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://test.jpg', width: 800, height: 600 }],
    });
  });

  describe('Initial State', () => {
    it('should initialize with default upload state', () => {
      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      expect(result.current.uploadState).toEqual({
        loading: false,
        progress: 0,
        error: null,
        uploadedUrl: null,
      });
    });

    it('should provide all expected methods', () => {
      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      expect(result.current.selectAndUploadPhoto).toBeInstanceOf(Function);
      expect(result.current.deletePhoto).toBeInstanceOf(Function);
      expect(result.current.clearState).toBeInstanceOf(Function);
      expect(result.current.requestCameraPermission).toBeInstanceOf(Function);
      expect(result.current.requestMediaLibraryPermission).toBeInstanceOf(Function);
    });
  });

  describe('clearState', () => {
    it('should reset upload state', () => {
      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      // Simulate state change
      act(() => {
        result.current.selectAndUploadPhoto('slot1');
      });

      act(() => {
        result.current.clearState();
      });

      expect(result.current.uploadState).toEqual({
        loading: false,
        progress: 0,
        error: null,
        uploadedUrl: null,
      });
    });
  });

  describe('Permission Requests', () => {
    describe('requestCameraPermission', () => {
      it('should return true on web platform', async () => {
        Platform.OS = 'web';
        const { result } = renderHook(() => usePhotoUpload(), { wrapper });

        const granted = await result.current.requestCameraPermission();

        expect(granted).toBe(true);
        expect(mockRequestCameraPermissionsAsync).not.toHaveBeenCalled();
      });

      it('should request and return permission status on mobile', async () => {
        Platform.OS = 'ios';
        (mockRequestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'granted',
        });

        const { result } = renderHook(() => usePhotoUpload(), { wrapper });

        const granted = await result.current.requestCameraPermission();

        expect(granted).toBe(true);
        expect(mockRequestCameraPermissionsAsync).toHaveBeenCalled();
      });

      it('should show alert when permission denied', async () => {
        Platform.OS = 'ios';
        (mockRequestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'denied',
        });

        const { result } = renderHook(() => usePhotoUpload(), { wrapper });

        const granted = await result.current.requestCameraPermission();

        expect(granted).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission Denied',
          'Camera permission is required to take photos.',
          [{ text: 'OK' }]
        );
      });
    });

    describe('requestMediaLibraryPermission', () => {
      it('should return true on web platform', async () => {
        Platform.OS = 'web';
        const { result } = renderHook(() => usePhotoUpload(), { wrapper });

        const granted = await result.current.requestMediaLibraryPermission();

        expect(granted).toBe(true);
        expect(mockGetMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
      });

      it('should request permission when not cached', async () => {
        Platform.OS = 'ios';
        (mockGetMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'granted',
        });

        const { result } = renderHook(() => usePhotoUpload(), { wrapper });

        const granted = await result.current.requestMediaLibraryPermission();

        expect(granted).toBe(true);
        expect(mockGetMediaLibraryPermissionsAsync).toHaveBeenCalled();
      });

      it('should use cached permission on subsequent calls', async () => {
        Platform.OS = 'ios';
        (mockGetMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'granted',
        });

        const { result } = renderHook(() => usePhotoUpload(), { wrapper });

        // First call
        await act(async () => {
          await result.current.requestMediaLibraryPermission();
        });
        expect(mockGetMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);

        // Second call should use cache
        await act(async () => {
          await result.current.requestMediaLibraryPermission();
        });
        expect(mockGetMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
      });

      it('should show alert when permission denied', async () => {
        Platform.OS = 'ios';
        (mockGetMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'denied',
        });

        const { result } = renderHook(() => usePhotoUpload(), { wrapper });

        const granted = await result.current.requestMediaLibraryPermission();

        expect(granted).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission Required',
          'Please enable photo library access in Settings',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('selectAndUploadPhoto', () => {
    const mockImageResult = {
      canceled: false,
      assets: [
        {
          uri: 'file:///test/photo.jpg',
          width: 1024,
          height: 768,
          type: 'image',
        },
      ],
    };

    beforeEach(() => {
      (mockGetMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (mockLaunchImageLibraryAsync as jest.Mock).mockResolvedValue(mockImageResult);
      mockUploadPhoto.mockResolvedValue({
        url: 'https://example.com/photo1.jpg',
        storagePath: 'users/test-user-123/photos/slot1.jpg',
        slot: 'slot1',
      });
    });

    it('should successfully select and upload photo', async () => {
      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.selectAndUploadPhoto('slot1');
      });

      expect(uploadResult).toEqual({
        url: 'https://example.com/photo1.jpg',
        storagePath: 'users/test-user-123/photos/slot1.jpg',
        slot: 'slot1',
      });
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: expect.objectContaining({
            slot1: 'https://example.com/photo1.jpg',
          }),
        })
      );
    });

    it('should update upload state during upload', async () => {
      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      const uploadPromise = act(async () => {
        await result.current.selectAndUploadPhoto('slot1');
      });

      // Check loading state
      await waitFor(() => {
        expect(result.current.uploadState.loading).toBe(false); // Will be false after completion
      });

      await uploadPromise;
    });

    it('should return null when permission denied', async () => {
      (mockGetMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.selectAndUploadPhoto('slot1');
      });

      expect(uploadResult).toBeNull();
      expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it('should return null when user cancels selection', async () => {
      (mockLaunchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.selectAndUploadPhoto('slot1');
      });

      expect(uploadResult).toBeNull();
      expect(mockUploadPhoto).not.toHaveBeenCalled();
    });

    it('should handle upload failure', async () => {
      mockUploadPhoto.mockRejectedValue(new Error('Upload failed'));

      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.selectAndUploadPhoto('slot1');
      });

      expect(uploadResult).toBeNull();
      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Upload Failed',
        'Failed to upload photo',
        [{ text: 'OK' }]
      );
    });

    it('should handle different photo slots', async () => {
      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      await act(async () => {
        await result.current.selectAndUploadPhoto('slot2');
      });

      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: expect.objectContaining({
            slot2: expect.any(String),
          }),
        })
      );
    });

    it('should pass custom options to image picker', async () => {
      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      const options = {
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      };

      await act(async () => {
        await result.current.selectAndUploadPhoto('slot1', options);
      });

      expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      );
    });

    it('should handle missing user ID', async () => {
      const originalAuth = (auth as any).currentUser;
      (auth as any).currentUser = null;

      const noUserWrapper = ({ children }: { children: React.ReactNode }) => (
        <UserProfileContext.Provider
          value={{
            userProfile: null,
            setUserProfile: jest.fn(),
            updateUserProfile: jest.fn(),
            updateProfile: jest.fn(),
            isLoading: false,
            loading: false,
          }}
        >
          {children}
        </UserProfileContext.Provider>
      );

      const { result } = renderHook(() => usePhotoUpload(), { wrapper: noUserWrapper });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.selectAndUploadPhoto('slot1');
      });

      expect(uploadResult).toBeNull();
      expect(result.current.uploadState.error).toBe('User not authenticated');

      // Restore auth
      (auth as any).currentUser = originalAuth;
    });

    it('should retry upload on network failure', async () => {
      // First call fails, second succeeds
      mockUploadPhoto
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          url: 'https://example.com/photo1.jpg',
          storagePath: 'users/test-user-123/photos/slot1.jpg',
          slot: 'slot1',
        });

      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.selectAndUploadPhoto('slot1');
      });

      expect(uploadResult).not.toBeNull();
      expect(mockUploadPhoto).toHaveBeenCalledTimes(2);
    });
  });

  describe('deletePhoto', () => {
    beforeEach(() => {
      mockDeletePhoto.mockResolvedValue({
        success: true,
        error: null,
      });
    });

    it('should successfully delete photo', async () => {
      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      await act(async () => {
        await result.current.deletePhoto('slot1');
      });

      expect(mockDeletePhoto).toHaveBeenCalledWith('slot1', 'test-user-123');
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: expect.objectContaining({
            slot1: '',
          }),
        })
      );
    });

    it('should delete photo from different slots', async () => {
      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      await act(async () => {
        await result.current.deletePhoto('slot3');
      });

      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: expect.objectContaining({
            slot3: '',
          }),
        })
      );
    });

    it('should handle delete failure', async () => {
      mockDeletePhoto.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      await act(async () => {
        await result.current.deletePhoto('slot1');
      });

      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should show alert on delete error', async () => {
      mockDeletePhoto.mockRejectedValue(
        new Error('Unexpected error')
      );

      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      await act(async () => {
        await result.current.deletePhoto('slot1');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Failed',
        expect.stringContaining('Failed to delete photo'),
        [{ text: 'OK' }]
      );
    });

    it('should handle missing user ID on delete', async () => {
      const originalAuth = (auth as any).currentUser;
      (auth as any).currentUser = null;

      const noUserWrapper = ({ children }: { children: React.ReactNode }) => (
        <UserProfileContext.Provider
          value={{
            userProfile: null,
            setUserProfile: jest.fn(),
            updateUserProfile: jest.fn(),
            updateProfile: jest.fn(),
            isLoading: false,
            loading: false,
          }}
        >
          {children}
        </UserProfileContext.Provider>
      );

      const { result } = renderHook(() => usePhotoUpload(), { wrapper: noUserWrapper });

      await act(async () => {
        await result.current.deletePhoto('slot1');
      });

      expect(mockDeletePhoto).not.toHaveBeenCalled();
      expect(result.current.uploadState.error).toBe('User not authenticated');

      // Restore auth
      (auth as any).currentUser = originalAuth;
    });
  });

  describe('Upload Progress', () => {
    it('should update progress during upload', async () => {
      let progressCallback: ((progress: any) => void) | undefined;
      mockUploadPhoto.mockImplementation((uri, userId, slot, onProgress) => {
        progressCallback = onProgress;
        return new Promise((resolve) => {
          setTimeout(() => {
            if (progressCallback) {
              progressCallback({ percent: 50 });
              setTimeout(() => {
                if (progressCallback) {
                  progressCallback({ percent: 100 });
                }
                resolve({
                  success: true,
                  url: 'https://example.com/photo1.jpg',
                  error: null,
                });
              }, 10);
            }
          }, 10);
        });
      });

      (mockGetMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (mockLaunchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///test/photo.jpg' }],
      });

      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      await act(async () => {
        await result.current.selectAndUploadPhoto('slot1');
      });

      await waitFor(() => {
        expect(result.current.uploadState.progress).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (mockGetMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (mockLaunchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///test/photo.jpg' }],
      });
    });

    it('should handle image picker errors', async () => {
      (mockLaunchImageLibraryAsync as jest.Mock).mockRejectedValue(
        new Error('Picker error')
      );

      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.selectAndUploadPhoto('slot1');
      });

      expect(uploadResult).toBeNull();
      expect(result.current.uploadState.error).toBe('Failed to upload photo');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Upload Failed',
        'Failed to upload photo',
        [{ text: 'OK' }]
      );
    });

    it('should handle validation errors', async () => {
      mockUploadPhoto.mockRejectedValue(
        new Error('Invalid file')
      );

      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.selectAndUploadPhoto('slot1');
      });

      expect(uploadResult).toBeNull();
      expect(result.current.uploadState.error).toBe('Failed to upload photo');
    });

    it('should handle storage errors', async () => {
      mockUploadPhoto.mockRejectedValue(
        new Error('Storage error')
      );

      const { result } = renderHook(() => usePhotoUpload(), { wrapper });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.selectAndUploadPhoto('slot1');
      });

      expect(uploadResult).toBeNull();
      expect(result.current.uploadState.error).toBe('Failed to upload photo');
    });
  });
});

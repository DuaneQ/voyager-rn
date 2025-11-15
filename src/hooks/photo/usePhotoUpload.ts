/**
 * usePhotoUpload Hook
 * Custom hook for managing photo upload state and operations
 * Implements Single Responsibility - handles upload state management only
 */

import { useState, useCallback, useContext } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

import {
  PhotoSlot,
  UploadProgress,
  UploadResult,
  PhotoUploadError,
  PhotoUploadErrorType,
  PhotoSelectionOptions,
} from '../../types/Photo';
import { photoService } from '../../services/photo/PhotoService';
import { IMAGE_PICKER_SETTINGS, UPLOAD_RETRY_SETTINGS } from '../../config/storage';
import { UserProfileContext } from '../../context/UserProfileContext';
import * as firebaseCfg from '../../config/firebaseConfig';

/**
 * Upload state
 */
interface UploadState {
  loading: boolean;
  progress: number;
  error: string | null;
  uploadedUrl: string | null;
}

/**
 * usePhotoUpload hook return type
 */
interface UsePhotoUploadReturn {
  /** Upload state */
  uploadState: UploadState;
  
  /** Select and upload a photo */
  selectAndUploadPhoto: (
    slot: PhotoSlot,
    options?: PhotoSelectionOptions
  ) => Promise<UploadResult | null>;
  
  /** Delete a photo */
  deletePhoto: (slot: PhotoSlot) => Promise<void>;
  
  /** Clear upload state */
  clearState: () => void;
  
  /** Request camera permission */
  requestCameraPermission: () => Promise<boolean>;
  
  /** Request media library permission */
  requestMediaLibraryPermission: () => Promise<boolean>;
}

/**
 * Custom hook for photo upload operations
 * @param userId User ID (optional if using UserProfileContext)
 */
export const usePhotoUpload = (userId?: string): UsePhotoUploadReturn => {
  const { userProfile, updateUserProfile } = useContext(UserProfileContext);
  // Defensive resolution of auth instance: some test mocks or environments may export
  // either a `getAuthInstance()` function or an `auth` object. Prefer callable
  // getAuthInstance when available, otherwise fall back to `auth` shape.
  // Do not resolve the auth/uid at hook init time. Resolve at call-time so
  // tests can mutate the mocked auth module (setMockUser / clearMockUser)
  // and the hook will pick up the latest auth state.

  // Cache permission status to avoid repeated checks
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const [uploadState, setUploadState] = useState<UploadState>({
    loading: false,
    progress: 0,
    error: null,
    uploadedUrl: null,
  });

  /**
   * Clear upload state
   */
  const clearState = useCallback(() => {
    setUploadState({
      loading: false,
      progress: 0,
      error: null,
      uploadedUrl: null,
    });
  }, []);

  /**
   * Handle upload progress
   */
  const handleProgress = useCallback((progress: UploadProgress) => {
    setUploadState((prev) => ({
      ...prev,
      progress: progress.percent,
    }));
  }, []);

  /**
   * Request camera permission
   */
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return true; // Web doesn't need explicit permission
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Camera permission is required to take photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }, []);

  /**
   * Request media library permission (cached)
   */
  const requestMediaLibraryPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return true; // Web doesn't need explicit permission
    }

    // Use cached result if available
    if (permissionGranted !== null) {
      console.log('[usePhotoUpload] Using cached permission:', permissionGranted);
      return permissionGranted;
    }

    // Check permission only once
    console.log('[usePhotoUpload] Checking permission...');
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    console.log('[usePhotoUpload] Permission status:', status);
    
    const granted = status === 'granted';
    setPermissionGranted(granted);
    
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Please enable photo library access in Settings',
        [{ text: 'OK' }]
      );
    }
    
    return granted;
  }, [permissionGranted]);

  /**
   * Select and upload a photo with retry logic
   */
  const selectAndUploadPhoto = useCallback(
    async (
      slot: PhotoSlot,
      options?: PhotoSelectionOptions
    ): Promise<UploadResult | null> => {
      // Resolve effective user id at call-time to reflect any test-time mocks
      const resolvedAuth: any = (firebaseCfg && typeof (firebaseCfg as any).getAuthInstance === 'function')
        ? (firebaseCfg as any).getAuthInstance()
        : (firebaseCfg as any).auth || null;
      const currentUserId = userId || resolvedAuth?.currentUser?.uid;

      if (!currentUserId) {
        setUploadState((prev) => ({
          ...prev,
          error: 'User not authenticated',
        }));
        return null;
      }

      try {
        // Clear previous state
        clearState();

        // Request permission
        const hasPermission = await requestMediaLibraryPermission();
        if (!hasPermission) {
          return null;
        }

        // Select image
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: options?.allowsEditing ?? IMAGE_PICKER_SETTINGS.allowsEditing,
          aspect: options?.aspect || (slot === 'profile' 
            ? IMAGE_PICKER_SETTINGS.profileAspect 
            : IMAGE_PICKER_SETTINGS.galleryAspect),
          quality: options?.quality ?? IMAGE_PICKER_SETTINGS.quality,
          base64: options?.base64 ?? IMAGE_PICKER_SETTINGS.base64,
        });

        if (result.canceled) {
          return null;
        }

        const selectedAsset = result.assets[0];
        if (!selectedAsset.uri) {
          throw new Error('No image URI found');
        }

        // Set loading state
        setUploadState({
          loading: true,
          progress: 0,
          error: null,
          uploadedUrl: null,
        });

        // Upload with retry logic
        const uploadResult = await uploadWithRetry(
          selectedAsset.uri,
          slot,
          currentUserId,
          handleProgress
        );

        // Update state on success
        setUploadState({
          loading: false,
          progress: 100,
          error: null,
          uploadedUrl: uploadResult.url,
        });

        // Update user profile context
        if (userProfile) {
          const updatedProfile = {
            ...userProfile,
            photos: {
              ...userProfile.photos,
              [slot]: uploadResult.url,
            },
          };
          updateUserProfile(updatedProfile);
        }

        return uploadResult;
      } catch (error) {
        const errorMessage = error instanceof PhotoUploadError 
          ? error.message 
          : 'Failed to upload photo';

        setUploadState({
          loading: false,
          progress: 0,
          error: errorMessage,
          uploadedUrl: null,
        });

        Alert.alert('Upload Failed', errorMessage, [{ text: 'OK' }]);
        return null;
      }
    },
    [userProfile, updateUserProfile, clearState, requestMediaLibraryPermission, handleProgress]
  );

  /**
   * Delete a photo
   */
  const deletePhoto = useCallback(
    async (slot: PhotoSlot): Promise<void> => {
      // Resolve current user id at call-time
      const resolvedAuthForDelete: any = (firebaseCfg && typeof (firebaseCfg as any).getAuthInstance === 'function')
        ? (firebaseCfg as any).getAuthInstance()
        : (firebaseCfg as any).auth || null;
      const currentUserIdForDelete = userId || resolvedAuthForDelete?.currentUser?.uid;

      if (!currentUserIdForDelete) {
        setUploadState((prev) => ({
          ...prev,
          error: 'User not authenticated',
        }));
        return;
      }

      try {
        setUploadState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));

        // Delete photo
  await photoService.deletePhoto(slot, currentUserIdForDelete);

        // Update user profile context
        if (userProfile) {
          const updatedProfile = {
            ...userProfile,
            photos: {
              ...userProfile.photos,
              [slot]: '',
            },
          };
          updateUserProfile(updatedProfile);
        }

        setUploadState({
          loading: false,
          progress: 0,
          error: null,
          uploadedUrl: null,
        });
      } catch (error) {
        const errorMessage = error instanceof PhotoUploadError 
          ? error.message 
          : 'Failed to delete photo';

        setUploadState({
          loading: false,
          progress: 0,
          error: errorMessage,
          uploadedUrl: null,
        });

        Alert.alert('Delete Failed', errorMessage, [{ text: 'OK' }]);
      }
    },
    [userProfile, updateUserProfile]
  );

  return {
    uploadState,
    selectAndUploadPhoto,
    deletePhoto,
    clearState,
    requestCameraPermission,
    requestMediaLibraryPermission,
  };
};

/**
 * Upload with exponential backoff retry
 * @private
 */
async function uploadWithRetry(
  uri: string,
  slot: PhotoSlot,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
  attemptNumber: number = 1
): Promise<UploadResult> {
  try {
    return await photoService.uploadPhoto(uri, slot, userId, onProgress);
  } catch (error) {
    // Don't retry on certain error types
    if (error instanceof PhotoUploadError) {
      if (
        error.type === PhotoUploadErrorType.FILE_TOO_LARGE ||
        error.type === PhotoUploadErrorType.INVALID_FILE_TYPE ||
        error.type === PhotoUploadErrorType.PERMISSION_DENIED
      ) {
        throw error;
      }
    }

    // Retry logic with exponential backoff
    if (attemptNumber < UPLOAD_RETRY_SETTINGS.maxAttempts) {
      const delay = Math.min(
        UPLOAD_RETRY_SETTINGS.initialDelay * Math.pow(UPLOAD_RETRY_SETTINGS.delayMultiplier, attemptNumber - 1),
        UPLOAD_RETRY_SETTINGS.maxDelay
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      
      return uploadWithRetry(uri, slot, userId, onProgress, attemptNumber + 1);
    }

    throw error;
  }
}

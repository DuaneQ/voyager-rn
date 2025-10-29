/**
 * Photo Service Implementation
 * Handles photo upload, deletion, and retrieval with Firebase Storage
 * Implements Single Responsibility Principle - only handles photo operations
 */

import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import {
  IPhotoService,
  PhotoSlot,
  UploadProgress,
  UploadResult,
  UserPhotos,
  PhotoUploadError,
  PhotoUploadErrorType,
} from '../../types/Photo';
import {
  STORAGE_PATHS,
  FILE_SIZE_LIMITS,
  COMPRESSION_SETTINGS,
  FIRESTORE_COLLECTIONS,
  validateFileSize,
  formatBytes,
} from '../../config/storage';

/**
 * PhotoService - Concrete implementation of IPhotoService
 * Dependency Inversion: Depends on Firebase interfaces, not concrete implementations
 */
export class PhotoService implements IPhotoService {
  private _storage: ReturnType<typeof getStorage> | null = null;
  private _firestore: ReturnType<typeof getFirestore> | null = null;

  /**
   * Lazy-initialize storage to avoid Firebase initialization errors in tests
   */
  private get storage() {
    if (!this._storage) {
      this._storage = getStorage();
    }
    return this._storage;
  }

  /**
   * Lazy-initialize firestore to avoid Firebase initialization errors in tests
   */
  private get firestore() {
    if (!this._firestore) {
      this._firestore = getFirestore();
    }
    return this._firestore;
  }

  /**
   * Upload a photo to Firebase Storage
   * @param uri Local file URI (file://, content://, or data:)
   * @param slot Photo slot identifier
   * @param userId User ID
   * @param onProgress Optional progress callback
   * @returns Upload result with download URL
   */
  async uploadPhoto(
    uri: string,
    slot: PhotoSlot,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.log('[PhotoService] uploadPhoto called:', { uri, slot, userId });
    try {
      // Step 1: Validate and compress image
      console.log('[PhotoService] Step 1: Compressing image...');
      const compressedUri = await this.compressImage(uri);
      console.log('[PhotoService] Image compressed:', compressedUri);

      // Step 2: Convert URI to Blob
      console.log('[PhotoService] Step 2: Converting to blob...');
      const blob = await this.uriToBlob(compressedUri);
      console.log('[PhotoService] Blob created, size:', blob.size);

      // Step 3: Validate file size
      if (!validateFileSize(blob.size)) {
        throw new PhotoUploadError(
          PhotoUploadErrorType.FILE_TOO_LARGE,
          `File size ${formatBytes(blob.size)} exceeds maximum of ${FILE_SIZE_LIMITS.MAX_SIZE_DISPLAY}`
        );
      }

      // Step 4: Get storage reference
      // Generate filename similar to PWA (timestamp-based to avoid collisions)
      const timestamp = Date.now();
      const filename = `${slot}-${timestamp}.jpg`;
      const storagePath = STORAGE_PATHS.getPath(userId, slot, filename);
      console.log('[PhotoService] Step 4: Storage path:', storagePath);
      const storageRef = ref(this.storage, storagePath);
      console.log('[PhotoService] Storage ref created');

      // Step 5: Upload with progress tracking
      console.log('[PhotoService] Step 5: Starting upload...');
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: 'image/jpeg',
      });
      console.log('[PhotoService] Upload task created');

      // Track upload progress
      const downloadURL = await new Promise<string>((resolve, reject) => {
        console.log('[PhotoService] Setting up upload listeners...');
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            console.log('[PhotoService] Upload progress:', percent + '%');
            if (onProgress) {
              const progress: UploadProgress = {
                percent,
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
              };
              onProgress(progress);
            }
          },
          (error) => {
            // Handle upload errors
            console.log('[PhotoService] Upload error:', error);
            const uploadError = this.handleUploadError(error);
            reject(uploadError);
          },
          async () => {
            // Upload completed successfully
            console.log('[PhotoService] Upload complete, getting download URL...');
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('[PhotoService] Download URL obtained:', url);
              resolve(url);
            } catch (error) {
              console.log('[PhotoService] Failed to get download URL:', error);
              reject(
                new PhotoUploadError(
                  PhotoUploadErrorType.UPLOAD_FAILED,
                  'Failed to get download URL',
                  error as Error
                )
              );
            }
          }
        );
      });

      // Step 6: Update Firestore with photo URL
      await this.updateUserPhoto(userId, slot, downloadURL);

      return {
        url: downloadURL,
        storagePath,
        slot,
      };
    } catch (error) {
      if (error instanceof PhotoUploadError) {
        throw error;
      }
      throw new PhotoUploadError(
        PhotoUploadErrorType.UNKNOWN,
        'Unknown error during photo upload',
        error as Error
      );
    }
  }

  /**
   * Delete a photo from Firebase Storage and Firestore
   * @param slot Photo slot identifier
   * @param userId User ID
   */
  async deletePhoto(slot: PhotoSlot, userId: string): Promise<void> {
    try {
      // Step 1: Get storage reference
      const storagePath = STORAGE_PATHS.getPath(userId, slot);
      const storageRef = ref(this.storage, storagePath);

      // Step 2: Delete from Storage (ignore if file doesn't exist)
      try {
        await deleteObject(storageRef);
      } catch (error: any) {
        // Ignore 'object-not-found' errors
        if (error.code !== 'storage/object-not-found') {
          throw error;
        }
      }

      // Step 3: Update Firestore to remove photo URL
      await this.updateUserPhoto(userId, slot, '');
    } catch (error) {
      throw new PhotoUploadError(
        PhotoUploadErrorType.UNKNOWN,
        'Failed to delete photo',
        error as Error
      );
    }
  }

  /**
   * Get user's photos from Firestore
   * @param userId User ID
   * @returns User photos object
   */
  async getUserPhotos(userId: string): Promise<UserPhotos> {
    try {
      const userRef = doc(this.firestore, FIRESTORE_COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return {};
      }

      const userData = userSnap.data();
      return userData.photos || {};
    } catch (error) {
      throw new PhotoUploadError(
        PhotoUploadErrorType.UNKNOWN,
        'Failed to retrieve user photos',
        error as Error
      );
    }
  }

  /**
   * Compress image to reduce file size
   * @private
   */
  private async compressImage(uri: string): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: COMPRESSION_SETTINGS.maxWidth,
              height: COMPRESSION_SETTINGS.maxHeight,
            },
          },
        ],
        {
          compress: COMPRESSION_SETTINGS.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result.uri;
    } catch (error) {
      throw new PhotoUploadError(
        PhotoUploadErrorType.COMPRESSION_FAILED,
        'Failed to compress image',
        error as Error
      );
    }
  }

  /**
   * Convert local URI to Blob for upload
   * @private
   */
  private async uriToBlob(uri: string): Promise<Blob> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob;
    } catch (error) {
      throw new PhotoUploadError(
        PhotoUploadErrorType.UPLOAD_FAILED,
        'Failed to convert image to blob',
        error as Error
      );
    }
  }

  /**
   * Update user's photo URL in Firestore
   * @private
   */
  private async updateUserPhoto(userId: string, slot: PhotoSlot, url: string): Promise<void> {
    try {
      const userRef = doc(this.firestore, FIRESTORE_COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        [`photos.${slot}`]: url,
      });
    } catch (error) {
      throw new PhotoUploadError(
        PhotoUploadErrorType.UPLOAD_FAILED,
        'Failed to update user profile',
        error as Error
      );
    }
  }

  /**
   * Handle Firebase Storage upload errors
   * @private
   */
  private handleUploadError(error: any): PhotoUploadError {
    const errorCode = error.code;

    switch (errorCode) {
      case 'storage/unauthorized':
        return new PhotoUploadError(
          PhotoUploadErrorType.PERMISSION_DENIED,
          'You do not have permission to upload photos',
          error
        );
      case 'storage/canceled':
        return new PhotoUploadError(
          PhotoUploadErrorType.UPLOAD_FAILED,
          'Upload was cancelled',
          error
        );
      case 'storage/network-error':
      case 'storage/retry-limit-exceeded':
        return new PhotoUploadError(
          PhotoUploadErrorType.NETWORK_ERROR,
          'Network error during upload. Please check your connection.',
          error
        );
      case 'storage/unknown':
        return new PhotoUploadError(
          PhotoUploadErrorType.UNKNOWN,
          'Unknown storage error occurred',
          error
        );
      default:
        if (error.message?.includes('network')) {
          return new PhotoUploadError(
            PhotoUploadErrorType.NETWORK_ERROR,
            'Network error during upload. Please check your connection.',
            error
          );
        }
        return new PhotoUploadError(
          PhotoUploadErrorType.UPLOAD_FAILED,
          error.message || 'Unknown upload error',
          error
        );
    }
  }
}

/**
 * Singleton instance for dependency injection
 */
export const photoService = new PhotoService();

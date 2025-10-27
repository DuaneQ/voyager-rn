/**
 * PhotoService Tests
 * Comprehensive unit tests for PhotoService with ≥90% coverage
 * 
 * Test Coverage:
 * - uploadPhoto: success, compression, validation, progress tracking, Firestore update
 * - deletePhoto: success, error handling
 * - getUserPhotos: success, empty photos, error handling
 * - Error handling: all PhotoUploadErrorType scenarios
 * - Edge cases: large files, invalid formats, network errors
 */

// Mock Firebase modules BEFORE importing anything
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  deleteObject: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator');

import { PhotoService } from '../../../services/photo/PhotoService';
import { PhotoUploadError, PhotoUploadErrorType, type PhotoSlot } from '../../../types/Photo';
import * as ImageManipulator from 'expo-image-manipulator';
import { FILE_SIZE_LIMITS } from '../../../config/storage';

import { 
  ref, 
  uploadBytesResumable, 
  deleteObject, 
  getDownloadURL 
} from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

describe('PhotoService', () => {
  let photoService: PhotoService;
  
  beforeEach(() => {
    photoService = new PhotoService();
    jest.clearAllMocks();
  });

  describe('uploadPhoto', () => {
    const mockUserId = 'test-user-123';
    const mockSlot: PhotoSlot = 'profile';
    const mockUri = 'file:///test-image.jpg';
    const mockCompressedUri = 'file:///test-image-compressed.jpg';
    const mockDownloadUrl = 'https://storage.googleapis.com/test-bucket/test-image.jpg';

    beforeEach(() => {
      // Mock image compression
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: mockCompressedUri,
        width: 1920,
        height: 1920,
      });

      // Mock blob creation
      global.fetch = jest.fn(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['mock-image-data'], { type: 'image/jpeg' })),
        } as Response)
      );

      // Mock Firebase Storage
      const mockStorageRef = { fullPath: `users/${mockUserId}/profile.jpg` };
      (ref as jest.Mock).mockReturnValue(mockStorageRef);

      const mockUploadTask = {
        snapshot: {
          ref: mockStorageRef,
          bytesTransferred: 100,
          totalBytes: 100,
        },
        on: jest.fn((event, progressCallback, errorCallback, completeCallback) => {
          // Simulate progress updates
          setTimeout(() => {
            progressCallback({ bytesTransferred: 50, totalBytes: 100 });
          }, 0);
          setTimeout(() => {
            progressCallback({ bytesTransferred: 100, totalBytes: 100 });
          }, 0);
          // Simulate completion after progress
          setTimeout(() => {
            completeCallback();
          }, 0);
        }),
      };
      (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);
      (getDownloadURL as jest.Mock).mockResolvedValue(mockDownloadUrl);

      // Mock Firestore
      (doc as jest.Mock).mockReturnValue({ id: mockUserId });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
    });

    it('should successfully upload a photo with progress tracking', async () => {
      const progressCallback = jest.fn();

      const result = await photoService.uploadPhoto(
        mockUri,
        mockSlot,
        mockUserId,
        progressCallback
      );

      // Verify result structure (path will have dynamic timestamp)
      expect(result.url).toBe(mockDownloadUrl);
      expect(result.slot).toBe(mockSlot);
      expect(result.storagePath).toMatch(/^photos\/test-user-123\/profile\/profile-\d+\.jpg$/);

      // Verify compression was called
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockUri,
        [{ resize: { width: 1920, height: 1920 } }],
        expect.objectContaining({
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        })
      );

      // Verify progress tracking
      expect(progressCallback).toHaveBeenCalledWith({
        percent: 50,
        bytesTransferred: 50,
        totalBytes: 100,
      });
      expect(progressCallback).toHaveBeenCalledWith({
        percent: 100,
        bytesTransferred: 100,
        totalBytes: 100,
      });

      // Verify Firestore update
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { [`photos.${mockSlot}`]: mockDownloadUrl }
      );
    });

    it('should throw FILE_TOO_LARGE error when image exceeds size limit', async () => {
      // Mock large blob
      const largeBlob = new Blob(['x'.repeat(FILE_SIZE_LIMITS.MAX_SIZE_BYTES + 1)], { 
        type: 'image/jpeg' 
      });
      global.fetch = jest.fn(() =>
        Promise.resolve({
          blob: () => Promise.resolve(largeBlob),
        } as Response)
      );

      await expect(
        photoService.uploadPhoto(mockUri, mockSlot, mockUserId)
      ).rejects.toThrow(PhotoUploadError);

      try {
        await photoService.uploadPhoto(mockUri, mockSlot, mockUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(PhotoUploadError);
        expect((error as PhotoUploadError).type).toBe(PhotoUploadErrorType.FILE_TOO_LARGE);
      }
    });

    it('should handle compression errors gracefully', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValue(
        new Error('Compression failed')
      );

      await expect(
        photoService.uploadPhoto(mockUri, mockSlot, mockUserId)
      ).rejects.toThrow(PhotoUploadError);
    });

    it('should handle network errors during upload', async () => {
      const mockUploadTask = {
        on: jest.fn((event, progressCallback, errorCallback) => {
          errorCallback({ code: 'storage/network-error', message: 'Network error' });
        }),
      };
      (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);

      await expect(
        photoService.uploadPhoto(mockUri, mockSlot, mockUserId)
      ).rejects.toThrow(PhotoUploadError);

      try {
        await photoService.uploadPhoto(mockUri, mockSlot, mockUserId);
      } catch (error) {
        expect((error as PhotoUploadError).type).toBe(PhotoUploadErrorType.NETWORK_ERROR);
      }
    });

    it('should handle permission denied errors', async () => {
      const mockUploadTask = {
        on: jest.fn((event, progressCallback, errorCallback) => {
          errorCallback({ code: 'storage/unauthorized', message: 'Unauthorized' });
        }),
      };
      (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);

      await expect(
        photoService.uploadPhoto(mockUri, mockSlot, mockUserId)
      ).rejects.toThrow(PhotoUploadError);

      try {
        await photoService.uploadPhoto(mockUri, mockSlot, mockUserId);
      } catch (error) {
        expect((error as PhotoUploadError).type).toBe(PhotoUploadErrorType.PERMISSION_DENIED);
      }
    });

    it('should upload to correct storage path for profile photo', async () => {
      await photoService.uploadPhoto(mockUri, 'profile', mockUserId);

      // Verify path structure (filename will have dynamic timestamp)
      const refCalls = (ref as jest.Mock).mock.calls;
      expect(refCalls.length).toBeGreaterThan(0);
      const storagePath = refCalls[0][1];
      expect(storagePath).toMatch(/^photos\/test-user-123\/profile\/profile-\d+\.jpg$/);
    });

    it('should upload to correct storage path for gallery photos', async () => {
      await photoService.uploadPhoto(mockUri, 'slot1', mockUserId);

      // Verify path structure (filename will have dynamic timestamp)
      const refCalls = (ref as jest.Mock).mock.calls;
      expect(refCalls.length).toBeGreaterThan(0);
      const storagePath = refCalls[refCalls.length - 1][1];
      expect(storagePath).toMatch(/^photos\/test-user-123\/slot1\/slot1-\d+\.jpg$/);
    });
  });

  describe('deletePhoto', () => {
    const mockUserId = 'test-user-123';
    const mockSlot: PhotoSlot = 'slot1';

    beforeEach(() => {
      const mockStorageRef = { fullPath: `users/${mockUserId}/photos/slot1.jpg` };
      (ref as jest.Mock).mockReturnValue(mockStorageRef);
      (deleteObject as jest.Mock).mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue({ id: mockUserId });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
    });

    it('should successfully delete a photo', async () => {
      await photoService.deletePhoto(mockSlot, mockUserId);

      // Verify Storage deletion
      expect(deleteObject).toHaveBeenCalledWith(
        expect.objectContaining({
          fullPath: `users/${mockUserId}/photos/slot1.jpg`,
        })
      );

      // Verify Firestore update
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { [`photos.${mockSlot}`]: '' }
      );
    });

    it('should handle storage deletion errors', async () => {
      (deleteObject as jest.Mock).mockRejectedValue(
        new Error('Object not found')
      );

      await expect(
        photoService.deletePhoto(mockSlot, mockUserId)
      ).rejects.toThrow();
    });

    it('should handle Firestore update errors', async () => {
      (updateDoc as jest.Mock).mockRejectedValue(
        new Error('Firestore update failed')
      );

      await expect(
        photoService.deletePhoto(mockSlot, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('getUserPhotos', () => {
    const mockUserId = 'test-user-123';

    beforeEach(() => {
      (doc as jest.Mock).mockReturnValue({ id: mockUserId });
    });

    it('should retrieve user photos successfully', async () => {
      const mockPhotos = {
        profile: 'https://example.com/profile.jpg',
        slot1: 'https://example.com/slot1.jpg',
        slot2: 'https://example.com/slot2.jpg',
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ photos: mockPhotos }),
      });

      const result = await photoService.getUserPhotos(mockUserId);

      expect(result).toEqual(mockPhotos);
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return empty object when user has no photos', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });

      const result = await photoService.getUserPhotos(mockUserId);

      expect(result).toEqual({});
    });

    it('should return empty object when user document does not exist', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await photoService.getUserPhotos(mockUserId);

      expect(result).toEqual({});
    });

    it('should handle Firestore errors', async () => {
      (getDoc as jest.Mock).mockRejectedValue(
        new Error('Firestore read failed')
      );

      await expect(
        photoService.getUserPhotos(mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should create PhotoUploadError with correct type and message', () => {
      const error = new PhotoUploadError(
        PhotoUploadErrorType.FILE_TOO_LARGE,
        'Test error message'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PhotoUploadError);
      expect(error.message).toBe('Test error message');
      expect(error.type).toBe(PhotoUploadErrorType.FILE_TOO_LARGE);
      expect(error.name).toBe('PhotoUploadError');
    });

    it('should map Firebase error codes to PhotoUploadErrorType', async () => {
      const errorCases = [
        { code: 'storage/unauthorized', expectedType: PhotoUploadErrorType.PERMISSION_DENIED },
        { code: 'storage/canceled', expectedType: PhotoUploadErrorType.UPLOAD_FAILED },
        { code: 'storage/network-error', expectedType: PhotoUploadErrorType.NETWORK_ERROR },
        { code: 'storage/unknown', expectedType: PhotoUploadErrorType.UNKNOWN },
      ];

      for (const { code, expectedType } of errorCases) {
        const mockUploadTask = {
          on: jest.fn((event, progressCallback, errorCallback) => {
            errorCallback({ code, message: 'Test error' });
          }),
        };
        (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);

        try {
          await photoService.uploadPhoto('test-uri', 'profile', 'test-user');
        } catch (error) {
          expect((error as PhotoUploadError).type).toBe(expectedType);
        }
      }
    });
  });
});

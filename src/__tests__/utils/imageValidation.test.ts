/**
 * Image Validation Unit Tests
 * Tests image validation, compression, and conversion utilities
 */

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  validateImage,
  compressImage,
  convertToJPEG,
  getImageSize,
  prepareImageForUpload,
} from '../../utils/imageValidation';

// Mock Expo modules
jest.mock('expo-file-system');
jest.mock('expo-image-manipulator');

describe('imageValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateImage', () => {
    it('should validate a valid JPEG image', async () => {
      const mockFileInfo = {
        exists: true,
        size: 2 * 1024 * 1024, // 2MB
        isDirectory: false,
        uri: 'file:///image.jpg',
      };

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue(mockFileInfo);

      const result = await validateImage('file:///image.jpg', 'image/jpeg');

      expect(result.isValid).toBe(true);
      expect(result.fileSize).toBe(2 * 1024 * 1024);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid file extension', async () => {
      const result = await validateImage('file:///document.pdf', 'application/pdf');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid MIME type');
    });

    it('should flag HEIC for conversion', async () => {
      const mockFileInfo = {
        exists: true,
        size: 1 * 1024 * 1024,
        isDirectory: false,
        uri: 'file:///image.heic',
      };

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue(mockFileInfo);

      const result = await validateImage('file:///image.heic', 'image/heic');

      expect(result.isValid).toBe(true);
      expect(result.needsConversion).toBe(true);
    });

    it('should reject file exceeding size limit', async () => {
      const mockFileInfo = {
        exists: true,
        size: 10 * 1024 * 1024, // 10MB (exceeds 5MB limit)
        isDirectory: false,
        uri: 'file:///large-image.jpg',
      };

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue(mockFileInfo);

      const result = await validateImage('file:///large-image.jpg', 'image/jpeg');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Image too large');
      expect(result.error).toContain('10.0MB');
    });

    it('should reject non-existent file', async () => {
      const result = await validateImage('file:///missing.jpg');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('compressImage', () => {
    it('should compress image successfully', async () => {
      const mockResult = {
        uri: 'file:///compressed.jpg',
        width: 2048,
        height: 1536,
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockResult);

      const compressedUri = await compressImage('file:///original.jpg');

      expect(compressedUri).toBe('file:///compressed.jpg');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file:///original.jpg',
        [{ resize: { width: 2048 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
    });

    it('should use custom max dimension', async () => {
      const mockResult = {
        uri: 'file:///compressed.jpg',
        width: 1024,
        height: 768,
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockResult);

      await compressImage('file:///original.jpg', 1024);

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file:///original.jpg',
        [{ resize: { width: 1024 } }],
        expect.any(Object)
      );
    });

    it('should throw error on compression failure', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValue(
        new Error('Compression failed')
      );

      await expect(compressImage('file:///original.jpg')).rejects.toThrow();
    });
  });

  describe('convertToJPEG', () => {
    it('should convert HEIC to JPEG', async () => {
      const mockResult = {
        uri: 'file:///converted.jpg',
        width: 1920,
        height: 1080,
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockResult);

      const convertedUri = await convertToJPEG('file:///image.heic');

      expect(convertedUri).toBe('file:///converted.jpg');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file:///image.heic',
        [],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
    });
  });

  describe('getImageSize', () => {
    it('should return file size', async () => {
      // Mock File will return 1024000 for '1mb' in URI
      const size = await getImageSize('file:///1mb-image.jpg');

      expect(size).toBe(1024000);
    });

    it('should return 0 for non-existent file', async () => {
      // Mock File will throw for 'missing' in URI
      const size = await getImageSize('file:///missing.jpg');

      expect(size).toBe(0);
    });

    it('should return 0 on error', async () => {
      // Mock File will throw for 'non-existent' in URI
      const size = await getImageSize('file:///non-existent.jpg');

      expect(size).toBe(0);
    });
  });

  describe('prepareImageForUpload', () => {
    it('should prepare valid image without modifications', async () => {
      const mockFileInfo = {
        exists: true,
        size: 1 * 1024 * 1024, // 1MB - under threshold
        isDirectory: false,
      };

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue(mockFileInfo);

      const result = await prepareImageForUpload('file:///image.jpg', 'image/jpeg');

      expect(result.uri).toBe('file:///image.jpg');
      expect(result.error).toBeUndefined();
    });

    it('should convert HEIC to JPEG', async () => {
      const mockFileInfo = {
        exists: true,
        size: 1 * 1024 * 1024,
        isDirectory: false,
      };

      const mockConverted = {
        uri: 'file:///converted.jpg',
      };

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue(mockFileInfo);
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockConverted);

      const result = await prepareImageForUpload('file:///image.heic', 'image/heic');

      expect(result.uri).toBe('file:///converted.jpg');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalled();
    });

    it('should compress large images', async () => {
      const mockFileInfo1 = {
        exists: true,
        size: 4.5 * 1024 * 1024, // 4.5MB - above 80% threshold
        isDirectory: false,
      };

      const mockFileInfo2 = {
        exists: true,
        size: 2 * 1024 * 1024, // Compressed size
        isDirectory: false,
      };

      const mockCompressed = {
        uri: 'file:///compressed.jpg',
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockCompressed);

      const result = await prepareImageForUpload('file:///large.jpg', 'image/jpeg');

      expect(result.uri).toBe('file:///compressed.jpg');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalled();
    });

    it('should return error for invalid image', async () => {
      const result = await prepareImageForUpload('file:///document.pdf', 'application/pdf');

      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid MIME type');
    });
  });
});

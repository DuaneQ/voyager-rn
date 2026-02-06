/**
 * Tests for videoValidation utility
 * Video validation functions for React Native using Expo
 */

import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import {
  validateVideoFile,
  getVideoDuration,
  validateVideoMetadata,
  generateVideoThumbnail,
  getFileSize,
} from '../../utils/videoValidation';
import { VIDEO_CONSTRAINTS } from '../../types/Video';

// Mock expo modules
jest.mock('expo-video-thumbnails');
jest.mock('expo-file-system');

// Mock expo-video createVideoPlayer
jest.mock('expo-video', () => ({
  createVideoPlayer: jest.fn(() => ({
    duration: 30, // 30 seconds
    status: 'readyToPlay',
    release: jest.fn(),
  })),
}));

describe('videoValidation', () => {
  // Track mock state for createVideoPlayer
  let mockPlayer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock player that returns valid duration
    mockPlayer = {
      duration: 30, // 30 seconds
      status: 'readyToPlay',
      release: jest.fn(),
    };
    
    // Reset the mock to return default player
    const expoVideo = require('expo-video');
    (expoVideo.createVideoPlayer as jest.Mock).mockReturnValue(mockPlayer);
  });

  describe('validateVideoFile', () => {
    const mockUri = 'file:///test/video.mp4';

    it('should validate a valid video file', async () => {
      const result = await validateVideoFile(mockUri, 10 * 1024 * 1024); // 10MB

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject video with no URI', async () => {
      const result = await validateVideoFile('', 1024);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No file provided');
    });

    it('should reject video with zero file size', async () => {
      const result = await validateVideoFile(mockUri, 0);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File appears to be empty');
    });

    it('should reject video exceeding max file size', async () => {
      const largeSize = VIDEO_CONSTRAINTS.MAX_FILE_SIZE + 1;

      const result = await validateVideoFile(mockUri, largeSize);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('File size too large');
    });

    it('should display file size in MB correctly', async () => {
      const fileSize = 151 * 1024 * 1024; // 151MB (exceeds 150MB limit)

      const result = await validateVideoFile(mockUri, fileSize);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch(/150.*MB/);
    });
  });

  describe('getVideoDuration', () => {
    const mockUri = 'file:///test/video.mp4';

    it('should get video duration successfully', async () => {
      const expoVideo = require('expo-video');
      mockPlayer.duration = 45;
      (expoVideo.createVideoPlayer as jest.Mock).mockReturnValue(mockPlayer);

      const duration = await getVideoDuration(mockUri);

      expect(duration).toBe(45);
      expect(mockPlayer.release).toHaveBeenCalled();
    });

    it('should throw error when video cannot be loaded', async () => {
      const expoVideo = require('expo-video');
      mockPlayer.duration = 0;
      mockPlayer.status = 'error';
      (expoVideo.createVideoPlayer as jest.Mock).mockReturnValue(mockPlayer);

      await expect(getVideoDuration(mockUri)).rejects.toThrow('Failed to load video metadata');
    });

    it('should throw error when duration is not available', async () => {
      const expoVideo = require('expo-video');
      mockPlayer.duration = 0;
      mockPlayer.status = 'readyToPlay';
      (expoVideo.createVideoPlayer as jest.Mock).mockReturnValue(mockPlayer);

      // This will timeout because duration is 0 and never becomes positive
      // We need to test the timeout case
      jest.useFakeTimers();
      const durationPromise = getVideoDuration(mockUri);
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(11000);
      
      await expect(durationPromise).rejects.toThrow();
      jest.useRealTimers();
    });

    it('should throw error when status is error', async () => {
      const expoVideo = require('expo-video');
      mockPlayer.duration = 0;
      mockPlayer.status = 'error';
      (expoVideo.createVideoPlayer as jest.Mock).mockReturnValue(mockPlayer);

      await expect(getVideoDuration(mockUri)).rejects.toThrow('Failed to load video metadata');
    });

    it('should return duration in seconds (expo-video returns seconds directly)', async () => {
      const expoVideo = require('expo-video');
      mockPlayer.duration = 90.5; // expo-video returns duration in seconds
      (expoVideo.createVideoPlayer as jest.Mock).mockReturnValue(mockPlayer);

      const duration = await getVideoDuration(mockUri);

      expect(duration).toBe(90.5);
    });
  });

  describe('validateVideoMetadata', () => {
    it('should validate valid metadata', () => {
      const result = validateVideoMetadata('My Video Title', 'A great description');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty title', () => {
      const result = validateVideoMetadata('', 'Description');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title cannot be empty');
    });

    it('should reject whitespace-only title', () => {
      const result = validateVideoMetadata('   ', 'Description');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title cannot be empty');
    });

    it('should reject title exceeding max length', () => {
      const longTitle = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH + 1);

      const result = validateVideoMetadata(longTitle, 'Description');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Title too long');
    });

    it('should reject description exceeding max length', () => {
      const longDescription = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH + 1);

      const result = validateVideoMetadata('Title', longDescription);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Description too long');
    });

    it('should allow undefined title', () => {
      const result = validateVideoMetadata(undefined, 'Description');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow undefined description', () => {
      const result = validateVideoMetadata('Title', undefined);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow both undefined', () => {
      const result = validateVideoMetadata(undefined, undefined);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow empty description', () => {
      const result = validateVideoMetadata('Title', '');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle title at exactly max length', () => {
      const maxTitle = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH);

      const result = validateVideoMetadata(maxTitle, 'Description');

      expect(result.isValid).toBe(true);
    });

    it('should handle description at exactly max length', () => {
      const maxDescription = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH);

      const result = validateVideoMetadata('Title', maxDescription);

      expect(result.isValid).toBe(true);
    });

    it('should collect multiple errors', () => {
      const longTitle = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH + 1);
      const longDescription = 'b'.repeat(VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH + 1);

      const result = validateVideoMetadata(longTitle, longDescription);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('generateVideoThumbnail', () => {
    const mockUri = 'file:///test/video.mp4';

    it('should generate thumbnail successfully', async () => {
      const mockThumbnailUri = 'file:///test/thumbnail.jpg';

      (VideoThumbnails.getThumbnailAsync as jest.Mock).mockResolvedValue({
        uri: mockThumbnailUri,
      });

      const result = await generateVideoThumbnail(mockUri);

      expect(result).toBe(mockThumbnailUri);
      expect(VideoThumbnails.getThumbnailAsync).toHaveBeenCalledWith(mockUri, {
        time: 1000, // 1 second
        quality: 0.7,
      });
    });

    it('should generate thumbnail at custom time', async () => {
      const mockThumbnailUri = 'file:///test/thumbnail.jpg';

      (VideoThumbnails.getThumbnailAsync as jest.Mock).mockResolvedValue({
        uri: mockThumbnailUri,
      });

      const result = await generateVideoThumbnail(mockUri, 5);

      expect(result).toBe(mockThumbnailUri);
      expect(VideoThumbnails.getThumbnailAsync).toHaveBeenCalledWith(mockUri, {
        time: 5000, // 5 seconds
        quality: 0.7,
      });
    });

    it('should throw error when thumbnail generation fails', async () => {
      (VideoThumbnails.getThumbnailAsync as jest.Mock).mockRejectedValue(
        new Error('Generation failed')
      );

      await expect(generateVideoThumbnail(mockUri)).rejects.toThrow('Failed to generate thumbnail');
    });

    it('should include error message in thrown error', async () => {
      (VideoThumbnails.getThumbnailAsync as jest.Mock).mockRejectedValue(
        new Error('Custom error message')
      );

      await expect(generateVideoThumbnail(mockUri)).rejects.toThrow('Custom error message');
    });

    it('should handle unknown errors', async () => {
      (VideoThumbnails.getThumbnailAsync as jest.Mock).mockRejectedValue('String error');

      await expect(generateVideoThumbnail(mockUri)).rejects.toThrow('Unknown error');
    });
  });

  describe('getFileSize', () => {
    const mockUri = 'file:///test/video.mp4';

    it('should get file size successfully', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 10485760, // 10MB
      });

      const size = await getFileSize(mockUri);

      expect(size).toBe(10485760);
      expect(FileSystem.getInfoAsync).toHaveBeenCalledWith(mockUri);
    });

    it('should throw error when file does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      await expect(getFileSize(mockUri)).rejects.toThrow('Failed to read file size');
    });

    it('should throw error when size property is missing', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        // size property missing
      });

      await expect(getFileSize(mockUri)).rejects.toThrow('Failed to read file size');
    });

    it('should throw error when getInfoAsync fails', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('Access denied'));

      await expect(getFileSize(mockUri)).rejects.toThrow('Failed to read file size');
    });

    it('should handle zero-size files', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 0,
      });

      const size = await getFileSize(mockUri);

      expect(size).toBe(0);
    });

    it('should handle very large files', async () => {
      const largeSize = 1024 * 1024 * 1024; // 1GB
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: largeSize,
      });

      const size = await getFileSize(mockUri);

      expect(size).toBe(largeSize);
    });
  });
});

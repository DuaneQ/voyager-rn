/**
 * VideoService Unit Tests
 * 
 * Test Plan:
 * 1. uploadVideo - successful upload with progress tracking
 * 2. uploadVideo - handles fetch errors
 * 3. uploadVideo - handles Firebase storage errors
 * 4. uploadVideo - handles thumbnail generation failure gracefully
 * 5. deleteVideo - successful deletion
 * 6. deleteVideo - handles deletion errors
 * 7. getUserVideos - retrieves user's videos
 * 8. getPublicVideos - retrieves public videos with pagination
 */

import { VideoService } from '../../../services/video/VideoService';
import { VideoUploadData } from '../../../types/Video';
import * as firebaseStorage from 'firebase/storage';
import * as firestore from 'firebase/firestore';
import * as videoValidation from '../../../utils/videoValidation';

// Mock Firebase modules
jest.mock('firebase/storage');
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));
jest.mock('../../../utils/videoValidation');
jest.mock('../../../config/firebaseConfig', () => ({
  storage: { _type: 'mock-storage' },
  db: { _type: 'mock-db' },
}));

const mockRef = firebaseStorage.ref as jest.MockedFunction<typeof firebaseStorage.ref>;
const mockUploadBytesResumable = firebaseStorage.uploadBytesResumable as jest.MockedFunction<typeof firebaseStorage.uploadBytesResumable>;
const mockGetDownloadURL = firebaseStorage.getDownloadURL as jest.MockedFunction<typeof firebaseStorage.getDownloadURL>;
const mockDeleteObject = firebaseStorage.deleteObject as jest.MockedFunction<typeof firebaseStorage.deleteObject>;

const mockCollection = firestore.collection as jest.MockedFunction<typeof firestore.collection>;
const mockAddDoc = firestore.addDoc as jest.MockedFunction<typeof firestore.addDoc>;
const mockGetDocs = firestore.getDocs as jest.MockedFunction<typeof firestore.getDocs>;
const mockDeleteDoc = firestore.deleteDoc as jest.MockedFunction<typeof firestore.deleteDoc>;
const mockDoc = firestore.doc as jest.MockedFunction<typeof firestore.doc>;
const mockQuery = firestore.query as jest.MockedFunction<typeof firestore.query>;
const mockWhere = firestore.where as jest.MockedFunction<typeof firestore.where>;
const mockOrderBy = firestore.orderBy as jest.MockedFunction<typeof firestore.orderBy>;
const mockLimit = firestore.limit as jest.MockedFunction<typeof firestore.limit>;
const mockTimestamp = firestore.Timestamp as any;

const mockGenerateVideoThumbnail = videoValidation.generateVideoThumbnail as jest.MockedFunction<typeof videoValidation.generateVideoThumbnail>;

describe('VideoService', () => {
  let videoService: VideoService;
  let mockFetch: jest.SpyInstance;
  let mockXHR: any;

  beforeEach(() => {
    videoService = new VideoService();
    jest.clearAllMocks();

    // Mock XMLHttpRequest for video file reading
    mockXHR = {
      open: jest.fn(),
      send: jest.fn(function() {
        // Simulate successful load
        setTimeout(() => {
          this.status = 200;
          this.response = new Blob(['video content'], { type: 'video/mp4' });
          this.onload?.();
        }, 0);
      }),
      setRequestHeader: jest.fn(),
      status: 200,
      response: null,
      onload: null,
      onerror: null,
      responseType: '',
    };
    
    global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

    // Mock fetch globally (for thumbnail fetch)
    mockFetch = jest.spyOn(global, 'fetch');

    // Default mock implementations
    mockRef.mockReturnValue({ fullPath: 'users/test-user/videos/video_123.mp4' } as any);
    mockCollection.mockReturnValue({ _type: 'mock-collection' } as any);
    mockDoc.mockReturnValue({ _type: 'mock-doc' } as any);
    mockQuery.mockReturnValue({ _type: 'mock-query' } as any);
    mockWhere.mockReturnValue({ _type: 'mock-where' } as any);
    mockOrderBy.mockReturnValue({ _type: 'mock-orderBy' } as any);
    mockLimit.mockReturnValue({ _type: 'mock-limit' } as any);
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe('uploadVideo', () => {
    const mockVideoData: VideoUploadData = {
      uri: 'file:///path/to/video.mp4',
      title: 'Test Video',
      description: 'Test Description',
      isPublic: true,
    };

    const userId = 'test-user-123';

    it('should successfully upload video with thumbnail and track progress', async () => {
      const mockOnProgress = jest.fn();
      const mockVideoBlob = new Blob(['video content'], { type: 'video/mp4' });
      const mockThumbnailBlob = new Blob(['thumbnail content'], { type: 'image/jpeg' });

      // Mock video fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockVideoBlob),
      } as Response);

      // Mock upload task for video
      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          // Simulate progress
          onProgress({ bytesTransferred: 50, totalBytes: 100 });
          onProgress({ bytesTransferred: 100, totalBytes: 100 });
          // Simulate completion
          onComplete();
        }),
        snapshot: {
          ref: { fullPath: 'users/test-user-123/videos/video_123.mp4' },
        },
      };

      mockUploadBytesResumable.mockReturnValueOnce(mockUploadTask as any);
      mockGetDownloadURL.mockResolvedValueOnce('https://storage.example.com/video.mp4');

      // Mock thumbnail generation
      mockGenerateVideoThumbnail.mockResolvedValue('file:///path/to/thumbnail.jpg');
      
      // Mock thumbnail fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockThumbnailBlob),
      } as Response);

      // Mock thumbnail upload - use returnValue instead of resolvedValue for UploadTask
      const mockThumbnailUploadTask = {
        snapshot: { ref: { fullPath: 'users/test-user-123/thumbnails/video_123.jpg' } },
      };
      mockUploadBytesResumable.mockReturnValue(mockThumbnailUploadTask as any);
      mockGetDownloadURL.mockResolvedValueOnce('https://storage.example.com/thumbnail.jpg');

      // Mock Firestore add
      mockAddDoc.mockResolvedValue({ id: 'video-doc-123' } as any);

      const result = await videoService.uploadVideo(mockVideoData, userId, mockOnProgress);

      expect(result).toEqual({
        id: 'video-doc-123',
        userId,
        title: 'Test Video',
        description: 'Test Description',
        videoUrl: 'https://storage.example.com/video.mp4',
        thumbnailUrl: 'https://storage.example.com/thumbnail.jpg',
        isPublic: true,
        likes: [],
        comments: [],
        viewCount: 0,
        duration: 0,
        fileSize: mockVideoBlob.size,
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object),
      });

      expect(mockOnProgress).toHaveBeenCalledWith(10, 'Preparing video...');
      expect(mockOnProgress).toHaveBeenCalledWith(20, 'Uploading video...');
      expect(mockOnProgress).toHaveBeenCalledWith(60, 'Creating thumbnail...');
      expect(mockOnProgress).toHaveBeenCalledWith(80, 'Saving video details...');
      expect(mockOnProgress).toHaveBeenCalledWith(100, 'Upload complete!');
    });

    it('should handle video fetch errors', async () => {
      // Mock XHR to fail
      mockXHR.send = jest.fn(function() {
        setTimeout(() => {
          this.status = 404;
          this.onerror?.();
        }, 0);
      });

      await expect(
        videoService.uploadVideo(mockVideoData, userId)
      ).rejects.toThrow('Failed to read video file');
    });

    it('should handle Firebase storage upload errors', async () => {
      // XHR succeeds
      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          // Simulate error
          onError(new Error('Storage quota exceeded'));
        }),
        snapshot: {
          ref: { fullPath: 'users/test-user-123/videos/video_123.mp4' },
        },
      };

      mockUploadBytesResumable.mockReturnValueOnce(mockUploadTask as any);

      await expect(
        videoService.uploadVideo(mockVideoData, userId)
      ).rejects.toThrow('Upload failed: Storage quota exceeded');
    });

    it('should continue upload even if thumbnail generation fails', async () => {
      // XHR succeeds (uses default mock)
      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          onComplete();
        }),
        snapshot: {
          ref: { fullPath: 'users/test-user-123/videos/video_123.mp4' },
        },
      };

      mockUploadBytesResumable.mockReturnValueOnce(mockUploadTask as any);
      mockGetDownloadURL.mockResolvedValueOnce('https://storage.example.com/video.mp4');

      // Thumbnail generation fails
      mockGenerateVideoThumbnail.mockRejectedValue(new Error('Thumbnail generation failed'));

      mockAddDoc.mockResolvedValue({ id: 'video-doc-123' } as any);

      const result = await videoService.uploadVideo(mockVideoData, userId);

      expect(result.thumbnailUrl).toBe('');
      expect(result.videoUrl).toBe('https://storage.example.com/video.mp4');
    });

    it('should use default title if not provided', async () => {
      const videoDataWithoutTitle: VideoUploadData = {
        uri: 'file:///path/to/video.mp4',
        isPublic: false,
      };

      // XHR succeeds (uses default mock)
      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          onComplete();
        }),
        snapshot: {
          ref: { fullPath: 'users/test-user-123/videos/video_123.mp4' },
        },
      };

      mockUploadBytesResumable.mockReturnValueOnce(mockUploadTask as any);
      mockGetDownloadURL.mockResolvedValueOnce('https://storage.example.com/video.mp4');
      mockGenerateVideoThumbnail.mockRejectedValue(new Error('Skip thumbnail'));
      mockAddDoc.mockResolvedValue({ id: 'video-doc-123' } as any);

      const result = await videoService.uploadVideo(videoDataWithoutTitle, userId);

      expect(result.title).toMatch(/Video \d+\/\d+\/\d+/);
    });
  });

  describe('deleteVideo', () => {
    it('should successfully delete video and thumbnail from storage and firestore', async () => {
      const mockVideo = {
        id: 'video-123',
        userId: 'user-123',
        title: 'Test Video',
        videoUrl: 'https://storage.example.com/videos/video.mp4',
        thumbnailUrl: 'https://storage.example.com/thumbnails/thumb.jpg',
        isPublic: true,
        likes: [],
        comments: [],
        viewCount: 0,
        duration: 0,
        fileSize: 1024,
        createdAt: mockTimestamp.now(),
        updatedAt: mockTimestamp.now(),
      };

      mockDeleteObject.mockResolvedValue(undefined);
      mockDeleteDoc.mockResolvedValue(undefined);

      await videoService.deleteVideo('video-123', mockVideo);

      expect(mockDeleteObject).toHaveBeenCalledTimes(2); // video + thumbnail
      expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything());
    });

    it('should handle video without thumbnail', async () => {
      const mockVideo = {
        id: 'video-123',
        userId: 'user-123',
        title: 'Test Video',
        videoUrl: 'https://storage.example.com/videos/video.mp4',
        thumbnailUrl: '',
        isPublic: true,
        likes: [],
        comments: [],
        viewCount: 0,
        duration: 0,
        fileSize: 1024,
        createdAt: mockTimestamp.now(),
        updatedAt: mockTimestamp.now(),
      };

      mockDeleteObject.mockResolvedValue(undefined);
      mockDeleteDoc.mockResolvedValue(undefined);

      await videoService.deleteVideo('video-123', mockVideo);

      expect(mockDeleteObject).toHaveBeenCalledTimes(1); // video only
      expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything());
    });

    it('should throw error on deletion failure', async () => {
      const mockVideo = {
        id: 'video-123',
        userId: 'user-123',
        title: 'Test Video',
        videoUrl: 'https://storage.example.com/videos/video.mp4',
        thumbnailUrl: '',
        isPublic: true,
        likes: [],
        comments: [],
        viewCount: 0,
        duration: 0,
        fileSize: 1024,
        createdAt: mockTimestamp.now(),
        updatedAt: mockTimestamp.now(),
      };

      mockDeleteObject.mockRejectedValue(new Error('Permission denied'));

      await expect(
        videoService.deleteVideo('video-123', mockVideo)
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('getUserVideos', () => {
    it('should retrieve user videos from firestore', async () => {
      const mockVideos = [
        {
          id: 'video-1',
          data: () => ({
            userId: 'user-123',
            title: 'Video 1',
            videoUrl: 'https://example.com/video1.mp4',
            createdAt: mockTimestamp.now(),
          }),
        },
        {
          id: 'video-2',
          data: () => ({
            userId: 'user-123',
            title: 'Video 2',
            videoUrl: 'https://example.com/video2.mp4',
            createdAt: mockTimestamp.now(),
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockVideos,
        empty: false,
        size: 2,
        forEach: (callback: any) => mockVideos.forEach(callback),
      } as any);

      const result = await videoService.getUserVideos('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('video-1');
      expect(result[1].id).toBe('video-2');
      expect(mockQuery).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user-123');
    });

    it('should handle empty results', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
        forEach: jest.fn(),
      } as any);

      const result = await videoService.getUserVideos('user-123');

      expect(result).toHaveLength(0);
    });
  });
});

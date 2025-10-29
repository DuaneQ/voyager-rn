/**
 * Tests for useVideoUpload hook
 * Comprehensive coverage to reach 90%+
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useVideoUpload } from '../../../hooks/video/useVideoUpload';
import { videoService } from '../../../services/video/VideoService';
import { auth } from '../../../config/firebaseConfig';
import { Video, VideoUploadData } from '../../../types/Video';
import { validateVideoFile, validateVideoMetadata, getFileSize } from '../../../utils/videoValidation';
import { Timestamp } from 'firebase/firestore';

// Create mock functions before mocking modules
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();

// Mock videoService methods
const mockUploadVideo = jest.fn();
const mockDeleteVideo = jest.fn();
const mockGetUserVideos = jest.fn();

// Mock validation functions
const mockValidateVideoFile = jest.fn();
const mockValidateVideoMetadata = jest.fn();
const mockGetFileSize = jest.fn();

// Mock dependencies
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...args: any[]) => mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibraryAsync(...args),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
}));

jest.mock('../../../services/video/VideoService', () => ({
  videoService: {
    uploadVideo: (...args: any[]) => mockUploadVideo(...args),
    deleteVideo: (...args: any[]) => mockDeleteVideo(...args),
    getUserVideos: (...args: any[]) => mockGetUserVideos(...args),
  },
}));

jest.mock('../../../config/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-123' },
  },
}));

jest.mock('../../../utils/videoValidation', () => ({
  validateVideoFile: (...args: any[]) => mockValidateVideoFile(...args),
  validateVideoMetadata: (...args: any[]) => mockValidateVideoMetadata(...args),
  getFileSize: (...args: any[]) => mockGetFileSize(...args),
}));

jest.spyOn(Alert, 'alert');
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('useVideoUpload', () => {
  // Helper to create Firestore Timestamp
  const createMockTimestamp = (): Timestamp => {
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    return {
      seconds,
      nanoseconds: 0,
      toDate: () => new Date(now),
      toMillis: () => now,
      isEqual: () => true,
      toJSON: () => ({ seconds, nanoseconds: 0 }),
    } as unknown as Timestamp;
  };

  const mockVideo: Video = {
    id: 'video-123',
    videoUrl: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    title: 'Test Video',
    description: 'Test Description',
    userId: 'test-user-123',
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
    isPublic: true,
    fileSize: 1024000,
    duration: 30,
    likes: [],
    comments: [],
    viewCount: 0,
  };

  const mockVideoUploadData: VideoUploadData = {
    uri: 'file://test-video.mp4',
    title: 'Test Video',
    description: 'Test Description',
    isPublic: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockClear();
    (console.error as jest.Mock).mockClear();
    
    // Set up default mock implementations
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://test-video.mp4' }],
    });
    mockUploadVideo.mockResolvedValue(mockVideo);
    mockDeleteVideo.mockResolvedValue(undefined);
    mockGetUserVideos.mockResolvedValue([mockVideo]);
    mockValidateVideoFile.mockResolvedValue({ isValid: true, errors: [] });
    mockValidateVideoMetadata.mockReturnValue({ isValid: true, errors: [] });
    mockGetFileSize.mockResolvedValue(1024000);
  });

  describe('Initial State', () => {
    it('should initialize with default upload state', () => {
      const { result } = renderHook(() => useVideoUpload());

      expect(result.current.uploadState).toEqual({
        loading: false,
        progress: 0,
        error: null,
        processingStatus: null,
      });
    });

    it('should provide all expected methods', () => {
      const { result } = renderHook(() => useVideoUpload());

      expect(typeof result.current.selectVideo).toBe('function');
      expect(typeof result.current.uploadVideo).toBe('function');
      expect(typeof result.current.deleteVideo).toBe('function');
      expect(typeof result.current.loadUserVideos).toBe('function');
      expect(typeof result.current.requestPermission).toBe('function');
    });
  });

  describe('requestPermission', () => {
    it('should return true when permission is granted', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const { result } = renderHook(() => useVideoUpload());
      
      let permissionResult: boolean;
      await act(async () => {
        permissionResult = await result.current.requestPermission();
      });

      expect(permissionResult!).toBe(true);
      expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { result } = renderHook(() => useVideoUpload());
      
      let permissionResult: boolean;
      await act(async () => {
        permissionResult = await result.current.requestPermission();
      });

      expect(permissionResult!).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Required',
        'Please grant permission to access your photo library to upload videos.'
      );
    });

    it('should cache permission result on subsequent calls', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const { result } = renderHook(() => useVideoUpload());
      
      // First call
      await act(async () => {
        await result.current.requestPermission();
      });

      // Second call should use cached result
      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectVideo', () => {
    it('should successfully select a video', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://selected-video.mp4' }],
      });

      const { result } = renderHook(() => useVideoUpload());
      
      let selectedUri: string | null;
      await act(async () => {
        selectedUri = await result.current.selectVideo();
      });

      expect(selectedUri!).toBe('file://selected-video.mp4');
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: 'Videos',
        allowsEditing: false,
        quality: 1,
      });
    });

    it('should return null when permission is denied', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { result } = renderHook(() => useVideoUpload());
      
      let selectedUri: string | null;
      await act(async () => {
        selectedUri = await result.current.selectVideo();
      });

      expect(selectedUri!).toBeNull();
      expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it('should return null when user cancels selection', async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: true,
      });

      const { result } = renderHook(() => useVideoUpload());
      
      let selectedUri: string | null;
      await act(async () => {
        selectedUri = await result.current.selectVideo();
      });

      expect(selectedUri!).toBeNull();
    });

    it('should handle video selection errors', async () => {
      mockLaunchImageLibraryAsync.mockRejectedValue(new Error('Selection failed'));

      const { result } = renderHook(() => useVideoUpload());
      
      let selectedUri: string | null;
      await act(async () => {
        selectedUri = await result.current.selectVideo();
      });

      expect(selectedUri!).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error selecting video:', expect.any(Error));
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to select video');
    });
  });

  describe('uploadVideo', () => {
    it('should successfully upload a video', async () => {
      const progressCallback = jest.fn();
      mockUploadVideo.mockImplementation((videoData, userId, onProgress) => {
        onProgress(50, 'Uploading...');
        onProgress(100, 'Processing...');
        return Promise.resolve(mockVideo);
      });

      const { result } = renderHook(() => useVideoUpload());
      
      let uploadResult: Video | null;
      await act(async () => {
        uploadResult = await result.current.uploadVideo(mockVideoUploadData);
      });

      expect(uploadResult).toEqual(mockVideo);
      expect(result.current.uploadState).toEqual({
        loading: false,
        progress: 100,
        error: null,
        processingStatus: null,
      });
    });

    it('should update upload state during upload process', async () => {
      mockUploadVideo.mockImplementation((videoData, userId, onProgress) => {
        // Immediately call progress callback to test state updates
        if (onProgress) {
          onProgress(25, 'Uploading...');
          onProgress(75, 'Processing...');
        }
        return Promise.resolve(mockVideo);
      });

      const { result } = renderHook(() => useVideoUpload());
      
      // Start upload and wait for completion
      await act(async () => {
        await result.current.uploadVideo(mockVideoUploadData);
      });

      // After completion, final state should be set
      expect(result.current.uploadState.loading).toBe(false);
      expect(result.current.uploadState.progress).toBe(100);
      expect(result.current.uploadState.processingStatus).toBeNull();
    });

    it('should handle upload when user is not authenticated', async () => {
      // Mock no current user
      (auth as any).currentUser = null;

      const { result } = renderHook(() => useVideoUpload());
      
      let uploadResult: Video | null;
      await act(async () => {
        uploadResult = await result.current.uploadVideo(mockVideoUploadData);
      });

      expect(uploadResult).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in to upload videos');
      
      // Restore auth mock
      (auth as any).currentUser = { uid: 'test-user-123' };
    });

    it('should handle file validation errors', async () => {
      mockValidateVideoFile.mockResolvedValue({
        isValid: false,
        errors: ['File too large', 'Invalid format'],
      });

      const { result } = renderHook(() => useVideoUpload());
      
      let uploadResult: Video | null;
      await act(async () => {
        uploadResult = await result.current.uploadVideo(mockVideoUploadData);
      });

      expect(uploadResult).toBeNull();
      expect(result.current.uploadState.error).toBe('File too large, Invalid format');
      expect(Alert.alert).toHaveBeenCalledWith('Upload Failed', 'File too large, Invalid format');
    });

    it('should handle metadata validation errors', async () => {
      mockValidateVideoMetadata.mockReturnValue({
        isValid: false,
        errors: ['Title too long', 'Invalid characters'],
      });

      const { result } = renderHook(() => useVideoUpload());
      
      let uploadResult: Video | null;
      await act(async () => {
        uploadResult = await result.current.uploadVideo(mockVideoUploadData);
      });

      expect(uploadResult).toBeNull();
      expect(result.current.uploadState.error).toBe('Title too long, Invalid characters');
      expect(Alert.alert).toHaveBeenCalledWith('Upload Failed', 'Title too long, Invalid characters');
    });

    it('should handle upload service errors', async () => {
      mockUploadVideo.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useVideoUpload());
      
      let uploadResult: Video | null;
      await act(async () => {
        uploadResult = await result.current.uploadVideo(mockVideoUploadData);
      });

      expect(uploadResult).toBeNull();
      expect(result.current.uploadState.error).toBe('Network error');
      expect(Alert.alert).toHaveBeenCalledWith('Upload Failed', 'Network error');
    });

    it('should handle generic upload errors', async () => {
      mockUploadVideo.mockRejectedValue('Generic error');

      const { result } = renderHook(() => useVideoUpload());
      
      let uploadResult: Video | null;
      await act(async () => {
        uploadResult = await result.current.uploadVideo(mockVideoUploadData);
      });

      expect(uploadResult).toBeNull();
      expect(result.current.uploadState.error).toBe('Upload failed');
      expect(Alert.alert).toHaveBeenCalledWith('Upload Failed', 'Upload failed');
    });

    it('should handle file size retrieval errors', async () => {
      mockGetFileSize.mockRejectedValue(new Error('File size error'));

      const { result } = renderHook(() => useVideoUpload());
      
      let uploadResult: Video | null;
      await act(async () => {
        uploadResult = await result.current.uploadVideo(mockVideoUploadData);
      });

      expect(uploadResult).toBeNull();
      expect(result.current.uploadState.error).toBe('File size error');
    });
  });

  describe('deleteVideo', () => {
    it('should successfully delete a video', async () => {
      mockDeleteVideo.mockResolvedValue(undefined);

      const { result } = renderHook(() => useVideoUpload());
      
      let deleteResult: boolean;
      await act(async () => {
        deleteResult = await result.current.deleteVideo('video-123', mockVideo);
      });

      expect(deleteResult!).toBe(true);
      expect(mockDeleteVideo).toHaveBeenCalledWith('video-123', mockVideo);
    });

    it('should handle delete failure with Error object', async () => {
      mockDeleteVideo.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useVideoUpload());
      
      let deleteResult: boolean;
      await act(async () => {
        deleteResult = await result.current.deleteVideo('video-123', mockVideo);
      });

      expect(deleteResult!).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Delete Failed', 'Delete failed');
    });

    it('should handle delete failure with generic error', async () => {
      mockDeleteVideo.mockRejectedValue('Generic delete error');

      const { result } = renderHook(() => useVideoUpload());
      
      let deleteResult: boolean;
      await act(async () => {
        deleteResult = await result.current.deleteVideo('video-123', mockVideo);
      });

      expect(deleteResult!).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Delete Failed', 'Delete failed');
    });
  });

  describe('loadUserVideos', () => {
    it('should successfully load user videos', async () => {
      const mockVideos = [mockVideo, { ...mockVideo, id: 'video-456', title: 'Another Video' }];
      mockGetUserVideos.mockResolvedValue(mockVideos);

      const { result } = renderHook(() => useVideoUpload());
      
      let videos: Video[];
      await act(async () => {
        videos = await result.current.loadUserVideos();
      });

      expect(videos!).toEqual(mockVideos);
      expect(mockGetUserVideos).toHaveBeenCalledWith('test-user-123');
    });

    it('should return empty array when user is not authenticated', async () => {
      // Mock no current user
      (auth as any).currentUser = null;

      const { result } = renderHook(() => useVideoUpload());
      
      let videos: Video[];
      await act(async () => {
        videos = await result.current.loadUserVideos();
      });

      expect(videos!).toEqual([]);
      expect(mockGetUserVideos).not.toHaveBeenCalled();
      
      // Restore auth mock
      (auth as any).currentUser = { uid: 'test-user-123' };
    });

    it('should handle load videos error', async () => {
      mockGetUserVideos.mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useVideoUpload());
      
      let videos: Video[];
      await act(async () => {
        videos = await result.current.loadUserVideos();
      });

      expect(videos!).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error loading videos:', expect.any(Error));
    });
  });

  describe('State Management', () => {
    it('should maintain state consistency during multiple operations', async () => {
      const { result } = renderHook(() => useVideoUpload());

      // Initial state
      expect(result.current.uploadState.loading).toBe(false);

      // Start upload
      act(() => {
        result.current.uploadVideo(mockVideoUploadData);
      });

      expect(result.current.uploadState.loading).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.uploadState.loading).toBe(false);
      });

      expect(result.current.uploadState.progress).toBe(100);
    });

    it('should reset error state on new upload', async () => {
      mockUploadVideo.mockRejectedValueOnce(new Error('First error'));
      mockUploadVideo.mockResolvedValueOnce(mockVideo);

      const { result } = renderHook(() => useVideoUpload());

      // First upload fails
      await act(async () => {
        await result.current.uploadVideo(mockVideoUploadData);
      });

      expect(result.current.uploadState.error).toBe('First error');

      // Second upload succeeds
      await act(async () => {
        await result.current.uploadVideo(mockVideoUploadData);
      });

      expect(result.current.uploadState.error).toBeNull();
    });
  });

  describe('Permission Caching', () => {
    it('should cache permission across different operations', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const { result } = renderHook(() => useVideoUpload());

      // First permission request through selectVideo
      await act(async () => {
        await result.current.selectVideo();
      });

      // Second permission request through requestPermission should use cache
      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
    });
  });
});
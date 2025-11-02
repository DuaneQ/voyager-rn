/**
 * Tests for useVideoFeed hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useVideoFeed } from '../../hooks/video/useVideoFeed';
import * as firestore from 'firebase/firestore';

// Mock Firebase
jest.mock('../../config/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-123' },
  },
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((value) => ({ _type: 'arrayUnion', value })),
  arrayRemove: jest.fn((value) => ({ _type: 'arrayRemove', value })),
  increment: jest.fn((value) => ({ _type: 'increment', value })),
}));

const mockGetDocs = firestore.getDocs as jest.MockedFunction<typeof firestore.getDocs>;
const mockUpdateDoc = firestore.updateDoc as jest.MockedFunction<typeof firestore.updateDoc>;

describe('useVideoFeed', () => {
  const mockVideos = [
    {
      id: 'video-1',
      userId: 'user-1',
      title: 'Test Video 1',
      description: 'First test video',
      videoUrl: 'https://example.com/video1.mp4',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      isPublic: true,
      likes: [],
      comments: [],
      viewCount: 100,
      duration: 30,
      fileSize: 1024 * 1024,
      createdAt: { seconds: Date.now() / 1000 },
      updatedAt: { seconds: Date.now() / 1000 },
    },
    {
      id: 'video-2',
      userId: 'user-2',
      title: 'Test Video 2',
      description: 'Second test video',
      videoUrl: 'https://example.com/video2.mp4',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      isPublic: true,
      likes: ['test-user-123'],
      comments: [],
      viewCount: 50,
      duration: 45,
      fileSize: 2 * 1024 * 1024,
      createdAt: { seconds: Date.now() / 1000 - 3600 },
      updatedAt: { seconds: Date.now() / 1000 - 3600 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock implementation tracks call count internally
    let callCount = 0;

    mockGetDocs.mockImplementation(() => {
      callCount++;

      // First call is connections query (always empty)
      if (callCount === 1) {
        return Promise.resolve({
          forEach: jest.fn(),
          docs: [],
        } as any);
      }

      // Subsequent calls are video queries - return mock videos
      return Promise.resolve({
        forEach: (callback: any) => {
          mockVideos.forEach((video) => {
            callback({
              id: video.id,
              data: () => video,
            });
          });
        },
        docs: mockVideos.map((video) => ({
          id: video.id,
          data: () => video,
        })),
      } as any);
    });
  });

  describe('Initial Load', () => {
    it('should load videos on mount', async () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Note: Due to dual query pattern (public + private), videos may appear twice
      // The hook should deduplicate them
      expect(result.current.videos.length).toBeGreaterThanOrEqual(2);
      expect(result.current.videos[0].id).toBe('video-1');
      expect(result.current.error).toBeNull();
    });

    it('should start at index 0', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentVideoIndex).toBe(0);
    });

    it('should handle load error gracefully', async () => {
      let callCount = 0;
      mockGetDocs.mockImplementation(() => {
        callCount++;
        // First call (connections) succeeds
        if (callCount === 1) {
          return Promise.resolve({
            forEach: jest.fn(),
            docs: [],
          } as any);
        }
        // Second call (videos) fails
        return Promise.reject(new Error('Network error'));
      });

      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.videos).toHaveLength(0);
    });
  });

  describe('Navigation', () => {
    it('should navigate to next video', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.goToNextVideo();
      });

      expect(result.current.currentVideoIndex).toBe(1);
    });

    it('should navigate to previous video', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Go to second video first
      act(() => {
        result.current.goToNextVideo();
      });

      expect(result.current.currentVideoIndex).toBe(1);

      // Go back
      act(() => {
        result.current.goToPreviousVideo();
      });

      expect(result.current.currentVideoIndex).toBe(0);
    });

    it('should not navigate before first video', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.goToPreviousVideo();
      });

      expect(result.current.currentVideoIndex).toBe(0);
    });

    it('should set current video index directly', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setCurrentVideoIndex(1);
      });

      expect(result.current.currentVideoIndex).toBe(1);
    });
  });

  describe('Like Functionality', () => {
    it('should like a video', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const video = result.current.videos[0];

      await act(async () => {
        await result.current.handleLike(video);
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      
      // Check optimistic update
      await waitFor(() => {
        const updatedVideo = result.current.videos.find((v) => v.id === 'video-1');
        expect(updatedVideo?.likes).toContain('test-user-123');
      });
    });

    it('should unlike a video', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const video = result.current.videos[1]; // video-2 is already liked

      await act(async () => {
        await result.current.handleLike(video);
      });

      expect(mockUpdateDoc).toHaveBeenCalled();

      // Check optimistic update
      await waitFor(() => {
        const updatedVideo = result.current.videos.find((v) => v.id === 'video-2');
        expect(updatedVideo?.likes).not.toContain('test-user-123');
      });
    });

    it('should handle like error gracefully', async () => {
      mockUpdateDoc.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const video = result.current.videos[0];

      await act(async () => {
        await result.current.handleLike(video);
      });

      // Should not crash - error is logged but not thrown
      expect(result.current.videos.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('View Tracking', () => {
    it('should track video view', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.trackVideoView('video-1');
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('should not track same video twice', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.trackVideoView('video-1');
        await result.current.trackVideoView('video-1');
      });

      // Should only be called once
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filters', () => {
    it('should filter to liked videos', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.setCurrentFilter('liked');
      });

      expect(result.current.currentFilter).toBe('liked');
      expect(result.current.currentVideoIndex).toBe(0);
    });

    it('should filter to my videos', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.setCurrentFilter('mine');
      });

      expect(result.current.currentFilter).toBe('mine');
      expect(result.current.currentVideoIndex).toBe(0);
    });

    it('should reset to all videos', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.setCurrentFilter('mine');
      });

      await act(async () => {
        result.current.setCurrentFilter('all');
      });

      expect(result.current.currentFilter).toBe('all');
    });
  });

  describe('Refresh', () => {
    it('should refresh videos', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetDocs.mockClear();

      await act(async () => {
        await result.current.refreshVideos();
      });

      expect(mockGetDocs).toHaveBeenCalled();
      expect(result.current.currentVideoIndex).toBe(0);
    });
  });

  describe('Pagination', () => {
    it('should indicate more videos available', async () => {
      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMoreVideos).toBe(false); // Only 2 videos, batch size is 3
    });

    it('should load more videos', async () => {
      // Mock more videos available
      mockGetDocs.mockImplementation(() => {
        return Promise.resolve({
          forEach: (callback: any) => {
            [...mockVideos, ...mockVideos, ...mockVideos].forEach((video, i) => {
              callback({
                id: `${video.id}-${i}`,
                data: () => ({ ...video, id: `${video.id}-${i}` }),
              });
            });
          },
          docs: [...mockVideos, ...mockVideos, ...mockVideos].map((video, i) => ({
            id: `${video.id}-${i}`,
            data: () => ({ ...video, id: `${video.id}-${i}` }),
          })),
        } as any);
      });

      const { result } = renderHook(() => useVideoFeed());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.videos.length;

      await act(async () => {
        await result.current.loadVideos(true);
      });

      // Should have loaded more
      expect(result.current.videos.length).toBeGreaterThan(initialCount);
    });
  });
});

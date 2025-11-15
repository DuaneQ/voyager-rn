/**
 * Focused tests for useVideoFeed hook
 * Tests core functionality without loading full app context to avoid OOM
 */

import { renderHook } from '@testing-library/react-native';
import { useVideoFeed } from '../../hooks/video/useVideoFeed';

// Use centralized manual mock for firebaseConfig
jest.mock('../../config/firebaseConfig');

// Mock Firestore with simple returns
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mock-collection'),
  query: jest.fn(() => 'mock-query'),
  where: jest.fn(() => 'mock-where'),
  orderBy: jest.fn(() => 'mock-orderBy'),
  limit: jest.fn(() => 'mock-limit'),
  startAfter: jest.fn(() => 'mock-startAfter'),
  getDocs: jest.fn(() => Promise.resolve({
    docs: [],
    empty: true,
  })),
  doc: jest.fn(() => 'mock-doc'),
  updateDoc: jest.fn(() => Promise.resolve()),
  arrayUnion: jest.fn((value) => ({ _type: 'arrayUnion', value })),
  arrayRemove: jest.fn((value) => ({ _type: 'arrayRemove', value })),
  increment: jest.fn((value) => ({ _type: 'increment', value })),
}));

describe('useVideoFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(result.current.videos).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Starts loading
      expect(result.current.hasMoreVideos).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should initialize currentVideoIndex to 0', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(result.current.currentVideoIndex).toBe(0);
    });
  });

  describe('Filter Functionality', () => {
    it('should have default filter as "all"', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(result.current.currentFilter).toBe('all');
    });

    it('should provide setCurrentFilter function', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(typeof result.current.setCurrentFilter).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should have null error initially', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(result.current.error).toBe(null);
    });

    it('should provide refreshVideos function', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(typeof result.current.refreshVideos).toBe('function');
    });
  });

  describe('Hook Functions', () => {
    it('should provide loadVideos function', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(typeof result.current.loadVideos).toBe('function');
    });

    it('should provide handleLike function', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(typeof result.current.handleLike).toBe('function');
    });

    it('should provide trackVideoView function', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(typeof result.current.trackVideoView).toBe('function');
    });

    it('should provide loadConnectedUsers function', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(typeof result.current.loadConnectedUsers).toBe('function');
    });
  });

  describe('Navigation Functions', () => {
    it('should provide goToNextVideo function', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(typeof result.current.goToNextVideo).toBe('function');
    });

    it('should provide goToPreviousVideo function', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(typeof result.current.goToPreviousVideo).toBe('function');
    });

    it('should provide setCurrentVideoIndex function', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(typeof result.current.setCurrentVideoIndex).toBe('function');
    });
  });

  describe('State Management', () => {
    it('should maintain loading state', () => {
      const { result } = renderHook(() => useVideoFeed());

      // Initially loading
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('should maintain hasMoreVideos state', () => {
      const { result } = renderHook(() => useVideoFeed());

      // Initially has more (before first search)
      expect(result.current.hasMoreVideos).toBe(true);
    });

    it('should maintain videos array', () => {
      const { result } = renderHook(() => useVideoFeed());

      // Initially empty
      expect(Array.isArray(result.current.videos)).toBe(true);
      expect(result.current.videos.length).toBe(0);
    });

    it('should maintain connectedUserIds array', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(Array.isArray(result.current.connectedUserIds)).toBe(true);
    });

    it('should maintain isLoadingMore state', () => {
      const { result } = renderHook(() => useVideoFeed());

      expect(typeof result.current.isLoadingMore).toBe('boolean');
    });
  });
});

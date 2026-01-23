/**
 * VideoCard Component Unit Tests
 * 
 * Tests cover:
 * - Registration with VideoPlaybackManager
 * - Activation/deactivation lifecycle
 * - Reload safety for previously unloaded players (Fix B)
 * - Mute state management
 * - Error handling and edge cases
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { VideoCard } from '../../components/video/VideoCard';

// Mock expo-av Video component
const mockLoadAsync = jest.fn();
const mockUnloadAsync = jest.fn();
const mockPlayAsync = jest.fn();
const mockPauseAsync = jest.fn();
const mockStopAsync = jest.fn();
const mockSetPositionAsync = jest.fn();
const mockSetIsMutedAsync = jest.fn();

const mockVideoRef = {
  loadAsync: mockLoadAsync,
  unloadAsync: mockUnloadAsync,
  playAsync: mockPlayAsync,
  pauseAsync: mockPauseAsync,
  stopAsync: mockStopAsync,
  setPositionAsync: mockSetPositionAsync,
  setIsMutedAsync: mockSetIsMutedAsync,
};

jest.mock('expo-av', () => {
  // Import React inside the mock factory to avoid hoisting issues
  const ReactInMock = require('react');
  return {
    Video: ReactInMock.forwardRef((props: any, ref: any) => {
      ReactInMock.useImperativeHandle(ref, () => mockVideoRef);
      return null; // Simplified mock
    }),
    ResizeMode: {
      CONTAIN: 'contain',
      COVER: 'cover',
      STRETCH: 'stretch',
    },
    Audio: {
      setAudioModeAsync: jest.fn(),
    },
  };
});

// Mock firebase config
jest.mock('../../config/firebaseConfig', () => ({
  __esModule: true,
  getAuthInstance: () => ({
    currentUser: { uid: 'test-user-123' },
  }),
}));

// Mock VideoPlaybackManager
jest.mock('../../services/video/VideoPlaybackManager', () => ({
  videoPlaybackManager: {
    register: jest.fn(),
    unregister: jest.fn(),
    setActiveVideo: jest.fn(),
    deactivateAll: jest.fn(),
  },
}));

// Import mocked videoPlaybackManager
import { videoPlaybackManager } from '../../services/video/VideoPlaybackManager';

const mockVideo = {
  id: 'video-1',
  videoUrl: 'https://example.com/video.mp4',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  title: 'Test Video',
  description: 'Test Description',
  userId: 'user-123',
  duration: 30,
  fileSize: 1024000,
  createdAt: new Date() as any, // Mock Timestamp for testing
  updatedAt: new Date() as any,
  likes: [],
  comments: [],
  viewCount: 0,
  isPublic: true,
};

describe('VideoCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadAsync.mockResolvedValue(undefined);
    mockUnloadAsync.mockResolvedValue(undefined);
    mockPlayAsync.mockResolvedValue(undefined);
    mockPauseAsync.mockResolvedValue(undefined);
    mockStopAsync.mockResolvedValue(undefined);
    mockSetPositionAsync.mockResolvedValue(undefined);
    mockSetIsMutedAsync.mockResolvedValue(undefined);
  });

  describe('Registration Lifecycle', () => {
    it('should register with VideoPlaybackManager on mount', async () => {
      const { unmount } = render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalledWith(
          expect.objectContaining({
            videoId: 'video-1',
            onBecomeActive: expect.any(Function),
            onBecomeInactive: expect.any(Function),
          })
        );
      });

      unmount();
    });

    it('should unregister on unmount', async () => {
      const { unmount } = render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(videoPlaybackManager.unregister).toHaveBeenCalledWith('video-1');
      });
    });
  });

  describe('Activation Lifecycle', () => {
    it('should request activation when isActive becomes true', async () => {
      const { rerender } = render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      // Wait for registration
      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      // Activate video
      rerender(
        <VideoCard
          video={mockVideo}
          isActive={true}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      // Should request activation via manager
      await waitFor(() => {
        expect(videoPlaybackManager.setActiveVideo).toHaveBeenCalledWith('video-1');
      });
    });

    it('should play video when activated', async () => {
      let onBecomeActive: (() => Promise<void>) | null = null;

      // Capture the onBecomeActive callback
      (videoPlaybackManager.register as jest.Mock).mockImplementation((reg) => {
        onBecomeActive = reg.onBecomeActive;
      });

      render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      // Trigger activation
      await onBecomeActive!();

      // Should set mute state and play
      expect(mockSetIsMutedAsync).toHaveBeenCalledWith(true);
      expect(mockPlayAsync).toHaveBeenCalled();
    });

    it('should stop and reset when deactivated', async () => {
      let onBecomeInactive: (() => Promise<void>) | null = null;

      // Capture the onBecomeInactive callback
      (videoPlaybackManager.register as jest.Mock).mockImplementation((reg) => {
        onBecomeInactive = reg.onBecomeInactive;
      });

      render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      // Trigger deactivation
      await onBecomeInactive!();

      // Should mute, pause, stop, and reset
      expect(mockSetIsMutedAsync).toHaveBeenCalledWith(true);
      expect(mockPauseAsync).toHaveBeenCalled();
      expect(mockStopAsync).toHaveBeenCalled();
      expect(mockSetPositionAsync).toHaveBeenCalledWith(0);
    });
  });

  describe('Reload Safety (Fix B) - iOS expo-av behavior', () => {
    // NOTE: These tests verify expo-av reload behavior which is iOS-only.
    // On Android, we use react-native-video via AndroidVideoPlayerRNV which has
    // different lifecycle management (paused prop instead of unloadAsync/loadAsync).
    // Platform.OS is set to 'ios' to test the expo-av code path in VideoCard.
    let originalPlatformOS: string;

    beforeEach(() => {
      // Mock Platform.OS as 'ios' for these tests (expo-av only used on iOS)
      const Platform = require('react-native').Platform;
      originalPlatformOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', {
        get: () => 'ios',
        configurable: true,
      });
    });

    afterEach(() => {
      // Restore original Platform.OS
      const Platform = require('react-native').Platform;
      Object.defineProperty(Platform, 'OS', {
        get: () => originalPlatformOS,
        configurable: true,
      });
    });

    it('should reload video if previously unloaded before playing', async () => {
      let onBecomeActive: (() => Promise<void>) | null = null;
      let onBecomeInactive: (() => Promise<void>) | null = null;

      // Capture callbacks
      (videoPlaybackManager.register as jest.Mock).mockImplementation((reg) => {
        onBecomeActive = reg.onBecomeActive;
        onBecomeInactive = reg.onBecomeInactive;
      });

      render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      // Activate, then deactivate (which unloads on iOS too for memory)
      await onBecomeActive!();
      jest.clearAllMocks();
      await onBecomeInactive!();

      // On iOS, video gets unloaded via cleanupVideo
      expect(mockUnloadAsync).toHaveBeenCalled();

      // Now reactivate - should reload first
      jest.clearAllMocks();
      await onBecomeActive!();

      // Should reload before playing
      expect(mockLoadAsync).toHaveBeenCalledWith(
        { uri: mockVideo.videoUrl },
        {},
        false
      );
      expect(mockSetIsMutedAsync).toHaveBeenCalled();
      expect(mockPlayAsync).toHaveBeenCalled();
    });

    it('should not attempt playback if reload fails', async () => {
      let onBecomeActive: (() => Promise<void>) | null = null;
      let onBecomeInactive: (() => Promise<void>) | null = null;

      // Capture callbacks
      (videoPlaybackManager.register as jest.Mock).mockImplementation((reg) => {
        onBecomeActive = reg.onBecomeActive;
        onBecomeInactive = reg.onBecomeInactive;
      });

      render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      // Activate then deactivate (unload)
      await onBecomeActive!();
      await onBecomeInactive!();

      // Make loadAsync fail
      jest.clearAllMocks();
      mockLoadAsync.mockRejectedValueOnce(new Error('Load failed'));

      // Reactivate - should fail gracefully
      await onBecomeActive!();

      // Should attempt reload but NOT play
      expect(mockLoadAsync).toHaveBeenCalled();
      expect(mockPlayAsync).not.toHaveBeenCalled();
    });

    it('should stop and reset before playing if player is already loaded', async () => {
      let onBecomeActive: (() => Promise<void>) | null = null;

      // Capture callback
      (videoPlaybackManager.register as jest.Mock).mockImplementation((reg) => {
        onBecomeActive = reg.onBecomeActive;
      });

      render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      // Activate (player is not unloaded yet)
      await onBecomeActive!();

      // Should stop and reset before playing (not reload)
      expect(mockStopAsync).toHaveBeenCalled();
      expect(mockSetPositionAsync).toHaveBeenCalledWith(0);
      expect(mockLoadAsync).not.toHaveBeenCalled();
      expect(mockPlayAsync).toHaveBeenCalled();
    });
  });

  describe('Mute State Management', () => {
    it('should update mute state when isMuted prop changes', async () => {
      let onBecomeActive: (() => Promise<void>) | null = null;

      (videoPlaybackManager.register as jest.Mock).mockImplementation((reg) => {
        onBecomeActive = reg.onBecomeActive;
      });

      const { rerender } = render(
        <VideoCard
          video={mockVideo}
          isActive={true}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      // Activate video
      await onBecomeActive!();
      jest.clearAllMocks();

      // Change mute state
      rerender(
        <VideoCard
          video={mockVideo}
          isActive={true}
          isMuted={false}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockSetIsMutedAsync).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during activation gracefully', async () => {
      let onBecomeActive: (() => Promise<void>) | null = null;

      (videoPlaybackManager.register as jest.Mock).mockImplementation((reg) => {
        onBecomeActive = reg.onBecomeActive;
      });

      render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      // Make playAsync fail
      mockPlayAsync.mockRejectedValueOnce(new Error('Play failed'));

      // Should not throw
      await expect(onBecomeActive!()).resolves.not.toThrow();
    });

    it('should handle errors during deactivation gracefully', async () => {
      let onBecomeInactive: (() => Promise<void>) | null = null;

      (videoPlaybackManager.register as jest.Mock).mockImplementation((reg) => {
        onBecomeInactive = reg.onBecomeInactive;
      });

      render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      // Make stopAsync fail
      mockStopAsync.mockRejectedValueOnce(new Error('Stop failed'));

      // Should not throw
      await expect(onBecomeInactive!()).resolves.not.toThrow();
    });

    it('should ignore "Invalid view returned from registry" errors', async () => {
      let onBecomeActive: (() => Promise<void>) | null = null;

      (videoPlaybackManager.register as jest.Mock).mockImplementation((reg) => {
        onBecomeActive = reg.onBecomeActive;
      });

      render(
        <VideoCard
          video={mockVideo}
          isActive={false}
          isMuted={true}
          onMuteToggle={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(videoPlaybackManager.register).toHaveBeenCalled();
      });

      // Mock "Invalid view" error (common on Android emulator)
      mockSetIsMutedAsync.mockRejectedValueOnce(
        new Error('Invalid view returned from registry')
      );

      // Should handle gracefully and continue to playAsync
      await onBecomeActive!();
      expect(mockPlayAsync).toHaveBeenCalled();
    });
  });
});

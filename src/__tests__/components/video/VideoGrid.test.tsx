/**
 * Tests for VideoGrid component
 * Comprehensive coverage to reach 90%+
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, TouchableOpacity, Modal, View, Image, ActivityIndicator } from 'react-native';
import { VideoGrid } from '../../../components/video/VideoGrid';
import { useVideoUpload } from '../../../hooks/video/useVideoUpload';
import { Video as VideoType } from '../../../types/Video';
import { Timestamp } from 'firebase/firestore';

// Mock dependencies
jest.mock('../../../hooks/video/useVideoUpload');
jest.mock('expo-av', () => ({
  Video: 'Video',
  ResizeMode: {
    CONTAIN: 'contain',
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('VideoGrid', () => {
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

  const mockVideos: VideoType[] = [
    {
      id: 'video1',
      videoUrl: 'https://example.com/video1.mp4',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      title: 'Test Video 1',
      description: 'Description 1',
      userId: 'user123',
      createdAt: createMockTimestamp(),
      updatedAt: createMockTimestamp(),
      isPublic: true,
      fileSize: 1024000,
      duration: 30,
      likes: [],
      comments: [],
      viewCount: 0,
    },
    {
      id: 'video2',
      videoUrl: 'https://example.com/video2.mp4',
      thumbnailUrl: '',
      title: 'Test Video 2',
      description: '',
      userId: 'user123',
      createdAt: createMockTimestamp(),
      updatedAt: createMockTimestamp(),
      isPublic: true,
      fileSize: 2048000,
      duration: 45,
      likes: [],
      comments: [],
      viewCount: 0,
    },
  ];

  const mockUploadState = {
    loading: false,
    progress: 0,
    error: null,
    processingStatus: null,
  };

  const mockSelectVideo = jest.fn();
  const mockUploadVideo = jest.fn();
  const mockDeleteVideo = jest.fn();
  const mockLoadUserVideos = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockClear();

    (useVideoUpload as jest.Mock).mockReturnValue({
      uploadState: mockUploadState,
      selectVideo: mockSelectVideo,
      uploadVideo: mockUploadVideo,
      deleteVideo: mockDeleteVideo,
      loadUserVideos: mockLoadUserVideos,
    });

    mockLoadUserVideos.mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('should render the component', async () => {
      const { getByText } = render(<VideoGrid />);
      await waitFor(() => {
        expect(getByText('Add Video')).toBeTruthy();
      });
    });

    it('should show loading indicator when loading videos initially', () => {
      const { getByText } = render(<VideoGrid />);
      // During initial render before videos load
      expect(getByText('Loading videos...')).toBeTruthy();
    });

    it('should show empty state when no videos after loading', async () => {
      mockLoadUserVideos.mockResolvedValue([]);

      const { getByText, queryByText } = render(<VideoGrid />);

      await waitFor(() => {
        expect(queryByText('Loading videos...')).toBeNull();
        expect(getByText('No videos yet')).toBeTruthy();
        expect(getByText('Tap the button above to add your first video')).toBeTruthy();
      });
    });

    it('should render video grid with videos', async () => {
      mockLoadUserVideos.mockResolvedValue(mockVideos);

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      await waitFor(() => {
        const images = UNSAFE_getAllByType(Image);
        expect(images.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should render video with thumbnail image', async () => {
      mockLoadUserVideos.mockResolvedValue([mockVideos[0]]);

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      await waitFor(() => {
        const images = UNSAFE_getAllByType(Image);
        const thumbnailImage = images.find((img: any) => 
          img.props.source?.uri === 'https://example.com/thumb1.jpg'
        );
        expect(thumbnailImage).toBeTruthy();
      });
    });

    it('should render video without thumbnail (placeholder icon)', async () => {
      mockLoadUserVideos.mockResolvedValue([mockVideos[1]]);

      const { UNSAFE_queryAllByType } = render(<VideoGrid />);

      await waitFor(() => {
        const views = UNSAFE_queryAllByType(View);
        expect(views.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Video Upload', () => {
    it('should handle add video button press', async () => {
      mockSelectVideo.mockResolvedValue('file:///test/video.mp4');
      mockUploadVideo.mockResolvedValue(true);

      const { getByText } = render(<VideoGrid />);

      // Wait for initial load
      await waitFor(() => expect(getByText('Add Video')).toBeTruthy());

      const addButton = getByText('Add Video');
      fireEvent.press(addButton);

      // Wait for the async handleAddVideo to call selectVideo
      await waitFor(() => {
        expect(mockSelectVideo).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should upload video when selected', async () => {
      mockSelectVideo.mockResolvedValue('file:///test/video.mp4');
      mockUploadVideo.mockResolvedValue(true);

      const { getByText, getByTestId } = render(<VideoGrid />);

      await waitFor(() => expect(getByText('Add Video')).toBeTruthy());

      fireEvent.press(getByText('Add Video'));

      // selectVideo should be called first
      await waitFor(() => expect(mockSelectVideo).toHaveBeenCalled());

      // Modal should appear
      await waitFor(() => {
        expect(getByTestId('video-upload-modal')).toBeTruthy();
      });

      // Press upload button in modal
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);

      // Then uploadVideo should be called with the selected video
      await waitFor(() => {
        expect(mockUploadVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            uri: 'file:///test/video.mp4',
            isPublic: true,
          })
        );
      }, { timeout: 2000 });
    });

    it('should show success alert after upload', async () => {
      mockSelectVideo.mockResolvedValue('file:///test/video.mp4');
      mockUploadVideo.mockResolvedValue(true);

      const { getByText, getByTestId } = render(<VideoGrid />);

      await waitFor(() => expect(getByText('Add Video')).toBeTruthy());

      fireEvent.press(getByText('Add Video'));

      await waitFor(() => expect(mockSelectVideo).toHaveBeenCalled());

      // Modal should appear
      await waitFor(() => {
        expect(getByTestId('video-upload-modal')).toBeTruthy();
      });

      // Press upload button in modal
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);

      await waitFor(() => expect(mockUploadVideo).toHaveBeenCalled());

      // Alert should be called after successful upload
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Video uploaded successfully!'
        );
      }, { timeout: 2000 });
    });

    it('should refresh videos after successful upload', async () => {
      mockSelectVideo.mockResolvedValue('file:///test/video.mp4');
      mockUploadVideo.mockResolvedValue(true);
      mockLoadUserVideos.mockResolvedValueOnce([]).mockResolvedValueOnce(mockVideos);

      const { getByText, getByTestId } = render(<VideoGrid />);

      await waitFor(() => expect(mockLoadUserVideos).toHaveBeenCalledTimes(1));

      await waitFor(() => {
        const addButton = getByText('Add Video');
        fireEvent.press(addButton);
      });

      // Modal should appear
      await waitFor(() => {
        expect(getByTestId('video-upload-modal')).toBeTruthy();
      });

      // Press upload button in modal
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);

      await waitFor(() => {
        expect(mockLoadUserVideos).toHaveBeenCalledTimes(2);
      });
    });

    it('should not upload when video selection is cancelled', async () => {
      mockSelectVideo.mockResolvedValue(null);

      const { getByText } = render(<VideoGrid />);

      await waitFor(() => {
        const addButton = getByText('Add Video');
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        expect(mockUploadVideo).not.toHaveBeenCalled();
      });
    });

    it('should disable upload button during upload', async () => {
      (useVideoUpload as jest.Mock).mockReturnValue({
        uploadState: { ...mockUploadState, loading: true },
        selectVideo: mockSelectVideo,
        uploadVideo: mockUploadVideo,
        deleteVideo: mockDeleteVideo,
        loadUserVideos: mockLoadUserVideos,
      });

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      await waitFor(() => {
        const touchables = UNSAFE_getAllByType(TouchableOpacity);
        const uploadButton = touchables[0];
        expect(uploadButton.props.disabled).toBe(true);
      });
    });

    it('should show activity indicator when uploading', () => {
      (useVideoUpload as jest.Mock).mockReturnValue({
        uploadState: { ...mockUploadState, loading: true },
        selectVideo: mockSelectVideo,
        uploadVideo: mockUploadVideo,
        deleteVideo: mockDeleteVideo,
        loadUserVideos: mockLoadUserVideos,
      });

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      const indicators = UNSAFE_getAllByType(ActivityIndicator);
      expect(indicators.length).toBeGreaterThan(0);
    });

    it('should show upload progress indicator', () => {
      (useVideoUpload as jest.Mock).mockReturnValue({
        uploadState: {
          loading: true,
          progress: 50,
          error: null,
          processingStatus: 'Uploading...',
        },
        selectVideo: mockSelectVideo,
        uploadVideo: mockUploadVideo,
        deleteVideo: mockDeleteVideo,
        loadUserVideos: mockLoadUserVideos,
      });

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      // When uploading, should show ActivityIndicator
      const indicators = UNSAFE_getAllByType(ActivityIndicator);
      expect(indicators.length).toBeGreaterThan(0);
    });
  });

  describe('Video Delete', () => {
    it('should show delete confirmation on long press', async () => {
      mockLoadUserVideos.mockResolvedValue(mockVideos);

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      // Wait for videos to load
      await waitFor(() => {
        const touchables = UNSAFE_getAllByType(TouchableOpacity);
        expect(touchables.length).toBeGreaterThan(1);
      });

      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      // First touchable is add button, second is first video
      const videoTouchable = touchables[1];
      fireEvent(videoTouchable, 'longPress');

      // Check that Alert.alert was called with delete confirmation
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Video',
        'Are you sure you want to delete this video?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Delete' })
        ])
      );
    });

    it('should delete video when confirmed', async () => {
      mockLoadUserVideos.mockResolvedValue(mockVideos);
      mockDeleteVideo.mockResolvedValue(true);

      // Mock Alert.alert to immediately call the delete button's onPress
      let deleteCallback: (() => void) | null = null;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const deleteButton = buttons?.find((b: any) => b.text === 'Delete');
        if (deleteButton?.onPress) {
          deleteCallback = deleteButton.onPress;
        }
      });

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      await waitFor(() => {
        const touchables = UNSAFE_getAllByType(TouchableOpacity);
        expect(touchables.length).toBeGreaterThan(1);
      });

      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      fireEvent(touchables[1], 'longPress');

      // Execute the delete callback
      await act(async () => {
        if (deleteCallback) {
          await deleteCallback();
        }
      });

      await waitFor(() => {
        expect(mockDeleteVideo).toHaveBeenCalledWith('video1', mockVideos[0]);
      });
    });

    it('should show success alert after deletion', async () => {
      mockLoadUserVideos.mockResolvedValue(mockVideos);
      mockDeleteVideo.mockResolvedValue(true);

      let deleteCallback: (() => void) | null = null;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const deleteButton = buttons?.find((b: any) => b.text === 'Delete');
        if (deleteButton?.onPress) {
          deleteCallback = deleteButton.onPress;
        }
      });

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      await waitFor(() => {
        const touchables = UNSAFE_getAllByType(TouchableOpacity);
        expect(touchables.length).toBeGreaterThan(1);
      });

      // Trigger long press to show confirmation dialog
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      await act(async () => {
        fireEvent(touchables[1], 'longPress');
      });

      // Wait for Alert.alert to be called with confirmation
      await waitFor(() => {
        expect(deleteCallback).not.toBeNull();
      });

      // Execute delete and wait for success alert
      await act(async () => {
        if (deleteCallback) {
          await deleteCallback();
        }
      });

      // After deletion, should show success alert
      await waitFor(() => {
        const alertCalls = (Alert.alert as jest.Mock).mock.calls;
        const successCall = alertCalls.find(call => 
          call[0] === 'Success' && call[1] === 'Video deleted successfully'
        );
        expect(successCall).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should not delete when cancelled', async () => {
      mockLoadUserVideos.mockResolvedValue(mockVideos);

      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const cancelButton = buttons?.find((b: any) => b.text === 'Cancel');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      });

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      await waitFor(() => {
        const touchables = UNSAFE_getAllByType(TouchableOpacity);
        fireEvent(touchables[1], 'longPress');
      });

      await waitFor(() => {
        expect(mockDeleteVideo).not.toHaveBeenCalled();
      });
    });
  });

  describe('Video Playback', () => {
    it('should open video player on video press', async () => {
      mockLoadUserVideos.mockResolvedValue(mockVideos);

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      // Wait for videos to load
      await waitFor(() => {
        const touchables = UNSAFE_getAllByType(TouchableOpacity);
        expect(touchables.length).toBeGreaterThan(1);
      });

      // Press the first video
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      await act(async () => {
        fireEvent.press(touchables[1]); // First video (index 0 is add button)
      });

      // Check modal is visible
      await waitFor(() => {
        const modals = UNSAFE_getAllByType(Modal);
        const playerModal = modals.find((m: any) => m.props.animationType === 'slide');
        expect(playerModal?.props.visible).toBe(true);
      }, { timeout: 2000 });
    });

    it('should display video info in player', async () => {
      mockLoadUserVideos.mockResolvedValue(mockVideos);

      const { UNSAFE_getAllByType, getByText } = render(<VideoGrid />);

      // Wait for videos to load
      await waitFor(() => {
        const touchables = UNSAFE_getAllByType(TouchableOpacity);
        expect(touchables.length).toBeGreaterThan(1);
      });

      // Press the first video
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      await act(async () => {
        fireEvent.press(touchables[1]);
      });

      // Check video info is displayed in modal
      await waitFor(() => {
        expect(getByText('Test Video 1')).toBeTruthy();
        expect(getByText('Description 1')).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('should close video player when close button pressed', async () => {
      mockLoadUserVideos.mockResolvedValue(mockVideos);

      const { UNSAFE_getAllByType } = render(<VideoGrid />);

      // Wait for videos to load
      await waitFor(() => {
        const touchables = UNSAFE_getAllByType(TouchableOpacity);
        expect(touchables.length).toBeGreaterThan(1);
      });

      // Open player
      let touchables = UNSAFE_getAllByType(TouchableOpacity);
      await act(async () => {
        fireEvent.press(touchables[1]);
      });

      // Wait for modal to open
      await waitFor(() => {
        const modals = UNSAFE_getAllByType(Modal);
        const playerModal = modals.find((m: any) => m.props.animationType === 'slide');
        expect(playerModal?.props.visible).toBe(true);
      });

      // Close player - find and press close button
      touchables = UNSAFE_getAllByType(TouchableOpacity);
      await act(async () => {
        // Close button should be the last touchable
        const closeButton = touchables[touchables.length - 1];
        fireEvent.press(closeButton);
      });

      // Check modal is closed
      await waitFor(() => {
        const modals = UNSAFE_getAllByType(Modal);
        const playerModal = modals.find((m: any) => m.props.animationType === 'slide');
        expect(playerModal?.props.visible).toBe(false);
      }, { timeout: 2000 });
    });

    it('should handle video without description', async () => {
      mockLoadUserVideos.mockResolvedValue([mockVideos[1]]);

      const { UNSAFE_getAllByType, getByText, queryByText } = render(<VideoGrid />);

      // Wait for videos to load
      await waitFor(() => {
        const touchables = UNSAFE_getAllByType(TouchableOpacity);
        expect(touchables.length).toBeGreaterThan(1);
      });

      // Press the video
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      await act(async () => {
        fireEvent.press(touchables[1]);
      });

      // Check video title is displayed
      await waitFor(() => {
        expect(getByText('Test Video 2')).toBeTruthy();
        // Empty description should not render description text
      }, { timeout: 2000 });
    });
  });

  describe('Loading States', () => {
    it('should hide loading indicator after videos loaded', async () => {
      mockLoadUserVideos.mockResolvedValue(mockVideos);

      const { queryByText } = render(<VideoGrid />);

      await waitFor(() => {
        expect(queryByText('Loading videos...')).toBeNull();
      });
    });
  });
});

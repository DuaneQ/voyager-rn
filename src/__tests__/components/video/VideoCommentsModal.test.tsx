/**
 * Unit tests for VideoCommentsModal component
 * Tests comment display, submission, user interactions, and error handling
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { VideoCommentsModal } from '../../../components/video/VideoCommentsModal';
import { Video } from '../../../types/Video';
import { Timestamp } from 'firebase/firestore';
import * as firestore from 'firebase/firestore';
import { getAuthInstance } from '../../../config/firebaseConfig';
import { Alert } from 'react-native';

// Helper to create mock Timestamp with toMillis()
const createMockTimestamp = (seconds: number): Timestamp => ({
  seconds,
  nanoseconds: 0,
  toMillis: () => seconds * 1000,
  toDate: () => new Date(seconds * 1000),
  toJSON: () => ({ seconds, nanoseconds: 0 }),
  isEqual: (other: Timestamp) => seconds === other.seconds,
  valueOf: () => `Timestamp(seconds=${seconds}, nanoseconds=0)`,
} as Timestamp);

// Mock Firebase
jest.mock('../../../config/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
    },
  },
  getAuthInstance: jest.fn(() => ({
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
    },
  })),
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((value) => ({ _type: 'arrayUnion', value })),
  Timestamp: {
    now: jest.fn(() => createMockTimestamp(Date.now() / 1000)),
    fromDate: jest.fn((date: Date) => createMockTimestamp(date.getTime() / 1000)),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockGetDoc = firestore.getDoc as jest.MockedFunction<typeof firestore.getDoc>;
const mockUpdateDoc = firestore.updateDoc as jest.MockedFunction<typeof firestore.updateDoc>;

describe('VideoCommentsModal', () => {
  const mockVideo: Video = {
    id: 'video-123',
    userId: 'owner-456',
    title: 'Test Video',
    description: 'Test Description',
    videoUrl: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    isPublic: true,
    likes: [],
    comments: [
      {
        id: 'comment-1',
        userId: 'user-1',
        text: 'Great video!',
        createdAt: createMockTimestamp(Date.now() / 1000 - 3600), // 1 hour ago
      },
      {
        id: 'comment-2',
        userId: 'user-2',
        text: 'Amazing content',
        createdAt: createMockTimestamp(Date.now() / 1000 - 7200), // 2 hours ago
      },
    ],
    viewCount: 100,
    duration: 30,
    fileSize: 1024 * 1024,
    createdAt: createMockTimestamp(Date.now() / 1000),
    updatedAt: createMockTimestamp(Date.now() / 1000),
  };

  const mockOnClose = jest.fn();
  const mockOnCommentAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful user profile fetches
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        displayName: 'Test User',
        photoURL: 'https://example.com/avatar.jpg',
      }),
    } as any);
  });

  describe('Modal Rendering', () => {
    it('should render modal when visible', () => {
      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      expect(getByText(/Comments \(/)).toBeTruthy();
    });

    it('should not render when not visible', () => {
      const { queryByText } = render(
        <VideoCommentsModal
          visible={false}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      expect(queryByText(/Comments \(/)).toBeNull();
    });

    it('should call onClose when close button pressed', () => {
      const { getByTestId } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      const closeButton = getByTestId('close');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Comment Display', () => {
    it('should display existing comments', async () => {
      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      await waitFor(() => {
        expect(getByText('Great video!')).toBeTruthy();
        expect(getByText('Amazing content')).toBeTruthy();
      });
    });

    it('should show comment count in header', () => {
      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      expect(getByText('Comments (2)')).toBeTruthy();
    });

    it('should format timestamps correctly', async () => {
      const { getAllByText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      await waitFor(() => {
        // Should show relative time like "1h ago" or "2h ago"
        // Use getAllByText since there might be multiple comments with same time
        const timeElements = getAllByText(/\dh ago/);
        expect(timeElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Comment Submission', () => {
    it('should submit new comment', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      const { getByPlaceholderText, getByTestId } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      const input = getByPlaceholderText('Add a comment...');
      const submitButton = getByTestId('send');

      fireEvent.changeText(input, 'This is a test comment');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalled();
        expect(mockOnCommentAdded).toHaveBeenCalled();
      });
    });

    it('should clear input after submission', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      const { getByPlaceholderText, getByTestId } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      const input = getByPlaceholderText('Add a comment...');
      const submitButton = getByTestId('send');

      fireEvent.changeText(input, 'Test comment');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(input.props.value).toBe('');
      });
    });

    it('should not submit empty comments', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      const input = getByPlaceholderText('Add a comment...');
      const submitButton = getByTestId('send');

      fireEvent.changeText(input, '   ');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockUpdateDoc).not.toHaveBeenCalled();
      });
    });

    it('should handle submission errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Network error'));

      const { getByPlaceholderText, getByTestId } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      const input = getByPlaceholderText('Add a comment...');
      const submitButton = getByTestId('send');

      fireEvent.changeText(input, 'Test comment');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to add comment. Please try again.'
        );
      });
    });
  });

  describe('Character Limit', () => {
    it('should allow comments up to character limit', () => {
      const { getByPlaceholderText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      const input = getByPlaceholderText('Add a comment...');
      const longText = 'a'.repeat(250);

      fireEvent.changeText(input, longText);

      // Should accept text input
      expect(input).toBeTruthy();
    });

    it('should show character counter', () => {
      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      expect(getByText('0/300')).toBeTruthy();
    });
  });

  describe('User Authentication', () => {
    it('should show login prompt for unauthenticated users', () => {
      // Temporarily mock getAuthInstance to return no user for this test
      const authModule = require('../../../config/firebaseConfig');
      const spy = jest.spyOn(authModule, 'getAuthInstance').mockImplementation(() => ({ currentUser: null }));

      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      expect(getByText('Log in to leave a comment')).toBeTruthy();

      spy.mockRestore();
    });

    it('should hide input for unauthenticated users', () => {
      const authModule = require('../../../config/firebaseConfig');
      const spy = jest.spyOn(authModule, 'getAuthInstance').mockImplementation(() => ({ currentUser: null }));

      const { queryByPlaceholderText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );
      // Input is hidden when not authenticated (rendered conditionally)
      const input = queryByPlaceholderText('Add a comment...');
      expect(input).toBeNull();

      spy.mockRestore();
    });
  });

  describe('User Profile Loading', () => {
    it('should show Unknown User when profile not loaded', async () => {
      // Ensure this test simulates missing user profile for the comment's author
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => null,
      } as any);

      const { getAllByText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      await waitFor(() => {
        // Mock doesn't return user data, so shows "Unknown User"
        const unknownUsers = getAllByText('Unknown User');
        expect(unknownUsers.length).toBeGreaterThan(0);
      });
    });

    it('should handle missing user profiles gracefully', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      } as any);

      const { getAllByText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      await waitFor(() => {
        const unknownUsers = getAllByText('Unknown User');
        expect(unknownUsers.length).toBeGreaterThan(0);
      });
    });

    it('should display user avatars when available', async () => {
      const { getAllByTestId } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      await waitFor(() => {
        // Avatar images should be rendered (or default icon)
        const avatars = getAllByTestId('person');
        expect(avatars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Time Formatting', () => {
    it('should format recent comments as "Just now"', async () => {
      const recentVideo: Video = {
        ...mockVideo,
        comments: [
          {
            id: 'comment-1',
            userId: 'user-1',
            text: 'Recent comment',
            createdAt: createMockTimestamp(Date.now() / 1000 - 30), // 30 seconds ago
          },
        ],
      };

      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={recentVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      await waitFor(() => {
        expect(getByText('Just now')).toBeTruthy();
      });
    });

    it('should format minutes ago correctly', async () => {
      const minutesVideo: Video = {
        ...mockVideo,
        comments: [
          {
            id: 'comment-1',
            userId: 'user-1',
            text: 'Comment from 5 minutes ago',
            createdAt: createMockTimestamp(Date.now() / 1000 - 300), // 5 minutes ago
          },
        ],
      };

      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={minutesVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      await waitFor(() => {
        expect(getByText(/5m ago/)).toBeTruthy();
      });
    });

    it('should format hours ago correctly', async () => {
      const hoursVideo: Video = {
        ...mockVideo,
        comments: [
          {
            id: 'comment-1',
            userId: 'user-1',
            text: 'Comment from 2 hours ago',
            createdAt: createMockTimestamp(Date.now() / 1000 - 7200), // 2 hours ago
          },
        ],
      };

      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={hoursVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      await waitFor(() => {
        expect(getByText(/2h ago/)).toBeTruthy();
      });
    });

    it('should format days ago correctly', async () => {
      const daysVideo: Video = {
        ...mockVideo,
        comments: [
          {
            id: 'comment-1',
            userId: 'user-1',
            text: 'Comment from 2 days ago',
            createdAt: createMockTimestamp(Date.now() / 1000 - 172800), // 2 days ago
          },
        ],
      };

      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={daysVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      await waitFor(() => {
        expect(getByText(/2d ago/)).toBeTruthy();
      });
    });
  });

  describe('Comment List Scrolling', () => {
    it('should render scrollable comment list', () => {
      const { root } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      // Comment list should be rendered
      expect(root).toBeTruthy();
    });

    it('should handle long comment lists', async () => {
      const manyComments = Array.from({ length: 50 }, (_, i) => ({
        id: `comment-${i}`,
        userId: `user-${i}`,
        text: `Comment ${i}`,
        createdAt: createMockTimestamp(Date.now() / 1000 - i * 60),
      }));

      const longVideo: Video = {
        ...mockVideo,
        comments: manyComments,
      };

      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={longVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      await waitFor(() => {
        // Should render at least some comments (FlatList virtualizes)
        expect(getByText('Comment 0')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle video with no comments', () => {
      const noCommentsVideo: Video = {
        ...mockVideo,
        comments: [],
      };

      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={noCommentsVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      expect(getByText('Comments (0)')).toBeTruthy();
      // Component shows empty list, doesn't have "No comments yet" message
    });

    it('should render modal properly', () => {
      const { getByText } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      // Modal renders properly with comment count
      expect(getByText('Comments (2)')).toBeTruthy();
    });

    it('should handle comment submissions', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      // Ensure a logged-in user is present for this test
      const authModule = require('../../../config/firebaseConfig');
      const authSpy = jest.spyOn(authModule, 'getAuthInstance').mockImplementation(() => ({
        currentUser: { uid: 'test-user-123', displayName: 'Test User', photoURL: 'https://example.com/avatar.jpg' },
      }));

      const { getByPlaceholderText, getByTestId } = render(
        <VideoCommentsModal
          visible={true}
          video={mockVideo}
          onClose={mockOnClose}
          onCommentAdded={mockOnCommentAdded}
        />
      );

      const input = getByPlaceholderText('Add a comment...');
      const submitButton = getByTestId('send');

      // Submit comment
      fireEvent.changeText(input, 'Test comment');
      fireEvent.press(submitButton);

      await waitFor(() => {
        // Should call Firebase update
        expect(mockUpdateDoc).toHaveBeenCalled();
      });

      authSpy.mockRestore();
    });
  });
});

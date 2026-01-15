import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ViewProfileModal } from '../../components/modals/ViewProfileModal';
import { UserProfileContext } from '../../context/UserProfileContext';

// Mock Firebase imports BEFORE any imports
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => 'mock-collection'),
  doc: jest.fn((_, collection, id) => `mock-doc-${id}`),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(() => 'mock-query'),
  where: jest.fn(() => 'mock-where'),
  arrayUnion: jest.fn((id) => ({ __arrayUnion: id })),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  getDownloadURL: jest.fn(() => Promise.reject(new Error('Photo not found'))),
}));

jest.mock('../../../firebase-config', () => ({
  auth: {
    currentUser: { uid: 'current-user-123', email: 'current@example.com' },
  },
}));

import * as firestore from 'firebase/firestore';
import * as storage from 'firebase/storage';

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ViewProfileModal', () => {
  const mockUserId = 'current-user-123';
  const mockOtherUserId = 'other-user-456';
  const mockUpdateUserProfile = jest.fn();
  const mockSetUserProfile = jest.fn();
  const mockUpdateProfile = jest.fn();

  const createMockContext = (userProfile: any) => ({
    userProfile,
    setUserProfile: mockSetUserProfile,
    updateUserProfile: mockUpdateUserProfile,
    updateProfile: mockUpdateProfile,
    isLoading: false,
    loading: false,
  });

  const mockOtherUserProfile = {
    username: 'TestUser',
    bio: 'Test user bio',
    dob: '1990-01-01',
    gender: 'Male',
    status: 'couple',
    sexualOrientation: 'Straight',
    edu: 'Bachelor\'s Degree',
    drinking: 'Occasionally',
    smoking: 'Never',
    photos: {
      profile: 'https://example.com/photo.jpg',
      slot1: 'https://example.com/photo2.jpg',
      slot2: 'https://example.com/photo3.jpg',
    },
    blocked: [],
    ratings: {
      average: 4.5,
      count: 10,
      ratedBy: {
        'user1': {
          rating: 5,
          comment: 'Great travel companion!',
          timestamp: Date.now(),
        },
        'user2': {
          rating: 4,
          comment: 'Very friendly and organized.',
          timestamp: Date.now(),
        },
      },
    },
  };

  const mockCurrentUserProfile = {
    username: 'CurrentUser',
    blocked: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Configure getDoc mock for user profile retrieval
    (firestore.getDoc as jest.Mock).mockImplementation((docRef: any) => {
      if (typeof docRef === 'string' && docRef.includes(mockOtherUserId)) {
        return Promise.resolve({
          exists: () => true,
          data: () => mockOtherUserProfile,
        });
      } else if (typeof docRef === 'string' && docRef.includes(mockUserId)) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            ...mockCurrentUserProfile,
            blocked: [mockOtherUserId], // After blocking
          }),
        });
      }
      return Promise.resolve({ exists: () => false });
    });

    // Configure getDocs mock for videos retrieval
    (firestore.getDocs as jest.Mock).mockResolvedValue({
      forEach: jest.fn((callback) => {
        // Simulate connection exists
        callback({
          id: 'mock-connection-id',
          data: () => ({
            users: [mockUserId, mockOtherUserId],
          }),
        });
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal when visible', async () => {
    const { getByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={false}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    expect(queryByText('TestUser')).toBeNull();
  });

  it('displays profile information correctly', async () => {
    const { getByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
      expect(getByText('Test user bio')).toBeTruthy();
      expect(getByText('Male')).toBeTruthy();
      expect(getByText('couple')).toBeTruthy();
    });
  });

  it('displays star rating in profile header', async () => {
    const { getByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
      expect(getByText('4.5')).toBeTruthy();
      expect(getByText('(10)')).toBeTruthy();
    });
  });

  it('switches between tabs correctly', async () => {
    const getDocs = firestore.getDocs as jest.Mock;
    getDocs.mockResolvedValue({
      forEach: jest.fn(),
    });

    const { getByText, queryByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Default tab is Profile
    expect(getByText('Bio')).toBeTruthy();

    // Switch to Photos tab
    await act(async () => {
      fireEvent.press(getByText('Photos'));
    });

    await waitFor(() => {
      expect(queryByText('Bio')).toBeNull();
    });

    // Switch to Videos tab
    await act(async () => {
      fireEvent.press(getByText('Videos'));
    });

    await waitFor(() => {
      expect(getByText('No videos available')).toBeTruthy();
    });

    // Switch to Ratings tab
    await act(async () => {
      fireEvent.press(getByText('Ratings'));
    });

    await waitFor(() => {
      expect(getByText('User Ratings')).toBeTruthy();
    });
  });

  it('displays photos in Photos tab', async () => {
    const { getByText, getAllByTestId } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Switch to Photos tab
    await act(async () => {
      fireEvent.press(getByText('Photos'));
    });

    await waitFor(() => {
      // Should display 3 photos (profile + slot1 + slot2)
      const images = getAllByTestId(/photo-grid-item/);
      expect(images.length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no photos available', async () => {
    const profileWithoutPhotos = {
      ...mockOtherUserProfile,
      photos: {},
    };

    const getDoc = firestore.getDoc as jest.Mock;
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => profileWithoutPhotos,
    });

    const { getByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Switch to Photos tab
    await act(async () => {
      fireEvent.press(getByText('Photos'));
    });

    await waitFor(() => {
      expect(getByText('No photos available')).toBeTruthy();
    });
  });

  it('loads and displays videos in Videos tab', async () => {
    const mockVideos = [
      {
        id: 'video1',
        videoUrl: 'https://example.com/video1.mp4',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        userId: mockOtherUserId,
      },
    ];

    const getDocs = firestore.getDocs as jest.Mock;
    getDocs.mockResolvedValue({
      forEach: (callback: Function) => {
        mockVideos.forEach((video) => {
          callback({
            id: video.id,
            data: () => video,
          });
        });
      },
    });

    const { getByText, queryByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Switch to Videos tab
    await act(async () => {
      fireEvent.press(getByText('Videos'));
    });

    await waitFor(() => {
      expect(queryByText('No videos available')).toBeNull();
    });
  });

  it('displays ratings and comments in Ratings tab', async () => {
    const { getByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Switch to Ratings tab
    await act(async () => {
      fireEvent.press(getByText('Ratings'));
    });

    await waitFor(() => {
      expect(getByText('User Ratings')).toBeTruthy();
      expect(getByText('⭐ 4.5')).toBeTruthy();
      expect(getByText('(10 ratings)')).toBeTruthy();
      expect(getByText('User Reviews')).toBeTruthy();
      expect(getByText('Great travel companion!')).toBeTruthy();
      expect(getByText('Very friendly and organized.')).toBeTruthy();
    });
  });

  it('handles block user action', async () => {
    const mockOnClose = jest.fn();
    Alert.alert = jest.fn((title, message, buttons) => {
      // Simulate pressing the Block button in confirmation
      const blockButton = buttons?.find((b: any) => b.text === 'Block');
      if (blockButton?.onPress) {
        blockButton.onPress();
      }
    });

    const { getByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={mockOnClose}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Click block button
    await act(async () => {
      fireEvent.press(getByText('🚫'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      expect(firestore.updateDoc).toHaveBeenCalled();
      expect(mockUpdateUserProfile).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles report user action', async () => {
    Alert.prompt = jest.fn((title, message, callback) => {
      // Simulate user entering a reason
      if (typeof callback === 'function') {
        callback('Inappropriate behavior');
      }
    });

    const { getByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Click report button
    await act(async () => {
      fireEvent.press(getByText('🚩'));
    });

    await waitFor(() => {
      expect(Alert.prompt).toHaveBeenCalled();
    });
  });

  it('shows loading indicator while fetching profile', () => {
    const { getByTestId } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    // ActivityIndicator should be present initially
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('shows error alert if profile fetch fails', async () => {
    const getDoc = firestore.getDoc as jest.Mock;
    getDoc.mockRejectedValue(new Error('Network error'));

    const mockOnClose = jest.fn();

    render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={mockOnClose}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load profile');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows error alert if profile does not exist', async () => {
    const getDoc = firestore.getDoc as jest.Mock;
    getDoc.mockResolvedValue({ exists: () => false });

    const mockOnClose = jest.fn();

    render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={mockOnClose}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'User profile not found');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('closes modal when close button is pressed', async () => {
    const mockOnClose = jest.fn();

    const { getByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={mockOnClose}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Find and press close button (✕)
    await act(async () => {
      fireEvent.press(getByText('✕'));
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not display age field in profile tab', async () => {
    const profileWithDOB = {
      ...mockOtherUserProfile,
      dob: '1990-01-01',
    };

    const getDoc = firestore.getDoc as jest.Mock;
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => profileWithDOB,
    });

    const { getByText, queryByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Age should NOT be displayed anywhere
    expect(queryByText(/3[0-9]/)).toBeNull(); // Age in 30s
    expect(queryByText('Age')).toBeNull();
    expect(queryByText(/years old/)).toBeNull();
  });

  it('does not display location or interests fields', async () => {
    const { getByText, queryByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Location and Interests should NOT be displayed
    expect(queryByText('Location')).toBeNull();
    expect(queryByText('Interests')).toBeNull();
    expect(queryByText('N/A')).toBeNull();
  });

  it('displays default avatar when no profile photo exists', async () => {
    const profileWithoutPhoto = {
      ...mockOtherUserProfile,
      photos: {},
    };

    const getDoc = firestore.getDoc as jest.Mock;
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => profileWithoutPhoto,
    });

    const { getByText, queryByText } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Should show default avatar, not "No Photo" text
    expect(queryByText('No Photo')).toBeNull();
  });

  it('enlarges photo when clicked in Photos tab', async () => {
    const { getByText, getByTestId, getAllByTestId } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Switch to Photos tab
    await act(async () => {
      fireEvent.press(getByText('Photos'));
    });

    await waitFor(() => {
      const photoGridItems = getAllByTestId(/photo-grid-item/);
      expect(photoGridItems.length).toBeGreaterThan(0);
    });

    // Click on first photo
    const photoGridItems = getAllByTestId(/photo-grid-item/);
    await act(async () => {
      fireEvent.press(photoGridItems[0]);
    });

    // Enlarged photo modal should be visible
    await waitFor(() => {
      const enlargedPhotoModal = getByTestId('enlarged-photo-modal');
      expect(enlargedPhotoModal).toBeTruthy();
    });
  });

  it('enlarges video when clicked in Videos tab', async () => {
    const mockVideos = [
      {
        id: 'video1',
        videoUrl: 'https://example.com/video1.mp4',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        userId: mockOtherUserId,
      },
    ];

    const getDocs = firestore.getDocs as jest.Mock;
    getDocs.mockResolvedValue({
      forEach: (callback: Function) => {
        mockVideos.forEach((video) => {
          callback({
            id: video.id,
            data: () => video,
          });
        });
      },
    });

    const { getByText, getByTestId } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Switch to Videos tab
    await act(async () => {
      fireEvent.press(getByText('Videos'));
    });

    await waitFor(() => {
      const videoGridItems = getByTestId('video-grid-item-video1');
      expect(videoGridItems).toBeTruthy();
    });

    // Click on video
    const videoGridItem = getByTestId('video-grid-item-video1');
    await act(async () => {
      fireEvent.press(videoGridItem);
    });

    // Enlarged video modal should be visible
    await waitFor(() => {
      const enlargedVideoModal = getByTestId('enlarged-video-modal');
      expect(enlargedVideoModal).toBeTruthy();
    });
  });

  it('closes enlarged photo modal when close button is pressed', async () => {
    const { getByText, getByTestId, getAllByTestId, queryByTestId } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Switch to Photos tab and click photo
    await act(async () => {
      fireEvent.press(getByText('Photos'));
    });

    const photoGridItems = getAllByTestId(/photo-grid-item/);
    await act(async () => {
      fireEvent.press(photoGridItems[0]);
    });

    // Close enlarged photo
    await act(async () => {
      const closeButton = getByTestId('enlarged-photo-close-button');
      fireEvent.press(closeButton);
    });

    // Modal should be closed
    await waitFor(() => {
      expect(queryByTestId('enlarged-photo-modal')).toBeNull();
    });
  });

  it('closes enlarged video modal when close button is pressed', async () => {
    const mockVideos = [
      {
        id: 'video1',
        videoUrl: 'https://example.com/video1.mp4',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        userId: mockOtherUserId,
      },
    ];

    const getDocs = firestore.getDocs as jest.Mock;
    getDocs.mockResolvedValue({
      forEach: (callback: Function) => {
        mockVideos.forEach((video) => {
          callback({
            id: video.id,
            data: () => video,
          });
        });
      },
    });

    const { getByText, getByTestId, queryByTestId } = render(
      <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
        <ViewProfileModal
          visible={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Switch to Videos tab and click video
    await act(async () => {
      fireEvent.press(getByText('Videos'));
    });

    const videoGridItem = getByTestId('video-grid-item-video1');
    await act(async () => {
      fireEvent.press(videoGridItem);
    });

    // Close enlarged video
    await act(async () => {
      const closeButton = getByTestId('enlarged-video-close-button');
      fireEvent.press(closeButton);
    });

    // Modal should be closed
    await waitFor(() => {
      expect(queryByTestId('enlarged-video-modal')).toBeNull();
    });
  });

  describe('Video Reporting', () => {
    const mockVideos = [
      {
        id: 'video1',
        videoUrl: 'https://example.com/video1.mp4',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        title: 'Test Video',
        userId: mockOtherUserId,
      },
    ];

    beforeEach(() => {
      const getDocs = firestore.getDocs as jest.Mock;
      getDocs.mockResolvedValue({
        forEach: (callback: Function) => {
          mockVideos.forEach((video) => {
            callback({
              id: video.id,
              data: () => video,
            });
          });
        },
      });
    });

    it('shows report button on other users videos', async () => {
      const { getByText, getByTestId } = render(
        <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
          <ViewProfileModal
            visible={true}
            onClose={() => {}}
            userId={mockOtherUserId}
          />
        </UserProfileContext.Provider>
      );

      await waitFor(() => {
        expect(getByText('TestUser')).toBeTruthy();
      });

      // Switch to Videos tab
      await act(async () => {
        fireEvent.press(getByText('Videos'));
      });

      // Report button should be visible
      await waitFor(() => {
        expect(getByTestId('report-video-button-video1')).toBeTruthy();
      });
    });

    it('does not show report button on own videos', async () => {
      const getDocs = firestore.getDocs as jest.Mock;
      getDocs.mockResolvedValue({
        forEach: (callback: Function) => {
          [{ ...mockVideos[0], userId: mockUserId }].forEach((video) => {
            callback({
              id: video.id,
              data: () => video,
            });
          });
        },
      });

      const { getByText, queryByTestId } = render(
        <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
          <ViewProfileModal
            visible={true}
            onClose={() => {}}
            userId={mockUserId}
          />
        </UserProfileContext.Provider>
      );

      await waitFor(() => {
        expect(getByText('TestUser')).toBeTruthy();
      });

      // Switch to Videos tab
      await act(async () => {
        fireEvent.press(getByText('Videos'));
      });

      // Report button should NOT be visible
      await waitFor(() => {
        expect(queryByTestId('report-video-button-video1')).toBeNull();
      });
    });

    it('opens ReportVideoModal when report button is pressed', async () => {
      const { getByText, getByTestId } = render(
        <UserProfileContext.Provider value={createMockContext(mockCurrentUserProfile)}>
          <ViewProfileModal
            visible={true}
            onClose={() => {}}
            userId={mockOtherUserId}
          />
        </UserProfileContext.Provider>
      );

      await waitFor(() => {
        expect(getByText('TestUser')).toBeTruthy();
      });

      // Switch to Videos tab
      await act(async () => {
        fireEvent.press(getByText('Videos'));
      });

      // Press report button
      await act(async () => {
        const reportButton = getByTestId('report-video-button-video1');
        fireEvent.press(reportButton);
      });

      // ReportVideoModal should open
      await waitFor(() => {
        expect(getByText('Report Video')).toBeTruthy();
      });
    });
  });
});

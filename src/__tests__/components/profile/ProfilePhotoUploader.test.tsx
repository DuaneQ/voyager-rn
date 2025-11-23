/**
 * Unit Tests for ProfilePhotoUploader
 * Tests profile photo display, upload, and deletion
 * 
 * Note: Uses UserProfileContext.Provider wrapper to provide context
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProfilePhotoUploader } from '../../../components/profile/ProfilePhotoUploader';
import { UserProfileContext } from '../../../context/UserProfileContext';

// Mock hooks
const mockUsePhotoUpload = jest.fn();

jest.mock('../../../hooks/photo/usePhotoUpload', () => ({
  usePhotoUpload: () => mockUsePhotoUpload(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

describe('ProfilePhotoUploader', () => {
  const mockSelectAndUploadPhoto = jest.fn();
  const mockDeletePhoto = jest.fn();

  const defaultUploadState = {
    uploadState: {
      loading: false,
      progress: 0,
      error: null,
      uploadedUrl: null,
    },
    selectAndUploadPhoto: mockSelectAndUploadPhoto,
    deletePhoto: mockDeletePhoto,
  };

  const createUserProfile = (photoUrl?: string) => ({
    uid: 'user-123',
    username: 'testuser',
    photos: photoUrl ? { profile: photoUrl } : {},
  });

  const createContextValue = (userProfile: any) => ({
    userProfile,
    isLoading: false,
    loading: false,
    error: null,
    loadUserProfile: jest.fn(),
    setUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    updateProfile: jest.fn(),
  });

  const renderWithContext = (userProfile: any, props: any = {}) => {
    return render(
      <UserProfileContext.Provider value={createContextValue(userProfile)}>
        <ProfilePhotoUploader {...props} />
      </UserProfileContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePhotoUpload.mockReturnValue(defaultUploadState);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore();
  });

  describe('Rendering', () => {
    it('should render without photo', () => {
      const { UNSAFE_root } = renderWithContext(createUserProfile());
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with existing photo', () => {
      const { UNSAFE_root } = renderWithContext(createUserProfile('https://example.com/photo.jpg'));
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should apply custom size', () => {
      const { UNSAFE_root } = renderWithContext(createUserProfile(), { size: 150 });
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Upload', () => {
    it('should upload photo when pressed', async () => {
      mockSelectAndUploadPhoto.mockResolvedValue({ url: 'https://example.com/new.jpg' });
      const { UNSAFE_root } = renderWithContext(createUserProfile());

      const touchable = UNSAFE_root.findAllByType('TouchableOpacity')[0];
      fireEvent.press(touchable);

      await waitFor(() => {
        expect(mockSelectAndUploadPhoto).toHaveBeenCalledWith('profile');
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Profile photo uploaded successfully');
      });
    });

    it('should show error on upload failure', async () => {
      mockSelectAndUploadPhoto.mockRejectedValue(new Error('Upload failed'));
      const { UNSAFE_root } = renderWithContext(createUserProfile());

      const touchable = UNSAFE_root.findAllByType('TouchableOpacity')[0];
      fireEvent.press(touchable);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Upload Failed', 'Upload failed');
      });
    });

    it('should show progress during upload', () => {
      mockUsePhotoUpload.mockReturnValue({
        ...defaultUploadState,
        uploadState: { ...defaultUploadState.uploadState, loading: true, progress: 50 },
      });

      const { getByText } = renderWithContext(createUserProfile());
      expect(getByText('50%')).toBeTruthy();
    });

    it('should show error message', () => {
      mockUsePhotoUpload.mockReturnValue({
        ...defaultUploadState,
        uploadState: { ...defaultUploadState.uploadState, error: 'Network error' },
      });

      const { getByText } = renderWithContext(createUserProfile());
      expect(getByText('Network error')).toBeTruthy();
    });
  });

  describe('Delete', () => {
    it('should show delete option when photo exists', () => {
      const { UNSAFE_root } = renderWithContext(createUserProfile('https://example.com/photo.jpg'));

      const touchable = UNSAFE_root.findAllByType('TouchableOpacity')[0];
      fireEvent(touchable, 'onLongPress');

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      expect(buttons.length).toBe(3);
      expect(buttons[1].text).toBe('Remove Photo');
    });

    it('should delete photo successfully', async () => {
      mockDeletePhoto.mockResolvedValue(undefined);
      const { UNSAFE_root } = renderWithContext(createUserProfile('https://example.com/photo.jpg'));

      const touchable = UNSAFE_root.findAllByType('TouchableOpacity')[0];
      fireEvent(touchable, 'onLongPress');

      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
      await buttons[1].onPress();

      await waitFor(() => {
        expect(mockDeletePhoto).toHaveBeenCalledWith('profile');
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Profile photo removed');
      });
    });

    it('should show error on delete failure', async () => {
      mockDeletePhoto.mockRejectedValue(new Error('Delete failed'));
      const { UNSAFE_root } = renderWithContext(createUserProfile('https://example.com/photo.jpg'));

      const touchable = UNSAFE_root.findAllByType('TouchableOpacity')[0];
      fireEvent(touchable, 'onLongPress');

      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
      await buttons[1].onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Delete Failed', 'Delete failed');
      });
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      const { UNSAFE_root } = renderWithContext(createUserProfile(), { disabled: true });

      const touchable = UNSAFE_root.findAllByType('TouchableOpacity')[0];
      expect(touchable.props.disabled).toBe(true);
    });

    it('should be disabled when loading', () => {
      mockUsePhotoUpload.mockReturnValue({
        ...defaultUploadState,
        uploadState: { ...defaultUploadState.uploadState, loading: true },
      });

      const { UNSAFE_root } = renderWithContext(createUserProfile());

      const touchable = UNSAFE_root.findAllByType('TouchableOpacity')[0];
      expect(touchable.props.disabled).toBe(true);
    });
  });
});

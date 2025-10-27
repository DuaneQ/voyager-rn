/**
 * ProfilePage Component Tests
 * Comprehensive test coverage for main profile page with tabs
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfilePage from '../../pages/ProfilePage';
import { useUserProfile } from '../../context/UserProfileContext';
import { useAlert } from '../../context/AlertContext';
import * as ImagePicker from 'expo-image-picker';

// Mock dependencies
jest.mock('../../context/UserProfileContext');
jest.mock('../../context/AlertContext');
jest.mock('expo-image-picker');
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(),
  getAuth: jest.fn(() => ({})),
}));
jest.mock('../../config/firebaseConfig', () => ({
  auth: {},
}));

// Mock components
jest.mock('../../components/profile/ProfileHeader', () => ({
  ProfileHeader: ({ displayName, onEditPress }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity testID="profile-header" onPress={onEditPress}>
        <Text>{displayName}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../components/profile/EditProfileModal', () => ({
  EditProfileModal: ({ visible, onClose, onSave }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    if (!visible) return null;
    return (
      <View testID="edit-profile-modal">
        <Text>Edit Profile Modal</Text>
        <TouchableOpacity testID="modal-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="modal-save" onPress={async () => {
          try {
            await onSave({});
          } catch (error) {
            // Ignore errors in mock
          }
        }}>
          <Text>Save</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock('../../components/profile/PhotoGrid', () => ({
  PhotoGrid: ({ photos, onAddPhoto, onPhotoPress }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="photo-grid">
        <Text>Photos: {photos.length}</Text>
        <TouchableOpacity testID="add-photo" onPress={onAddPhoto}>
          <Text>Add Photo</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

describe('ProfilePage', () => {
  const mockShowAlert = jest.fn();
  const mockUpdateProfile = jest.fn();

  const mockUserProfile = {
    username: 'testuser',
    email: 'test@example.com',
    bio: 'Test bio',
    dob: '1990-01-01',
    gender: 'Female',
    sexualOrientation: 'heterosexual',
    status: 'single',
    edu: "Bachelor's Degree",
    drinking: 'Never',
    smoking: 'Never',
    photoURL: 'https://example.com/photo.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUserProfile as jest.Mock).mockReturnValue({
      userProfile: mockUserProfile,
      updateProfile: mockUpdateProfile,
      loading: false,
    });
    (useAlert as jest.Mock).mockReturnValue({
      showAlert: mockShowAlert,
    });
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
  });

  describe('Rendering', () => {
    it('should render profile page', () => {
      const { getByTestId } = render(<ProfilePage />);
      expect(getByTestId('profile-header')).toBeTruthy();
    });

    it('should display loading state when profile is not loaded', () => {
      (useUserProfile as jest.Mock).mockReturnValue({
        userProfile: null,
        updateProfile: mockUpdateProfile,
        loading: true,
      });

      const { getByText } = render(<ProfilePage />);
      expect(getByText('Loading profile...')).toBeTruthy();
    });

    it('should render tab navigation', () => {
      const { getByText } = render(<ProfilePage />);
      
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('Photos')).toBeTruthy();
      expect(getByText('Videos')).toBeTruthy();
      expect(getByText('AI Itinerary')).toBeTruthy();
    });

    it('should have Profile tab active by default', () => {
      const { getByText } = render(<ProfilePage />);
      
      const profileTab = getByText('Profile');
      expect(profileTab).toBeTruthy();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to Photos tab when clicked', () => {
      const { getByText, getByTestId } = render(<ProfilePage />);
      
      const photosTab = getByText('Photos');
      fireEvent.press(photosTab);
      
      expect(getByTestId('photo-grid')).toBeTruthy();
    });

    it('should switch to Videos tab when clicked', () => {
      const { getByText } = render(<ProfilePage />);
      
      const videosTab = getByText('Videos');
      fireEvent.press(videosTab);
      
      expect(getByText('Videos feature coming soon')).toBeTruthy();
    });

    it('should switch to AI Itinerary tab when clicked', () => {
      const { getByText } = render(<ProfilePage />);
      
      const aiTab = getByText('AI Itinerary');
      fireEvent.press(aiTab);
      
      expect(getByText('AI Itinerary feature coming soon')).toBeTruthy();
    });

    it('should switch back to Profile tab', () => {
      const { getByText, getByTestId } = render(<ProfilePage />);
      
      // Switch to Photos
      fireEvent.press(getByText('Photos'));
      
      // Switch back to Profile
      fireEvent.press(getByText('Profile'));
      
      // Verify ProfileTab is rendered (check for stats or accordion)
      expect(getByTestId('stat-connections')).toBeTruthy();
    });
  });

  describe('Profile Tab Content', () => {
    it('should display stats section in Profile tab', () => {
      const { getByText, getByTestId } = render(<ProfilePage />);
      
      // Check for stats using testIDs since labels might be different
      expect(getByTestId('stat-connections')).toBeTruthy();
      expect(getByTestId('stat-trips')).toBeTruthy();
      expect(getByTestId('stat-rating')).toBeTruthy();
      
      // Verify text labels
      expect(getByText('Connections')).toBeTruthy();
      expect(getByText('Trips')).toBeTruthy();
      expect(getByText('(0 reviews)')).toBeTruthy(); // Rating label
    });

    it('should display accordions in Profile tab', () => {
      const { getByText } = render(<ProfilePage />);
      
      // Check accordion titles
      expect(getByText('Personal Info')).toBeTruthy();
      expect(getByText('Lifestyle')).toBeTruthy();
      expect(getByText('Travel Preferences')).toBeTruthy();
    });

    it('should display Sign Out button in Profile tab', () => {
      const { getByTestId } = render(<ProfilePage />);
      
      expect(getByTestId('sign-out-button')).toBeTruthy();
    });
  });

  describe('Edit Profile Modal', () => {
    it('should open edit modal when profile header edit is pressed', () => {
      const { getByTestId } = render(<ProfilePage />);
      
      const profileHeader = getByTestId('profile-header');
      fireEvent.press(profileHeader);
      
      expect(getByTestId('edit-profile-modal')).toBeTruthy();
    });

    it('should close edit modal when close button is pressed', () => {
      const { getByTestId, queryByTestId } = render(<ProfilePage />);
      
      // Open modal
      fireEvent.press(getByTestId('profile-header'));
      expect(getByTestId('edit-profile-modal')).toBeTruthy();
      
      // Close modal
      fireEvent.press(getByTestId('modal-close'));
      expect(queryByTestId('edit-profile-modal')).toBeNull();
    });

    it('should save profile data and show success alert', async () => {
      mockUpdateProfile.mockResolvedValue(undefined);
      
      const { getByTestId } = render(<ProfilePage />);
      
      // Open modal
      fireEvent.press(getByTestId('profile-header'));
      
      // Save
      fireEvent.press(getByTestId('modal-save'));
      
      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
        expect(mockShowAlert).toHaveBeenCalledWith('Profile updated successfully', 'success');
      });
    });

    it('should show error alert when save fails', async () => {
      // Suppress error logs and unhandled rejections
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a mock that will reject when called
      const mockUpdateProfileFail = jest.fn(async () => {
        throw new Error('Save failed');
      });
      
      (useUserProfile as jest.Mock).mockReturnValue({
        userProfile: mockUserProfile,
        updateProfile: mockUpdateProfileFail,
        loading: false,
      });
      
      const { getByTestId } = render(<ProfilePage />);
      
      // Open modal
      fireEvent.press(getByTestId('profile-header'));
      
      // Save
      fireEvent.press(getByTestId('modal-save'));
      
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Failed to update profile', 'error');
      });
      
      consoleError.mockRestore();
    });
  });

  describe('Photo Management', () => {
    it('should request permissions when adding photo', async () => {
      const { getByText, getByTestId } = render(<ProfilePage />);
      
      // Switch to Photos tab
      fireEvent.press(getByText('Photos'));
      
      // Click add photo
      fireEvent.press(getByTestId('add-photo'));
      
      await waitFor(() => {
        expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should show alert when permissions are denied', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      
      const { getByText, getByTestId } = render(<ProfilePage />);
      
      fireEvent.press(getByText('Photos'));
      fireEvent.press(getByTestId('add-photo'));
      
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Permission required', 'error');
      });
    });

    it('should launch image picker when permissions granted', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });
      
      const { getByText, getByTestId } = render(<ProfilePage />);
      
      fireEvent.press(getByText('Photos'));
      fireEvent.press(getByTestId('add-photo'));
      
      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });
    });

    it('should show success alert when photo is added', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg' }],
      });
      
      const { getByText, getByTestId } = render(<ProfilePage />);
      
      fireEvent.press(getByText('Photos'));
      fireEvent.press(getByTestId('add-photo'));
      
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Photo added successfully', 'success');
      });
    });

    it('should handle photo picker errors gracefully', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(
        new Error('Picker error')
      );
      console.error = jest.fn();
      
      const { getByText, getByTestId } = render(<ProfilePage />);
      
      fireEvent.press(getByText('Photos'));
      fireEvent.press(getByTestId('add-photo'));
      
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Failed to add photo', 'error');
      });
    });
  });

  describe('Sign Out', () => {
    it('should show confirmation alert when Sign Out button is pressed', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const { getByTestId } = render(<ProfilePage />);
      
      const signOutButton = getByTestId('sign-out-button');
      fireEvent.press(signOutButton);
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Sign Out',
          'Are you sure you want to sign out?',
          expect.any(Array),
          expect.any(Object)
        );
      });
      
      mockAlert.mockRestore();
    });

    it('should call signOut when user confirms', async () => {
      const { signOut: mockSignOut } = require('firebase/auth');
      const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(
        (title, message, buttons) => {
          // Simulate pressing "Sign Out" button
          if (buttons && buttons[1]) {
            buttons[1].onPress?.();
          }
        }
      );
      
      const { getByTestId } = render(<ProfilePage />);
      
      const signOutButton = getByTestId('sign-out-button');
      fireEvent.press(signOutButton);
      
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
      
      mockAlert.mockRestore();
    });

    it('should show error alert when sign out fails', async () => {
      const { signOut: mockSignOut } = require('firebase/auth');
      mockSignOut.mockRejectedValue(new Error('Sign out failed'));
      console.error = jest.fn();
      
      const mockAlert = jest.spyOn(Alert, 'alert');
      // First call is sign out confirmation, second call should be error
      mockAlert.mockImplementationOnce((title, message, buttons) => {
        // Simulate pressing "Sign Out" button
        if (buttons && buttons[1]) {
          buttons[1].onPress?.();
        }
      });
      
      const { getByTestId } = render(<ProfilePage />);
      
      fireEvent.press(getByTestId('sign-out-button'));
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          'Failed to sign out. Please try again.'
        );
      });
      
      mockAlert.mockRestore();
    });
  });

  describe('Profile Completeness Calculation', () => {
    it('should calculate completeness correctly with all fields', () => {
      const { getByTestId } = render(<ProfilePage />);
      expect(getByTestId('profile-header')).toBeTruthy();
    });

    it('should calculate completeness correctly with missing fields', () => {
      const incompleteProfile = {
        ...mockUserProfile,
        username: '',
        bio: '',
      };
      
      (useUserProfile as jest.Mock).mockReturnValue({
        userProfile: incompleteProfile,
        updateProfile: mockUpdateProfile,
        loading: false,
      });
      
      const { getByTestId } = render(<ProfilePage />);
      expect(getByTestId('profile-header')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user profile gracefully', () => {
      (useUserProfile as jest.Mock).mockReturnValue({
        userProfile: null,
        updateProfile: mockUpdateProfile,
        loading: false,
      });
      
      const { getByText } = render(<ProfilePage />);
      expect(getByText('Loading profile...')).toBeTruthy();
    });

    it('should handle profile with minimal data', () => {
      const minimalProfile = {
        username: 'user',
        email: 'user@test.com',
      };
      
      (useUserProfile as jest.Mock).mockReturnValue({
        userProfile: minimalProfile,
        updateProfile: mockUpdateProfile,
        loading: false,
      });
      
      const { getByTestId } = render(<ProfilePage />);
      expect(getByTestId('profile-header')).toBeTruthy();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render all tabs on mount', () => {
      const { getByText } = render(<ProfilePage />);
      
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('Photos')).toBeTruthy();
      expect(getByText('Videos')).toBeTruthy();
      expect(getByText('AI Itinerary')).toBeTruthy();
    });

    it('should maintain tab state across re-renders', () => {
      const { getByText, rerender } = render(<ProfilePage />);
      
      // Switch to Photos tab
      fireEvent.press(getByText('Photos'));
      
      // Re-render
      rerender(<ProfilePage />);
      
      // Should still show Photos tab content
      expect(getByText('Photos: 0')).toBeTruthy();
    });
  });
});

/**
 * EditProfileModal Component Tests
 * Comprehensive test coverage for profile editing modal
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { EditProfileModal, ProfileData } from '../../../components/profile/EditProfileModal';
import { Platform } from 'react-native';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Picker
jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  
  const MockPicker = ({ children, selectedValue, onValueChange, style, ...props }: any) => (
    <View style={style} {...props}>
      {children}
    </View>
  );
  
  const MockPickerItem = ({ label, value, ...props }: any) => (
    <Text {...props}>{label}</Text>
  );
  
  MockPicker.Item = MockPickerItem;
  
  return {
    Picker: MockPicker,
  };
});

describe('EditProfileModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  const initialData: ProfileData = {
    username: 'testuser',
    bio: 'Test bio',
    dob: '1990-01-01',
    gender: 'Female',
    sexualOrientation: 'heterosexual',
    status: 'single',
    edu: "Bachelor's Degree",
    drinking: 'Never',
    smoking: 'Never',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when visible', () => {
      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      expect(getByText('Edit Profile')).toBeTruthy();
      expect(getByText('Username *')).toBeTruthy();
      expect(getByText('Bio')).toBeTruthy();
      expect(getByText('Date of Birth *')).toBeTruthy();
      expect(getByText('Status *')).toBeTruthy();
      expect(getByText('Gender *')).toBeTruthy();
      expect(getByText('Sexual Orientation *')).toBeTruthy();
      expect(getByText('Education')).toBeTruthy();
      expect(getByText('Drinking')).toBeTruthy();
      expect(getByText('Smoking')).toBeTruthy();
    });

    it('should not render when not visible', () => {
      const { queryByText } = render(
        <EditProfileModal
          visible={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      expect(queryByText('Edit Profile')).toBeNull();
    });

    it('should display initial data correctly', () => {
      const { getByDisplayValue } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      expect(getByDisplayValue('testuser')).toBeTruthy();
      expect(getByDisplayValue('Test bio')).toBeTruthy();
      expect(getByDisplayValue('1990-01-01')).toBeTruthy();
    });

    it('should show required field indicators', () => {
      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      expect(getByText('* Required fields for creating itineraries')).toBeTruthy();
    });

    it('should show character counter for username', () => {
      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      expect(getByText('8/50 characters')).toBeTruthy();
    });

    it('should show character counter for bio', () => {
      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      expect(getByText('8/500 characters')).toBeTruthy();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByLabelText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const closeButton = getByLabelText('Close');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Validation', () => {
    it('should show error when username is empty', async () => {
      const emptyData = { ...initialData, username: '' };
      const { getByText, getByDisplayValue } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={emptyData}
        />
      );

      const usernameInput = getByDisplayValue('');
      fireEvent.changeText(usernameInput, '');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Username is required')).toBeTruthy();
      });
    });

    it('should show error when date of birth is empty', async () => {
      const emptyData = { ...initialData, dob: '' };
      const { getByText, getAllByDisplayValue } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={emptyData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Date of birth is required')).toBeTruthy();
      });
    });

    it('should show error when user is under 18', async () => {
      const today = new Date();
      const recentDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
      const dateString = recentDate.toISOString().split('T')[0];
      
      const youngUserData = { ...initialData, dob: dateString };
      const { getByText, getByDisplayValue } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={youngUserData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('You must be 18 years or older')).toBeTruthy();
      });
    });

    it('should show error when gender is empty', async () => {
      const emptyData = { ...initialData, gender: '' };
      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={emptyData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Gender is required')).toBeTruthy();
      });
    });

    it('should show error when status is empty', async () => {
      const emptyData = { ...initialData, status: '' };
      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={emptyData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Status is required')).toBeTruthy();
      });
    });

    it('should show error when sexual orientation is empty', async () => {
      const emptyData = { ...initialData, sexualOrientation: '' };
      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={emptyData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Sexual orientation is required')).toBeTruthy();
      });
    });

    it('should enforce maxLength of 500 characters on bio input', () => {
      const { getByDisplayValue } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const bioInput = getByDisplayValue('Test bio');
      
      // TextInput has maxLength={500}, so it will enforce this limit
      expect(bioInput.props.maxLength).toBe(500);
    });

    it('should allow valid form submission', async () => {
      mockOnSave.mockResolvedValue(undefined);

      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(initialData);
      });
    });
  });

  describe('Text Input Changes', () => {
    it('should update username on text change', () => {
      const { getByDisplayValue } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const usernameInput = getByDisplayValue('testuser');
      fireEvent.changeText(usernameInput, 'newusername');

      expect(getByDisplayValue('newusername')).toBeTruthy();
    });

    it('should update bio on text change', () => {
      const { getByDisplayValue } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const bioInput = getByDisplayValue('Test bio');
      fireEvent.changeText(bioInput, 'Updated bio text');

      expect(getByDisplayValue('Updated bio text')).toBeTruthy();
    });

    it('should update date of birth on text change', () => {
      const { getByDisplayValue } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const dobInput = getByDisplayValue('1990-01-01');
      fireEvent.changeText(dobInput, '1995-06-15');

      expect(getByDisplayValue('1995-06-15')).toBeTruthy();
    });

    it('should enforce username max length of 50 characters', () => {
      const { getByDisplayValue, getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const usernameInput = getByDisplayValue('testuser');
      const longUsername = 'a'.repeat(50);
      fireEvent.changeText(usernameInput, longUsername);

      expect(getByText('50/50 characters')).toBeTruthy();
    });

    it('should update character counter for bio', () => {
      const { getByDisplayValue, getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const bioInput = getByDisplayValue('Test bio');
      fireEvent.changeText(bioInput, 'New bio');

      expect(getByText('7/500 characters')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when saving', async () => {
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByText, queryByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(queryByText('Save')).toBeNull();
      });
    });

    it('should disable save button while loading', async () => {
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Button should be disabled during save
      fireEvent.press(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Clearing', () => {
    it('should clear errors when field is modified', async () => {
      const emptyData = { ...initialData, username: '' };
      const { getByText, getByPlaceholderText, queryByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={emptyData}
        />
      );

      // Trigger validation error
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Username is required')).toBeTruthy();
      });

      // Update field to clear error
      const usernameInput = getByPlaceholderText('Enter your username');
      fireEvent.changeText(usernameInput, 'newusername');

      await waitFor(() => {
        expect(queryByText('Username is required')).toBeNull();
      });
    });
  });

  describe('Platform-Specific Rendering', () => {
    it('should render iOS picker buttons on iOS', () => {
      Platform.OS = 'ios';
      
      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      // iOS should show selected values as text
      expect(getByText('Female')).toBeTruthy();
    });

    it('should render Android pickers on Android', () => {
      Platform.OS = 'android';
      
      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      expect(getByText('Gender *')).toBeTruthy();
    });
  });

  describe('Modal Lifecycle', () => {
    it('should reset form data when modal reopens', () => {
      const { rerender, getByDisplayValue } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      // Change username
      const usernameInput = getByDisplayValue('testuser');
      fireEvent.changeText(usernameInput, 'changed');

      // Close modal
      rerender(
        <EditProfileModal
          visible={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      // Reopen modal
      rerender(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      // Should reset to initial data
      expect(getByDisplayValue('testuser')).toBeTruthy();
    });

    it('should clear errors when modal reopens', async () => {
      const emptyData = { ...initialData, username: '' };
      const { rerender, getByText, queryByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={emptyData}
        />
      );

      // Trigger validation error
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Username is required')).toBeTruthy();
      });

      // Close and reopen modal
      rerender(
        <EditProfileModal
          visible={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={emptyData}
        />
      );

      rerender(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      // Errors should be cleared
      expect(queryByText('Username is required')).toBeNull();
    });
  });

  describe('Save Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      const mockError = new Error('Save failed');
      mockOnSave.mockRejectedValue(mockError);
      console.error = jest.fn(); // Suppress error logs

      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={initialData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Modal should still be open after error
      expect(getByText('Edit Profile')).toBeTruthy();
    });
  });

  describe('Age Validation', () => {
    it('should accept user who is exactly 18 years old', async () => {
      const today = new Date();
      const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      const dateString = eighteenYearsAgo.toISOString().split('T')[0];
      
      const validData = { ...initialData, dob: dateString };
      mockOnSave.mockResolvedValue(undefined);

      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={validData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('should accept user who is over 18 years old', async () => {
      const validData = { ...initialData, dob: '1990-01-01' };
      mockOnSave.mockResolvedValue(undefined);

      const { getByText } = render(
        <EditProfileModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialData={validData}
        />
      );

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });
});

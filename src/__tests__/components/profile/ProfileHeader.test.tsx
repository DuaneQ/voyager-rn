/**
 * Unit Tests for ProfileHeader Component
 * Testing all user interactions, display logic, and edge cases
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProfileHeader } from '../../../components/profile/ProfileHeader';

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ProfileHeader', () => {
  const mockOnEditPress = jest.fn();
  const mockOnPhotoPress = jest.fn();
  const mockOnPhotoDelete = jest.fn();
  
  const defaultProps = {
    displayName: 'John Doe',
    email: 'john@example.com',
    profileCompleteness: 75,
    onEditPress: mockOnEditPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render display name', () => {
      const { getByText } = render(<ProfileHeader {...defaultProps} />);
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should render email as fallback when no display name', () => {
      const { getByText } = render(
        <ProfileHeader {...defaultProps} displayName="" />
      );
      expect(getByText('john@example.com')).toBeTruthy();
    });

    it('should render bio when provided', () => {
      const { getByText } = render(
        <ProfileHeader {...defaultProps} bio="Love to travel!" />
      );
      expect(getByText('Love to travel!')).toBeTruthy();
    });

    it('should not render bio section when bio is empty', () => {
      const { queryByText } = render(<ProfileHeader {...defaultProps} />);
      expect(queryByText('Love to travel!')).toBeNull();
    });

    it('should render location when provided', () => {
      const { getByText } = render(
        <ProfileHeader {...defaultProps} location="San Francisco, CA" />
      );
      expect(getByText('San Francisco, CA')).toBeTruthy();
    });

    it('should not render location section when location is empty', () => {
      const { queryByText } = render(<ProfileHeader {...defaultProps} />);
      expect(queryByText('San Francisco, CA')).toBeNull();
    });

    it('should render profile photo when photoURL provided', () => {
      const { getByLabelText } = render(
        <ProfileHeader {...defaultProps} photoURL="https://example.com/photo.jpg" />
      );
      const photoImage = getByLabelText('Profile photo');
      expect(photoImage).toBeTruthy();
      expect(photoImage.props.source).toEqual({ uri: 'https://example.com/photo.jpg' });
    });

    it('should render default avatar when no photoURL', () => {
      const { getByLabelText } = render(<ProfileHeader {...defaultProps} />);
      const photoImage = getByLabelText('Profile photo');
      expect(photoImage).toBeTruthy();
      // Default image is required asset
      expect(photoImage.props.source).toBeDefined();
    });
  });

  describe('Profile Completeness Badge', () => {
    it('should show green badge for 80%+ completeness', () => {
      const { getByText } = render(
        <ProfileHeader {...defaultProps} profileCompleteness={85} />
      );
      expect(getByText('85% Complete')).toBeTruthy();
    });

    it('should show orange badge for 50-79% completeness', () => {
      const { getByText } = render(
        <ProfileHeader {...defaultProps} profileCompleteness={60} />
      );
      expect(getByText('60% Almost there')).toBeTruthy();
    });

    it('should show red badge for <50% completeness', () => {
      const { getByText } = render(
        <ProfileHeader {...defaultProps} profileCompleteness={30} />
      );
      expect(getByText('30% Incomplete')).toBeTruthy();
    });

    it('should show correct label for 0% completeness', () => {
      const { getByText } = render(
        <ProfileHeader {...defaultProps} profileCompleteness={0} />
      );
      expect(getByText('0% Incomplete')).toBeTruthy();
    });

    it('should show correct label for 100% completeness', () => {
      const { getByText } = render(
        <ProfileHeader {...defaultProps} profileCompleteness={100} />
      );
      expect(getByText('100% Complete')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should call onEditPress when edit button is pressed', () => {
      const { getByLabelText } = render(<ProfileHeader {...defaultProps} />);
      const editButton = getByLabelText('Edit profile');
      
      fireEvent.press(editButton);
      
      expect(mockOnEditPress).toHaveBeenCalledTimes(1);
    });

    it('should call onEditPress when edit photo button is pressed', () => {
      const { getByLabelText } = render(<ProfileHeader {...defaultProps} />);
      const editPhotoButton = getByLabelText('Edit profile photo');
      
      fireEvent.press(editPhotoButton);
      
      expect(mockOnEditPress).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple button presses', () => {
      const { getByLabelText } = render(<ProfileHeader {...defaultProps} />);
      const editButton = getByLabelText('Edit profile');
      
      fireEvent.press(editButton);
      fireEvent.press(editButton);
      fireEvent.press(editButton);
      
      expect(mockOnEditPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all interactive elements', () => {
      const { getByLabelText } = render(<ProfileHeader {...defaultProps} />);
      
      expect(getByLabelText('Profile photo')).toBeTruthy();
      expect(getByLabelText('Edit profile photo')).toBeTruthy();
      expect(getByLabelText('Edit profile')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long display names', () => {
      const longName = 'A'.repeat(100);
      const { getByText } = render(
        <ProfileHeader {...defaultProps} displayName={longName} />
      );
      expect(getByText(longName)).toBeTruthy();
    });

    it('should handle very long bio text', () => {
      const longBio = 'This is a very long bio. '.repeat(20);
      const { getByText } = render(
        <ProfileHeader {...defaultProps} bio={longBio} />
      );
      expect(getByText(longBio)).toBeTruthy();
    });

    it('should handle special characters in name', () => {
      const { getByText } = render(
        <ProfileHeader {...defaultProps} displayName="José María O'Brien-Smith" />
      );
      expect(getByText("José María O'Brien-Smith")).toBeTruthy();
    });

    it('should handle location with special characters', () => {
      const { getByText } = render(
        <ProfileHeader {...defaultProps} location="São Paulo, Brazil 🇧🇷" />
      );
      expect(getByText("São Paulo, Brazil 🇧🇷")).toBeTruthy();
    });
  });

  describe('Photo Menu Functionality', () => {
    it('should show menu when tapping photo with hasPhoto=true', () => {
      const { getByLabelText, getByText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={true}
        />
      );
      
      const photo = getByLabelText('Profile photo');
      fireEvent.press(photo);
      
      // Menu should be visible
      expect(getByText('View Photo')).toBeTruthy();
      expect(getByText('Delete Photo')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should not show menu when tapping photo with hasPhoto=false', () => {
      const { getByLabelText, queryByText } = render(
        <ProfileHeader 
          {...defaultProps} 
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={false}
        />
      );
      
      const photo = getByLabelText('Profile photo');
      fireEvent.press(photo);
      
      // Menu should NOT be visible when hasPhoto=false
      expect(queryByText('View Photo')).toBeNull();
      expect(queryByText('Delete Photo')).toBeNull();
      
      // Photo press should not trigger upload (use camera button instead)
      expect(mockOnPhotoPress).not.toHaveBeenCalled();
    });

    it('should close menu when tapping Cancel', () => {
      const { getByLabelText, getByText, queryByText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={true}
        />
      );
      
      // Open menu
      const photo = getByLabelText('Profile photo');
      fireEvent.press(photo);
      
      // Tap Cancel
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
      
      // Menu should be closed
      waitFor(() => {
        expect(queryByText('View Photo')).toBeNull();
      });
    });

    it('should show enlarged photo when tapping View Photo', () => {
      const { getByLabelText, getByText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={true}
        />
      );
      
      // Open menu
      const photo = getByLabelText('Profile photo');
      fireEvent.press(photo);
      
      // Tap View Photo
      const viewButton = getByText('View Photo');
      fireEvent.press(viewButton);
      
      // Close button should be visible in enlarged view
      waitFor(() => {
        expect(getByLabelText('Close')).toBeTruthy();
      });
    });

    it('should close enlarged photo when tapping close button', () => {
      const { getByLabelText, getByText, queryByLabelText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={true}
        />
      );
      
      // Open menu and view photo
      const photo = getByLabelText('Profile photo');
      fireEvent.press(photo);
      const viewButton = getByText('View Photo');
      fireEvent.press(viewButton);
      
      // Close enlarged view
      waitFor(() => {
        const closeButton = getByLabelText('Close');
        fireEvent.press(closeButton);
        
        // Close button should no longer be visible
        expect(queryByLabelText('Close')).toBeNull();
      });
    });

    it('should show confirmation dialog when tapping Delete Photo', () => {
      const { getByLabelText, getByText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={true}
        />
      );
      
      // Open menu
      const photo = getByLabelText('Profile photo');
      fireEvent.press(photo);
      
      // Tap Delete Photo
      const deleteButton = getByText('Delete Photo');
      fireEvent.press(deleteButton);
      
      // Confirmation dialog should appear
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Profile Photo',
        'Are you sure you want to delete your profile photo?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' })
        ])
      );
    });

    it('should call onPhotoDelete when confirming deletion', () => {
      const { getByLabelText, getByText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={true}
        />
      );
      
      // Open menu
      const photo = getByLabelText('Profile photo');
      fireEvent.press(photo);
      
      // Tap Delete Photo
      const deleteButton = getByText('Delete Photo');
      fireEvent.press(deleteButton);
      
      // Simulate confirming the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2].find((btn: any) => btn.text === 'Delete');
      confirmButton.onPress();
      
      expect(mockOnPhotoDelete).toHaveBeenCalledTimes(1);
    });

    it('should not call onPhotoDelete when canceling deletion', () => {
      const { getByLabelText, getByText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={true}
        />
      );
      
      // Open menu
      const photo = getByLabelText('Profile photo');
      fireEvent.press(photo);
      
      // Tap Delete Photo
      const deleteButton = getByText('Delete Photo');
      fireEvent.press(deleteButton);
      
      // Simulate canceling the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const cancelButton = alertCall[2].find((btn: any) => btn.text === 'Cancel');
      if (cancelButton.onPress) {
        cancelButton.onPress();
      }
      
      expect(mockOnPhotoDelete).not.toHaveBeenCalled();
    });

    it('should still trigger camera icon when menu is available', () => {
      const { getByLabelText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={true}
        />
      );
      
      // Camera icon should still work for direct upload
      const cameraButton = getByLabelText('Edit profile photo');
      fireEvent.press(cameraButton);
      
      expect(mockOnPhotoPress).toHaveBeenCalledTimes(1);
    });

    it('should handle missing onPhotoDelete callback gracefully', () => {
      const { getByLabelText, getByText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoPress={mockOnPhotoPress}
          hasPhoto={true}
        />
      );
      
      // Open menu
      const photo = getByLabelText('Profile photo');
      fireEvent.press(photo);
      
      // Tap Delete Photo
      const deleteButton = getByText('Delete Photo');
      fireEvent.press(deleteButton);
      
      // Confirm deletion
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2].find((btn: any) => btn.text === 'Delete');
      
      // Should not throw error
      expect(() => confirmButton.onPress()).not.toThrow();
    });

    it('should handle missing onPhotoPress callback gracefully', () => {
      const { getByLabelText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={false}
        />
      );
      
      // Tap photo without onPhotoPress
      const photo = getByLabelText('Profile photo');
      
      // Should not throw error
      expect(() => fireEvent.press(photo)).not.toThrow();
    });
  });

  describe('Photo Menu Edge Cases', () => {
    it('should handle rapid menu open/close', () => {
      const { getByLabelText, getByText, queryByText } = render(
        <ProfileHeader 
          {...defaultProps} 
          photoURL="https://example.com/photo.jpg"
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={true}
        />
      );
      
      const photo = getByLabelText('Profile photo');
      
      // Rapid open/close
      fireEvent.press(photo);
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
      
      waitFor(() => {
        fireEvent.press(photo);
        expect(getByText('View Photo')).toBeTruthy();
      });
    });

    it('should handle menu interactions with no photo URL', () => {
      const { getByLabelText } = render(
        <ProfileHeader 
          {...defaultProps} 
          onPhotoPress={mockOnPhotoPress}
          onPhotoDelete={mockOnPhotoDelete}
          hasPhoto={true}
        />
      );
      
      const photo = getByLabelText('Profile photo');
      fireEvent.press(photo);
      
      // Should still show menu even without photoURL
      expect(mockOnPhotoPress).not.toHaveBeenCalled();
    });
  });
});

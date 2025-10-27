/**
 * Unit Tests for ProfileHeader Component
 * Testing all user interactions, display logic, and edge cases
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileHeader } from '../../../components/profile/ProfileHeader';

describe('ProfileHeader', () => {
  const mockOnEditPress = jest.fn();
  
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
});

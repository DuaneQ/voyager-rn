/**
 * ProfileTab Component Tests
 * Tests for the Profile tab with stats, accordions, and sign out
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProfileTab } from '../../../components/profile/ProfileTab';
import { useUserProfile } from '../../../context/UserProfileContext';
import { useAuth } from '../../../context/AuthContext';

// Mock dependencies
jest.mock('../../../context/UserProfileContext');
jest.mock('../../../context/AuthContext');

describe('ProfileTab', () => {
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

  const mockSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useUserProfile as jest.Mock).mockReturnValue({
      userProfile: mockUserProfile,
    });
    (useAuth as jest.Mock).mockReturnValue({
      signOut: mockSignOut,
      user: { uid: 'test-user-id' },
      status: 'authenticated',
    });
  });

  describe('Rendering', () => {
    it('should render ProfileTab with all components', () => {
      const { getByTestId } = render(<ProfileTab />);
      
      expect(getByTestId('stat-connections')).toBeTruthy();
      expect(getByTestId('stat-trips')).toBeTruthy();
      expect(getByTestId('stat-rating')).toBeTruthy();
      expect(getByTestId('personal-info-accordion')).toBeTruthy();
      expect(getByTestId('lifestyle-accordion')).toBeTruthy();
      expect(getByTestId('travel-preferences-accordion')).toBeTruthy();
      expect(getByTestId('sign-out-button')).toBeTruthy();
    });

    it('should display placeholder stats values', () => {
      const { getByTestId, getByText } = render(<ProfileTab />);
      
      // Stats should show 0 values
      expect(getByTestId('stat-connections')).toBeTruthy();
      expect(getByText('Connections')).toBeTruthy();
      expect(getByText('Trips')).toBeTruthy();
      expect(getByText('(0 reviews)')).toBeTruthy();
    });

    it('should display accordion titles', () => {
      const { getByText } = render(<ProfileTab />);
      
      // Check accordion titles are rendered
      expect(getByText('Personal Info')).toBeTruthy();
      expect(getByText('Lifestyle')).toBeTruthy();
      expect(getByText('Travel Preferences')).toBeTruthy();
    });

    it('should handle missing user profile data', () => {
      (useUserProfile as jest.Mock).mockReturnValue({
        userProfile: { username: 'testuser' },
      });
      
      const { getByText } = render(<ProfileTab />);
      
      // Should still render without errors
      expect(getByText('Personal Info')).toBeTruthy();
    });
  });

  describe('Stats Interaction', () => {
    it('should show coming soon alert when connections is pressed', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const { getByTestId } = render(<ProfileTab />);
      
      fireEvent.press(getByTestId('stat-connections'));
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Coming Soon',
          'Connections feature is not yet implemented'
        );
      });
      
      mockAlert.mockRestore();
    });

    it('should show coming soon alert when trips is pressed', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const { getByTestId } = render(<ProfileTab />);
      
      fireEvent.press(getByTestId('stat-trips'));
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Coming Soon',
          'Trips feature is not yet implemented'
        );
      });
      
      mockAlert.mockRestore();
    });

    it('should show coming soon alert when rating is pressed', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const { getByTestId } = render(<ProfileTab />);
      
      fireEvent.press(getByTestId('stat-rating'));
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Coming Soon',
          'Ratings feature is not yet implemented'
        );
      });
      
      mockAlert.mockRestore();
    });
  });

  describe('Travel Preferences', () => {
    it('should show coming soon alert when edit preferences is pressed', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const { getByText, getByTestId } = render(<ProfileTab />);
      
      // First expand the Travel Preferences accordion
      fireEvent.press(getByText('Travel Preferences'));
      
      // Then press the edit button
      fireEvent.press(getByTestId('edit-preferences-button'));
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Coming Soon',
          'Travel preferences editing is not yet implemented'
        );
      });
      
      mockAlert.mockRestore();
    });
  });

  describe('Sign Out', () => {
    it('should show confirmation alert when sign out button is pressed', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const { getByTestId } = render(<ProfileTab />);
      
      fireEvent.press(getByTestId('sign-out-button'));
      
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
      const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(
        (title, message, buttons: any) => {
          // Simulate pressing "Sign Out" button
          if (buttons && buttons[1]) {
            buttons[1].onPress?.();
          }
        }
      );
      
      const { getByTestId } = render(<ProfileTab />);
      
      fireEvent.press(getByTestId('sign-out-button'));
      
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
      
      mockAlert.mockRestore();
    });

    it('should show error alert when sign out fails', async () => {
      mockSignOut.mockRejectedValue(new Error('Sign out failed'));
      console.error = jest.fn();
      
      const mockAlert = jest.spyOn(Alert, 'alert');
      // First call is confirmation, second call should be error
      mockAlert.mockImplementationOnce((title, message, buttons: any) => {
        // Simulate pressing "Sign Out" button
        if (buttons && buttons[1]) {
          buttons[1].onPress?.();
        }
      });
      
      const { getByTestId } = render(<ProfileTab />);
      
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
});

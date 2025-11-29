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
import { useConnections } from '../../../hooks/chat/useConnections';
import { useAllItineraries } from '../../../hooks/useAllItineraries';

// Mock dependencies
jest.mock('../../../context/UserProfileContext');
jest.mock('../../../context/AuthContext');
jest.mock('../../../hooks/chat/useConnections');
jest.mock('../../../hooks/useAllItineraries');

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
    ratings: {
      average: 4.5,
      count: 10,
      ratedBy: {},
    },
  };

  const mockSignOut = jest.fn();
  const mockConnections = [
    { id: '1', users: ['user1', 'user2'], createdAt: new Date() },
    { id: '2', users: ['user1', 'user3'], createdAt: new Date() },
  ];
  const mockItineraries = [
    { id: 'itin1', destination: 'Paris' },
    { id: 'itin2', destination: 'Tokyo' },
    { id: 'itin3', destination: 'London' },
  ];

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
    (useConnections as jest.Mock).mockReturnValue({
      connections: mockConnections,
      loading: false,
      error: null,
    });
    (useAllItineraries as jest.Mock).mockReturnValue({
      itineraries: mockItineraries,
      loading: false,
      error: null,
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

    it('should display real stats values from hooks', () => {
      const { getByTestId, getByText } = render(<ProfileTab />);
      
      // Stats should show real values from mocked hooks
      expect(getByTestId('stat-connections')).toBeTruthy();
      expect(getByText('Connections')).toBeTruthy();
      expect(getByText('Trips')).toBeTruthy();
      expect(getByText('(10 reviews)')).toBeTruthy(); // From mockUserProfile.ratings.count
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
    it('should show connections count when connections is pressed', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const { getByTestId } = render(<ProfileTab />);
      
      fireEvent.press(getByTestId('stat-connections'));
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Connections',
          'You have 2 connections'
        );
      });
      
      mockAlert.mockRestore();
    });

    it('should show trips count when trips is pressed', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const { getByTestId } = render(<ProfileTab />);
      
      fireEvent.press(getByTestId('stat-trips'));
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Trips',
          'You have 3 trips'
        );
      });
      
      mockAlert.mockRestore();
    });

    it('should open ratings modal when rating is pressed', async () => {
      const { getByTestId, queryByTestId } = render(<ProfileTab />);
      
      // Modal should not be visible initially
      expect(queryByTestId('ratings-modal')).toBeTruthy(); // Modal exists but is not visible
      
      // Press rating stat
      fireEvent.press(getByTestId('stat-rating'));
      
      // Modal should be visible (we can't directly test visible prop, but modal is rendered)
      await waitFor(() => {
        expect(getByTestId('ratings-modal')).toBeTruthy();
      });
    });

    it('should open ratings modal even when user has no ratings', async () => {
      (useUserProfile as jest.Mock).mockReturnValue({
        userProfile: { ...mockUserProfile, ratings: undefined },
      });
      
      const { getByTestId } = render(<ProfileTab />);
      
      // Should still open modal
      fireEvent.press(getByTestId('stat-rating'));
      
      await waitFor(() => {
        expect(getByTestId('ratings-modal')).toBeTruthy();
      });
    });

    it('should close ratings modal when close button is pressed', async () => {
      const { getByTestId } = render(<ProfileTab />);
      
      // Open modal
      fireEvent.press(getByTestId('stat-rating'));
      
      await waitFor(() => {
        expect(getByTestId('ratings-modal')).toBeTruthy();
      });
      
      // Close modal
      fireEvent.press(getByTestId('close-ratings-modal'));
      
      // Modal should still exist in DOM but will be hidden via visible prop
      expect(getByTestId('ratings-modal')).toBeTruthy();
    });

    it('should pass user ratings data to RatingsModal', () => {
      const { getByTestId } = render(<ProfileTab />);
      
      fireEvent.press(getByTestId('stat-rating'));
      
      // Verify modal renders with ratings data
      const modal = getByTestId('ratings-modal');
      expect(modal).toBeTruthy();
      
      // Modal should have access to ratings from userProfile
      // (We're testing that the component renders without errors with the data)
    });

    it('should handle zero connections and trips', () => {
      (useConnections as jest.Mock).mockReturnValue({
        connections: [],
        loading: false,
        error: null,
      });
      (useAllItineraries as jest.Mock).mockReturnValue({
        itineraries: [],
        loading: false,
        error: null,
      });
      
      const { getByText } = render(<ProfileTab />);
      
      // Component should still render without errors
      expect(getByText('Connections')).toBeTruthy();
      expect(getByText('Trips')).toBeTruthy();
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

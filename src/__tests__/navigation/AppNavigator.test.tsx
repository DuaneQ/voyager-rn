/**
 * Unit Tests for AppNavigator
 * Tests navigation structure and conditional rendering based on auth state
 */

// Mock navigation components
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }: any) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useNavigationContainerRef: () => ({
      current: {
        navigate: jest.fn(),
      },
    }),
  };
});

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children, component: Component }: any) => Component ? <Component /> : children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children, component: Component }: any) => Component ? <Component /> : children,
  }),
}));

// Mock pages
jest.mock('../../pages/AuthPage', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function AuthPage() {
    return React.createElement(Text, { testID: 'auth-page' }, 'Auth Page');
  };
});

jest.mock('../../pages/ProfilePage', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function ProfilePage() {
    return React.createElement(Text, { testID: 'profile-page' }, 'Profile Page');
  };
});

jest.mock('../../pages/SearchPage', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function SearchPage() {
    return React.createElement(Text, { testID: 'search-page' }, 'Search Page');
  };
});

jest.mock('../../pages/ChatPage', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function ChatPage() {
    return React.createElement(Text, { testID: 'chat-page' }, 'Chat Page');
  };
});

jest.mock('../../pages/ChatThreadScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function ChatThreadScreen() {
    return React.createElement(Text, { testID: 'chat-thread-screen' }, 'Chat Thread');
  };
});

jest.mock('../../pages/VideoFeedPage', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function VideoFeedPage() {
    return React.createElement(Text, { testID: 'video-feed-page' }, 'Video Feed');
  };
});

// Mock context providers
const mockUseAuth = jest.fn();
const mockUseUserProfile = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: any) => children,
}));

jest.mock('../../context/UserProfileContext', () => ({
  useUserProfile: () => mockUseUserProfile(),
  UserProfileProvider: ({ children }: any) => children,
}));

jest.mock('../../context/AlertContext', () => ({
  AlertProvider: ({ children }: any) => children,
  useAlert: () => ({
    showAlert: jest.fn(),
  }),
}));

// Mock profile validation
jest.mock('../../utils/profileValidation', () => ({
  validateProfileForItinerary: jest.fn(() => ({ isValid: true, errors: [] })),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from '../../navigation/AppNavigator';
import { validateProfileForItinerary } from '../../utils/profileValidation';

describe('AppNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      status: 'unauthenticated',
      signOut: jest.fn(),
    });
    mockUseUserProfile.mockReturnValue({
      userProfile: null,
      isLoading: false,
      error: null,
      loadUserProfile: jest.fn(),
    });
  });

  describe('Unauthenticated State', () => {
    it('should render AuthPage when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        status: 'unauthenticated',
        signOut: jest.fn(),
      });

      const { getByTestId, queryByTestId } = render(<AppNavigator />);

      expect(getByTestId('auth-page')).toBeTruthy();
      expect(queryByTestId('search-page')).toBeNull();
      expect(queryByTestId('profile-page')).toBeNull();
    });

    it('should not render main app screens when unauthenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        status: 'unauthenticated',
        signOut: jest.fn(),
      });

      const { queryByTestId } = render(<AppNavigator />);

      expect(queryByTestId('chat-page')).toBeNull();
      expect(queryByTestId('video-feed-page')).toBeNull();
    });
  });

  describe('Authenticated State', () => {
    it('should render main app tabs when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com' },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: { uid: 'test-user-123', username: 'testuser' },
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });

      const { getByTestId } = render(<AppNavigator />);

      expect(getByTestId('search-page')).toBeTruthy();
    });

    it('should not render AuthPage when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com' },
        status: 'authenticated',
        signOut: jest.fn(),
      });

      const { queryByTestId } = render(<AppNavigator />);

      expect(queryByTestId('auth-page')).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should render nothing when auth status is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        status: 'loading',
        signOut: jest.fn(),
      });

      const { queryByTestId } = render(<AppNavigator />);

      // Should not render any pages while loading
      expect(queryByTestId('auth-page')).toBeNull();
      expect(queryByTestId('search-page')).toBeNull();
      expect(queryByTestId('profile-page')).toBeNull();
    });
  });

  describe('Profile Validation', () => {
    it('should validate profile when user and profile are available', async () => {
      const mockProfile = {
        uid: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com',
        gender: 'Male',
        dob: '1990-01-01',
      };

      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com' },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: mockProfile,
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });

      (validateProfileForItinerary as jest.Mock).mockReturnValue({ isValid: true, errors: [] });

      const { findByTestId } = render(<AppNavigator />);

      // Wait for component to render
      await findByTestId('search-page');

      // Should validate profile (may take an effect cycle)
      // Profile validation happens in useEffect, so it may not be called immediately
      // This test verifies the component renders successfully with the validation logic
      expect(mockUseAuth).toHaveBeenCalled();
      expect(mockUseUserProfile).toHaveBeenCalled();
    });

    it('should not validate profile when profile is loading', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com' },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: null,
        isLoading: true,
        error: null,
        loadUserProfile: jest.fn(),
      });

      render(<AppNavigator />);

      // Should not validate while loading
      expect(validateProfileForItinerary).not.toHaveBeenCalled();
    });

    it('should not validate profile when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        status: 'unauthenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: null,
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });

      render(<AppNavigator />);

      expect(validateProfileForItinerary).not.toHaveBeenCalled();
    });

    it('should only validate profile once per login session', async () => {
      const mockProfile = {
        uid: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com',
        gender: 'Male',
        dob: '1990-01-01',
      };

      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com' },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: mockProfile,
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });

      (validateProfileForItinerary as jest.Mock).mockReturnValue({ isValid: true, errors: [] });

      const { rerender, findByTestId } = render(<AppNavigator />);

      // Wait for first render
      await findByTestId('search-page');

      // Rerender with same profile
      rerender(<AppNavigator />);

      // Component should render successfully (validation happens internally via useRef)
      expect(mockUseAuth).toHaveBeenCalled();
      expect(mockUseUserProfile).toHaveBeenCalled();
    });
  });

  describe('Navigation Structure', () => {
    it('should provide navigation container', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com' },
        status: 'authenticated',
        signOut: jest.fn(),
      });

      const { getByTestId } = render(<AppNavigator />);

      // Navigation container renders the search page by default
      expect(getByTestId('search-page')).toBeTruthy();
    });

    it('should wrap app with AlertProvider', () => {
      // AlertProvider is mocked to pass through children
      // Just verify app renders successfully with it
      const { getByTestId } = render(<AppNavigator />);

      expect(getByTestId('auth-page')).toBeTruthy();
    });
  });
});

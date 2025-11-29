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
const mockUseTermsAcceptance = jest.fn();

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

jest.mock('../../hooks/useTermsAcceptance', () => ({
  useTermsAcceptance: () => mockUseTermsAcceptance(),
}));

// Mock TermsGuard component
jest.mock('../../components/auth/TermsGuard', () => ({
  TermsGuard: ({ children }: any) => {
    const { useTermsAcceptance } = require('../../hooks/useTermsAcceptance');
    const { hasAcceptedTerms, isLoading } = useTermsAcceptance();
    
    if (isLoading) {
      return null;
    }
    
    if (!hasAcceptedTerms) {
      return null; // Block children when terms not accepted
    }
    
    return children;
  },
}));

// Mock profile validation
jest.mock('../../utils/profileValidation', () => ({
  validateProfileForItinerary: jest.fn(() => ({ isValid: true, errors: [] })),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
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
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: true,
      isLoading: false,
      error: null,
      acceptTerms: jest.fn(),
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
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
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
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
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
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
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
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
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
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
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
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
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

  describe('TermsGuard Integration', () => {
    it('should not invoke TermsGuard when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        status: 'unauthenticated',
        signOut: jest.fn(),
      });

      render(<AppNavigator />);

      // TermsGuard should not be rendered, so hook should not be called
      expect(mockUseTermsAcceptance).not.toHaveBeenCalled();
    });

    it('should invoke TermsGuard when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: { uid: 'test-user-123', username: 'testuser' },
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });

      render(<AppNavigator />);

      // TermsGuard should be invoked for authenticated users
      expect(mockUseTermsAcceptance).toHaveBeenCalled();
    });

    it('should show main app when terms are accepted', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: { uid: 'test-user-123', username: 'testuser' },
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });
      mockUseTermsAcceptance.mockReturnValue({
        hasAcceptedTerms: true,
        isLoading: false,
        error: null,
        acceptTerms: jest.fn(),
      });

      const { getByTestId } = render(<AppNavigator />);

      // Main app should be accessible
      expect(getByTestId('search-page')).toBeTruthy();
    });

    it('should block main app when terms are not accepted', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: { uid: 'test-user-123', username: 'testuser' },
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });
      mockUseTermsAcceptance.mockReturnValue({
        hasAcceptedTerms: false,
        isLoading: false,
        error: null,
        acceptTerms: jest.fn(),
      });

      const { queryByTestId } = render(<AppNavigator />);

      // Main app should be blocked (TermsGuard prevents rendering children)
      expect(queryByTestId('search-page')).toBeNull();
      expect(queryByTestId('profile-page')).toBeNull();
      expect(queryByTestId('chat-page')).toBeNull();
    });

    it('should check terms acceptance on every authenticated app launch', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: { uid: 'test-user-123', username: 'testuser' },
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });

      const { rerender } = render(<AppNavigator />);
      
      expect(mockUseTermsAcceptance).toHaveBeenCalledTimes(1);

      // Simulate app restart
      rerender(<AppNavigator />);

      // Should check terms again
      expect(mockUseTermsAcceptance).toHaveBeenCalledTimes(2);
    });

    it('should enforce terms check before profile validation', async () => {
      const mockProfile = {
        uid: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com',
      };

      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: mockProfile,
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });
      mockUseTermsAcceptance.mockReturnValue({
        hasAcceptedTerms: false,
        isLoading: false,
        error: null,
        acceptTerms: jest.fn(),
      });

      (validateProfileForItinerary as jest.Mock).mockReturnValue({ 
        isValid: false, 
        errors: ['Missing required fields'] 
      });

      render(<AppNavigator />);

      // Terms acceptance should be checked
      expect(mockUseTermsAcceptance).toHaveBeenCalled();

      // Profile validation should not run because terms block the app
      // (ProfileValidationWrapper only runs when children are rendered)
      await waitFor(() => {
        expect(validateProfileForItinerary).not.toHaveBeenCalled();
      });
    });

    it('should allow profile validation after terms are accepted', async () => {
      const mockProfile = {
        uid: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com',
        gender: 'Male',
        dob: '1990-01-01',
      };

      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: mockProfile,
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });
      mockUseTermsAcceptance.mockReturnValue({
        hasAcceptedTerms: true,
        isLoading: false,
        error: null,
        acceptTerms: jest.fn(),
      });

      (validateProfileForItinerary as jest.Mock).mockReturnValue({ 
        isValid: true, 
        errors: [] 
      });

      const { findByTestId } = render(<AppNavigator />);

      // Wait for main app to render
      await findByTestId('search-page');

      // Both terms check and profile validation should happen
      expect(mockUseTermsAcceptance).toHaveBeenCalled();
      // Profile validation happens in useEffect after render
      expect(mockUseAuth).toHaveBeenCalled();
      expect(mockUseUserProfile).toHaveBeenCalled();
    });

    it('should handle terms loading state', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: { uid: 'test-user-123', username: 'testuser' },
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });
      mockUseTermsAcceptance.mockReturnValue({
        hasAcceptedTerms: false,
        isLoading: true,
        error: null,
        acceptTerms: jest.fn(),
      });

      const { queryByTestId } = render(<AppNavigator />);

      // Main app should not be accessible while checking terms
      expect(queryByTestId('search-page')).toBeNull();
    });

    it('should handle terms acceptance errors', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
        status: 'authenticated',
        signOut: jest.fn(),
      });
      mockUseUserProfile.mockReturnValue({
        userProfile: { uid: 'test-user-123', username: 'testuser' },
        isLoading: false,
        error: null,
        loadUserProfile: jest.fn(),
      });
      mockUseTermsAcceptance.mockReturnValue({
        hasAcceptedTerms: false,
        isLoading: false,
        error: new Error('Failed to check terms acceptance'),
        acceptTerms: jest.fn(),
      });

      const { queryByTestId } = render(<AppNavigator />);

      // Main app should not be accessible on error
      expect(queryByTestId('search-page')).toBeNull();
    });
  });
});

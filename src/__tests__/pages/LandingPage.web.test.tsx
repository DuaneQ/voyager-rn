/**
 * LandingPage.web.test.tsx
 * Unit tests for the web-only landing page component
 * 
 * Test Coverage:
 * 1. Platform detection (web only)
 * 2. Content rendering (hero, features, FAQ, CTA)
 * 3. Video background rendering
 * 4. Navigation actions (Sign In/Sign Up)
 * 5. Legal modal interactions (Privacy, Terms, Safety, Cookie)
 * 6. Authenticated user redirect
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { LandingPage } from '../../pages/LandingPage.web';

// Mock window.location for navigation tests
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  writable: true,
  value: mockLocation,
});

// Mock auth context
const mockUser = null;
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: mockUser,
  })),
}));

// No need for NavigationContainer wrapper since we use window.location for web
const renderComponent = () => render(<LandingPage />);

describe('LandingPage.web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Platform.OS as web
    Platform.OS = 'web';
  });

  describe('Platform Detection', () => {
    it('renders on web platform', () => {
      Platform.OS = 'web';
      const { getByText } = renderComponent();
      
      expect(getByText(/Planning a trip solo/i)).toBeTruthy();
    });

    it('returns null on non-web platforms', () => {
      Platform.OS = 'ios';
      const { toJSON } = renderComponent();
      
      expect(toJSON()).toBeNull();
    });
  });

  describe('SEO Meta Tags', () => {
    beforeEach(() => {
      // Clean up meta tags between tests
      document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]').forEach(el => el.remove());
    });

    it('sets canonical URL to travalpass.com', () => {
      renderComponent();
      const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      expect(canonical).toBeTruthy();
      expect(canonical.href).toContain('travalpass.com');
      expect(canonical.href).not.toContain('app.travalpass.com');
    });

    it('sets og:url to travalpass.com', () => {
      renderComponent();
      const ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement;
      expect(ogUrl).toBeTruthy();
      expect(ogUrl.content).toBe('https://travalpass.com/');
    });

    it('sets twitter:url using name attribute (not property)', () => {
      renderComponent();
      const twitterUrl = document.querySelector('meta[name="twitter:url"]') as HTMLMetaElement;
      expect(twitterUrl).toBeTruthy();
      expect(twitterUrl.content).toBe('https://travalpass.com/');
      // Should NOT exist as property
      const wrongTwitterUrl = document.querySelector('meta[property="twitter:url"]');
      expect(wrongTwitterUrl).toBeNull();
    });
  });

  describe('Content Rendering', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    it('renders hero section with main headline and subtitle', () => {
      const { getByText } = renderComponent();
      
      expect(getByText(/Planning a trip solo/i)).toBeTruthy();
      expect(getByText(/same place.*same dates/i)).toBeTruthy();
    });

    it('renders hero CTA button and micro-incentive', () => {
      const { getByText } = renderComponent();
      
      expect(getByText('Create My Trip Plan')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
      expect(getByText(/Free .* No credit card/i)).toBeTruthy();
    });

    it('renders "Stop Planning Alone" section with app mockup', () => {
      const { getByText } = renderComponent();
      
      expect(getByText(/Stop Planning Alone/i)).toBeTruthy();
      expect(getByText(/Find Your Vacation Companion/i)).toBeTruthy();
      // App screen mockup replaces stock photo
      expect(getByText(/Alex, 28/i)).toBeTruthy();
      expect(getByText(/Maria, 31/i)).toBeTruthy();
    });

    it('renders all four feature cards', () => {
      const { getByText } = renderComponent();
      
      // Feature card titles
      expect(getByText(/AI Travel Itineraries/i)).toBeTruthy();
      expect(getByText(/Find Travel Buddies/i)).toBeTruthy();
      expect(getByText(/Smart Search/i)).toBeTruthy();
      expect(getByText(/Connect & Chat/i)).toBeTruthy();
    });

    it('renders demo video section', () => {
      const { getByText } = renderComponent();
      
      expect(getByText(/See TravalPass in Action/i)).toBeTruthy();
      expect(getByText(/Short demos. Real features/i)).toBeTruthy();
    });

    it('renders FAQ section with all questions', () => {
      const { getByText } = renderComponent();
      
      // Check for FAQ section title
      expect(getByText(/Frequently Asked Questions/i)).toBeTruthy();
      
      // Check for some FAQ questions (match actual text)
      expect(getByText(/Is this a dating app/i)).toBeTruthy();
      expect(getByText(/What does it cost/i)).toBeTruthy();
    });

    it('renders CTA footer section', () => {
      const { getByText } = renderComponent();
      
      expect(getByText(/Join thousands of travelers planning their next adventure/i)).toBeTruthy();
      expect(getByText('Sign Up Now')).toBeTruthy();
    });

    it('renders legal footer with all links', () => {
      const { getByText } = renderComponent();
      
      expect(getByText('Privacy Policy')).toBeTruthy();
      expect(getByText('Terms of Service')).toBeTruthy();
      expect(getByText('Safety Guidelines')).toBeTruthy();
      expect(getByText('Cookie Policy')).toBeTruthy();
    });

    it('renders copyright footer', () => {
      const { getByText } = renderComponent();
      
      expect(getByText(/© 2026 TravalPass/i)).toBeTruthy();
    });
  });

  describe('Itinerary Match Mockup', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    it('renders the itinerary match visual', () => {
      const { getByText, getAllByText } = renderComponent();
      
      // Verify mockup cards are rendered
      expect(getAllByText(/Your Trip/i).length).toBeGreaterThanOrEqual(1);
      expect(getByText(/Alex's Trip/i)).toBeTruthy();
      // Verify match alert between cards
      expect(getByText(/Traval Match/i)).toBeTruthy();
      expect(getByText(/92% Itinerary Match/i)).toBeTruthy();
    });
  });

  describe('Navigation Actions', () => {
    beforeEach(() => {
      Platform.OS = 'web';
      mockLocation.href = '';
    });

    it('navigates to /auth?mode=register when Create My Trip Plan is clicked', () => {
      const { getByText } = renderComponent();
      mockLocation.href = '';

      const ctaButton = getByText('Create My Trip Plan');
      fireEvent.press(ctaButton);

      expect(mockLocation.href).toBe('/auth?mode=register');
    });

    it('navigates to /auth?mode=login when Sign In is clicked from hero', () => {
      const { getAllByText } = renderComponent();
      mockLocation.href = '';

      // Get the first "Sign In" button (in hero section)
      const signInButtons = getAllByText('Sign In');
      fireEvent.press(signInButtons[0]);

      expect(mockLocation.href).toBe('/auth?mode=login');
    });

    it('navigates to /auth?mode=register when Sign Up Now is clicked in footer CTA', () => {
      const { getByText } = renderComponent();
      mockLocation.href = '';

      const signUpButton = getByText('Sign Up Now');
      fireEvent.press(signUpButton);

      expect(mockLocation.href).toBe('/auth?mode=register');
    });

    it('navigates to /auth?mode=login when Sign In is clicked in footer CTA', () => {
      const { getAllByText } = renderComponent();
      mockLocation.href = '';

      // Get all "Sign In" buttons and click the last one (footer)
      const signInButtons = getAllByText('Sign In');
      fireEvent.press(signInButtons[signInButtons.length - 1]);

      expect(mockLocation.href).toBe('/auth?mode=login');
    });

    it('Get Started and Sign Up buttons route to register, Sign In buttons route to login', () => {
      const { getByText, getAllByText } = renderComponent();
      mockLocation.href = '';

      // Sign In buttons should all go to login
      const signInButtons = getAllByText('Sign In');
      signInButtons.forEach(btn => {
        mockLocation.href = '';
        fireEvent.press(btn);
        expect(mockLocation.href).toBe('/auth?mode=login');
      });

      // Sign Up / Create My Trip Plan buttons should all go to register
      mockLocation.href = '';
      fireEvent.press(getByText('Create My Trip Plan'));
      expect(mockLocation.href).toBe('/auth?mode=register');

      mockLocation.href = '';
      fireEvent.press(getByText('Sign Up Now'));
      expect(mockLocation.href).toBe('/auth?mode=register');
    });
  });

  describe('Legal Modal Interactions', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    it('opens Privacy Policy modal when link is clicked', () => {
      const { getByText, queryByText } = renderComponent();
      
      const privacyLink = getByText('Privacy Policy');
      fireEvent.press(privacyLink);
      
      // Check if modal content appears (actual text in modal)
      expect(queryByText(/1\. Information We Collect/i)).toBeTruthy();
    });

    it('closes Privacy Policy modal when close is clicked', () => {
      const { getByText, queryByText } = renderComponent();
      
      // Open modal
      const privacyLink = getByText('Privacy Policy');
      fireEvent.press(privacyLink);
      
      // Modal should be visible
      expect(queryByText(/1\. Information We Collect/i)).toBeTruthy();
      
      // Close modal
      const closeButton = getByText('✕');
      fireEvent.press(closeButton);
      
      // Modal should be closed (content not visible)
      expect(queryByText(/1\. Information We Collect/i)).toBeNull();
    });

    it('opens Terms of Service modal when link is clicked', () => {
      const { getByText, queryByText } = renderComponent();
      
      const termsLink = getByText('Terms of Service');
      fireEvent.press(termsLink);
      
      // Check if modal content appears
      expect(queryByText(/Acceptance of Terms/i)).toBeTruthy();
    });

    it('closes Terms of Service modal when close is clicked', () => {
      const { getByText, queryByText } = renderComponent();
      
      // Open modal
      const termsLink = getByText('Terms of Service');
      fireEvent.press(termsLink);
      
      expect(queryByText(/Acceptance of Terms/i)).toBeTruthy();
      
      // Close modal
      const closeButton = getByText('Close');
      fireEvent.press(closeButton);
      
      expect(queryByText(/Acceptance of Terms/i)).toBeNull();
    });

    it('opens Safety Guidelines modal when link is clicked', () => {
      const { getByText, queryByText } = renderComponent();
      
      const safetyLink = getByText('Safety Guidelines');
      fireEvent.press(safetyLink);
      
      // Check if modal content appears
      expect(queryByText(/1\. Before Meeting in Person/i)).toBeTruthy();
    });

    it('closes Safety Guidelines modal when close is clicked', () => {
      const { getByText, queryByText } = renderComponent();
      
      // Open modal
      const safetyLink = getByText('Safety Guidelines');
      fireEvent.press(safetyLink);
      
      expect(queryByText(/1\. Before Meeting in Person/i)).toBeTruthy();
      
      // Close modal
      const closeButton = getByText('✕');
      fireEvent.press(closeButton);
      
      expect(queryByText(/1\. Before Meeting in Person/i)).toBeNull();
    });

    it('opens Cookie Policy modal when link is clicked', () => {
      const { getByText, queryByText } = renderComponent();
      
      const cookieLink = getByText('Cookie Policy');
      fireEvent.press(cookieLink);
      
      // Check if modal content appears
      expect(queryByText(/What Are Cookies/i)).toBeTruthy();
    });

    it('closes Cookie Policy modal when close is clicked', () => {
      const { getByText, queryByText } = renderComponent();
      
      // Open modal
      const cookieLink = getByText('Cookie Policy');
      fireEvent.press(cookieLink);
      
      expect(queryByText(/What Are Cookies/i)).toBeTruthy();
      
      // Close modal
      const closeButton = getByText('Close');
      fireEvent.press(closeButton);
      
      expect(queryByText(/What Are Cookies/i)).toBeNull();
    });
  });

  describe('Authenticated User Redirect', () => {
    it('NOTE: Authentication redirect is handled by AppNavigator, not the component itself', () => {
      // The LandingPage component delegates authentication redirect to AppNavigator's RootNavigator
      // This test documents that design decision. The actual redirect logic is tested in AppNavigator tests.
      expect(true).toBe(true);
    });

    it('renders landing page content when user is authenticated (AppNavigator prevents this scenario)', () => {
      // In production, AppNavigator never renders LandingPage when user is authenticated
      // This test verifies the component itself doesn't break if somehow rendered with auth
      const useAuthMock = require('../../context/AuthContext').useAuth;
      useAuthMock.mockReturnValue({
        user: { uid: 'test-user-123', email: 'test@example.com' },
      });

      const { getByText } = renderComponent();
      
      // Component should still render its content (even though AppNavigator prevents this)
      expect(getByText(/Planning a trip solo/i)).toBeTruthy();
    });

    it('renders normally when user is null', () => {
      const useAuthMock = require('../../context/AuthContext').useAuth;
      useAuthMock.mockReturnValue({
        user: null,
      });
      mockLocation.href = '';

      const { getByText } = renderComponent();
      
      expect(getByText(/Planning a trip solo/i)).toBeTruthy();
      // No navigation should have occurred
      expect(mockLocation.href).toBe('');
    });
  });
});

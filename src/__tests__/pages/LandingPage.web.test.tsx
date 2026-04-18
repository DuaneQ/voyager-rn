/**
 * LandingPage.web.test.tsx
 * Unit tests for the CRO-optimized web landing page
 *
 * Uses @testing-library/react (DOM) since this is a web-only component
 * that renders raw HTML elements, not React Native components.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Must mock Platform before importing the component
jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: jest.fn((obj: any) => obj.web ?? obj.default) },
  StyleSheet: { create: (s: any) => s },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  Modal: ({ children, visible }: any) => visible ? children : null,
  View: 'div',
  Text: 'span',
  TouchableOpacity: ({ children, onPress, ...props }: any) => {
    const React = require('react');
    return React.createElement('button', { onClick: onPress, ...props }, children);
  },
  ScrollView: ({ children }: any) => children,
  Pressable: ({ children, onPress, ...props }: any) => {
    const React = require('react');
    return React.createElement('button', { onClick: onPress, ...props }, children);
  },
}));

// Prevent portal rendering — render inline in tests
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// Mock auth context
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: null })),
}));

// Mock analytics
jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ logEvent: jest.fn() }),
}));

// Stub video element methods not available in jsdom
Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
  set: jest.fn(),
  get: jest.fn(() => true),
  configurable: true,
});
HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
HTMLMediaElement.prototype.pause = jest.fn();

import { LandingPage } from '../../pages/LandingPage.web';

// Mock window.location
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  writable: true,
  value: mockLocation,
});

const renderComponent = () => render(<LandingPage />);

describe('LandingPage.web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = '';
  });

  describe('Platform Detection', () => {
    it('renders on web platform', () => {
      const { container } = renderComponent();
      expect(container.querySelector('.lp-root')).toBeInTheDocument();
    });
  });

  describe('SEO Meta Tags', () => {
    beforeEach(() => {
      document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]').forEach(el => el.remove());
    });

    it('sets canonical URL to travalpass.com', () => {
      renderComponent();
      const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      expect(canonical).toBeTruthy();
      expect(canonical.href).toContain('travalpass.com');
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
      expect(document.querySelector('meta[property="twitter:url"]')).toBeNull();
    });
  });

  describe('Content Rendering', () => {
    it('renders hero headline', () => {
      renderComponent();
      const matches = screen.getAllByText(/Find your travel companion/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('renders hero accent text', () => {
      renderComponent();
      expect(screen.getByText(/same destination, same dates/i)).toBeInTheDocument();
    });

    it('renders green eyebrow pill', () => {
      renderComponent();
      const matches = screen.getAllByText(/Free forever/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('renders hero CTA', () => {
      renderComponent();
      const buttons = screen.getAllByText(/Match My Trip/i);
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders avatar cluster social proof', () => {
      renderComponent();
      expect(screen.getByText(/Sara, Marco, Kenji/i)).toBeInTheDocument();
    });

    it('renders 3-step value prop', () => {
      renderComponent();
      expect(screen.getByText(/Enter your destination/i)).toBeInTheDocument();
      expect(screen.getByText(/See travelers with matching/i)).toBeInTheDocument();
      expect(screen.getByText(/Chat, plan, and travel/i)).toBeInTheDocument();
    });

    it('renders proof ticker', () => {
      renderComponent();
      const matches = screen.getAllByText(/80\+ Travellers Matched/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('renders active traveler cards', () => {
      renderComponent();
      const matches = screen.getAllByText(/Travelers looking for companions/i);
      expect(matches.length).toBeGreaterThan(0);
      const saraMatches = screen.getAllByText('Sara K.');
      expect(saraMatches.length).toBeGreaterThan(0);
      const marcoMatches = screen.getAllByText('Marco L.');
      expect(marcoMatches.length).toBeGreaterThan(0);
    });

    it('renders testimonial section', () => {
      renderComponent();
      expect(screen.getByText(/What travelers say/i)).toBeInTheDocument();
    });

    it('renders How It Works section', () => {
      renderComponent();
      expect(screen.getByText(/Match in minutes/i)).toBeInTheDocument();
      expect(screen.getByText('Enter your trip')).toBeInTheDocument();
      expect(screen.getByText('See your matches')).toBeInTheDocument();
      expect(screen.getByText('Chat and plan')).toBeInTheDocument();
    });

    it('renders FAQ section', () => {
      renderComponent();
      expect(screen.getByText(/Everything you need to know/i)).toBeInTheDocument();
      expect(screen.getByText('Is it really free?')).toBeInTheDocument();
    });

    it('renders CTA block', () => {
      renderComponent();
      expect(screen.getByText(/Ready to find your travel companion/i)).toBeInTheDocument();
    });

    it('renders footer with legal links', () => {
      renderComponent();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Safety Guidelines')).toBeInTheDocument();
      expect(screen.getByText('Cookie Policy')).toBeInTheDocument();
    });

    it('renders promo video', () => {
      renderComponent();
      expect(screen.getByLabelText(/TravalPass matching demo video/i)).toBeInTheDocument();
    });

    it('renders nav bar with Sign in', () => {
      renderComponent();
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });
  });

  describe('Navigation Actions', () => {
    it('navigates to register when hero CTA is clicked', () => {
      renderComponent();
      const buttons = screen.getAllByText(/Match My Trip/i);
      fireEvent.click(buttons[0]);
      expect(mockLocation.href).toBe('/auth?mode=register');
    });

    it('navigates to login when Sign in is clicked', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Sign in'));
      expect(mockLocation.href).toBe('/auth?mode=login');
    });

    it('navigates to register when See all is clicked', () => {
      renderComponent();
      fireEvent.click(screen.getByText('See all →'));
      expect(mockLocation.href).toBe('/auth?mode=register');
    });
  });

  describe('Legal Modal Interactions', () => {
    it('opens Privacy Policy modal', () => {
      renderComponent();
      const links = screen.getAllByText('Privacy Policy');
      fireEvent.click(links[0]);
      const matches = screen.getAllByText(/Information We Collect/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('opens Terms of Service modal', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Terms of Service'));
      expect(screen.getByText(/Acceptance of Terms/i)).toBeInTheDocument();
    });

    it('opens Safety Guidelines modal', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Safety Guidelines'));
      expect(screen.getByText(/Before Meeting in Person/i)).toBeInTheDocument();
    });

    it('opens Cookie Policy modal', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Cookie Policy'));
      expect(screen.getByText(/What Are Cookies/i)).toBeInTheDocument();
    });
  });

  describe('Authenticated User Handling', () => {
    it('still renders when user is authenticated', () => {
      const useAuthMock = require('../../context/AuthContext').useAuth;
      useAuthMock.mockReturnValue({ user: { uid: 'test-123', email: 'test@example.com' } });
      const { container } = renderComponent();
      expect(container.querySelector('.lp-root')).toBeInTheDocument();
    });

    it('renders normally when user is null', () => {
      const useAuthMock = require('../../context/AuthContext').useAuth;
      useAuthMock.mockReturnValue({ user: null });
      const { container } = renderComponent();
      expect(container.querySelector('.lp-root')).toBeInTheDocument();
      expect(mockLocation.href).toBe('');
    });
  });
});

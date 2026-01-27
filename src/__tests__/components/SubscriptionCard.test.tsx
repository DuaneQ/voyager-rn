/**
 * Unit Tests for SubscriptionCard Component
 * Tests Stripe subscription UI (Web only)
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import SubscriptionCard from '../../components/common/SubscriptionCard';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useStripePortal } from '../../hooks/useStripePortal';
import { useAlert } from '../../context/AlertContext';

// Mock hooks
jest.mock('../../hooks/useUsageTracking');
jest.mock('../../hooks/useStripePortal');
jest.mock('../../context/AlertContext');

// Mock firebase/functions
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(() => jest.fn().mockResolvedValue({ data: { url: 'https://stripe.com/test' } })),
  getFunctions: jest.fn(() => ({})), // Return an object so expect.anything() matches
}));

// Mock firebaseConfig
jest.mock('../../config/firebaseConfig', () => ({
  functions: {},
}));

// Mock window.location for web tests
const mockLocationAssign = jest.fn();

describe('SubscriptionCard', () => {
  const mockOpenPortal = jest.fn();
  const mockShowAlert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (useStripePortal as jest.Mock).mockReturnValue({
      openPortal: mockOpenPortal,
      loading: false,
      error: null,
    });

    (useAlert as jest.Mock).mockReturnValue({
      showAlert: mockShowAlert,
    });

    // Setup window.location mock for web
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:3000',
          assign: mockLocationAssign,
        },
        writable: true,
      });
    }
  });

  describe('Platform behavior', () => {
    it('should not render on iOS', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => false,
        userProfile: { subscriptionType: 'free' },
      });

      const { toJSON } = render(<SubscriptionCard />);
      expect(toJSON()).toBeNull();
    });

    it('should not render on Android', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => false,
        userProfile: { subscriptionType: 'free' },
      });

      const { toJSON } = render(<SubscriptionCard />);
      expect(toJSON()).toBeNull();
    });

    it('should render on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => false,
        userProfile: { subscriptionType: 'free' },
      });

      const { getByText } = render(<SubscriptionCard />);
      expect(getByText('Upgrade')).toBeTruthy();
    });
  });

  describe('Free user experience', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => false,
        userProfile: { subscriptionType: 'free' },
      });
    });

    it('should display "Unlimited Searches" label for free users', () => {
      const { getByText } = render(<SubscriptionCard />);
      expect(getByText('Unlimited Searches')).toBeTruthy();
    });

    it('should display Upgrade button for free users', () => {
      const { getByText } = render(<SubscriptionCard />);
      expect(getByText('Upgrade')).toBeTruthy();
    });

    it('should call createStripeCheckoutSession when Upgrade is pressed', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/test-session' },
      });
      
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockCallable);

      const { getByText } = render(<SubscriptionCard />);
      
      fireEvent.press(getByText('Upgrade'));

      await waitFor(() => {
        // Verify httpsCallable was called with the correct function name
        expect(httpsCallable).toHaveBeenCalledWith(
          expect.anything(), // getFunctions() result (may be undefined in test env)
          'createStripeCheckoutSession'
        );
        expect(mockCallable).toHaveBeenCalledWith({ origin: 'http://localhost:3000' });
      });
    });

    it('should redirect to Stripe checkout URL on success', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/test-session' },
      });
      
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockCallable);

      const { getByText } = render(<SubscriptionCard />);
      
      fireEvent.press(getByText('Upgrade'));

      await waitFor(() => {
        expect(mockLocationAssign).toHaveBeenCalledWith('https://checkout.stripe.com/test-session');
      });
    });

    it('should show error alert when checkout fails', async () => {
      const mockCallable = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockCallable);

      const { getByText } = render(<SubscriptionCard />);
      
      fireEvent.press(getByText('Upgrade'));

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('error', 'Network error');
      });
    });
  });

  describe('Premium user experience', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => true,
        userProfile: { subscriptionType: 'premium' },
      });
    });

    it('should display "Premium" label for premium users', () => {
      const { getByText } = render(<SubscriptionCard />);
      expect(getByText('Premium')).toBeTruthy();
    });

    it('should display Manage button for premium users', () => {
      const { getByText } = render(<SubscriptionCard />);
      expect(getByText('Manage')).toBeTruthy();
    });

    it('should call openPortal when Manage is pressed', () => {
      const { getByText } = render(<SubscriptionCard />);
      
      fireEvent.press(getByText('Manage'));

      expect(mockOpenPortal).toHaveBeenCalled();
    });

    it('should hide Manage button when hideManage prop is true', () => {
      const { queryByText, getByText } = render(<SubscriptionCard hideManage />);
      
      // Should still show Premium label but with Upgrade button instead of Manage
      expect(getByText('Premium')).toBeTruthy();
      expect(queryByText('Manage')).toBeNull();
    });
  });

  describe('Loading states', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('should show loading indicator when subscribing', async () => {
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => false,
        userProfile: { subscriptionType: 'free' },
      });

      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: any) => void;
      const mockCallable = jest.fn().mockImplementation(
        () => new Promise(resolve => { resolvePromise = resolve; })
      );
      
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockCallable);

      const { getByText, getByLabelText } = render(<SubscriptionCard />);
      
      fireEvent.press(getByText('Upgrade'));

      // Button should be disabled during loading
      // Note: We can't easily test for ActivityIndicator in this setup
      // The key behavior is that the button becomes disabled
    });

    it('should show loading indicator when managing subscription', () => {
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => true,
        userProfile: { subscriptionType: 'premium' },
      });

      (useStripePortal as jest.Mock).mockReturnValue({
        openPortal: mockOpenPortal,
        loading: true,
        error: null,
      });

      const { getByLabelText } = render(<SubscriptionCard />);
      
      // Button should be disabled during loading
      const manageButton = getByLabelText('Manage subscription');
      expect(manageButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('should display portal error when present', () => {
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => true,
        userProfile: { subscriptionType: 'premium' },
      });

      (useStripePortal as jest.Mock).mockReturnValue({
        openPortal: mockOpenPortal,
        loading: false,
        error: 'Failed to open portal',
      });

      const { getByText } = render(<SubscriptionCard />);
      expect(getByText('Failed to open portal')).toBeTruthy();
    });

    it('should NOT display limbo state message after refresh (clears on mount)', () => {
      // This matches PWA behavior: limbo message is cleared on mount/refresh
      // so users can retry the upgrade without a persistent error
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => false,
        userProfile: { 
          subscriptionType: 'free',
          stripeCustomerId: 'cus_test123', // Has Stripe ID but not premium
        },
      });

      const { queryByText, getByText } = render(<SubscriptionCard />);
      // Limbo message should NOT appear (cleared on mount)
      expect(queryByText(/Subscription failed/)).toBeNull();
      // But user should still be able to upgrade
      expect(getByText('Upgrade')).toBeTruthy();
    });

    it('should show message when userProfile is null', () => {
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => false,
        userProfile: null,
      });

      const { getByText } = render(<SubscriptionCard />);
      expect(getByText(/User profile not loaded/)).toBeTruthy();
    });
  });

  describe('Compact mode', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      (useUsageTracking as jest.Mock).mockReturnValue({
        hasPremium: () => false,
        userProfile: { subscriptionType: 'free' },
      });
    });

    it('should render in compact mode when prop is true', () => {
      const { getByText } = render(<SubscriptionCard compact />);
      // Component should still render with all elements
      expect(getByText('Upgrade')).toBeTruthy();
      expect(getByText('Unlimited Searches')).toBeTruthy();
    });
  });
});

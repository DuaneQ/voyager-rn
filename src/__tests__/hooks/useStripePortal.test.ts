/**
 * Unit Tests for useStripePortal Hook
 * Tests Stripe billing portal functionality (Web only)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useStripePortal } from '../../hooks/useStripePortal';

// Mock firebase/functions
const mockFunctions = {};
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
  getFunctions: jest.fn(() => mockFunctions),
}));

// Mock firebaseConfig
jest.mock('../../config/firebaseConfig', () => ({
  functions: {},
}));

// Mock window.location for web tests
const mockLocationAssign = jest.fn();
const originalLocation = global.window?.location;

describe('useStripePortal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  afterAll(() => {
    // Restore original location
    if (originalLocation) {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    }
  });

  describe('initial state', () => {
    it('should initialize with loading false and no error', () => {
      const { result } = renderHook(() => useStripePortal());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.openPortal).toBe('function');
    });
  });

  describe('openPortal on non-web platform', () => {
    it('should set error when called on non-web platform', async () => {
      // Mock Platform.OS as 'ios'
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const { result } = renderHook(() => useStripePortal());

      await act(async () => {
        await result.current.openPortal();
      });

      expect(result.current.error).toBe('Stripe portal is only available on web.');
      expect(result.current.loading).toBe(false);

      // Restore Platform.OS
      Object.defineProperty(Platform, 'OS', { value: originalPlatform, writable: true });
    });
  });

  describe('openPortal on web platform', () => {
    beforeEach(() => {
      // Mock Platform.OS as 'web'
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('should call createStripePortalSession and redirect on success', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: { url: 'https://billing.stripe.com/test-session' },
      });
      
      const { httpsCallable, getFunctions } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockCallable);

      const { result } = renderHook(() => useStripePortal());

      await act(async () => {
        await result.current.openPortal();
      });

      expect(getFunctions).toHaveBeenCalled();
      expect(httpsCallable).toHaveBeenCalledWith(mockFunctions, 'createStripePortalSession');
      expect(mockCallable).toHaveBeenCalledWith({ origin: 'http://localhost:3000' });
      expect(mockLocationAssign).toHaveBeenCalledWith('https://billing.stripe.com/test-session');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set error when no URL is returned', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {},
      });
      
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockCallable);

      const { result } = renderHook(() => useStripePortal());

      await act(async () => {
        await result.current.openPortal();
      });

      expect(result.current.error).toBe('Failed to get portal link.');
      expect(mockLocationAssign).not.toHaveBeenCalled();
    });

    it('should set error when function call fails', async () => {
      const mockCallable = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockCallable);

      const { result } = renderHook(() => useStripePortal());

      await act(async () => {
        await result.current.openPortal();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.loading).toBe(false);
    });

    it('should show loading state during operation', async () => {
      let resolvePromise: (value: any) => void;
      const mockCallable = jest.fn().mockImplementation(
        () => new Promise(resolve => { resolvePromise = resolve; })
      );
      
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockCallable);

      const { result } = renderHook(() => useStripePortal());

      // Start the operation (don't await)
      let openPromise: Promise<void>;
      act(() => {
        openPromise = result.current.openPortal();
      });

      // Verify loading is true during operation
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ data: { url: 'https://stripe.com/test' } });
        await openPromise;
      });

      // Verify loading is false after completion
      expect(result.current.loading).toBe(false);
    });
  });
});

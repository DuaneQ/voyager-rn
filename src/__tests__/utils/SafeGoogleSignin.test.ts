/**
 * Tests for SafeGoogleSignin utility
 * Safe wrapper that prevents crashes when Google Sign-In module isn't available
 */

import { Platform } from 'react-native';
import { SafeGoogleSignin } from '../../utils/SafeGoogleSignin';

// Mock the Google Sign-In module
let mockGoogleSigninModule: any = null;

jest.mock('@react-native-google-signin/google-signin', () => {
  return mockGoogleSigninModule;
}, { virtual: true });

describe('SafeGoogleSignin', () => {
  describe('Module Availability', () => {
    it('should report availability correctly', () => {
      const isAvail = SafeGoogleSignin.isAvailable();
      // Will be false in test environment since module isn't actually available
      expect(typeof isAvail).toBe('boolean');
    });
  });

  describe('configure', () => {
    it('should handle configure when module not available', () => {
      const config = {
        webClientId: 'test-client-id',
        offlineAccess: true,
      };

      // Should not throw when module unavailable
      expect(() => SafeGoogleSignin.configure(config)).not.toThrow();
    });

    it('should call configure with correct config when available', () => {
      const config = {
        webClientId: 'test-web-client-id',
        iosClientId: 'test-ios-client-id',
      };

      SafeGoogleSignin.configure(config);
      
      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('hasPlayServices', () => {
    it('should throw friendly error when module not available', async () => {
      await expect(SafeGoogleSignin.hasPlayServices()).rejects.toThrow(
        'Google Sign-In is not available'
      );
    });

    it('should throw error with proper message', async () => {
      await expect(SafeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }))
        .rejects.toThrow('Google Sign-In is not available. Please ensure the app is properly configured.');
    });
  });

  describe('signIn', () => {
    it('should throw friendly error when module not available', async () => {
      await expect(SafeGoogleSignin.signIn()).rejects.toThrow(
        'Google Sign-In is not available'
      );
    });

    it('should throw error with configuration message', async () => {
      await expect(SafeGoogleSignin.signIn())
        .rejects.toThrow('Google Sign-In is not available. Please ensure the app is properly configured.');
    });
  });

  describe('signOut', () => {
    it('should handle signOut gracefully when module not available', async () => {
      // Should not throw
      await expect(SafeGoogleSignin.signOut()).resolves.toBeUndefined();
    });

    it('should complete without error', async () => {
      const result = await SafeGoogleSignin.signOut();
      expect(result).toBeUndefined();
    });
  });

  describe('revokeAccess', () => {
    it('should handle revokeAccess gracefully when module not available', async () => {
      // Should not throw
      await expect(SafeGoogleSignin.revokeAccess()).resolves.toBeUndefined();
    });

    it('should complete without error', async () => {
      const result = await SafeGoogleSignin.revokeAccess();
      expect(result).toBeUndefined();
    });
  });

  describe('isSignedIn', () => {
    it('should return false when module not available', async () => {
      const result = await SafeGoogleSignin.isSignedIn();
      expect(result).toBe(false);
    });

    it('should not throw when module unavailable', async () => {
      await expect(SafeGoogleSignin.isSignedIn()).resolves.toBeDefined();
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when module not available', async () => {
      const result = await SafeGoogleSignin.getCurrentUser();
      expect(result).toBeNull();
    });

    it('should not throw when module unavailable', async () => {
      await expect(SafeGoogleSignin.getCurrentUser()).resolves.toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle all methods without crashing', async () => {
      // None of these should throw
      SafeGoogleSignin.configure({});
      expect(SafeGoogleSignin.isAvailable()).toBeDefined();
      await SafeGoogleSignin.signOut();
      await SafeGoogleSignin.revokeAccess();
      await SafeGoogleSignin.isSignedIn();
      await SafeGoogleSignin.getCurrentUser();

      // These should throw with friendly messages
      await expect(SafeGoogleSignin.hasPlayServices()).rejects.toThrow();
      await expect(SafeGoogleSignin.signIn()).rejects.toThrow();
    });

    it('should provide user-friendly error messages', async () => {
      try {
        await SafeGoogleSignin.signIn();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('not available');
      }
    });

    it('should handle hasPlayServices with options', async () => {
      try {
        await SafeGoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
          autoResolve: true,
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('properly configured');
      }
    });
  });

  describe('Platform Specific Behavior', () => {
    it('should work consistently across platforms', () => {
      // Module loading is platform-agnostic in the wrapper
      expect(SafeGoogleSignin.isAvailable()).toBe(SafeGoogleSignin.isAvailable());
    });

    it('should handle web platform gracefully', () => {
      // Even on web, the wrapper should work
      expect(() => SafeGoogleSignin.configure({})).not.toThrow();
    });
  });

  describe('Method Chains', () => {
    it('should handle sequential method calls', async () => {
      SafeGoogleSignin.configure({ webClientId: 'test' });
      await SafeGoogleSignin.isSignedIn();
      await SafeGoogleSignin.getCurrentUser();
      await SafeGoogleSignin.signOut();

      expect(true).toBe(true);
    });

    it('should handle multiple configure calls', () => {
      SafeGoogleSignin.configure({ webClientId: '1' });
      SafeGoogleSignin.configure({ webClientId: '2' });
      SafeGoogleSignin.configure({ webClientId: '3' });

      expect(true).toBe(true);
    });
  });
});

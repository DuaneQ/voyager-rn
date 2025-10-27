/**
 * Safe wrapper for Google Sign-In that prevents app crashes when native module isn't available
 * This is especially useful during development when testing photo upload and other features
 * without needing Google Sign-In fully configured.
 */

import { Platform } from 'react-native';

let GoogleSigninModule: any = null;
let isAvailable = false;

// Try to load the module, but don't crash if it fails
try {
  if (Platform.OS !== 'web') {
    GoogleSigninModule = require('@react-native-google-signin/google-signin');
    isAvailable = !!GoogleSigninModule?.GoogleSignin;
  }
} catch (error) {
  console.warn('Google Sign-In native module not available:', error instanceof Error ? error.message : error);
  isAvailable = false;
}

/**
 * Safe Google Sign-In API that gracefully degrades when native module isn't available
 */
export const SafeGoogleSignin = {
  /**
   * Check if Google Sign-In is available
   */
  isAvailable: () => isAvailable,

  /**
   * Configure Google Sign-In (no-op if not available)
   */
  configure: (config: any) => {
    if (!isAvailable) {
      console.warn('GoogleSignin.configure called but module not available');
      return;
    }
    return GoogleSigninModule.GoogleSignin.configure(config);
  },

  /**
   * Check for Play Services (throws friendly error if not available)
   */
  hasPlayServices: async (options?: any) => {
    if (!isAvailable) {
      throw new Error('Google Sign-In is not available. Please ensure the app is properly configured.');
    }
    return GoogleSigninModule.GoogleSignin.hasPlayServices(options);
  },

  /**
   * Sign in (throws friendly error if not available)
   */
  signIn: async () => {
    if (!isAvailable) {
      throw new Error('Google Sign-In is not available. Please ensure the app is properly configured.');
    }
    return GoogleSigninModule.GoogleSignin.signIn();
  },

  /**
   * Sign out (no-op if not available)
   */
  signOut: async () => {
    if (!isAvailable) {
      console.warn('GoogleSignin.signOut called but module not available');
      return;
    }
    return GoogleSigninModule.GoogleSignin.signOut();
  },

  /**
   * Revoke access (no-op if not available)
   */
  revokeAccess: async () => {
    if (!isAvailable) {
      console.warn('GoogleSignin.revokeAccess called but module not available');
      return;
    }
    return GoogleSigninModule.GoogleSignin.revokeAccess();
  },

  /**
   * Check if user is signed in
   */
  isSignedIn: async () => {
    if (!isAvailable) {
      return false;
    }
    return GoogleSigninModule.GoogleSignin.isSignedIn();
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    if (!isAvailable) {
      return null;
    }
    return GoogleSigninModule.GoogleSignin.getCurrentUser();
  },
};

export default SafeGoogleSignin;

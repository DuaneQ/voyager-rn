/**
 * Authentication Helper
 * Provides utility functions for automatic authentication in E2E tests
 */

import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

// Firebase configuration (should match your app's config)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAXUSH6SBjTdE9C66G0YR-r-r1dcOaaxN8",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "mundo1-dev.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "mundo1-dev",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "mundo1-dev.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "302534551346",
  appId: process.env.FIREBASE_APP_ID || "1:302534551346:web:25eaeb28b2368f3c05e83e",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-GWLXJV6BWT"
};

let app: FirebaseApp;

/**
 * Initialize Firebase for test automation
 * @returns Firebase app instance
 */
export function initializeFirebaseForTests(): FirebaseApp {
  if (!app) {
    // Check if Firebase is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
  }
  return app;
}

/**
 * Programmatically sign in a user using Firebase Admin/Client SDK
 * This bypasses the UI login flow for faster test execution
 * 
 * @param email - User email
 * @param password - User password
 * @returns Firebase user credential and auth token
 */
export async function signInUserProgrammatically(email: string, password: string) {
  try {
    console.log('[Auth Helper] Initializing Firebase for programmatic sign-in...');
    initializeFirebaseForTests();
    
    const auth = getAuth(app);
    console.log('[Auth Helper] Signing in user:', email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();
    
    console.log('[Auth Helper] Sign-in successful. User ID:', user.uid);
    
    return {
      user,
      idToken,
      uid: user.uid,
      email: user.email,
    };
  } catch (error: any) {
    console.error('[Auth Helper] Programmatic sign-in failed:', error.message);
    throw new Error(`Failed to sign in programmatically: ${error.message}`);
  }
}

/**
 * Inject authentication token into the mobile app
 * This allows bypassing the login UI by directly setting auth state
 * 
 * @param idToken - Firebase ID token from programmatic sign-in
 * @param platform - 'ios' or 'android'
 */
export async function injectAuthToken(idToken: string, platform: 'ios' | 'android') {
  try {
    console.log('[Auth Helper] Injecting auth token into app...');
    
    if (platform === 'android') {
      // For Android: Use ADB to inject auth token into AsyncStorage
      // This requires the app to be running
      await (browser as any).execute('mobile: shell', {
        command: 'run-as',
        args: ['com.voyager.rn', 'ls', '/data/data/com.voyager.rn/files/']
      });
      
      // Note: Direct AsyncStorage manipulation via ADB is complex
      // Alternative: Use deep link or custom test command
      console.log('[Auth Helper] Android token injection requires app support for test mode');
    } else {
      // For iOS: Similar approach using xcrun simctl
      console.log('[Auth Helper] iOS token injection requires app support for test mode');
    }
    
    // Best approach: App should support a test mode where it checks for
    // pre-set credentials or accepts auth token via deep link
    console.log('[Auth Helper] Consider implementing app-side test authentication support');
    
  } catch (error: any) {
    console.error('[Auth Helper] Token injection failed:', error.message);
    throw error;
  }
}

/**
 * Sign out the current user programmatically
 */
export async function signOutUserProgrammatically() {
  try {
    const auth = getAuth(app);
    await auth.signOut();
    console.log('[Auth Helper] User signed out programmatically');
  } catch (error: any) {
    console.error('[Auth Helper] Programmatic sign-out failed:', error.message);
  }
}

/**
 * Helper to perform UI-based login quickly
 * Uses optimized selectors and minimal waits
 * 
 * @param email - User email
 * @param password - User password
 */
export async function performQuickUILogin(email: string, password: string) {
  console.log('[Auth Helper] Performing quick UI login...');
  
  const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
  
  try {
    // Wait for login screen
    const emailInput = await $(isAndroid 
      ? 'android=new UiSelector().resourceId("login-email-input")'
      : '~login-email-input'
    );
    
    await emailInput.waitForExist({ timeout: 10000 });
    await emailInput.setValue(email);
    
    const passwordInput = await $(isAndroid
      ? 'android=new UiSelector().resourceId("login-password-input")'
      : '~login-password-input'
    );
    
    await passwordInput.setValue(password);
    
    const loginButton = await $(isAndroid
      ? 'android=new UiSelector().resourceId("signin-button")'
      : '~signin-button'
    );
    
    await loginButton.click();
    
    // Wait for navigation to complete and home screen to load
    console.log('[Auth Helper] Waiting for navigation after login...');
    await browser.pause(5000); // Increased wait for navigation
    
    // Debug: Check what's on screen after login
    try {
      const pageSource = await browser.getPageSource();
      console.log('[Auth Helper] Page source length after login:', pageSource.length);
      
      // Check if bottom navigation is present
      const hasSearch = pageSource.includes('Search') || pageSource.includes('TravalMatch');
      const hasProfile = pageSource.includes('Profile');
      const hasChat = pageSource.includes('Chat');
      console.log('[Auth Helper] Bottom nav elements found:', { hasSearch, hasProfile, hasChat });
    } catch (e: any) {
      console.log('[Auth Helper] Could not capture page source:', e.message);
    }
    
    console.log('[Auth Helper] Quick UI login completed');
    return true;
  } catch (error: any) {
    console.error('[Auth Helper] Quick UI login failed:', error.message);
    return false;
  }
}

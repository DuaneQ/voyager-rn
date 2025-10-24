/// <reference types="@wdio/globals/types" />
/// <reference types="mocha" />
/**
 * Simplified Login Test - Web Platform
 * 
 * This test authenticates using Firebase SDK directly in the browser context,
 * bypassing React Native Web's synthetic event system limitations.
 * 
 * Test Flow:
 * 1. Clear any existing auth state
 * 2. Navigate to login page
 * 3. Call Firebase signInWithEmailAndPassword() directly in browser
 * 4. Wait for navigation to Search screen (expected after successful login)
 * 5. Verify user is authenticated
 */

import { validUser } from '../../src/mocks/userMockData';

describe('Login Flow - Web (Simplified)', () => {
  const APP_URL = process.env.APP_URL || 'http://localhost:19006';
  const testUser = validUser;

  before(async () => {
    // Start at root and clear all storage
    await browser.url(APP_URL);
    await browser.execute(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  it('should successfully login and navigate to Search screen', async () => {
    console.log(`\n🧪 Testing login with: ${testUser.email}`);

    // Navigate to login page
    await browser.url(`${APP_URL}/login`);
    
    // Wait for login form to render
    await browser.waitUntil(
      async () => {
        const signInButton = await $('[data-testid="signin-button"]');
        return signInButton.isExisting();
      },
      {
        timeout: 10000,
        timeoutMsg: 'Login form did not render within 10 seconds'
      }
    );

    console.log('✅ Login form rendered');

    // Call Firebase signInWithEmailAndPassword directly in browser context
    // This bypasses RN-web's synthetic event system and uses the actual Firebase SDK
    const loginResult: any = await browser.executeAsync(async (email: string, password: string, done: Function) => {
      try {
        // Access Firebase from window - it should be initialized by the app
        const firebaseAuth = (window as any).firebase?.auth;
        
        if (!firebaseAuth) {
          done({ success: false, error: 'Firebase not available. Check if app initialized Firebase.' });
          return;
        }

        // Get the auth instance
        const auth = firebaseAuth();
        
        // Sign in - Firebase SDK is already loaded by the app
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        done({ 
          success: true, 
          uid: userCredential.user.uid,
          email: userCredential.user.email 
        });
      } catch (error: any) {
        done({ 
          success: false, 
          error: error.message || String(error)
        });
      }
    }, testUser.email, testUser.password);

    console.log('🔍 Login result:', loginResult);

    // Verify login succeeded
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.error}`);
    }

    console.log(`✅ Firebase authentication successful for ${loginResult.email}`);

    // Wait for navigation to Search screen (first tab in MainTabNavigator)
    // After successful login, AppNavigator should render MainTabNavigator with Search as default
    await browser.waitUntil(
      async () => {
        const currentUrl = await browser.getUrl();
        // Check if we navigated away from /login
        return !currentUrl.includes('/login');
      },
      {
        timeout: 10000,
        timeoutMsg: 'Expected to navigate away from login page after authentication'
      }
    );

    const finalUrl = await browser.getUrl();
    console.log(`✅ Navigated to: ${finalUrl}`);

    // Verify we're on an authenticated page (Search screen or any protected route)
    // Search screen should have search-related elements
    const isOnProtectedPage = await browser.waitUntil(
      async () => {
        // Look for any protected page indicators (tab navigation, search elements, etc.)
        const tabNav = await $('[role="tablist"]');
        const searchElements = await $$('[data-testid*="search"]');
        
        return (await tabNav.isExisting()) || searchElements.length > 0;
      },
      {
        timeout: 5000,
        timeoutMsg: 'Expected to see protected page content after login'
      }
    );

    expect(isOnProtectedPage).toBe(true);
    console.log('✅ Successfully landed on protected page (Search screen)');

    // Verify auth token exists in localStorage (Firebase should have stored it)
    const authToken = await browser.execute(() => {
      const firebaseKey = Object.keys(localStorage).find(k => 
        k.startsWith('firebase:authUser:')
      );
      return firebaseKey ? localStorage.getItem(firebaseKey) : null;
    });

    expect(authToken).toBeTruthy();
    console.log('✅ Firebase auth token verified in localStorage');
  });

  after(async () => {
    // Clean up: sign out
    await browser.execute(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
});

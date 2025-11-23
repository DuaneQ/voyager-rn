/**
 * Firebase Auth REST API Service for React Native Expo
 * 
 * This service uses Firebase's REST API instead of the Web SDK's Auth module,
 * which has compatibility issues with React Native.
 * 
 * Benefits:
 * - Works perfectly in React Native/Expo
 * - No native module dependencies
 * - Secure auth state persistence with SecureStore for tokens + AsyncStorage for non-sensitive data
 * - Compatible with all Firebase services (Firestore, Storage, Functions)
 * 
 * Security:
 * - Sensitive tokens (idToken, refreshToken) stored in encrypted SecureStore
 * - Non-sensitive data (uid, email) in AsyncStorage for quick access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
import { Platform } from 'react-native';

const API_KEY = 'AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0'; // mundo1-dev
const AUTH_DOMAIN = 'https://identitytoolkit.googleapis.com/v1';

export interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName?: string | null;
  photoURL?: string | null;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  isNewUser?: boolean;
}

interface AuthResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  registered?: boolean;
  displayName?: string;
  emailVerified?: boolean;
}

export class FirebaseAuthService {
  private static currentUser: FirebaseUser | null = null;
  private static authStateListeners: ((user: FirebaseUser | null) => void)[] = [];

  /**
   * Initialize auth state from SecureStore (tokens) and AsyncStorage (non-sensitive data)
   */
  static async initialize(): Promise<FirebaseUser | null> {
    try {
      // Get non-sensitive user data from AsyncStorage
      const uid = await AsyncStorage.getItem('FIREBASE_USER_UID');
      const email = await AsyncStorage.getItem('FIREBASE_USER_EMAIL');
      const emailVerified = await AsyncStorage.getItem('FIREBASE_EMAIL_VERIFIED');
      
      if (!uid || !email) {
        console.log('[FirebaseAuthService] No stored user found');
        return null;
      }

      // Get sensitive tokens from SecureStore (or AsyncStorage on web where SecureStore isn't available)
      let idToken: string | null;
      let refreshToken: string | null;
      
      if (Platform.OS === 'web') {
        // Web: SecureStore not available, fall back to AsyncStorage
        idToken = await AsyncStorage.getItem('FIREBASE_ID_TOKEN');
        refreshToken = await AsyncStorage.getItem('FIREBASE_REFRESH_TOKEN');
      } else {
        // Mobile: Use secure storage
        idToken = await SecureStore.getItemAsync('FIREBASE_ID_TOKEN');
        refreshToken = await SecureStore.getItemAsync('FIREBASE_REFRESH_TOKEN');
      }
      
      if (!idToken || !refreshToken) {
        console.error('[FirebaseAuthService] Stored tokens missing. Clearing...');
        await this.signOut();
        return null;
      }

      const user: FirebaseUser = {
        uid,
        email,
        emailVerified: emailVerified === 'true',
        idToken,
        refreshToken,
        expiresIn: '3600', // Default expiry
      };
              
      const tokenExpiry = await AsyncStorage.getItem('FIREBASE_TOKEN_EXPIRY');
      if (tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        this.currentUser = user;
        
        // CRITICAL: Sync with Auth SDK BEFORE notifying listeners
        // This ensures the Auth SDK has the signed-in user before any
        // Cloud Functions are called (which require auth context)
        try {
          await this.syncWithAuthSDK(user.idToken);
        } catch (e) {
          console.warn('[FirebaseAuthService] Auth SDK sync failed during restore:', e);
          // Continue anyway - REST API still works
        }
        
        // Only notify AFTER sync completes (or fails)
        this.notifyAuthStateChanged(user);
        return user;
      } else {
        // Set currentUser BEFORE calling refreshToken so it has context to spread
        this.currentUser = user;
        const refreshedUser = await this.refreshToken(user.refreshToken);
        if (refreshedUser) {
          // Sync BEFORE notifying listeners
          try {
            await this.syncWithAuthSDK(refreshedUser.idToken);
          } catch (e) {
            console.warn('[FirebaseAuthService] Auth SDK sync failed after refresh:', e);
          }
          // Only notify AFTER sync
          this.notifyAuthStateChanged(refreshedUser);
        }
        return refreshedUser;
      }
    } catch (error) {
      console.error('[FirebaseAuthService] Error initializing auth:', error);
      // Clear corrupted data
      await this.signOut();
      return null;
    }
  }

  /**
   * Sign in with email and password
   */
  static async signInWithEmailAndPassword(email: string, password: string): Promise<FirebaseUser> {
    const url = `${AUTH_DOMAIN}/accounts:signInWithPassword?key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Sign in failed');
    }

    const data: AuthResponse = await response.json();
    
    // Get user data to check email verification
    const userInfo = await this.getUserData(data.idToken);
    
    if (!userInfo.emailVerified) {
      throw new Error('Email not verified. Please check your inbox or spam folder.');
    }

    const user: FirebaseUser = {
      uid: data.localId,
      email: data.email,
      emailVerified: userInfo.emailVerified,
      displayName: data.displayName,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    };

    await this.persistUser(user);
    this.currentUser = user;

    // Sync with Firebase Auth SDK for Functions/Firestore compatibility
    // CRITICAL: Wait for the SDK sync to complete BEFORE notifying listeners.
    // This prevents listeners (which call callable Functions) from firing
    // before the Auth SDK has a signed-in user and ensures auth tokens
    // are attached to httpsCallable requests.
    try {
      await this.syncWithAuthSDK(user.idToken);
      console.log('[FirebaseAuthService] Auth SDK sync complete after sign in');
    } catch (e) {
      // syncWithAuthSDK already logs errors; ensure we still notify listeners
      console.warn('[FirebaseAuthService] syncWithAuthSDK failed, notifying listeners anyway');
    }

    // Only notify AFTER sync completes (or fails)
    this.notifyAuthStateChanged(user);
    
    return user;
  }

  /**
   * Sync REST API auth with Firebase Auth SDK using custom tokens
   * This allows Firebase Functions SDK to work with REST API authentication
   * 
   * Implements retry logic with 3 attempts and exponential backoff
   * 
   * NOTE: We must use direct HTTP fetch because httpsCallable requires the Auth SDK
   * to already have a signed-in user (which we don't have yet - chicken and egg problem)
   */
  private static async syncWithAuthSDK(idToken: string): Promise<void> {
    let retries = 3;
    let lastError: Error | null = null;
    
    while (retries > 0) {
      try {
        console.log(`[FirebaseAuthService] Syncing with Auth SDK (attempt ${4-retries}/3)...`);
        
        // Call generateCustomToken with manual Authorization header
        // We can't use httpsCallable because it requires Auth SDK to already be signed in
        const functionUrl = 'https://us-central1-mundo1-dev.cloudfunctions.net/generateCustomToken';
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}` // Manually attach our REST API token
          },
          body: JSON.stringify({ data: {} }) // Cloud Functions expect { data: payload }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const result = await response.json();
        
        if (!result.result || !result.result.customToken) {
          throw new Error('Failed to get custom token from response');
        }
        
        // Sign in to Firebase Auth SDK with the custom token
        await signInWithCustomToken(auth, result.result.customToken);
        
        return; // Success - exit
        
      } catch (error) {
        lastError = error as Error;
        retries--;
        
        if (retries > 0) {
          const backoffMs = (4 - retries) * 1000; // 1s, 2s, 3s backoff
          console.warn(`[FirebaseAuthService] Auth SDK sync failed, retrying in ${backoffMs}ms (${retries} attempts left)...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
    
    console.error('[FirebaseAuthService] Failed to sync with Auth SDK after 3 attempts:', lastError);
    // Don't throw - REST API auth still works, just Functions won't have auth context
  }

  /**
   * Create new user with email and password
   */
  static async createUserWithEmailAndPassword(email: string, password: string): Promise<FirebaseUser> {
    const url = `${AUTH_DOMAIN}/accounts:signUp?key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Sign up failed');
    }

    const data: AuthResponse = await response.json();

    const user: FirebaseUser = {
      uid: data.localId,
      email: data.email,
      emailVerified: false,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    };

    // Don't persist unverified users to storage
    this.currentUser = user;
    
    return user;
  }

  /**
   * Sign in / sign up using an IDP token (Google) via the REST endpoint
   * POST to accounts:signInWithIdp
   */
  static async signInWithGoogleIdToken(idToken: string): Promise<FirebaseUser> {
    const url = `${AUTH_DOMAIN}/accounts:signInWithIdp?key=${API_KEY}`;

    // requestUri can be any valid URL; it's required by the endpoint
    const body = {
      postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
      requestUri: 'http://localhost',
      returnSecureToken: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Google sign-in failed');
    }

    const data: any = await response.json();

    // Some responses include isNewUser
    const isNew = !!data.isNewUser;

    const user: FirebaseUser = {
      uid: data.localId || data.userId || data.localId,
      email: data.email || null,
      emailVerified: data.emailVerified ?? true,
      displayName: data.displayName || null,
      photoURL: data.photoUrl || data.photoURL || null,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn || '3600',
      isNewUser: isNew,
    };

    await this.persistUser(user);
    this.currentUser = user;

    try {
      await this.syncWithAuthSDK(user.idToken);
      console.log('[FirebaseAuthService] Auth SDK sync complete after Google sign in');
    } catch (e) {
      console.warn('[FirebaseAuthService] syncWithAuthSDK failed for Google sign-in:', e);
    }

    this.notifyAuthStateChanged(user);

    return user;
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(idToken: string): Promise<void> {
    const url = `${AUTH_DOMAIN}/accounts:sendOobCode?key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'VERIFY_EMAIL',
        idToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<void> {
    const url = `${AUTH_DOMAIN}/accounts:sendOobCode?key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to send password reset email');
    }
  }

  /**
   * Sign out - clears all stored auth data
   */
  static async signOut(): Promise<void> {
    // Clear AsyncStorage
    await AsyncStorage.multiRemove([
      'FIREBASE_USER_UID',
      'FIREBASE_USER_EMAIL',
      'FIREBASE_EMAIL_VERIFIED',
      'FIREBASE_TOKEN_EXPIRY',
    ]);
    
    // Clear SecureStore (or AsyncStorage on web)
    if (Platform.OS === 'web') {
      await AsyncStorage.multiRemove([
        'FIREBASE_ID_TOKEN',
        'FIREBASE_REFRESH_TOKEN',
      ]);
    } else {
      await SecureStore.deleteItemAsync('FIREBASE_ID_TOKEN');
      await SecureStore.deleteItemAsync('FIREBASE_REFRESH_TOKEN');
    }
    
    this.currentUser = null;
    this.notifyAuthStateChanged(null);
  }

  /**
   * Get current user
   */
  static getCurrentUser(): FirebaseUser | null {
    return this.currentUser;
  }

  /**
   * Get fresh ID token (for API calls)
   */
  static async getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    if (!this.currentUser) return null;

    if (forceRefresh || await this.isTokenExpired()) {
      const refreshed = await this.refreshToken(this.currentUser.refreshToken);
      return refreshed?.idToken || null;
    }

    return this.currentUser.idToken;
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Immediately call with current state
    setTimeout(() => callback(this.currentUser), 0);
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Refresh the user's ID token
   */
  private static async refreshToken(refreshToken: string): Promise<FirebaseUser | null> {
    try {
      const url = `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        // Refresh token expired or invalid
        await this.signOut();
        return null;
      }

      const data = await response.json();
      
      // Ensure we have a currentUser before spreading
      if (!this.currentUser) {
        console.error('[FirebaseAuthService] No currentUser during token refresh');
        await this.signOut();
        return null;
      }
      
      const user: FirebaseUser = {
        ...this.currentUser,
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };

      await this.persistUser(user);
      this.currentUser = user;
      this.notifyAuthStateChanged(user); // Notify listeners after token refresh
      
      return user;
    } catch (error) {
      console.error('Error refreshing token:', error);
      await this.signOut();
      return null;
    }
  }

  /**
   * Get user data from Firebase
   */
  private static async getUserData(idToken: string): Promise<any> {
    const url = `${AUTH_DOMAIN}/accounts:lookup?key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to get user data');
    }

    const data = await response.json();
    return data.users[0];
  }

  /**
   * Persist user to SecureStore (tokens) and AsyncStorage (non-sensitive data)
   */
  private static async persistUser(user: FirebaseUser): Promise<void> {
    const expiry = Date.now() + parseInt(user.expiresIn) * 1000;
    
    // Defensive: Ensure required fields are present
    if (!user.uid) {
      console.error('[FirebaseAuthService] Cannot persist user without uid');
      throw new Error('Cannot persist user without uid');
    }
    
    // Store non-sensitive data in AsyncStorage for quick access
    // Only store values that are defined (never store undefined)
    await AsyncStorage.multiSet([
      ['FIREBASE_USER_UID', user.uid],
      ['FIREBASE_USER_EMAIL', user.email || ''],
      ['FIREBASE_EMAIL_VERIFIED', user.emailVerified ? 'true' : 'false'],
      ['FIREBASE_TOKEN_EXPIRY', expiry.toString()],
    ]);
    
    // Store sensitive tokens in SecureStore (or AsyncStorage on web)
    if (Platform.OS === 'web') {
      // Web: SecureStore not available, use AsyncStorage
      await AsyncStorage.multiSet([
        ['FIREBASE_ID_TOKEN', user.idToken],
        ['FIREBASE_REFRESH_TOKEN', user.refreshToken],
      ]);
    } else {
      // Mobile: Use encrypted storage
      await SecureStore.setItemAsync('FIREBASE_ID_TOKEN', user.idToken);
      await SecureStore.setItemAsync('FIREBASE_REFRESH_TOKEN', user.refreshToken);
    }
  }

  /**
   * Check if token is expired
   */
  private static async isTokenExpired(): Promise<boolean> {
    const expiry = await AsyncStorage.getItem('FIREBASE_TOKEN_EXPIRY');
    if (!expiry) return true;
    return Date.now() >= parseInt(expiry);
  }

  /**
   * Notify all listeners of auth state change
   */
  private static notifyAuthStateChanged(user: FirebaseUser | null): void {
    this.authStateListeners.forEach(callback => callback(user));
  }
}

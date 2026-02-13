/**
 * AuthContext - Simple Firebase Web SDK Authentication
 * 
 * Uses Firebase Web SDK (v12.5.0) directly - works on web, iOS, and Android.
 * Matches the PWA authentication pattern exactly.
 * 
 * Flow:
 * 1. Sign up → createUserWithEmailAndPassword + setDoc(profile) + sendEmailVerification
 * 2. Sign in → signInWithEmailAndPassword (checks emailVerified)
 * 3. Profile load → UserProfileContext listens to auth.onAuthStateChanged and reads from Firestore
 * 4. Terms check → After profile loads, check hasAcceptedTerms field
 * 
 * See: docs/auth/SIMPLE_AUTH_FLOW.md
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebaseConfig';
import { SafeGoogleSignin } from '../utils/SafeGoogleSignin';
import * as AppleAuthentication from 'expo-apple-authentication';

// Conditional import for notification service (only on mobile)
let notificationService: any = null;
if (Platform.OS !== 'web') {
  notificationService = require('../services/notification/NotificationService').notificationService;
}

// Firebase Web SDK - static imports for Jest compatibility
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  User as FirebaseAuthUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { HashingService } from '../services/contacts/HashingService';

// Simple user interface matching Firebase Auth User
interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName?: string | null;
  photoURL?: string | null;
  providerData?: Array<{
    providerId: string;
    uid?: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  }>;
}

interface UserProfile {
  username?: string;
  email?: string;
  bio?: string;
  gender?: string;
  sexualOrientation?: string;
  edu?: string;
  drinking?: string;
  smoking?: string;
  dob?: string;
  photos?: string[];
  subscriptionType?: string;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  subscriptionCancelled?: boolean;
  stripeCustomerId?: string | null;
  dailyUsage?: {
    date: string;
    viewCount: number;
  };
}

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthContextValue {
  user: FirebaseUser | null;
  status: AuthStatus;
  isInitializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: (email?: string) => Promise<void>;
  refreshAuthState: () => Promise<void>;
  hasUnverifiedUser: () => boolean;
  signInWithGoogle: () => Promise<any>;
  signUpWithGoogle: () => Promise<any>;
  signInWithApple: () => Promise<any>;
  signUpWithApple: () => Promise<any>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize Google Sign-In configuration (one-time setup)
  useEffect(() => {
    if (Platform.OS !== 'web' && SafeGoogleSignin.isAvailable()) {
      // Use dev credentials in dev mode, production credentials in release builds
      const googleConfig = __DEV__ 
        ? {
            webClientId: '296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com',
            iosClientId: '296095212837-iq6q8qiodt67lalsn3j5ej2s6sn1e01k.apps.googleusercontent.com',
          }
        : {
            webClientId: '533074391000-uotb4gkkr75tdi2f9vvnffecj0oqbj16.apps.googleusercontent.com',
            iosClientId: '533074391000-quot684rc8kugrni3eh2c6bsq3u5rcqs.apps.googleusercontent.com',
          };
      SafeGoogleSignin.configure({
        ...googleConfig,
        offlineAccess: true,
      });
    }
  }, []);

  // Initialize Firebase Web SDK auth (PWA pattern - simple!)
  useEffect(() => {
    // Listen to Firebase Auth SDK state changes (same as PWA)
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in - preserve providerData for delete account feature
        const user: FirebaseUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          emailVerified: firebaseUser.emailVerified,
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null,
          providerData: firebaseUser.providerData?.map(p => ({
            providerId: p.providerId,
            uid: p.uid,
            displayName: p.displayName,
            email: p.email,
            photoURL: p.photoURL,
          })),
        };
        setUser(user);
        
        // CRITICAL: Only mark as authenticated if email is verified
        // (unless it's a social provider like Google/Apple which auto-verifies)
        const isSocialProvider = firebaseUser.providerData?.some(
          (provider) => provider.providerId === 'google.com' || provider.providerId === 'apple.com'
        ) || false;
        
        if (firebaseUser.emailVerified || isSocialProvider) {
          setStatus('authenticated');
        } else {
          // User exists but email not verified - keep status as 'idle' or 'error'
          setStatus('idle');
        }
      } else {
        // User is signed out
        setUser(null);
        setStatus('idle');
      }
      setIsInitializing(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setStatus('loading');

      // CRITICAL FIX: If user is already signed in from signup, sign them out first
      // This ensures we get fresh verification status from Firebase servers
      if (auth.currentUser) {
        await signOut(auth);
        // Wait briefly for sign out to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Use Firebase Web SDK EVERYWHERE (works on web, iOS, Android)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // CRITICAL: Force fresh token refresh AND reload to get latest verification status
      // user.reload() alone may use cached state - we need to force a server round-trip
      await user.getIdToken(true); // Force token refresh from server
      await user.reload(); // Reload user data with fresh token
      
      if (!user.emailVerified) {
        // Sign out the user immediately so onAuthStateChanged doesn't authenticate them
        await signOut(auth);
        setStatus('error');
        throw new Error('Email not verified. Please check your email and verify your account.');
      }
      
      // Store credentials in AsyncStorage (matches PWA's localStorage)
      const userCredentials = {
        user: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
          providerData: user.providerData,
        },
      };
      await AsyncStorage.setItem('USER_CREDENTIALS', JSON.stringify(userCredentials));
      
      // CRITICAL: On web, force a page reload to ensure proper auth state
      // This matches PWA pattern that uses window.location.href = '/'
      // Without this, the navigator may not properly update after email verification
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        setStatus('authenticated');
        window.location.reload();
        return;
      }
      
      // On mobile: Keep status as 'loading' and let onAuthStateChanged update it
      // This prevents the auth form from flashing before navigation completes
      // The listener will fire immediately and set status to 'authenticated'
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      setStatus('error');
      throw error;
    }
  };

  const signUp = async (username: string, email: string, password: string): Promise<void> => {
    try {
      setStatus('loading');

      // Use Firebase Web SDK EVERYWHERE (works on web, iOS, Android)
      
      // Create the user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Hash email for contact discovery matching
      const hashingService = new HashingService();
      const emailHash = await hashingService.hashEmail(email);
      
      // Create user profile in Firestore (PWA pattern)
      const userProfile = {
        username,
        email,
        emailHash, // ✅ Store hashed email for contact discovery
        bio: '',
        gender: '',
        sexualOrientation: '',
        edu: '',
        drinking: '',
        smoking: '',
        dob: '',
        photos: ['', '', '', '', ''],
        subscriptionType: 'free',
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        subscriptionCancelled: false,
        stripeCustomerId: null,
        dailyUsage: {
          date: new Date().toISOString().split('T')[0],
          viewCount: 0,
        },
        createdAt: serverTimestamp(),
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      // Send verification email
      await sendEmailVerification(user);
      
      // Store profile and credentials (PWA pattern)
      // Keep user signed in to Firebase so resend verification works
      await AsyncStorage.setItem('PROFILE_INFO', JSON.stringify(userProfile));
      const userCredentials = {
        user: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
          providerData: user.providerData,
        },
      };
      await AsyncStorage.setItem('USER_CREDENTIALS', JSON.stringify(userCredentials));
      
      setStatus('idle');
      
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      setStatus('error');
      throw error;
    }
  };

  const signOutUser = async (): Promise<void> => {
    try {
      // Clean up this device's push notification token before signing out (mobile only)
      if (user?.uid && notificationService) {
        try {
          // Remove only current device's token (persist it locally so sign-out can
          // remove it reliably) instead of wiping the entire fcmTokens array.
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const currentDeviceToken = await AsyncStorage.getItem('@current_fcm_token');
          if (currentDeviceToken) {
            await notificationService.removeToken(user.uid, currentDeviceToken);
            console.log('Current device push notification token cleared');
          }
        } catch (error) {
          console.warn('Failed to clear push token for current device, continuing with sign out:', error);
          // Don't block sign out on token cleanup failure
        }
      }

      // Use Firebase Web SDK signOut (works everywhere)
      await signOut(auth);
      
      // Clear stored credentials
      await AsyncStorage.multiRemove(['USER_CREDENTIALS', 'PROFILE_INFO']);
      
      // Auth state will be cleared by onAuthStateChanged listener
      setStatus('idle');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      // Use Firebase Web SDK (works everywhere)
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      throw error;
    }
  };

  const resendVerification = async (email?: string): Promise<void> => {
    try {
      // Use Firebase Web SDK (works everywhere)
      
      if (auth.currentUser) {
        // User is signed in - resend verification
        await sendEmailVerification(auth.currentUser);
      } else {
        throw new Error('No user signed in. Please sign in to resend verification email');
      }
    } catch (error: any) {
      console.error('❌ Resend verification error:', error);
      throw error;
    }
  };

  const refreshAuthState = async (): Promise<void> => {
    try {
      if (!auth.currentUser) {
        throw new Error('No user signed in');
      }
      
      // Force token refresh using Web SDK
      await auth.currentUser.getIdToken(true);
      await auth.currentUser.reload();
    } catch (error: any) {
      console.error('❌ Refresh auth state error:', error);
      throw error;
    }
  };

  const hasUnverifiedUser = (): boolean => {
    return user !== null && !user.emailVerified;
  };

  const signInWithGoogle = async (): Promise<any> => {
    try {
      setStatus('loading');

      if (Platform.OS === 'web') {
        // Use Web SDK popup flow
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Check if profile exists
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          // No profile - new user, create one automatically
          const userProfile = {
            username: user.displayName || user.email?.split('@')[0] || 'newuser',
            email: user.email || '',
            bio: '',
            gender: '',
            sexualOrientation: '',
            edu: '',
            drinking: '',
            smoking: '',
            dob: '',
            photos: ['', '', '', '', ''],
            subscriptionType: 'free',
            subscriptionStartDate: null,
            subscriptionEndDate: null,
            subscriptionCancelled: false,
            stripeCustomerId: null,
            dailyUsage: {
              date: new Date().toISOString().split('T')[0],
              viewCount: 0,
            },
            createdAt: serverTimestamp(),
          };
          
          try {
            await setDoc(doc(db, 'users', user.uid), userProfile);
          } catch (firestoreError: any) {
            console.error('❌ [AuthContext] signInWithGoogle - Profile creation failed:', firestoreError);
            await signOut(auth);
            setStatus('idle');
            throw new Error(`Failed to create user profile: ${firestoreError.message}`);
          }
        }
        setStatus('authenticated');
        return user;
      }

      // Mobile flow: use SafeGoogleSignin wrapper
      if (!SafeGoogleSignin.isAvailable()) {
        throw new Error('Google Sign-In is not configured. Please rebuild the app after installing dependencies.');
      }

      await SafeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await SafeGoogleSignin.signIn();
      const idToken = userInfo?.idToken;
      if (!idToken) throw new Error('Google Sign-In failed to return an idToken');

      // Authenticate with Firebase using Google ID token
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      // Check if user profile exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // No profile - new user, create one automatically
        const userProfile = {
          username: user.displayName || user.email?.split('@')[0] || 'newuser',
          email: user.email || '',
          bio: '',
          gender: '',
          sexualOrientation: '',
          edu: '',
          drinking: '',
          smoking: '',
          dob: '',
          photos: ['', '', '', '', ''],
          subscriptionType: 'free',
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          subscriptionCancelled: false,
          stripeCustomerId: null,
          dailyUsage: {
            date: new Date().toISOString().split('T')[0],
            viewCount: 0,
          },
          createdAt: serverTimestamp(),
        };
        
        try {
          await setDoc(doc(db, 'users', user.uid), userProfile);
        } catch (firestoreError: any) {
          console.error('❌ [AuthContext] signInWithGoogle - Profile creation failed:', firestoreError);
          await signOut(auth);
          setStatus('idle');
          throw new Error(`Failed to create user profile: ${firestoreError.message}`);
        }
      }

      setStatus('authenticated');
      return user;
    } catch (error: any) {
      setStatus('idle');
      console.error('❌ Google sign-in error:', error);
      throw error;
    }
  };

  const signUpWithGoogle = async (): Promise<any> => {
    try {
      setStatus('loading');
      if (Platform.OS === 'web') {
        // Use Web SDK popup flow
        
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Check if profile already exists
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          // Existing user - just sign them in
          setStatus('authenticated');
          return user;
        }
        
        // New user - create profile
        const userProfile = {
          username: user.displayName || user.email?.split('@')[0] || 'newuser',
          email: user.email || '',
          bio: '',
          gender: '',
          sexualOrientation: '',
          edu: '',
          drinking: '',
          smoking: '',
          dob: '',
          photos: ['', '', '', '', ''],
          subscriptionType: 'free',
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          subscriptionCancelled: false,
          stripeCustomerId: null,
          dailyUsage: {
            date: new Date().toISOString().split('T')[0],
            viewCount: 0,
          },
          createdAt: serverTimestamp(),
        };
        
        await setDoc(doc(db, 'users', user.uid), userProfile);
        setStatus('authenticated');
        return user;
      }

      // Mobile flow
      if (!SafeGoogleSignin.isAvailable()) {
        throw new Error('Google Sign-In is not configured. Please rebuild the app after installing dependencies.');
      }

      await SafeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await SafeGoogleSignin.signIn();
      const idToken = userInfo?.idToken;
      if (!idToken) throw new Error('Google Sign-In failed to return an idToken');

      // Authenticate with Firebase using Google ID token
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      // Check if profile already exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // Existing user - just sign them in
        setStatus('authenticated');
        return user;
      }

      // New user - create profile
      // Hash email for contact discovery matching
      const hashingService = new HashingService();
      const emailHash = user.email ? await hashingService.hashEmail(user.email) : '';
      
      const userProfile = {
        username: user.displayName || user.email?.split('@')[0] || 'newuser',
        email: user.email || '',
        emailHash, // ✅ Store hashed email for contact discovery
        bio: '',
        gender: '',
        sexualOrientation: '',
        edu: '',
        drinking: '',
        smoking: '',
        dob: '',
        photos: ['', '', '', '', ''],
        subscriptionType: 'free',
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        subscriptionCancelled: false,
        stripeCustomerId: null,
        dailyUsage: {
          date: new Date().toISOString().split('T')[0],
          viewCount: 0,
        },
        createdAt: serverTimestamp(),
      };
      
      try {
        await setDoc(doc(db, 'users', user.uid), userProfile);
      } catch (firestoreError: any) {
        console.error('❌ [AuthContext] signUpWithGoogle - FIRESTORE WRITE FAILED:', {
          error: firestoreError,
          code: firestoreError.code,
          message: firestoreError.message,
          uid: user.uid
        });
        // Sign out the user since profile creation failed
        await signOut(auth);
        setStatus('idle');
        throw new Error(`Failed to create user profile: ${firestoreError.message}`);
      }
      
      // Wait briefly for Firestore write to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      setStatus('authenticated');
      return user;
    } catch (error: any) {
      setStatus('idle');
      console.error('❌ Google sign-up error:', error);
      throw error;
    }
  };

  /**
   * Apple Sign-In
   * Scenario 1: New user tries to sign in → redirect to sign up
   * Scenario 4: Existing user signs in → success
   */
  const signInWithApple = async (): Promise<any> => {
    // Only available on iOS
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    try {
      setStatus('loading');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create Firebase OAuth credential
      const provider = new OAuthProvider('apple.com');
      const oauthCredential = provider.credential({
        idToken: credential.identityToken!,
      });

      // Sign in with Firebase
      const result = await signInWithCredential(auth, oauthCredential);
      const user = result.user;
      
      // Check if user profile exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // New user - create profile automatically
        const displayName = user.displayName || user.email?.split('@')[0] || 'Apple User';
        
        const userProfile = {
          username: displayName,
          email: user.email || '',
          bio: '',
          gender: '',
          sexualOrientation: '',
          edu: '',
          drinking: '',
          smoking: '',
          dob: '',
          photos: ['', '', '', '', ''],
          subscriptionType: 'free',
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          subscriptionCancelled: false,
          stripeCustomerId: null,
          emailVerified: true,
          provider: 'apple',
          dailyUsage: {
            date: new Date().toISOString().split('T')[0],
            viewCount: 0,
          },
          createdAt: serverTimestamp(),
        };
        
        try {
          await setDoc(userRef, userProfile);
        } catch (firestoreError: any) {
          console.error('❌ [AuthContext] signInWithApple - Profile creation failed:', firestoreError);
          await signOut(auth);
          setStatus('idle');
          throw new Error(`Failed to create user profile: ${firestoreError.message}`);
        }
      }
      
      // Sign-in successful
      setStatus('authenticated');
      return user;
      
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled - don't throw error
        setStatus('idle');
        return;
      }
      setStatus('idle');
      console.error('[AuthContext] Apple sign-in failed:', error);
      throw error;
    }
  };

  /**
   * Apple Sign-Up
   * Scenario 2: Existing user tries to sign up → sign them in
   * Scenario 3: New user signs up → create profile and sign in
   */
  const signUpWithApple = async (): Promise<any> => {
    // Only available on iOS
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    try {
      setStatus('loading');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create Firebase OAuth credential
      const provider = new OAuthProvider('apple.com');
      const oauthCredential = provider.credential({
        idToken: credential.identityToken!,
      });

      // Sign in with Firebase
      const result = await signInWithCredential(auth, oauthCredential);
      const user = result.user;
      
      // Check if user profile exists
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Existing user trying to sign up - just sign them in
        setStatus('authenticated');
        return user;
      }
      // New user - create profile
      const displayName = credential.fullName 
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : user.email?.split('@')[0] || 'Apple User';
      
      // Hash email for contact discovery matching
      const hashingService = new HashingService();
      const userEmail = user.email || credential.email || '';
      const emailHash = userEmail ? await hashingService.hashEmail(userEmail) : '';
      
      const userProfile = {
        username: displayName,
        email: userEmail,
        emailHash, // ✅ Store hashed email for contact discovery
        bio: '',
        gender: '',
        sexualOrientation: '',
        edu: '',
        drinking: '',
        smoking: '',
        dob: '',
        photos: ['', '', '', '', ''],
        subscriptionType: 'free',
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        subscriptionCancelled: false,
        stripeCustomerId: null,
        emailVerified: true, // Apple sign-in is always verified
        provider: 'apple',
        dailyUsage: {
          date: new Date().toISOString().split('T')[0],
          viewCount: 0,
        },
        createdAt: serverTimestamp(),
      };
      
      try {
        await setDoc(userRef, userProfile);
      } catch (firestoreError: any) {
        console.error('❌ [AuthContext] signUpWithApple - FIRESTORE WRITE FAILED:', {
          error: firestoreError,
          code: firestoreError.code,
          message: firestoreError.message,
          uid: user.uid
        });
        // Sign out the user since profile creation failed
        await signOut(auth);
        setStatus('idle');
        throw new Error(`Failed to create user profile: ${firestoreError.message}`);
      }
      
      setStatus('authenticated');
      return user;
      
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        setStatus('idle');
        return;
      }
      setStatus('idle');
      console.error('[AuthContext] Apple sign-up failed:', error);
      throw error;
    }
  };

  const value: AuthContextValue = {
    user,
    status,
    isInitializing,
    signIn,
    signUp,
    signOut: signOutUser,
    sendPasswordReset,
    resendVerification,
    refreshAuthState,
    hasUnverifiedUser,
    signInWithGoogle,
    signUpWithGoogle,
    signInWithApple,
    signUpWithApple,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

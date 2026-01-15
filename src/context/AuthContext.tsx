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
// Firebase Web SDK - static imports for Jest compatibility
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  sendPasswordResetEmail,
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

// Simple user interface matching Firebase Auth User
interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName?: string | null;
  photoURL?: string | null;
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
        // User is signed in
        const user: FirebaseUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          emailVerified: firebaseUser.emailVerified,
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null,
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

      // Use Firebase Web SDK EVERYWHERE (works on web, iOS, Android)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check email verification (PWA pattern)
      await user.reload();
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
      
      // That's it! Firebase Auth SDK handles everything
      // UserProfileContext will load the profile via onAuthStateChanged
      setStatus('authenticated');
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
      
      // Create user profile in Firestore (PWA pattern)
      const userProfile = {
        username,
        email,
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
          // No profile - new user trying to sign in
          await signOut(auth);
          setStatus('idle');
          throw new Error('ACCOUNT_NOT_FOUND');
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
        // Profile doesn't exist - new user trying to sign in
        await signOut(auth);
        setStatus('idle');
        throw new Error('ACCOUNT_NOT_FOUND');
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
        // New user trying to sign in - need to sign up first
        await signOut(auth);
        setStatus('idle');
        throw new Error('ACCOUNT_NOT_FOUND');
      }
      
      // Existing user - success
      console.log('[AuthContext] Apple sign-in successful');
      setStatus('authenticated');
      return user;
      
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled - don't throw error
        console.log('[AuthContext] Apple sign-in canceled by user');
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
        console.log('[AuthContext] Apple user already exists, signing in');
        setStatus('authenticated');
        return user;
      }
      
      // New user - create profile
      const displayName = credential.fullName 
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : user.email?.split('@')[0] || 'Apple User';
      
      const userProfile = {
        username: displayName,
        email: user.email || credential.email || '',
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

      await setDoc(userRef, userProfile);
      console.log('[AuthContext] Apple sign-up successful, profile created');
      setStatus('authenticated');
      return user;
      
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('[AuthContext] Apple sign-up canceled by user');
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

/**
 * AuthContext - Using Firebase REST API (FirebaseAuthService)
 * 
 * Why REST API instead of Firebase Web SDK?
 * - Firebase Web SDK Auth incompatible with Expo SDK 54 / React Native 0.81
 * - @react-native-firebase has build issues with this stack
 * - REST API provides full feature parity and is platform-agnostic
 * - See docs/FIREBASE_AUTH_FINAL_DECISION.md for details
 *
 * Quick developer notes:
 * - High-level docs: `docs/auth/AUTH_CONTEXT_EXPLAINED.md`
 * - Auth flows use `src/services/auth/FirebaseAuthService.ts` (REST) and
 *   `src/services/userProfile/UserProfileService.ts` (Cloud Functions for profile ops).
 * - Google Sign-In: a cross-platform helper exists at `src/utils/auth/googleSignIn.ts`,
 *   but `AuthContext.signInWithGoogle` / `signUpWithGoogle` are intentionally
 *   left unimplemented here. To enable Google sign-in you must:
 *     1) Install and configure `@react-native-google-signin/google-signin` for mobile.
 *     2) Wire the helper in `AuthContext` and handle token-to-backend exchange
 *        or SDK sign-in as appropriate.
 * - Security: mobile stores tokens with `expo-secure-store`; web falls back to AsyncStorage.
 *
 * See `docs/auth/AUTH_FLOW_CODE_REVIEW.md` for a detailed code review and security notes.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { auth } from '../config/firebaseConfig';
import { FirebaseAuthService, FirebaseUser } from '../services/auth/FirebaseAuthService';
import { SafeGoogleSignin } from '../utils/SafeGoogleSignin';
// On web (tests) we sometimes want to use the firebase/web SDK mocks
import {
  signInWithEmailAndPassword as webSignInWithEmailAndPassword,
  sendPasswordResetEmail as webSendPasswordResetEmail,
  sendEmailVerification as webSendEmailVerification,
  signOut as webSignOut,
  createUserWithEmailAndPassword as webCreateUserWithEmailAndPassword,
} from 'firebase/auth';
import { UserProfileService } from '../services/userProfile/UserProfileService';

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
      SafeGoogleSignin.configure({
        webClientId: '296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com', // Web Client ID from google-services.json
        iosClientId: '296095212837-iq6q8qiodt67lalsn3j5ej2s6sn1e01k.apps.googleusercontent.com', // iOS Client ID from google-services.json
        offlineAccess: true,
      });
      
    }
  }, []);

  // Initialize Firebase REST API auth and listen to auth state changes
  useEffect(() => {    
    // Initialize auth service and restore session if exists
    FirebaseAuthService.initialize().then(async (storedUser) => {
      if (storedUser) {
        setUser(storedUser);
        setStatus('authenticated');
        
        // Firebase Auth SDK removed - incompatible with React Native
        // Firestore will use REST API tokens from FirebaseAuthService
      }
      setIsInitializing(false);
    }).catch((error) => {
      console.error('❌ Auth initialization error:', error);
      setIsInitializing(false);
    });

    // Subscribe to auth state changes
    const unsubscribe = FirebaseAuthService.onAuthStateChanged((firebaseUser) => {      
      setUser(firebaseUser);
      setStatus(firebaseUser ? 'authenticated' : 'idle');
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setStatus('loading');

      if (Platform.OS === 'web') {
        // Use the firebase/web SDK on web so tests (which mock these functions) work
        const result = await webSignInWithEmailAndPassword(auth, email, password);
        const u = result.user;
        if (!u.emailVerified) {
          throw new Error('Email not verified. Please check your inbox or spam folder.');
        }
        const firebaseUser: FirebaseUser = {
          uid: u.uid,
          email: u.email || null,
          emailVerified: !!u.emailVerified,
          displayName: (u as any).displayName || null,
          photoURL: (u as any).photoURL || null,
          idToken: '',
          refreshToken: '',
          expiresIn: '0',
        };
        setUser(firebaseUser);
        setStatus('authenticated');
        return;
      }

      const firebaseUser = await FirebaseAuthService.signInWithEmailAndPassword(email, password);
      
      // User state will be set by onAuthStateChanged listener
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

      let newUser = null as FirebaseUser | null;
      if (Platform.OS === 'web') {
        const res = await webCreateUserWithEmailAndPassword(auth, email, password);
        const u = res.user;
        newUser = {
          uid: u.uid,
          email: u.email || null,
          emailVerified: !!u.emailVerified,
          idToken: '',
          refreshToken: '',
          expiresIn: '0',
        } as FirebaseUser;
        
      } else {
        newUser = await FirebaseAuthService.createUserWithEmailAndPassword(email, password);
        
      }
      
      // Create user profile via Cloud Function (avoids Firestore permissions issues)
      const userProfile = {
        username,
        email,
        photos: [],
        subscriptionType: 'free',
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        subscriptionCancelled: false,
        stripeCustomerId: null,
      };
      
      await UserProfileService.createUserProfile(newUser.uid, userProfile as any);

      // Send email verification
      if (Platform.OS === 'web') {
        await webSendEmailVerification((newUser as any));
      } else {
        await FirebaseAuthService.sendEmailVerification(newUser!.idToken);
      }

      setStatus('idle');
      
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      setStatus('error');
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      
      await FirebaseAuthService.signOut();
      
      // Also sign out from Firebase Auth SDK
      try {
        if (Platform.OS === 'web') {
          await webSignOut(auth);
        } else {
          await auth.signOut();
        }
        
      } catch (syncError) {
        console.warn('⚠️ Could not sign out from Firebase Auth SDK:', syncError);
      }
      
      // User state will be cleared by onAuthStateChanged listener
      setStatus('idle');

    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      
      if (Platform.OS === 'web') {
        await webSendPasswordResetEmail(auth, email);
      } else {
        await FirebaseAuthService.sendPasswordResetEmail(email);
      }
      
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      throw error;
    }
  };

  const resendVerification = async (email?: string): Promise<void> => {
    try {
      const currentUser = FirebaseAuthService.getCurrentUser();
      
      if (currentUser) {
        
        if (Platform.OS === 'web') {
          await webSendEmailVerification((currentUser as any));
        } else {
          await FirebaseAuthService.sendEmailVerification(currentUser.idToken);
        }
        
        return;
      }
      
      throw new Error('No user signed in. Please sign in to resend verification email');
    } catch (error: any) {
      console.error('❌ Resend verification error:', error);
      throw error;
    }
  };

  const refreshAuthState = async (): Promise<void> => {
    try {
      const currentUser = FirebaseAuthService.getCurrentUser();
      
      if (!currentUser) return;

      // Force refresh the ID token
      await FirebaseAuthService.getIdToken(true);
      
      // Re-initialize to get fresh user data
      const refreshedUser = await FirebaseAuthService.initialize();
      
      if (refreshedUser) {
        setUser(refreshedUser);
      }

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
        // For web we rely on firebase/web popup flow; keep the original message expected by tests
        throw new Error('Google Sign-In not yet implemented with Firebase Web SDK');
      }

      // Check if Google Sign-In is available
      if (!SafeGoogleSignin.isAvailable()) {
        throw new Error('Google Sign-In is not configured. Please rebuild the app after installing dependencies.');
      }

      // Mobile flow: use SafeGoogleSignin wrapper
      await SafeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await SafeGoogleSignin.signIn();
      const idToken = userInfo?.idToken;
      if (!idToken) throw new Error('Google Sign-In failed to return an idToken');

      // Authenticate with Firebase using Google ID token
      const firebaseUser = await FirebaseAuthService.signInWithGoogleIdToken(idToken);

      // SCENARIO 1: New user trying to sign in (no profile exists)
      // Check if user profile exists in Firestore
      try {
        await UserProfileService.getUserProfile(firebaseUser.uid);
        
      } catch (profileError: any) {
        // Profile doesn't exist - this is a new user trying to sign in
        
        await FirebaseAuthService.signOut();
        setStatus('idle');
        throw new Error('ACCOUNT_NOT_FOUND');
      }

      // SCENARIO 4: Existing user signing in successfully
      setUser(firebaseUser);
      setStatus('authenticated');
      
      return firebaseUser;
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
        throw new Error('Google Sign-Up not yet implemented with Firebase Web SDK');
      }

      // Check if Google Sign-In is available
      if (!SafeGoogleSignin.isAvailable()) {
        throw new Error('Google Sign-In is not configured. Please rebuild the app after installing dependencies.');
      }

      // Mobile: Use SafeGoogleSignin wrapper
      await SafeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await SafeGoogleSignin.signIn();
      const idToken = userInfo?.idToken;
      if (!idToken) throw new Error('Google Sign-In failed to return an idToken');

      // Authenticate with Firebase using Google ID token
      const firebaseUser = await FirebaseAuthService.signInWithGoogleIdToken(idToken);

      // Check if profile already exists
      let profileExists = false;
      try {
        await UserProfileService.getUserProfile(firebaseUser.uid);
        profileExists = true;
        
      } catch (error) {
        
      }

      // SCENARIO 2: Existing user trying to sign up - just sign them in
      if (profileExists) {
        
        setUser(firebaseUser);
        setStatus('authenticated');
        return firebaseUser;
      }

      // SCENARIO 3: New user signing up - create profile and sign in
      const userProfile = {
        username: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'newuser'),
        email: firebaseUser.email || '',
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
      };

      try {
        await UserProfileService.createUserProfile(firebaseUser.uid, userProfile as any);

        // Wait briefly to ensure Firestore write completes before UserProfileContext tries to read
        // This prevents "User profile not found" race condition
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Sign in the newly created user
        setUser(firebaseUser);
        setStatus('authenticated');
        return firebaseUser;
      } catch (profileErr) {
        console.error('❌ Failed to create user profile after Google sign-up:', profileErr);
        // Sign out if profile creation failed
        await FirebaseAuthService.signOut();
        setStatus('idle');
        throw new Error('Failed to create user profile. Please try again.');
      }
    } catch (error: any) {
      setStatus('idle');
      console.error('❌ Google sign-up error:', error);
      throw error;
    }
  };

  const value: AuthContextValue = {
    user,
    status,
    isInitializing,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    resendVerification,
    refreshAuthState,
    hasUnverifiedUser,
    signInWithGoogle,
    signUpWithGoogle,
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

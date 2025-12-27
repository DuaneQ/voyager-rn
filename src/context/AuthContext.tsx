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
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
      // Production OAuth client IDs (mundo1-1)
      SafeGoogleSignin.configure({
        webClientId: '533074391000-uotb4gkkr75tdi2f9vvnffecj0oqbj16.apps.googleusercontent.com', // Production Web Client ID
        iosClientId: '533074391000-quot684rc8kugrni3eh2c6bsq3u5rcqs.apps.googleusercontent.com', // Production iOS Client ID
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
    console.log(`[AuthContext.signIn] 🔐 Starting sign in for: ${email}`);
    try {
      setStatus('loading');

      if (Platform.OS === 'web') {
        console.log('[AuthContext.signIn] Using web SDK sign in');
        // Use the firebase/web SDK on web so tests (which mock these functions) work
        const result = await webSignInWithEmailAndPassword(auth, email, password);
        const u = result.user;
        console.log(`[AuthContext.signIn] ✅ Web sign in successful, email verified: ${u.emailVerified}`);
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

      // Use Firebase Auth SDK directly (same as PWA)
      console.log('[AuthContext.signIn] Using Firebase Auth SDK sign in');
      const result = await webSignInWithEmailAndPassword(auth, email, password);
      const u = result.user;
      console.log(`[AuthContext.signIn] ✅ Auth SDK sign in successful, email verified: ${u.emailVerified}`);
      
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
      
      // Profile loading happens automatically via onAuthStateChanged
      console.log('[AuthContext.signIn] ✅ Sign in complete');
    } catch (error: any) {
      console.error('[AuthContext.signIn] ❌ Sign in error:', error);
      setStatus('error');
      throw error;
    }
  };

  const signUp = async (username: string, email: string, password: string): Promise<void> => {
    try {
      console.log('🔥 [SignUp] Starting signup flow for:', email);
      setStatus('loading');

      // Use firebase/auth SDK directly on all platforms - it works on React Native!
      // This automatically signs the user in, so Firestore will have auth context
      console.log('🔥 [SignUp] Calling createUserWithEmailAndPassword...');
      const res = await webCreateUserWithEmailAndPassword(auth, email, password);
      console.log('🔥 [SignUp] User created successfully:', res.user.uid);
      
      const u = res.user;
      
      const newUser: FirebaseUser = {
        uid: u.uid,
        email: u.email || null,
        emailVerified: !!u.emailVerified,
        idToken: '',
        refreshToken: '',
        expiresIn: '0',
      };

      // Create complete user profile data (matching PWA exactly)
      const userDataWithSubscription = {
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
      };

      console.log('🔥 [SignUp] Writing profile to Firestore for uid:', newUser.uid);
      console.log('🔥 [SignUp] Current auth.currentUser:', auth.currentUser?.uid);
      
      // Write directly to Firestore (same as PWA)
      // User is already signed in via createUserWithEmailAndPassword
      const docRef = doc(db, 'users', newUser.uid);
      await setDoc(docRef, userDataWithSubscription, { merge: true });
      
      console.log('🔥 [SignUp] Profile written successfully to Firestore!');

      // Send verification email
      console.log('🔥 [SignUp] Sending verification email...');
      await webSendEmailVerification(u);
      console.log('🔥 [SignUp] Verification email sent!');

      setStatus('idle');
      console.log('🔥 [SignUp] Signup complete!');
      
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
      
      if (currentUser && !email) {
        // User is signed in - use client SDK
        if (Platform.OS === 'web') {
          await webSendEmailVerification((currentUser as any));
        } else {
          const idToken = await FirebaseAuthService.getIdToken(true);
          if (!idToken) {
            throw new Error('Session expired. Please sign up again.');
          }
          await FirebaseAuthService.sendEmailVerification(idToken);
        }
        return;
      }
      
      // Email required if no user is signed in
      if (!email) {
        throw new Error('No user signed in. Please sign in to resend verification email');
      }
      
      // Email provided - use Cloud Function with Admin SDK (required for generateEmailVerificationLink)
      const functions = getFunctions();
      const resendVerificationEmail = httpsCallable(functions, 'resendVerificationEmail');
      const result = await resendVerificationEmail({ email });
      
      if (!(result.data as any)?.success) {
        throw new Error((result.data as any)?.message || 'Failed to send verification email');
      }
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

      // Use Firebase Auth SDK directly (like PWA and like signUpWithGoogle)
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const u = userCredential.user;

      // SCENARIO 1: New user trying to sign in (no profile exists)
      // Check if user profile exists in Firestore
      try {
        await UserProfileService.getUserProfile(u.uid);
        
      } catch (profileError: any) {
        // Profile doesn't exist - this is a new user trying to sign in
        
        await auth.signOut();
        setStatus('idle');
        throw new Error('ACCOUNT_NOT_FOUND');
      }

      // SCENARIO 4: Existing user signing in successfully
      const firebaseUser: FirebaseUser = {
        uid: u.uid,
        email: u.email || null,
        emailVerified: !!u.emailVerified,
        displayName: u.displayName || null,
        photoURL: u.photoURL || null,
        idToken: '',
        refreshToken: '',
        expiresIn: '0',
      };
      
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
      console.log('🔥 [GoogleSignUp] Starting Google signup flow...');
      setStatus('loading');

      if (Platform.OS === 'web') {
        throw new Error('Google Sign-Up not yet implemented with Firebase Web SDK');
      }

      // Check if Google Sign-In is available
      if (!SafeGoogleSignin.isAvailable()) {
        throw new Error('Google Sign-In is not configured. Please rebuild the app after installing dependencies.');
      }

      // Mobile: Use SafeGoogleSignin wrapper
      console.log('🔥 [GoogleSignUp] Checking Play Services...');
      await SafeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      console.log('🔥 [GoogleSignUp] Prompting user to sign in with Google...');
      const userInfo = await SafeGoogleSignin.signIn();
      const idToken = userInfo?.idToken;
      if (!idToken) throw new Error('Google Sign-In failed to return an idToken');

      console.log('🔥 [GoogleSignUp] Got Google ID token, signing in to Firebase Auth SDK...');
      
      // Use Firebase Auth SDK directly (like PWA) - creates GoogleAuthProvider credential
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const u = userCredential.user;
      
      console.log('🔥 [GoogleSignUp] Firebase Auth successful, user ID:', u.uid);

      // Check if profile already exists
      let profileExists = false;
      try {
        console.log('🔥 [GoogleSignUp] Checking if profile exists...');
        await UserProfileService.getUserProfile(u.uid);
        profileExists = true;
        console.log('🔥 [GoogleSignUp] Profile exists - signing in existing user');
      } catch (error) {
        console.log('🔥 [GoogleSignUp] No profile found - new user signup');
      }

      // SCENARIO 2: Existing user trying to sign up - just sign them in
      if (profileExists) {
        const firebaseUser: FirebaseUser = {
          uid: u.uid,
          email: u.email || null,
          emailVerified: !!u.emailVerified,
          displayName: u.displayName || null,
          photoURL: u.photoURL || null,
          idToken: '',
          refreshToken: '',
          expiresIn: '0',
        };
        
        setUser(firebaseUser);
        setStatus('authenticated');
        return firebaseUser;
      }

      // SCENARIO 3: New user signing up - write directly to Firestore (same as PWA)
      const userProfile = {
        username: u.displayName || (u.email ? u.email.split('@')[0] : 'newuser'),
        email: u.email || '',
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

      console.log('🔥 [GoogleSignUp] Creating new profile in Firestore...');
      console.log('🔥 [GoogleSignUp] Current auth.currentUser:', auth.currentUser?.uid);
      
      // Write directly to Firestore (same as PWA)
      // User is already signed in via signInWithCredential
      const docRef = doc(db, 'users', u.uid);
      await setDoc(docRef, userProfile, { merge: true });
      
      console.log('🔥 [GoogleSignUp] Profile created successfully!');

      const firebaseUser: FirebaseUser = {
        uid: u.uid,
        email: u.email || null,
        emailVerified: !!u.emailVerified,
        displayName: u.displayName || null,
        photoURL: u.photoURL || null,
        idToken: '',
        refreshToken: '',
        expiresIn: '0',
      };
      
      // Sign in the newly created user
      setUser(firebaseUser);
      setStatus('authenticated');
      console.log('🔥 [GoogleSignUp] Google signup complete!');
      return firebaseUser;
      
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

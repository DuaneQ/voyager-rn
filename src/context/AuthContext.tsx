/**
 * AuthContext - Simplified to match PWA exactly
 * 
 * Provides authentication state and methods matching voyager-pwa's patterns:
 * - Uses Firebase Auth directly (no over-architected service layers)
 * - Stores USER_CREDENTIALS and PROFILE_INFO in cross-platform storage
 * - Matches PWA's SignInForm/SignUpForm logic exactly
 * 
 * Cross-platform storage:
 * - Web: localStorage (same as PWA)
 * - iOS/Android: AsyncStorage
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { Platform } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import storage from '../utils/storage';
import SafeGoogleSignin from '../utils/SafeGoogleSignin';

interface UserCredentials {
  user: {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerData: any[];
  };
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: (email?: string) => Promise<void>;
  refreshAuthState: () => Promise<void>;
  hasUnverifiedUser: () => boolean;
  // Google flows (web + mobile)
  signInWithGoogle: () => Promise<any>;
  signUpWithGoogle: () => Promise<any>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Initialize authentication state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing authentication state...');
        const storedCreds = await storage.getItem('USER_CREDENTIALS');
        
        if (storedCreds) {
          const credentials: UserCredentials = JSON.parse(storedCreds);
          console.log('📱 Found stored credentials for user:', credentials.user.uid);
          
          // Let onAuthStateChanged handle the actual authentication state
          // This just helps us know we should expect a user
        } else {
          console.log('📱 No stored credentials found');
        }
      } catch (error) {
        console.warn('⚠️ Failed to initialize auth state:', error);
      }
    };

    initializeAuth();
  }, []);

  // Initialize Google Sign-In for mobile
  useEffect(() => {
    if (Platform.OS !== 'web' && SafeGoogleSignin.isAvailable()) {
      try {
        // Configure Google Sign-In
        SafeGoogleSignin.configure({
          // Web Client ID from Firebase Console (for ID token verification)
          webClientId: '296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com',
          
          // iOS Client ID from GoogleService-Info.plist
          iosClientId: '296095212837-rtahvr97ah2u3hhs6783t4cofnlis0jj.apps.googleusercontent.com',
          
          offlineAccess: true,
        });
        
        console.log('Google Sign-In configured successfully');
      } catch (error) {
        // Don't crash the app if Google Sign-In configuration fails
        console.warn('Google Sign-In configuration failed:', error instanceof Error ? error.message : error);
      }
    } else if (Platform.OS !== 'web') {
      console.warn('Google Sign-In native module not available - Google login will be disabled');
    }
  }, []);

    // Listen to auth state changes (same pattern as PWA)
  useEffect(() => {
    // Use Firebase onAuthStateChanged listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Auth state changed:', firebaseUser ? `User ${firebaseUser.uid} (verified: ${firebaseUser.emailVerified})` : 'No user');
      
      if (firebaseUser) {
        // Store user credentials regardless of email verification status
        // This allows resendVerification to work properly
        const userCredentials: UserCredentials = {
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            isAnonymous: firebaseUser.isAnonymous,
            providerData: firebaseUser.providerData,
          },
        };

        await storage.setItem('USER_CREDENTIALS', JSON.stringify(userCredentials));

        if (firebaseUser.emailVerified) {
          // User is verified - grant full access
          console.log('✅ User authenticated with verified email');
          setUser(firebaseUser);
          setStatus('authenticated');
        } else {
          // User exists but email not verified
          // Keep them signed out from the app's perspective but don't clear Firebase auth
          // This preserves auth.currentUser for resendVerification to work
          console.log('⚠️ User has unverified email, keeping in idle state');
          setUser(null);  // App treats them as not authenticated
          setStatus('idle');  // Show login/verification UI
          // Note: We do NOT call firebaseSignOut or clear USER_CREDENTIALS
          // This preserves the Firebase auth session for resendVerification
        }
      } else {
        // No Firebase user at all
        console.log('ℹ️ No Firebase user, clearing stored data');
        await storage.removeItem('USER_CREDENTIALS');
        await storage.removeItem('PROFILE_INFO');
        setUser(null);
        setStatus('idle');
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Sign in with email and password
   * Matches PWA's SignInForm.tsx handleSubmit logic exactly
   */
  const signIn = async (email: string, password: string) => {
    setStatus('loading');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user as any;

      // Reload to get fresh emailVerified status (some SDKs provide reload)
      if (typeof user.reload === 'function') {
        await user.reload();
      }

      if (!user.emailVerified) {
        throw new Error('Email not verified. Please check your inbox or spam folder.');
      }

      const userCredentials: UserCredentials = {
        user: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
          providerData: user.providerData,
        },
      };

      await storage.setItem('USER_CREDENTIALS', JSON.stringify(userCredentials));
      setUser(user as any);
      setStatus('authenticated');
    } catch (error) {
      setUser(null);
      setStatus('idle');
      throw error;
    }
  };

  /**
   * Sign up with email and password
   * Matches PWA's SignUpForm.tsx handleSubmit logic exactly
   */
  const signUp = async (username: string, email: string, password: string) => {
    setStatus('loading');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send verification email immediately (matches PWA)
      await sendEmailVerification(userCredential.user);

      // Create user profile in Firestore (matches PWA exactly)
      const userData: UserProfile = {
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

      await setDoc(doc(db, 'users', userCredential.user.uid), userData, { merge: true });

      // Store profile in local storage (matches PWA)
      await storage.setItem('PROFILE_INFO', JSON.stringify(userData));

      // Don't sign out the user after account creation!
      // Keep them signed in to Firebase Auth so resendVerification can work
      // The onAuthStateChanged listener will set status to 'idle' because email is unverified
      // but will preserve auth.currentUser for verification functionality
      console.log('✅ Account created successfully, user remains in Firebase auth for verification');
      
      // Status will be set to 'idle' by onAuthStateChanged due to unverified email
      // but auth.currentUser will remain available for resendVerification
    } catch (error) {
  setStatus('idle');
      throw error;
    }
  };

  // Google sign-in / sign-up (mobile + web fallback)
  const signInWithGoogle = async () => {
    // Web fallback: use popup
    if (Platform.OS === 'web') {
      const provider = new GoogleAuthProvider();
      return signInWithPopup(auth, provider);
    }

    // Mobile: use SafeGoogleSignin wrapper
    try {
      if (!SafeGoogleSignin.isAvailable()) {
        throw new Error('Google Sign-In is not available. Please ensure the app is properly configured.');
      }

      await SafeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await SafeGoogleSignin.signIn();
      
      // Extract idToken from the response (v7+ uses data property)
      const idToken = userInfo?.data?.idToken || userInfo?.idToken;
      if (!idToken) {
        console.error('Google Sign-In response:', JSON.stringify(userInfo, null, 2));
        throw new Error('No idToken from Google Signin');
      }
      
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential as any);
      return result;
    } catch (e) {
      // Surface friendly error
      throw e;
    }
  };

  const signUpWithGoogle = async () => {
    // For most flows signInWithGoogle will create the account if it doesn't exist
    return signInWithGoogle();
  };

  /**
   * Sign out
   * Matches PWA logout logic
   */
  const signOut = async () => {
    console.log('🚪 Signing out user...');
    try {
      await firebaseSignOut(auth);
      await storage.removeItem('USER_CREDENTIALS');
      await storage.removeItem('PROFILE_INFO');
      setUser(null);
      setStatus('idle');
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Error during sign out:', error);
      // Force cleanup even if Firebase signOut fails
      await storage.removeItem('USER_CREDENTIALS');
      await storage.removeItem('PROFILE_INFO');
      setUser(null);
      setStatus('idle');
    }
  };

  /**
   * Refresh authentication state
   * Useful for recovering from session issues
   */
  const refreshAuthState = async () => {
    console.log('🔄 Refreshing authentication state...');
    
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        console.log('✅ Auth state refreshed successfully');
      } catch (error) {
        console.error('❌ Failed to refresh auth state:', error);
        throw error;
      }
    } else {
      console.log('ℹ️ No current user to refresh');
    }
  };

  /**
   * Check if there's an unverified user session available for resend verification
   */
  const hasUnverifiedUser = () => {
    return auth.currentUser && !auth.currentUser.emailVerified;
  };

  /**
   * Send password reset email
   * Enhanced with better error handling and validation
   */
  const sendPasswordReset = async (email: string) => {
    console.log('🔑 Sending password reset email to:', email);
    
    if (!email || !email.trim()) {
      throw new Error('Email address is required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address');
    }
    
    try {
      await sendPasswordResetEmail(auth, email.trim());
      console.log('✅ Password reset email sent successfully');
    } catch (error: any) {
      console.error('❌ Password reset email failed:', error);
      
      // Provide more specific error messages based on Firebase error codes
      switch (error.code) {
        case 'auth/user-not-found':
          throw new Error('No account found with this email address');
        case 'auth/invalid-email':
          throw new Error('Invalid email address');
        case 'auth/too-many-requests':
          throw new Error('Too many requests. Please try again later');
        case 'auth/network-request-failed':
          throw new Error('Network error. Please check your connection and try again');
        default:
          throw new Error(error.message || 'Failed to send password reset email');
      }
    }
  };

  /**
   * Resend verification email
   * Works with unverified users by preserving Firebase auth session
   */
  const resendVerification = async (email?: string) => {
    console.log('📧 Resend verification called - auth.currentUser:', !!auth.currentUser, 'emailVerified:', auth.currentUser?.emailVerified, 'email param:', email);
    
    // Check if we have a Firebase auth user (including unverified ones)
    if (auth.currentUser) {
      try {
        // Reload user to get fresh auth state
        await auth.currentUser.reload();
        
        // Check if email is already verified
        if (auth.currentUser.emailVerified) {
          console.log('ℹ️ Email is already verified');
          throw new Error('Email is already verified. Please refresh the app.');
        }
        
        console.log('📤 Sending verification email to:', auth.currentUser.email);
        await sendEmailVerification(auth.currentUser);
        console.log('✅ Verification email sent successfully');
        return;
      } catch (error: any) {
        console.error('❌ Failed to send verification email:', error);
        
        // Provide more specific error messages
        switch (error.code) {
          case 'auth/too-many-requests':
            throw new Error('Too many requests. Please wait before requesting another verification email');
          case 'auth/network-request-failed':
            throw new Error('Network error. Please check your connection and try again');
          case 'auth/user-token-expired':
            throw new Error('Session expired. Please sign in again to resend verification email');
          default:
            throw error;
        }
      }
    }

    // No Firebase auth user - check if we have stored credentials to help the user
    try {
      const storedCreds = await storage.getItem('USER_CREDENTIALS');
      if (storedCreds) {
        const credentials: UserCredentials = JSON.parse(storedCreds);
        console.log('⚠️ Found stored credentials but no Firebase user:', credentials.user.email);
        
        if (credentials.user.email && !credentials.user.emailVerified) {
          throw new Error(`Your session has expired. Please sign in again with ${credentials.user.email} to resend the verification email.`);
        }
      }
    } catch (storageError) {
      console.warn('Could not check stored credentials:', storageError);
    }

    // No current user and no helpful stored data
    throw new Error('No user session found. Please sign in first to resend the verification email.');
  };

  return (
    <AuthContext.Provider value={{
      user,
      status,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      resendVerification,
      refreshAuthState,
      hasUnverifiedUser,
      // Google flows
      signInWithGoogle,
      signUpWithGoogle,
    } as any}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook for using AuthContext
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


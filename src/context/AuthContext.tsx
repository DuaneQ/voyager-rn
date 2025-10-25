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

  // Listen to auth state changes (same pattern as PWA)
  useEffect(() => {
    // Use Firebase onAuthStateChanged listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Only treat the user as authenticated when their email is verified.
        // This prevents newly-created but unverified accounts from driving
        // navigation into the app before email verification.
        if (firebaseUser.emailVerified) {
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
          setUser(firebaseUser);
          setStatus('authenticated');
        } else {
          // Unverified user - clear any stored credentials and ensure app
          // treats them as signed-out so UI will present sign-in / verify flow.
          await storage.removeItem('USER_CREDENTIALS');
          await storage.removeItem('PROFILE_INFO');
          // Try to sign out to fully clear the auth session (safe to ignore errors)
          try {
            await firebaseSignOut(auth);
          } catch (e) {
            // ignore
          }
          setUser(null);
          setStatus('idle');
        }
      } else {
        await storage.removeItem('USER_CREDENTIALS');
        await storage.removeItem('PROFILE_INFO');
        setUser(null);
        // match legacy tests which expect 'idle' on no user
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

      // Send verification email already sent above. Now sign the user out so
      // the app does not treat an unverified session as an authenticated user.
      // The onAuthStateChanged listener will keep the app on the sign-in/idle
      // state until the user verifies their email (or signs in again).
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        // ignore sign-out errors
      }

      setStatus('idle'); // User needs to verify email before being authenticated
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

    // Mobile: use react-native-google-signin if available
    try {
      // dynamic require to avoid module errors in environments where it's not installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken;
      if (!idToken) throw new Error('No idToken from Google Signin');
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
    await firebaseSignOut(auth);
    await storage.removeItem('USER_CREDENTIALS');
    await storage.removeItem('PROFILE_INFO');
    setUser(null);
    setStatus('idle');
  };

  /**
   * Send password reset email
   * Matches PWA's Reset.tsx onSubmit logic exactly
   */
  const sendPasswordReset = async (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  /**
   * Resend verification email
   * Matches PWA's ResendEmail.tsx resendEmailVerification logic
   */
  const resendVerification = async (email?: string) => {
    if (auth.currentUser) {
      return sendEmailVerification(auth.currentUser);
    }

    throw new Error('No user logged in. Please sign in first.');
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


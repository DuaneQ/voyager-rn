/**
 * AuthContext - Using Firebase REST API (FirebaseAuthService)
 * 
 * Why REST API instead of Firebase Web SDK?
 * - Firebase Web SDK Auth incompatible with Expo SDK 54 / React Native 0.81
 * - @react-native-firebase has build issues with this stack
 * - REST API provides full feature parity and is platform-agnostic
 * - See docs/FIREBASE_AUTH_FINAL_DECISION.md for details
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { auth } from '../config/firebaseConfig';
import { FirebaseAuthService, FirebaseUser } from '../services/auth/FirebaseAuthService';
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

  // Initialize Firebase REST API auth and listen to auth state changes
  useEffect(() => {
    console.log('🔐 Initializing Firebase Auth Service...');
    
    // Initialize auth service and restore session if exists
    FirebaseAuthService.initialize().then(async (storedUser) => {
      if (storedUser) {
        console.log('🔥 Restored user session:', storedUser.uid);
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
      console.log('🔥 Auth state changed:', firebaseUser ? `User ${firebaseUser.uid}` : 'No user');
      
      setUser(firebaseUser);
      setStatus(firebaseUser ? 'authenticated' : 'idle');
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setStatus('loading');
      console.log('🔐 Signing in user:', email);

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
      console.log('✅ Sign in successful:', firebaseUser.uid);
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
      console.log('📝 Creating new user:', email);

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
        console.log('✅ User created (web):', newUser.uid);
      } else {
        newUser = await FirebaseAuthService.createUserWithEmailAndPassword(email, password);
        console.log('✅ User created:', newUser.uid);
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
      
      console.log('✅ User profile created via Cloud Function');
      
      // Send email verification
      if (Platform.OS === 'web') {
        await webSendEmailVerification((newUser as any));
      } else {
        await FirebaseAuthService.sendEmailVerification(newUser!.idToken);
      }
      console.log('✅ Verification email sent');

      setStatus('idle');
      
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      setStatus('error');
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🔓 Signing out...');
      await FirebaseAuthService.signOut();
      
      // Also sign out from Firebase Auth SDK
      try {
        if (Platform.OS === 'web') {
          await webSignOut(auth);
        } else {
          await auth.signOut();
        }
        console.log('✅ Signed out from Firebase Auth SDK');
      } catch (syncError) {
        console.warn('⚠️ Could not sign out from Firebase Auth SDK:', syncError);
      }
      
      // User state will be cleared by onAuthStateChanged listener
      setStatus('idle');
      
      console.log('✅ Sign out successful');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      console.log('📧 Sending password reset email to:', email);
      if (Platform.OS === 'web') {
        await webSendPasswordResetEmail(auth, email);
      } else {
        await FirebaseAuthService.sendPasswordResetEmail(email);
      }
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      throw error;
    }
  };

  const resendVerification = async (email?: string): Promise<void> => {
    try {
      const currentUser = FirebaseAuthService.getCurrentUser();
      
      if (currentUser) {
        console.log('📧 Resending verification email to:', currentUser.email);
        if (Platform.OS === 'web') {
          await webSendEmailVerification((currentUser as any));
        } else {
          await FirebaseAuthService.sendEmailVerification(currentUser.idToken);
        }
        console.log('✅ Verification email resent');
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
      
      console.log('🔄 Refreshing auth state...');
      
      // Force refresh the ID token
      await FirebaseAuthService.getIdToken(true);
      
      // Re-initialize to get fresh user data
      const refreshedUser = await FirebaseAuthService.initialize();
      
      if (refreshedUser) {
        setUser(refreshedUser);
      }
      
      console.log('✅ Auth state refreshed');
    } catch (error: any) {
      console.error('❌ Refresh auth state error:', error);
      throw error;
    }
  };

  const hasUnverifiedUser = (): boolean => {
    return user !== null && !user.emailVerified;
  };

  const signInWithGoogle = async (): Promise<any> => {
    throw new Error('Google Sign-In not yet implemented with Firebase Web SDK');
  };

  const signUpWithGoogle = async (): Promise<any> => {
    throw new Error('Google Sign-Up not yet implemented with Firebase Web SDK');
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

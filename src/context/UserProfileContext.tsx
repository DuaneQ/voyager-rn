/**
 * User Profile Context - Using Firebase Web SDK
 * Provides user profile data and authentication state management
 * 
 * Uses Firestore Web SDK directly for profile operations.
 * Profile is loaded after authentication via onAuthStateChanged.
 */

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode, Dispatch, SetStateAction } from 'react';
import { onSnapshot, setDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { db } from '../config/firebaseConfig';
import { UserProfile } from '../types/UserProfile';

// Re-export UserProfile for backwards compatibility
export type { UserProfile } from '../types/UserProfile';

interface UserProfileContextValue {
  userProfile: UserProfile | null;
  setUserProfile: Dispatch<SetStateAction<UserProfile | null>>;
  updateUserProfile: (newProfile: UserProfile) => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  isLoading: boolean;
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

interface UserProfileProviderProps {
  children: ReactNode;
}

const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use AuthContext to get user state and initialization status
  const { user, isInitializing } = useAuth();

  const updateUserProfile = useCallback((newProfile: UserProfile) => {
    setUserProfile(newProfile);
  }, []);

  // Update specific profile fields and persist to Firestore
  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const userId = user?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Use setDoc with merge to handle case where user document may not exist yet.
      // This is safer than updateDoc which throws "No document to update" if the
      // user's Firestore record is missing (e.g., orphaned auth, failed signup).
      await setDoc(doc(db, 'users', userId), data, { merge: true });

      // Update local state
      setUserProfile((prev) => {
        const updatedProfile = prev ? { ...prev, ...data } : (data as UserProfile);
        return updatedProfile;
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user]);

  // Subscribe to the user's Firestore document in real time.
  // onSnapshot fires immediately from the local cache on writes made
  // by this device (no extra network read billed), and pushes any
  // server-side changes automatically. The returned unsubscribe
  // function is called by React as effect cleanup, preventing stale
  // listeners after sign-out or user changes.
  useEffect(() => {
    // Wait for auth to resolve before subscribing.
    if (!user || isInitializing) {
      setIsLoading(false);
      setUserProfile(null);
      return;
    }

    // Don't load profile for unverified email addresses.
    if (!user.emailVerified) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setUserProfile({ uid: user.uid, ...snapshot.data() as UserProfile });
        } else {
          setUserProfile(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('[UserProfileContext] onSnapshot error:', error);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user, isInitializing]);

  return (
    <UserProfileContext.Provider 
      value={{ 
        userProfile, 
        setUserProfile, 
        updateUserProfile, 
        updateProfile,
        isLoading,
        loading: isLoading 
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

// Custom hook for using UserProfileContext
export const useUserProfile = (): UserProfileContextValue => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

export { UserProfileContext, UserProfileProvider };
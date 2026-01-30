/**
 * User Profile Context - Using Firebase Web SDK
 * Provides user profile data and authentication state management
 * 
 * Uses Firestore Web SDK directly for profile operations.
 * Profile is loaded after authentication via onAuthStateChanged.
 */

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { getDoc, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { db } from '../config/firebaseConfig';
import { UserProfile } from '../types/UserProfile';

// Re-export UserProfile for backwards compatibility
export type { UserProfile } from '../types/UserProfile';

interface UserProfileContextValue {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
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
      // Use Firestore Web SDK to update profile
      await updateDoc(doc(db, 'users', userId), data);

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

  // Load user profile data from Firestore
  useEffect(() => {
    let callCount = 0;
    const maxCalls = 5;
    
    const loadUserProfile = async () => {
      callCount++;
      console.log(`[UserProfileContext] 📞 loadUserProfile called (${callCount}/${maxCalls})`, {
        hasUser: !!user,
        userId: user?.uid,
        emailVerified: user?.emailVerified,
        isInitializing,
      });
      
      if (callCount > maxCalls) {
        console.error('[UserProfileContext] 🚨 INFINITE LOOP DETECTED in loadUserProfile!');
        return;
      }
      
      setIsLoading(true);
      try {
        const userId = user?.uid;
        const emailVerified = user?.emailVerified;

        // Only load profile if user exists AND email is verified
        if (userId && emailVerified) {
          console.log('[UserProfileContext] 🔍 Fetching profile from Firestore');
          // Get profile data from Firestore
          const userDoc = await getDoc(doc(db, 'users', userId));
          
          if (userDoc.exists()) {
            console.log('[UserProfileContext] ✅ Profile loaded successfully');
            // Include uid from auth in the profile
            setUserProfile({ 
              uid: userId,
              ...userDoc.data() as UserProfile 
            });
          } else {
            console.log('[UserProfileContext] ⚠️ Profile document does not exist');
          }
        }
      } catch (error) {
        console.error('[UserProfileContext] ❌ Error loading profile:', error);
        // If profile doesn't exist, that's okay - will be created during onboarding
      } finally {
        console.log('[UserProfileContext] 🏁 Setting isLoading to false');
        setIsLoading(false);
      }
    };

    console.log('[UserProfileContext] 🔵 useEffect triggered', {
      hasUser: !!user,
      isInitializing,
    });

    // Wait for auth initialization before loading profile
    if (user && !isInitializing) {
      loadUserProfile();
    } else {
      console.log('[UserProfileContext] ⏭️ Skipping profile load (no user or still initializing)');
      setIsLoading(false);
      setUserProfile(null);
    }
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
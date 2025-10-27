/**
 * User Profile Context - Exact replica of voyager-pwa UserProfileContext
 * Provides user profile data and authentication state management for React Native
 */

import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  username?: string;
  email?: string;
  bio?: string;
  dob?: string;
  gender?: string;
  sexualOrientation?: string;
  status?: string;
  edu?: string;
  drinking?: string;
  smoking?: string;
  /**
   * User photos, organized by slot. 'profile' is the main photo, 'slot1'-'slot4' are additional slots.
   * Each value is a URL string or undefined if not set.
   */
  photos?: {
    profile?: string;
    slot1?: string;
    slot2?: string;
    slot3?: string;
    slot4?: string;
    [key: string]: string | undefined;
  };
  subscriptionType?: string;
  subscriptionEndDate?: any;
  dailyUsage?: {
    date: string;
    viewCount: number;
    aiItineraries?: {
      date: string;
      count: number;
    };
  };
  // Phase 1 additions
  displayName?: string;
  photoURL?: string;
  location?: string;
  phoneNumber?: string;
}

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

  const updateUserProfile = useCallback((newProfile: UserProfile) => {
    setUserProfile(newProfile);
  }, []);

  // Update specific profile fields and persist to Firestore
  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const userId = auth?.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Update Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, data);

      // Update local state
      setUserProfile((prev) => (prev ? { ...prev, ...data } : null));

      // Update AsyncStorage cache
      const updatedProfile = { ...userProfile, ...data };
      await AsyncStorage.setItem('PROFILE_INFO', JSON.stringify(updatedProfile));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [userProfile]);

  // Load user profile data (same logic as PWA)
  useEffect(() => {
    const loadUserProfile = async () => {
      setIsLoading(true);
      try {
        const userId = auth?.currentUser?.uid;

        if (userId) {
          // Get fresh data from Firebase first (same as PWA)
          const userRef = await getDoc(doc(db, "users", userId));

          if (userRef.exists()) {
            const profile = userRef.data() as UserProfile;
            // Update AsyncStorage with fresh data (React Native equivalent of localStorage)
            await AsyncStorage.setItem("PROFILE_INFO", JSON.stringify(profile));
            setUserProfile(profile);
          } else {
            // Fall back to AsyncStorage if Firebase has no data
            const cachedProfile = await AsyncStorage.getItem("PROFILE_INFO");
            if (cachedProfile) {
              setUserProfile(JSON.parse(cachedProfile));
            }
          }
        }
      } catch (error) {
        // On error, try AsyncStorage as fallback (same logic as PWA)
        try {
          const cachedProfile = await AsyncStorage.getItem("PROFILE_INFO");
          if (cachedProfile) {
            setUserProfile(JSON.parse(cachedProfile));
          }
        } catch (storageError) {
          console.error("Error loading cached profile:", storageError);
        }
        console.log("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Listen for auth state changes (same logic as PWA)
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadUserProfile();
      } else {
        setIsLoading(false);
        setUserProfile(null);
      }
    });

    return unsubscribe;
  }, []);

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
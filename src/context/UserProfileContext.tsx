/**
 * User Profile Context - Exact replica of voyager-pwa UserProfileContext
 * Provides user profile data and authentication state management for React Native
 */

import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  username?: string;
  email?: string;
  bio?: string;
  dob?: string;
  gender?: string;
  sexualOrientation?: string;
  edu?: string;
  drinking?: string;
  smoking?: string;
  photos?: string[];
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
}

interface UserProfileContextValue {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  updateUserProfile: (newProfile: UserProfile) => void;
  isLoading: boolean;
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
    <UserProfileContext.Provider value={{ userProfile, setUserProfile, updateUserProfile, isLoading }}>
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
/**
 * User Profile Context - Using Firebase Web SDK
 * Provides user profile data and authentication state management
 * 
 * Uses Firestore Web SDK directly for profile operations.
 * Profile is loaded after authentication via onAuthStateChanged.
 */

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
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

let profileProviderRenderCount = 0;

const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  profileProviderRenderCount++;
  console.log(`[UserProfileProvider] 🔵 Rendering (count: ${profileProviderRenderCount})`);
  
  if (profileProviderRenderCount > 50) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 INFINITE LOOP IN USERPROFILEPROVIDER');
    console.error(`Rendered ${profileProviderRenderCount} times`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Log state changes
  useEffect(() => {
    console.log('[UserProfileContext] 🔄 State changed:', {
      hasProfile: !!userProfile,
      userId: userProfile?.uid,
      username: userProfile?.username,
      isLoading
    });
  }, [userProfile, isLoading]);
  
  // Track useMemo dependency changes
  const prevProfileRef = useRef(userProfile);
  const prevLoadingRef = useRef(isLoading);
  
  useEffect(() => {
    const profileChanged = prevProfileRef.current !== userProfile;
    const loadingChanged = prevLoadingRef.current !== isLoading;
    
    if (profileChanged || loadingChanged) {
      console.log('[UserProfileContext] 🔍 useMemo will recreate value because:', {
        profileChanged,
        loadingChanged,
        prevUserId: prevProfileRef.current?.uid,
        newUserId: userProfile?.uid,
        prevLoading: prevLoadingRef.current,
        newLoading: isLoading
      });
    }
    
    prevProfileRef.current = userProfile;
    prevLoadingRef.current = isLoading;
  }, [userProfile, isLoading]);
  
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
            const profileData = { 
              uid: userId,
              ...userDoc.data() as UserProfile
            };
            console.log('[UserProfileContext] 📦 Profile data:', {
              uid: profileData.uid,
              username: profileData.username,
              email: profileData.email,
              hasPhotos: !!profileData.photos?.length
            });
            // Include uid from auth in the profile
            setUserProfile(profileData);
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

  const value = useMemo(() => {
    console.log('[UserProfileContext] 📝 Creating context value', {
      hasProfile: !!userProfile,
      userId: userProfile?.uid,
      isLoading
    });
    return {
      userProfile, 
      setUserProfile, 
      updateUserProfile, 
      updateProfile,
      isLoading,
      loading: isLoading
    };
  }, [userProfile, isLoading, updateUserProfile, updateProfile]);

  return (
    <UserProfileContext.Provider value={value}>
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
/**
 * User Profile Context - Using Cloud Functions
 * Provides user profile data and authentication state management
 * 
 * IMPORTANT: Uses Cloud Functions instead of direct Firestore access
 * This is because REST API auth doesn't provide request.auth context to Firestore,
 * causing "Missing or insufficient permissions" errors.
 */

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { UserProfileService } from '../services/userProfile/UserProfileService';
import type { UserProfile as ServiceUserProfile } from '../services/userProfile/UserProfileService';

// Type alias for consistency with existing code
type UserProfile = ServiceUserProfile;

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
  
  // Use AuthContext to get user state (prevents duplicate auth initialization)
  const { user } = useAuth();

  const updateUserProfile = useCallback((newProfile: UserProfile) => {
    setUserProfile(newProfile);
  }, []);

  // Update specific profile fields and persist to Firestore via Cloud Function
  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const userId = user?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Use Cloud Function to update profile
      await UserProfileService.updateUserProfile(userId, data);

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

  // Load user profile data via Cloud Function
  useEffect(() => {
    const loadUserProfile = async () => {
      console.log('[UserProfileContext] loadUserProfile called');
      setIsLoading(true);
      try {
        const userId = user?.uid;
        console.log('[UserProfileContext] Current user ID:', userId);

        if (userId) {
          // Get profile data via Cloud Function
          console.log('[UserProfileContext] Fetching user profile via Cloud Function...');
          const profile = await UserProfileService.getUserProfile(userId);
          
          console.log('[UserProfileContext] Profile data fetched:', profile.email);
          setUserProfile(profile);
          console.log('[UserProfileContext] Profile set successfully');
        }
      } catch (error) {
        console.log('[UserProfileContext] Error in loadUserProfile:', error);
        // If profile doesn't exist, that's okay - will be created during onboarding
        if (error && (error as any).message?.includes('not-found')) {
          console.log('[UserProfileContext] Profile not found - will be created during onboarding');
        }
      } finally {
        console.log('[UserProfileContext] loadUserProfile finally block, setting isLoading = false');
        setIsLoading(false);
      }
    };

    // React to user changes from AuthContext
    console.log('[UserProfileContext] User changed:', user?.uid);
    if (user) {
      loadUserProfile();
    } else {
      setIsLoading(false);
      setUserProfile(null);
    }
  }, [user]);

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
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
  
  // Use AuthContext to get user state and initialization status
  const { user, isInitializing } = useAuth();

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
      
      setIsLoading(true);
      try {
        const userId = user?.uid;
        const emailVerified = user?.emailVerified;

        // Only load profile if user exists AND email is verified
        // Unverified users (just after sign-up) should not trigger profile load
        // because the Auth SDK isn't signed in yet (no syncWithAuthSDK call)
        if (userId && emailVerified) {
          // Get profile data via Cloud Function with retry logic for new accounts

          let profile;
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              profile = await UserProfileService.getUserProfile(userId);
              break; // Success - exit retry loop
            } catch (error: any) {
              attempts++;
              
              // Special handling for "User must be authenticated" errors
              if (error?.message?.includes('must be authenticated')) {
                
                await new Promise(resolve => setTimeout(resolve, 1500)); // Wait longer for auth sync
                continue;
              }
              
              // If profile not found and this is not the last attempt, wait and retry
              if (error?.message?.includes('not found') && attempts < maxAttempts) {
                
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
              } else {
                throw error; // Re-throw on last attempt or other errors
              }
            }
          }

          setUserProfile(profile!);
          
        }
      } catch (error) {
        
        // If profile doesn't exist after retries, that's okay - will be created during onboarding
        if (error && (error as any).message?.includes('not found')) {
          
        }
      } finally {
        
        setIsLoading(false);
      }
    };

    // Wait for auth initialization before loading profile
    // This prevents "User must be authenticated" errors during app startup
    
    if (user && !isInitializing) {
      loadUserProfile();
    } else {
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
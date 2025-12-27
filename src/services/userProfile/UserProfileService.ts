import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { functions, db } from '../../config/firebaseConfig';

/**
 * User Profile Service using Direct Firestore Access
 * 
 * Uses Firestore Web SDK directly for read/write operations.
 * User must be authenticated via Firebase Auth SDK before calling these methods.
 */

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  dob?: string;
  gender?: string;
  sexualOrientation?: string;
  status?: string;
  edu?: string;
  drinking?: string;
  smoking?: string;
  location?: string;
  phoneNumber?: string;
  interests?: string[];
  /**
   * User photos, organized by slot. 'profile' is the main photo, 'slot1'-'slot4' are additional slots.
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
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

export interface GetUserProfileResponse {
  success: boolean;
  profile: UserProfile;
}

export interface UpdateUserProfileResponse {
  success: boolean;
  message: string;
}

export interface CreateUserProfileResponse {
  success: boolean;
  message: string;
  profile: UserProfile;
}

export class UserProfileService {
  /**
   * Get user profile directly from Firestore (no Cloud Function needed)
   */
  static async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      console.log('[UserProfileService.getUserProfile] Fetching profile for:', userId);
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('[UserProfileService.getUserProfile] Profile not found');
        throw new Error('Profile not found');
      }

      const data = userDoc.data();
      console.log('[UserProfileService.getUserProfile] ✅ Profile fetched successfully');
      return data as UserProfile;
    } catch (error: any) {
      console.error('[UserProfileService.getUserProfile] ❌ Error:', error);
      throw error;
    }
  }

  /**
   * Update user profile directly in Firestore
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    try {
      console.log('[UserProfileService.updateUserProfile] Updating profile for:', userId);
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        ...updates,
        lastUpdated: serverTimestamp()
      });
      console.log('[UserProfileService.updateUserProfile] ✅ Profile updated successfully');
    } catch (error: any) {
      console.error('[UserProfileService.updateUserProfile] ❌ Error:', error);
      throw error;
    }
  }

  /**
   * Create user profile directly in Firestore
   */
  static async createUserProfile(
    userId: string,
    profile: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      console.log('[UserProfileService.createUserProfile] Creating profile for:', userId);
      const userDocRef = doc(db, 'users', userId);
      const newProfile = {
        ...profile,
        uid: userId,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      await setDoc(userDocRef, newProfile);
      console.log('[UserProfileService.createUserProfile] ✅ Profile created successfully');
      return newProfile as UserProfile;
    } catch (error: any) {
      console.error('[UserProfileService.createUserProfile] ❌ Error:', error);
      throw error;
    }
  }

  /**
   * Accept terms of service - updates user profile
   */
  static async acceptTerms(userId: string): Promise<void> {
    try {
      console.log('[UserProfileService.acceptTerms] Accepting terms for:', userId);
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        hasAcceptedTerms: true,
        termsAcceptedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      console.log('[UserProfileService.acceptTerms] ✅ Terms accepted successfully');
    } catch (error: any) {
      console.error('[UserProfileService.acceptTerms] ❌ Error:', error);
      throw error;
    }
  }
}

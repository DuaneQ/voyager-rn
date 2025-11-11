import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebaseConfig';

/**
 * User Profile Service using Cloud Functions
 * 
 * Uses Cloud Functions to access Firestore with proper authentication context.
 * This solves the issue where REST API auth doesn't provide request.auth to Firestore.
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
   * Get user profile from Firestore via Cloud Function
   */
  static async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const getUserProfileFn = httpsCallable<{ userId: string }, GetUserProfileResponse>(
        functions,
        'getUserProfile'
      );

      const result = await getUserProfileFn({ userId });
      
      if (!result.data.success) {
        throw new Error('Failed to get user profile');
      }

      return result.data.profile;
    } catch (error: any) {
      console.error('Error getting user profile:', error);
      throw new Error(error.message || 'Failed to get user profile');
    }
  }

  /**
   * Update user profile in Firestore via Cloud Function
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    try {
      const updateUserProfileFn = httpsCallable<
        { userId: string; updates: Partial<UserProfile> },
        UpdateUserProfileResponse
      >(functions, 'updateUserProfile');

      const result = await updateUserProfileFn({ userId, updates });
      
      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to update user profile');
      }
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      throw new Error(error.message || 'Failed to update user profile');
    }
  }

  /**
   * Create user profile in Firestore via Cloud Function
   */
  static async createUserProfile(
    userId: string,
    profile: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      const createUserProfileFn = httpsCallable<
        { userId: string; profile: Partial<UserProfile> },
        CreateUserProfileResponse
      >(functions, 'createUserProfile');

      const result = await createUserProfileFn({ userId, profile });
      
      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to create user profile');
      }

      return result.data.profile;
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      throw new Error(error.message || 'Failed to create user profile');
    }
  }
}

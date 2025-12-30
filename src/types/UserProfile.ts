/**
 * User Profile types for React Native
 * Matches PWA UserProfile interface
 */

export interface UserProfile {
  uid?: string;
  email?: string;
  username?: string;
  displayName?: string;
  photoURL?: string; // Main photo URL (legacy field)
  dob?: string; // Date of birth in YYYY-MM-DD format
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | string; // Allow string for flexibility
  status?: 'single' | 'in-relationship' | 'married' | 'divorced' | 'widowed' | 'prefer-not-to-say' | string;
  sexualOrientation?: 'straight' | 'gay' | 'lesbian' | 'bisexual' | 'pansexual' | 'asexual' | 'prefer-not-to-say' | string;
  edu?: string; // Education level
  drinking?: string; // Drinking habits
  smoking?: string; // Smoking habits
  location?: {
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  bio?: string;
  interests?: string[];
  /**
   * User photos, organized by slot. 'profile' is the main photo, 'slot1'-'slot4' are additional slots.
   * Matches PWA UserProfile schema.
   */
  photos?: {
    profile?: string;
    slot1?: string;
    slot2?: string;
    slot3?: string;
    slot4?: string;
    [key: string]: string | undefined;
  };
  profilePhoto?: string;
  verified?: boolean;
  blocked?: string[];
  createdAt?: string;
  updatedAt?: string;
  
  // Ratings (for profile completion/quality)
  ratings?: {
    average?: number;
    count?: number;
  };
  
  // Subscription fields
  subscriptionType?: 'free' | 'premium';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionCancelled?: boolean;
  stripeCustomerId?: string;
  
  // Usage tracking
  dailyUsage?: {
    date: string;
    viewCount: number;
  };
  
  // Privacy settings
  privacy?: {
    showAge?: boolean;
    showLocation?: boolean;
    showOnlineStatus?: boolean;
  };
  
  // Notification preferences
  notifications?: {
    matches?: boolean;
    messages?: boolean;
    likes?: boolean;
    marketing?: boolean;
  };
}

export default UserProfile;
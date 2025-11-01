/**
 * User Profile types for React Native
 * Matches PWA UserProfile interface
 */

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  displayName?: string;
  dob?: string; // Date of birth in YYYY-MM-DD format
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  status?: 'single' | 'in-relationship' | 'married' | 'divorced' | 'widowed' | 'prefer-not-to-say';
  sexualOrientation?: 'straight' | 'gay' | 'lesbian' | 'bisexual' | 'pansexual' | 'asexual' | 'prefer-not-to-say';
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
  photos?: string[];
  profilePhoto?: string;
  verified?: boolean;
  blocked?: string[];
  createdAt?: string;
  updatedAt?: string;
  
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
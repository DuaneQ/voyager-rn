/**
 * Itinerary types for React Native
 * Matches PWA Itinerary interface exactly for compatibility with shared Firebase backend
 */

export interface ItineraryUserInfo {
  username: string;
  gender: string;
  dob: string; // Date of birth in YYYY-MM-DD format
  uid: string;
  email: string;
  status: string;
  sexualOrientation: string;
  blocked?: string[];
}

export interface Itinerary {
  id: string;
  destination: string;
  gender?: string;
  sexualOrientation?: string;
  likes?: string[]; // Array of user IDs who liked this itinerary
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  startDay?: number; // Unix timestamp in milliseconds
  endDay?: number; // Unix timestamp in milliseconds
  description?: string;
  activities?: string[];
  age?: number; // User's age for filtering
  lowerRange?: number; // Min age preference for matching
  upperRange?: number; // Max age preference for matching
  status?: string; // Single, Couple, Group, etc.
  userInfo?: ItineraryUserInfo; // Owner's profile information
  userId?: string; // Owner's user ID (may be redundant with userInfo.uid)
  
  // AI-generated itinerary fields (optional)
  ai_status?: 'pending' | 'completed' | 'failed';
  aiGenerated?: boolean;
  response?: {
    data?: {
      itinerary?: {
        days?: Array<{
          day: number;
          date: string;
          activities: Array<{
            time: string;
            activity: string;
            location?: string;
            description?: string;
          }>;
        }>;
        dailyPlans?: Array<{
          day: number;
          date: string;
          activities: Array<{
            time: string;
            activity: string;
            location?: string;
            description?: string;
          }>;
        }>;
      };
      metadata?: any;
    };
  };
}

/**
 * Search parameters for querying itineraries
 * Used with Firebase Cloud Function `searchItineraries`
 */
export interface ItinerarySearchParams {
  destination: string;
  gender?: string;
  status?: string;
  sexualOrientation?: string;
  minStartDay?: number; // Unix timestamp
  maxEndDay?: number; // Unix timestamp
  pageSize?: number; // Pagination limit (default 10)
  excludedIds?: string[]; // Already viewed itinerary IDs
  blockedUserIds?: string[]; // Users to exclude from results
  currentUserId: string; // For excluding own itineraries
  lowerRange?: number; // Min age preference
  upperRange?: number; // Max age preference
}

/**
 * Response from searchItineraries Cloud Function
 */
export interface SearchItinerariesResponse {
  success: boolean;
  data?: Itinerary[];
  error?: string;
  message?: string;
}

/**
 * Validation result for itinerary objects
 */
export interface ItineraryValidation {
  isValid: boolean;
  errors?: string[];
}

export default Itinerary;

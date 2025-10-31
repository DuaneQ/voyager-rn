/**
 * Manual Itinerary Creation Types
 * Types for creating and editing manual itineraries (not AI-generated)
 * Matches PostgreSQL schema from voyager-pwa
 */

export interface ManualItineraryFormData {
  destination: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;   // ISO date string YYYY-MM-DD
  description?: string;
  activities: string[];
  
  // Preference filters for matching
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' | 'Transgender Woman' | 'Transgender Man' | 'Gender Neutral' | 'Couple' | 'No Preference';
  status: 'Single' | 'Couple' | 'Group' | 'No Preference';
  sexualOrientation: 'Heterosexual' | 'Homosexual' | 'Bisexual' | 'Asexual' | 'Pansexual' | 'Queer' | 'Questioning' | 'Other' | 'Prefer not to say' | 'Transgender Woman' | 'Transgender Man' | 'No Preference';
  lowerRange: number; // Min age preference
  upperRange: number; // Max age preference
}

export interface ManualItineraryData extends ManualItineraryFormData {
  id?: string; // Present when editing
  userId: string;
  startDay: number; // Unix timestamp in milliseconds
  endDay: number;   // Unix timestamp in milliseconds
  likes: string[];
  userInfo: {
    username: string;
    gender: string;
    dob: string;
    uid: string;
    email: string;
    status: string;
    sexualOrientation: string;
    blocked: string[];
  };
}

export interface ItineraryValidationError {
  field: string;
  message: string;
}

export interface CreateItineraryResponse {
  success: boolean;
  data?: ManualItineraryData;
  error?: string;
  validationErrors?: ItineraryValidationError[];
}

export interface DeleteItineraryResponse {
  success: boolean;
  error?: string;
}

// Form state for the AddItineraryModal
export interface ItineraryFormState {
  formData: ManualItineraryFormData;
  isEditing: boolean;
  editingItineraryId: string | null;
  errors: ItineraryValidationError[];
  isSubmitting: boolean;
}

// Constants for form options (matching PWA exactly)
export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-binary',
  'Prefer not to say',
  'Transgender Woman',
  'Transgender Man',
  'Gender Neutral',
  'Couple',
  'No Preference'
] as const;

export const STATUS_OPTIONS = [
  'Single',
  'Couple',
  'Group',
  'No Preference'
] as const;

export const SEXUAL_ORIENTATION_OPTIONS = [
  'Heterosexual',
  'Homosexual',
  'Bisexual',
  'Asexual',
  'Pansexual',
  'Queer',
  'Questioning',
  'Other',
  'Prefer not to say',
  'Transgender Woman',
  'Transgender Man',
  'No Preference'
] as const;

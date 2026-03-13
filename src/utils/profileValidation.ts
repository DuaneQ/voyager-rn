/**
 * Profile Validation Utilities
 * Reusable validation logic for checking if a user profile is complete
 * before allowing itinerary creation (manual or AI-generated)
 * 
 * Matches PWA validation logic from AddItineraryModal.tsx
 */

export interface UserProfileForValidation {
  dob?: string;
  gender?: string;
  status?: string;
  sexualOrientation?: string;
  username?: string;
}

export interface ProfileValidationResult {
  isValid: boolean;
  missingFields: string[];
  message: string;
}

/**
 * Validates if a user profile has all required fields for creating an itinerary
 * @param userProfile - User profile object to validate
 * @returns ProfileValidationResult with validation status and details
 */
export const validateProfileForItinerary = (
  userProfile: UserProfileForValidation | null | undefined
): ProfileValidationResult => {
  const missingFields: string[] = [];

  // Check for required fields matching PWA validation
  if (!userProfile) {
    return {
      isValid: false,
      missingFields: ['profile'],
      message: 'Please complete your profile before creating an itinerary.',
    };
  }

  if (!userProfile.dob) {
    missingFields.push('Date of Birth');
  }

  if (!userProfile.gender) {
    missingFields.push('Gender');
  }

  if (!userProfile.status) {
    missingFields.push('Status');
  }

  if (!userProfile.sexualOrientation) {
    missingFields.push('Sexual Orientation');
  }

  // If any required fields are missing, return validation failure
  if (missingFields.length > 0) {
    const fieldList = missingFields.join(', ');
    return {
      isValid: false,
      missingFields,
      message: `Please complete your profile by setting: ${fieldList}`,
    };
  }

  // All required fields present
  return {
    isValid: true,
    missingFields: [],
    message: 'Profile is complete',
  };
};

/**
 * Validates if user is at least 18 years old
 * @param dob - Date of birth string in YYYY-MM-DD format
 * @returns true if user is 18 or older, false otherwise
 */
export const isUserOver18 = (dob: string | undefined): boolean => {
  if (!dob) return false;
  
  try {
    // Validate format before parsing — reject anything that isn't YYYY-MM-DD.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;

    // Parse as local midnight — new Date("YYYY-MM-DD") is UTC midnight which
    // shifts the date by the local UTC offset (e.g. -1 day in US timezones).
    const [year, month, day] = dob.split('-').map(Number);

    // Validate ranges before constructing — new Date() silently normalises
    // out-of-range values (e.g. month=0 → Nov of prior year) which would let
    // malformed DOB strings pass the age gate.
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;

    const birthDate = new Date(year, month - 1, day); // local midnight

    // Confirm the constructed date wasn't normalised (e.g. Feb 31 → Mar 3).
    if (
      birthDate.getFullYear() !== year ||
      birthDate.getMonth() !== month - 1 ||
      birthDate.getDate() !== day
    ) return false;

    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    
    return age >= 18;
  } catch {
    return false;
  }
};

/**
 * Gets a user-friendly message for profile validation errors
 * Primarily for Toast/Alert display
 * @param validationResult - Result from validateProfileForItinerary
 * @returns User-friendly error message
 */
export const getProfileValidationMessage = (
  validationResult: ProfileValidationResult
): string => {
  if (validationResult.isValid) {
    return '';
  }

  if (validationResult.missingFields.length === 0) {
    return validationResult.message;
  }

  return `${validationResult.message}. Please update your profile to continue.`;
};

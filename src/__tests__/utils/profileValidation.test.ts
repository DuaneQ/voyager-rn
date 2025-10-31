/**
 * Unit Tests for Profile Validation Utilities
 * Ensures profile validation logic matches PWA requirements
 */

import {
  validateProfileForItinerary,
  isUserOver18,
  getProfileValidationMessage,
  UserProfileForValidation,
  ProfileValidationResult,
} from '../../utils/profileValidation';

describe('profileValidation - validateProfileForItinerary', () => {
  describe('Valid Profiles', () => {
    it('should return valid for complete profile', () => {
      const profile: UserProfileForValidation = {
        dob: '1990-01-01',
        gender: 'Male',
        status: 'Single',
        sexualOrientation: 'Heterosexual',
        username: 'testuser',
      };

      const result = validateProfileForItinerary(profile);

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toEqual([]);
      expect(result.message).toBe('Profile is complete');
    });

    it('should return valid even without optional username', () => {
      const profile: UserProfileForValidation = {
        dob: '1995-06-15',
        gender: 'Female',
        status: 'Couple',
        sexualOrientation: 'Bisexual',
      };

      const result = validateProfileForItinerary(profile);

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('should accept all valid gender options', () => {
      const genders = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'];
      
      genders.forEach(gender => {
        const profile: UserProfileForValidation = {
          dob: '1992-03-20',
          gender,
          status: 'Single',
          sexualOrientation: 'Heterosexual',
        };

        const result = validateProfileForItinerary(profile);
        expect(result.isValid).toBe(true);
      });
    });

    it('should accept all valid status options', () => {
      const statuses = ['Single', 'Couple', 'Group'];
      
      statuses.forEach(status => {
        const profile: UserProfileForValidation = {
          dob: '1988-11-10',
          gender: 'Male',
          status,
          sexualOrientation: 'Heterosexual',
        };

        const result = validateProfileForItinerary(profile);
        expect(result.isValid).toBe(true);
      });
    });

    it('should accept all valid sexual orientation options', () => {
      const orientations = [
        'Heterosexual',
        'Homosexual',
        'Bisexual',
        'Pansexual',
        'Asexual',
        'Other',
        'Prefer not to say'
      ];
      
      orientations.forEach(sexualOrientation => {
        const profile: UserProfileForValidation = {
          dob: '1993-07-25',
          gender: 'Female',
          status: 'Single',
          sexualOrientation,
        };

        const result = validateProfileForItinerary(profile);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Invalid Profiles - Null/Undefined', () => {
    it('should return invalid for null profile', () => {
      const result = validateProfileForItinerary(null);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['profile']);
      expect(result.message).toBe('Please complete your profile before creating an itinerary.');
    });

    it('should return invalid for undefined profile', () => {
      const result = validateProfileForItinerary(undefined);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['profile']);
      expect(result.message).toBe('Please complete your profile before creating an itinerary.');
    });
  });

  describe('Invalid Profiles - Missing Required Fields', () => {
    it('should return invalid for missing dob', () => {
      const profile: UserProfileForValidation = {
        gender: 'Male',
        status: 'Single',
        sexualOrientation: 'Heterosexual',
      };

      const result = validateProfileForItinerary(profile);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('Date of Birth');
      expect(result.message).toContain('Date of Birth');
    });

    it('should return invalid for missing gender', () => {
      const profile: UserProfileForValidation = {
        dob: '1990-01-01',
        status: 'Single',
        sexualOrientation: 'Heterosexual',
      };

      const result = validateProfileForItinerary(profile);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('Gender');
      expect(result.message).toContain('Gender');
    });

    it('should return invalid for missing status', () => {
      const profile: UserProfileForValidation = {
        dob: '1990-01-01',
        gender: 'Male',
        sexualOrientation: 'Heterosexual',
      };

      const result = validateProfileForItinerary(profile);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('Status');
      expect(result.message).toContain('Status');
    });

    it('should return invalid for missing sexualOrientation', () => {
      const profile: UserProfileForValidation = {
        dob: '1990-01-01',
        gender: 'Male',
        status: 'Single',
      };

      const result = validateProfileForItinerary(profile);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('Sexual Orientation');
      expect(result.message).toContain('Sexual Orientation');
    });

    it('should return all missing fields when multiple are missing', () => {
      const profile: UserProfileForValidation = {
        username: 'testuser',
      };

      const result = validateProfileForItinerary(profile);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toHaveLength(4);
      expect(result.missingFields).toContain('Date of Birth');
      expect(result.missingFields).toContain('Gender');
      expect(result.missingFields).toContain('Status');
      expect(result.missingFields).toContain('Sexual Orientation');
      expect(result.message).toContain('Date of Birth, Gender, Status, Sexual Orientation');
    });

    it('should return invalid for empty string fields', () => {
      const profile: UserProfileForValidation = {
        dob: '',
        gender: '',
        status: '',
        sexualOrientation: '',
      };

      const result = validateProfileForItinerary(profile);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toHaveLength(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle profile with only some fields filled', () => {
      const profile: UserProfileForValidation = {
        dob: '1990-01-01',
        gender: 'Male',
      };

      const result = validateProfileForItinerary(profile);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toHaveLength(2);
      expect(result.missingFields).toContain('Status');
      expect(result.missingFields).toContain('Sexual Orientation');
    });

    it('should handle extra profile fields that are not required', () => {
      const profile: any = {
        dob: '1990-01-01',
        gender: 'Male',
        status: 'Single',
        sexualOrientation: 'Heterosexual',
        username: 'testuser',
        email: 'test@example.com',
        bio: 'Test bio',
        photoURL: 'https://example.com/photo.jpg',
        extraField: 'should be ignored',
      };

      const result = validateProfileForItinerary(profile);

      expect(result.isValid).toBe(true);
    });
  });
});

describe('profileValidation - isUserOver18', () => {
  // Note: These tests use real dates, so they are time-dependent
  // If tests fail in the future, update the dates accordingly
  
  describe('Valid Ages', () => {
    it('should return true for exactly 18 years old', () => {
      const today = new Date();
      const eighteenYearsAgo = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate()
      );
      const dob = eighteenYearsAgo.toISOString().split('T')[0];
      expect(isUserOver18(dob)).toBe(true);
    });

    it('should return true for 18 years and 1 day old', () => {
      const today = new Date();
      const eighteenYearsAgoPlus1Day = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate() - 1
      );
      const dob = eighteenYearsAgoPlus1Day.toISOString().split('T')[0];
      expect(isUserOver18(dob)).toBe(true);
    });

    it('should return true for 25 years old', () => {
      const dob = '2000-06-15';
      expect(isUserOver18(dob)).toBe(true);
    });

    it('should return true for 50 years old', () => {
      const dob = '1975-03-20';
      expect(isUserOver18(dob)).toBe(true);
    });
  });

  describe('Invalid Ages', () => {
    it('should return false for 17 years old', () => {
      const today = new Date();
      const seventeenYearsAgo = new Date(
        today.getFullYear() - 17,
        today.getMonth(),
        today.getDate()
      );
      const dob = seventeenYearsAgo.toISOString().split('T')[0];
      expect(isUserOver18(dob)).toBe(false);
    });

    it('should return false for 17 years and 364 days old (almost 18)', () => {
      // Create a date that's 1 day away from 18th birthday
      const today = new Date();
      const almostEighteen = new Date(today);
      almostEighteen.setFullYear(today.getFullYear() - 17);
      almostEighteen.setDate(today.getDate() - 364);
      
      const dob = almostEighteen.toISOString().split('T')[0];
      expect(isUserOver18(dob)).toBe(false);
    });

    it('should return false for 10 years old', () => {
      const today = new Date();
      const tenYearsAgo = new Date(
        today.getFullYear() - 10,
        today.getMonth(),
        today.getDate()
      );
      const dob = tenYearsAgo.toISOString().split('T')[0];
      expect(isUserOver18(dob)).toBe(false);
    });

    it('should return false for undefined dob', () => {
      expect(isUserOver18(undefined)).toBe(false);
    });

    it('should return false for empty string dob', () => {
      expect(isUserOver18('')).toBe(false);
    });

    it('should return false for invalid date format', () => {
      expect(isUserOver18('invalid-date')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle month boundary correctly (birthday not yet this month)', () => {
      const today = new Date();
      const nextMonth = new Date(
        today.getFullYear() - 18,
        today.getMonth() + 1,
        today.getDate()
      );
      const dob = nextMonth.toISOString().split('T')[0];
      expect(isUserOver18(dob)).toBe(false);
    });

    it('should handle month boundary correctly (birthday already passed)', () => {
      const today = new Date();
      const lastMonth = new Date(
        today.getFullYear() - 18,
        today.getMonth() - 1,
        today.getDate()
      );
      const dob = lastMonth.toISOString().split('T')[0];
      expect(isUserOver18(dob)).toBe(true);
    });

    it('should handle leap year birthdays', () => {
      // Someone born on Feb 29, 2004 would be 21 in 2025
      const dob = '2004-02-29';
      expect(isUserOver18(dob)).toBe(true);
    });
  });
});

describe('profileValidation - getProfileValidationMessage', () => {
  it('should return empty string for valid profile', () => {
    const validationResult: ProfileValidationResult = {
      isValid: true,
      missingFields: [],
      message: 'Profile is complete',
    };

    const message = getProfileValidationMessage(validationResult);

    expect(message).toBe('');
  });

  it('should return formatted message for single missing field', () => {
    const validationResult: ProfileValidationResult = {
      isValid: false,
      missingFields: ['Date of Birth'],
      message: 'Please complete your profile by setting: Date of Birth',
    };

    const message = getProfileValidationMessage(validationResult);

    expect(message).toBe(
      'Please complete your profile by setting: Date of Birth. Please update your profile to continue.'
    );
  });

  it('should return formatted message for multiple missing fields', () => {
    const validationResult: ProfileValidationResult = {
      isValid: false,
      missingFields: ['Date of Birth', 'Gender', 'Status'],
      message: 'Please complete your profile by setting: Date of Birth, Gender, Status',
    };

    const message = getProfileValidationMessage(validationResult);

    expect(message).toContain('Date of Birth, Gender, Status');
    expect(message).toContain('Please update your profile to continue');
  });

  it('should handle profile not found error', () => {
    const validationResult: ProfileValidationResult = {
      isValid: false,
      missingFields: ['profile'],
      message: 'Please complete your profile before creating an itinerary.',
    };

    const message = getProfileValidationMessage(validationResult);

    expect(message).toContain('Please complete your profile before creating an itinerary');
  });

  it('should handle validation with no missing fields but still invalid', () => {
    const validationResult: ProfileValidationResult = {
      isValid: false,
      missingFields: [],
      message: 'Custom validation error',
    };

    const message = getProfileValidationMessage(validationResult);

    expect(message).toBe('Custom validation error');
  });
});

describe('profileValidation - Integration Tests', () => {
  it('should validate and format message for incomplete profile', () => {
    const profile: UserProfileForValidation = {
      dob: '1990-01-01',
      // Missing: gender, status, sexualOrientation
    };

    const validationResult = validateProfileForItinerary(profile);
    const message = getProfileValidationMessage(validationResult);

    expect(validationResult.isValid).toBe(false);
    expect(validationResult.missingFields).toHaveLength(3);
    expect(message).toContain('Gender');
    expect(message).toContain('Status');
    expect(message).toContain('Sexual Orientation');
    expect(message).toContain('Please update your profile to continue');
  });

  it('should validate complete profile and return no message', () => {
    const profile: UserProfileForValidation = {
      dob: '1990-01-01',
      gender: 'Male',
      status: 'Single',
      sexualOrientation: 'Heterosexual',
      username: 'testuser',
    };

    const validationResult = validateProfileForItinerary(profile);
    const message = getProfileValidationMessage(validationResult);

    expect(validationResult.isValid).toBe(true);
    expect(message).toBe('');
  });

  it('should match PWA validation logic exactly', () => {
    // This test mirrors the PWA AddItineraryModal validateItinerary function
    const incompleteProfile: UserProfileForValidation = {
      username: 'testuser',
      // Missing dob and gender (PWA requirements)
    };

    const result = validateProfileForItinerary(incompleteProfile);

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Date of Birth');
    expect(result.missingFields).toContain('Gender');
  });
});

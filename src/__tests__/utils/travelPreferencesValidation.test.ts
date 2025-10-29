/**
 * Tests for Travel Preferences Validation
 */

import {
  validateTravelPreferenceProfile,
  validateUserTravelPreferences,
  validatePreferenceSignal,
  sanitizeProfileName,
  sanitizeBudget,
  sanitizeStarRating,
  sanitizeUserRating,
  sanitizeWalkingDistance,
  sanitizeGroupSize,
  VALIDATION_RULES,
} from '../../utils/travelPreferencesValidation';
import { TravelPreferenceProfile, UserTravelPreferences, PreferenceSignal } from '../../types/TravelPreferences';

// Mock server timestamp
const mockServerTimestamp = () => new Date('2025-01-01T00:00:00.000Z') as any;

describe('travelPreferencesValidation', () => {
  describe('validateTravelPreferenceProfile', () => {
    const validProfile: Partial<TravelPreferenceProfile> = {
      name: 'Valid Profile',
      travelStyle: 'mid-range',
      budgetRange: { min: 50, max: 200, currency: 'USD' },
      activities: ['food', 'nature'],
      foodPreferences: {
        dietaryRestrictions: ['vegetarian'],
        cuisineTypes: ['italian'],
        foodBudgetLevel: 'medium',
      },
      accommodation: {
        type: 'hotel',
        starRating: 3,
        minUserRating: 4.0,
      },
      transportation: {
        primaryMode: 'public',
        maxWalkingDistance: 30,
      },
      groupSize: {
        preferred: 2,
        sizes: [1, 2, 4],
      },
      accessibility: {
        mobilityNeeds: false,
        visualNeeds: false,
        hearingNeeds: false,
      },
    };

    it('should validate a correct profile', () => {
      const result = validateTravelPreferenceProfile(validProfile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('Profile Name Validation', () => {
      it('should reject empty profile name', () => {
        const result = validateTravelPreferenceProfile({ ...validProfile, name: '' });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Profile name is required');
      });

      it('should reject profile name exceeding max length', () => {
        const longName = 'a'.repeat(VALIDATION_RULES.PROFILE_NAME.MAX_LENGTH + 1);
        const result = validateTravelPreferenceProfile({ ...validProfile, name: longName });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining('must not exceed'));
      });

      it('should reject profile name with invalid characters', () => {
        const result = validateTravelPreferenceProfile({ ...validProfile, name: 'Invalid@Name!' });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Profile name contains invalid characters');
      });
    });

    describe('Travel Style Validation', () => {
      it('should require travel style', () => {
        const profile = { ...validProfile, travelStyle: undefined };
        const result = validateTravelPreferenceProfile(profile as any);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Travel style is required');
      });

      it('should reject invalid travel style', () => {
        const profile = { ...validProfile, travelStyle: 'invalid' as any };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid travel style');
      });
    });

    describe('Budget Range Validation', () => {
      it('should require budget range', () => {
        const profile = { ...validProfile, budgetRange: undefined };
        const result = validateTravelPreferenceProfile(profile as any);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Budget range is required');
      });

      it('should reject budget with min >= max', () => {
        const profile = {
          ...validProfile,
          budgetRange: { min: 200, max: 100, currency: 'USD' as const },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Minimum budget must be less than maximum budget');
      });

      it('should reject non-USD currency', () => {
        const profile = {
          ...validProfile,
          budgetRange: { min: 50, max: 200, currency: 'EUR' as any },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Only USD currency is currently supported');
      });

      it('should warn about low daily budget', () => {
        const profile = {
          ...validProfile,
          budgetRange: { min: 5, max: 15, currency: 'USD' as const },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.warnings).toBeDefined();
        expect(result.warnings).toContainEqual(expect.stringContaining('Daily budget below'));
      });
    });

    describe('Activities Validation', () => {
      it('should reject too many activities', () => {
        const profile = {
          ...validProfile,
          activities: Array(20).fill('food'),
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining('Cannot select more than'));
      });

      it('should reject invalid activity keys', () => {
        const profile = {
          ...validProfile,
          activities: ['invalid-activity', 'another-invalid'],
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining('Invalid activity keys'));
      });
    });

    describe('Food Preferences Validation', () => {
      it('should reject too many dietary restrictions', () => {
        const profile = {
          ...validProfile,
          foodPreferences: {
            ...validProfile.foodPreferences!,
            dietaryRestrictions: Array(15).fill('vegetarian'),
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining('dietary restrictions'));
      });

      it('should reject invalid dietary restrictions', () => {
        const profile = {
          ...validProfile,
          foodPreferences: {
            ...validProfile.foodPreferences!,
            dietaryRestrictions: ['invalid-restriction'],
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining('Invalid dietary restrictions'));
      });

      it('should reject invalid food budget level', () => {
        const profile = {
          ...validProfile,
          foodPreferences: {
            ...validProfile.foodPreferences!,
            foodBudgetLevel: 'invalid' as any,
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid food budget level');
      });
    });

    describe('Accommodation Validation', () => {
      it('should reject invalid accommodation type', () => {
        const profile = {
          ...validProfile,
          accommodation: {
            ...validProfile.accommodation!,
            type: 'invalid' as any,
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid accommodation type');
      });

      it('should reject invalid star rating', () => {
        const profile = {
          ...validProfile,
          accommodation: {
            ...validProfile.accommodation!,
            starRating: 6,
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining('Star rating must be between'));
      });

      it('should reject invalid user rating', () => {
        const profile = {
          ...validProfile,
          accommodation: {
            ...validProfile.accommodation!,
            minUserRating: 6.0,
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining('User rating must be between'));
      });
    });

    describe('Transportation Validation', () => {
      it('should reject invalid transportation mode', () => {
        const profile = {
          ...validProfile,
          transportation: {
            ...validProfile.transportation!,
            primaryMode: 'invalid' as any,
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid transportation mode');
      });

      it('should reject invalid walking distance', () => {
        const profile = {
          ...validProfile,
          transportation: {
            ...validProfile.transportation!,
            maxWalkingDistance: 200,
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining('Walking distance must be between'));
      });
    });

    describe('Group Size Validation', () => {
      it('should reject invalid preferred group size', () => {
        const profile = {
          ...validProfile,
          groupSize: {
            ...validProfile.groupSize!,
            preferred: 100,
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining('Preferred group size must be between'));
      });

      it('should reject invalid group sizes in array', () => {
        const profile = {
          ...validProfile,
          groupSize: {
            ...validProfile.groupSize!,
            sizes: [1, 2, 100],
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining('Invalid group sizes'));
      });
    });

    describe('Accessibility Validation', () => {
      it('should reject accessibility details exceeding max length', () => {
        const profile = {
          ...validProfile,
          accessibility: {
            ...validProfile.accessibility!,
            details: 'a'.repeat(501),
          },
        };
        const result = validateTravelPreferenceProfile(profile);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Accessibility details must not exceed 500 characters');
      });
    });
  });

  describe('validateUserTravelPreferences', () => {
    const validPreferences: Partial<UserTravelPreferences> = {
      profiles: [
        {
          id: 'profile-1',
          name: 'Default Profile',
          isDefault: true,
          travelStyle: 'mid-range',
          budgetRange: { min: 50, max: 200, currency: 'USD' },
          activities: ['food'],
          foodPreferences: {
            dietaryRestrictions: [],
            cuisineTypes: [],
            foodBudgetLevel: 'medium',
          },
          accommodation: { type: 'hotel', starRating: 3 },
          transportation: { primaryMode: 'public', maxWalkingDistance: 30 },
          groupSize: { preferred: 2, sizes: [1, 2] },
          accessibility: {
            mobilityNeeds: false,
            visualNeeds: false,
            hearingNeeds: false,
          },
          createdAt: mockServerTimestamp(),
          updatedAt: mockServerTimestamp(),
        },
      ],
      defaultProfileId: 'profile-1',
      preferenceSignals: [],
    };

    it('should validate correct user preferences', () => {
      const result = validateUserTravelPreferences(validPreferences);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require at least one profile', () => {
      const result = validateUserTravelPreferences({ profiles: [], defaultProfileId: null, preferenceSignals: [] });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one profile is required');
    });

    it('should detect duplicate profile names', () => {
      const preferences = {
        ...validPreferences,
        profiles: [
          ...validPreferences.profiles!,
          { ...validPreferences.profiles![0], id: 'profile-2', isDefault: false },
        ],
      };
      const result = validateUserTravelPreferences(preferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Duplicate profile names'));
    });

    it('should error on multiple default profiles', () => {
      const preferences = {
        ...validPreferences,
        profiles: [
          ...validPreferences.profiles!,
          { ...validPreferences.profiles![0], id: 'profile-2', name: 'Second Profile', isDefault: true },
        ],
      };
      const result = validateUserTravelPreferences(preferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Only one profile can be set as default');
    });

    it('should error if defaultProfileId does not match any profile', () => {
      const preferences = {
        ...validPreferences,
        defaultProfileId: 'non-existent-id',
      };
      const result = validateUserTravelPreferences(preferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Default profile ID does not match any profile');
    });
  });

  describe('validatePreferenceSignal', () => {
    const validSignal: Partial<PreferenceSignal> = {
      type: 'like',
      activityType: 'food',
      confidence: 0.8,
    };

    it('should validate correct preference signal', () => {
      const result = validatePreferenceSignal(validSignal);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require signal type', () => {
      const signal = { ...validSignal, type: undefined };
      const result = validatePreferenceSignal(signal as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Signal type is required');
    });

    it('should reject invalid signal type', () => {
      const signal = { ...validSignal, type: 'invalid' as any };
      const result = validatePreferenceSignal(signal);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid signal type'));
    });

    it('should require activity type', () => {
      const signal = { ...validSignal, activityType: '' };
      const result = validatePreferenceSignal(signal);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Activity type is required');
    });

    it('should require confidence', () => {
      const signal = { ...validSignal, confidence: undefined };
      const result = validatePreferenceSignal(signal as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Confidence is required');
    });

    it('should reject invalid confidence value', () => {
      const signal = { ...validSignal, confidence: 1.5 };
      const result = validatePreferenceSignal(signal);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Confidence must be between'));
    });
  });

  describe('Sanitization Functions', () => {
    describe('sanitizeProfileName', () => {
      it('should trim whitespace', () => {
        expect(sanitizeProfileName('  Test Profile  ')).toBe('Test Profile');
      });

      it('should remove invalid characters', () => {
        expect(sanitizeProfileName('Test@Profile!')).toBe('TestProfile');
      });

      it('should truncate to max length', () => {
        const longName = 'a'.repeat(100);
        const sanitized = sanitizeProfileName(longName);
        expect(sanitized.length).toBe(VALIDATION_RULES.PROFILE_NAME.MAX_LENGTH);
      });
    });

    describe('sanitizeBudget', () => {
      it('should clamp to min value', () => {
        expect(sanitizeBudget(-100)).toBe(VALIDATION_RULES.BUDGET.MIN);
      });

      it('should clamp to max value', () => {
        expect(sanitizeBudget(2000000)).toBe(VALIDATION_RULES.BUDGET.MAX);
      });

      it('should round to integer', () => {
        expect(sanitizeBudget(123.7)).toBe(124);
      });
    });

    describe('sanitizeStarRating', () => {
      it('should clamp to min value', () => {
        expect(sanitizeStarRating(0)).toBe(1);
      });

      it('should clamp to max value', () => {
        expect(sanitizeStarRating(10)).toBe(5);
      });

      it('should round to integer', () => {
        expect(sanitizeStarRating(3.7)).toBe(4);
      });
    });

    describe('sanitizeUserRating', () => {
      it('should clamp to min value', () => {
        expect(sanitizeUserRating(0)).toBe(1.0);
      });

      it('should clamp to max value', () => {
        expect(sanitizeUserRating(10)).toBe(5.0);
      });

      it('should round to one decimal', () => {
        expect(sanitizeUserRating(3.77)).toBe(3.8);
      });
    });

    describe('sanitizeWalkingDistance', () => {
      it('should clamp to min value', () => {
        expect(sanitizeWalkingDistance(0)).toBe(VALIDATION_RULES.WALKING_DISTANCE.MIN);
      });

      it('should clamp to max value', () => {
        expect(sanitizeWalkingDistance(200)).toBe(VALIDATION_RULES.WALKING_DISTANCE.MAX);
      });
    });

    describe('sanitizeGroupSize', () => {
      it('should clamp to min value', () => {
        expect(sanitizeGroupSize(0)).toBe(1);
      });

      it('should clamp to max value', () => {
        expect(sanitizeGroupSize(100)).toBe(50);
      });
    });
  });
});

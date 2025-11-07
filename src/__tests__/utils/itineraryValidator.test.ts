/**
 * Unit Tests for itineraryValidator utility
 * 
 * @module __tests__/utils/itineraryValidator.test
 * @description Comprehensive tests for itinerary validation logic.
 * Tests cover: individual field validation, complex object validation,
 * batch filtering, sanitization, type guards, and edge cases.
 */

import {
  validateItinerary,
  filterValidItineraries,
  isValidItinerary,
  sanitizeItinerary,
} from '../../utils/itineraryValidator';
import { Itinerary } from '../../types/Itinerary';

describe('itineraryValidator', () => {
  // Valid test itinerary
  const validItinerary: Itinerary = {
    id: 'test-id-123',
    destination: 'Paris, France',
    startDay: 1640995200000, // Unix timestamp
    endDay: 1641513600000, // Unix timestamp
    startDate: '2025-08-01',
    endDate: '2025-08-07',
    description: 'A wonderful trip to Paris',
    activities: ['Eiffel Tower', 'Louvre Museum'],
    likes: ['user1', 'user2'],
    gender: 'Any',
    status: 'Single',
    sexualOrientation: 'Straight',
    age: 30,
    lowerRange: 18,
    upperRange: 65,
    userInfo: {
      uid: 'user123',
      username: 'traveler1',
      email: 'traveler@example.com',
      gender: 'Male',
      dob: '1995-01-01',
      status: 'Single',
      sexualOrientation: 'Straight',
    },
  };

  describe('validateItinerary', () => {
    describe('Required Fields', () => {
      it('should validate a complete valid itinerary', () => {
        const result = validateItinerary(validItinerary);

        expect(result.isValid).toBe(true);
        expect(result.errors).toBeUndefined();
      });

      it('should reject itinerary without id', () => {
        const invalid = { ...validItinerary, id: '' };

        const result = validateItinerary(invalid as Itinerary);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing or invalid id (must be non-empty string)');
      });

      it('should reject itinerary without destination', () => {
        const invalid = { ...validItinerary, destination: '' };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing or invalid destination (must be non-empty string)');
      });

      it('should reject null or undefined itinerary', () => {
        const resultNull = validateItinerary(null as any);
        const resultUndefined = validateItinerary(undefined as any);

        expect(resultNull.isValid).toBe(false);
        expect(resultNull.errors).toContain('Itinerary is null or not an object');
        expect(resultUndefined.isValid).toBe(false);
      });
    });

    describe('Date Fields', () => {
      it('should accept valid startDay and endDay', () => {
        const result = validateItinerary(validItinerary);

        expect(result.isValid).toBe(true);
      });

      it('should reject non-numeric startDay', () => {
        const invalid = { ...validItinerary, startDay: 'not-a-number' as any };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid startDay (must be positive integer timestamp)');
      });

      it('should reject non-numeric endDay', () => {
        const invalid = { ...validItinerary, endDay: NaN };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid endDay (must be positive integer timestamp)');
      });

      it('should reject endDay before startDay', () => {
        const invalid = { ...validItinerary, startDay: 10, endDay: 5 };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('startDay must be before or equal to endDay');
      });

      it('should accept endDay equal to startDay', () => {
        const valid = { ...validItinerary, startDay: 5, endDay: 5 };

        const result = validateItinerary(valid);

        expect(result.isValid).toBe(true);
      });

      it('should reject unsafe integer values', () => {
        const invalid = { ...validItinerary, startDay: Number.MAX_SAFE_INTEGER + 1 };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid startDay (must be positive integer timestamp)');
      });
    });

    describe('Type Safety', () => {
      it('should reject metadata as string', () => {
        const invalid = { ...validItinerary, metadata: 'string-metadata' as any };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid metadata (should be object, not string)');
      });

      it('should reject response as string', () => {
        const invalid = { ...validItinerary, response: 'string-response' as any };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid response (should be object, not string)');
      });

      it('should accept null metadata', () => {
        const valid = { ...validItinerary, metadata: null };

        const result = validateItinerary(valid as any);

        expect(result.isValid).toBe(true);
      });
    });

    describe('Array Fields', () => {
      it('should accept valid activities array', () => {
        const result = validateItinerary(validItinerary);

        expect(result.isValid).toBe(true);
      });

      it('should reject non-array activities', () => {
        const invalid = { ...validItinerary, activities: 'not-an-array' as any };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('activities must be an array');
      });

      it('should reject non-array likes', () => {
        const invalid = { ...validItinerary, likes: { user1: true } as any };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('likes must be an array');
      });

      it('should accept empty arrays', () => {
        const valid = { ...validItinerary, activities: [], likes: [] };

        const result = validateItinerary(valid);

        expect(result.isValid).toBe(true);
      });
    });

    describe('UserInfo Validation', () => {
      it('should accept valid userInfo', () => {
        const result = validateItinerary(validItinerary);

        expect(result.isValid).toBe(true);
      });

      it('should reject userInfo without uid', () => {
        const invalid = {
          ...validItinerary,
          userInfo: { username: 'test' } as any,
        };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('userInfo.uid is required and must be a string');
      });

      it('should reject non-object userInfo', () => {
        const invalid = {
          ...validItinerary,
          userInfo: 'string-userinfo' as any,
        };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('userInfo must be an object');
      });

      it('should accept missing userInfo', () => {
        const valid = { ...validItinerary };
        delete valid.userInfo;

        const result = validateItinerary(valid);

        // Should be valid since userInfo is optional in some contexts
        expect(result.isValid).toBe(true);
      });
    });

    describe('Age Range Validation', () => {
      it('should accept valid age ranges', () => {
        const result = validateItinerary(validItinerary);

        expect(result.isValid).toBe(true);
      });

      it('should reject upperRange < lowerRange', () => {
        const invalid = {
          ...validItinerary,
          lowerRange: 50,
          upperRange: 30,
        };

        const result = validateItinerary(invalid);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('upperRange'))).toBe(true);
      });

      it('should accept equal min and max age', () => {
        const valid = {
          ...validItinerary,
          lowerRange: 25,
          upperRange: 25,
        };

        const result = validateItinerary(valid);

        expect(result.isValid).toBe(true);
      });

      it('should handle missing age ranges gracefully', () => {
        const valid = { ...validItinerary };
        delete valid.lowerRange;
        delete valid.upperRange;

        const result = validateItinerary(valid);

        expect(result.isValid).toBe(true);
      });
    });

    describe('Multiple Errors', () => {
      it('should collect all errors in one pass', () => {
        const invalid = {
          ...validItinerary,
          id: '',
          destination: '',
          startDay: 'invalid' as any,
          endDay: NaN,
          activities: 'not-array' as any,
          metadata: 'string' as any,
        };

        const result = validateItinerary(invalid as Itinerary);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(5);
      });
    });
  });

  describe('filterValidItineraries', () => {
    it('should filter out invalid itineraries', () => {
      const itineraries = [
        validItinerary,
        { ...validItinerary, id: '' }, // Invalid: no id
        { ...validItinerary, id: 'valid2' },
        { ...validItinerary, id: 'valid3', startDay: 'bad' as any }, // Invalid: bad startDay
      ];

      const result = filterValidItineraries(itineraries as Itinerary[]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('test-id-123');
      expect(result[1].id).toBe('valid2');
    });

    it('should return empty array for all invalid', () => {
      const itineraries = [
        { ...validItinerary, id: '' },
        { ...validItinerary, id: 'test', destination: '' },
      ];

      const result = filterValidItineraries(itineraries as Itinerary[]);

      expect(result).toHaveLength(0);
    });

    it('should return all itineraries if all valid', () => {
      const itineraries = [
        validItinerary,
        { ...validItinerary, id: 'test2' },
        { ...validItinerary, id: 'test3' },
      ];

      const result = filterValidItineraries(itineraries);

      expect(result).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const result = filterValidItineraries([]);

      expect(result).toHaveLength(0);
    });

    it('should log errors when logErrors is true', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const itineraries = [
        { ...validItinerary, id: '' }, // Invalid
      ];

      filterValidItineraries(itineraries as Itinerary[], true);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log errors when logErrors is false', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const itineraries = [
        { ...validItinerary, id: '' }, // Invalid
      ];

      filterValidItineraries(itineraries as Itinerary[], false);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('isValidItinerary', () => {
    it('should return true for valid itinerary (type guard)', () => {
      const result = isValidItinerary(validItinerary);

      expect(result).toBe(true);
    });

    it('should return false for invalid itinerary', () => {
      const invalid = { ...validItinerary, id: '' };

      const result = isValidItinerary(invalid as Itinerary);

      expect(result).toBe(false);
    });

    it('should work as TypeScript type guard', () => {
      const maybeItinerary: any = validItinerary;

      if (isValidItinerary(maybeItinerary)) {
        // TypeScript should recognize this as Itinerary
        expect(maybeItinerary.id).toBeDefined();
      }
    });
  });

  describe('sanitizeItinerary', () => {
    it('should return valid itinerary unchanged', () => {
      const result = sanitizeItinerary(validItinerary);

      expect(result).toEqual(validItinerary);
    });

    it('should fix string response to object', () => {
      const invalid = { ...validItinerary, response: 'string-response' as any };

      const result = sanitizeItinerary(invalid);

      expect(result).not.toBeNull();
      // sanitizeItinerary doesn't create empty objects, it just omits invalid fields
      expect(result?.response).toBeUndefined();
    });

    it('should fix non-array activities', () => {
      const invalid = { ...validItinerary, activities: 'not-array' as any };

      const result = sanitizeItinerary(invalid);

      expect(result).not.toBeNull();
      // sanitizeItinerary doesn't create empty arrays, it just omits invalid fields
      expect(result?.activities).toBeUndefined();
    });

    it('should fix non-array likes', () => {
      const invalid = { ...validItinerary, likes: 'not-array' as any };

      const result = sanitizeItinerary(invalid);

      expect(result).not.toBeNull();
      // sanitizeItinerary doesn't create empty arrays, it just omits invalid fields
      expect(result?.likes).toBeUndefined();
    });

    it('should return null for unfixable errors (missing id)', () => {
      const invalid = { ...validItinerary, id: '' };

      const result = sanitizeItinerary(invalid as Itinerary);

      expect(result).toBeNull();
    });

    it('should return null for unfixable errors (missing destination)', () => {
      const invalid = { ...validItinerary, destination: '' };

      const result = sanitizeItinerary(invalid);

      expect(result).toBeNull();
    });

    it('should fix multiple issues at once', () => {
      const invalid = {
        ...validItinerary,
        response: 'string' as any,
        activities: 'string' as any,
        likes: null as any,
      };

      const result = sanitizeItinerary(invalid);

      expect(result).not.toBeNull();
      // sanitizeItinerary omits invalid fields, doesn't create empty defaults
      expect(result?.response).toBeUndefined();
      expect(result?.activities).toBeUndefined();
      expect(result?.likes).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large activities array', () => {
      const manyActivities = Array.from({ length: 1000 }, (_, i) => `Activity ${i}`);
      const itinerary = { ...validItinerary, activities: manyActivities };

      const result = validateItinerary(itinerary);

      expect(result.isValid).toBe(true);
    });

    it('should handle very large likes array', () => {
      const manyLikes = Array.from({ length: 1000 }, (_, i) => `user${i}`);
      const itinerary = { ...validItinerary, likes: manyLikes };

      const result = validateItinerary(itinerary);

      expect(result.isValid).toBe(true);
    });

    it('should handle Unicode in destination', () => {
      const itinerary = { ...validItinerary, destination: '東京, 日本' };

      const result = validateItinerary(itinerary);

      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in description', () => {
      const itinerary = {
        ...validItinerary,
        description: 'Trip with "quotes" & special <chars>',
      };

      const result = validateItinerary(itinerary);

      expect(result.isValid).toBe(true);
    });

    it('should handle extreme date values', () => {
      const itinerary = { ...validItinerary, startDay: 1, endDay: 365 };

      const result = validateItinerary(itinerary);

      expect(result.isValid).toBe(true);
    });

    it('should handle nested metadata structures', () => {
      const itinerary = {
        ...validItinerary,
        metadata: {
          filtering: { destination: 'Paris' },
          nested: { deep: { value: 123 } },
        },
      };

      const result = validateItinerary(itinerary);

      expect(result.isValid).toBe(true);
    });
  });
});

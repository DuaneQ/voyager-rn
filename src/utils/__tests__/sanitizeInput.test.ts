/**
 * Unit tests for sanitizeInput utility
 * Comprehensive testing of input sanitization and validation
 */

import { sanitizeAIGenerationRequest } from '../sanitizeInput';
import { AIGenerationRequest } from '../../types/AIGeneration';

describe('sanitizeAIGenerationRequest', () => {
  describe('Basic Sanitization', () => {
    it('should trim and clean string fields', () => {
      const input: AIGenerationRequest = {
        destination: '  Paris, France  ',
        departure: '  New York City  ',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        specialRequests: '  Please include romantic restaurants  ',
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.destination).toBe('Paris, France');
      expect(result.departure).toBe('New York City');
      expect(result.specialRequests).toBe('Please include romantic restaurants');
    });

    it('should handle undefined and null values', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        departure: undefined,
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        specialRequests: null as any,
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.departure).toBe('');
      expect(result.specialRequests).toBe('');
    });

    it('should sanitize airport codes to uppercase', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        departureAirportCode: 'jfk',
        destinationAirportCode: 'cdg',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.departureAirportCode).toBe('JFK');
      expect(result.destinationAirportCode).toBe('CDG');
    });
  });

  describe('Array Sanitization', () => {
    it('should sanitize mustInclude array', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        mustInclude: [
          '  Eiffel Tower  ',
          '',
          '  Louvre Museum  ',
          null as any,
          undefined as any,
          'Arc de Triomphe',
        ],
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.mustInclude).toEqual([
        'Eiffel Tower',
        'Louvre Museum',
        'Arc de Triomphe'
      ]);
    });

    it('should sanitize mustAvoid array', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        mustAvoid: [
          '  Crowded tourist traps  ',
          '',
          '  Expensive restaurants  ',
          'Late night activities',
        ],
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.mustAvoid).toEqual([
        'Crowded tourist traps',
        'Expensive restaurants',
        'Late night activities'
      ]);
    });

    it('should handle undefined arrays', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        mustInclude: undefined,
        mustAvoid: undefined,
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.mustInclude).toEqual([]);
      expect(result.mustAvoid).toEqual([]);
    });

    it('should sanitize preferred airlines array', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        flightPreferences: {
          class: 'economy',
          stopPreference: 'any',
          preferredAirlines: [
            '  Delta Air Lines  ',
            '',
            '  Air France  ',
            null as any,
            'United Airlines'
          ],
        },
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.flightPreferences?.preferredAirlines).toEqual([
        'Delta Air Lines',
        'Air France',
        'United Airlines'
      ]);
    });
  });

  describe('Date Validation', () => {
    it('should validate date format', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.startDate).toBe('2025-11-01');
      expect(result.endDate).toBe('2025-11-07');
    });

    it('should handle invalid date formats gracefully', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: 'invalid-date',
        endDate: '11/07/2025', // Different format
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
      };

      // Should not throw error and preserve original values
      expect(() => sanitizeAIGenerationRequest(input)).not.toThrow();
      
      const result = sanitizeAIGenerationRequest(input);
      expect(result.startDate).toBe('invalid-date');
      expect(result.endDate).toBe('11/07/2025');
    });
  });

  describe('Nested Object Sanitization', () => {
    it('should sanitize flight preferences', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        flightPreferences: {
          class: 'business' as const,
          stopPreference: 'non-stop' as const,
          preferredAirlines: ['  Delta  ', 'Air France'],
        },
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.flightPreferences).toEqual({
        class: 'business',
        stopPreference: 'non-stop',
        preferredAirlines: ['Delta', 'Air France'],
      });
    });

    it('should sanitize userInfo object', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        userInfo: {
          uid: '  test-uid  ',
          username: '  testuser  ',
          gender: '  male  ',
          dob: '1990-01-01',
          status: '  single  ',
          sexualOrientation: '  straight  ',
          email: '  test@example.com  ',
          blocked: ['  blocked-user  ', '', '  another-blocked  '],
        },
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.userInfo).toEqual({
        uid: 'test-uid',
        username: 'testuser',
        gender: 'male',
        dob: '1990-01-01',
        status: 'single',
        sexualOrientation: 'straight',
        email: 'test@example.com',
        blocked: ['blocked-user', 'another-blocked'],
      });
    });

    it('should handle undefined nested objects', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        flightPreferences: undefined,
        userInfo: undefined,
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.flightPreferences).toBeUndefined();
      expect(result.userInfo).toBeUndefined();
    });
  });

  describe('Budget Sanitization', () => {
    it('should sanitize budget object', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        budget: {
          total: 5000,
          currency: 'USD' as const,
        },
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.budget).toEqual({
        total: 5000,
        currency: 'USD',
      });
    });

    it('should handle invalid budget values', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        budget: {
          total: -1000, // Negative budget
          currency: 'USD' as const,
        },
      };

      const result = sanitizeAIGenerationRequest(input);

      // Should preserve original value (validation happens elsewhere)
      expect(result.budget?.total).toBe(-1000);
    });
  });

  describe('String Length Limits', () => {
    it('should truncate overly long strings', () => {
      const longString = 'A'.repeat(1000);
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        specialRequests: longString,
      };

      const result = sanitizeAIGenerationRequest(input);

      // Should be truncated to reasonable length (assuming 500 char limit)
      expect(result.specialRequests.length).toBeLessThanOrEqual(500);
    });

    it('should truncate long array items', () => {
      const longItem = 'B'.repeat(200);
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        mustInclude: [longItem, 'Normal item'],
      };

      const result = sanitizeAIGenerationRequest(input);

      // Should truncate long items (assuming 80 char limit)
      expect(result.mustInclude[0].length).toBeLessThanOrEqual(80);
      expect(result.mustInclude[1]).toBe('Normal item');
    });
  });

  describe('HTML/Script Injection Prevention', () => {
    it('should remove HTML tags from strings', () => {
      const input: AIGenerationRequest = {
        destination: '<script>alert("xss")</script>Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        specialRequests: 'Please include <b>romantic</b> restaurants',
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.destination).not.toContain('<script>');
      expect(result.destination).not.toContain('</script>');
      expect(result.specialRequests).not.toContain('<b>');
      expect(result.specialRequests).not.toContain('</b>');
    });

    it('should handle malicious input in arrays', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        mustInclude: [
          'Eiffel Tower',
          '<script>malicious()</script>',
          'javascript:alert("xss")',
        ],
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.mustInclude[0]).toBe('Eiffel Tower');
      expect(result.mustInclude[1]).not.toContain('<script>');
      expect(result.mustInclude[2]).not.toContain('javascript:');
    });
  });

  describe('Type Safety', () => {
    it('should preserve valid enum values', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'romantic',
        preferenceProfileId: 'test-profile',
        flightPreferences: {
          class: 'first',
          stopPreference: 'non-stop',
        },
      };

      const result = sanitizeAIGenerationRequest(input);

      expect(result.tripType).toBe('romantic');
      expect(result.flightPreferences?.class).toBe('first');
      expect(result.flightPreferences?.stopPreference).toBe('non-stop');
    });

    it('should handle invalid enum values gracefully', () => {
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'invalid-type' as any,
        preferenceProfileId: 'test-profile',
        flightPreferences: {
          class: 'super-luxury' as any,
          stopPreference: 'any',
        },
      };

      // Should not throw error
      expect(() => sanitizeAIGenerationRequest(input)).not.toThrow();
      
      const result = sanitizeAIGenerationRequest(input);
      
      // Should preserve original values (validation happens elsewhere)
      expect(result.tripType).toBe('invalid-type');
      expect(result.flightPreferences?.class).toBe('super-luxury');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
      
      const input: AIGenerationRequest = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        mustInclude: largeArray,
      };

      const startTime = Date.now();
      const result = sanitizeAIGenerationRequest(input);
      const endTime = Date.now();

      // Should complete quickly (under 100ms for large datasets)
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.mustInclude.length).toBeLessThanOrEqual(50); // Assuming limit
    });
  });

  describe('Deep Cloning', () => {
    it('should not mutate original input object', () => {
      const original: AIGenerationRequest = {
        destination: '  Paris  ',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure',
        preferenceProfileId: 'test-profile',
        mustInclude: ['  Eiffel Tower  '],
        flightPreferences: {
          class: 'economy',
          stopPreference: 'any',
          preferredAirlines: ['  Delta  '],
        },
      };

      const originalCopy = JSON.parse(JSON.stringify(original));
      const result = sanitizeAIGenerationRequest(original);

      // Original should be unchanged
      expect(original).toEqual(originalCopy);
      
      // Result should be sanitized
      expect(result.destination).toBe('Paris');
      expect(result.mustInclude[0]).toBe('Eiffel Tower');
      expect(result.flightPreferences?.preferredAirlines?.[0]).toBe('Delta');
    });
  });
});
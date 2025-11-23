/**
 * Unit tests for ProfileValidationService
 * Tests flight section visibility and validation logic
 */

import ProfileValidationService from '../../services/ProfileValidationService';

describe('ProfileValidationService', () => {
  describe('isFlightSectionVisible', () => {
    it('should return true when transportation mode is airplane', () => {
      const profile: any = {
        transportation: {
          primaryMode: 'airplane'
        }
      };

      const result = ProfileValidationService.isFlightSectionVisible(profile);
      expect(result).toBe(true);
    });

    it('should return true when transportation mode is flights', () => {
      const profile: any = {
        transportation: {
          primaryMode: 'flights'
        }
      };

      const result = ProfileValidationService.isFlightSectionVisible(profile);
      expect(result).toBe(true);
    });

    it('should return true when includeFlights is true', () => {
      const profile: any = {
        transportation: {
          primaryMode: 'train',
          includeFlights: true
        }
      };

      const result = ProfileValidationService.isFlightSectionVisible(profile);
      expect(result).toBe(true);
    });

    it('should return false when transportation mode is not flight-related', () => {
      const testModes = ['driving', 'train', 'bus', 'walking', 'public', 'taxi', 'rental'];
      
      testModes.forEach(mode => {
        const profile: any = {
          transportation: {
            primaryMode: mode
          }
        };

        const result = ProfileValidationService.isFlightSectionVisible(profile);
        expect(result).toBe(false);
      });
    });

    it('should return false when profile is null', () => {
      const result = ProfileValidationService.isFlightSectionVisible(null);
      expect(result).toBe(false);
    });

    it('should return false when profile is undefined', () => {
      const result = ProfileValidationService.isFlightSectionVisible(undefined);
      expect(result).toBe(false);
    });

    it('should return false when transportation object is missing', () => {
      const profile: any = {};

      const result = ProfileValidationService.isFlightSectionVisible(profile);
      expect(result).toBe(false);
    });

    it('should return false when primaryMode is missing', () => {
      const profile: any = {
        transportation: {}
      };

      const result = ProfileValidationService.isFlightSectionVisible(profile);
      expect(result).toBe(false);
    });

    it('should handle case-insensitive mode matching', () => {
      const profile: any = {
        transportation: {
          primaryMode: 'AIRPLANE'
        }
      };

      const result = ProfileValidationService.isFlightSectionVisible(profile);
      expect(result).toBe(true);
    });
  });

  describe('validateFlightFields', () => {
    const baseFormData = {
      destination: 'Paris',
      startDate: '2025-11-01',
      endDate: '2025-11-07',
      tripType: 'leisure' as const,
      preferenceProfileId: 'test-profile',
      mustInclude: [],
      mustAvoid: [],
      flightPreferences: {
        class: 'economy' as const,
        stopPreference: 'any' as const,
        preferredAirlines: []
      }
    };

    describe('when flights are required', () => {
      const airplaneProfile: any = {
        transportation: {
          primaryMode: 'airplane'
        }
      };

      it('should return errors when departure airport code is missing and departure exists', () => {
        const formData = {
          ...baseFormData,
          departure: 'New York',
          departureAirportCode: ''
        };

        const errors = ProfileValidationService.validateFlightFields(formData, airplaneProfile);
        
        expect(errors.departureAirportCode).toBe('Departure airport is required.');
      });

      it('should return errors for invalid airport code format', () => {
        const formData = {
          ...baseFormData,
          departure: 'New York',
          departureAirportCode: 'INVALID',
          destinationAirportCode: 'X1'
        };

        const errors = ProfileValidationService.validateFlightFields(formData, airplaneProfile);
        
        expect(errors.departureAirportCode).toBe('Invalid airport code format.');
        expect(errors.destinationAirportCode).toBe('Invalid airport code format.');
      });

      it('should return errors when destination airport code is missing', () => {
        const formData = {
          ...baseFormData,
          departure: 'New York',
          departureAirportCode: 'JFK',
          destinationAirportCode: ''
        };

        const errors = ProfileValidationService.validateFlightFields(formData, airplaneProfile);
        
        expect(errors.destinationAirportCode).toBe('Destination airport is required.');
      });

      it('should return no errors when all flight fields are provided', () => {
        const formData = {
          ...baseFormData,
          departure: 'New York',
          departureAirportCode: 'JFK',
          destinationAirportCode: 'CDG'
        };

        const errors = ProfileValidationService.validateFlightFields(formData, airplaneProfile);
        
        expect(errors.departure).toBeUndefined();
        expect(errors.departureAirportCode).toBeUndefined();
        expect(errors.destinationAirportCode).toBeUndefined();
      });

      it('should validate airport code format', () => {
        const formData = {
          ...baseFormData,
          departure: 'New York',
          departureAirportCode: 'INVALID_CODE',
          destinationAirportCode: 'X'
        };

        const errors = ProfileValidationService.validateFlightFields(formData, airplaneProfile);
        
        expect(errors.departureAirportCode).toContain('valid airport code');
        expect(errors.destinationAirportCode).toContain('valid airport code');
      });

      it('should accept valid 3-letter airport codes', () => {
        const formData = {
          ...baseFormData,
          departure: 'New York',
          departureAirportCode: 'JFK',
          destinationAirportCode: 'CDG'
        };

        const errors = ProfileValidationService.validateFlightFields(formData, airplaneProfile);
        
        expect(errors.departureAirportCode).toBeUndefined();
        expect(errors.destinationAirportCode).toBeUndefined();
      });

      it('should handle same departure and destination airports', () => {
        const formData = {
          ...baseFormData,
          departure: 'New York',
          departureAirportCode: 'JFK',
          destinationAirportCode: 'JFK'
        };

        const errors = ProfileValidationService.validateFlightFields(formData, airplaneProfile);
        
        expect(errors.destinationAirportCode).toBe('Departure and destination airports cannot be the same.');
      });
    });

    describe('when flights are not required', () => {
      const trainProfile: any = {
        transportation: {
          primaryMode: 'train'
        }
      };

      it('should return no errors even when flight fields are missing', () => {
        const formData = {
          ...baseFormData,
          departure: '',
          departureAirportCode: '',
          destinationAirportCode: ''
        };

        const errors = ProfileValidationService.validateFlightFields(formData, trainProfile);
        
        expect(Object.keys(errors)).toHaveLength(0);
      });

      it('should still validate airport codes if provided', () => {
        const formData = {
          ...baseFormData,
          departure: 'New York',
          departureAirportCode: 'INVALID',
          destinationAirportCode: 'CDG'
        };

        const errors = ProfileValidationService.validateFlightFields(formData, trainProfile);
        
        expect(errors.departureAirportCode).toContain('valid airport code');
        expect(errors.destinationAirportCode).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle null profile', () => {
        const formData = {
          ...baseFormData,
          departure: '',
          departureAirportCode: '',
          destinationAirportCode: ''
        };

        const errors = ProfileValidationService.validateFlightFields(formData, null);
        
        expect(Object.keys(errors)).toHaveLength(0);
      });

      it('should handle undefined profile', () => {
        const formData = baseFormData;

        const errors = ProfileValidationService.validateFlightFields(formData, undefined);
        
        expect(Object.keys(errors)).toHaveLength(0);
      });

      it('should handle profile without transportation object', () => {
        const formData = baseFormData;
        const emptyProfile: any = {};

        const errors = ProfileValidationService.validateFlightFields(formData, emptyProfile);
        
        expect(Object.keys(errors)).toHaveLength(0);
      });

      it('should handle whitespace-only values', () => {
        const airplaneProfile: any = {
          transportation: {
            primaryMode: 'airplane'
          }
        };

        const formData = {
          ...baseFormData,
          departure: '   ',
          departureAirportCode: '  ',
          destinationAirportCode: '   '
        };

        const errors = ProfileValidationService.validateFlightFields(formData, airplaneProfile);
        
        // The service doesn't validate departure location directly, only airport codes
        expect(errors.departure).toBeUndefined();
        expect(errors.departureAirportCode).toBeUndefined(); // No airport code needed when departure is empty
        expect(errors.destinationAirportCode).toBeUndefined();
      });

      it('should handle mixed case airport codes', () => {
        const airplaneProfile: any = {
          transportation: {
            primaryMode: 'airplane'
          }
        };

        const formData = {
          ...baseFormData,
          departure: 'New York',
          departureAirportCode: 'jfk',
          destinationAirportCode: 'CdG'
        };

        const errors = ProfileValidationService.validateFlightFields(formData, airplaneProfile);
        
        expect(errors.departureAirportCode).toBeUndefined();
        expect(errors.destinationAirportCode).toBeUndefined();
      });
    });
  });

  describe('integration scenarios', () => {
    it('should provide consistent results between visibility and validation', () => {
      const profiles = [
        { transportation: { primaryMode: 'airplane' } },
        { transportation: { primaryMode: 'train' } },
        { transportation: { primaryMode: 'driving' } },
        null,
        undefined,
        {}
      ];

      const formDataWithoutFlights = {
        destination: 'Paris',
        startDate: '2025-11-01',
        endDate: '2025-11-07',
        tripType: 'leisure' as const,
        preferenceProfileId: 'test-profile',
        departure: '',
        departureAirportCode: '',
        destinationAirportCode: '',
        mustInclude: [],
        mustAvoid: [],
        flightPreferences: {
          class: 'economy' as const,
          stopPreference: 'any' as const,
          preferredAirlines: []
        }
      };

      profiles.forEach((profile: any) => {
        const isVisible = ProfileValidationService.isFlightSectionVisible(profile);
        const errors = ProfileValidationService.validateFlightFields(formDataWithoutFlights, profile);
        const hasFlightErrors = Object.keys(errors).some(key => 
          ['departure', 'departureAirportCode', 'destinationAirportCode'].includes(key)
        );

        if (isVisible) {
          expect(hasFlightErrors).toBe(true);
        } else {
          expect(hasFlightErrors).toBe(false);
        }
      });
    });
  });

  describe('validateProfileCompleteness', () => {
    it('should return error when profile is null', () => {
      const result = ProfileValidationService.validateProfileCompleteness(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Profile is required');
    });

    it('should return error when profile is undefined', () => {
      const result = ProfileValidationService.validateProfileCompleteness(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should return error when dob is missing', () => {
      const profile: any = { gender: 'male' };
      const result = ProfileValidationService.validateProfileCompleteness(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('date of birth');
    });

    it('should return error when gender is missing', () => {
      const profile: any = { dob: '1990-01-01' };
      const result = ProfileValidationService.validateProfileCompleteness(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('gender');
    });

    it('should return valid when profile is complete', () => {
      const profile: any = { dob: '1990-01-01', gender: 'male' };
      const result = ProfileValidationService.validateProfileCompleteness(profile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateTagsAndSpecialRequests', () => {
    const limits = { maxTags: 5, maxTagLength: 50, maxSpecialRequestsLength: 500 };

    it('should validate special requests length', () => {
      const formData = { specialRequests: 'a'.repeat(600) };
      const errors = ProfileValidationService.validateTagsAndSpecialRequests(formData, limits);
      expect(errors.specialRequests).toContain('500 characters');
    });

    it('should validate mustInclude count', () => {
      const formData = { mustInclude: ['a', 'b', 'c', 'd', 'e', 'f'] };
      const errors = ProfileValidationService.validateTagsAndSpecialRequests(formData, limits);
      expect(errors.mustInclude).toContain('5 items');
    });

    it('should validate mustAvoid count', () => {
      const formData = { mustAvoid: ['a', 'b', 'c', 'd', 'e', 'f'] };
      const errors = ProfileValidationService.validateTagsAndSpecialRequests(formData, limits);
      expect(errors.mustAvoid).toContain('5 items');
    });

    it('should validate mustInclude item length', () => {
      const formData = { mustInclude: ['a'.repeat(60)] };
      const errors = ProfileValidationService.validateTagsAndSpecialRequests(formData, limits);
      expect(errors.mustInclude).toContain('50 characters');
    });

    it('should validate mustAvoid item length', () => {
      const formData = { mustAvoid: ['a'.repeat(60)] };
      const errors = ProfileValidationService.validateTagsAndSpecialRequests(formData, limits);
      expect(errors.mustAvoid).toContain('50 characters');
    });

    it('should pass validation for valid data', () => {
      const formData = {
        specialRequests: 'Valid request',
        mustInclude: ['beach', 'museum'],
        mustAvoid: ['crowds']
      };
      const errors = ProfileValidationService.validateTagsAndSpecialRequests(formData, limits);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });
});
/**
 * Tests for Travel Preferences Error Classes
 */

import {
  TravelPreferencesError,
  TravelPreferencesErrorCode,
  createValidationError,
  createProfileNotFoundError,
  createDuplicateProfileNameError,
  createCannotDeleteDefaultError,
  createCannotDeleteLastProfileError,
  createMaxProfilesExceededError,
  createSaveFailedError,
  createLoadFailedError,
  createDeleteFailedError,
  createFirestoreError,
  createInvalidSignalError,
  createSignalSaveFailedError,
  isTravelPreferencesError,
} from '../../errors/TravelPreferencesErrors';

describe('TravelPreferencesErrors', () => {
  describe('TravelPreferencesError', () => {
    it('should create error with code and message', () => {
      const error = new TravelPreferencesError(
        'Test error',
        TravelPreferencesErrorCode.VALIDATION_FAILED
      );
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(TravelPreferencesErrorCode.VALIDATION_FAILED);
      expect(error.name).toBe('TravelPreferencesError');
    });

    it('should create error with details', () => {
      const details = { field: 'name', value: 'invalid' };
      const error = new TravelPreferencesError(
        'Test error',
        TravelPreferencesErrorCode.VALIDATION_FAILED,
        details
      );
      expect(error.details).toEqual(details);
    });

    describe('getUserMessage', () => {
      const testCases = [
        { code: TravelPreferencesErrorCode.VALIDATION_FAILED, expected: 'invalid values' },
        { code: TravelPreferencesErrorCode.INVALID_PROFILE_NAME, expected: 'Profile name is invalid' },
        { code: TravelPreferencesErrorCode.INVALID_BUDGET_RANGE, expected: 'Budget range is invalid' },
        { code: TravelPreferencesErrorCode.INVALID_ACTIVITIES, expected: 'Invalid activity selection' },
        { code: TravelPreferencesErrorCode.INVALID_FOOD_PREFERENCES, expected: 'Invalid food preferences' },
        { code: TravelPreferencesErrorCode.INVALID_ACCOMMODATION, expected: 'Invalid accommodation settings' },
        { code: TravelPreferencesErrorCode.INVALID_TRANSPORTATION, expected: 'Invalid transportation settings' },
        { code: TravelPreferencesErrorCode.INVALID_GROUP_SIZE, expected: 'Group size must be between' },
        { code: TravelPreferencesErrorCode.PROFILE_NOT_FOUND, expected: 'Profile not found' },
        { code: TravelPreferencesErrorCode.DUPLICATE_PROFILE_NAME, expected: 'already exists' },
        { code: TravelPreferencesErrorCode.CANNOT_DELETE_DEFAULT, expected: 'Cannot delete the default profile' },
        { code: TravelPreferencesErrorCode.CANNOT_DELETE_LAST_PROFILE, expected: 'Cannot delete the last profile' },
        { code: TravelPreferencesErrorCode.MAX_PROFILES_EXCEEDED, expected: 'Maximum number of profiles reached' },
        { code: TravelPreferencesErrorCode.SAVE_FAILED, expected: 'Failed to save preferences' },
        { code: TravelPreferencesErrorCode.LOAD_FAILED, expected: 'Failed to load preferences' },
        { code: TravelPreferencesErrorCode.DELETE_FAILED, expected: 'Failed to delete profile' },
        { code: TravelPreferencesErrorCode.FIRESTORE_ERROR, expected: 'Database error' },
        { code: TravelPreferencesErrorCode.INVALID_SIGNAL, expected: 'Invalid preference signal data' },
        { code: TravelPreferencesErrorCode.SIGNAL_SAVE_FAILED, expected: 'Failed to save preference learning data' },
        { code: TravelPreferencesErrorCode.NETWORK_ERROR, expected: 'Network error' },
        { code: TravelPreferencesErrorCode.PERMISSION_DENIED, expected: 'Permission denied' },
        { code: TravelPreferencesErrorCode.UNKNOWN_ERROR, expected: 'unexpected error' },
      ];

      testCases.forEach(({ code, expected }) => {
        it(`should return user-friendly message for ${code}`, () => {
          const error = new TravelPreferencesError('', code);
          expect(error.getUserMessage()).toContain(expected);
        });
      });
    });
  });

  describe('Error Factory Functions', () => {
    describe('createValidationError', () => {
      it('should create validation error with errors list', () => {
        const errors = ['Name is required', 'Budget is invalid'];
        const error = createValidationError(errors);
        expect(error.code).toBe(TravelPreferencesErrorCode.VALIDATION_FAILED);
        expect(error.message).toContain('Name is required');
        expect(error.message).toContain('Budget is invalid');
        expect(error.details).toEqual({ errors });
      });
    });

    describe('createProfileNotFoundError', () => {
      it('should create profile not found error', () => {
        const error = createProfileNotFoundError('profile-123');
        expect(error.code).toBe(TravelPreferencesErrorCode.PROFILE_NOT_FOUND);
        expect(error.message).toContain('profile-123');
        expect(error.details).toEqual({ profileId: 'profile-123' });
      });
    });

    describe('createDuplicateProfileNameError', () => {
      it('should create duplicate name error', () => {
        const error = createDuplicateProfileNameError('Family Vacation');
        expect(error.code).toBe(TravelPreferencesErrorCode.DUPLICATE_PROFILE_NAME);
        expect(error.message).toContain('Family Vacation');
        expect(error.details).toEqual({ name: 'Family Vacation' });
      });
    });

    describe('createCannotDeleteDefaultError', () => {
      it('should create cannot delete default error', () => {
        const error = createCannotDeleteDefaultError();
        expect(error.code).toBe(TravelPreferencesErrorCode.CANNOT_DELETE_DEFAULT);
        expect(error.message).toContain('Cannot delete default profile');
      });
    });

    describe('createCannotDeleteLastProfileError', () => {
      it('should create cannot delete last profile error', () => {
        const error = createCannotDeleteLastProfileError();
        expect(error.code).toBe(TravelPreferencesErrorCode.CANNOT_DELETE_LAST_PROFILE);
        expect(error.message).toContain('Cannot delete the last profile');
      });
    });

    describe('createMaxProfilesExceededError', () => {
      it('should create max profiles exceeded error', () => {
        const error = createMaxProfilesExceededError(10);
        expect(error.code).toBe(TravelPreferencesErrorCode.MAX_PROFILES_EXCEEDED);
        expect(error.message).toContain('10');
        expect(error.details).toEqual({ maxProfiles: 10 });
      });
    });

    describe('createSaveFailedError', () => {
      it('should create save failed error with reason', () => {
        const error = createSaveFailedError('Network timeout');
        expect(error.code).toBe(TravelPreferencesErrorCode.SAVE_FAILED);
        expect(error.message).toContain('Network timeout');
        expect(error.details).toEqual({ reason: 'Network timeout' });
      });

      it('should create save failed error without reason', () => {
        const error = createSaveFailedError();
        expect(error.code).toBe(TravelPreferencesErrorCode.SAVE_FAILED);
        expect(error.message).toContain('Unknown error');
      });
    });

    describe('createLoadFailedError', () => {
      it('should create load failed error', () => {
        const error = createLoadFailedError('Permission denied');
        expect(error.code).toBe(TravelPreferencesErrorCode.LOAD_FAILED);
        expect(error.message).toContain('Permission denied');
      });
    });

    describe('createDeleteFailedError', () => {
      it('should create delete failed error', () => {
        const error = createDeleteFailedError('Profile in use');
        expect(error.code).toBe(TravelPreferencesErrorCode.DELETE_FAILED);
        expect(error.message).toContain('Profile in use');
      });
    });

    describe('createFirestoreError', () => {
      it('should map permission-denied error', () => {
        const firebaseError = { code: 'permission-denied', message: 'Access denied' };
        const error = createFirestoreError(firebaseError);
        expect(error.code).toBe(TravelPreferencesErrorCode.PERMISSION_DENIED);
        expect(error.message).toContain('Permission denied');
      });

      it('should map unavailable error to network error', () => {
        const firebaseError = { code: 'unavailable', message: 'Service unavailable' };
        const error = createFirestoreError(firebaseError);
        expect(error.code).toBe(TravelPreferencesErrorCode.NETWORK_ERROR);
        expect(error.message).toContain('Network error');
      });

      it('should handle generic firestore error', () => {
        const firebaseError = { code: 'unknown', message: 'Something went wrong' };
        const error = createFirestoreError(firebaseError);
        expect(error.code).toBe(TravelPreferencesErrorCode.FIRESTORE_ERROR);
        expect(error.message).toContain('Something went wrong');
      });

      it('should handle error without code', () => {
        const firebaseError = { message: 'Generic error' };
        const error = createFirestoreError(firebaseError);
        expect(error.code).toBe(TravelPreferencesErrorCode.FIRESTORE_ERROR);
      });
    });

    describe('createInvalidSignalError', () => {
      it('should create invalid signal error', () => {
        const error = createInvalidSignalError('Missing confidence score');
        expect(error.code).toBe(TravelPreferencesErrorCode.INVALID_SIGNAL);
        expect(error.message).toContain('Missing confidence score');
        expect(error.details).toEqual({ reason: 'Missing confidence score' });
      });
    });

    describe('createSignalSaveFailedError', () => {
      it('should create signal save failed error', () => {
        const error = createSignalSaveFailedError('Database error');
        expect(error.code).toBe(TravelPreferencesErrorCode.SIGNAL_SAVE_FAILED);
        expect(error.message).toContain('Database error');
      });
    });
  });

  describe('isTravelPreferencesError', () => {
    it('should return true for TravelPreferencesError', () => {
      const error = new TravelPreferencesError('Test', TravelPreferencesErrorCode.VALIDATION_FAILED);
      expect(isTravelPreferencesError(error)).toBe(true);
    });

    it('should return false for generic Error', () => {
      const error = new Error('Generic error');
      expect(isTravelPreferencesError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isTravelPreferencesError({})).toBe(false);
      expect(isTravelPreferencesError(null)).toBe(false);
      expect(isTravelPreferencesError(undefined)).toBe(false);
    });
  });
});

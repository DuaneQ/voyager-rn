/**
 * Tests for Profile error factory
 */

import { isAppError, ErrorDomain } from '../../../errors/AppError';
import {
  createProfileNotFoundError,
  createProfileUpdateError,
  createProfileLoadError,
  createNotAuthenticatedError,
} from '../../../errors/factories/profileErrors';

describe('Profile Error Factories', () => {
  describe('createProfileNotFoundError', () => {
    it('should create error with safe user message', () => {
      const result = createProfileNotFoundError('BwYMglU1PCdkHeUCbXL9HFL2yuj1');

      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe('PROFILE_NOT_FOUND');
      expect(result.domain).toBe(ErrorDomain.PROFILE);
      expect(result.recoverable).toBe(true);
      // Must NOT contain the raw uid in user message
      expect(result.userMessage).not.toContain('BwYMglU1PCdkHeUCbXL9HFL2yuj1');
      expect(result.userMessage).toContain('signing out');
      // Technical message CAN contain uid (for logging)
      expect(result.message).toContain('BwYMglU1PCdkHeUCbXL9HFL2yuj1');
    });
  });

  describe('createProfileUpdateError', () => {
    it('should wrap raw error with safe user message', () => {
      const rawError = new Error('No document to update: projects/mundo1-1/...');
      const result = createProfileUpdateError(rawError, 'user-123');

      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe('PROFILE_UPDATE_FAILED');
      expect(result.userMessage).toBe('Failed to update your profile. Please try again.');
      expect(result.userMessage).not.toContain('projects/');
      expect(result.originalError).toBe(rawError);
    });

    it('should handle string error', () => {
      const result = createProfileUpdateError('timeout');
      expect(result.message).toContain('timeout');
      expect(result.userMessage).toBe('Failed to update your profile. Please try again.');
    });
  });

  describe('createProfileLoadError', () => {
    it('should create error with safe user message', () => {
      const rawError = new Error('connection failed');
      const result = createProfileLoadError(rawError, 'user-456');

      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe('PROFILE_LOAD_FAILED');
      expect(result.userMessage).toContain('load your profile');
      expect(result.recoverable).toBe(true);
    });
  });

  describe('createNotAuthenticatedError', () => {
    it('should create error prompting sign-in', () => {
      const result = createNotAuthenticatedError();

      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe('NOT_AUTHENTICATED');
      expect(result.domain).toBe(ErrorDomain.AUTH);
      expect(result.userMessage).toContain('sign in');
      expect(result.recoverable).toBe(true);
    });
  });
});

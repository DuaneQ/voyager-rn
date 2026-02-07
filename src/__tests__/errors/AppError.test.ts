/**
 * Tests for AppError base class
 */

import { AppError, ErrorSeverity, ErrorDomain, isAppError } from '../../errors/AppError';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create error with all required fields', () => {
      const error = new AppError({
        code: 'TEST_ERROR',
        message: 'Technical error message',
        userMessage: 'Something went wrong',
        domain: ErrorDomain.UNKNOWN,
      });

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Technical error message');
      expect(error.userMessage).toBe('Something went wrong');
      expect(error.domain).toBe(ErrorDomain.UNKNOWN);
      expect(error.name).toBe('AppError');
      expect(error.severity).toBe(ErrorSeverity.ERROR); // default
      expect(error.recoverable).toBe(false); // default
      expect(error.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should accept all optional fields', () => {
      const originalError = new Error('raw');
      const error = new AppError({
        code: 'TEST_ERROR',
        message: 'Technical message',
        userMessage: 'User message',
        domain: ErrorDomain.PROFILE,
        severity: ErrorSeverity.WARNING,
        recoverable: true,
        retryAction: 'Retry',
        originalError,
        context: { userId: '123' },
      });

      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.recoverable).toBe(true);
      expect(error.retryAction).toBe('Retry');
      expect(error.originalError).toBe(originalError);
      expect(error.context).toEqual({ userId: '123' });
    });

    it('should be an instance of Error', () => {
      const error = new AppError({
        code: 'TEST',
        message: 'msg',
        userMessage: 'user msg',
        domain: ErrorDomain.UNKNOWN,
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('getUserMessage', () => {
    it('should return the user-facing message', () => {
      const error = new AppError({
        code: 'TEST',
        message: 'Internal: No document to update: projects/mundo1-1/databases/...',
        userMessage: 'Your profile could not be found.',
        domain: ErrorDomain.PROFILE,
      });

      // This is the key test — getUserMessage must NEVER return internal details
      expect(error.getUserMessage()).toBe('Your profile could not be found.');
      expect(error.getUserMessage()).not.toContain('projects/');
      expect(error.getUserMessage()).not.toContain('databases/');
    });
  });

  describe('toLogObject', () => {
    it('should return structured log data including technical details', () => {
      const original = new Error('Firestore: No document to update');
      const error = new AppError({
        code: 'FIRESTORE_DOC_NOT_FOUND',
        message: 'Document not found during acceptTerms',
        userMessage: 'Your data was not found.',
        domain: ErrorDomain.FIRESTORE,
        severity: ErrorSeverity.ERROR,
        recoverable: true,
        originalError: original,
        context: { userId: 'abc' },
      });

      const logObj = error.toLogObject();

      expect(logObj.name).toBe('AppError');
      expect(logObj.code).toBe('FIRESTORE_DOC_NOT_FOUND');
      expect(logObj.domain).toBe(ErrorDomain.FIRESTORE);
      expect(logObj.severity).toBe(ErrorSeverity.ERROR);
      expect(logObj.message).toBe('Document not found during acceptTerms');
      expect(logObj.userMessage).toBe('Your data was not found.');
      expect(logObj.recoverable).toBe(true);
      expect(logObj.context).toEqual({ userId: 'abc' });
      expect((logObj.originalError as Record<string, unknown>).message).toBe('Firestore: No document to update');
    });

    it('should handle non-Error originalError', () => {
      const error = new AppError({
        code: 'TEST',
        message: 'msg',
        userMessage: 'user msg',
        domain: ErrorDomain.UNKNOWN,
        originalError: 'string error',
      });

      const logObj = error.toLogObject();
      expect(logObj.originalError).toBe('string error');
    });
  });

  describe('ErrorSeverity', () => {
    it('should have expected values', () => {
      expect(ErrorSeverity.INFO).toBe('info');
      expect(ErrorSeverity.WARNING).toBe('warning');
      expect(ErrorSeverity.ERROR).toBe('error');
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });
  });

  describe('ErrorDomain', () => {
    it('should have expected values', () => {
      expect(ErrorDomain.AUTH).toBe('auth');
      expect(ErrorDomain.PROFILE).toBe('profile');
      expect(ErrorDomain.FIRESTORE).toBe('firestore');
      expect(ErrorDomain.ITINERARY).toBe('itinerary');
      expect(ErrorDomain.CHAT).toBe('chat');
      expect(ErrorDomain.SEARCH).toBe('search');
      expect(ErrorDomain.NETWORK).toBe('network');
      expect(ErrorDomain.UNKNOWN).toBe('unknown');
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError({
        code: 'TEST',
        message: 'msg',
        userMessage: 'user msg',
        domain: ErrorDomain.UNKNOWN,
      });
      expect(isAppError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      expect(isAppError(new Error('regular error'))).toBe(false);
    });

    it('should return false for strings', () => {
      expect(isAppError('not an error')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });

    it('should return false for plain objects', () => {
      expect(isAppError({ code: 'TEST', message: 'msg' })).toBe(false);
    });
  });
});

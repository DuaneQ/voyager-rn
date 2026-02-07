/**
 * Tests for Firestore error factory
 */

import { isAppError, ErrorDomain, ErrorSeverity } from '../../../errors/AppError';
import { createFirestoreError } from '../../../errors/factories/firestoreErrors';

describe('createFirestoreError', () => {
  it('should detect "No document to update" production error', () => {
    // This is the exact error that appeared in production
    const rawError = new Error(
      'No document to update: projects/mundo1-1/databases/(default)/documents/users/BwYMglU1PCdkHeUCbXL9HFL2yuj1'
    );

    const result = createFirestoreError(rawError, 'acceptTerms', { userId: 'BwYMglU1PCdkHeUCbXL9HFL2yuj1' });

    expect(isAppError(result)).toBe(true);
    expect(result.code).toBe('FIRESTORE_DOC_NOT_FOUND');
    expect(result.userMessage).not.toContain('projects/');
    expect(result.userMessage).not.toContain('databases/');
    expect(result.userMessage).not.toContain('BwYMglU1PCdkHeUCbXL9HFL2yuj1');
    expect(result.userMessage).toContain('signing out');
    expect(result.recoverable).toBe(true);
    expect(result.originalError).toBe(rawError);
  });

  it('should handle not-found error code', () => {
    const rawError = { code: 'not-found', message: 'Document not found' };
    const result = createFirestoreError(rawError, 'getProfile');

    expect(result.code).toBe('FIRESTORE_DOC_NOT_FOUND');
    expect(result.domain).toBe(ErrorDomain.FIRESTORE);
    expect(result.recoverable).toBe(true);
  });

  it('should handle NOT_FOUND in message', () => {
    const rawError = new Error('5 NOT_FOUND: No entity to update');
    const result = createFirestoreError(rawError, 'updateProfile');

    expect(result.code).toBe('FIRESTORE_DOC_NOT_FOUND');
  });

  it('should handle permission-denied', () => {
    const rawError = { code: 'permission-denied', message: 'Missing permissions' };
    const result = createFirestoreError(rawError, 'updateProfile');

    expect(result.code).toBe('FIRESTORE_PERMISSION_DENIED');
    expect(result.userMessage).toContain('permission');
    expect(result.recoverable).toBe(true);
  });

  it('should handle unavailable (network error)', () => {
    const rawError = { code: 'unavailable', message: 'The service is currently unavailable' };
    const result = createFirestoreError(rawError, 'loadProfile');

    expect(result.code).toBe('FIRESTORE_NETWORK_ERROR');
    expect(result.domain).toBe(ErrorDomain.NETWORK);
    expect(result.severity).toBe(ErrorSeverity.WARNING);
    expect(result.userMessage).toContain('internet');
    expect(result.recoverable).toBe(true);
  });

  it('should handle deadline-exceeded', () => {
    const rawError = { code: 'deadline-exceeded', message: 'Deadline exceeded' };
    const result = createFirestoreError(rawError, 'query');

    expect(result.code).toBe('FIRESTORE_NETWORK_ERROR');
    expect(result.recoverable).toBe(true);
  });

  it('should handle already-exists', () => {
    const rawError = { code: 'already-exists', message: 'Document already exists' };
    const result = createFirestoreError(rawError, 'createDoc');

    expect(result.code).toBe('FIRESTORE_ALREADY_EXISTS');
    expect(result.recoverable).toBe(false);
  });

  it('should handle resource-exhausted', () => {
    const rawError = { code: 'resource-exhausted', message: 'Quota exceeded' };
    const result = createFirestoreError(rawError, 'batchWrite');

    expect(result.code).toBe('FIRESTORE_RATE_LIMITED');
    expect(result.userMessage).toContain('wait');
    expect(result.recoverable).toBe(true);
  });

  it('should handle unknown error codes with generic message', () => {
    const rawError = { code: 'internal', message: 'Internal server error' };
    const result = createFirestoreError(rawError, 'unknownOp');

    expect(result.code).toBe('FIRESTORE_ERROR');
    expect(result.userMessage).toBe('Something went wrong. Please try again.');
    expect(result.recoverable).toBe(true);
  });

  it('should include operation in technical message', () => {
    const rawError = new Error('test');
    const result = createFirestoreError(rawError, 'loadItineraries');

    expect(result.message).toContain('loadItineraries');
  });

  it('should include context in error', () => {
    const rawError = new Error('test');
    const result = createFirestoreError(rawError, 'updateDoc', { userId: '123', field: 'name' });

    expect(result.context).toEqual({ userId: '123', field: 'name', operation: 'updateDoc' });
  });

  it('should handle null/undefined rawError gracefully', () => {
    const result = createFirestoreError(null, 'testOp');

    expect(isAppError(result)).toBe(true);
    expect(result.code).toBe('FIRESTORE_ERROR');
    expect(result.userMessage).toBe('Something went wrong. Please try again.');
  });
});

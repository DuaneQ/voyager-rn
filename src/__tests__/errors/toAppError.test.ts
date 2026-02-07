/**
 * Tests for toAppError helper
 */

import { AppError, ErrorDomain, ErrorSeverity, isAppError } from '../../errors/AppError';
import { toAppError } from '../../errors/toAppError';

describe('toAppError', () => {
  it('should pass through AppError instances unchanged', () => {
    const original = new AppError({
      code: 'TEST_CODE',
      message: 'technical',
      userMessage: 'user msg',
      domain: ErrorDomain.PROFILE,
    });

    const result = toAppError(original);
    expect(result).toBe(original); // Same reference — no wrapping
  });

  it('should wrap Error instances with a safe user message', () => {
    const rawError = new Error('No document to update: projects/mundo1-1/databases/...');
    const result = toAppError(rawError, ErrorDomain.FIRESTORE);

    expect(isAppError(result)).toBe(true);
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe(rawError.message); // Technical detail preserved for logs
    expect(result.userMessage).toBe('Something went wrong. Please try again.'); // Safe
    expect(result.domain).toBe(ErrorDomain.FIRESTORE);
    expect(result.originalError).toBe(rawError);
    expect(result.recoverable).toBe(true);
  });

  it('should wrap string errors', () => {
    const result = toAppError('connection timeout');

    expect(isAppError(result)).toBe(true);
    expect(result.message).toBe('connection timeout');
    expect(result.userMessage).toBe('Something went wrong. Please try again.');
    expect(result.domain).toBe(ErrorDomain.UNKNOWN);
    expect(result.originalError).toBe('connection timeout');
  });

  it('should handle null', () => {
    const result = toAppError(null);

    expect(isAppError(result)).toBe(true);
    expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    expect(result.recoverable).toBe(false);
  });

  it('should handle undefined', () => {
    const result = toAppError(undefined);

    expect(isAppError(result)).toBe(true);
    expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
  });

  it('should handle number errors', () => {
    const result = toAppError(404);

    expect(isAppError(result)).toBe(true);
    expect(result.message).toBe('404');
    expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
  });

  it('should use default domain UNKNOWN when not provided', () => {
    const result = toAppError(new Error('test'));
    expect(result.domain).toBe(ErrorDomain.UNKNOWN);
  });

  it('should use provided domain', () => {
    const result = toAppError(new Error('test'), ErrorDomain.CHAT);
    expect(result.domain).toBe(ErrorDomain.CHAT);
  });

  it('should set severity to ERROR', () => {
    const result = toAppError(new Error('test'));
    expect(result.severity).toBe(ErrorSeverity.ERROR);
  });
});

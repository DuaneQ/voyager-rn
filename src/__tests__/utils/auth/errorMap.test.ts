import { mapAuthError } from '../../../utils/auth/errorMap';

describe('mapAuthError', () => {
  describe('Known Error Codes', () => {
    it('should map INVALID_CREDENTIALS', () => {
      const result = mapAuthError('INVALID_CREDENTIALS');
      expect(result).toBe('Email or password is incorrect.');
    });

    it('should map EMAIL_NOT_VERIFIED', () => {
      const result = mapAuthError('EMAIL_NOT_VERIFIED');
      expect(result).toBe('Your email is not verified. Please verify or resend verification email.');
    });

    it('should map USER_EXISTS', () => {
      const result = mapAuthError('USER_EXISTS');
      expect(result).toBe('An account with this email already exists.');
    });

    it('should map RATE_LIMITED', () => {
      const result = mapAuthError('RATE_LIMITED');
      expect(result).toBe('Too many attempts. Please wait and try again later.');
    });

    it('should map NETWORK_ERROR', () => {
      const result = mapAuthError('NETWORK_ERROR');
      expect(result).toBe('Network error. Check your connection and try again.');
    });
  });

  describe('Unknown Error Codes', () => {
    it('should return default message for unknown code', () => {
      const result = mapAuthError('UNKNOWN_ERROR');
      expect(result).toBe('An unexpected error occurred.');
    });

    it('should return custom fallback for unknown code', () => {
      const result = mapAuthError('UNKNOWN_ERROR', 'Custom fallback message');
      expect(result).toBe('Custom fallback message');
    });
  });

  describe('No Error Code', () => {
    it('should return default message when code is undefined', () => {
      const result = mapAuthError(undefined);
      expect(result).toBe('An unexpected error occurred.');
    });

    it('should return custom fallback when code is undefined', () => {
      const result = mapAuthError(undefined, 'Custom fallback');
      expect(result).toBe('Custom fallback');
    });

    it('should return default message when code is empty string', () => {
      const result = mapAuthError('');
      expect(result).toBe('An unexpected error occurred.');
    });

    it('should return custom fallback when code is empty string', () => {
      const result = mapAuthError('', 'Empty code fallback');
      expect(result).toBe('Empty code fallback');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null code gracefully', () => {
      const result = mapAuthError(null as any);
      expect(result).toBe('An unexpected error occurred.');
    });

    it('should handle numeric code', () => {
      const result = mapAuthError('123' as any);
      expect(result).toBe('An unexpected error occurred.');
    });

    it('should handle code with special characters', () => {
      const result = mapAuthError('ERROR@#$%');
      expect(result).toBe('An unexpected error occurred.');
    });
  });
});

import { mapAuthError } from '../../utils/auth/errorMap';
import { loginSchema, registerSchema, forgotPasswordSchema } from '../../utils/auth/validators';

describe('Auth Utilities', () => {
  describe('errorMap', () => {
    it('maps INVALID_CREDENTIALS to user-friendly message', () => {
      const result = mapAuthError('INVALID_CREDENTIALS', 'Invalid credentials');
      expect(result).toBe('Email or password is incorrect.');
    });

    it('maps EMAIL_NOT_VERIFIED to user-friendly message', () => {
      const result = mapAuthError('EMAIL_NOT_VERIFIED', 'Email not verified');
      expect(result).toBe('Your email is not verified. Please verify or resend verification email.');
    });

    it('maps USER_EXISTS to user-friendly message', () => {
      const result = mapAuthError('USER_EXISTS', 'User exists');
      expect(result).toBe('An account with this email already exists.');
    });

    it('maps RATE_LIMITED to user-friendly message', () => {
      const result = mapAuthError('RATE_LIMITED', 'Rate limited');
      expect(result).toBe('Too many attempts. Please wait and try again later.');
    });

    it('maps NETWORK_ERROR to user-friendly message', () => {
      const result = mapAuthError('NETWORK_ERROR', 'Network error');
      expect(result).toBe('Network error. Check your connection and try again.');
    });

    it('returns fallback message for unknown error codes', () => {
      const result = mapAuthError('UNKNOWN_ERROR', 'Some unknown error');
      expect(result).toBe('Some unknown error');
    });

    it('handles missing error code', () => {
      const result = mapAuthError(undefined, 'Generic error');
      expect(result).toBe('Generic error');
    });

    it('returns default message when no code or fallback provided', () => {
      const result = mapAuthError(undefined, undefined);
      expect(result).toBe('An unexpected error occurred.');
    });
  });

  describe('validators', () => {
    describe('loginSchema', () => {
      it('validates valid login data', () => {
        const data = { email: 'test@example.com', password: 'password123' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('rejects invalid email', () => {
        const data = { email: 'invalid-email', password: 'password123' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('valid email');
        }
      });

      it('rejects short password', () => {
        const data = { email: 'test@example.com', password: '12345' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('6 characters');
        }
      });

      it('rejects missing email', () => {
        const data = { password: 'password123' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('rejects missing password', () => {
        const data = { email: 'test@example.com' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('registerSchema', () => {
      it('validates valid registration data', () => {
        const data = {
          email: 'test@example.com',
          password: 'password1234',
          displayName: 'Test User',
        };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('rejects password shorter than 8 characters', () => {
        const data = {
          email: 'test@example.com',
          password: 'pass123',
          displayName: 'Test User',
        };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('8 characters');
        }
      });

      it('rejects short display name', () => {
        const data = {
          email: 'test@example.com',
          password: 'password1234',
          displayName: 'T',
        };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('name');
        }
      });
    });

    describe('forgotPasswordSchema', () => {
      it('validates valid email', () => {
        const data = { email: 'test@example.com' };
        const result = forgotPasswordSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('rejects invalid email', () => {
        const data = { email: 'not-an-email' };
        const result = forgotPasswordSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('rejects missing email', () => {
        const data = {};
        const result = forgotPasswordSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });
});

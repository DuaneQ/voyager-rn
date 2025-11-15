import mapAuthError from '../../../src/utils/auth/firebaseAuthErrorMapper';

describe('firebaseAuthErrorMapper', () => {
  it('maps REST EMAIL_NOT_FOUND to friendly message', () => {
    const err = new Error('EMAIL_NOT_FOUND');
    const friendly = mapAuthError(err);
    expect(friendly.message).toContain('No account found');
    expect(friendly.code).toBe('EMAIL_NOT_FOUND');
  });

  it('maps REST INVALID_PASSWORD to friendly message', () => {
    const err = new Error('INVALID_PASSWORD');
    const friendly = mapAuthError(err);
    expect(friendly.message).toContain('Wrong password');
  });

  it('maps web SDK auth/email-already-in-use to friendly message', () => {
    const err: any = { code: 'auth/email-already-in-use', message: 'The email address is already in use by another account.' };
    const friendly = mapAuthError(err);
    expect(friendly.message).toContain('already exists');
    expect(friendly.code).toBe('auth/email-already-in-use');
  });

  it('returns raw message for unknown shapes', () => {
    const err = new Error('SOME_UNKNOWN_ERROR');
    const friendly = mapAuthError(err);
    expect(friendly.message).toBe('SOME_UNKNOWN_ERROR');
  });
});

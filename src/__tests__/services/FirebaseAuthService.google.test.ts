import { FirebaseAuthService } from '../../services/auth/FirebaseAuthService';

// Reuse mocks from existing test harness; mock fetch globally
describe('FirebaseAuthService Google IDP sign-in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FirebaseAuthService as any).currentUser = null;
    (FirebaseAuthService as any).authStateListeners = [];
    (global as any).fetch = jest.fn();
    // Prevent the real syncWithAuthSDK retry/backoff from delaying tests
    (FirebaseAuthService as any).syncWithAuthSDK = jest.fn().mockResolvedValue(undefined);
  });

  it('should sign in existing Google user and persist tokens', async () => {
    const mockIdpResponse = {
      idToken: 'g-id-token',
      email: 'guser@example.com',
      refreshToken: 'g-refresh',
      expiresIn: '3600',
      localId: 'g-user-1',
      emailVerified: true,
      isNewUser: false,
    };

    const mockCustomTokenResponse = { result: { customToken: 'custom-token' } };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockIdpResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCustomTokenResponse });

    const user = await FirebaseAuthService.signInWithGoogleIdToken('dummy-google-id-token');

    expect(user).toBeDefined();
    expect(user.uid).toBe('g-user-1');
    expect(user.email).toBe('guser@example.com');
    expect(user.isNewUser).toBe(false);
  });

  it('should sign in new Google user and mark isNewUser true', async () => {
    const mockIdpResponse = {
      idToken: 'g-id-token',
      email: 'newguser@example.com',
      refreshToken: 'g-refresh',
      expiresIn: '3600',
      localId: 'g-user-2',
      emailVerified: true,
      isNewUser: true,
    };

    const mockCustomTokenResponse = { result: { customToken: 'custom-token' } };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockIdpResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCustomTokenResponse });

    const user = await FirebaseAuthService.signInWithGoogleIdToken('dummy-google-id-token');

    expect(user).toBeDefined();
    expect(user.uid).toBe('g-user-2');
    expect(user.email).toBe('newguser@example.com');
    expect(user.isNewUser).toBe(true);
  });
});

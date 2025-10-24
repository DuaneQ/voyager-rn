// This file intentionally keeps a lightweight sanity check. The cross-platform
// Google sign-in behavior is tested in detail in
// src/__tests__/auth/googleSignIn.test.ts which exercises the helper used by
// `AuthContext`. Mounting the full AuthProvider in Jest produced fragile,
// environment-specific failures (hooks dispatcher being unavailable), so we
// prefer focused unit tests for the signing logic.

// Ensure react-native Platform is mocked so requiring the helper doesn't try to
// import the real react-native ESM code (which Jest doesn't transform by
// default in this repo).
jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }), { virtual: true });

describe('Google sign-in flows (AuthContext) - stability wrapper', () => {
  it('sanity: googleSignIn helper exists', () => {
    const signInWithGoogle = require('../../utils/auth/googleSignIn').default;
    expect(typeof signInWithGoogle).toBe('function');
  });
});

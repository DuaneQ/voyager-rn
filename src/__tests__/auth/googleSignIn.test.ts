/**
 * Tests for src/utils/auth/googleSignIn.ts
 * Covers web and native flows by mocking react-native Platform and firebase/auth
 */

describe('googleSignIn helper', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('calls signInWithPopup on web', async () => {
    // Arrange: mock environment as web and firebase/auth
    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));

    const mockSignInWithPopup = jest.fn(() => Promise.resolve({ user: { uid: 'web-uid' } }));
    const mockGoogleAuthProvider = jest.fn().mockImplementation(() => ({}));

    jest.doMock('firebase/auth', () => ({
      GoogleAuthProvider: mockGoogleAuthProvider,
      signInWithPopup: mockSignInWithPopup,
      signInWithCredential: jest.fn(),
    }));

    const signInWithGoogle = require('../../utils/auth/googleSignIn').default;

    const fakeAuth = { app: 'fake' };

    // Act
    const res = await signInWithGoogle(fakeAuth);

    // Assert
    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ user: { uid: 'web-uid' } });
  });

  it('uses native GoogleSignin and signInWithCredential on mobile', async () => {
    // Arrange: mock environment as ios and the native google-signin package
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));

    const hasPlayServices = jest.fn(() => Promise.resolve(true));
    const signIn = jest.fn(() => Promise.resolve({ idToken: 'native-id-token' }));

    // create a virtual mock for the native google-signin package
    jest.doMock('@react-native-google-signin/google-signin', () => ({
      GoogleSignin: { hasPlayServices, signIn },
    }), { virtual: true });

    const mockCredential = { token: 'cred' };
    const mockCredentialFn = jest.fn(() => mockCredential);
    const mockSignInWithCredential = jest.fn(() => Promise.resolve({ user: { uid: 'native-uid' } }));

    jest.doMock('firebase/auth', () => ({
      GoogleAuthProvider: { credential: mockCredentialFn },
      signInWithPopup: jest.fn(),
      signInWithCredential: mockSignInWithCredential,
    }));

    const signInWithGoogle = require('../../utils/auth/googleSignIn').default;

    const fakeAuth = { app: 'fake' };

    // Act
    const res = await signInWithGoogle(fakeAuth);

    // Assert
    expect(hasPlayServices).toHaveBeenCalled();
    expect(signIn).toHaveBeenCalled();
    expect(mockCredentialFn).toHaveBeenCalledWith('native-id-token');
    expect(mockSignInWithCredential).toHaveBeenCalledWith(fakeAuth, mockCredential);
    expect(res).toEqual({ user: { uid: 'native-uid' } });
  });
});

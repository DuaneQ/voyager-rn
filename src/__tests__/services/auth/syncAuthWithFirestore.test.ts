import { syncAuthWithFirestore, signOutFromFirestore } from '../../../services/auth/syncAuthWithFirestore';
import { auth, signInWithCustomToken, getCloudFunctionUrl } from '../../../config/firebaseConfig';

// Mock Firebase config
jest.mock('../../../config/firebaseConfig', () => ({
  auth: {
    signOut: jest.fn()
  },
  signInWithCustomToken: jest.fn(),
  getCloudFunctionUrl: jest.fn(() => 'https://test-function-url.com/getCustomToken')
}));

// Mock fetch
global.fetch = jest.fn();

describe('syncAuthWithFirestore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully sync auth with custom token', async () => {
    const mockIdToken = 'test-id-token';
    const mockCustomToken = 'test-custom-token';

    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ customToken: mockCustomToken })
    });

    (signInWithCustomToken as jest.Mock).mockResolvedValue({});

    await syncAuthWithFirestore(mockIdToken);

    expect(getCloudFunctionUrl).toHaveBeenCalledWith('getCustomToken');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-function-url.com/getCustomToken',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockIdToken}`
        })
      })
    );
    expect(signInWithCustomToken).toHaveBeenCalledWith(auth, mockCustomToken);
  });

  it('should throw error if no custom token returned', async () => {
    const mockIdToken = 'test-id-token';

    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({})
    });

    await expect(syncAuthWithFirestore(mockIdToken)).rejects.toThrow(
      'No custom token returned from function'
    );
  });

  it('should throw error if fetch fails', async () => {
    const mockIdToken = 'test-id-token';
    const fetchError = new Error('Network error');

    (global.fetch as jest.Mock).mockRejectedValue(fetchError);

    await expect(syncAuthWithFirestore(mockIdToken)).rejects.toThrow('Network error');
  });

  it('should throw error if signInWithCustomToken fails', async () => {
    const mockIdToken = 'test-id-token';
    const mockCustomToken = 'test-custom-token';
    const signInError = new Error('Sign in failed');

    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ customToken: mockCustomToken })
    });

    (signInWithCustomToken as jest.Mock).mockRejectedValue(signInError);

    await expect(syncAuthWithFirestore(mockIdToken)).rejects.toThrow('Sign in failed');
  });
});

describe('signOutFromFirestore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully sign out', async () => {
    (auth.signOut as jest.Mock).mockResolvedValue(undefined);

    await signOutFromFirestore();

    expect(auth.signOut).toHaveBeenCalled();
  });

  it('should not throw error if sign out fails', async () => {
    const signOutError = new Error('Sign out failed');
    (auth.signOut as jest.Mock).mockRejectedValue(signOutError);

    // Should not throw, just log error
    await expect(signOutFromFirestore()).resolves.toBeUndefined();
  });
});

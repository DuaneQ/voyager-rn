/**
 * Tests for useTermsAcceptance hook
 * Verifies that hasAcceptedTerms is derived from UserProfileContext (no extra
 * Firestore read) and that acceptTerms writes to Firestore and updates local state.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useTermsAcceptance } from '../../hooks/useTermsAcceptance';
import { setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../context/UserProfileContext';

jest.mock('firebase/firestore');
jest.mock('../../config/firebaseConfig', () => ({ auth: {}, db: {} }));
jest.mock('../../context/AuthContext');
jest.mock('../../context/UserProfileContext');

const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
const mockSetUserProfile = jest.fn();

const baseAuth = {
  user: { uid: 'test-user-id', email: 'test@example.com', emailVerified: true } as any,
  status: 'authenticated' as const,
  isInitializing: false,
  signIn: jest.fn(), signUp: jest.fn(), signOut: jest.fn(),
  sendPasswordReset: jest.fn(), resendVerification: jest.fn(),
  refreshAuthState: jest.fn(), hasUnverifiedUser: jest.fn(),
  signInWithGoogle: jest.fn(), signUpWithGoogle: jest.fn(),
  signInWithApple: jest.fn(), signUpWithApple: jest.fn(),
};

function mockProfileContext(userProfile: any, isLoading = false) {
  mockUseUserProfile.mockReturnValue({
    userProfile,
    setUserProfile: mockSetUserProfile,
    updateUserProfile: jest.fn(),
    updateProfile: jest.fn(),
    isLoading,
    loading: isLoading,
  });
}

describe('useTermsAcceptance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(baseAuth);
    mockProfileContext(null);
  });

  it('should return false when userProfile is null', () => {
    const { result } = renderHook(() => useTermsAcceptance());
    expect(result.current.hasAcceptedTerms).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return true when userProfile has accepted current version of terms', () => {
    mockProfileContext({
      uid: 'test-user-id',
      termsOfService: { accepted: true, version: '1.0.0', acceptedAt: null },
    });

    const { result } = renderHook(() => useTermsAcceptance());
    expect(result.current.hasAcceptedTerms).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should return false when terms are not accepted', () => {
    mockProfileContext({
      uid: 'test-user-id',
      termsOfService: { accepted: false, version: '1.0.0', acceptedAt: null },
    });

    const { result } = renderHook(() => useTermsAcceptance());
    expect(result.current.hasAcceptedTerms).toBe(false);
  });

  it('should return false when terms version is outdated', () => {
    mockProfileContext({
      uid: 'test-user-id',
      termsOfService: { accepted: true, version: '0.9.0', acceptedAt: null },
    });

    const { result } = renderHook(() => useTermsAcceptance());
    expect(result.current.hasAcceptedTerms).toBe(false);
  });

  it('should return false when termsOfService field is absent', () => {
    mockProfileContext({ uid: 'test-user-id', email: 'test@example.com' });

    const { result } = renderHook(() => useTermsAcceptance());
    expect(result.current.hasAcceptedTerms).toBe(false);
  });

  it('should reflect isLoading from UserProfileContext while profile is loading', () => {
    mockProfileContext(null, true);

    const { result } = renderHook(() => useTermsAcceptance());
    expect(result.current.isLoading).toBe(true);
  });

  it('should accept terms, call setDoc once, and update local profile state', async () => {
    const existingProfile = { uid: 'test-user-id', email: 'test@example.com' };
    mockProfileContext(existingProfile);
    mockSetDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTermsAcceptance());

    await act(async () => {
      await result.current.acceptTerms();
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    // setUserProfile receives a functional updater — call it with the existing profile
    // and verify the merged result.
    expect(mockSetUserProfile).toHaveBeenCalledTimes(1);
    const updater = mockSetUserProfile.mock.calls[0][0];
    const updated = updater(existingProfile);
    expect(updated).toMatchObject({
      ...existingProfile,
      termsOfService: { accepted: true, version: '1.0.0', acceptedAt: null },
    });
    expect(result.current.error).toBeNull();
  });

  it('should update profile state even when userProfile is null at the time of acceptance', async () => {
    // Simulates the race: onSnapshot has not yet fired, userProfile === null.
    mockProfileContext(null);
    mockSetDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTermsAcceptance());

    await act(async () => {
      await result.current.acceptTerms();
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    // The functional updater must build a minimal stub rather than returning null.
    const updater = mockSetUserProfile.mock.calls[0][0];
    const updated = updater(null);
    expect(updated).toMatchObject({
      uid: 'test-user-id',
      termsOfService: { accepted: true, version: '1.0.0', acceptedAt: null },
    });
  });

  it('should set error state and rethrow when Firestore write fails', async () => {
    mockProfileContext({ uid: 'test-user-id' });
    mockSetDoc.mockRejectedValue(new Error('Firestore write failed'));

    const { result } = renderHook(() => useTermsAcceptance());

    await act(async () => {
      await expect(result.current.acceptTerms()).rejects.toBeTruthy();
    });

    expect(result.current.error).not.toBeNull();
    expect(mockSetUserProfile).not.toHaveBeenCalled();
  });

  it('should return hasAcceptedTerms from checkTermsStatus without a Firestore read', async () => {
    mockProfileContext({
      uid: 'test-user-id',
      termsOfService: { accepted: true, version: '1.0.0', acceptedAt: null },
    });

    const { result } = renderHook(() => useTermsAcceptance());

    let checkResult = false;
    await act(async () => {
      checkResult = await result.current.checkTermsStatus();
    });

    expect(checkResult).toBe(true);
    // No Firestore read should happen — derived from userProfile
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('should clear error state when checkTermsStatus is called (retry path)', async () => {
    // Simulate a prior failed acceptTerms that set error state.
    mockProfileContext({ uid: 'test-user-id' });
    mockSetDoc.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTermsAcceptance());

    // First: trigger an error via a failed acceptTerms
    await act(async () => {
      await expect(result.current.acceptTerms()).rejects.toBeTruthy();
    });
    expect(result.current.error).not.toBeNull();

    // Now: user presses Retry → checkTermsStatus should clear the error
    await act(async () => {
      await result.current.checkTermsStatus();
    });
    expect(result.current.error).toBeNull();
    // TermsGuard can now show the ToS modal again (hasAcceptedTerms is still false)
    expect(result.current.hasAcceptedTerms).toBe(false);
  });
});

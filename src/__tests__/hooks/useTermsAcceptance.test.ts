/**
 * Tests for useTermsAcceptance hook
 * Verifies Terms of Service acceptance logic and Firestore integration
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTermsAcceptance } from '../../hooks/useTermsAcceptance';
import { getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Mock Firebase modules
jest.mock('firebase/firestore');
jest.mock('firebase/auth');
jest.mock('../../config/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' },
  },
  db: {},
}));

const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>;

describe('useTermsAcceptance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default: user is logged in
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      if (typeof callback === 'function') {
        callback({ uid: 'test-user-id' } as any);
      }
      return jest.fn(); // unsubscribe function
    });
  });

  it('should initialize with loading state', () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());
    
    expect(result.current.isLoading).toBe(true);
  });

  it('should check terms status on mount for authenticated user', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        termsOfService: {
          accepted: true,
          acceptedAt: new Date(),
          version: '1.0.0',
        },
      }),
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAcceptedTerms).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return false if user has not accepted terms', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        termsOfService: {
          accepted: false,
          acceptedAt: null,
          version: '1.0.0',
        },
      }),
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAcceptedTerms).toBe(false);
  });

  it('should return false if terms version is outdated', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        termsOfService: {
          accepted: true,
          acceptedAt: new Date(),
          version: '0.9.0', // Old version
        },
      }),
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAcceptedTerms).toBe(false);
  });

  it('should accept terms and update Firestore', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        termsOfService: {
          accepted: false,
        },
      }),
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.acceptTerms();
    });

    expect(mockUpdateDoc).toHaveBeenCalled();
    expect(result.current.hasAcceptedTerms).toBe(true);
  });

  it('should handle user document not existing', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => undefined,
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAcceptedTerms).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should manually check terms status', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        termsOfService: {
          accepted: true,
          acceptedAt: new Date(),
          version: '1.0.0',
        },
      }),
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let manualCheckResult: boolean = false;
    await act(async () => {
      manualCheckResult = await result.current.checkTermsStatus();
    });

    expect(manualCheckResult).toBe(true);
    expect(mockGetDoc).toHaveBeenCalled();
  });
});

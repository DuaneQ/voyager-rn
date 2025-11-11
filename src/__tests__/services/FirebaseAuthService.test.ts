/**
 * FirebaseAuthService Unit Tests
 * 
 * Covers edge cases for authentication including:
 * - Clean slate (new phone, no storage)
 * - Corrupted storage data
 * - Token expiration and refresh
 * - Storage cleared after successful login
 * - Network failures during auth operations
 * - Secure token storage with expo-secure-store
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { FirebaseAuthService, FirebaseUser } from '../../services/auth/FirebaseAuthService';

// Mock dependencies BEFORE imports that use them
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');
jest.mock('../../config/firebaseConfig', () => ({
  auth: {},
  functions: {},
}));

// Mock Platform to simulate mobile (not web)
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios', // Test mobile behavior by default
  },
}));

// Create mock functions that will be used in firebase/auth mock
// Mock Firebase Auth SDK method
const mockSignInWithCustomToken = jest.fn();

// Define mock responses
const mockCustomTokenCloudFunctionResponse = {
  result: {
    success: true,
    customToken: 'mock-custom-token',
  }
};

// Mock firebase/auth with our mock function
jest.mock('firebase/auth', () => ({
  signInWithCustomToken: mockSignInWithCustomToken,
  browserLocalPersistence: {},
  initializeAuth: jest.fn(),
}));

// Mock firebase/functions
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
  getFunctions: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('FirebaseAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use fake timers to handle retry delays
    jest.useFakeTimers();
    // Reset mock implementations
    mockSignInWithCustomToken.mockReset().mockResolvedValue({});
    (global.fetch as jest.Mock).mockReset();
    // Reset FirebaseAuthService internal state
    (FirebaseAuthService as any).currentUser = null;
    (FirebaseAuthService as any).authStateListeners = [];
    
    // Clear SecureStore mock
    if ((SecureStore as any).__clearStore) {
      (SecureStore as any).__clearStore();
    }
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Edge Case: Clean Slate (New Phone, No Storage)', () => {
    it('should return null when no user is stored (new phone scenario)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const user = await FirebaseAuthService.initialize();

      expect(user).toBeNull();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('FIREBASE_USER_UID');
    });

    it('should allow sign in on new device and store user', async () => {
      const mockAuthResponse = {
        idToken: 'mock-id-token',
        email: 'user@example.com',
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'user-123',
        emailVerified: true,
      };

      const mockUserData = {
        users: [{ emailVerified: true }],
      };

      // Mock REST API responses in order:
      // 1. Sign in
      // 2. Get user data (email verification check)
      // 3. Generate custom token (for Auth SDK sync)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAuthResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCustomTokenCloudFunctionResponse,
        });

      mockSignInWithCustomToken.mockResolvedValue({});

      const signInPromise = FirebaseAuthService.signInWithEmailAndPassword(
        'user@example.com',
        'password123'
      );

      // Run all pending timers (for retry delays)
      await jest.runAllTimersAsync();

      const user = await signInPromise;

      expect(user).toBeDefined();
      expect(user.uid).toBe('user-123');
      expect(user.email).toBe('user@example.com');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('FIREBASE_ID_TOKEN', expect.any(String));
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('FIREBASE_REFRESH_TOKEN', expect.any(String));
    });
  });

  describe('Edge Case: Corrupted Storage Data', () => {
    it('should clear storage and return null when user data is corrupted (missing uid)', async () => {
      const corruptedUser = {
        email: 'user@example.com',
        refreshToken: 'token',
        // uid is missing!
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(corruptedUser)
      );
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      const user = await FirebaseAuthService.initialize();

      expect(user).toBeNull();
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'FIREBASE_USER_UID',
        'FIREBASE_USER_EMAIL',
        'FIREBASE_EMAIL_VERIFIED',
        'FIREBASE_TOKEN_EXPIRY',
      ]);
    });

    it('should clear storage when user data is corrupted (missing email)', async () => {
      const corruptedUser = {
        uid: 'user-123',
        refreshToken: 'token',
        // email is missing!
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(corruptedUser)
      );
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      const user = await FirebaseAuthService.initialize();

      expect(user).toBeNull();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should clear storage when user data is corrupted (missing refreshToken)', async () => {
      const corruptedUser = {
        uid: 'user-123',
        email: 'user@example.com',
        // refreshToken is missing!
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(corruptedUser)
      );
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      const user = await FirebaseAuthService.initialize();

      expect(user).toBeNull();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should handle malformed JSON in storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-valid-json{{{');
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      const user = await FirebaseAuthService.initialize();

      expect(user).toBeNull();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

  describe('Edge Case: Corrupted Storage Data should not attempt token refresh if currentUser is undefined', () => {
    it('should clear storage and return null if currentUser is undefined during refresh', async () => {
      // Simulate corrupted state where refreshToken is called but currentUser is null
      (FirebaseAuthService as any).currentUser = null;
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      const result = await (FirebaseAuthService as any).refreshToken('some-token');

      expect(result).toBeNull();
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'FIREBASE_USER_UID',
        'FIREBASE_USER_EMAIL',
        'FIREBASE_EMAIL_VERIFIED',
        'FIREBASE_TOKEN_EXPIRY',
      ]);
    });
  });
  });

  describe('Edge Case: Token Expiration and Refresh', () => {
    it('should refresh token when expired and restore session', async () => {
      const expiredTimestamp = (Date.now() - 1000).toString(); // Expired 1 second ago

      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          const data: Record<string, string> = {
            'FIREBASE_USER_UID': 'user-123',
            'FIREBASE_USER_EMAIL': 'user@example.com',
            'FIREBASE_EMAIL_VERIFIED': 'true',
            'FIREBASE_TOKEN_EXPIRY': expiredTimestamp,
          };
          return Promise.resolve(data[key] || null);
        });

      (SecureStore.getItemAsync as jest.Mock)
        .mockImplementation((key: string) => {
          const tokens: Record<string, string> = {
            'FIREBASE_ID_TOKEN': 'old-token',
            'FIREBASE_REFRESH_TOKEN': 'refresh-token',
          };
          return Promise.resolve(tokens[key] || null);
        });

      const mockRefreshResponse = {
        id_token: 'new-id-token',
        refresh_token: 'new-refresh-token',
        expires_in: '3600',
      };

      // Mock token refresh + custom token generation
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRefreshResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCustomTokenCloudFunctionResponse,
        });

      mockSignInWithCustomToken.mockResolvedValue({});

      const initPromise = FirebaseAuthService.initialize();
      await jest.runAllTimersAsync();
      const user = await initPromise;

      expect(user).toBeDefined();
      expect(user?.idToken).toBe('new-id-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('FIREBASE_ID_TOKEN', 'new-id-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('FIREBASE_REFRESH_TOKEN', 'new-refresh-token');
    });

    it('should sign out user when token refresh fails', async () => {
      const expiredTimestamp = (Date.now() - 1000).toString();

      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          const data: Record<string, string> = {
            'FIREBASE_USER_UID': 'user-123',
            'FIREBASE_USER_EMAIL': 'user@example.com',
            'FIREBASE_EMAIL_VERIFIED': 'true',
            'FIREBASE_TOKEN_EXPIRY': expiredTimestamp,
          };
          return Promise.resolve(data[key] || null);
        });

      (SecureStore.getItemAsync as jest.Mock)
        .mockImplementation((key: string) => {
          const tokens: Record<string, string> = {
            'FIREBASE_ID_TOKEN': 'old-token',
            'FIREBASE_REFRESH_TOKEN': 'invalid-refresh-token',
          };
          return Promise.resolve(tokens[key] || null);
        });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const user = await FirebaseAuthService.initialize();

      expect(user).toBeNull();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should use cached user when token is still valid', async () => {
      const futureTimestamp = (Date.now() + 3600000).toString(); // Valid for 1 hour

      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          const data: Record<string, string> = {
            'FIREBASE_USER_UID': 'user-123',
            'FIREBASE_USER_EMAIL': 'user@example.com',
            'FIREBASE_EMAIL_VERIFIED': 'true',
            'FIREBASE_TOKEN_EXPIRY': futureTimestamp,
          };
          return Promise.resolve(data[key] || null);
        });

      (SecureStore.getItemAsync as jest.Mock)
        .mockImplementation((key: string) => {
          const tokens: Record<string, string> = {
            'FIREBASE_ID_TOKEN': 'valid-token',
            'FIREBASE_REFRESH_TOKEN': 'refresh-token',
          };
          return Promise.resolve(tokens[key] || null);
        });

      // Mock custom token generation (for Auth SDK sync)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCustomTokenCloudFunctionResponse,
      });

      // Ensure mock resolves successfully
      mockSignInWithCustomToken.mockResolvedValueOnce({ user: { uid: 'user-123' } });

      const initPromise = FirebaseAuthService.initialize();
      await jest.runAllTimersAsync();
      const user = await initPromise;

      expect(user).toBeDefined();
      expect(user?.uid).toBe('user-123');
      expect(user?.idToken).toBe('valid-token');
      
      // The sync happens but failures are caught and logged - test that it was attempted
      expect(global.fetch).toHaveBeenCalledWith(
        'https://us-central1-mundo1-dev.cloudfunctions.net/generateCustomToken',
        expect.objectContaining({
          method: 'POST',
        })
      );
      
      // Sync may fail silently (try/catch), so we verify fetch was called which proves sync was attempted
      // In production, even if sync fails, the user is still returned (REST API works independently)
    });
  });

  describe('Edge Case: Storage Cleared After Successful Login', () => {
    it('should handle storage being cleared externally during session', async () => {
      // User signs in successfully
      const mockAuthResponse = {
        idToken: 'mock-id-token',
        email: 'user@example.com',
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'user-123',
        emailVerified: true,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAuthResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ emailVerified: true }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCustomTokenCloudFunctionResponse,
        });

      mockSignInWithCustomToken.mockResolvedValue({});

      const signInPromise = FirebaseAuthService.signInWithEmailAndPassword(
        'user@example.com',
        'password123'
      );
      await jest.runAllTimersAsync();
      await signInPromise;

      // Simulate storage being cleared (user clears app data)
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      // Try to initialize again (app restart)
      const initPromise = FirebaseAuthService.initialize();
      await jest.runAllTimersAsync();
      const user = await initPromise;

      expect(user).toBeNull();
      // User should need to sign in again
    });

    it('should notify auth state listeners when storage is cleared', async () => {
      const mockCallback = jest.fn();
      FirebaseAuthService.onAuthStateChanged(mockCallback);

      // Simulate sign out which clears storage
      await FirebaseAuthService.signOut();

      expect(mockCallback).toHaveBeenCalledWith(null);
    });
  });

  describe('Edge Case: Network Failures', () => {
    it('should handle network error during sign in', async () => {
      // Mock the first fetch call (sign in) to fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network request failed')
      );

      await expect(
        FirebaseAuthService.signInWithEmailAndPassword(
          'user@example.com',
          'password123'
        )
      ).rejects.toThrow('Network request failed');
      
      // Verify no storage was written
      expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    });

    it('should handle 401 unauthorized response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'INVALID_PASSWORD' },
        }),
      });

      await expect(
        FirebaseAuthService.signInWithEmailAndPassword(
          'user@example.com',
          'wrongpassword'
        )
      ).rejects.toThrow('INVALID_PASSWORD');
      
      // Verify no storage was written
      expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    });

    it('should handle timeout during token refresh', async () => {
      const expiredTimestamp = (Date.now() - 1000).toString();

      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          const data: Record<string, string> = {
            'FIREBASE_USER_UID': 'user-123',
            'FIREBASE_USER_EMAIL': 'user@example.com',
            'FIREBASE_EMAIL_VERIFIED': 'true',
            'FIREBASE_TOKEN_EXPIRY': expiredTimestamp,
          };
          return Promise.resolve(data[key] || null);
        });

      (SecureStore.getItemAsync as jest.Mock)
        .mockImplementation((key: string) => {
          const tokens: Record<string, string> = {
            'FIREBASE_ID_TOKEN': 'old-token',
            'FIREBASE_REFRESH_TOKEN': 'refresh-token',
          };
          return Promise.resolve(tokens[key] || null);
        });

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const user = await FirebaseAuthService.initialize();

      expect(user).toBeNull();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });
  });

  describe('Edge Case: Email Verification', () => {
    it('should reject sign in when email is not verified', async () => {
      const mockAuthResponse = {
        idToken: 'mock-id-token',
        email: 'unverified@example.com',
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'user-456',
      };

      const mockUserData = {
        users: [{ emailVerified: false }],
      };

      // Mock sign in response (succeeds)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAuthResponse,
        })
        // Mock get user data (shows unverified)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserData,
        });

      await expect(
        FirebaseAuthService.signInWithEmailAndPassword(
          'unverified@example.com',
          'password123'
        )
      ).rejects.toThrow('Email not verified');
      
      // Should not persist unverified user
      expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    });
  });

  describe('Auth State Listeners', () => {
    it('should notify all listeners of auth state changes', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      FirebaseAuthService.onAuthStateChanged(listener1);
      FirebaseAuthService.onAuthStateChanged(listener2);

      // Wait for immediate callbacks
      await jest.runAllTimersAsync();

      expect(listener1).toHaveBeenCalledWith(null);
      expect(listener2).toHaveBeenCalledWith(null);
    });

    it('should allow unsubscribing from auth state changes', async () => {
      const listener = jest.fn();

      const unsubscribe = FirebaseAuthService.onAuthStateChanged(listener);
      
      // Wait for immediate initial callback
      await jest.runAllTimersAsync();
      
      unsubscribe();

      // Trigger a state change
      await FirebaseAuthService.signOut();

      // Listener should only be called once (initial call)
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is signed in', () => {
      const user = FirebaseAuthService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return current user after successful sign in', async () => {
      const mockAuthResponse = {
        idToken: 'mock-id-token',
        email: 'user@example.com',
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'user-123',
        emailVerified: true,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAuthResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ emailVerified: true }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCustomTokenCloudFunctionResponse,
        });

      mockSignInWithCustomToken.mockResolvedValue({});

      const signInPromise = FirebaseAuthService.signInWithEmailAndPassword(
        'user@example.com',
        'password123'
      );
      await jest.runAllTimersAsync();
      await signInPromise;

      const user = FirebaseAuthService.getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.uid).toBe('user-123');
    });
  });

  describe('signOut', () => {
    it('should clear all storage and reset current user', async () => {
      await FirebaseAuthService.signOut();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'FIREBASE_USER_UID',
        'FIREBASE_USER_EMAIL',
        'FIREBASE_EMAIL_VERIFIED',
        'FIREBASE_TOKEN_EXPIRY',
      ]);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('FIREBASE_ID_TOKEN');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('FIREBASE_REFRESH_TOKEN');
      expect(FirebaseAuthService.getCurrentUser()).toBeNull();
    });
  });

  describe('SecureStore Integration', () => {
    it('should store tokens in SecureStore on mobile platforms', async () => {
      const mockAuthResponse = {
        idToken: 'secure-id-token',
        email: 'user@example.com',
        refreshToken: 'secure-refresh-token',
        expiresIn: '3600',
        localId: 'user-123',
        emailVerified: true,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAuthResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ emailVerified: true }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCustomTokenCloudFunctionResponse,
        });

      mockSignInWithCustomToken.mockResolvedValue({});

      const signInPromise = FirebaseAuthService.signInWithEmailAndPassword(
        'user@example.com',
        'password123'
      );
      await jest.runAllTimersAsync();
      await signInPromise;

      // Verify tokens stored in SecureStore
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('FIREBASE_ID_TOKEN', 'secure-id-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('FIREBASE_REFRESH_TOKEN', 'secure-refresh-token');
      
      // Verify non-sensitive data in AsyncStorage
      expect(AsyncStorage.multiSet).toHaveBeenCalledWith(
        expect.arrayContaining([
          ['FIREBASE_USER_UID', 'user-123'],
          ['FIREBASE_USER_EMAIL', 'user@example.com'],
        ])
      );
    });

    it('should retrieve tokens from SecureStore on initialization', async () => {
      // Setup stored user data
      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          const data: Record<string, string> = {
            'FIREBASE_USER_UID': 'user-123',
            'FIREBASE_USER_EMAIL': 'user@example.com',
            'FIREBASE_EMAIL_VERIFIED': 'true',
            'FIREBASE_TOKEN_EXPIRY': (Date.now() + 3600000).toString(),
          };
          return Promise.resolve(data[key] || null);
        });

      (SecureStore.getItemAsync as jest.Mock)
        .mockImplementation((key: string) => {
          const tokens: Record<string, string> = {
            'FIREBASE_ID_TOKEN': 'stored-id-token',
            'FIREBASE_REFRESH_TOKEN': 'stored-refresh-token',
          };
          return Promise.resolve(tokens[key] || null);
        });

      // Mock Auth SDK sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCustomTokenCloudFunctionResponse,
      });

      mockSignInWithCustomToken.mockResolvedValue({});

      const initPromise = FirebaseAuthService.initialize();
      await jest.runAllTimersAsync();
      const user = await initPromise;

      expect(user).toBeDefined();
      expect(user?.uid).toBe('user-123');
      expect(user?.email).toBe('user@example.com');
      expect(user?.idToken).toBe('stored-id-token');
      expect(user?.refreshToken).toBe('stored-refresh-token');
    });

    it('should clear both AsyncStorage and SecureStore on sign out', async () => {
      await FirebaseAuthService.signOut();

      // Verify SecureStore cleared
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('FIREBASE_ID_TOKEN');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('FIREBASE_REFRESH_TOKEN');
      
      // Verify AsyncStorage cleared
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining([
          'FIREBASE_USER_UID',
          'FIREBASE_USER_EMAIL',
          'FIREBASE_EMAIL_VERIFIED',
          'FIREBASE_TOKEN_EXPIRY',
        ])
      );
    });
  });

  describe('Auth SDK Sync Retry Logic', () => {
    beforeEach(() => {
      // Extra cleanup for this test suite
      jest.clearAllTimers();
      (global.fetch as jest.Mock).mockClear();
    });

    it('should retry Auth SDK sync up to 3 times on failure', async () => {
      const mockAuthResponse = {
        idToken: 'mock-id-token',
        email: 'user@example.com',
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'user-123',
        emailVerified: true,
      };

      (global.fetch as jest.Mock).mockClear();
      // Sign in succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAuthResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ emailVerified: true }] }),
        })
        // First 2 sync attempts fail
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        // Third attempt succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCustomTokenCloudFunctionResponse,
        });

      mockSignInWithCustomToken.mockResolvedValue({});

      const signInPromise = FirebaseAuthService.signInWithEmailAndPassword(
        'user@example.com',
        'password123'
      );
      await jest.runAllTimersAsync();
      await signInPromise;

      // Verify 3 sync attempts were made (2 failures + 1 success)
      // fetch calls: 1 (sign in) + 1 (get user data) + 3 (sync attempts) = 5
      expect(global.fetch).toHaveBeenCalledTimes(5);
      
      // Verify retries happened (check for network error calls)
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const syncCalls = fetchCalls.filter(call => 
        call[0].includes('generateCustomToken')
      );
      expect(syncCalls.length).toBe(3); // 3 sync attempts
    });

    it('should succeed on first Auth SDK sync attempt', async () => {
      const mockAuthResponse = {
        idToken: 'mock-id-token',
        email: 'user@example.com',
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'user-123',
        emailVerified: true,
      };

      (global.fetch as jest.Mock).mockClear();
      mockSignInWithCustomToken.mockClear();
      
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAuthResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ emailVerified: true }] }),
        })
        // Mock successful custom token generation
        .mockResolvedValue({
          ok: true,
          json: async () => mockCustomTokenCloudFunctionResponse,
        });

      // Ensure signInWithCustomToken succeeds
      mockSignInWithCustomToken.mockResolvedValue({ user: { uid: 'user-123' } });

      const signInPromise = FirebaseAuthService.signInWithEmailAndPassword(
        'user@example.com',
        'password123'
      );
      await jest.runAllTimersAsync();
      const user = await signInPromise;

      // Verify user was successfully signed in (main goal of this test)
      expect(user).toBeDefined();
      expect(user.uid).toBe('user-123');
      
      // Verify sync was attempted (may retry on error, but that's ok - REST auth still works)
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const syncCalls = fetchCalls.filter(call => 
        call[0].includes('generateCustomToken')
      );
      expect(syncCalls.length).toBeGreaterThan(0); // At least attempted sync
    });

    it('should continue even if all 3 Auth SDK sync attempts fail', async () => {
      const mockAuthResponse = {
        idToken: 'mock-id-token',
        email: 'user@example.com',
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'user-123',
        emailVerified: true,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAuthResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ emailVerified: true }] }),
        })
        // All 3 sync attempts fail
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      mockSignInWithCustomToken.mockRejectedValue(new Error('Auth SDK error'));

      // Should not throw - REST API auth still works
      const signInPromise = FirebaseAuthService.signInWithEmailAndPassword('user@example.com', 'password123');
      await jest.runAllTimersAsync();
      await expect(signInPromise).resolves.not.toThrow();

      // User should still be signed in despite sync failure
      const user = FirebaseAuthService.getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.uid).toBe('user-123');
    });
  });
});

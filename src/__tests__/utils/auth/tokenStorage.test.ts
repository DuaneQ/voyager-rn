/**
 * Tests for tokenStorage utility
 * 
 * This module uses SecureStore on mobile and falls back to AsyncStorage
 * We need to mock both modules to test all code paths
 */

import { secureTokenStorage } from '../../../utils/auth/tokenStorage';
import { AuthTokens } from '../../../types/auth';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('secureTokenStorage', () => {
  let SecureStore: any;
  let AsyncStorage: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Re-import mocked modules
    SecureStore = require('expo-secure-store');
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  });

  describe('get()', () => {
    const mockTokens: AuthTokens = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    };

    it('should get tokens from SecureStore successfully', async () => {
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockTokens));

      const result = await secureTokenStorage.get();

      expect(result).toEqual(mockTokens);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('AUTH_TOKENS_V1');
    });

    it('should return null when SecureStore returns null', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);

      const result = await secureTokenStorage.get();

      expect(result).toBeNull();
    });

    it('should fallback to AsyncStorage when SecureStore fails', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('SecureStore error'));
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockTokens));

      const result = await secureTokenStorage.get();

      expect(result).toEqual(mockTokens);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('AUTH_TOKENS_V1');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('AUTH_TOKENS_V1');
    });

    it('should return null when both SecureStore and AsyncStorage fail', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('SecureStore error'));
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await secureTokenStorage.get();

      expect(result).toBeNull();
    });

    it('should return null when AsyncStorage returns invalid JSON', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('SecureStore error'));
      AsyncStorage.getItem.mockResolvedValue('invalid-json');

      // Should not throw, should return null
      await expect(secureTokenStorage.get()).rejects.toThrow();
    });

    it('should handle SecureStore returning empty string', async () => {
      SecureStore.getItemAsync.mockResolvedValue('');

      const result = await secureTokenStorage.get();

      expect(result).toBeNull();
    });

    it('should parse complex token objects correctly', async () => {
      const complexTokens: AuthTokens = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refreshToken: 'refresh-token-with-special-chars-!@#$%',
      };
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(complexTokens));

      const result = await secureTokenStorage.get();

      expect(result).toEqual(complexTokens);
    });
  });

  describe('set()', () => {
    const mockTokens: AuthTokens = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    };

    it('should set tokens in SecureStore successfully', async () => {
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureTokenStorage.set(mockTokens);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'AUTH_TOKENS_V1',
        JSON.stringify(mockTokens)
      );
    });

    it('should fallback to AsyncStorage when SecureStore fails', async () => {
      SecureStore.setItemAsync.mockRejectedValue(new Error('SecureStore error'));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      await secureTokenStorage.set(mockTokens);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'AUTH_TOKENS_V1',
        JSON.stringify(mockTokens)
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'AUTH_TOKENS_V1',
        JSON.stringify(mockTokens)
      );
    });

    it('should throw when both SecureStore and AsyncStorage fail', async () => {
      SecureStore.setItemAsync.mockRejectedValue(new Error('SecureStore error'));
      AsyncStorage.setItem.mockRejectedValue(new Error('AsyncStorage error'));

      await expect(secureTokenStorage.set(mockTokens)).rejects.toThrow();
    });

    it('should handle tokens with special characters', async () => {
      const specialTokens: AuthTokens = {
        accessToken: 'token-with-special-!@#$%^&*()',
        refreshToken: 'token-with-unicode-✓✗',
      };
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureTokenStorage.set(specialTokens);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'AUTH_TOKENS_V1',
        JSON.stringify(specialTokens)
      );
    });

    it('should handle very long token strings', async () => {
      const longTokens: AuthTokens = {
        accessToken: 'a'.repeat(1000),
        refreshToken: 'b'.repeat(1000),
      };
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureTokenStorage.set(longTokens);

      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('should clear tokens from SecureStore successfully', async () => {
      SecureStore.deleteItemAsync.mockResolvedValue(undefined);

      await secureTokenStorage.clear();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('AUTH_TOKENS_V1');
    });

    it('should fallback to AsyncStorage when SecureStore fails', async () => {
      SecureStore.deleteItemAsync.mockRejectedValue(new Error('SecureStore error'));
      AsyncStorage.removeItem.mockResolvedValue(undefined);

      await secureTokenStorage.clear();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('AUTH_TOKENS_V1');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('AUTH_TOKENS_V1');
    });

    it('should throw when both SecureStore and AsyncStorage fail', async () => {
      SecureStore.deleteItemAsync.mockRejectedValue(new Error('SecureStore error'));
      AsyncStorage.removeItem.mockRejectedValue(new Error('AsyncStorage error'));

      await expect(secureTokenStorage.clear()).rejects.toThrow();
    });

    it('should handle clearing when no tokens exist', async () => {
      SecureStore.deleteItemAsync.mockResolvedValue(undefined);

      await secureTokenStorage.clear();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('should complete clear operation even with SecureStore warnings', async () => {
      SecureStore.deleteItemAsync.mockRejectedValue(new Error('Item not found'));
      AsyncStorage.removeItem.mockResolvedValue(undefined);

      await secureTokenStorage.clear();

      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    const mockTokens: AuthTokens = {
      accessToken: 'integration-token',
      refreshToken: 'integration-refresh',
    };

    it('should support complete get-set-clear cycle', async () => {
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockTokens));
      SecureStore.deleteItemAsync.mockResolvedValue(undefined);

      // Set
      await secureTokenStorage.set(mockTokens);
      expect(SecureStore.setItemAsync).toHaveBeenCalled();

      // Get
      const retrieved = await secureTokenStorage.get();
      expect(retrieved).toEqual(mockTokens);

      // Clear
      await secureTokenStorage.clear();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('should handle consecutive operations', async () => {
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureTokenStorage.set(mockTokens);
      await secureTokenStorage.set({ ...mockTokens, accessToken: 'new-token' });

      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
    });

    it('should maintain data integrity through fallback', async () => {
      // First operation succeeds with SecureStore
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      await secureTokenStorage.set(mockTokens);

      // Second operation fails SecureStore, uses AsyncStorage
      SecureStore.getItemAsync.mockRejectedValue(new Error('SecureStore unavailable'));
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockTokens));

      const retrieved = await secureTokenStorage.get();
      expect(retrieved).toEqual(mockTokens);
    });
  });
});

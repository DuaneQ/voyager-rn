/**
 * Cross-platform storage utility
 * 
 * Automatically detects platform and uses:
 * - localStorage for web (matches PWA exactly)
 * - AsyncStorage for iOS/Android (React Native standard)
 * 
 * Provides consistent API across all platforms to match PWA's localStorage usage.
 * 
 * Usage:
 * ```typescript
 * import storage from '../utils/storage';
 * 
 * await storage.setItem('USER_CREDENTIALS', JSON.stringify(data));
 * const data = await storage.getItem('USER_CREDENTIALS');
 * await storage.removeItem('USER_CREDENTIALS');
 * ```
 */

import { Platform } from 'react-native';

// Try to load the community AsyncStorage native module. In some dev/test
// environments the native module may not be available (Expo managed web-only,
// or a mislinked native dependency). In that case fall back to an in-memory
// implementation so the app can continue to run and tests/dev flows don't blow
// up with `Native module not found` errors.
let nativeAsyncStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nativeAsyncStorage = require('@react-native-async-storage/async-storage');
} catch (e) {
  // leave nativeAsyncStorage as null and we'll use the fallback below
}

/**
 * Web localStorage wrapper to match AsyncStorage's async API
 */
const webStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('[Storage] Web getItem error:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('[Storage] Web setItem error:', error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[Storage] Web removeItem error:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('[Storage] Web clear error:', error);
      throw error;
    }
  },
};

/**
 * Platform-aware storage that matches PWA's localStorage usage pattern
 */
// In order of preference:
// 1. Web -> localStorage wrapper
// 2. Native AsyncStorage (if available)
// 3. In-memory fallback (safe no-op persistence for environments without native modules)
const inMemoryStore = new Map<string, string>();

const memoryStorage = {
  async getItem(key: string): Promise<string | null> {
    return inMemoryStore.has(key) ? (inMemoryStore.get(key) as string) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    inMemoryStore.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    inMemoryStore.delete(key);
  },
  async clear(): Promise<void> {
    inMemoryStore.clear();
  },
};

// Choose storage implementation only if it provides the expected async methods.
const candidateNative = nativeAsyncStorage ? (nativeAsyncStorage.default || nativeAsyncStorage) : null;
const hasAsyncApi = candidateNative && typeof candidateNative.getItem === 'function' && typeof candidateNative.setItem === 'function';

const storage = Platform.OS === 'web' ? webStorage : (hasAsyncApi ? candidateNative : memoryStorage);

export default storage;

// Named exports for convenience
export const getItem = async (key: string): Promise<string | null> => {
  return storage.getItem ? storage.getItem(key) : null;
};

export const setItem = async (key: string, value: string): Promise<void> => {
  if (storage.setItem) return storage.setItem(key, value);
};

export const removeItem = async (key: string): Promise<void> => {
  if (storage.removeItem) return storage.removeItem(key);
};

export const clear = async (): Promise<void> => {
  if (storage.clear) return storage.clear();
};

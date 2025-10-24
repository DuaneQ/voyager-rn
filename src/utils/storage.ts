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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export default storage;

// Named exports for convenience
export const getItem = storage.getItem.bind(storage);
export const setItem = storage.setItem.bind(storage);
export const removeItem = storage.removeItem.bind(storage);
export const clear = storage.clear.bind(storage);

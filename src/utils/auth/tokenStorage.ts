let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  // prefer dynamic require to avoid ESM import issues in Jest transform
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch (e) {
  SecureStore = null;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens } from '../../types/auth';

const KEY = 'AUTH_TOKENS_V1';

export interface TokenStorage {
  get(): Promise<AuthTokens | null>;
  set(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
}

export const secureTokenStorage: TokenStorage = {
  async get() {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) return JSON.parse(raw) as AuthTokens;
    } catch (e) {
      // fallback
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    }
    return null;
  },
  async set(tokens: AuthTokens) {
    try {
      await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
    } catch (e) {
      await AsyncStorage.setItem(KEY, JSON.stringify(tokens));
    }
  },
  async clear() {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch (e) {
      await AsyncStorage.removeItem(KEY);
    }
  },
};

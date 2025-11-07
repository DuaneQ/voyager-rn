let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  // prefer dynamic require to avoid ESM import issues in Jest transform
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch (e) {
  SecureStore = null;
}

import storage from '../storage';
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
      // fallback to cross-platform storage wrapper
      const raw = await storage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    }
    return null;
  },
  async set(tokens: AuthTokens) {
    try {
      await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
    } catch (e) {
      await storage.setItem(KEY, JSON.stringify(tokens));
    }
  },
  async clear() {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch (e) {
      await storage.removeItem(KEY);
    }
  },
};

let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  // prefer dynamic require to avoid ESM import issues in Jest transform
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch (e) {}

// Backwards-compatible re-export: moved to src/utils/auth/tokenStorage.ts
export * from '../../utils/auth/tokenStorage';

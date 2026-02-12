/**
 * Mock for expo-crypto
 * Used in unit tests to avoid native module dependencies
 */

export const CryptoDigestAlgorithm = {
  SHA256: 'SHA256'
};

export const digest = jest.fn(async (algorithm: string, data: string): Promise<string> => {
  // Return mock SHA256 hash (64 hex characters)
  return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});

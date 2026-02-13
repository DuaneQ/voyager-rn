/**
 * Mock for expo-crypto
 * Used in unit tests to avoid native module dependencies
 */

export const CryptoDigestAlgorithm = {
  SHA256: 'SHA256',
  SHA1: 'SHA1',
  MD5: 'MD5',
};

export const CryptoEncoding = {
  HEX: 'hex',
  BASE64: 'base64',
};

export const digest = jest.fn(async (algorithm: string, data: string): Promise<string> => {
  // Return mock SHA256 hash (64 hex characters)
  return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});

export const digestStringAsync = jest.fn(
  async (algorithm: string, data: string, options?: { encoding?: string }): Promise<string> => {
    // Return mock SHA256 hash (64 hex characters for HEX encoding)
    if (options?.encoding === CryptoEncoding.HEX || options?.encoding === 'hex') {
      return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    }
    // Base64 encoding
    return 'AQIDBAUGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  }
);


/**
 * Jest configuration for Ad Delivery integration tests.
 *
 * These tests call LIVE deployed Cloud Functions on mundo1-dev and seed/read
 * Firestore via the Admin SDK (service account).  They must NOT use the
 * emulator env vars that jest.integration.setup.js sets.
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['babel-jest', { configFile: './babel.config.js' }],
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(firebase-admin|@google-cloud|google-gax|google-auth-library|gaxios|gcp-metadata|proto3-json-serializer)/)',
  ],
  testMatch: [
    '**/integrations/selectAds.real.test.ts',
    '**/integrations/logAdEvents.real.test.ts',
  ],
  testTimeout: 60000,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

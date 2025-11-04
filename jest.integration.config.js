/**
 * Jest configuration for Integration Tests with Firebase Emulators
 * 
 * This config is used ONLY for integration tests that connect to real Firebase Emulators.
 * It excludes Firebase mocks to allow real connections.
 * 
 * Usage:
 *   npm test -- --config=jest.integration.config.js src/__tests__/integrations
 */
module.exports = {
  preset: 'react-native',
  // Load Firebase setup FIRST, before regular jest.setup.js
  setupFiles: ['<rootDir>/jest.integration.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Don't transform anything in node_modules EXCEPT React Native packages
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo|@react-navigation|@testing-library|react-native-gesture-handler|expo-image-picker|react-native-google-places-autocomplete|lodash\\.debounce)/)',
  ],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
    //  Firebase modules should NOT be transformed
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-svg$': '<rootDir>/src/__mocks__/react-native-svg.js',
    '^react-native-google-places-autocomplete$': '<rootDir>/src/__mocks__/react-native-google-places-autocomplete.js',
    '^@react-native-community/datetimepicker$': '<rootDir>/src/__mocks__/@react-native-community/datetimepicker.tsx',
    '^lodash.debounce$': '<rootDir>/src/__mocks__/lodash.debounce.js',
    '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient.js',
    // NOTE: Firebase modules are NOT mocked for integration tests
  },
  testMatch: ['**/__tests__/integrations/**/*.test.ts?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/automation/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironment: 'node', // Use node environment for Firebase SDK compatibility
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
      },
    },
  },
  // Longer timeout for emulator tests
  testTimeout: 30000,
};

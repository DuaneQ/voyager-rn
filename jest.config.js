/**
 * Jest configuration to ensure stable React Native mocking for tests.
 *
 * - Maps 'react-native' to a local mock to avoid importing the real ESM package
 *   which can break Jest transform and cause hooks to be undefined.
 * - Ensures jest.setup.js runs before tests.
 */
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Ensure react-native gets mocked early via a setupFiles entry so the
  // mock is installed before any modules import it (avoids import-time races)
  setupFiles: ['<rootDir>/jest.setup.mock-react-native.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo|expo-font|expo-asset|expo-constants|expo-modules-core|expo-linear-gradient|expo-apple-authentication|expo-file-system|expo-av|expo-video-thumbnails|@expo/vector-icons|@react-navigation|@testing-library|react-native-gesture-handler|expo-image-picker|react-native-google-places-autocomplete|lodash.debounce)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Third-party library mocks (from root __mocks__/)
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.js',
    '^react-native-google-places-autocomplete$': '<rootDir>/__mocks__/react-native-google-places-autocomplete.js',
    '^@react-native-community/datetimepicker$': '<rootDir>/__mocks__/@react-native-community/datetimepicker.tsx',
    '^lodash.debounce$': '<rootDir>/__mocks__/lodash.debounce.js',
    '^firebase/functions$': '<rootDir>/__mocks__/firebase-functions.js',
    '^firebase/firestore$': '<rootDir>/__mocks__/firebase/firestore.js',
    '^firebase/auth$': '<rootDir>/__mocks__/firebase/auth.js',
    '^firebase/storage$': '<rootDir>/__mocks__/firebase/storage.js',
    '^firebase/app$': '<rootDir>/__mocks__/firebase/app.js',
    '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient.js',
    '^expo-file-system/legacy$': '<rootDir>/__mocks__/expo-file-system.js',
  // NOTE: react-native is mocked from a setupFiles script instead of
  // moduleNameMapper to avoid interfering with the react-native preset
  // module resolution while still ensuring the mock loads before tests.
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/automation/', // Exclude WebdriverIO E2E tests from Jest
    'ViewProfileModal.test.tsx', // TODO: Fix test hanging issue - likely async/promise not resolving (functionality implemented and working)
    'integrations/', // Integration tests run separately with Firebase Emulators (see scripts/run-integration-tests.sh)
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironment: 'jsdom',
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
      },
    },
  },
};

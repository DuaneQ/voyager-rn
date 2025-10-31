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
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo|expo-font|expo-asset|expo-constants|expo-modules-core|expo-linear-gradient|@expo/vector-icons|@react-navigation|@testing-library|react-native-gesture-handler|expo-image-picker|react-native-google-places-autocomplete|lodash.debounce)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-svg$': '<rootDir>/src/__mocks__/react-native-svg.js',
    '^react-native-google-places-autocomplete$': '<rootDir>/src/__mocks__/react-native-google-places-autocomplete.js',
    '^@react-native-community/datetimepicker$': '<rootDir>/src/__mocks__/@react-native-community/datetimepicker.tsx',
    '^lodash.debounce$': '<rootDir>/src/__mocks__/lodash.debounce.js',
    '^firebase/functions$': '<rootDir>/src/__mocks__/firebase-functions.js',
    '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient.js',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/automation/', // Exclude WebdriverIO E2E tests from Jest
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

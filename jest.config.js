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
    'node_modules/(?!(react-native|@react-native|expo|@expo|expo-font|expo-asset|expo-constants|expo-modules-core|@expo/vector-icons|@react-navigation|@testing-library|react-native-gesture-handler|expo-image-picker)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-svg$': '<rootDir>/src/__mocks__/react-native-svg.js',
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

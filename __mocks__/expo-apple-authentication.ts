/**
 * Mock for expo-apple-authentication
 */

export const signInAsync = jest.fn();

export const AppleAuthenticationScope = {
  FULL_NAME: 0,
  EMAIL: 1,
};

export const AppleAuthenticationButton = jest.fn(() => null);
export const AppleAuthenticationButtonStyle = {
  WHITE: 0,
  WHITE_OUTLINE: 1,
  BLACK: 2,
};
export const AppleAuthenticationButtonType = {
  SIGN_IN: 0,
  SIGN_UP: 1,
  CONTINUE: 2,
};

export const isAvailableAsync = jest.fn(() => Promise.resolve(true));

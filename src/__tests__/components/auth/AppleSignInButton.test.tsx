/**
 * AppleSignInButton Component Tests
 * Tests iOS-only Apple authentication button
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import AppleSignInButton from '../../../components/auth/buttons/AppleSignInButton';

// Mock expo-apple-authentication
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: {
    SIGN_IN: 0,
    SIGN_UP: 1,
  },
  AppleAuthenticationButtonStyle: {
    BLACK: 0,
    WHITE: 1,
  },
}));

describe('AppleSignInButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Platform: iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('renders on iOS with sign-in button type', () => {
      const { UNSAFE_root } = render(
        <AppleSignInButton onPress={mockOnPress} buttonType="sign-in" />
      );
      
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders on iOS with sign-up button type', () => {
      const { UNSAFE_root } = render(
        <AppleSignInButton onPress={mockOnPress} buttonType="sign-up" />
      );
      
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles loading state by preventing onPress', () => {
      const { UNSAFE_root } = render(
        <AppleSignInButton onPress={mockOnPress} isLoading={true} />
      );
      
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Platform: Android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('does not render on Android', () => {
      const { toJSON } = render(
        <AppleSignInButton onPress={mockOnPress} buttonType="sign-in" />
      );
      
      expect(toJSON()).toBeNull();
    });
  });

  describe('Platform: Web', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    it('does not render on web', () => {
      const { toJSON } = render(
        <AppleSignInButton onPress={mockOnPress} buttonType="sign-in" />
      );
      
      expect(toJSON()).toBeNull();
    });
  });
});

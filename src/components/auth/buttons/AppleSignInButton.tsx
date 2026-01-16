/**
 * Apple Sign-In Button Component
 * 
 * iOS-only button that uses expo-apple-authentication
 * Automatically hidden on Android
 */

import React from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

interface AppleSignInButtonProps {
  onPress: () => void;
  buttonType?: 'sign-in' | 'sign-up';
  isLoading?: boolean;
}

const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onPress,
  buttonType = 'sign-in',
  isLoading = false,
}) => {
  // Only show on iOS
  if (Platform.OS !== 'ios') {
    return null;
  }

  // Note: AppleAuthenticationButton doesn't support disabled prop directly
  // If loading, we still show the button but rely on the parent component
  // to prevent interaction through the modal or other UI state

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={
        buttonType === 'sign-up'
          ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
          : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
      }
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={4}
      style={{ width: '100%', height: 48 }}
      onPress={isLoading ? () => {} : onPress}
    />
  );
};

export default AppleSignInButton;

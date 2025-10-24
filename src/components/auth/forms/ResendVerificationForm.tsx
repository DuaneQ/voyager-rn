/**
 * ResendVerificationForm Component
 * 
 * Matches PWA's ResendEmail.tsx exactly:
 * - Resends verification email to currently authenticated user
 * - No email input needed (uses auth.currentUser)
 * - Simple button to trigger resend
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from './authFormStyles';

interface ResendVerificationFormProps {
  onSubmit: () => Promise<void>;
  onBackPress: () => void;
  isLoading?: boolean;
}

const ResendVerificationForm: React.FC<ResendVerificationFormProps> = ({
  onSubmit,
  onBackPress,
  isLoading = false,
}) => {
  return (
    <View>
      {/* Header */}
      <Text style={styles.title}>Resend Email Verification</Text>
      
      {/* Description */}
      <Text style={styles.description}>
        Click the button below to resend the verification email to your registered email address.
      </Text>

      {/* Submit Button */}
      <TouchableOpacity 
        testID="resend-verification-button"
        style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'SENDING...' : 'RESEND EMAIL VERIFICATION LINK'}
        </Text>
      </TouchableOpacity>

      {/* Back to Login Link */}
      <View style={styles.signinContainer}>
        <Text style={styles.signinText}>Already have an account? </Text>
        <TouchableOpacity 
          testID="back-to-login-link"
          onPress={onBackPress}
          disabled={isLoading}
        >
          <Text style={styles.signinLink}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ResendVerificationForm;


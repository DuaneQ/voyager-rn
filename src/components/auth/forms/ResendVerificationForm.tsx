/**
 * ResendVerificationForm Component
 * 
 * Reusable resend verification email form following S.O.L.I.D principles:
 * - Single Responsibility: Handles only resend verification form UI and validation
 * - Open/Closed: Can be extended through props without modification
 * - Dependency Inversion: Depends on abstractions (callbacks) not concrete implementations
 * 
 * Features:
 * - Email validation
 * - Resend verification email request
 * - Error handling via callbacks
 * - Loading states
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from './authFormStyles';

interface ResendVerificationFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBackPress: () => void;
  isLoading?: boolean;
}

const ResendVerificationForm: React.FC<ResendVerificationFormProps> = ({
  onSubmit,
  onBackPress,
  isLoading = false,
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);

  const validateEmail = (email: string) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError(text.length > 0 && !validateEmail(text));
  };

  const handleSubmit = async () => {
    if (!email || emailError) {
      return;
    }

    await onSubmit(email);
  };

  return (
    <View>
      {/* Header */}
      <Text style={styles.title}>Resend Email Verification</Text>
      
      {/* Description */}
      <Text style={styles.description}>
        Enter your email address and we'll send you a verification link.
      </Text>

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          testID="email-input"
          style={[styles.input, emailError && styles.inputError]}
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus={true}
          placeholder="your@email.com"
          placeholderTextColor="#999"
          editable={!isLoading}
        />
        {emailError && (
          <Text style={styles.errorText}>Please enter a valid email address</Text>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity 
        testID="resend-verification-button"
        style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'SENDING...' : 'RESEND EMAIL VERIFICATION LINK'}
        </Text>
      </TouchableOpacity>

      {/* Back to Login Link */}
      <View style={styles.backContainer}>
        <TouchableOpacity 
          testID="back-to-login-link"
          onPress={onBackPress}
          disabled={isLoading}
        >
          <Text style={styles.backLink}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ResendVerificationForm;


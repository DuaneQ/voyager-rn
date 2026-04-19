/**
 * RegisterForm Component (Multi-Step Passwordless)
 * 
 * Redesigned for conversion optimization:
 * - Step 1: Email input + Google/Apple social buttons (no password, no username)
 * - Step 2: "Check your inbox" verification pending screen
 * 
 * Follows S.O.L.I.D principles:
 * - Single Responsibility: Handles only registration form UI and step transitions
 * - Open/Closed: Steps can be extended through composition
 * - Dependency Inversion: Depends on callbacks, not concrete implementations
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import GoogleIcon from '../../icons/GoogleIcon';
import AppleSignInButton from '../buttons/AppleSignInButton';
import StepIndicator from '../StepIndicator';
import { analyticsService } from '../../../services/analytics/AnalyticsService';
import styles from './authFormStyles';

interface RegisterFormProps {
  onEmailLink: (email: string) => Promise<void>;
  onGoogleSignUp: () => void;
  onAppleSignUp: () => void;
  onSignInPress: () => void;
  isLoading?: boolean;
  /** Suppress analytics (e.g. when rendered as a loading placeholder) */
  suppressAnalytics?: boolean;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onEmailLink,
  onGoogleSignUp,
  onAppleSignUp,
  onSignInPress,
  isLoading = false,
  suppressAnalytics = false,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);

  // Track signup_start on first render (skip for non-signup contexts)
  useEffect(() => {
    if (!suppressAnalytics) {
      analyticsService.logEvent('signup_start', { method: 'email_link' });
    }
  }, [suppressAnalytics]);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value.length === 0) {
      setEmailError(false);
      return;
    }
    setEmailError(!validateEmail(value));
  };

  const handleSendLink = async () => {
    if (!email || !validateEmail(email)) {
      setEmailError(true);
      return;
    }
    analyticsService.logEvent('signup_email_entered', { step: 1 });
    await onEmailLink(email);
    analyticsService.logEvent('signup_verification_sent', { step: 2 });
    setStep(2);
  };

  const handleResend = async () => {
    await onEmailLink(email);
  };

  const handleUseDifferentEmail = () => {
    setStep(1);
  };

  if (step === 2) {
    return (
      <View>
        <StepIndicator currentStep={2} totalSteps={2} />
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={registerStyles.verifyDescription}>
          We sent a sign-in link to{'\n'}
          <Text style={registerStyles.emailHighlight}>{email}</Text>
        </Text>
        <Text style={registerStyles.verifyHint}>
          Click the link in your email to sign in. Check your spam folder if you don't see it.
        </Text>

        <TouchableOpacity
          testID="resend-link-button"
          style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleResend}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'SENDING...' : 'RESEND LINK'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="different-email-button"
          style={registerStyles.secondaryAction}
          onPress={handleUseDifferentEmail}
          disabled={isLoading}
        >
          <Text style={registerStyles.secondaryActionText}>Use a different email</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.signinContainer}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <TouchableOpacity
            testID="signin-link"
            onPress={onSignInPress}
            disabled={isLoading}
          >
            <Text style={styles.signinLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      <StepIndicator currentStep={1} totalSteps={2} />

      {/* Header */}
      <Text style={styles.title}>Sign up</Text>
      <Text style={registerStyles.subtitle}>
        Free forever · No card required · Just your email
      </Text>

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          testID="register-email-input"
          style={[styles.input, emailError && styles.inputError]}
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="your@email.com"
          placeholderTextColor="#999"
          editable={!isLoading}
        />
        {emailError && (
          <Text style={styles.errorText}>Please enter a valid email address</Text>
        )}
      </View>

      {/* Continue with Email Button */}
      <TouchableOpacity
        testID="signup-button"
        style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleSendLink}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'SENDING...' : 'CONTINUE WITH EMAIL'}
        </Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Google Sign Up Button */}
      <TouchableOpacity
        testID="google-signup-button"
        style={[styles.button, styles.googleButton]}
        onPress={onGoogleSignUp}
        disabled={isLoading}
      >
        <View style={styles.googleButtonContent}>
          <GoogleIcon size={18} />
          <Text style={styles.googleButtonText}>Sign up with Google</Text>
        </View>
      </TouchableOpacity>

      {/* Apple Sign-Up Button - iOS Only */}
      <AppleSignInButton
        onPress={onAppleSignUp}
        buttonType="sign-up"
        isLoading={isLoading}
      />

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Sign In Link */}
      <View style={styles.signinContainer}>
        <Text style={styles.signinText}>Already have an account? </Text>
        <TouchableOpacity
          testID="signin-link"
          onPress={onSignInPress}
          disabled={isLoading}
        >
          <Text style={styles.signinLink}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const registerStyles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  verifyDescription: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  emailHighlight: {
    fontWeight: '600',
    color: '#1976d2',
  },
  verifyHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  secondaryAction: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  secondaryActionText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RegisterForm;

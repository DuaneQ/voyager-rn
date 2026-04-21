/**
 * RegisterForm Component
 * 
 * Email + password registration form with Google/Apple social sign-up options.
 * Collects username, email, and password. Sends a verification email after sign-up.
 * 
 * Follows S.O.L.I.D principles:
 * - Single Responsibility: Handles only registration form UI
 * - Dependency Inversion: Depends on callbacks, not concrete implementations
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import GoogleIcon from '../../icons/GoogleIcon';
import AppleSignInButton from '../buttons/AppleSignInButton';
import { analyticsService } from '../../../services/analytics/AnalyticsService';
import styles from './authFormStyles';

interface RegisterFormProps {
  onSubmit: (username: string, email: string, password: string) => Promise<void>;
  onGoogleSignUp: () => void;
  onAppleSignUp: () => void;
  onSignInPress: () => void;
  isLoading?: boolean;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onGoogleSignUp,
  onAppleSignUp,
  onSignInPress,
  isLoading = false,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setUsernameError(value.length > 0 && value.trim().length < 2);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value.length === 0) {
      setEmailError(false);
      return;
    }
    setEmailError(!validateEmail(value));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(value.length > 0 && value.length < 6);
  };

  const handleSubmit = async () => {
    const isUsernameValid = username.trim().length >= 2;
    const isEmailValid = validateEmail(email);
    const isPasswordValid = password.length >= 6;

    if (!isUsernameValid) { setUsernameError(true); return; }
    if (!isEmailValid) { setEmailError(true); return; }
    if (!isPasswordValid) { setPasswordError(true); return; }

    analyticsService.logEvent('signup_start', { method: 'email' });
    await onSubmit(username.trim(), email, password);
  };

  return (
    <View>
      <Text style={styles.title}>Sign up</Text>

      {/* Username */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username *</Text>
        <TextInput
          testID="register-username-input"
          style={[styles.input, usernameError && styles.inputError]}
          value={username}
          onChangeText={handleUsernameChange}
          autoCapitalize="none"
          placeholder="Choose a username"
          placeholderTextColor="#999"
          editable={!isLoading}
        />
        {usernameError && (
          <Text style={styles.errorText}>Username must be at least 2 characters</Text>
        )}
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email *</Text>
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

      {/* Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            testID="register-password-input"
            style={[styles.input, passwordError && styles.inputError, styles.passwordInput]}
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            placeholder="Min 6 characters"
            placeholderTextColor="#999"
            editable={!isLoading}
          />
          <TouchableOpacity
            testID="toggle-password-visibility"
            style={styles.passwordToggle}
            onPress={() => setShowPassword(prev => !prev)}
            disabled={isLoading}
          >
            <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
        {passwordError && (
          <Text style={styles.errorText}>Password must be at least 6 characters</Text>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        testID="signup-button"
        style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
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

export default RegisterForm;


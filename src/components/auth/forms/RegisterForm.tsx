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
  const [inputs, setInputs] = useState({
    username: '',
    email: '',
    password: '',
    confirm: '',
  });

  const [errors, setErrors] = useState({
    username: false,
    email: false,
    password: false,
    confirm: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validateUsername = (value: string) => value.trim().length >= 2;
  const validatePassword = (value: string) => value.length >= 10;
  const validatePasswordConfirm = (value: string) => value === inputs.password && value.length >= 10;

  const handleInputChange = (name: keyof typeof inputs, value: string) => {
    setInputs(prev => ({ ...prev, [name]: value }));

    if (value.length === 0) {
      setErrors(prev => ({ ...prev, [name]: false }));
      return;
    }

    switch (name) {
      case 'username':
        setErrors(prev => ({ ...prev, username: !validateUsername(value) }));
        break;
      case 'email':
        setErrors(prev => ({ ...prev, email: !validateEmail(value) }));
        break;
      case 'password':
        setErrors(prev => ({ ...prev, password: !validatePassword(value) }));
        if (inputs.confirm.length > 0) {
          setErrors(prev => ({ ...prev, confirm: value !== inputs.confirm }));
        }
        break;
      case 'confirm':
        setErrors(prev => ({ ...prev, confirm: !validatePasswordConfirm(value) }));
        break;
    }
  };

  const handleSubmit = async () => {
    const nextErrors = {
      username: !validateUsername(inputs.username),
      email: !validateEmail(inputs.email),
      password: !validatePassword(inputs.password),
      confirm: !validatePasswordConfirm(inputs.confirm),
    };

    setErrors(nextErrors);

    if (nextErrors.username || nextErrors.email || nextErrors.password || nextErrors.confirm) {
      return;
    }

    analyticsService.logEvent('signup_start', { method: 'email' });
    await onSubmit(inputs.username.trim(), inputs.email, inputs.password);
  };

  return (
    <View>
      <Text style={styles.title}>Sign up</Text>

      {/* Username */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username *</Text>
        <TextInput
          testID="register-username-input"
          style={[styles.input, errors.username && styles.inputError]}
          value={inputs.username}
          onChangeText={(value) => handleInputChange('username', value)}
          autoCapitalize="none"
          placeholder="Choose a username"
          placeholderTextColor="#999"
          editable={!isLoading}
        />
        {errors.username && (
          <Text style={styles.errorText}>Username must be at least 2 characters</Text>
        )}
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          testID="register-email-input"
          style={[styles.input, errors.email && styles.inputError]}
          value={inputs.email}
          onChangeText={(value) => handleInputChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="your@email.com"
          placeholderTextColor="#999"
          editable={!isLoading}
        />
        {errors.email && (
          <Text style={styles.errorText}>Please enter a valid email address</Text>
        )}
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            testID="register-password-input"
            style={[styles.input, errors.password && styles.inputError, styles.passwordInput]}
            value={inputs.password}
            onChangeText={(value) => handleInputChange('password', value)}
            secureTextEntry={!showPassword}
            placeholder="Min 10 characters"
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
        {errors.password && (
          <Text style={styles.errorText}>Password must be at least 10 characters</Text>
        )}
      </View>

      {/* Confirm Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            testID="register-confirm-password-input"
            style={[styles.input, errors.confirm && styles.inputError, styles.passwordInput]}
            value={inputs.confirm}
            onChangeText={(value) => handleInputChange('confirm', value)}
            secureTextEntry={!showConfirm}
            placeholder="Confirm your password"
            placeholderTextColor="#999"
            editable={!isLoading}
          />
          <TouchableOpacity
            testID="toggle-confirm-visibility"
            style={styles.passwordToggle}
            onPress={() => setShowConfirm(prev => !prev)}
            disabled={isLoading}
          >
            <Text style={styles.passwordToggleText}>{showConfirm ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
        {errors.confirm && (
          <Text style={styles.errorText}>Passwords do not match</Text>
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


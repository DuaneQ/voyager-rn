/**
 * RegisterForm Component
 * 
 * Reusable registration form following S.O.L.I.D principles:
 * - Single Responsibility: Handles only registration form UI and validation
 * - Open/Closed: Can be extended through props without modification
 * - Dependency Inversion: Depends on abstractions (callbacks) not concrete implementations
 * 
 * Features:
 * - Username, Email, Password, Confirm Password validation
 * - Google Sign-Up button with official logo
 * - Error handling and display
 * - Loading states
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import GoogleIcon from '../../icons/GoogleIcon';
import AppleSignInButton from '../buttons/AppleSignInButton';
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

  const validateUsername = (username: string) => username.length >= 2;
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => password.length >= 10;
  const validatePasswordConfirm = (confirm: string) => confirm === inputs.password && confirm.length >= 10;

  const handleInputChange = (name: string, value: string) => {
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
    if (!inputs.email || !inputs.username || !inputs.password || !inputs.confirm) {
      return;
    }

    if (inputs.password !== inputs.confirm) {
      return;
    }

    if (errors.username || errors.email || errors.password || errors.confirm) {
      return;
    }

    await onSubmit(inputs.username, inputs.email, inputs.password);
  };

  return (
    <View>
      {/* Header */}
      <Text style={styles.title}>Sign up</Text>

      {/* Username Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username *</Text>
        <TextInput
          testID="register-username-input"
          style={[styles.input, errors.username && styles.inputError]}
          value={inputs.username}
          onChangeText={(text) => handleInputChange('username', text)}
          placeholder="Username"
          placeholderTextColor="#999"
          autoCapitalize="none"
          editable={!isLoading}
        />
        {errors.username && (
          <Text style={styles.errorText}>Username must be at least 2 characters</Text>
        )}
      </View>

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          testID="register-email-input"
          style={[styles.input, errors.email && styles.inputError]}
          value={inputs.email}
          onChangeText={(text) => handleInputChange('email', text)}
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

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            testID="register-password-input"
            style={[styles.input, errors.password && styles.inputError, styles.passwordInput]}
            value={inputs.password}
            onChangeText={(text) => handleInputChange('password', text)}
            secureTextEntry={!showPassword}
            placeholder="Enter your password"
            placeholderTextColor="#999"
            editable={!isLoading}
          />
          <TouchableOpacity
            testID="toggle-password-visibility"
            style={styles.passwordToggle}
            onPress={() => setShowPassword(p => !p)}
            disabled={isLoading}
          >
            <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={styles.errorText}>Password must be at least 10 characters</Text>
        )}
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            testID="register-confirm-password-input"
            style={[styles.input, errors.confirm && styles.inputError, styles.passwordInput]}
            value={inputs.confirm}
            onChangeText={(text) => handleInputChange('confirm', text)}
            secureTextEntry={!showConfirm}
            placeholder="Confirm your password"
            placeholderTextColor="#999"
            editable={!isLoading}
          />
          <TouchableOpacity
            testID="toggle-confirm-visibility"
            style={styles.passwordToggle}
            onPress={() => setShowConfirm(p => !p)}
            disabled={isLoading}
          >
            <Text style={styles.passwordToggleText}>{showConfirm ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
        {errors.confirm && (
          <Text style={styles.errorText}>Passwords do not match</Text>
        )}
      </View>

      {/* Sign Up Button */}
      <TouchableOpacity 
        testID="signup-button"
        style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'SIGNING UP...' : 'SIGN UP'}
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

// styles imported from authFormStyles

export default RegisterForm;

/**
 * LoginForm Component
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from './authFormStyles';
import GoogleIcon from '../../icons/GoogleIcon';
import AppleSignInButton from '../buttons/AppleSignInButton';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onGoogleSignIn?: () => void; // Optional
  onAppleSignIn?: () => void;  // Optional
  onForgotPassword: () => void;
  onResendVerification: () => void;
  onSignUpPress: () => void;
  isLoading?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onGoogleSignIn,
  onAppleSignIn,
  onForgotPassword,
  onResendVerification,
  onSignUpPress,
  isLoading = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const validateEmail = (email: string) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError(text.length > 0 && !validateEmail(text));
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError(text.length > 0 && text.length < 6);
  };

  const handleSubmit = async () => {
    if (!email || !password) return;
    if (emailError || passwordError) return;
    await onSubmit(email, password);
  };

  return (
    <View>
      <Text style={styles.title}>Sign in</Text>

      <View style={styles.welcomeBox}>
        <Text style={styles.welcomeTitle}>Welcome to TravalPass</Text>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>✈️</Text>
          <Text style={styles.featureText}>AI generated itineraries</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>✈️</Text>
          <Text style={styles.featureText}>Safely match with other travelers</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>✈️</Text>
          <Text style={styles.featureText}>Your own personal travel agent</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          testID="login-email-input"
          style={[styles.input, emailError && styles.inputError]}
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="your@email.com"
          placeholderTextColor="#999"
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            testID="login-password-input"
            style={[styles.input, passwordError && styles.inputError, styles.passwordInput]}
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            placeholder="••••••••••"
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
      </View>

      <TouchableOpacity
        testID="signin-button"
        style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>{isLoading ? 'SIGNING IN...' : 'SIGN IN'}</Text>
      </TouchableOpacity>

      <View style={styles.linksRow}>
        <TouchableOpacity testID="forgot-password-link" onPress={onForgotPassword} disabled={isLoading}>
          <Text style={styles.linkSmall}>Forgot your password?</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="resend-verification-link" onPress={onResendVerification} disabled={isLoading}>
          <Text style={styles.linkSmall}>Resend email verification</Text>
        </TouchableOpacity>
      </View>

      {/* Divider and OAuth buttons - only show if handlers provided */}
      {(onGoogleSignIn || onAppleSignIn) && (
        <>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {onGoogleSignIn && (
            <TouchableOpacity testID="google-signin-button" style={[styles.button, styles.googleButton]} onPress={onGoogleSignIn} disabled={isLoading}>
              <View style={styles.googleButtonContent}>
                <GoogleIcon size={18} />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Apple Sign-In Button - iOS Only */}
          {onAppleSignIn && (
            <AppleSignInButton 
              onPress={onAppleSignIn}
              buttonType="sign-in"
              isLoading={isLoading}
            />
          )}

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
        </>
      )}

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account? </Text>
        <TouchableOpacity testID="register-link" onPress={onSignUpPress} disabled={isLoading}>
          <Text style={styles.signupLink}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginForm;

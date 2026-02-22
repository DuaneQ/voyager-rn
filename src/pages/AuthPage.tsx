/**
 * AuthPage Component
 * 
 * Single entry point for all authentication flows matching PWA exactly:
 * - SignInForm.tsx (login with email/password and Google)
 * - SignUpForm.tsx (register with email/password and Google)
 * - Reset.tsx (forgot password - send reset email)
 * - ResendEmail.tsx (resend verification email)
 * 
 * Uses simplified AuthContext that mirrors PWA's Firebase Auth patterns exactly.
 * Cross-platform storage: localStorage (web) / AsyncStorage (mobile)
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import mapAuthError from '../utils/auth/firebaseAuthErrorMapper';

// Form Components
import LoginForm from '../components/auth/forms/LoginForm';
import RegisterForm from '../components/auth/forms/RegisterForm';
import ForgotPasswordForm from '../components/auth/forms/ForgotPasswordForm';
import ResendVerificationForm from '../components/auth/forms/ResendVerificationForm';

type AuthMode = 'login' | 'register' | 'forgot' | 'resend';

/** Read initial mode from ?mode= query param on web, default to 'login' */
const getInitialMode = (): AuthMode => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const param = new URLSearchParams(window.location.search).get('mode');
    if (param === 'login' || param === 'register') {
      return param as AuthMode;
    }
  }
  return 'login';
};

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>(getInitialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signIn, signUp, sendPasswordReset, resendVerification, status, signInWithGoogle, signUpWithGoogle, signInWithApple, signUpWithApple } = useAuth();
  const { showAlert } = useAlert();
  
  const isLoading = status === 'loading' || isSubmitting;

  /**
   * Login Handler - Matches PWA's SignInForm.tsx handleSubmit exactly
   */
  const handleLogin = async (email: string, password: string) => {
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      // Avoid showing a native success dialog on mobile automation runs.
      // On web we keep the friendly success alert, but on iOS/Android we log instead
      if (Platform.OS === 'web') {
        showAlert('success', 'Login successful! Welcome back.');
      }
      // Navigation will be handled by auth state change in AppNavigator
    } catch (error: any) {
      const friendly = mapAuthError(error);
      showAlert('error', friendly.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Register Handler - Matches PWA's SignUpForm.tsx handleSubmit exactly
   */
  const handleRegister = async (username: string, email: string, password: string) => {
    setIsSubmitting(true);
    try {
      await signUp(username, email, password);
      showAlert('success', 'A verification link has been sent to your email. Please check your inbox and spam folder.');
      setMode('login');
    } catch (error: any) {
      const friendly = mapAuthError(error);
      showAlert('error', friendly.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Forgot Password Handler - Matches PWA's Reset.tsx onSubmit exactly
   */
  const handleForgotPassword = async (email: string) => {
    setIsSubmitting(true);
    try {
      await sendPasswordReset(email);
      showAlert('success', 'Check your email for the reset link.');
      setMode('login');
    } catch (error: any) {
      const friendly = mapAuthError(error);
      showAlert('error', friendly.message || 'Failed to send password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resend Verification Handler - Uses Admin SDK Cloud Function
   */
  const handleResendVerification = async (email: string) => {
    setIsSubmitting(true);
    try {
      await resendVerification(email);
      showAlert('success', 'Verification email sent. Please check your inbox and spam folder.');
    } catch (error: any) {
      const friendly = mapAuthError(error);
      showAlert('error', friendly.message || 'Failed to resend verification email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Google Sign-In Handler
   * Scenario 1: New user tries to sign in → redirect to sign up
   * Scenario 4: Existing user signs in → success
   */
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      // Success - navigation happens automatically via AuthContext
      if (Platform.OS === 'web') {
        showAlert('success', 'Login successful! Welcome back.');
      }
    } catch (error: any) {
      // Handle specific error: new user trying to sign in
      if (error.message === 'ACCOUNT_NOT_FOUND') {
        showAlert(
          'error',
          'No account found for this Google account. Please sign up first.'
        );
        setMode('register'); // Switch to register form
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
        showAlert('error', errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Google Sign-Up Handler
   * Scenario 2: Existing user tries to sign up → sign them in
   * Scenario 3: New user signs up → create profile and sign in
   */
  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    try {
      await signUpWithGoogle();
      // Success - navigation happens automatically via AuthContext
      showAlert('success', 'Successfully signed up with Google! Welcome to TravalPass.');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign-up failed';
      showAlert('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Apple Sign-In Handler
   * Scenario 1: New user tries to sign in → redirect to sign up
   * Scenario 4: Existing user signs in → success
   */
  const handleAppleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithApple();
      if (Platform.OS === 'web') {
        showAlert('success', 'Login successful! Welcome back.');
      }
    } catch (error: any) {
      if (error.message === 'ACCOUNT_NOT_FOUND') {
        showAlert(
          'error',
          'No account found for this Apple ID. Please sign up first.'
        );
        setMode('register');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Apple sign-in failed';
        showAlert('error', errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Apple Sign-Up Handler
   * Scenario 2: Existing user tries to sign up → sign them in
   * Scenario 3: New user signs up → create profile and sign in
   */
  const handleAppleSignUp = async () => {
    setIsSubmitting(true);
    try {
      await signUpWithApple();
      showAlert('success', 'Successfully signed up with Apple! Welcome to TravalPass.');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Apple sign-up failed';
      showAlert('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the appropriate form based on mode
  const renderForm = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onSubmit={handleLogin}
            onGoogleSignIn={handleGoogleSignIn}
            onAppleSignIn={handleAppleSignIn}
            onForgotPassword={() => {
              setMode('forgot');
            }}
            onResendVerification={() => {
              setMode('resend');
            }}
            onSignUpPress={() => {
              setMode('register');
            }}
            isLoading={isLoading}
          />
        );

      case 'register':
        return (
          <RegisterForm
            onSubmit={handleRegister}
            onGoogleSignUp={handleGoogleSignUp}
            onAppleSignUp={handleAppleSignUp}
            onSignInPress={() => {
              setMode('login');
            }}
            isLoading={isLoading}
          />
        );

      case 'forgot':
        return (
          <ForgotPasswordForm
            onSubmit={handleForgotPassword}
            onBackPress={() => {
              setMode('login');
            }}
            isLoading={isLoading}
          />
        );

      case 'resend':
        return (
          <ResendVerificationForm
            onSubmit={handleResendVerification}
            onBackPress={() => {
              setMode('login');
            }}
            isLoading={isLoading}
          />
        );

      default:
        return null;
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/login-image.jpeg')}
      style={styles.container}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              {renderForm()}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default AuthPage;

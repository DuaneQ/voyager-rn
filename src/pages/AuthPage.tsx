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

// Form Components
import LoginForm from '../components/auth/forms/LoginForm';
import RegisterForm from '../components/auth/forms/RegisterForm';
import ForgotPasswordForm from '../components/auth/forms/ForgotPasswordForm';
import ResendVerificationForm from '../components/auth/forms/ResendVerificationForm';

type AuthMode = 'login' | 'register' | 'forgot' | 'resend';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signIn, signUp, sendPasswordReset, resendVerification, status, signInWithGoogle, signUpWithGoogle } = useAuth();
  const { showAlert } = useAlert();
  
  const isLoading = status === 'loading' || isSubmitting;

  /**
   * Login Handler - Matches PWA's SignInForm.tsx handleSubmit exactly
   */
  const handleLogin = async (email: string, password: string) => {
    // Debug: log incoming credentials for automation troubleshooting
    try {
      console.log('[AuthPage] handleLogin called with email:', email, 'password length:', password ? password.length : 0);
    } catch (e) {
      // ignore logging errors
    }
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      // Avoid showing a native success dialog on mobile automation runs.
      // On web we keep the friendly success alert, but on iOS/Android we log instead
      if (Platform.OS === 'web') {
        showAlert('success', 'Login successful! Welcome back.');
      } else {
        console.log('[AuthPage] Login successful (mobile) - suppressing success alert for automation');
      }
      // Navigation will be handled by auth state change in AppNavigator
    } catch (error: any) {
      if (error.message.includes('Email not verified')) {
        showAlert(
          'error',
          'Your email has not been verified. Please check your inbox or spam folder, or click the link below to resend another verification email.'
        );
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        showAlert('error', errorMessage);
      }
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
      showAlert('success', 'A verification link has been sent to your email for verification.');
      setMode('login');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        showAlert('error', 'An account already exists for that email. Please sign in instead.');
      } else if (error.code === 'auth/invalid-email') {
        showAlert('error', 'Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        showAlert('error', 'Password should be at least 6 characters.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        showAlert('error', errorMessage);
      }
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to send password reset email.';
      showAlert('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resend Verification Handler - Matches PWA's ResendEmail.tsx resendEmailVerification exactly
   */
  const handleResendVerification = async () => {
    setIsSubmitting(true);
    try {
      await resendVerification();
      showAlert('success', 'Verification email sent.');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email.';
      showAlert('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Google Sign-In Handler
   * TODO: Implement with @react-native-google-signin/google-signin
   */
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      showAlert('success', 'Signed in with Google');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      showAlert('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Google Sign-Up Handler
   * TODO: Implement with @react-native-google-signin/google-signin
   */
  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    try {
      await signUpWithGoogle();
      showAlert('success', 'Signed up with Google');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign-up failed';
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
            onForgotPassword={() => {
              console.log('[AuthPage] Navigation: Login → Forgot Password');
              setMode('forgot');
            }}
            onResendVerification={() => {
              console.log('[AuthPage] Navigation: Login → Resend Verification');
              setMode('resend');
            }}
            onSignUpPress={() => {
              console.log('[AuthPage] Navigation: Login → Register');
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
            onSignInPress={() => {
              console.log('[AuthPage] Navigation: Register → Login');
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
              console.log('[AuthPage] Navigation: Forgot Password → Login');
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
              console.log('[AuthPage] Navigation: Resend Verification → Login');
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

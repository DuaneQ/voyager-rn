/**
 * TermsGuard Component
 * Wrapper component that ensures users have accepted Terms of Service
 * Following Open/Closed Principle - extends app behavior without modifying existing code
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { TermsOfServiceModal } from '../modals/TermsOfServiceModal';
import { useTermsAcceptance } from '../../hooks/useTermsAcceptance';
import { useAuth } from '../../context/AuthContext';

interface TermsGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that blocks app usage until Terms of Service are accepted
 * Shows modal for unauthenticated users or those who haven't accepted terms
 * 
 * @param {TermsGuardProps} props - Component props
 * @returns {React.ReactNode} Children if terms accepted, modal if not
 */
export const TermsGuard: React.FC<TermsGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, signOut: authSignOut } = useAuth();
  const { hasAcceptedTerms, isLoading, error, acceptTerms } = useTermsAcceptance();
  const userId = user?.uid;

  // If user is not logged in, don't render anything
  // The auth state change will trigger RootNavigator to show Auth screen
  if (!userId) {
    return null;
  }

  /**
   * Handle terms acceptance
   */
  const handleAcceptTerms = async () => {
    try {
      await acceptTerms();
      // Success - hook will update state automatically
    } catch (error) {
      console.error('[TermsGuard.handleAcceptTerms] ❌ Failed to accept terms:', error);
      // Error is already set in hook state
    }
  };

  /**
   * Handle terms decline - sign out user immediately using AuthContext
   */
  const handleDeclineTerms = async () => {
    try {
      // Use AuthContext signOut which properly clears all state
      await authSignOut();
    } catch (error) {
      console.error('[TermsGuard] Failed to sign out:', error);
    }
  };

  // Show loading state while checking terms status
  // IMPORTANT: Don't show the modal while loading - wait until we know for sure
  // the user hasn't accepted terms. This prevents the modal from flashing on screen
  // for users who have already accepted.
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  // Show error state if terms check failed
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading profile</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  // If terms are accepted, render children
  if (hasAcceptedTerms) {
    return <>{children}</>;
  }

  // Only show terms modal if we're NOT loading AND terms haven't been accepted
  // This ensures the modal only appears for users who genuinely need to accept terms
  return (
    <>
      <TermsOfServiceModal
        visible={!isLoading && !hasAcceptedTerms}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
        loading={isLoading}
        error={error}
      />
      
      <View style={styles.centerContainer}>
        <Text style={styles.blockedTitle}>Terms of Service Required</Text>
        <Text style={styles.blockedText}>
          Please accept our Terms of Service to continue using TravalPass.
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  blockedText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});

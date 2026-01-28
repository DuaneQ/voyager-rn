/**
 * SubscriptionCard - React Native Web Implementation
 * Replicates exact functionality of voyager-pwa/src/components/common/SubscriptionCard.tsx
 * 
 * NOTE: This component is for WEB ONLY. Mobile users are directed to sign in on web.
 * - Free users see "Upgrade" button → Stripe Checkout
 * - Premium users see "Manage" button → Stripe Billing Portal
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useStripePortal } from '../../hooks/useStripePortal';
import { useAlert } from '../../context/AlertContext';

interface SubscriptionCardProps {
  /** Hide the Manage button even for premium users */
  hideManage?: boolean;
  /** Use compact floating style (bottom-left corner) */
  compact?: boolean;
}

/**
 * Subscription management component
 * Shows upgrade button for free users, manage button for premium users
 * Only renders on web platform
 */
const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ 
  hideManage = false, 
  compact = false 
}) => {
  const { hasPremium, userProfile } = useUsageTracking();
  const { openPortal, loading: managingPortal, error: portalError } = useStripePortal();
  const { showAlert } = useAlert();
  const [subscribing, setSubscribing] = useState(false);

  // Only render on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  const isPremium = hasPremium();

  /**
   * Handle subscription upgrade via Stripe Checkout
   * Creates a checkout session and redirects to Stripe
   */
  const handleSubscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      // Match PWA exactly: getFunctions() without arguments
      const functions = getFunctions();
      const createCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://travalpass.com';
      const result: any = await createCheckoutSession({ origin });

      if (result?.data?.url) {
        // Redirect to Stripe Checkout
        window.location.assign(result.data.url);
      } else {
        showAlert('error', 'Failed to redirect to Stripe. Please try again.');
      }
    } catch (err: any) {
      console.error('[SubscriptionCard] Error creating checkout session:', err);
      showAlert('error', err?.message || 'Failed to redirect to Stripe. Please try again.');
    } finally {
      setSubscribing(false);
    }
  }, [showAlert]);

  /**
   * Handle manage subscription via Stripe Billing Portal
   */
  const handleManage = useCallback(async () => {
    await openPortal();
    // Error is already handled in the hook, but we can show it here too
    if (portalError) {
      showAlert('error', portalError);
    }
  }, [openPortal, portalError, showAlert]);

  // Determine if user is in "limbo" state (has Stripe customer ID but not premium)
  // Use state so we can clear it on mount/refresh (matching PWA behavior)
  const [isLimbo, setIsLimbo] = useState(false);

  // On mount or when userProfile changes, clear limbo state so user can retry upgrade
  // This matches PWA behavior - limbo message should not persist after refresh
  useEffect(() => {
    // We intentionally set isLimbo to false on mount/refresh
    // The error message is meant for immediate feedback, not persistent display
    setIsLimbo(false);
  }, [userProfile]);

  return (
    <View style={compact ? styles.compactCard : styles.fullCard}>
      <Text style={styles.label}>
        {isPremium ? 'Premium' : 'Unlimited Searches'}
      </Text>

      {/* User profile not loaded */}
      {userProfile === null && (
        <Text style={styles.errorText}>
          User profile not loaded. Please refresh or re-login.
        </Text>
      )}

      {/* User profile malformed */}
      {userProfile && typeof userProfile !== 'object' && (
        <Text style={styles.errorText}>
          User profile is malformed. Please contact support.
        </Text>
      )}

      {/* Normal user profile */}
      {userProfile && typeof userProfile === 'object' && (
        <>
          {isPremium && !hideManage ? (
            // Premium user - show Manage button
            <>
              <TouchableOpacity
                style={[styles.button, styles.manageButton]}
                onPress={handleManage}
                disabled={managingPortal}
                accessibilityLabel="Manage subscription"
                accessibilityRole="button"
              >
                {managingPortal ? (
                  <ActivityIndicator size="small" color="#1976d2" />
                ) : (
                  <Text style={styles.manageButtonText}>Manage</Text>
                )}
              </TouchableOpacity>
              {portalError && (
                <Text style={styles.errorText}>{portalError}</Text>
              )}
            </>
          ) : (
            // Free user - show Upgrade button
            <>
              {isLimbo && (
                <Text style={styles.limboText}>
                  Subscription failed. Try again or contact support@travalpass.com
                </Text>
              )}
              <TouchableOpacity
                style={[styles.button, styles.upgradeButton]}
                onPress={handleSubscribe}
                disabled={subscribing}
                accessibilityLabel="Upgrade to Premium"
                accessibilityRole="button"
              >
                {subscribing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.upgradeButtonText}>Upgrade</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact floating style (bottom-left corner, just above bottom nav)
  // 5px gap between button and bottom nav bar
  compactCard: {
    position: 'absolute',
    bottom: 5, // 5px above bottom navigation bar
    left: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1200,
  },
  // Full card style
  fullCard: {
    maxWidth: 420,
    marginHorizontal: 'auto',
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
    marginRight: 8,
  },
  button: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButton: {
    backgroundColor: '#1976d2',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  manageButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  manageButtonText: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 10,
    marginTop: 4,
  },
  limboText: {
    color: '#d32f2f',
    fontSize: 10,
    marginRight: 8,
    maxWidth: 90,
  },
});

export default SubscriptionCard;

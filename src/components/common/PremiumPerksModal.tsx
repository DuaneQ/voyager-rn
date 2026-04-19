/**
 * PremiumPerksModal
 * Shows premium subscription benefits before redirecting to Stripe checkout.
 * Also used as paywall when daily usage limit is reached.
 *
 * Web-only — renders null on native platforms.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAlert } from '../../context/AlertContext';

interface PremiumPerksModalProps {
  visible: boolean;
  onClose: () => void;
}

const PERKS = [
  { icon: 'search' as const, text: 'Unlimited itinerary searches per day' },
  { icon: 'sparkles' as const, text: '20 AI-generated itineraries per day' },
];

const PremiumPerksModal: React.FC<PremiumPerksModalProps> = ({ visible, onClose }) => {
  const [subscribing, setSubscribing] = useState(false);
  const { showAlert } = useAlert();

  const handleSubscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      const functions = getFunctions();
      const createCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://travalpass.com';
      const result: any = await createCheckoutSession({ origin });

      if (result?.data?.url) {
        window.location.assign(result.data.url);
      } else {
        showAlert('error', 'Failed to redirect to Stripe. Please try again.');
      }
    } catch (err: any) {
      console.error('[PremiumPerksModal] Error creating checkout session:', err);
      showAlert('error', err?.message || 'Failed to start checkout. Please try again.');
    } finally {
      setSubscribing(false);
    }
  }, [showAlert]);

  // Only render on web
  if (Platform.OS !== 'web') return null;

  // Only render on web — mobile users are directed to web for subscription
  if (Platform.OS !== 'web') return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color="#666" />
          </TouchableOpacity>

          {/* Header */}
          <Ionicons name="lock-open" size={36} color="#1976d2" style={styles.headerIcon} />
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Get the most out of TravalPass
          </Text>

          {/* Perk list */}
          <View style={styles.perksList}>
            {PERKS.map((perk, i) => (
              <View key={i} style={styles.perkRow}>
                <Ionicons name={perk.icon} size={20} color="#1976d2" />
                <Text style={styles.perkText}>{perk.text}</Text>
              </View>
            ))}
          </View>

          {/* Subscribe CTA */}
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            disabled={subscribing}
            accessibilityLabel="Subscribe to Premium"
            accessibilityRole="button"
          >
            {subscribing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.subscribeText}>Subscribe Now</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>Cancel anytime. Billed monthly.</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  headerIcon: {
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  perksList: {
    width: '100%',
    marginBottom: 24,
    gap: 14,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perkText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscribeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});

export default PremiumPerksModal;

/**
 * TermsOfServiceModal Component
 * Lightweight "Quick Agreement" modal shown before match initiation.
 * "View Terms" opens the full legal Terms of Service inline — no external URL dependency.
 * Following Single Responsibility Principle - only handles ToS UI presentation.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { isAppError } from '../../errors/AppError';
import { TermsOfServiceModal as FullTermsModal } from './legal/TermsOfServiceModal';

interface TermsOfServiceModalProps {
  visible: boolean;
  onAccept: () => Promise<void>;
  onDecline?: () => void;
  loading?: boolean;
  error?: Error | null;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  visible,
  onAccept,
  onDecline,
  loading = false,
  error = null,
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);

  // Reset sub-modal state whenever this modal closes, so it doesn't persist
  // to the next open.
  useEffect(() => {
    if (!visible) setShowFullTerms(false);
  }, [visible]);

  const handleContinue = async () => {
    if (isAccepting || loading) return;
    setIsAccepting(true);
    try {
      await onAccept();
    } catch (err) {
      console.error('[TermsOfServiceModal] Error accepting terms:', err);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <>
      {/* Quick Agreement overlay — hidden while full terms are open so the
          full-terms Modal renders above rather than behind this one on web. */}
      <Modal
        visible={visible && !showFullTerms}
        animationType="fade"
        transparent={true}
        onRequestClose={() => onDecline?.()}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Quick Agreement</Text>
            <Text style={styles.body}>
              By continuing, you agree to our Terms {'&'} Safety Guidelines.
            </Text>

            {error && (
              <Text style={styles.errorText}>
                {isAppError(error) ? error.getUserMessage() : 'Something went wrong. Please try again.'}
              </Text>
            )}

            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.viewTermsButton}
                onPress={() => setShowFullTerms(true)}
                accessibilityRole="button"
                accessibilityLabel="Read the full Terms of Service"
              >
                <Text style={styles.viewTermsText}>View Terms</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.continueButton, (isAccepting || loading) && styles.buttonDisabled]}
                onPress={handleContinue}
                disabled={isAccepting || loading}
                accessibilityRole="button"
                accessibilityLabel="Continue and agree to terms"
              >
                {isAccepting || loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.continueText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full terms shown as a sub-modal — no external URL needed */}
      <FullTermsModal
        visible={showFullTerms}
        onClose={() => setShowFullTerms(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#444444',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  viewTermsButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTermsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  continueButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

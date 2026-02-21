/**
 * ForceUpgradeModal.tsx
 *
 * Shown when the running app version is below the thresholds set in
 * Firebase Remote Config.
 *
 * Two modes:
 *  • force  — blocking modal, no dismiss. User MUST update to continue.
 *  • soft   — dismissable modal. User can choose "Later".
 *
 * TODO: Replace APP_STORE_ID below with your numeric App Store ID.
 *       Find it at: App Store Connect → App Information → Apple ID
 *       Example: "6743928291"
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Image,
} from 'react-native';

// ─── Store URLs ───────────────────────────────────────────────────────────────

/** TODO: Replace with your numeric App Store ID (App Store Connect → App Information → Apple ID) */
const APP_STORE_ID = '6756789856';
const IOS_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

const ANDROID_PACKAGE = 'com.travalpass.app';
const ANDROID_STORE_URL = `market://details?id=${ANDROID_PACKAGE}`;
const ANDROID_STORE_URL_FALLBACK = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

// ─── Component ────────────────────────────────────────────────────────────────

interface ForceUpgradeModalProps {
  /** Show the modal */
  visible: boolean;
  /** true = user cannot dismiss; false = "Later" option is available */
  isForced: boolean;
  /** The version string to show ("1.8.0") — optional */
  latestVersion?: string;
  /** Called when user taps "Later" (only relevant when isForced=false) */
  onDismiss?: () => void;
}

export const ForceUpgradeModal: React.FC<ForceUpgradeModalProps> = ({
  visible,
  isForced,
  latestVersion,
  onDismiss,
}) => {
  const handleUpdate = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL(IOS_STORE_URL);
      } else {
        // Try native market:// link first; fall back to web URL on emulators
        const canOpen = await Linking.canOpenURL(ANDROID_STORE_URL);
        await Linking.openURL(canOpen ? ANDROID_STORE_URL : ANDROID_STORE_URL_FALLBACK);
      }
    } catch (error) {
      console.warn('[ForceUpgradeModal] Failed to open store:', error);
    }
  };

  const versionText = latestVersion ? ` (${latestVersion})` : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Prevent hardware back button from dismissing on Android when forced
      onRequestClose={isForced ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.iconEmoji}>🚀</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isForced ? 'Update Required' : 'Update Available'}
          </Text>

          {/* Body */}
          <Text style={styles.body}>
            {isForced
              ? `A new version of TravalPass${versionText} is required to continue. Please update to keep using the app.`
              : `A new version of TravalPass${versionText} is available with improvements and fixes.`}
          </Text>

          {/* Update button */}
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
            <Text style={styles.updateButtonText}>Update Now</Text>
          </TouchableOpacity>

          {/* Dismiss button — only shown for soft updates */}
          {!isForced && onDismiss && (
            <TouchableOpacity style={styles.laterButton} onPress={onDismiss}>
              <Text style={styles.laterButtonText}>Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#888',
    fontSize: 15,
  },
});

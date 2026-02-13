import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

export interface ContactPermissionModalProps {
  /**
   * Whether modal is visible
   */
  visible: boolean;
  
  /**
   * Callback when user taps "Allow Contact Access"
   */
  onAllowAccess: () => void;
  
  /**
   * Callback when user dismisses modal (taps "Not Now" or backdrop)
   */
  onDismiss: () => void;
}

export const ContactPermissionModal: React.FC<ContactPermissionModalProps> = ({
  visible,
  onAllowAccess,
  onDismiss,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity 
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <View 
          style={styles.modalContainer}
          onStartShouldSetResponder={() => true}
        >
          {/* Icon */}
          <Text style={styles.icon}>👥</Text>
          
          {/* Title */}
          <Text style={styles.title}>Find Friends on TravalPass</Text>
          
          {/* Description */}
          <Text style={styles.description}>
            Discover which of your contacts are already using TravalPass and invite friends to join you.
          </Text>
          
          {/* Privacy Points */}
          <View style={styles.privacyContainer}>
            <PrivacyPoint text="Your contacts stay private" />
            <PrivacyPoint text="We never share your contacts" />
            <PrivacyPoint text="You control who you invite" />
          </View>
          
          {/* Primary Button */}
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={onAllowAccess}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Allow Contact Access</Text>
          </TouchableOpacity>
          
          {/* Secondary Button */}
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={onDismiss}
            activeOpacity={0.6}
          >
            <Text style={styles.secondaryButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

/**
 * Privacy checkmark point component
 */
interface PrivacyPointProps {
  text: string;
}

const PrivacyPoint: React.FC<PrivacyPointProps> = ({ text }) => (
  <View style={styles.privacyPoint}>
    <Text style={styles.checkmark}>✓</Text>
    <Text style={styles.privacyText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: Platform.OS === 'web' ? 480 : '90%',
    maxWidth: 480,
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 8,
  },
  icon: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  privacyContainer: {
    width: '100%',
    marginBottom: 24,
  },
  privacyPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkmark: {
    fontSize: 14,
    color: '#4CAF50',
    marginRight: 8,
    fontWeight: 'bold',
  },
  privacyText: {
    fontSize: 14,
    color: '#666',
  },
  primaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#1976D2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#666',
  },
});

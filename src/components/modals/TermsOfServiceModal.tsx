/**
 * TermsOfServiceModal Component
 * Modal for presenting Terms of Service with Accept/Decline actions
 * Following Single Responsibility Principle - only handles ToS UI presentation
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface TermsOfServiceModalProps {
  visible: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => void;
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
  const insets = useSafeAreaInsets();
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [acknowledgments, setAcknowledgments] = useState({
    readTerms: false,
    understandRisks: false,
    personalSafety: false,
    releaseLiability: false,
    legalAge: false,
    complyLaws: false,
  });
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAcknowledgmentChange = (key: keyof typeof acknowledgments) => {
    setAcknowledgments(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allAcknowledged = Object.values(acknowledgments).every(Boolean) && hasReadTerms;

  const handleAccept = async () => {
    if (!allAcknowledged || isAccepting) return;
    
    setIsAccepting(true);
    try {
      await onAccept();
    } catch (error) {
      console.error('[TermsOfServiceModal] Error accepting terms:', error);
      // Error will be displayed via error prop from parent
    } finally {
      setIsAccepting(false);
    }
  };

  const acknowledgmentItems = [
    {
      key: 'readTerms' as const,
      text: 'I have read and understand the complete Terms of Service',
    },
    {
      key: 'understandRisks' as const,
      text: 'I understand the risks associated with meeting strangers through the platform',
    },
    {
      key: 'personalSafety' as const,
      text: 'I assume full responsibility for my personal safety when meeting other users',
    },
    {
      key: 'releaseLiability' as const,
      text: 'I release TravalPass from liability for interactions with other users',
    },
    {
      key: 'legalAge' as const,
      text: 'I am at least 18 years old and legally capable of entering this agreement',
    },
    {
      key: 'complyLaws' as const,
      text: 'I will comply with all applicable laws and regulations while using the service',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {}} // Prevent dismissal
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Terms of Service Agreement</Text>
          <Text style={styles.subtitle}>You must accept all terms to use TravalPass</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom + 24, 32) },
          ]}
        >
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ IMPORTANT LEGAL NOTICE</Text>
            <Text style={styles.warningText}>
              This agreement contains important legal terms including limitations of liability. 
              You must read and accept all terms to use TravalPass.
            </Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.sectionTitle}>TravalPass Terms of Service Summary</Text>
            
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Service Description:</Text> TravalPass connects travelers to share 
              itineraries and travel experiences. This involves meeting strangers, which carries inherent risks.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>🚫 ZERO TOLERANCE POLICY</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>TravalPass maintains a STRICT ZERO TOLERANCE policy for:</Text>
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• Explicit sexual content, nudity, or pornography</Text>
              <Text style={styles.bullet}>• Violence, graphic content, or threats</Text>
              <Text style={styles.bullet}>• Harassment, bullying, or abusive behavior</Text>
              <Text style={styles.bullet}>• Hate speech or discrimination</Text>
              <Text style={styles.bullet}>• Illegal activities or fraud</Text>
              <Text style={styles.bullet}>• Spam or misleading information</Text>
            </View>

            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Immediate Consequences:</Text>
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• Accounts will be immediately suspended</Text>
              <Text style={styles.bullet}>• Permanent termination and ejection from platform</Text>
              <Text style={styles.bullet}>• Content removed within 24 hours of being reported</Text>
              <Text style={styles.bullet}>• Severe violations reported to law enforcement</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Your Responsibilities:</Text>
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• Exercise caution when meeting other users</Text>
              <Text style={styles.bullet}>• Verify user information independently</Text>
              <Text style={styles.bullet}>• Report objectionable content immediately</Text>
              <Text style={styles.bullet}>• Take responsibility for your personal safety</Text>
              <Text style={styles.bullet}>• Comply with local laws while traveling</Text>
            </View>

            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Our Limitations:</Text>
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• We don't conduct background checks on users</Text>
              <Text style={styles.bullet}>• We're not liable for user interactions or meetings</Text>
              <Text style={styles.bullet}>• We don't provide travel booking services</Text>
              <Text style={styles.bullet}>• We review all reports within 24 hours</Text>
            </View>

            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Safety Recommendations:</Text>
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• Meet in public places initially</Text>
              <Text style={styles.bullet}>• Inform others of your travel plans</Text>
              <Text style={styles.bullet}>• Trust your instincts about other users</Text>
              <Text style={styles.bullet}>• Obtain appropriate travel insurance</Text>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setHasReadTerms(!hasReadTerms)}
              disabled={loading || isAccepting}
            >
              <View style={[styles.checkbox, hasReadTerms && styles.checkboxChecked]}>
                {hasReadTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I have read the complete Terms of Service document and understand my rights and responsibilities
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>⚠️ Required Acknowledgments</Text>

          {acknowledgmentItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.checkboxContainer}
              onPress={() => handleAcknowledgmentChange(item.key)}
              disabled={loading || isAccepting}
            >
              <View style={[styles.checkbox, acknowledgments[item.key] && styles.checkboxChecked]}>
                {acknowledgments[item.key] && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                {item.text} <Text style={styles.required}>*</Text>
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              By accepting these terms, you acknowledge that TravalPass is a platform that connects users and 
              that all interactions, meetings, and travel arrangements are at your own risk and responsibility.
            </Text>
          </View>
        </ScrollView>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>❌ Error</Text>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}

        <SafeAreaView
          edges={["bottom"]}
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + 12, 16) },
          ]}
        >
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={onDecline}
            disabled={loading || isAccepting}
          >
            <Text style={styles.declineButtonText}>
              {loading ? 'Processing...' : 'Decline & Logout'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.acceptButton,
              (!allAcknowledged || loading || isAccepting) && styles.buttonDisabled,
            ]}
            onPress={handleAccept}
            disabled={!allAcknowledged || loading || isAccepting}
          >
            {isAccepting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.acceptButtonText}>I Accept These Terms</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  summaryBox: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginTop: 12,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 19,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#333333',
  },
  bulletList: {
    marginVertical: 8,
    marginLeft: 8,
  },
  bullet: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    padding: 12,
    marginTop: 16,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#0D47A1',
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 4,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    lineHeight: 18,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    lineHeight: 19,
  },
  required: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: '#F5F5F5',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

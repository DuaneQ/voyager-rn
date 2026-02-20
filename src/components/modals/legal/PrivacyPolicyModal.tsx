/**
 * PrivacyPolicyModal.tsx - Comprehensive Privacy Policy for TravalPass
 * Enhanced with GDPR, CCPA, and mobile-specific privacy terms
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Privacy Policy</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            <Text style={styles.effectiveDate}>Effective Date: February 11, 2026</Text>
            <Text style={styles.lastUpdated}>Last Updated: February 11, 2026</Text>

            <Text style={styles.paragraph}>
              TravalPass ("we," "our," or "us") is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your information when you use
              our mobile application and web services (collectively, the "Platform").
            </Text>

            <Text style={styles.sectionTitle}>1. Information We Collect</Text>

            <Text style={styles.subSectionTitle}>1.1 Information You Provide</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Account Information:</Text> Name, email address, phone number,
              date of birth, profile photos{'\n'}
              • <Text style={styles.bold}>Travel Preferences:</Text> Destinations, travel dates, budget
              preferences, interests{'\n'}
              • <Text style={styles.bold}>Profile Content:</Text> Bio, photos, videos, itineraries{'\n'}
              • <Text style={styles.bold}>Communication Data:</Text> Messages sent through our chat feature
              {'\n'}
              • <Text style={styles.bold}>Payment Information:</Text> For web subscriptions, processed
              securely through Stripe (we do not store full payment details). For iOS subscriptions,
              processed through Apple App Store In-App Purchases. For Android subscriptions, processed
              through Google Play Store In-App Purchases. We do not have access to your payment card
              details for mobile purchases.
            </Text>

            <Text style={styles.subSectionTitle}>1.2 Automatically Collected Information</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Device Information:</Text> Device type, operating system,
              unique device identifiers, mobile network information{'\n'}
              • <Text style={styles.bold}>Usage Data:</Text> App interactions, features used, search
              queries, time spent in app{'\n'}
              • <Text style={styles.bold}>Location Data:</Text> With your permission, we collect precise
              or approximate location data{'\n'}
              • <Text style={styles.bold}>Log Data:</Text> IP address, access times, pages viewed,
              crashes, and system activity
            </Text>

            <Text style={styles.subSectionTitle}>1.3 Third-Party Authentication</Text>
            <Text style={styles.paragraph}>
              When you sign in using Google or Apple Sign-In, we receive basic profile information as
              permitted by these services (name, email, profile photo).
            </Text>

            <Text style={styles.subSectionTitle}>1.4 Contact Information (Optional)</Text>
            <Text style={styles.paragraph}>
              If you choose to enable contact discovery, we collect and process:{' \n'}
              • <Text style={styles.bold}>Contact Names:</Text> Names from your device's contact list
              {'\n'}
              • <Text style={styles.bold}>Phone Numbers:</Text> Phone numbers associated with contacts
              {'\n'}
              • <Text style={styles.bold}>Email Addresses:</Text> Email addresses associated with
              contacts{'\n\n'}
              <Text style={styles.bold}>How We Handle Your Contacts:</Text>{'\n'}
              • We hash (encrypt) your contacts' phone numbers and email addresses before comparing them
              to our user database{'\n'}
              • We do NOT store your contacts' names, phone numbers, or email addresses on our servers
              {'\n'}
              • We only store hashed values temporarily for matching purposes{'\n'}
              • We automatically delete hashed contact data after 24 hours{'\n'}
              • You can revoke contact access at any time in your device settings{'\n'}
              • You can delete all stored contact hashes from Settings → Privacy → Delete Contact Data
            </Text>

            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.paragraph}>
              • Provide and maintain the Platform{'\n'}
              • Create and manage your account{'\n'}
              • Connect you with compatible travel companions{'\n'}
              • Match your contacts with existing TravalPass users (only with your permission){'\n'}
              • Process subscription payments{'\n'}
              • Generate AI-powered travel itineraries{'\n'}
              • Send notifications about matches and messages{'\n'}
              • Improve and personalize your experience{'\n'}
              • Analyze usage patterns and trends{'\n'}
              • Prevent fraud and enforce our Terms of Service{'\n'}
              • Comply with legal obligations{'\n'}
              • Send service-related communications
            </Text>

            <Text style={styles.sectionTitle}>3. How We Share Your Information</Text>

            <Text style={styles.subSectionTitle}>3.1 With Other Users</Text>
            <Text style={styles.paragraph}>
              Your profile information (name, photos, bio, travel preferences) is visible to other users
              for matching purposes. You control what information appears in your profile.
            </Text>

            <Text style={styles.subSectionTitle}>3.2 With Service Providers</Text>
            <Text style={styles.paragraph}>
              We share data with trusted service providers who assist us:{'\n'}
              • <Text style={styles.bold}>Firebase/Google Cloud:</Text> Hosting, database, authentication
              {'\n'}
              • <Text style={styles.bold}>Stripe:</Text> Payment processing{'\n'}
              • <Text style={styles.bold}>OpenAI:</Text> AI itinerary generation{'\n'}
              • <Text style={styles.bold}>Analytics Services:</Text> Usage analysis and crash reporting
            </Text>

            <Text style={styles.subSectionTitle}>3.3 Legal Requirements</Text>
            <Text style={styles.paragraph}>
              We may disclose your information if required by law, court order, or government request, or
              to protect our rights, safety, or property.
            </Text>

            <Text style={styles.subSectionTitle}>3.4 Business Transfers</Text>
            <Text style={styles.paragraph}>
              If TravalPass is involved in a merger, acquisition, or sale of assets, your information may
              be transferred. We will notify you of any such change.
            </Text>

            <Text style={styles.sectionTitle}>4. Data Retention</Text>
            <Text style={styles.paragraph}>
              We retain your information for as long as your account is active or as needed to provide
              services. After account deletion, we may retain certain information for legal compliance,
              fraud prevention, and legitimate business purposes for up to 7 years.
            </Text>

            <Text style={styles.sectionTitle}>5. Your Privacy Rights</Text>

            <Text style={styles.subSectionTitle}>5.1 GDPR Rights (European Users)</Text>
            <Text style={styles.paragraph}>
              If you are in the European Economic Area, you have the right to:{'\n'}
              • Access your personal data{'\n'}
              • Correct inaccurate data{'\n'}
              • Request deletion of your data{'\n'}
              • Object to processing of your data{'\n'}
              • Request data portability{'\n'}
              • Withdraw consent at any time{'\n'}
              • Lodge a complaint with your local data protection authority
            </Text>

            <Text style={styles.subSectionTitle}>5.2 CCPA Rights (California Residents)</Text>
            <Text style={styles.paragraph}>
              California residents have the right to:{'\n'}
              • Know what personal information we collect{'\n'}
              • Know whether we sell or disclose personal information{'\n'}
              • Opt-out of sale of personal information (we do not sell your data){'\n'}
              • Request deletion of personal information{'\n'}
              • Non-discrimination for exercising privacy rights
            </Text>

            <Text style={styles.subSectionTitle}>5.3 All Users</Text>
            <Text style={styles.paragraph}>
              You can:{'\n'}
              • Update your profile information anytime{'\n'}
              • Control notification settings{'\n'}
              • Delete your account (Profile → Delete Account){'\n'}
              • Request a copy of your data{'\n'}
            </Text>

            <Text style={styles.sectionTitle}>6. Mobile-Specific Privacy</Text>

            <Text style={styles.subSectionTitle}>6.1 Device Permissions</Text>
            <Text style={styles.paragraph}>
              Our app may request:{'\n'}
              • <Text style={styles.bold}>Camera/Photos:</Text> For profile pictures and video uploads
              {'\n'}
              • <Text style={styles.bold}>Contacts:</Text> To discover friends already using TravalPass
              and invite new users (optional){'\n'}
              • <Text style={styles.bold}>Location:</Text> For travel matching (optional){'\n'}
              • <Text style={styles.bold}>Notifications:</Text> For matches and messages (optional){'\n'}
              • <Text style={styles.bold}>Storage:</Text> For caching and offline functionality
            </Text>
            <Text style={styles.paragraph}>
              You can revoke these permissions in your device settings at any time.
            </Text>

            <Text style={styles.subSectionTitle}>6.2 Push Notifications</Text>
            <Text style={styles.paragraph}>
              We use Firebase Cloud Messaging to send push notifications. You can disable notifications
              in your device settings or within the app.
            </Text>

            <Text style={styles.subSectionTitle}>6.3 Contact Discovery Privacy</Text>
            <Text style={styles.paragraph}>
              When you enable contact discovery:{'\n\n'}
              <Text style={styles.bold}>What We Do:</Text>{'\n'}
              • We read your contacts (only with your explicit permission){'\n'}
              • We hash (one-way encrypt) phone numbers and emails using SHA-256{'\n'}
              • We compare hashed values against our user database to find matches{'\n'}
              • We show you which of your contacts are TravalPass users{'\n'}
              • We allow you to invite contacts who aren't yet on the platform{'\n\n'}
              <Text style={styles.bold}>What We DON'T Do:</Text>{'\n'}
              • We do NOT upload your raw contact data to our servers{'\n'}
              • We do NOT share your contacts with other users{'\n'}
              • We do NOT sell your contact data to third parties{'\n'}
              • We do NOT use your contacts for marketing purposes{'\n'}
              • We do NOT store your contacts permanently{'\n\n'}
              <Text style={styles.bold}>Your Rights:</Text>{'\n'}
              • You can disable contact discovery at any time{'\n'}
              • You can delete all stored contact hashes from app settings{'\n'}
              • You can revoke contact permission in device settings{'\n'}
              • Contact discovery is entirely optional - you can use TravalPass without it{'\n\n'}
              <Text style={styles.bold}>Data Retention:</Text>{'\n'}
              • Hashed contact data is automatically deleted after 24 hours{'\n'}
              • Sync history (when you synced, how many contacts) is kept for 90 days{'\n'}
              • Invitation records are kept for analytics purposes but don't include contact details
            </Text>

            <Text style={styles.sectionTitle}>7. Data Security</Text>
            <Text style={styles.paragraph}>
              We implement industry-standard security measures including:{'\n'}
              • Encryption in transit (TLS/SSL){'\n'}
              • Encryption at rest for sensitive data{'\n'}
              • Firebase Authentication security{'\n'}
              • Regular security audits{'\n'}
              • Access controls and authentication{'\n'}
              • Secure payment processing via Stripe
            </Text>
            <Text style={styles.paragraph}>
              However, no method of transmission over the internet is 100% secure. We cannot guarantee
              absolute security.
            </Text>

            <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
            <Text style={styles.paragraph}>
              TravalPass is not intended for users under 18. We do not knowingly collect information from
              children. If we discover we have collected information from a child, we will delete it
              immediately.
            </Text>

            <Text style={styles.sectionTitle}>9. International Data Transfers</Text>
            <Text style={styles.paragraph}>
              Your information may be transferred to and processed in countries other than your own. We
              ensure appropriate safeguards are in place, including Standard Contractual Clauses for EU
              data transfers.
            </Text>

            <Text style={styles.sectionTitle}>10. Cookies and Tracking (Web Platform)</Text>
            <Text style={styles.paragraph}>
              Our web platform uses:{'\n'}
              • <Text style={styles.bold}>Essential Cookies:</Text> Required for basic functionality{'\n'}
              • <Text style={styles.bold}>Analytics Cookies:</Text> To understand usage patterns{'\n'}
              • <Text style={styles.bold}>Preference Cookies:</Text> To remember your settings
            </Text>
            <Text style={styles.paragraph}>
              You can control cookies through your browser settings. See our Cookie Policy for details.
            </Text>

            <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
            <Text style={styles.paragraph}>
              We may update this Privacy Policy periodically. We will notify you of material changes via
              email or in-app notification. Continued use after changes constitutes acceptance.
            </Text>

            <Text style={styles.sectionTitle}>12. Contact Us</Text>
            <Text style={styles.paragraph}>
              For privacy-related questions or to exercise your rights:{'\n'}
              Email: feedback@travalpass.com
            </Text>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.acceptButton} onPress={onClose}>
                <Text style={styles.acceptButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width < 768 ? '90%' : '80%',
    maxWidth: 800,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  effectiveDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

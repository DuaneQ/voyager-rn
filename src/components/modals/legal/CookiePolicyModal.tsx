/**
 * CookiePolicyModal.tsx - Comprehensive Cookie and Data Usage Policy
 * Covers web cookies, mobile tracking, and data collection practices
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

interface CookiePolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CookiePolicyModal: React.FC<CookiePolicyModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Cookie & Data Usage Policy</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            <Text style={styles.effectiveDate}>Effective Date: January 18, 2026</Text>
            <Text style={styles.lastUpdated}>Last Updated: January 18, 2026</Text>

            <Text style={styles.paragraph}>
              This Cookie and Data Usage Policy explains how TravalPass uses cookies, mobile tracking
              technologies, and similar data collection methods across our web platform and mobile
              applications.
            </Text>

            <Text style={styles.sectionTitle}>1. What Are Cookies and Tracking Technologies?</Text>

            <Text style={styles.subSectionTitle}>1.1 Cookies (Web Platform)</Text>
            <Text style={styles.paragraph}>
              Cookies are small text files stored on your device by your web browser. They help us
              recognize your browser and capture certain information.
            </Text>

            <Text style={styles.subSectionTitle}>1.2 Mobile Tracking Technologies</Text>
            <Text style={styles.paragraph}>
              On mobile apps, we use:{'\n'}
              • <Text style={styles.bold}>Device Identifiers:</Text> Unique IDs assigned to your device
              {'\n'}
              • <Text style={styles.bold}>SDKs:</Text> Software development kits for analytics and
              functionality{'\n'}
              • <Text style={styles.bold}>Local Storage:</Text> Data stored directly on your device{'\n'}
              • <Text style={styles.bold}>App Analytics:</Text> Usage tracking within the app
            </Text>

            <Text style={styles.sectionTitle}>2. Types of Cookies and Technologies We Use</Text>

            <Text style={styles.subSectionTitle}>2.1 Essential Cookies/Technologies</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Purpose:</Text> Required for basic Platform functionality{'\n'}
              <Text style={styles.bold}>Examples:</Text>{'\n'}
              • Session management and authentication{'\n'}
              • Remembering login state{'\n'}
              • Security features{'\n'}
              • Load balancing{'\n'}
              <Text style={styles.bold}>Storage Duration:</Text> Session or up to 1 year{'\n'}
              <Text style={styles.bold}>Can be blocked:</Text> No (Platform won't work without them)
            </Text>

            <Text style={styles.subSectionTitle}>2.2 Functional Cookies/Technologies</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Purpose:</Text> Enhance functionality and personalization{'\n'}
              <Text style={styles.bold}>Examples:</Text>{'\n'}
              • Remembering your preferences{'\n'}
              • Language settings{'\n'}
              • Theme preferences{'\n'}
              • Form data retention{'\n'}
              <Text style={styles.bold}>Storage Duration:</Text> Up to 2 years{'\n'}
              <Text style={styles.bold}>Can be blocked:</Text> Yes (but affects user experience)
            </Text>

            <Text style={styles.subSectionTitle}>2.3 Analytics Cookies/Technologies</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Purpose:</Text> Understand how users interact with the Platform
              {'\n'}
              <Text style={styles.bold}>Examples:</Text>{'\n'}
              • Page views and navigation patterns{'\n'}
              • Feature usage statistics{'\n'}
              • Error tracking and crash reports{'\n'}
              • Performance monitoring{'\n'}
              <Text style={styles.bold}>Services Used:</Text> Firebase Analytics, Google Analytics{'\n'}
              <Text style={styles.bold}>Storage Duration:</Text> Up to 2 years{'\n'}
              <Text style={styles.bold}>Can be blocked:</Text> Yes
            </Text>

            <Text style={styles.subSectionTitle}>2.4 Advertising and Marketing Technologies</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Purpose:</Text> Deliver relevant advertising and measure campaign
              effectiveness{'\n'}
              <Text style={styles.bold}>Examples:</Text>{'\n'}
              • Track ad impressions{'\n'}
              • Measure conversion rates{'\n'}
              • Retargeting campaigns{'\n'}
              • Cross-device tracking{'\n'}
              <Text style={styles.bold}>Storage Duration:</Text> Up to 1 year{'\n'}
              <Text style={styles.bold}>Can be blocked:</Text> Yes
            </Text>

            <Text style={styles.sectionTitle}>3. Specific Technologies We Use</Text>

            <Text style={styles.subSectionTitle}>3.1 Web Platform</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Firebase Authentication:</Text> Session management{'\n'}
              • <Text style={styles.bold}>Firebase Analytics:</Text> Usage tracking{'\n'}
              • <Text style={styles.bold}>Google Analytics:</Text> Web analytics{'\n'}
              • <Text style={styles.bold}>Stripe:</Text> Payment processing cookies{'\n'}
              • <Text style={styles.bold}>Local Storage:</Text> Preference storage
            </Text>

            <Text style={styles.subSectionTitle}>3.2 Mobile Applications</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Firebase SDK:</Text> Analytics, auth, database, messaging{'\n'}
              • <Text style={styles.bold}>Expo Analytics:</Text> App performance monitoring{'\n'}
              • <Text style={styles.bold}>AsyncStorage:</Text> Local data persistence{'\n'}
              • <Text style={styles.bold}>Push Notification Tokens:</Text> For sending notifications{'\n'}
              • <Text style={styles.bold}>Crash Reporting:</Text> Automatic error reports
            </Text>

            <Text style={styles.sectionTitle}>4. Data Collected Through These Technologies</Text>
            <Text style={styles.paragraph}>
              We may collect:{'\n'}
              • Browser/app type and version{'\n'}
              • Device type, model, and OS{'\n'}
              • IP address (anonymized where possible){'\n'}
              • Pages visited and time spent{'\n'}
              • Click-through and navigation patterns{'\n'}
              • Search queries{'\n'}
              • Feature usage{'\n'}
              • App crashes and errors{'\n'}
              • Approximate location (if permitted){'\n'}
              • Referral source{'\n'}
              • Device language and timezone
            </Text>

            <Text style={styles.sectionTitle}>5. Why We Collect This Data</Text>

            <Text style={styles.subSectionTitle}>5.1 Essential Operations</Text>
            <Text style={styles.paragraph}>
              • Maintain and provide the Platform{'\n'}
              • Process transactions{'\n'}
              • Authenticate users{'\n'}
              • Prevent fraud and abuse{'\n'}
              • Ensure security
            </Text>

            <Text style={styles.subSectionTitle}>5.2 Improvement and Optimization</Text>
            <Text style={styles.paragraph}>
              • Analyze usage patterns{'\n'}
              • Identify and fix bugs{'\n'}
              • Improve features and performance{'\n'}
              • Conduct A/B testing{'\n'}
              • Optimize user experience
            </Text>

            <Text style={styles.subSectionTitle}>5.3 Personalization</Text>
            <Text style={styles.paragraph}>
              • Customize content and recommendations{'\n'}
              • Remember preferences{'\n'}
              • Provide relevant matches{'\n'}
              • Tailor notifications
            </Text>

            <Text style={styles.subSectionTitle}>5.4 Marketing and Communication</Text>
            <Text style={styles.paragraph}>
              • Send relevant updates{'\n'}
              • Measure campaign effectiveness{'\n'}
              • Understand conversion paths{'\n'}
              • Retarget interested users
            </Text>

            <Text style={styles.sectionTitle}>6. Third-Party Cookies and Technologies</Text>
            <Text style={styles.paragraph}>
              We work with third-party service providers who may use their own tracking technologies:
            </Text>

            <Text style={styles.subSectionTitle}>6.1 Service Providers</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Firebase/Google:</Text> Analytics, authentication, hosting{'\n'}
              • <Text style={styles.bold}>Stripe:</Text> Payment processing{'\n'}
              • <Text style={styles.bold}>OpenAI:</Text> AI services (no cookies, API-based){'\n'}
              • <Text style={styles.bold}>Cloud Storage Providers:</Text> Media hosting
            </Text>

            <Text style={styles.subSectionTitle}>6.2 Analytics Partners</Text>
            <Text style={styles.paragraph}>
              These partners help us understand Platform usage and may collect data across multiple
              websites/apps. See their privacy policies:{'\n'}
              • Google Analytics: policies.google.com/privacy{'\n'}
              • Firebase: firebase.google.com/support/privacy
            </Text>

            <Text style={styles.sectionTitle}>7. Your Choices and Controls</Text>

            <Text style={styles.subSectionTitle}>7.1 Web Browser Controls</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Cookie Settings:</Text>{'\n'}
              • Most browsers allow you to refuse cookies{'\n'}
              • You can delete existing cookies{'\n'}
              • Set browser to notify you when cookies are set{'\n'}
              • Use "Do Not Track" browser settings
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Note:</Text> Blocking essential cookies may prevent Platform
              functionality.
            </Text>

            <Text style={styles.subSectionTitle}>7.2 Mobile App Controls</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>iOS:</Text>{'\n'}
              • Settings → Privacy → Tracking → Disable "Allow Apps to Request to Track"{'\n'}
              • Settings → Privacy → Advertising → Reset Advertising Identifier
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Android:</Text>{'\n'}
              • Settings → Google → Ads → Opt out of Ads Personalization{'\n'}
              • Settings → Google → Ads → Reset advertising ID
            </Text>

            <Text style={styles.subSectionTitle}>7.3 In-App Controls</Text>
            <Text style={styles.paragraph}>
              Within TravalPass, you can:{'\n'}
              • Disable analytics in Settings{'\n'}
              • Turn off push notifications{'\n'}
              • Revoke location permissions{'\n'}
              • Clear cached data
            </Text>

            <Text style={styles.subSectionTitle}>7.4 Opt-Out Links</Text>
            <Text style={styles.paragraph}>
              • Google Analytics Opt-Out: tools.google.com/dlpage/gaoptout{'\n'}
              • Network Advertising Initiative: optout.networkadvertising.org{'\n'}
              • Digital Advertising Alliance: optout.aboutads.info
            </Text>

            <Text style={styles.sectionTitle}>8. Mobile-Specific Tracking</Text>

            <Text style={styles.subSectionTitle}>8.1 Device Permissions</Text>
            <Text style={styles.paragraph}>
              Our app requests device permissions for specific purposes. You can revoke these in your
              device settings:{'\n'}
              • <Text style={styles.bold}>Location:</Text> For travel matching (optional){'\n'}
              • <Text style={styles.bold}>Camera/Photos:</Text> For uploading profile content{'\n'}
              • <Text style={styles.bold}>Notifications:</Text> For alerts and messages{'\n'}
              • <Text style={styles.bold}>Storage:</Text> For caching
            </Text>

            <Text style={styles.subSectionTitle}>8.2 Push Notifications</Text>
            <Text style={styles.paragraph}>
              We use Firebase Cloud Messaging to send push notifications. Your device token is stored
              to deliver notifications. You can disable this in app settings or device settings.
            </Text>

            <Text style={styles.sectionTitle}>9. Data Retention</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Session Cookies:</Text> Deleted when you close browser{'\n'}
              • <Text style={styles.bold}>Persistent Cookies:</Text> Remain until expiration or manual
              deletion{'\n'}
              • <Text style={styles.bold}>Analytics Data:</Text> Retained for up to 26 months{'\n'}
              • <Text style={styles.bold}>Mobile Identifiers:</Text> Reset when you reset your
              advertising ID or reinstall the app
            </Text>

            <Text style={styles.sectionTitle}>10. International Users</Text>

            <Text style={styles.subSectionTitle}>10.1 GDPR Compliance (EU Users)</Text>
            <Text style={styles.paragraph}>
              If you're in the EU/EEA:{'\n'}
              • We obtain consent before non-essential cookies{'\n'}
              • You can withdraw consent at any time{'\n'}
              • You have right to access and deletion{'\n'}
              • We use legitimate interest for some analytics
            </Text>

            <Text style={styles.subSectionTitle}>10.2 CCPA Compliance (California)</Text>
            <Text style={styles.paragraph}>
              California residents:{'\n'}
              • We do not "sell" your personal information as defined by CCPA{'\n'}
              • You can opt-out of certain data sharing{'\n'}
              • See our Privacy Policy for full CCPA rights
            </Text>

            <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
            <Text style={styles.paragraph}>
              We may update this Cookie Policy periodically. We'll notify you of material changes via
              email or in-app notification. Check the "Last Updated" date at the top.
            </Text>

            <Text style={styles.sectionTitle}>12. Contact Us</Text>
            <Text style={styles.paragraph}>
              Questions about cookies or data collection?{'\n'}
              Email: feedback@travalpass.com{'\n'}
              Subject: Cookie Policy Inquiry
            </Text>

            <Text style={styles.paragraph}>
              For specific data requests (access, deletion):{'\n'}
              Email: feedback@travalpass.com{'\n'}
              Subject: Data Rights Request
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

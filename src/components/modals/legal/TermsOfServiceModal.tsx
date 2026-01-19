/**
 * TermsOfServiceModal.tsx - Comprehensive Terms of Service for TravalPass
 * Enhanced with mobile-specific terms and industry-standard legal language
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

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Terms of Service</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            <Text style={styles.effectiveDate}>Effective Date: January 18, 2026</Text>
            <Text style={styles.lastUpdated}>Last Updated: January 18, 2026</Text>

            <Text style={styles.paragraph}>
              Welcome to TravalPass. These Terms of Service ("Terms") govern your access to and use of
              the TravalPass mobile application and website (collectively, the "Platform"). By creating
              an account or using the Platform, you agree to be bound by these Terms.
            </Text>

            <Text style={styles.warningBox}>
              IMPORTANT: THESE TERMS CONTAIN A BINDING ARBITRATION CLAUSE AND CLASS ACTION WAIVER IN
              SECTION 15, WHICH AFFECT YOUR LEGAL RIGHTS.
            </Text>

            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
              By accessing or using TravalPass, you affirm that you:{'\n'}
              • Are at least 18 years of age{'\n'}
              • Have the legal capacity to enter into these Terms{'\n'}
              • Agree to comply with all applicable laws{'\n'}
              • Have read and understood our Privacy Policy and Safety Guidelines
            </Text>

            <Text style={styles.sectionTitle}>2. Description of Service</Text>
            <Text style={styles.paragraph}>
              TravalPass is a platform that connects travelers with compatible travel companions.
              We provide:{'\n'}
              • User profile creation and matching{'\n'}
              • Messaging between matched users{'\n'}
              • AI-powered itinerary generation (Premium feature){'\n'}
              • Travel planning tools{'\n'}
              • Video sharing capabilities
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>IMPORTANT DISCLAIMER:</Text> TravalPass serves solely as a
              connection service. We do not arrange, plan, or facilitate actual travel. All travel
              arrangements are the sole responsibility of users.
            </Text>

            <Text style={styles.sectionTitle}>3. User Accounts</Text>

            <Text style={styles.subSectionTitle}>3.1 Account Creation</Text>
            <Text style={styles.paragraph}>
              You may create an account using:{'\n'}
              • Email and password{'\n'}
              • Google Sign-In{'\n'}
              • Apple Sign-In
            </Text>
            <Text style={styles.paragraph}>
              You are responsible for maintaining the confidentiality of your account credentials and for
              all activities under your account.
            </Text>

            <Text style={styles.subSectionTitle}>3.2 Account Requirements</Text>
            <Text style={styles.paragraph}>
              You agree to:{'\n'}
              • Provide accurate, current, and complete information{'\n'}
              • Maintain and update your information{'\n'}
              • Not create multiple accounts{'\n'}
              • Not share your account with others{'\n'}
              • Not use another user's account{'\n'}
              • Notify us immediately of unauthorized access
            </Text>

            <Text style={styles.subSectionTitle}>3.3 Account Termination</Text>
            <Text style={styles.paragraph}>
              You may delete your account at any time through app settings. We reserve the right to
              suspend or terminate accounts that violate these Terms without prior notice or liability.
            </Text>

            <Text style={styles.sectionTitle}>4. User Conduct and Prohibited Activities</Text>
            <Text style={styles.paragraph}>
              You agree NOT to:{'\n'}
              • Harass, threaten, or harm other users{'\n'}
              • Post false, misleading, or fraudulent information{'\n'}
              • Impersonate any person or entity{'\n'}
              • Violate any laws or regulations{'\n'}
              • Infringe intellectual property rights{'\n'}
              • Transmit viruses or malicious code{'\n'}
              • Spam or solicit other users for commercial purposes{'\n'}
              • Scrape, crawl, or data mine the Platform{'\n'}
              • Attempt to gain unauthorized access to systems{'\n'}
              • Use the Platform for any illegal activity{'\n'}
              • Share inappropriate, explicit, or offensive content{'\n'}
              • Use automated systems (bots) to access the Platform
            </Text>

            <Text style={styles.sectionTitle}>5. Content and Intellectual Property</Text>

            <Text style={styles.subSectionTitle}>5.1 User Content</Text>
            <Text style={styles.paragraph}>
              You retain ownership of content you post (photos, videos, messages, itineraries).
              By posting content, you grant TravalPass a worldwide, non-exclusive, royalty-free license
              to use, display, reproduce, and distribute your content in connection with the Platform.
            </Text>

            <Text style={styles.subSectionTitle}>5.2 Content Responsibility</Text>
            <Text style={styles.paragraph}>
              You are solely responsible for your content and the consequences of posting it. You
              represent and warrant that:{'\n'}
              • You own or have necessary rights to your content{'\n'}
              • Your content does not violate any laws{'\n'}
              • Your content does not infringe third-party rights{'\n'}
              • Your content complies with these Terms
            </Text>

            <Text style={styles.subSectionTitle}>5.3 Platform Intellectual Property</Text>
            <Text style={styles.paragraph}>
              TravalPass and its logos, design, features, and functionality are owned by TravalPass, Inc.
              and protected by copyright, trademark, and other intellectual property laws. You may not
              copy, modify, or reverse engineer any part of the Platform.
            </Text>

            <Text style={styles.sectionTitle}>6. Subscription and Payment Terms</Text>

            <Text style={styles.subSectionTitle}>6.1 Free and Premium Features</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Free Tier:</Text> Limited matches per day, basic features{'\n'}
              • <Text style={styles.bold}>Premium Subscription:</Text> Unlimited matches,
              AI itinerary generation, advanced features
            </Text>

            <Text style={styles.subSectionTitle}>6.2 Billing</Text>
            <Text style={styles.paragraph}>
              Subscriptions are billed through:{'\n'}
              • iOS: Apple App Store{'\n'}
              • Android: Google Play Store{'\n'}
              • Web: Stripe payment processing
            </Text>
            <Text style={styles.paragraph}>
              Subscriptions automatically renew unless canceled at least 24 hours before the end of the
              current period. Refunds are handled according to Apple App Store, Google Play Store, or
              Stripe policies.
            </Text>

            <Text style={styles.subSectionTitle}>6.3 Price Changes</Text>
            <Text style={styles.paragraph}>
              We reserve the right to change subscription prices with 30 days' notice. Price changes
              will not affect existing subscriptions until renewal.
            </Text>

            <Text style={styles.sectionTitle}>7. Disclaimers and Limitation of Liability</Text>

            <Text style={styles.subSectionTitle}>7.1 No Endorsement or Guarantee</Text>
            <Text style={styles.paragraph}>
              TravalPass does NOT:{'\n'}
              • Endorse any user or their information{'\n'}
              • Guarantee the accuracy of user profiles{'\n'}
              • Verify user identities or backgrounds{'\n'}
              • Guarantee compatibility between users{'\n'}
              • Take responsibility for user conduct or safety
            </Text>

            <Text style={styles.subSectionTitle}>7.2 Use at Your Own Risk</Text>
            <Text style={styles.paragraph}>
              Any interactions, meetings, or travel arrangements between users are at your sole risk and
              discretion. You are responsible for:{'\n'}
              • Verifying the identity of other users{'\n'}
              • Assessing safety and compatibility{'\n'}
              • Making informed decisions about meetings{'\n'}
              • Taking appropriate safety precautions
            </Text>

            <Text style={styles.subSectionTitle}>7.3 "AS IS" Service</Text>
            <Text style={styles.paragraph}>
              THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS
              FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </Text>

            <Text style={styles.subSectionTitle}>7.4 Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRAVALPASS SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:{'\n'}
              • Personal injury or death{'\n'}
              • Property damage{'\n'}
              • Financial loss{'\n'}
              • Lost profits or business{'\n'}
              • Data loss{'\n'}
              • Emotional distress
            </Text>
            <Text style={styles.paragraph}>
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO TRAVALPASS IN THE PAST 12
              MONTHS, OR $100, WHICHEVER IS GREATER.
            </Text>

            <Text style={styles.sectionTitle}>8. Indemnification</Text>
            <Text style={styles.paragraph}>
              You agree to indemnify, defend, and hold harmless TravalPass, its officers, directors,
              employees, and agents from any claims, damages, losses, liabilities, and expenses
              (including attorney's fees) arising from:{'\n'}
              • Your use of the Platform{'\n'}
              • Your violation of these Terms{'\n'}
              • Your violation of any laws{'\n'}
              • Your content{'\n'}
              • Your interactions with other users
            </Text>

            <Text style={styles.sectionTitle}>9. Mobile Application Terms</Text>

            <Text style={styles.subSectionTitle}>9.1 License Grant</Text>
            <Text style={styles.paragraph}>
              Subject to these Terms, we grant you a limited, non-exclusive, non-transferable,
              revocable license to download and use the TravalPass mobile application on your personal
              device.
            </Text>

            <Text style={styles.subSectionTitle}>9.2 App Store Terms</Text>
            <Text style={styles.paragraph}>
              If you download our app from the Apple App Store or Google Play Store, you also agree to
              their respective terms of service. In case of conflict, these Terms prevail regarding use
              of TravalPass.
            </Text>

            <Text style={styles.subSectionTitle}>9.3 Updates and Changes</Text>
            <Text style={styles.paragraph}>
              We may release updates to the app at any time. You agree to accept such updates. We may
              discontinue the app or any features at our discretion without liability.
            </Text>

            <Text style={styles.sectionTitle}>10. Third-Party Services</Text>
            <Text style={styles.paragraph}>
              The Platform integrates with third-party services (Firebase, Stripe, OpenAI, etc.). We
              are not responsible for these services or their terms. Your use of third-party services is
              subject to their respective terms and privacy policies.
            </Text>

            <Text style={styles.sectionTitle}>11. Data and Privacy</Text>
            <Text style={styles.paragraph}>
              Our collection and use of personal information is governed by our Privacy Policy. By using
              TravalPass, you consent to such collection and use.
            </Text>

            <Text style={styles.sectionTitle}>12. Modifications to Terms</Text>
            <Text style={styles.paragraph}>
              We reserve the right to modify these Terms at any time. We will notify you of material
              changes via email or in-app notification. Continued use after changes constitutes
              acceptance of the modified Terms.
            </Text>

            <Text style={styles.sectionTitle}>13. Termination</Text>
            <Text style={styles.paragraph}>
              We may terminate or suspend your access immediately, without prior notice, for any reason,
              including breach of these Terms. Upon termination:{'\n'}
              • Your right to use the Platform ceases{'\n'}
              • Your account and data may be deleted{'\n'}
              • These Terms survive termination where applicable
            </Text>

            <Text style={styles.sectionTitle}>14. Governing Law</Text>
            <Text style={styles.paragraph}>
              These Terms are governed by the laws of the State of Delaware, United States, without
              regard to conflict of law principles. You consent to the exclusive jurisdiction of courts
              in Delaware for any disputes.
            </Text>

            <Text style={styles.sectionTitle}>15. Dispute Resolution and Arbitration</Text>

            <Text style={styles.subSectionTitle}>15.1 Mandatory Arbitration</Text>
            <Text style={styles.paragraph}>
              Any dispute arising from these Terms or the Platform shall be resolved through binding
              arbitration administered by the American Arbitration Association (AAA) under its Consumer
              Arbitration Rules, rather than in court.
            </Text>

            <Text style={styles.subSectionTitle}>15.2 Class Action Waiver</Text>
            <Text style={styles.paragraph}>
              YOU AND TRAVALPASS AGREE THAT DISPUTES WILL BE RESOLVED ONLY ON AN INDIVIDUAL BASIS AND
              NOT AS A CLASS ACTION, CONSOLIDATED PROCEEDING, OR REPRESENTATIVE ACTION.
            </Text>

            <Text style={styles.subSectionTitle}>15.3 Exceptions</Text>
            <Text style={styles.paragraph}>
              Either party may seek injunctive relief in court for intellectual property infringement or
              unauthorized access to the Platform.
            </Text>

            <Text style={styles.sectionTitle}>16. General Provisions</Text>

            <Text style={styles.subSectionTitle}>16.1 Entire Agreement</Text>
            <Text style={styles.paragraph}>
              These Terms, along with our Privacy Policy and Safety Guidelines, constitute the entire
              agreement between you and TravalPass.
            </Text>

            <Text style={styles.subSectionTitle}>16.2 Severability</Text>
            <Text style={styles.paragraph}>
              If any provision is found unenforceable, the remaining provisions remain in full effect.
            </Text>

            <Text style={styles.subSectionTitle}>16.3 Waiver</Text>
            <Text style={styles.paragraph}>
              Our failure to enforce any right or provision does not constitute a waiver of that right
              or provision.
            </Text>

            <Text style={styles.subSectionTitle}>16.4 Assignment</Text>
            <Text style={styles.paragraph}>
              You may not assign these Terms without our consent. We may assign these Terms without
              restriction.
            </Text>

            <Text style={styles.sectionTitle}>17. Contact Information</Text>
            <Text style={styles.paragraph}>
              For questions about these Terms:{'\n'}
              Email: feedback@travalpass.com
            </Text>

            <Text style={styles.paragraph}>
              By using TravalPass, you acknowledge that you have read, understood, and agree to be bound
              by these Terms of Service.
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
  warningBox: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    lineHeight: 20,
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

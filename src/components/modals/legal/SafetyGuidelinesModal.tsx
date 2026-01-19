/**
 * SafetyGuidelinesModal.tsx - Comprehensive Safety Guidelines for TravalPass Users
 * Enhanced with detailed safety recommendations for meeting travel companions
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

interface SafetyGuidelinesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SafetyGuidelinesModal: React.FC<SafetyGuidelinesModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Safety Guidelines</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            <Text style={styles.effectiveDate}>Last Updated: January 18, 2026</Text>

            <Text style={styles.paragraph}>
              Your safety is our top priority. TravalPass connects you with potential travel companions,
              but YOU are responsible for your safety when interacting with others. Please read and
              follow these guidelines carefully.
            </Text>

            <Text style={styles.warningBox}>
              ⚠️ IMPORTANT: TravalPass does NOT verify user identities, conduct background checks, or
              guarantee the safety of any user. Always exercise caution and trust your instincts.
            </Text>

            <Text style={styles.sectionTitle}>1. Before Meeting in Person</Text>

            <Text style={styles.subSectionTitle}>1.1 Get to Know Your Match</Text>
            <Text style={styles.paragraph}>
              • Communicate extensively through the app before meeting{'\n'}
              • Video chat to verify identity{'\n'}
              • Ask detailed questions about travel plans{'\n'}
              • Look for inconsistencies in their story{'\n'}
              • Check if they have reviews or connections from other users{'\n'}
              • Trust your gut – if something feels off, it probably is
            </Text>

            <Text style={styles.subSectionTitle}>1.2 Verify Identity</Text>
            <Text style={styles.paragraph}>
              • Request a video call before meeting{'\n'}
              • Ask for social media profiles (LinkedIn, Instagram){'\n'}
              • Search their name online{'\n'}
              • Verify their travel itinerary details{'\n'}
              • Be cautious if they avoid providing verification
            </Text>

            <Text style={styles.subSectionTitle}>1.3 Share Information Safely</Text>
            <Text style={styles.paragraph}>
              • Do NOT share:{'\n'}
              &nbsp;&nbsp;- Your home address{'\n'}
              &nbsp;&nbsp;- Financial information{'\n'}
              &nbsp;&nbsp;- Passport or ID numbers{'\n'}
              &nbsp;&nbsp;- Hotel room numbers{'\n'}
              &nbsp;&nbsp;- Daily routines or travel schedule details{'\n'}
              • Keep communication in the app until you're comfortable
            </Text>

            <Text style={styles.sectionTitle}>2. First Meeting Safety</Text>

            <Text style={styles.subSectionTitle}>2.1 Meet in Public Places</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>ALWAYS</Text> meet in busy, public locations{'\n'}
              • Good options: Hotel lobbies, cafes, tourist attractions{'\n'}
              • Avoid: Private residences, isolated areas, hotels rooms{'\n'}
              • Choose well-lit, populated areas{'\n'}
              • Stay in public for the entire first meeting
            </Text>

            <Text style={styles.subSectionTitle}>2.2 Tell Someone Your Plans</Text>
            <Text style={styles.paragraph}>
              • Inform a trusted friend or family member:{'\n'}
              &nbsp;&nbsp;- Who you're meeting{'\n'}
              &nbsp;&nbsp;- Where you're meeting{'\n'}
              &nbsp;&nbsp;- When you'll be back{'\n'}
              • Share your match's profile details{'\n'}
              • Set up check-in times{'\n'}
              • Have a "safety call" code word{'\n'}
              • Share your live location with trusted contacts
            </Text>

            <Text style={styles.subSectionTitle}>2.3 Transportation Safety</Text>
            <Text style={styles.paragraph}>
              • Arrange your own transportation{'\n'}
              • Do NOT accept rides from your match initially{'\n'}
              • Keep your departure method independent{'\n'}
              • Have an exit plan and money for transportation{'\n'}
              • Download offline maps of the area
            </Text>

            <Text style={styles.subSectionTitle}>2.4 Stay Sober and Alert</Text>
            <Text style={styles.paragraph}>
              • Limit alcohol consumption{'\n'}
              • Never leave your drink unattended{'\n'}
              • Do NOT accept drinks you didn't see prepared{'\n'}
              • Stay alert to your surroundings{'\n'}
              • Trust your judgment
            </Text>

            <Text style={styles.sectionTitle}>3. During Travel Together</Text>

            <Text style={styles.subSectionTitle}>3.1 Accommodation Safety</Text>
            <Text style={styles.paragraph}>
              • Book separate rooms, at least initially{'\n'}
              • Verify hotel security measures{'\n'}
              • Use door locks and security features{'\n'}
              • Keep valuables in hotel safe{'\n'}
              • Never share room keys{'\n'}
              • Inform hotel staff of your travel companion
            </Text>

            <Text style={styles.subSectionTitle}>3.2 Financial Safety</Text>
            <Text style={styles.paragraph}>
              • Never lend or borrow large sums of money{'\n'}
              • Keep finances separate{'\n'}
              • Split expenses using the app or traceable methods{'\n'}
              • Be wary of sob stories or requests for money{'\n'}
              • Never share bank account or credit card details{'\n'}
              • Report financial scams immediately
            </Text>

            <Text style={styles.subSectionTitle}>3.3 Health and Emergency Preparedness</Text>
            <Text style={styles.paragraph}>
              • Share emergency contact information{'\n'}
              • Know local emergency numbers{'\n'}
              • Have travel insurance{'\n'}
              • Carry necessary medications{'\n'}
              • Register with your embassy (international travel){'\n'}
              • Keep copies of important documents
            </Text>

            <Text style={styles.sectionTitle}>4. Red Flags – When to Walk Away</Text>
            <Text style={styles.paragraph}>
              Immediately disengage if your match:{'\n'}
              • Refuses to video chat or verify identity{'\n'}
              • Pressures you to meet in private locations{'\n'}
              • Asks for money or financial help{'\n'}
              • Becomes aggressive or threatening{'\n'}
              • Shows controlling behavior{'\n'}
              • Makes you uncomfortable in any way{'\n'}
              • Has inconsistent stories{'\n'}
              • Wants to move off the platform immediately{'\n'}
              • Pressures you to share personal information{'\n'}
              • Shows signs of substance abuse{'\n'}
              • Makes inappropriate sexual advances{'\n'}
              • Disrespects your boundaries
            </Text>

            <Text style={styles.sectionTitle}>5. Scams and Fraud Prevention</Text>

            <Text style={styles.subSectionTitle}>5.1 Common Travel Scams</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Romance Scams:</Text> Someone builds emotional connection then
              asks for money{'\n'}
              • <Text style={styles.bold}>Stranded Traveler Scam:</Text> Claims emergency and needs
              financial help{'\n'}
              • <Text style={styles.bold}>Fake Accommodation:</Text> Offers "cheap" lodging that doesn't
              exist{'\n'}
              • <Text style={styles.bold}>Phishing:</Text> Requests login credentials or personal info
              {'\n'}
              • <Text style={styles.bold}>Identity Theft:</Text> Asks for passport/ID photos
            </Text>

            <Text style={styles.subSectionTitle}>5.2 Protect Yourself</Text>
            <Text style={styles.paragraph}>
              • Never send money to someone you haven't met{'\n'}
              • Verify accommodation independently{'\n'}
              • Use secure payment methods{'\n'}
              • Keep your passport secure{'\n'}
              • Report suspicious behavior immediately
            </Text>

            <Text style={styles.sectionTitle}>6. International Travel Considerations</Text>
            <Text style={styles.paragraph}>
              • Research local laws and customs{'\n'}
              • Know LGBTQ+ rights in destination{'\n'}
              • Understand women's safety in destination{'\n'}
              • Register with your embassy{'\n'}
              • Have copies of passport and visa{'\n'}
              • Know how to contact local authorities{'\n'}
              • Purchase comprehensive travel insurance{'\n'}
              • Understand local emergency services
            </Text>

            <Text style={styles.sectionTitle}>7. Solo Traveler Specific Safety</Text>
            <Text style={styles.paragraph}>
              • Meet in extremely public places{'\n'}
              • Always have an exit strategy{'\n'}
              • Book your own verified accommodation{'\n'}
              • Keep emergency cash hidden{'\n'}
              • Use hotel safes for valuables{'\n'}
              • Maintain regular contact with home{'\n'}
              • Trust local advice about unsafe areas{'\n'}
              • Consider joining group tours initially
            </Text>

            <Text style={styles.sectionTitle}>8. Digital Safety</Text>

            <Text style={styles.subSectionTitle}>8.1 Protect Your Account</Text>
            <Text style={styles.paragraph}>
              • Use a strong, unique password{'\n'}
              • Use secure authentication methods (Google Sign-In or Apple Sign-In){'\n'}
              • Don't share your login credentials{'\n'}
              • Log out on shared devices{'\n'}
              • Report suspicious messages immediately
            </Text>

            <Text style={styles.subSectionTitle}>8.2 Privacy Protection</Text>
            <Text style={styles.paragraph}>
              • Review your privacy settings{'\n'}
              • Control what information is visible{'\n'}
              • Don't share identifiable landmarks in photos{'\n'}
              • Be cautious with location sharing{'\n'}
              • Review app permissions regularly
            </Text>

            <Text style={styles.sectionTitle}>9. Reporting and Blocking</Text>

            <Text style={styles.subSectionTitle}>9.1 When to Report</Text>
            <Text style={styles.paragraph}>
              Report users who:{'\n'}
              • Harass or threaten you{'\n'}
              • Share inappropriate content{'\n'}
              • Request money{'\n'}
              • Use fake profiles{'\n'}
              • Violate Terms of Service{'\n'}
              • Engage in scams or fraud
            </Text>

            <Text style={styles.subSectionTitle}>9.2 How to Report</Text>
            <Text style={styles.paragraph}>
              • Use the in-app report feature{'\n'}
              • Block users immediately if uncomfortable{'\n'}
              • Contact us at support@travalpass.com{'\n'}
              • Provide screenshots and details{'\n'}
              • Report to local authorities if necessary
            </Text>

            <Text style={styles.sectionTitle}>10. Emergency Resources</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>US Emergency:</Text> 911{'\n'}
              • <Text style={styles.bold}>International Emergency:</Text> 112 (most countries){'\n'}
              • <Text style={styles.bold}>US Embassy:</Text> Find nearest at usembassy.gov{'\n'}
              • <Text style={styles.bold}>TravalPass:</Text> feedback@travalpass.com{'\n'}
              • <Text style={styles.bold}>National Domestic Violence Hotline:</Text> 1-800-799-7233
            </Text>

            <Text style={styles.sectionTitle}>11. TravalPass Safety Features</Text>
            <Text style={styles.paragraph}>
              • In-app messaging to maintain privacy{'\n'}
              • Block and report features{'\n'}
              • Safety tips and reminders{'\n'}
              • 24/7 safety support email
            </Text>

            <Text style={styles.sectionTitle}>12. Trust Your Instincts</Text>
            <Text style={styles.paragraph}>
              The most important safety tool is your intuition. If something doesn't feel right:{'\n'}
              • Trust your gut{'\n'}
              • Don't worry about being rude{'\n'}
              • End the interaction{'\n'}
              • Report concerns{'\n'}
              • Seek help if needed
            </Text>

            <Text style={styles.warningBox}>
              Remember: No trip, adventure, or connection is worth compromising your safety.
              Your well-being is always the top priority.
            </Text>

            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Need Help?</Text>{'\n'}
              Email: support@travalpass.com{'\n'}
              Emergency: Contact local authorities first, then notify us
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

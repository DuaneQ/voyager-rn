import React, { useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { MatchedContactCard } from '../components/contacts/MatchedContactCard';
import { InviteContactCard, ContactToInvite } from '../components/contacts/InviteContactCard';
import { MatchedContact } from '../services/contacts/types';
import { ContactDiscoveryRepository, InviteMethodType } from '../repositories/contacts/ContactDiscoveryRepository';
import { HashingService } from '../services/contacts/HashingService';

export interface DiscoveryResultsPageProps {
  matchedContacts: MatchedContact[];
  contactsToInvite: ContactToInvite[];
}

type DiscoveryResultsRouteProp = RouteProp<{
  DiscoveryResults: DiscoveryResultsPageProps;
}, 'DiscoveryResults'>;

interface SectionData {
  title: string;
  data: Array<MatchedContact | ContactToInvite>;
  type: 'matched' | 'invite';
}

export const DiscoveryResultsPage: React.FC = () => {
  const route = useRoute<DiscoveryResultsRouteProp>();
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const {
    matchedContacts = [],
    contactsToInvite = [],
  } = route.params || {};
  
  const contactDiscoveryRepo = new ContactDiscoveryRepository();
  const hashingService = new HashingService();
  const [connectingUsers, setConnectingUsers] = useState<Set<string>>(new Set());
  const [invitingContacts, setInvitingContacts] = useState<Set<string>>(new Set());
  const [invitingAll, setInvitingAll] = useState(false);

  /**
   * Handle Connect button - create connection with matched user
   */
  const handleConnect = async (userId: string) => {
    if (!user) return;
    
    setConnectingUsers(prev => new Set(prev).add(userId));
    try {
      // TODO: Implement connection creation in Firestore
      showAlert('success', 'Connection request sent!');
      console.log('[DiscoveryResultsPage] Connect with user:', userId);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to connect');
      showAlert('error', `Failed to connect: ${err.message}`);
    } finally {
      setConnectingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  /**
   * Handle Invite button - send SMS/email with referral link
   */
  const handleInvite = async (contact: ContactToInvite) => {
    if (!user) return;
    
    setInvitingContacts(prev => new Set(prev).add(contact.id));
    try {
      // Call sendContactInvite Cloud Function
      const hash = contact.type === 'phone'
        ? await hashingService.hashPhoneNumber(contact.contactInfo)
        : await hashingService.hashEmail(contact.contactInfo);
      
      const result = await contactDiscoveryRepo.sendInvite(hash, 'sms');
      
      // Open native SMS/Email with invite link
      const message = `Hey ${contact.name}! Join me on TravalPass to find travel buddies: ${result.inviteLink}`;
      
      if (contact.type === 'phone') {
        const smsUrl = Platform.OS === 'ios'
          ? `sms:${contact.contactInfo}&body=${encodeURIComponent(message)}`
          : `sms:${contact.contactInfo}?body=${encodeURIComponent(message)}`;
        await Linking.openURL(smsUrl);
      } else {
        const emailUrl = `mailto:${contact.contactInfo}?subject=${encodeURIComponent('Join me on TravalPass!')}&body=${encodeURIComponent(message)}`;
        await Linking.openURL(emailUrl);
      }
      
      showAlert('success', 'Invite sent!');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to send invite');
      console.error('============================================');
      console.error('[DiscoveryResultsPage] Invite failed');
      console.error('Contact:', contact.name);
      console.error('Error:', err.message);
      console.error('============================================');
      showAlert('error', `Failed to send invite: ${err.message}`);
    } finally {
      setInvitingContacts(prev => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
    }
  };

  /**
   * Handle Invite All button
   * Creates invite records and opens SMS for each contact sequentially
   */
  const handleInviteAll = async () => {
    if (!user?.uid || contactsToInvite.length === 0) return;

    // Show confirmation with explanation using Alert.alert
    Alert.alert(
      'Invite All Friends',
      `You'll send ${contactsToInvite.length} invites. Your SMS app will open for each contact - just tap Send for each message!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: async () => {
            setInvitingAll(true);
            let successCount = 0;
            let failCount = 0;

            try {
              // Process each contact sequentially
              for (const contact of contactsToInvite) {
                try {
                  // Hash the contact identifier
                  const hash = contact.type === 'phone'
                    ? await hashingService.hashPhoneNumber(contact.contactInfo)
                    : await hashingService.hashEmail(contact.contactInfo);
                  
                  // Create invite record and get invite link
                  const result = await contactDiscoveryRepo.sendInvite(hash, 'sms', contact.name);

                  if (result.success && result.inviteLink) {
                    // Build SMS message
                    const message = `Hey ${contact.name}! Join me on TravalPass to find travel buddies: ${result.inviteLink}`;
                    const encodedMessage = encodeURIComponent(message);
                    const smsUrl = Platform.select({
                      ios: `sms:${contact.contactInfo}&body=${encodedMessage}`,
                      android: `sms:${contact.contactInfo}?body=${encodedMessage}`,
                      default: `sms:${contact.contactInfo}?body=${encodedMessage}`,
                    });

                    // Open SMS app (non-blocking)
                    await Linking.openURL(smsUrl!);
                    successCount++;

                    // Small delay between opening SMS composers
                    await new Promise(resolve => setTimeout(resolve, 500));
                  } else {
                    failCount++;
                  }
                } catch (error) {
                  console.error(`[DiscoveryResultsPage] Failed to invite ${contact.name}:`, error);
                  failCount++;
                }
              }

              // Show final result
              if (successCount > 0) {
                showAlert(
                  'success',
                  `Prepared ${successCount} invite${successCount > 1 ? 's' : ''}! ${failCount > 0 ? `(${failCount} failed)` : ''}`
                );
              } else {
                showAlert('error', 'Failed to send invites. Please try again.');
              }
            } catch (error) {
              console.error('[DiscoveryResultsPage] Invite all error:', error);
              showAlert('error', 'Failed to send invites. Please try again.');
            } finally {
              setInvitingAll(false);
            }
          }
        },
      ]
    );
  };

  // Build sections for SectionList
  const sections: SectionData[] = [];

  if (matchedContacts.length > 0) {
    sections.push({
      title: `👥 On TravalPass (${matchedContacts.length})`,
      data: matchedContacts,
      type: 'matched',
    });
  }

  if (contactsToInvite.length > 0) {
    sections.push({
      title: `📨 Invite Friends (${contactsToInvite.length})`,
      data: contactsToInvite,
      type: 'invite',
    });
  }

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionDivider} />
    </View>
  );

  const renderItem = ({ item, section }: { item: MatchedContact | ContactToInvite; section: SectionData }) => {
    if (section.type === 'matched') {
      const contact = item as MatchedContact;
      return (
        <MatchedContactCard
          contact={contact}
          onConnect={() => handleConnect(contact.userId)}
          isConnecting={connectingUsers.has(contact.userId)}
        />
      );
    } else {
      const contact = item as ContactToInvite;
      return (
        <InviteContactCard
          contact={contact}
          onInvite={() => handleInvite(contact)}
          isInviting={invitingContacts.has(contact.id)}
        />
      );
    }
  };

  const renderListFooter = () => {
    if (contactsToInvite.length === 0) return null;

    return (
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.inviteAllButton, invitingAll && styles.inviteAllButtonDisabled]}
          onPress={handleInviteAll}
          activeOpacity={0.8}
          disabled={invitingAll}
        >
          {invitingAll ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.inviteAllButtonText}>Invite All Friends</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>No Results</Text>
      <Text style={styles.emptyText}>
        We couldn't find any of your contacts on TravalPass yet.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends Found</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Results List */}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => 
          'userId' in item ? item.userId : item.id
        }
        ListEmptyComponent={renderListEmpty}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 24,
    color: '#1976D2',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  footer: {
    padding: 16,
    marginTop: 8,
  },
  inviteAllButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 3,
  },
  inviteAllButtonDisabled: {
    backgroundColor: '#B0BEC5',
    opacity: 0.6,
  },
  inviteAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

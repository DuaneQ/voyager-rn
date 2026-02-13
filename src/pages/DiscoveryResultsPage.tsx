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
  TextInput,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  /**
   * Handle Connect button - create connection with matched user
   */
  const handleConnect = async (userId: string) => {
    if (!user) return;
    
    setConnectingUsers(prev => new Set(prev).add(userId));
    try {
      // TODO: Implement connection creation in Firestore
      showAlert('success', 'Connection request sent!');
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
        const smsUrl = `sms:${contact.contactInfo}?body=${encodeURIComponent(message)}`;
        
        // Check if device can open SMS (fails on iOS Simulator)
        const canOpen = await Linking.canOpenURL(smsUrl);
        if (!canOpen) {
          // Invite created on backend, but can't open SMS (likely simulator)
          console.warn('[DiscoveryResultsPage] SMS not supported (simulator?), but invite created');
          showAlert('warning', 'Invite created! (SMS not available on simulator)');
          return;
        }
        
        await Linking.openURL(smsUrl);
      } else {
        const emailUrl = `mailto:${contact.contactInfo}?subject=${encodeURIComponent('Join me on TravalPass!')}&body=${encodeURIComponent(message)}`;
        
        const canOpen = await Linking.canOpenURL(emailUrl);
        if (!canOpen) {
          console.warn('[DiscoveryResultsPage] Email not supported, but invite created');
          showAlert('warning', 'Invite created! (Email app not configured)');
          return;
        }
        
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
   * Opens ONE SMS composer with all contacts in the "To:" field
   */
  const handleInviteAll = async () => {
    if (!user?.uid || contactsToInvite.length === 0) return;

    // Filter to phone contacts only (can't batch emails in mailto:)
    const phoneContacts = contactsToInvite.filter(c => c.type === 'phone');
    
    if (phoneContacts.length === 0) {
      showAlert('info', 'No phone contacts to invite. Try individual email invites instead.');
      return;
    }

    // Show confirmation
    Alert.alert(
      'Invite All Friends',
      `Open Messages with all ${phoneContacts.length} contacts pre-filled? You'll just need to tap Send once!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Messages', 
          onPress: async () => {
            setInvitingAll(true);

            try {
              // Create ONE invite record to get the invite link
              // (All contacts will share the same link since it points to landing page)
              const firstContact = phoneContacts[0];
              const hash = await hashingService.hashPhoneNumber(firstContact.contactInfo);
              const result = await contactDiscoveryRepo.sendInvite(hash, 'sms', 'multiple contacts');

              if (result.success && result.inviteLink) {
                // Build SMS with ALL phone numbers comma-separated
                const phoneNumbers = phoneContacts.map(c => c.contactInfo).join(',');
                const message = `Hey! Join me on TravalPass to find travel buddies: ${result.inviteLink}`;
                const smsUrl = `sms:${phoneNumbers}?body=${encodeURIComponent(message)}`;

                // Check if device can open SMS
                const canOpen = await Linking.canOpenURL(smsUrl);
                if (!canOpen) {
                  showAlert('error', 'SMS not available (simulator does not support SMS)');
                  return;
                }

                // Open ONE SMS composer with all contacts
                await Linking.openURL(smsUrl);
                showAlert('success', `Messages opened with ${phoneContacts.length} contacts!`);
              } else {
                showAlert('error', 'Failed to create invite link. Please try again.');
              }
            } catch (error) {
              console.error('[DiscoveryResultsPage] Invite all error:', error);
              const err = error instanceof Error ? error : new Error('Unknown error');
              showAlert('error', `Failed to open Messages: ${err.message}`);
            } finally {
              setInvitingAll(false);
            }
          }
        },
      ]
    );
  };

  /**
   * Handle checkbox toggle for individual contact
   */
  const handleToggleSelect = (contact: ContactToInvite) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(contact.id)) {
        next.delete(contact.id);
      } else {
        next.add(contact.id);
      }
      return next;
    });
  };

  /**
   * Select all filtered contacts
   */
  const handleSelectAll = () => {
    const allIds = new Set(filteredContactsToInvite.map(c => c.id));
    setSelectedContactIds(allIds);
  };

  /**
   * Deselect all contacts
   */
  const handleDeselectAll = () => {
    setSelectedContactIds(new Set());
  };

  /**
   * Invite selected contacts (opens ONE SMS with selected phone contacts)
   */
  const handleInviteSelected = async () => {
    if (!user?.uid || selectedContactIds.size === 0) return;

    const selectedContacts = contactsToInvite.filter(c => selectedContactIds.has(c.id));
    const phoneContacts = selectedContacts.filter(c => c.type === 'phone');
    
    if (phoneContacts.length === 0) {
      showAlert('info', 'No phone contacts selected. Try individual email invites instead.');
      return;
    }

    // Show confirmation
    Alert.alert(
      'Invite Selected Friends',
      `Open Messages with ${phoneContacts.length} selected contact${phoneContacts.length > 1 ? 's' : ''} pre-filled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Messages', 
          onPress: async () => {
            setInvitingAll(true);

            try {
              // Create ONE invite record to get the invite link
              const firstContact = phoneContacts[0];
              const hash = await hashingService.hashPhoneNumber(firstContact.contactInfo);
              const result = await contactDiscoveryRepo.sendInvite(hash, 'sms', `${phoneContacts.length} selected contacts`);

              if (result.success && result.inviteLink) {
                // Build SMS with selected phone numbers comma-separated
                const phoneNumbers = phoneContacts.map(c => c.contactInfo).join(',');
                const message = `Hey! Join me on TravalPass to find travel buddies: ${result.inviteLink}`;
                const smsUrl = `sms:${phoneNumbers}?body=${encodeURIComponent(message)}`;

                // Check if device can open SMS
                const canOpen = await Linking.canOpenURL(smsUrl);
                if (!canOpen) {
                  showAlert('error', 'SMS not available (simulator does not support SMS)');
                  return;
                }

                // Open SMS and clear selections
                await Linking.openURL(smsUrl);
                setSelectedContactIds(new Set());
                showAlert('success', `Messages opened with ${phoneContacts.length} contacts!`);
              } else {
                showAlert('error', 'Failed to create invite link. Please try again.');
              }
            } catch (error) {
              console.error('[DiscoveryResultsPage] Invite selected error:', error);
              const err = error instanceof Error ? error : new Error('Unknown error');
              showAlert('error', `Failed to open Messages: ${err.message}`);
            } finally {
              setInvitingAll(false);
            }
          }
        },
      ]
    );
  };

  // Filter contacts based on search query
  const filteredContactsToInvite = searchQuery.trim()
    ? contactsToInvite.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contactsToInvite;

  // Build sections for SectionList
  const sections: SectionData[] = [];

  if (matchedContacts.length > 0) {
    sections.push({
      title: `👥 On TravalPass (${matchedContacts.length})`,
      data: matchedContacts,
      type: 'matched',
    });
  }

  if (filteredContactsToInvite.length > 0) {
    sections.push({
      title: `📨 Invite Friends (${filteredContactsToInvite.length})`,
      data: filteredContactsToInvite,
      type: 'invite',
    });
  }

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderTop}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.type === 'invite' && filteredContactsToInvite.length > 0 && (
          <View style={styles.selectionControls}>
            <TouchableOpacity onPress={handleSelectAll} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>Select All</Text>
            </TouchableOpacity>
            {selectedContactIds.size > 0 && (
              <TouchableOpacity onPress={handleDeselectAll} style={styles.selectionButton}>
                <Text style={styles.selectionButtonText}>Clear ({selectedContactIds.size})</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <View style={styles.sectionDivider} />
    </View>
  );

  const renderItem = ({ item, section }: { item: MatchedContact | ContactToInvite; section: SectionData }) => {
    if (section.type === 'matched') {
      const contact = item as MatchedContact;
      return (
        <MatchedContactCard
          contact={contact}
          // onConnect disabled until connection functionality is implemented
          // onConnect={() => handleConnect(contact.userId)}
          // isConnecting={connectingUsers.has(contact.userId)}
        />
      );
    } else {
      const contact = item as ContactToInvite;
      return (
        <InviteContactCard
          contact={contact}
          onInvite={() => handleInvite(contact)}
          isInviting={invitingContacts.has(contact.id)}
          isSelected={selectedContactIds.has(contact.id)}
          onToggleSelect={handleToggleSelect}
        />
      );
    }
  };

  const renderListFooter = () => {
    if (contactsToInvite.length === 0) return null;

    return (
      <View style={styles.footer}>
        {/* Invite All Button */}
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

      {/* Search Bar - only show if there are contacts to invite */}
      {contactsToInvite.length > 0 && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts to invite..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {searchQuery.trim() && filteredContactsToInvite.length === 0 && (
            <Text style={styles.noResultsText}>
              No contacts found matching "{searchQuery}"
            </Text>
          )}
        </View>
      )}

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

      {/* Floating Action Button - appears when contacts are selected */}
      {selectedContactIds.size > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleInviteSelected}
          activeOpacity={0.8}
          disabled={invitingAll}
        >
          {invitingAll ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.fabIcon}>📤</Text>
              <Text style={styles.fabText}>Invite ({selectedContactIds.size})</Text>
            </>
          )}
        </TouchableOpacity>
      )}
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
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '300',
  },
  noResultsText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
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
  sectionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  selectionControls: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  selectionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
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
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: '#43A047',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 8,
    zIndex: 1000,
  },
  fabIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

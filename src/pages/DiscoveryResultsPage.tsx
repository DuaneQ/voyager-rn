import React, { useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MatchedContactCard } from '../components/contacts/MatchedContactCard';
import { InviteContactCard, ContactToInvite } from '../components/contacts/InviteContactCard';
import { MatchedContact } from '../repositories/contacts/ContactDiscoveryRepository';

export interface DiscoveryResultsPageProps {
  matchedContacts: MatchedContact[];
  contactsToInvite: ContactToInvite[];
  onConnect: (userId: string) => void;
  onInvite: (contact: ContactToInvite) => void;
  onInviteAll: () => void;
  onBack: () => void;
}

interface SectionData {
  title: string;
  data: Array<MatchedContact | ContactToInvite>;
  type: 'matched' | 'invite';
}

export const DiscoveryResultsPage: React.FC<DiscoveryResultsPageProps> = ({
  matchedContacts,
  contactsToInvite,
  onConnect,
  onInvite,
  onInviteAll,
  onBack,
}) => {
  const [connectingUsers, setConnectingUsers] = useState<Set<string>>(new Set());
  const [invitingContacts, setInvitingContacts] = useState<Set<string>>(new Set());

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

  const handleConnect = async (userId: string) => {
    setConnectingUsers(prev => new Set(prev).add(userId));
    try {
      await onConnect(userId);
    } finally {
      setConnectingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleInvite = async (contact: ContactToInvite) => {
    setInvitingContacts(prev => new Set(prev).add(contact.id));
    try {
      await onInvite(contact);
    } finally {
      setInvitingContacts(prev => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
    }
  };

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
          onConnect={handleConnect}
          isConnecting={connectingUsers.has(contact.userId)}
        />
      );
    } else {
      const contact = item as ContactToInvite;
      return (
        <InviteContactCard
          contact={contact}
          onInvite={handleInvite}
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
          style={styles.inviteAllButton}
          onPress={onInviteAll}
          activeOpacity={0.8}
        >
          <Text style={styles.inviteAllButtonText}>Invite All Friends</Text>
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
          onPress={onBack}
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

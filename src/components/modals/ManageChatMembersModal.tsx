/**
 * ManageChatMembersModal.tsx
 * 
 * Modal for managing group chat members.
 * Displays member list with addedBy metadata and permission-based controls.
 * 
 * Features:
 * - Display full member list with avatars
 * - Show addedBy metadata (who added each member)
 * - Remove action only for members current user added (permission enforcement)
 * - Add eligible users button (opens user picker)
 * - Tap avatar to view profile
 * 
 * Architecture:
 * - Presentation component with event handlers passed via props
 * - Permission enforcement in UI (also enforced server-side)
 * - Uses ChatService for add/remove operations (via parent)
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatMember {
  uid: string;
  username: string;
  avatarUrl?: string;
  addedBy?: string; // uid of user who added this member
}

interface ManageChatMembersModalProps {
  visible: boolean;
  onClose: () => void;
  members: ChatMember[];
  currentUserId: string;
  onRemoveMember: (uid: string) => Promise<void>;
  onAddMembers: () => void;
  onViewProfile: (uid: string) => void;
  removeLoading?: string | null; // uid of member being removed
}

/**
 * Render a single member row.
 */
const MemberRow: React.FC<{
  member: ChatMember;
  currentUserId: string;
  onRemove: () => void;
  onViewProfile: () => void;
  isRemoving: boolean;
  canRemove: boolean;
}> = ({ member, currentUserId, onRemove, onViewProfile, isRemoving, canRemove }) => {
  const isCurrentUser = member.uid === currentUserId;
  const initial = (member.username || 'U').charAt(0).toUpperCase();

  return (
    <View
      style={[styles.memberRow, isCurrentUser && styles.currentUserRow]}
      accessibilityLabel={`${member.username}${isCurrentUser ? ' (You)' : ''}`}
    >
      {/* Avatar - tap to view profile */}
      <TouchableOpacity
        onPress={onViewProfile}
        accessibilityLabel={`View profile: ${member.username}`}
        accessibilityRole="button"
      >
        {member.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Username and metadata */}
      <View style={styles.memberInfo}>
        <Text style={[styles.username, isCurrentUser && styles.currentUserText]}>
          {member.username}
          {isCurrentUser && <Text style={styles.youLabel}> (You)</Text>}
        </Text>
        {member.addedBy && member.addedBy !== member.uid && (
          <Text style={styles.addedByText}>
            Added by {member.addedBy === currentUserId ? 'you' : 'other user'}
          </Text>
        )}
      </View>

      {/* Remove button - only show if current user added this member */}
      {canRemove && !isCurrentUser && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          disabled={isRemoving}
          accessibilityLabel={`Remove ${member.username}`}
          accessibilityRole="button"
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color="#ff3b30" />
          ) : (
            <Text style={styles.removeIcon}>⊖</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

export const ManageChatMembersModal: React.FC<ManageChatMembersModalProps> = ({
  visible,
  onClose,
  members,
  currentUserId,
  onRemoveMember,
  onAddMembers,
  onViewProfile,
  removeLoading,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Traval Buddies</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Member List */}
          <ScrollView 
            style={styles.memberList} 
            accessibilityLabel="Member list"
            keyboardShouldPersistTaps="handled"
          >
            {members.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No members in this chat yet.</Text>
              </View>
            ) : (
              members.map((member) => {
                const canRemove =
                  member.addedBy === currentUserId && member.uid !== currentUserId;
                const isRemoving = removeLoading === member.uid;

                return (
                  <MemberRow
                    key={member.uid}
                    member={member}
                    currentUserId={currentUserId}
                    onRemove={() => onRemoveMember(member.uid)}
                    onViewProfile={() => onViewProfile(member.uid)}
                    isRemoving={isRemoving}
                    canRemove={canRemove}
                  />
                );
              })
            )}
          </ScrollView>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Add Members Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddMembers}
            accessibilityLabel="Add existing connections"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={20} color="#007AFF" style={styles.addIcon} />
            <Text style={styles.addButtonText}>Add Existing Connections</Text>
          </TouchableOpacity>
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
  modalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 24,
    color: '#666',
  },
  memberList: {
    maxHeight: 300,
    marginBottom: 12,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  currentUserRow: {
    backgroundColor: '#f5f5f5',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    color: '#000',
  },
  currentUserText: {
    fontWeight: '600',
  },
  youLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'normal',
  },
  addedByText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  removeIcon: {
    fontSize: 20,
    color: '#ff3b30',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  addIcon: {
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});

/**
 * AddUserToChatModal.tsx
 * 
 * Modal for selecting and adding users from existing connections to a chat.
 * Displays a searchable list of eligible users (connections not already in the chat).
 * 
 * Features:
 * - Search by username
 * - Multi-select with checkboxes
 * - Avatar display with fallback initials
 * - Loading states
 * - Empty state handling
 * 
 * Architecture:
 * - Uses getEligibleUsersForChat utility to find addable users
 * - Fetches user profiles for display
 * - Parent handles actual add operation via ChatService
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { getEligibleUsersForChat } from '../../utils/getEligibleUsersForChat';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../../../firebase-config';

interface UserOption {
  userId: string;
  profile?: any;
  avatarUrl?: string;
  username?: string;
}

interface AddUserToChatModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (userIds: string[]) => void;
  currentUserId: string;
  currentChatUserIds: string[];
}

export const AddUserToChatModal: React.FC<AddUserToChatModalProps> = ({
  visible,
  onClose,
  onAdd,
  currentUserId,
  currentChatUserIds,
}) => {
  const [loading, setLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // Fetch eligible users when modal opens
  useEffect(() => {
    if (!visible) {
      // Reset state when closing
      setSelected([]);
      setSearch('');
      return;
    }

    const fetchEligibleUsers = async () => {
      setLoading(true);
      try {
        const users = await getEligibleUsersForChat(currentUserId, currentChatUserIds);
        const db = getFirestore(app);

        // Fetch user profiles for each eligible user
        const withProfiles = await Promise.all(
          users.map(async (u) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', u.userId));
              if (userDoc.exists()) {
                const profile = userDoc.data();
                return {
                  userId: u.userId,
                  profile,
                  username: profile?.username || u.userId,
                  avatarUrl: profile?.photoURL,
                };
              }
              return {
                userId: u.userId,
                username: u.userId,
              };
            } catch (err) {
              console.error('[AddUserToChatModal] Error fetching user profile:', u.userId, err);
              return {
                userId: u.userId,
                username: u.userId,
              };
            }
          })
        );

        setUserOptions(withProfiles);
      } catch (error) {
        console.error('[AddUserToChatModal] Error fetching eligible users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEligibleUsers();
  }, [visible, currentUserId, currentChatUserIds]);

  const handleToggle = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAdd = () => {
    if (selected.length === 0) return;
    onAdd(selected);
    setSelected([]);
    setSearch('');
    onClose();
  };

  // Filter users by search query
  const filteredOptions = userOptions.filter((u) => {
    const username = u.username || '';
    return (
      !search.trim() ||
      username.toLowerCase().includes(search.trim().toLowerCase())
    );
  });

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
            <Text style={styles.title}>Add to Chat</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search users"
          />

          {/* User List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Finding your connections...</Text>
            </View>
          ) : (
            <ScrollView style={styles.userList} accessibilityLabel="Available users">
              {filteredOptions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {search.trim()
                      ? 'No users match your search.'
                      : 'No eligible users found. All your connections are already in this chat.'}
                  </Text>
                </View>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selected.includes(option.userId);
                  const initial = (option.username || 'U').charAt(0).toUpperCase();

                  return (
                    <TouchableOpacity
                      key={option.userId}
                      style={[styles.userRow, isSelected && styles.userRowSelected]}
                      onPress={() => handleToggle(option.userId)}
                      accessibilityLabel={`${option.username}${isSelected ? ' selected' : ''}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      {/* Avatar */}
                      {option.avatarUrl ? (
                        <Image
                          source={{ uri: option.avatarUrl }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarInitial}>{initial}</Text>
                        </View>
                      )}

                      {/* Username */}
                      <Text style={styles.username}>{option.username}</Text>

                      {/* Checkbox */}
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, selected.length === 0 && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={selected.length === 0}
              accessibilityLabel={`Add ${selected.length} user${selected.length !== 1 ? 's' : ''}`}
              accessibilityRole="button"
            >
              <Text style={styles.addButtonText}>
                Add {selected.length > 0 ? `(${selected.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
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
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  userList: {
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
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  userRowSelected: {
    backgroundColor: '#e3f2fd',
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
  username: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  addButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

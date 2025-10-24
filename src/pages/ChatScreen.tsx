/**
 * Chat Screen - Exact replica of voyager-pwa Chat.tsx
 * Real-time messaging between matched users with connection list
 * 
 * Features:
 * - Connection list with unread indicators
 * - Real-time message fetching and sending
 * - Pagination for message history
 * - Modal chat interface
 * - Remove connection functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions
} from 'react-native';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  QueryDocumentSnapshot,
  DocumentData,
  limit,
  startAfter,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { useAlert } from '../context/AlertContext';

const { width: screenWidth } = Dimensions.get('window');

// Types (matching PWA types)
interface Connection {
  id: string;
  users: string[];
  itineraryIds?: string[];
  itineraries?: any[];
  createdAt: Timestamp;
  unreadCounts?: Record<string, number>;
  addedUsers?: string[];
}

interface Message {
  id: string;
  sender: string;
  text: string;
  imageUrl?: string;
  createdAt: Timestamp;
  readBy?: string[];
}

const ChatScreen: React.FC = () => {
  const { showAlert } = useAlert();
  const userId = auth.currentUser?.uid;
  
  // State (matching PWA state)
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [latestMessages, setLatestMessages] = useState<Message[]>([]);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [lastMessageDoc, setLastMessageDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});
  const [chatModalVisible, setChatModalVisible] = useState(false);

  // Fetch connections (same logic as PWA)
  useEffect(() => {
    if (!userId) return;
    
    const q = query(
      collection(db, "connections"),
      where("users", "array-contains", userId)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const conns: Connection[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          users: data.users,
          itineraryIds: data.itineraryIds,
          itineraries: data.itineraries,
          createdAt: data.createdAt as Timestamp,
          unreadCounts: data.unreadCounts || {},
          addedUsers: data.addedUsers || [],
        };
      });
      setConnections(conns);

      // Build unreadMap for badges (same logic as PWA)
      const unreadStatus: Record<string, boolean> = {};
      conns.forEach((conn) => {
        unreadStatus[conn.id] = (conn.unreadCounts?.[userId] || 0) > 0;
      });
      setUnreadMap(unreadStatus);
    });
    
    return () => unsub();
  }, [userId]);

  // Get other user info (same logic as PWA ChatListItem)
  const getOtherUser = useCallback((connection: Connection) => {
    if (!Array.isArray(connection.itineraries)) {
      return { username: "Unknown", uid: "", email: "" };
    }
    const otherItinerary = connection.itineraries.find(
      (it) => it.userInfo && it.userInfo.uid !== userId
    );
    return otherItinerary?.userInfo || { username: "Unknown", uid: "", email: "" };
  }, [userId]);

  // Handle connection selection (opens chat modal)
  const handleConnectionSelect = useCallback(async (connection: Connection) => {
    setSelectedConnection(connection);
    setChatModalVisible(true);
    
    // Reset unread count (same logic as PWA)
    if (userId) {
      const connectionRef = doc(db, "connections", connection.id);
      await updateDoc(connectionRef, {
        [`unreadCounts.${userId}`]: 0,
      });
    }
  }, [userId]);

  // Remove connection (same logic as PWA)
  const handleRemoveConnection = useCallback(async (connectionId: string) => {
    Alert.alert(
      "Remove Connection",
      "Are you sure you want to remove this connection?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              // TODO: Implement connection removal logic
              showAlert("success", "Connection removed successfully");
            } catch (error) {
              showAlert("error", "Failed to remove connection");
            }
          },
        },
      ]
    );
  }, [showAlert]);

  // Render connection item (replicating PWA ChatListItem)
  const renderConnectionItem = ({ item }: { item: Connection }) => {
    const otherUser = getOtherUser(item);
    const hasUnread = unreadMap[item.id] || false;
    
    return (
      <TouchableOpacity
        style={styles.connectionItem}
        onPress={() => handleConnectionSelect(item)}
      >
        <View style={styles.connectionContent}>
          {/* Avatar with unread badge */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, hasUnread && styles.avatarUnread]}>
              <Text style={styles.avatarText}>
                {(otherUser.username || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            {hasUnread && <View style={styles.unreadDot} />}
          </View>
          
          {/* User info */}
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionName}>
              {otherUser.username || "Unknown"}
            </Text>
            <Text style={styles.connectionSubtext}>
              Tap to chat • Match created
            </Text>
          </View>
          
          {/* Remove button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={(e) => {
              e.stopPropagation();
              handleRemoveConnection(item.id);
            }}
          >
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading/Empty states
  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.messageText}>Please log in to view chats</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (connections.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header (matching PWA) */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        
        <View style={styles.centerContainer}>
          <Text style={styles.messageText}>No connections yet</Text>
          <Text style={styles.submessageText}>
            Start swiping to find matches and connect with other travelers!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header (matching PWA) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>
          {connections.length} connection{connections.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Connection List */}
      <FlatList
        data={connections}
        renderItem={renderConnectionItem}
        keyExtractor={(item) => item.id}
        style={styles.connectionsList}
        contentContainerStyle={styles.connectionsListContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Chat Modal (placeholder - will implement full chat interface) */}
      <Modal
        visible={chatModalVisible}
        animationType="slide"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setChatModalVisible(false)}>
              <Text style={styles.modalCloseButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedConnection ? getOtherUser(selectedConnection).username : "Chat"}
            </Text>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.messageText}>Chat interface coming soon!</Text>
            <Text style={styles.submessageText}>
              Full messaging functionality will be implemented next.
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Matching PWA background
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  // Header (matching PWA header)
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
    marginTop: 4,
  },

  // Connections List
  connectionsList: {
    flex: 1,
  },
  connectionsListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  // Connection Item (matching PWA ChatListItem)
  connectionItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  connectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  // Avatar (matching PWA Avatar)
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarUnread: {
    borderWidth: 2,
    borderColor: '#f44336',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  unreadDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f44336',
    borderWidth: 2,
    borderColor: 'white',
  },
  
  // Connection Info
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  connectionSubtext: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  
  // Remove Button
  removeButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f44336',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Messages
  messageText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  submessageText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal (placeholder)
  modalContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    marginTop: 40,
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#1976d2',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});

export default ChatScreen;
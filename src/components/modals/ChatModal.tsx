/**
 * ChatModal Component - React Native version of PWA ChatModal.tsx
 * Full-screen chat interface with message history and real-time messaging
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc,
  increment,
} from "firebase/firestore";
import { getAuthInstance, db } from '../../config/firebaseConfig';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Types matching PWA
interface Message {
  id: string;
  sender: string;
  text: string;
  imageUrl?: string;
  createdAt: any;
  readBy?: string[];
}

interface Connection {
  id: string;
  users: string[];
  itineraries?: any[];
  unreadCounts?: Record<string, number>;
}

interface ChatModalProps {
  connection: Connection;
  visible: boolean;
  onClose: () => void;
  latestMessages: Message[];
  olderMessages: Message[];
  onLoadMore: () => void;
  hasMoreMessages: boolean;
}

const ChatModal: React.FC<ChatModalProps> = ({
  connection,
  visible,
  onClose,
  latestMessages,
  olderMessages,
  onLoadMore,
  hasMoreMessages,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const userId = getAuthInstance()?.currentUser?.uid;
  const flatListRef = useRef<FlatList>(null);

  // All messages combined (older + latest)
  const allMessages = [...olderMessages, ...latestMessages];

  // Get other user info (exact PWA logic)
  const getOtherUser = () => {
    if (!Array.isArray(connection.itineraries)) {
      return { username: "Unknown", uid: "" };
    }
    const otherItinerary = connection.itineraries.find(
      (it) => it.userInfo && it.userInfo.uid !== userId
    );
    return otherItinerary?.userInfo || { username: "Unknown", uid: "" };
  };

  const otherUser = getOtherUser();

  // Build userId to username map (simplified version of PWA logic)
  const getUsernameForId = (uid: string): string => {
    if (uid === userId) return 'You';
    if (uid === otherUser.uid) return otherUser.username || 'Unknown';
    return 'Unknown';
  };

  // Send message (exact PWA logic)
  const sendMessage = async () => {
    if (!messageInput.trim() || !userId || sending) return;

    setSending(true);
    try {
      const messageData = {
        sender: userId,
        text: messageInput.trim(),
        createdAt: serverTimestamp(),
        readBy: [userId],
      };

      // Add message to Firestore
      await addDoc(
        collection(db, "connections", connection.id, "messages"),
        messageData
      );

      // Update unread count for other users
      const otherUserId = connection.users.find(id => id !== userId);
      if (otherUserId) {
        const connectionRef = doc(db, "connections", connection.id);
        await updateDoc(connectionRef, {
          [`unreadCounts.${otherUserId}`]: increment(1),
        });
      }

      setMessageInput('');
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: any): string => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render individual message
  const renderMessage = ({ item: message }: { item: Message }) => {
    const isOwnMessage = message.sender === userId;
    const username = getUsernameForId(message.sender);
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          {!isOwnMessage && (
            <Text style={styles.senderName}>{username}</Text>
          )}
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.text}
          </Text>
          <Text style={styles.messageTime}>
            {formatMessageTime(message.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  // Render load more button
  const renderLoadMore = () => {
    if (!hasMoreMessages) return null;
    
    return (
      <TouchableOpacity style={styles.loadMoreButton} onPress={onLoadMore}>
        <Text style={styles.loadMoreText}>Load More Messages</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        {/* Header - Matching PWA AppBar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {otherUser.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.headerTitle}>{otherUser.username || 'Unknown'}</Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>

        {/* Messages List */}
        <KeyboardAvoidingView 
          style={styles.messagesContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <FlatList
            ref={flatListRef}
            data={allMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            ListHeaderComponent={renderLoadMore}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              // Auto-scroll to bottom when new messages arrive
              if (allMessages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />

          {/* Message Input - Matching PWA TextField and Button */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              value={messageInput}
              onChangeText={setMessageInput}
              placeholder="Type a message..."
              placeholderTextColor="rgba(0, 0, 0, 0.6)"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={sending || !messageInput.trim()}
            >
              <Text style={styles.sendButtonText}>
                {sending ? '...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa', // Material-UI background.default
  },

  // Header - Matching PWA AppBar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1976d2', // Material-UI primary.main
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },

  backButton: {
    padding: 8,
  },

  backIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },

  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },

  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  headerAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },

  headerRight: {
    width: 40, // Balance the back button
  },

  // Messages Container
  messagesContainer: {
    flex: 1,
  },

  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },

  messagesContent: {
    paddingVertical: 16,
  },

  // Load More Button
  loadMoreButton: {
    alignSelf: 'center',
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },

  loadMoreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },

  // Message Styles
  messageContainer: {
    marginVertical: 4,
  },

  ownMessage: {
    alignItems: 'flex-end',
  },

  otherMessage: {
    alignItems: 'flex-start',
  },

  messageBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  ownMessageBubble: {
    backgroundColor: '#1976d2', // Material-UI primary.main
  },

  otherMessageBubble: {
    backgroundColor: '#e0e0e0', // Material-UI grey[300]
  },

  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.6)',
    marginBottom: 2,
  },

  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },

  ownMessageText: {
    color: 'white',
  },

  otherMessageText: {
    color: 'rgba(0, 0, 0, 0.87)', // Material-UI text.primary
  },

  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },

  // Input Container - Matching PWA input styling
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },

  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.23)', // Material-UI TextField border
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },

  sendButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sendButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.26)', // Material-UI disabled color
  },

  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ChatModal;
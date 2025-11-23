/**
 * ChatThreadScreen
 * 
 * Individual chat conversation view for a connection.
 * Displays messages with avatars, usernames, and timestamps.
 * Follows PWA ChatModal.tsx message rendering pattern.
 */

import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { prepareImageForUpload } from '../utils/imageValidation';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { UserProfileContext } from '../context/UserProfileContext';
import { useMessages } from '../hooks/chat/useMessages';
import { useConnections } from '../hooks/chat/useConnections';
import { ViewProfileModal } from '../components/modals/ViewProfileModal';
import { getChatService } from '../services/chat/ChatService';
import { connectionRepository } from '../repositories/ConnectionRepository';

type ChatThreadRouteParams = {
  ChatThread: {
    connectionId: string;
    otherUserName?: string;
  };
};

const DEFAULT_AVATAR = 'https://via.placeholder.com/40';

const ChatThreadScreen: React.FC = () => {
  const route = useRoute<RouteProp<ChatThreadRouteParams, 'ChatThread'>>();
  const navigation = useNavigation();
  const { connectionId, otherUserName } = route.params;
  const { userProfile } = useContext(UserProfileContext);

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const [viewProfileVisible, setViewProfileVisible] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const currentUserId = userProfile?.uid;

  // Use the useMessages hook instead of duplicating the query
  const { messages, loading, error, hasMore, loadMore } = useMessages(connectionId);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Get connection details for user info
  const { connections } = useConnections(currentUserId || null);
  const connection = connections.find(c => c.id === connectionId);

  // Build userId -> username and avatar maps from connection itineraries
  const [userIdToUsername, setUserIdToUsername] = useState<Record<string, string>>({});
  const [userIdToAvatar, setUserIdToAvatar] = useState<Record<string, string>>({});

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Small delay to ensure FlatList has rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, loading]);

  // Mark messages as read when entering chat
  useEffect(() => {
    if (connectionId && currentUserId) {
      connectionRepository.markMessagesAsRead(connectionId, currentUserId);
    }
  }, [connectionId, currentUserId]);

  // Fetch user profile photos from Firestore (matching PWA useGetUserProfilePhoto)
  useEffect(() => {
    if (!connection?.users) return;

    const fetchUserData = async () => {
      const usernameMap: Record<string, string> = {};
      const avatarMap: Record<string, string> = {};

      await Promise.all(
        connection.users.map(async (uid) => {
          try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              usernameMap[uid] = userData?.username || userData?.email || 'Unknown';
              avatarMap[uid] = userData?.photos?.profile || DEFAULT_AVATAR;
            } else {
              usernameMap[uid] = 'Unknown';
              avatarMap[uid] = DEFAULT_AVATAR;
            }
          } catch (error) {
            console.error('[ChatThread] Error fetching user data for:', uid, error);
            usernameMap[uid] = 'Unknown';
            avatarMap[uid] = DEFAULT_AVATAR;
          }
        })
      );

      setUserIdToUsername(usernameMap);
      setUserIdToAvatar(avatarMap);
    };

    fetchUserData();
  }, [connection?.users]);

  const sendMessage = async () => {
    if (!messageText.trim() || !currentUserId) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const chatService = getChatService();
      await chatService.sendMessage(connectionId, currentUserId, text);
      
    } catch (error) {
      console.error('[ChatThread] Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to send images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri, result.assets[0].mimeType);
      }
    } catch (error) {
      console.error('[ChatThread] Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadImage = async (uri: string, mimeType?: string) => {
    if (!currentUserId) return;

    setUploading(true);

    try {
      // Validate and prepare image
      const { uri: preparedUri, error } = await prepareImageForUpload(uri, mimeType);
      
      if (error) {
        Alert.alert('Invalid Image', error);
        return;
      }

      // Upload to Firebase Storage
      const storage = getStorage();
      const filename = `${Date.now()}_${currentUserId}.jpg`;
      const storageRef = ref(storage, `chatImages/${connectionId}/${filename}`);
      
      // Convert image to blob for upload
      let blob: Blob;
      
      if (Platform.OS === 'android') {
        // On Android, use XMLHttpRequest to read the file as a blob
        // This avoids the axios interceptor and works with file:// URIs
        blob = await new Promise<Blob>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() {
            resolve(xhr.response);
          };
          xhr.onerror = function(e) {
            reject(new Error('Failed to read file'));
          };
          xhr.responseType = 'blob';
          xhr.open('GET', preparedUri, true);
          xhr.send(null);
        });
      } else {
        // On iOS or web, use fetch
        const response = await fetch(preparedUri);
        blob = await response.blob();
      }

      // Upload
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Send message with image via ChatService
      const chatService = getChatService();
      await chatService.sendImageMessage(
        connectionId,
        currentUserId,
        downloadURL,
        messageText.trim() || undefined
      );

      // Clear text input after sending
      setMessageText('');
      
    } catch (error) {
      console.error('[ChatThread] Error uploading image:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatMessageTime = (timestamp: any): string => {
    if (!timestamp) return '';
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return '';
    }
    
    return date.toLocaleString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDay = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = date.toDateString();
    if (dateStr === today.toDateString()) return 'Today';
    if (dateStr === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group messages by day
  const groupMessagesByDay = () => {
    const groups: { day: string; messages: typeof messages }[] = [];
    const dayMap: Record<string, typeof messages> = {};

    messages.forEach((msg) => {
      let date: Date;
      if (msg.createdAt && (msg.createdAt as any).toDate) {
        date = (msg.createdAt as any).toDate();
      } else if (msg.createdAt instanceof Date) {
        date = msg.createdAt;
      } else if (typeof msg.createdAt === 'number') {
        date = new Date(msg.createdAt);
      } else {
        date = new Date();
      }
      
      const day = formatDay(date);
      
      if (!dayMap[day]) {
        dayMap[day] = [];
      }
      dayMap[day].push(msg);
    });

    Object.keys(dayMap).forEach(day => {
      groups.push({ day, messages: dayMap[day] });
    });

    return groups;
  };

  const renderMessage = ({ item }: { item: typeof messages[0] }) => {
    const isOwnMessage = item.sender === currentUserId;
    const username = userIdToUsername[item.sender] || item.sender;
    const avatarUrl = userIdToAvatar[item.sender];
    const hasPhoto = avatarUrl && avatarUrl !== DEFAULT_AVATAR;
    const initial = username ? username.charAt(0).toUpperCase() : '?';
    
    return (
      <View style={styles.messageContainer}>
        {/* Avatar - shown for other users' messages */}
        {!isOwnMessage && (
          hasPhoto ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.messageAvatar}
            />
          ) : (
            <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
              <Text style={styles.messageAvatarInitial}>{initial}</Text>
            </View>
          )
        )}
        
        <View style={[
          styles.messageContent,
          isOwnMessage ? styles.ownMessageContent : styles.otherMessageContent,
        ]}>
          {/* Username above bubble */}
          <Text style={[
            styles.senderName,
            isOwnMessage ? styles.ownSenderName : styles.otherSenderName
          ]}>
            {username}
          </Text>
          
          {/* Message bubble */}
          <View style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
            // If message has only image, reduce padding
            (!item.text && item.imageUrl) && styles.imageOnlyBubble,
          ]}>
            {item.text && (
              <Text style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}>
                {item.text}
              </Text>
            )}
            
            {/* Image if present */}
            {item.imageUrl && (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.messageImage}
                resizeMode="cover"
                onError={(e) => {
                  // Only log actual errors, suppress for old corrupted uploads
                  if (!e.nativeEvent.error?.toString().includes('unknown image format')) {
                    console.error('[ChatThread] Image load error for message:', item.id, e.nativeEvent.error);
                  }
                }}
              />
            )}
          </View>
          
          {/* Timestamp below bubble */}
          <Text style={styles.messageTime}>
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
        
        {/* Spacer for own messages (avatar on opposite side) */}
        {isOwnMessage && <View style={styles.avatarSpacer} />}
      </View>
    );
  };

  const renderDayGroup = ({ item }: { item: { day: string; messages: typeof messages } }) => (
    <View>
      {/* Day separator */}
      <View style={styles.daySeparator}>
        <View style={styles.daySeparatorLine} />
        <Text style={styles.daySeparatorText}>{item.day}</Text>
        <View style={styles.daySeparatorLine} />
      </View>
      
      {/* Messages for this day */}
      {item.messages.map(msg => (
        <View key={msg.id}>
          {renderMessage({ item: msg })}
        </View>
      ))}
    </View>
  );

  const groupedMessages = groupMessagesByDay();

  return (
    <View style={styles.container}>
      {/* Header with profile avatars */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          
          {/* Profile avatars for all users in chat */}
          <View style={styles.headerAvatars}>
            {connection?.users.map((uid) => {
              const username = userIdToUsername[uid] || uid;
              const avatarUrl = userIdToAvatar[uid];
              const isCurrentUser = uid === currentUserId;
              const hasPhoto = avatarUrl && avatarUrl !== DEFAULT_AVATAR;
              const initial = username ? username.charAt(0).toUpperCase() : '?';
              
              return (
                <TouchableOpacity
                  key={uid}
                  onPress={() => {
                    setViewProfileUserId(uid);
                    setViewProfileVisible(true);
                  }}
                  style={[
                    styles.headerAvatar,
                    isCurrentUser && styles.currentUserAvatar,
                  ]}
                >
                  {hasPhoto ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.headerAvatarImage}
                    />
                  ) : (
                    <View style={styles.headerAvatarPlaceholder}>
                      <Text style={styles.headerAvatarInitial}>{initial}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Error loading messages</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={groupedMessages}
              keyExtractor={(item) => item.day}
              renderItem={renderDayGroup}
              contentContainerStyle={styles.messagesList}
              inverted={false}
              onContentSizeChange={() => {
                // Auto-scroll when content size changes (new messages)
                if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              onScroll={(event) => {
                // Detect when user scrolls near top (within 100px) to load older messages
                const { contentOffset } = event.nativeEvent;
                const distanceFromTop = contentOffset.y;
                
                // Only trigger loadMore if user has actually scrolled (not initial layout)
                // AND they're near the top
                if (distanceFromTop < 100 && distanceFromTop > 0 && hasMore && !loading && !loadingMore && isUserScrolling) {
                  setLoadingMore(true);
                  loadMore().finally(() => setLoadingMore(false));
                }
              }}
              onScrollBeginDrag={() => {
                setIsUserScrolling(true);
              }}
              scrollEventThrottle={400}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
                </View>
              }
              ListHeaderComponent={
                hasMore ? (
                  loadingMore ? (
                    <View style={styles.loadMoreButton}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={styles.loadMoreText}>Loading...</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.loadMoreButton} 
                      onPress={async () => {
                        setLoadingMore(true);
                        await loadMore();
                        setLoadingMore(false);
                      }}
                    >
                      <Text style={styles.loadMoreText}>↑ Load older messages</Text>
                    </TouchableOpacity>
                  )
                ) : messages.length > 0 ? (
                  <View style={styles.loadMoreButton}>
                    <Text style={styles.loadMoreTextDisabled}>• No more messages •</Text>
                  </View>
                ) : null
              }
            />

            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={pickImage}
                disabled={uploading || sending}
              >
                <Ionicons name="image" size={24} color={uploading ? "#ccc" : "#007AFF"} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                multiline
                maxLength={1000}
                editable={!uploading}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!messageText.trim() || sending || uploading) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!messageText.trim() || sending || uploading}
              >
                <Text style={styles.sendButtonText}>{uploading ? '↑' : sending ? '...' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

      {/* View Profile Modal */}
      {viewProfileUserId && (
        <ViewProfileModal
          visible={viewProfileVisible}
          onClose={() => {
            setViewProfileVisible(false);
            setViewProfileUserId(null);
          }}
          userId={viewProfileUserId}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 80 : 80,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButtonContainer: {
    width: 60,
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 8,
  },
  headerAvatar: {
    padding: 2,
  },
  currentUserAvatar: {
    borderWidth: 2,
    borderColor: '#1976d2',
    borderRadius: 18,
  },
  headerAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  messageAvatarPlaceholder: {
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarSpacer: {
    width: 36,
    marginLeft: 8,
  },
  messageContent: {
    flex: 1,
    flexDirection: 'column',
  },
  ownMessageContent: {
    alignItems: 'flex-end',
  },
  otherMessageContent: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  ownSenderName: {
    color: '#1976d2',
  },
  otherSenderName: {
    color: '#333',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  imageOnlyBubble: {
    padding: 4,
    backgroundColor: 'transparent',
  },
  ownMessageBubble: {
    backgroundColor: '#1976d2',
  },
  otherMessageBubble: {
    backgroundColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  daySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  daySeparatorText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  loadMoreTextDisabled: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'android' ? 50 : 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  imageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatThreadScreen;

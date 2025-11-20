/**
 * Chat Service
 * Business logic for chat operations including messaging, member management, and typing indicators
 * Implements IChatService interface following S.O.L.I.D principles
 */

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  arrayUnion,
  increment,
  Timestamp,
  Firestore,
} from 'firebase/firestore';
import { app } from '../../../firebase-config';
import { Message } from '../../types/Message';
import { sanitizeMessage } from '../../utils/sanitizeMessage';
import { addUserToConnection, removeUserFromConnection } from '../../utils/connectionUtils';

export interface IChatService {
  sendMessage(connectionId: string, sender: string, text: string): Promise<Message>;
  sendImageMessage(connectionId: string, sender: string, imageUrl: string, text?: string): Promise<Message>;
  markAsRead(connectionId: string, messageId: string, userId: string): Promise<void>;
  setTypingStatus(connectionId: string, userId: string, isTyping: boolean): Promise<void>;
  addMember(connectionId: string, userIdToAdd: string, addedBy: string): Promise<void>;
  removeMember(connectionId: string, userIdToRemove: string, requestingUserId: string): Promise<void>;
}

/**
 * Firebase implementation of ChatService
 */
export class ChatService implements IChatService {
  private db: Firestore;

  constructor(db?: Firestore) {
    this.db = db || getFirestore(app);
  }

  /**
   * Sends a text message with optimistic update support
   */
  async sendMessage(
    connectionId: string,
    sender: string,
    text: string
  ): Promise<Message> {
    // Input validation
    if (!connectionId || typeof connectionId !== 'string' || !connectionId.trim()) {
      throw new Error('Invalid connectionId');
    }
    if (!sender || typeof sender !== 'string' || !sender.trim()) {
      throw new Error('Invalid sender');
    }
    
    // Sanitize message text
    const sanitizedText = sanitizeMessage(text);
    if (!sanitizedText) {
      throw new Error('Message cannot be empty');
    }

    const messagesRef = collection(this.db, `connections/${connectionId}/messages`);
    const connectionRef = doc(this.db, 'connections', connectionId);

    // Create message document
    const messageData = {
      sender,
      text: sanitizedText,
      createdAt: serverTimestamp(),
      readBy: [sender],
      imageUrl: null,
    };

    const messageDoc = await addDoc(messagesRef, messageData);

    // Get connection to find all users and increment unread counts
    const connSnap = await getDoc(connectionRef);
    const allUsers = connSnap.data()?.users || [];
    const otherUsers = allUsers.filter((uid: string) => uid !== sender);

    // Build increment map for unread counts
    const unreadUpdates = otherUsers.reduce((acc: any, uid: string) => ({
      ...acc,
      [`unreadCounts.${uid}`]: increment(1)
    }), {});

    // Update connection metadata (last message preview + unread counts)
    await updateDoc(connectionRef, {
      'lastMessagePreview.text': sanitizedText.substring(0, 100),
      'lastMessagePreview.sender': sender,
      'lastMessagePreview.createdAt': serverTimestamp(),
      ...unreadUpdates,
    });

    return {
      id: messageDoc.id,
      sender,
      text: sanitizedText,
      createdAt: Timestamp.now(),
      readBy: [sender],
    };
  }

  /**
   * Sends an image message
   */
  async sendImageMessage(
    connectionId: string,
    sender: string,
    imageUrl: string,
    text?: string
  ): Promise<Message> {
    // Input validation
    if (!connectionId || typeof connectionId !== 'string' || !connectionId.trim()) {
      throw new Error('Invalid connectionId');
    }
    if (!sender || typeof sender !== 'string' || !sender.trim()) {
      throw new Error('Invalid sender');
    }
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      throw new Error('Invalid imageUrl');
    }
    
    const sanitizedText = text ? sanitizeMessage(text) : '';
    const messagesRef = collection(this.db, `connections/${connectionId}/messages`);
    const connectionRef = doc(this.db, 'connections', connectionId);

    const messageData = {
      sender,
      text: sanitizedText,
      imageUrl,
      createdAt: serverTimestamp(),
      readBy: [sender],
    };

    const messageDoc = await addDoc(messagesRef, messageData);

    // Update connection last message preview
    await updateDoc(connectionRef, {
      'lastMessagePreview.text': sanitizedText || '📷 Photo',
      'lastMessagePreview.sender': sender,
      'lastMessagePreview.createdAt': serverTimestamp(),
    });

    return {
      id: messageDoc.id,
      sender,
      text: sanitizedText,
      imageUrl,
      createdAt: Timestamp.now(),
      readBy: [sender],
    };
  }

  /**
   * Marks a message as read by a user
   */
  async markAsRead(
    connectionId: string,
    messageId: string,
    userId: string
  ): Promise<void> {
    // Input validation
    if (!connectionId || typeof connectionId !== 'string' || !connectionId.trim()) {
      throw new Error('Invalid connectionId');
    }
    if (!messageId || typeof messageId !== 'string' || !messageId.trim()) {
      throw new Error('Invalid messageId');
    }
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('Invalid userId');
    }
    
    const messageRef = doc(this.db, `connections/${connectionId}/messages`, messageId);
    const connectionRef = doc(this.db, 'connections', connectionId);

    await updateDoc(messageRef, {
      readBy: arrayUnion(userId),
    });

    // Reset unread count for this user
    await updateDoc(connectionRef, {
      [`unreadCounts.${userId}`]: 0,
    });
  }

  /**
   * Sets typing status for a user in a connection
   */
  async setTypingStatus(
    connectionId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void> {
    // Input validation
    if (!connectionId || typeof connectionId !== 'string' || !connectionId.trim()) {
      throw new Error('Invalid connectionId');
    }
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('Invalid userId');
    }
    
    const typingRef = doc(this.db, `connections/${connectionId}/typing`, userId);

    if (isTyping) {
      await updateDoc(typingRef, {
        isTyping: true,
        timestamp: serverTimestamp(),
      });
    } else {
      await updateDoc(typingRef, {
        isTyping: false,
        timestamp: serverTimestamp(),
      });
    }
  }

  /**
   * Adds a member to the connection
   */
  async addMember(
    connectionId: string,
    userIdToAdd: string,
    addedBy: string
  ): Promise<void> {
    // Input validation
    if (!connectionId || typeof connectionId !== 'string' || !connectionId.trim()) {
      throw new Error('Invalid connectionId');
    }
    if (!userIdToAdd || typeof userIdToAdd !== 'string' || !userIdToAdd.trim()) {
      throw new Error('Invalid userIdToAdd');
    }
    if (!addedBy || typeof addedBy !== 'string' || !addedBy.trim()) {
      throw new Error('Invalid addedBy');
    }
    
    await addUserToConnection(connectionId, userIdToAdd, addedBy);
  }

  /**
   * Removes a member from the connection
   */
  async removeMember(
    connectionId: string,
    userIdToRemove: string,
    requestingUserId: string
  ): Promise<void> {
    // Input validation
    if (!connectionId || typeof connectionId !== 'string' || !connectionId.trim()) {
      throw new Error('Invalid connectionId');
    }
    if (!userIdToRemove || typeof userIdToRemove !== 'string' || !userIdToRemove.trim()) {
      throw new Error('Invalid userIdToRemove');
    }
    if (!requestingUserId || typeof requestingUserId !== 'string' || !requestingUserId.trim()) {
      throw new Error('Invalid requestingUserId');
    }
    
    await removeUserFromConnection(connectionId, userIdToRemove, requestingUserId);
  }
}

// Export singleton instance (lazy initialization)
let _chatServiceInstance: ChatService | null = null;

export const getChatService = (): ChatService => {
  if (!_chatServiceInstance) {
    _chatServiceInstance = new ChatService();
  }
  return _chatServiceInstance;
};

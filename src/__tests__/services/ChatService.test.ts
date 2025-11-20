/**
 * Unit Tests for ChatService
 * Tests messaging, member management, and typing indicators with mocked Firestore
 */

// Mock Firebase modules BEFORE imports with inline definitions
jest.mock('firebase/firestore', () => {
  const mockCollectionRef = { type: 'CollectionReference' };
  const mockDocRef = { type: 'DocumentReference' };
  
  return {
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn(() => mockCollectionRef),
    doc: jest.fn(() => mockDocRef),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    getDoc: jest.fn(),
    serverTimestamp: jest.fn(),
    increment: jest.fn(),
    arrayUnion: jest.fn(),
    arrayRemove: jest.fn(),
    Timestamp: {
      now: jest.fn(),
      fromDate: jest.fn(),
      fromMillis: jest.fn(),
    },
  };
});
jest.mock('../../../firebase-config', () => ({
  app: { name: 'mock-app' },
  auth: { currentUser: null },
  db: {},
  storage: {},
}));
jest.mock('../../utils/sanitizeMessage');
jest.mock('../../utils/connectionUtils');

import { getChatService } from '../../services/chat/ChatService';
import { sanitizeMessage } from '../../utils/sanitizeMessage';
import { addUserToConnection, removeUserFromConnection } from '../../utils/connectionUtils';
import * as firestore from 'firebase/firestore';

// Cast mocked functions for easier testing
const mockAddDoc = firestore.addDoc as jest.Mock;
const mockUpdateDoc = firestore.updateDoc as jest.Mock;
const mockGetDoc = firestore.getDoc as jest.Mock;
const mockServerTimestamp = firestore.serverTimestamp as jest.Mock;
const mockIncrement = firestore.increment as jest.Mock;
const mockArrayUnion = firestore.arrayUnion as jest.Mock;

describe('ChatService', () => {
  let chatService: ReturnType<typeof getChatService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create new ChatService instance for each test
    chatService = getChatService();

    // Setup Firestore mock return values
    mockAddDoc.mockResolvedValue({ id: 'msg123' });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue({
      exists: jest.fn(() => true),
      data: jest.fn(() => ({
        users: ['user-1', 'user-2', 'user-3'],
      })),
    });
    mockServerTimestamp.mockReturnValue({ seconds: Date.now() / 1000 });
    mockIncrement.mockImplementation((n) => ({ _methodName: 'increment', _operand: n }));
    mockArrayUnion.mockImplementation((...elements) => ({ _methodName: 'arrayUnion', _elements: elements }));

    // Setup sanitizeMessage mock
    (sanitizeMessage as jest.Mock).mockImplementation((text: string) => text?.trim() || '');

    // Setup connectionUtils mocks
    (addUserToConnection as jest.Mock).mockResolvedValue(undefined);
    (removeUserFromConnection as jest.Mock).mockResolvedValue(undefined);
  });

  describe('sendMessage', () => {
    it('should send a message with sanitized text', async () => {
      const connectionId = 'conn-123';
      const sender = 'user-1';
      const text = 'Hello world!';

      const result = await chatService.sendMessage(connectionId, sender, text);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sender: 'user-1',
          text: 'Hello world!',
          readBy: ['user-1'],
          imageUrl: null,
        })
      );

      expect(result).toMatchObject({
        id: 'msg123',
        sender: 'user-1',
        text: 'Hello world!',
        readBy: ['user-1'],
      });
    });

    it('should increment unread count for other users', async () => {
      const connectionId = 'conn-123';
      const sender = 'user-1';
      const text = 'Test message';

      await chatService.sendMessage(connectionId, sender, text);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'unreadCounts.user-2': expect.objectContaining({ _methodName: 'increment' }),
          'unreadCounts.user-3': expect.objectContaining({ _methodName: 'increment' }),
        })
      );
    });

    it('should update last message preview', async () => {
      const connectionId = 'conn-123';
      const sender = 'user-1';
      const text = 'Preview test';

      await chatService.sendMessage(connectionId, sender, text);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'lastMessagePreview.text': 'Preview test',
        })
      );
    });

    it('should throw error for invalid connectionId', async () => {
      await expect(chatService.sendMessage('', 'user-1', 'text')).rejects.toThrow('Invalid connectionId');
      await expect(chatService.sendMessage('   ', 'user-1', 'text')).rejects.toThrow('Invalid connectionId');
    });

    it('should throw error for invalid sender', async () => {
      await expect(chatService.sendMessage('conn-123', '', 'text')).rejects.toThrow('Invalid sender');
      await expect(chatService.sendMessage('conn-123', '   ', 'text')).rejects.toThrow('Invalid sender');
    });

    it('should throw error for empty message text', async () => {
      (sanitizeMessage as jest.Mock).mockReturnValue('');
      await expect(chatService.sendMessage('conn-123', 'user-1', '   ')).rejects.toThrow('Message cannot be empty');
    });

    it('should truncate long preview text to 100 characters', async () => {
      const connectionId = 'conn-123';
      const sender = 'user-1';
      const longText = 'a'.repeat(150);

      await chatService.sendMessage(connectionId, sender, longText);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'lastMessagePreview.text': 'a'.repeat(100),
        })
      );
    });
  });

  describe('sendImageMessage', () => {
    it('should send an image message with URL', async () => {
      const connectionId = 'conn-123';
      const sender = 'user-1';
      const imageUrl = 'https://example.com/image.jpg';
      const text = 'Check this out!';

      const result = await chatService.sendImageMessage(connectionId, sender, imageUrl, text);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sender: 'user-1',
          text: 'Check this out!',
          imageUrl: 'https://example.com/image.jpg',
          readBy: ['user-1'],
        })
      );

      expect(result).toMatchObject({
        id: 'msg123',
        sender: 'user-1',
        text: 'Check this out!',
        imageUrl: 'https://example.com/image.jpg',
      });
    });

    it('should send image message without text caption', async () => {
      const result = await chatService.sendImageMessage('conn-123', 'user-1', 'https://example.com/image.jpg');

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: '',
          imageUrl: 'https://example.com/image.jpg',
        })
      );
    });

    it('should use photo emoji in preview when no text', async () => {
      await chatService.sendImageMessage('conn-123', 'user-1', 'https://example.com/image.jpg');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'lastMessagePreview.text': '📷 Photo',
        })
      );
    });

    it('should throw error for invalid imageUrl', async () => {
      await expect(chatService.sendImageMessage('conn-123', 'user-1', '')).rejects.toThrow('Invalid imageUrl');
      await expect(chatService.sendImageMessage('conn-123', 'user-1', '   ')).rejects.toThrow('Invalid imageUrl');
    });

    it('should validate connectionId and sender', async () => {
      await expect(chatService.sendImageMessage('', 'user-1', 'https://example.com/image.jpg')).rejects.toThrow('Invalid connectionId');
      await expect(chatService.sendImageMessage('conn-123', '', 'https://example.com/image.jpg')).rejects.toThrow('Invalid sender');
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read and reset unread count', async () => {
      await chatService.markAsRead('conn-123', 'msg-456', 'user-2');

      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
      
      // First call: update message readBy
      expect(mockUpdateDoc).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({
          readBy: expect.objectContaining({ _methodName: 'arrayUnion' }),
        })
      );

      // Second call: reset unread count
      expect(mockUpdateDoc).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        { 'unreadCounts.user-2': 0 }
      );
    });

    it('should throw error for invalid connectionId', async () => {
      await expect(chatService.markAsRead('', 'msg-456', 'user-2')).rejects.toThrow('Invalid connectionId');
    });

    it('should throw error for invalid messageId', async () => {
      await expect(chatService.markAsRead('conn-123', '', 'user-2')).rejects.toThrow('Invalid messageId');
    });

    it('should throw error for invalid userId', async () => {
      await expect(chatService.markAsRead('conn-123', 'msg-456', '')).rejects.toThrow('Invalid userId');
    });
  });

  describe('setTypingStatus', () => {
    it('should set typing status to true', async () => {
      await chatService.setTypingStatus('conn-123', 'user-1', true);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isTyping: true,
        })
      );
    });

    it('should set typing status to false', async () => {
      await chatService.setTypingStatus('conn-123', 'user-1', false);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isTyping: false,
        })
      );
    });

    it('should throw error for invalid connectionId', async () => {
      await expect(chatService.setTypingStatus('', 'user-1', true)).rejects.toThrow('Invalid connectionId');
    });

    it('should throw error for invalid userId', async () => {
      await expect(chatService.setTypingStatus('conn-123', '', true)).rejects.toThrow('Invalid userId');
    });
  });

  describe('addMember', () => {
    it('should call addUserToConnection with correct params', async () => {
      await chatService.addMember('conn-123', 'user-3', 'user-1');

      expect(addUserToConnection).toHaveBeenCalledWith('conn-123', 'user-3', 'user-1');
    });

    it('should throw error for invalid connectionId', async () => {
      await expect(chatService.addMember('', 'user-3', 'user-1')).rejects.toThrow('Invalid connectionId');
    });

    it('should throw error for invalid userIdToAdd', async () => {
      await expect(chatService.addMember('conn-123', '', 'user-1')).rejects.toThrow('Invalid userIdToAdd');
    });

    it('should throw error for invalid addedBy', async () => {
      await expect(chatService.addMember('conn-123', 'user-3', '')).rejects.toThrow('Invalid addedBy');
    });
  });

  describe('removeMember', () => {
    it('should call removeUserFromConnection with correct params', async () => {
      await chatService.removeMember('conn-123', 'user-3', 'user-1');

      expect(removeUserFromConnection).toHaveBeenCalledWith('conn-123', 'user-3', 'user-1');
    });

    it('should throw error for invalid connectionId', async () => {
      await expect(chatService.removeMember('', 'user-3', 'user-1')).rejects.toThrow('Invalid connectionId');
    });

    it('should throw error for invalid userIdToRemove', async () => {
      await expect(chatService.removeMember('conn-123', '', 'user-1')).rejects.toThrow('Invalid userIdToRemove');
    });

    it('should throw error for invalid requestingUserId', async () => {
      await expect(chatService.removeMember('conn-123', 'user-3', '')).rejects.toThrow('Invalid requestingUserId');
    });
  });
});

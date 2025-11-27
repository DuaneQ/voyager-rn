import { addUserToConnection, removeUserFromConnection } from '../../utils/connectionUtils';
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

// Mock Firebase
jest.mock('../../../firebase-config');
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((val) => val),
  arrayRemove: jest.fn((val) => val),
  getDoc: jest.fn(),
}));

describe('connectionUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addUserToConnection', () => {
    it('should add user to connection successfully', async () => {
      const mockConnectionData = {
        users: ['user1'],
        addedUsers: []
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockConnectionData
      });

      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await addUserToConnection('conn-123', 'user2', 'user1');

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw error if connection not found', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      });

      await expect(
        addUserToConnection('conn-123', 'user2', 'user1')
      ).rejects.toThrow('Connection not found');
    });

    it('should throw error if user already in chat', async () => {
      const mockConnectionData = {
        users: ['user1', 'user2'],
        addedUsers: []
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockConnectionData
      });

      await expect(
        addUserToConnection('conn-123', 'user2', 'user1')
      ).rejects.toThrow('User already in chat');
    });
  });

  describe('removeUserFromConnection', () => {
    it('should remove user from connection successfully', async () => {
      const mockConnectionData = {
        users: ['user1', 'user2'],
        addedUsers: [{ userId: 'user2', addedBy: 'user1' }]
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockConnectionData
      });

      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await removeUserFromConnection('conn-123', 'user2', 'user1');

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw error if connection not found', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      });

      await expect(
        removeUserFromConnection('conn-123', 'user2', 'user1')
      ).rejects.toThrow('Connection not found');
    });

    it('should throw error if requesting user did not add the target user', async () => {
      const mockConnectionData = {
        users: ['user1', 'user2', 'user3'],
        addedUsers: [{ userId: 'user2', addedBy: 'user3' }]
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockConnectionData
      });

      await expect(
        removeUserFromConnection('conn-123', 'user2', 'user1')
      ).rejects.toThrow('You can only remove users you added');
    });

    it('should throw error if user was not added by anyone', async () => {
      const mockConnectionData = {
        users: ['user1', 'user2'],
        addedUsers: []
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockConnectionData
      });

      await expect(
        removeUserFromConnection('conn-123', 'user2', 'user1')
      ).rejects.toThrow('You can only remove users you added');
    });
  });
});

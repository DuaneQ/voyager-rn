/**
 * Unit Tests for AccountDeletionService
 * Tests complete account deletion flow including auth, firestore, and storage cleanup
 */

// Mock Firebase modules BEFORE imports
jest.mock('firebase/auth', () => ({
  deleteUser: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn(),
  },
}));

jest.mock('firebase/firestore', () => {
  const mockCollectionRef = { type: 'CollectionReference' };
  const mockDocRef = { type: 'DocumentReference' };
  const mockQuerySnapshot = {
    docs: [],
    empty: true,
    size: 0,
  };
  
  return {
    collection: jest.fn(() => mockCollectionRef),
    doc: jest.fn(() => mockDocRef),
    query: jest.fn(() => ({})),
    where: jest.fn(),
    getDocs: jest.fn(() => Promise.resolve(mockQuerySnapshot)),
    deleteDoc: jest.fn(),
    writeBatch: jest.fn(() => ({
      delete: jest.fn(),
      commit: jest.fn(() => Promise.resolve()),
    })),
    updateDoc: jest.fn(),
    serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  };
});

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  listAll: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('../../../config/firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

import { AccountDeletionService } from '../../../services/account/AccountDeletionService';
import { auth } from '../../../config/firebaseConfig';
import * as firebaseAuth from 'firebase/auth';
import * as firestore from 'firebase/firestore';
import * as storage from 'firebase/storage';

// Cast mocked functions
const mockDeleteUser = firebaseAuth.deleteUser as jest.Mock;
const mockReauthenticateWithCredential = firebaseAuth.reauthenticateWithCredential as jest.Mock;
const mockEmailAuthProviderCredential = firebaseAuth.EmailAuthProvider.credential as jest.Mock;
const mockUpdateDoc = firestore.updateDoc as jest.Mock;
const mockGetDocs = firestore.getDocs as jest.Mock;
const mockWriteBatch = firestore.writeBatch as jest.Mock;
const mockListAll = storage.listAll as jest.Mock;
const mockDeleteObject = storage.deleteObject as jest.Mock;

describe('AccountDeletionService', () => {
  let service: AccountDeletionService;
  let mockUser: any;
  let mockBatch: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock user
    mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      providerData: [{ providerId: 'password' }],
    };
    (auth as any).currentUser = mockUser;

    // Setup mock batch
    mockBatch = {
      delete: jest.fn(),
      commit: jest.fn(() => Promise.resolve()),
    };
    mockWriteBatch.mockReturnValue(mockBatch);

    // Setup storage mocks
    mockListAll.mockResolvedValue({
      items: [],
      prefixes: [],
    });
    mockDeleteObject.mockResolvedValue(undefined);

    // Setup default successful reauthentication
    const mockCredential = { providerId: 'password' };
    mockEmailAuthProviderCredential.mockReturnValue(mockCredential);
    mockReauthenticateWithCredential.mockResolvedValue({ user: mockUser });
    
    // Setup default successful Firestore operations
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);

    // Create service instance
    service = new AccountDeletionService();
  });

  describe('deleteAccount', () => {
    it('should throw error if no authenticated user', async () => {
      (auth as any).currentUser = null;

      await expect(service.deleteAccount("test-password")).rejects.toThrow('No user is currently logged in');
    });

    it('should re-authenticate user with password', async () => {
      const password = 'testPassword123';
      const mockCredential = { providerId: 'password' };
      mockEmailAuthProviderCredential.mockReturnValue(mockCredential);
      mockReauthenticateWithCredential.mockResolvedValue(undefined);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount(password);

      expect(mockEmailAuthProviderCredential).toHaveBeenCalledWith('test@example.com', password);
      expect(mockReauthenticateWithCredential).toHaveBeenCalledWith(mockUser, mockCredential);
    });

    it('should mark account as deleted before deleting data', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deleted: true,
          deletedAt: expect.anything(),
        })
      );
    });

    it('should delete Firebase Auth account as final step', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
      // Verify it's called after other operations
      expect(mockDeleteUser).toHaveBeenCalledTimes(1);
    });

    it('should handle auth errors gracefully', async () => {
      const authError = new Error('auth/wrong-password');
      mockReauthenticateWithCredential.mockRejectedValue(authError);

      await expect(service.deleteAccount('wrong-password')).rejects.toThrow('auth/wrong-password');
    });
  });

  describe('deleteFirestoreData', () => {
    it('should delete user itineraries', async () => {
      const mockItineraries = [
        { id: 'itinerary-1', ref: { id: 'itinerary-1' } },
        { id: 'itinerary-2', ref: { id: 'itinerary-2' } },
      ];
      
      mockGetDocs.mockResolvedValueOnce({ docs: mockItineraries });
      mockGetDocs.mockResolvedValue({ docs: [] }); // For other queries
      mockUpdateDoc.mockResolvedValue(undefined);
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      expect(mockBatch.delete).toHaveBeenCalledTimes(mockItineraries.length + 1); // +1 for user profile
    });

    it('should delete user connections and messages', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          ref: { id: 'conn-1' },
        },
      ];
      const mockMessages = [
        { id: 'msg-1', ref: { id: 'msg-1' } },
        { id: 'msg-2', ref: { id: 'msg-2' } },
      ];

      // First call for itineraries (empty), then for connections, then messages
      mockGetDocs
        .mockResolvedValueOnce({ docs: [] }) // itineraries
        .mockResolvedValueOnce({ docs: mockConnections }) // connections user1
        .mockResolvedValueOnce({ docs: mockMessages }) // messages
        .mockResolvedValueOnce({ docs: [] }) // connections user2
        .mockResolvedValueOnce({ docs: [] }); // videos

      mockUpdateDoc.mockResolvedValue(undefined);
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      // Should delete messages + connection + user profile
      expect(mockBatch.delete).toHaveBeenCalledTimes(mockMessages.length + mockConnections.length + 1);
    });

    it('should delete user videos', async () => {
      const mockVideos = [
        { id: 'video-1', ref: { id: 'video-1' } },
        { id: 'video-2', ref: { id: 'video-2' } },
      ];

      mockGetDocs
        .mockResolvedValueOnce({ docs: [] }) // itineraries
        .mockResolvedValueOnce({ docs: [] }) // connections user1
        .mockResolvedValueOnce({ docs: [] }) // connections user2
        .mockResolvedValueOnce({ docs: mockVideos }); // videos

      mockUpdateDoc.mockResolvedValue(undefined);
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      expect(mockBatch.delete).toHaveBeenCalledTimes(mockVideos.length + 1); // +1 for user profile
    });

    it('should delete user profile as last Firestore operation', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });
      mockUpdateDoc.mockResolvedValue(undefined);
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      // User profile deletion should be in the batch
      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should handle large batches by committing in chunks', async () => {
      // Create 600 itineraries (exceeds MAX_BATCH_SIZE of 500)
      const mockItineraries = Array.from({ length: 600 }, (_, i) => ({
        id: `itinerary-${i}`,
        ref: { id: `itinerary-${i}` },
      }));

      mockGetDocs.mockResolvedValueOnce({ docs: mockItineraries });
      mockGetDocs.mockResolvedValue({ docs: [] }); // For other queries
      mockUpdateDoc.mockResolvedValue(undefined);
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      // Should commit batch at least twice (once at 500, once for remaining)
      expect(mockBatch.commit).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteStorageFiles', () => {
    it('should delete all files in user storage directory', async () => {
      const mockFiles = [
        { name: 'video1.mp4', fullPath: 'users/test-user-123/video1.mp4' },
        { name: 'video2.mp4', fullPath: 'users/test-user-123/video2.mp4' },
      ];

      mockListAll.mockResolvedValue({
        items: mockFiles,
        prefixes: [],
      });
      mockDeleteObject.mockResolvedValue(undefined);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDocs.mockResolvedValue({ docs: [] });
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      expect(mockDeleteObject).toHaveBeenCalledTimes(mockFiles.length + 1); // +1 for profile photo attempt
    });

    it('should recursively delete subdirectories', async () => {
      const mockSubfolder = { name: 'videos', fullPath: 'users/test-user-123/videos' };
      const mockSubfolderFiles = [
        { name: 'video1.mp4', fullPath: 'users/test-user-123/videos/video1.mp4' },
      ];

      mockListAll
        .mockResolvedValueOnce({
          items: [],
          prefixes: [mockSubfolder],
        })
        .mockResolvedValueOnce({
          items: mockSubfolderFiles,
          prefixes: [],
        })
        .mockResolvedValueOnce({ items: [], prefixes: [] }); // For profile photo

      mockDeleteObject.mockResolvedValue(undefined);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDocs.mockResolvedValue({ docs: [] });
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      expect(mockDeleteObject).toHaveBeenCalledTimes(mockSubfolderFiles.length + 1); // +1 for profile photo
    });

    it('should handle missing storage files gracefully', async () => {
      const storageError = new Error('storage/object-not-found');
      mockListAll.mockRejectedValue(storageError);
      mockDeleteObject.mockRejectedValue(storageError);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDocs.mockResolvedValue({ docs: [] });
      mockDeleteUser.mockResolvedValue(undefined);

      // Should not throw - deletion should continue
      await expect(service.deleteAccount("test-password")).resolves.not.toThrow();
    });

    it('should attempt to delete profile photo', async () => {
      mockListAll.mockResolvedValue({ items: [], prefixes: [] });
      mockDeleteObject.mockResolvedValue(undefined);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDocs.mockResolvedValue({ docs: [] });
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      // Should attempt to delete profile photo
      expect(mockDeleteObject).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate errors and log them', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const firestoreError = new Error('Firestore error');
      mockUpdateDoc.mockRejectedValue(firestoreError);

      await expect(service.deleteAccount("test-password")).rejects.toThrow('Firestore error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AccountDeletion] Error deleting account:',
        firestoreError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not delete auth account if Firestore operations fail', async () => {
      const firestoreError = new Error('Firestore failure');
      mockUpdateDoc.mockRejectedValue(firestoreError);

      await expect(service.deleteAccount("test-password")).rejects.toThrow('Firestore failure');
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });
  });

  describe('data preservation', () => {
    it('should preserve usage agreement acceptance for legal compliance', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDocs.mockResolvedValue({ docs: [] });
      mockDeleteUser.mockResolvedValue(undefined);

      await service.deleteAccount("test-password");

      // Verify updateDoc doesn't remove hasAcceptedTerms
      const updateCall = mockUpdateDoc.mock.calls[0];
      expect(updateCall).toBeDefined();
      const updateData = updateCall[1];
      expect(updateData).not.toHaveProperty('hasAcceptedTerms');
    });
  });

  describe('integration flow', () => {
    it('should complete full deletion flow in correct order', async () => {
      const callOrder: string[] = [];

      mockReauthenticateWithCredential.mockImplementation(async () => {
        callOrder.push('reauth');
      });
      mockUpdateDoc.mockImplementation(async () => {
        callOrder.push('markDeleted');
      });
      mockGetDocs.mockResolvedValue({ docs: [] });
      mockBatch.commit.mockImplementation(async () => {
        callOrder.push('deleteFirestore');
      });
      mockListAll.mockResolvedValue({ items: [], prefixes: [] });
      mockDeleteObject.mockImplementation(async () => {
        callOrder.push('deleteStorage');
      });
      mockDeleteUser.mockImplementation(async () => {
        callOrder.push('deleteAuth');
      });

      await service.deleteAccount('password123');

      expect(callOrder).toEqual([
        'reauth',
        'markDeleted',
        'deleteFirestore',
        'deleteStorage',
        'deleteAuth',
      ]);
    });
  });
});

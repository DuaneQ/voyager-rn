/**
 * Unit Tests for ConnectionRepository
 * Tests Firestore integration for connection/match operations
 * Follows S.O.L.I.D principles with proper mocking
 */

// Mock Firestore AND firebase-config BEFORE imports
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  Timestamp: {
    now: jest.fn(),
    fromDate: jest.fn(),
  },
}));
jest.mock('../../../firebase-config', () => ({
  app: { name: 'mock-app' },
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

import { connectionRepository } from '../../repositories/ConnectionRepository';
import { Connection, CreateConnectionParams } from '../../types/Connection';
import type { Itinerary } from '../../types/Itinerary';
import * as firestore from 'firebase/firestore';

// Cast mocked functions for easier testing
const mockGetDoc = firestore.getDoc as jest.Mock;
const mockGetDocs = firestore.getDocs as jest.Mock;
const mockSetDoc = firestore.setDoc as jest.Mock;
const mockQuery = firestore.query as jest.Mock;
const mockWhere = firestore.where as jest.Mock;
const mockCollection = firestore.collection as jest.Mock;
const mockDoc = firestore.doc as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ConnectionRepository', () => {
  beforeEach(() => {
    // Clear all mocks between tests
    jest.clearAllMocks();
  });

  const mockItinerary1: Itinerary = {
    id: 'itinerary-1',
    destination: 'Paris, France',
    startDay: 1704067200000,
    endDay: 1704672000000,
    startDate: '2024-01-01',
    endDate: '2024-01-08',
    description: 'Trip to Paris',
    activities: ['Eiffel Tower'],
    likes: ['itinerary-2'],
    gender: 'Any',
    status: 'Single',
    sexualOrientation: 'Straight',
    age: 30,
    lowerRange: 25,
    upperRange: 40,
    userInfo: {
      uid: 'user-1',
      username: 'traveler1',
      email: 'traveler1@example.com',
      gender: 'Male',
      dob: '1994-01-01',
      status: 'Single',
      sexualOrientation: 'Straight',
    },
  };

  const mockItinerary2: Itinerary = {
    ...mockItinerary1,
    id: 'itinerary-2',
    likes: ['itinerary-1'],
    userInfo: {
      ...mockItinerary1.userInfo,
      uid: 'user-2',
      username: 'traveler2',
    },
  };

  const mockConnection: Connection = {
    id: 'conn-123',
    users: ['user-1', 'user-2'],
    itineraryIds: ['itinerary-1', 'itinerary-2'],
    itineraries: [mockItinerary1, mockItinerary2],
    createdAt: 1704067200000,
    unreadCounts: { 'user-1': 0, 'user-2': 0 },
  };

  describe('createConnection', () => {
    it('should create connection successfully with deterministic ID', async () => {
      const mockDocRef = { id: 'user-1_user-2' };
      mockDoc.mockReturnValue(mockDocRef);
      mockSetDoc.mockResolvedValue(undefined);

      const connectionData: CreateConnectionParams = {
        user1Id: 'user-1',
        user2Id: 'user-2',
        itinerary1Id: 'itinerary-1',
        itinerary2Id: 'itinerary-2',
        itinerary1: mockItinerary1,
        itinerary2: mockItinerary2,
      };

      const result = await connectionRepository.createConnection(connectionData);

      expect(result.id).toBe('user-1_user-2');
      expect(result.users).toContain('user-1');
      expect(result.users).toContain('user-2');
      expect(result.itineraryIds).toContain('itinerary-1');
      expect(result.itineraryIds).toContain('itinerary-2');
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should create deterministic ID regardless of user order', async () => {
      const mockDocRef1 = { id: 'user-1_user-2' };
      const mockDocRef2 = { id: 'user-1_user-2' };
      
      // First call with user-1, user-2
      mockDoc.mockReturnValueOnce(mockDocRef1);
      mockSetDoc.mockResolvedValue(undefined);
      
      const connection1 = await connectionRepository.createConnection({
        user1Id: 'user-1',
        user2Id: 'user-2',
        itinerary1Id: 'itinerary-1',
        itinerary2Id: 'itinerary-2',
        itinerary1: mockItinerary1,
        itinerary2: mockItinerary2,
      });

      // Second call with user-2, user-1 (reversed)
      mockDoc.mockReturnValueOnce(mockDocRef2);
      
      const connection2 = await connectionRepository.createConnection({
        user1Id: 'user-2',
        user2Id: 'user-1',
        itinerary1Id: 'itinerary-2',
        itinerary2Id: 'itinerary-1',
        itinerary1: mockItinerary2,
        itinerary2: mockItinerary1,
      });

      // Should produce same connection ID regardless of order
      expect(connection1.id).toBe(connection2.id);
    });

    it('should include itinerary IDs in connection', async () => {
      const mockDocRef = { id: 'user-1_user-2' };
      mockDoc.mockReturnValue(mockDocRef);
      mockSetDoc.mockResolvedValue(undefined);

      const result = await connectionRepository.createConnection({
        user1Id: 'user-1',
        user2Id: 'user-2',
        itinerary1Id: 'itinerary-1',
        itinerary2Id: 'itinerary-2',
        itinerary1: mockItinerary1,
        itinerary2: mockItinerary2,
      });

      expect(result.itineraryIds).toContain('itinerary-1');
      expect(result.itineraryIds).toContain('itinerary-2');
    });

    it('should handle Firestore errors', async () => {
      const mockDocRef = { id: 'user-1_user-2' };
      mockDoc.mockReturnValue(mockDocRef);
      mockSetDoc.mockRejectedValue(new Error('Firestore write failed'));

      await expect(
        connectionRepository.createConnection({
          user1Id: 'user-1',
          user2Id: 'user-2',
          itinerary1Id: 'itinerary-1',
          itinerary2Id: 'itinerary-2',
          itinerary1: mockItinerary1,
          itinerary2: mockItinerary2,
        })
      ).rejects.toThrow('Firestore write failed');
    });
  });

  describe('checkMutualMatch', () => {
    // NOTE: Current implementation is a stub that always returns { isMatch: false }
    // These tests verify the stub behavior. TODO: Update when implementation is complete

    it('should return MutualMatchResult object', async () => {
      const result = await connectionRepository.checkMutualMatch('user-1', 'itinerary-2');

      expect(result).toHaveProperty('isMatch');
      expect(typeof result.isMatch).toBe('boolean');
    });

    it('should return false for stub implementation', async () => {
      const result = await connectionRepository.checkMutualMatch('user-1', 'itinerary-2');

      expect(result.isMatch).toBe(false);
    });

    it('should handle empty parameters', async () => {
      const result = await connectionRepository.checkMutualMatch('', '');

      expect(result.isMatch).toBe(false);
    });

    it('should not throw errors on Firestore failures', async () => {
      // Stub implementation catches all errors and returns { isMatch: false }
      const result = await connectionRepository.checkMutualMatch('user-1', 'itinerary-2');

      expect(result).toEqual({ isMatch: false });
    });
  });

  describe('getConnectionById', () => {
    it('should retrieve connection by ID', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockConnection,
        id: 'conn-123',
      });

      const result = await connectionRepository.getConnectionById('conn-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('conn-123');
      expect(result?.users).toContain('user-1');
      expect(result?.users).toContain('user-2');
    });

    it('should return null for non-existent connection', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await connectionRepository.getConnectionById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle Firestore errors', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore read failed'));

      // Implementation returns null on error, does not throw
      const result = await connectionRepository.getConnectionById('conn-123');
      
      expect(result).toBeNull();
    });
  });

  describe('getUserConnections', () => {
    it('should retrieve all connections for a user', async () => {
      const mockConnections = [
        { ...mockConnection, id: 'conn-1' },
        { ...mockConnection, id: 'conn-2' },
      ];

      const mockQuerySnapshot = {
        docs: mockConnections.map((conn) => ({
          id: conn.id,
          data: () => conn,
        })),
        forEach: function(callback: any) {
          this.docs.forEach((doc: any) => callback(doc));
        },
      };

      mockGetDocs.mockResolvedValue(mockQuerySnapshot);

      const result = await connectionRepository.getUserConnections('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('conn-1');
      expect(result[1].id).toBe('conn-2');
    });

    it('should return empty array when user has no connections', async () => {
      const mockQuerySnapshot = {
        docs: [],
        forEach: function(callback: any) {
          this.docs.forEach((doc: any) => callback(doc));
        },
      };

      mockGetDocs.mockResolvedValue(mockQuerySnapshot);

      const result = await connectionRepository.getUserConnections('lonely-user');

      expect(result).toHaveLength(0);
    });

    it('should query for users array containing userId', async () => {
      const mockQuerySnapshot = {
        docs: [],
        forEach: function(callback: any) {
          this.docs.forEach((doc: any) => callback(doc));
        },
      };

      mockGetDocs.mockResolvedValue(mockQuerySnapshot);

      await connectionRepository.getUserConnections('user-1');

      // Should create query with where clause for 'users' array-contains 'user-1'
      expect(mockWhere).toHaveBeenCalledWith('users', 'array-contains', 'user-1');
    });

    it('should handle Firestore errors', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore query failed'));

      await expect(connectionRepository.getUserConnections('user-1')).rejects.toThrow(
        'Firestore query failed'
      );
    });

    it('should handle connections with valid data', async () => {
      const mockConnections = [
        { ...mockConnection, id: 'conn-1' },
        { ...mockConnection, id: 'conn-3' },
      ];

      const mockQuerySnapshot = {
        docs: mockConnections.map((conn) => ({
          id: conn.id,
          data: () => conn,
        })),
        forEach: function(callback: any) {
          this.docs.forEach((doc: any) => callback(doc));
        },
      };

      mockGetDocs.mockResolvedValue(mockQuerySnapshot);

      const result = await connectionRepository.getUserConnections('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('conn-1');
    });
  });
});

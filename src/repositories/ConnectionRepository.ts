/**
 * Connection Repository
 * Data access layer for connection operations using Firestore
 * Handles mutual match detection and connection creation
 */

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { app } from '../../firebase-config';
import {
  Connection,
  CreateConnectionParams,
  CreateConnectionResponse,
  MutualMatchResult
} from '../types/Connection';
import { Itinerary } from '../types/Itinerary';

/**
 * Repository interface for connection operations
 */
export interface IConnectionRepository {
  createConnection(params: CreateConnectionParams): Promise<Connection>;
  checkMutualMatch(userId: string, theirItineraryId: string): Promise<MutualMatchResult>;
  getConnectionById(connectionId: string): Promise<Connection | null>;
  getUserConnections(userId: string): Promise<Connection[]>;
  markMessagesAsRead(connectionId: string, userId: string): Promise<void>;
}

/**
 * Firestore implementation of ConnectionRepository
 */
export class FirestoreConnectionRepository implements IConnectionRepository {
  private db = getFirestore(app);
  private connectionsCollection = 'connections';

  /**
   * Create a new connection between two users
   * @param params - Connection parameters (user IDs, itinerary IDs, itinerary objects)
   * @returns Created connection object
   */
  async createConnection(params: CreateConnectionParams): Promise<Connection> {
    try {
      const { user1Id, user2Id, itinerary1Id, itinerary2Id, itinerary1, itinerary2 } = params;

      // Validate parameters
      if (!user1Id || !user2Id || !itinerary1Id || !itinerary2Id) {
        throw new Error('Missing required connection parameters');
      }

      // Generate connection ID (deterministic based on user IDs sorted alphabetically)
      const sortedUsers = [user1Id, user2Id].sort();
      const connectionId = `${sortedUsers[0]}_${sortedUsers[1]}`;

      // Check if connection already exists
      const existingConnection = await this.getConnectionById(connectionId);
      if (existingConnection) {
        
        return existingConnection;
      }

      // Create connection object
      const connection: Connection = {
        id: connectionId,
        users: [user1Id, user2Id],
        itineraryIds: [itinerary1Id, itinerary2Id],
        itineraries: [itinerary1, itinerary2],
        createdAt: Timestamp.now(),
        unreadCounts: {
          [user1Id]: 0,
          [user2Id]: 0
        }
      };

      // Save to Firestore
      const connectionRef = doc(this.db, this.connectionsCollection, connectionId);
      await setDoc(connectionRef, connection);

      return connection;
    } catch (error: any) {
      console.error('[ConnectionRepository] createConnection error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to create connection. Please try again.');
    }
  }

  /**
   * Check if a mutual match exists
   * Checks if the other user has liked the current user's itinerary
   * @param userId - Current user's ID
   * @param theirItineraryId - The other user's itinerary ID that current user liked
   * @returns Match result with connection ID if match exists
   */
  async checkMutualMatch(
    userId: string,
    theirItineraryId: string
  ): Promise<MutualMatchResult> {
    try {
      if (!userId || !theirItineraryId) {
        throw new Error('Invalid parameters for mutual match check');
      }

      // Get the other user's itinerary to check if they liked current user's itinerary
      // This would require fetching user's itineraries and checking their likes
      // For now, return a simple check structure
      // TODO: Implement full mutual match detection logic

      return {
        isMatch: false
      };
    } catch (error: any) {
      console.error('[ConnectionRepository] checkMutualMatch error:', error);
      
      return {
        isMatch: false
      };
    }
  }

  /**
   * Get a connection by ID
   * @param connectionId - Connection ID to fetch
   * @returns Connection object or null if not found
   */
  async getConnectionById(connectionId: string): Promise<Connection | null> {
    try {
      if (!connectionId || typeof connectionId !== 'string') {
        throw new Error('Invalid connection ID');
      }

      const connectionRef = doc(this.db, this.connectionsCollection, connectionId);
      const connectionSnap = await getDoc(connectionRef);

      if (!connectionSnap.exists()) {
        return null;
      }

      return connectionSnap.data() as Connection;
    } catch (error: any) {
      console.error('[ConnectionRepository] getConnectionById error:', error);
      return null;
    }
  }

  /**
   * Get all connections for a user
   * @param userId - User ID to fetch connections for
   * @returns Array of connections
   */
  async getUserConnections(userId: string): Promise<Connection[]> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID');
      }

      // Query connections where user is in the users array
      const connectionsRef = collection(this.db, this.connectionsCollection);
      const q = query(connectionsRef, where('users', 'array-contains', userId));
      const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);

      const connections: Connection[] = [];
      querySnapshot.forEach((doc) => {
        connections.push(doc.data() as Connection);
      });

      return connections;
    } catch (error: any) {
      console.error('[ConnectionRepository] getUserConnections error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to fetch connections. Please try again.');
    }
  }

  /**
   * Mark all messages as read for a user in a connection
   * Resets the unread count to 0 for the specified user
   * @param connectionId - Connection ID
   * @param userId - User ID to reset unread count for
   */
  async markMessagesAsRead(connectionId: string, userId: string): Promise<void> {
    try {
      if (!connectionId || !userId) {
        throw new Error('Invalid connection ID or user ID');
      }

      const connectionRef = doc(this.db, this.connectionsCollection, connectionId);
      await updateDoc(connectionRef, {
        [`unreadCounts.${userId}`]: 0
      });

    } catch (error: any) {
      console.error('[ConnectionRepository] markMessagesAsRead error:', error);
      // Don't throw - this is a non-critical operation
    }
  }
}

/**
 * Singleton instance of the repository
 */
export const connectionRepository = new FirestoreConnectionRepository();

export default connectionRepository;

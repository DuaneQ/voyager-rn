/**
 * Connection types for React Native
 * Matches PWA Connection interface for compatibility with shared Firebase backend
 * Connections represent mutual matches between users
 */

import { Itinerary } from './Itinerary';

/**
 * Firestore Timestamp representation
 * Can be either native Firestore Timestamp or plain object with seconds/nanoseconds
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
  toMillis?: () => number;
}

/**
 * Connection between two users who mutually liked each other's itineraries
 * Stored in Firestore `connections` collection
 */
export interface Connection {
  id: string;
  users: string[]; // Array of 2 user IDs
  itineraryIds: string[]; // Array of 2 itinerary IDs that matched
  itineraries: Itinerary[]; // Full itinerary objects for reference
  createdAt: FirestoreTimestamp | Date | number; // When the match occurred
  unreadCounts: { [userId: string]: number }; // Unread message count per user
  addedUsers?: Array<{
    userId: string;
    addedBy: string; // User ID who added them
  }>;
  lastMessagePreview?: {
    text?: string;
    sender?: string;
    createdAt?: FirestoreTimestamp | Date;
    imageUrl?: string;
  };
}

/**
 * Parameters for creating a new connection
 */
export interface CreateConnectionParams {
  user1Id: string;
  user2Id: string;
  itinerary1Id: string;
  itinerary2Id: string;
  itinerary1: Itinerary;
  itinerary2: Itinerary;
}

/**
 * Response from connection creation
 */
export interface CreateConnectionResponse {
  success: boolean;
  data?: Connection;
  error?: string;
  message?: string;
}

/**
 * Match detection result
 */
export interface MutualMatchResult {
  isMatch: boolean;
  connectionId?: string;
  matchedItinerary?: Itinerary;
}

export default Connection;

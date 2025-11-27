/**
 * Message types for React Native
 * Matches PWA Message interface for compatibility with shared Firebase backend
 */

import { FirestoreTimestamp } from './Connection';

/**
 * Chat message in a connection thread
 * Stored in Firestore `connections/{connectionId}/messages` subcollection
 */
export interface Message {
  id: string;
  sender: string; // User ID of the sender
  text: string; // Message text content
  imageUrl?: string; // Optional image URL for media messages
  createdAt: FirestoreTimestamp | Date | number; // Message timestamp
  readBy: string[]; // Array of user IDs who have read this message
  clientMessageId?: string; // Client-generated ID for idempotency and optimistic updates
  pending?: boolean; // True while upload is in progress (for optimistic UI)
}

/**
 * Parameters for creating a new message
 */
export interface CreateMessageParams {
  connectionId: string;
  sender: string;
  text: string;
  imageUrl?: string;
  clientMessageId?: string;
}

/**
 * Optimistic message for UI updates before server confirmation
 */
export interface OptimisticMessage extends Message {
  pending: true;
  clientMessageId: string;
}

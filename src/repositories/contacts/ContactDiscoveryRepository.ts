/**
 * ContactDiscoveryRepository.ts - Repository for Contact Discovery Cloud Functions
 * 
 * Calls Firebase Cloud Functions:
 * - matchContactsWithUsers: Match hashed contacts against users
 * - sendContactInvite: Send invite and generate referral code
 * 
 * Uses httpsCallable with mundo1-dev deployment
 */

import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { app } from '../../../firebase-config';

// ============================================================================
// Type Definitions (Match Cloud Function contracts)
// ============================================================================

export interface MatchedContact {
  hash: string;
  userId: string;
  displayName: string;
  username?: string;
  profilePhotoUrl?: string;
}

export interface MatchContactsResponse {
  success: boolean;
  matches: MatchedContact[];
  totalHashes: number;
  totalMatches: number;
  error?: string;
}

export interface SendInviteResponse {
  success: boolean;
  referralCode: string;
  inviteLink: string;
  error?: string;
}

export type InviteMethod = 'sms' | 'email' | 'link' | 'share';

// ============================================================================
// Repository Implementation
// ============================================================================

export class ContactDiscoveryRepository {
  private functions;

  constructor() {
    this.functions = getFunctions(app, 'us-central1');
  }

  /**
   * Match hashed contacts against Firebase users
   * 
   * @param hashedIdentifiers - Array of SHA-256 hashed phone numbers and emails
   * @returns Matched contacts with user info
   * 
   * @throws Error if request fails or rate limit exceeded
   * 
   * Rate Limit: 1000 hashes per request (server-enforced)
   * Performance: Batched Firestore queries (10 hashes per batch)
   */
  async matchContacts(hashedIdentifiers: string[]): Promise<MatchedContact[]> {
    try {
      // Validate input
      if (!hashedIdentifiers || hashedIdentifiers.length === 0) {
        return [];
      }

      // Call Cloud Function
      const matchFunction = httpsCallable<
        { hashedIdentifiers: string[] },
        MatchContactsResponse
      >(this.functions, 'matchContactsWithUsers');

      const result: HttpsCallableResult<MatchContactsResponse> = await matchFunction({
        hashedIdentifiers,
      });

      const response = result.data;

      if (!response.success) {
        throw new Error(response.error || 'Failed to match contacts');
      }

      return response.matches;
    } catch (error: any) {
      // Map Firebase error codes to user-friendly messages
      if (error.code === 'functions/unauthenticated') {
        throw new Error('You must be signed in to match contacts');
      }
      
      if (error.code === 'functions/invalid-argument') {
        throw new Error('Invalid contact data format');
      }
      
      if (error.code === 'functions/resource-exhausted') {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Re-throw with original message
      throw new Error(error.message || 'Failed to match contacts');
    }
  }

  /**
   * Send invite to contact and generate referral code
   * 
   * @param contactIdentifier - SHA-256 hashed phone or email
   * @param inviteMethod - How invite will be sent (sms, email, link, share)
   * @param contactName - Optional display name (not stored on server)
   * @returns Referral code and invite link
   * 
   * @throws Error if request fails or rate limit exceeded
   * 
   * Rate Limit: 100 invites per day per user (server-enforced)
   * Deduplication: Same contact within 7 days returns existing referral code
   */
  async sendInvite(
    contactIdentifier: string,
    inviteMethod: InviteMethod,
    contactName?: string
  ): Promise<SendInviteResponse> {
    try {
      // Validate input
      if (!contactIdentifier) {
        throw new Error('Contact identifier is required');
      }

      // Call Cloud Function
      const inviteFunction = httpsCallable<
        { 
          contactIdentifier: string;
          inviteMethod: InviteMethod;
          contactName?: string;
        },
        SendInviteResponse
      >(this.functions, 'sendContactInvite');

      const result: HttpsCallableResult<SendInviteResponse> = await inviteFunction({
        contactIdentifier,
        inviteMethod,
        contactName,
      });

      const response = result.data;

      if (!response.success) {
        throw new Error(response.error || 'Failed to send invite');
      }

      return response;
    } catch (error: any) {
      // Map Firebase error codes to user-friendly messages
      if (error.code === 'functions/unauthenticated') {
        throw new Error('You must be signed in to send invites');
      }
      
      if (error.code === 'functions/invalid-argument') {
        throw new Error('Invalid contact data format');
      }
      
      if (error.code === 'functions/resource-exhausted') {
        throw new Error('Daily invite limit reached (100/day). Try again tomorrow.');
      }

      // Re-throw with original message
      throw new Error(error.message || 'Failed to send invite');
    }
  }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

let repositoryInstance: ContactDiscoveryRepository | null = null;

/**
 * Get singleton instance of ContactDiscoveryRepository
 */
export function getContactDiscoveryRepository(): ContactDiscoveryRepository {
  if (!repositoryInstance) {
    repositoryInstance = new ContactDiscoveryRepository();
  }
  return repositoryInstance;
}

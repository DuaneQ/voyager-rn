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

/**
 * Cloud Function response for a single matched contact
 * Includes hash for correlation with request
 */
export interface MatchedContactResult {
  hash: string;
  userId: string;
  displayName: string;
  username?: string;
  profilePhotoUrl?: string;
}

export interface MatchContactsResponse {
  success: boolean;
  matches: MatchedContactResult[];
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

export type InviteMethodType = 'sms' | 'email' | 'link' | 'share';

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
  async matchContacts(hashedIdentifiers: string[]): Promise<MatchedContactResult[]> {
    try {
      // Validate input
      if (!hashedIdentifiers || hashedIdentifiers.length === 0) {
        console.log('[ContactDiscoveryRepository] Empty hashedIdentifiers array');
        return [];
      }

      // Validate hash format (SHA-256 = 64 hex chars)
      const invalidHashes = hashedIdentifiers.filter(h => !/^[a-f0-9]{64}$/i.test(h));
      if (invalidHashes.length > 0) {
        console.error('[ContactDiscoveryRepository] Invalid hash formats detected:', invalidHashes.slice(0, 3));
        throw new Error(`Invalid hash format: Found ${invalidHashes.length} invalid hashes`);
      }

      console.log(`[ContactDiscoveryRepository] Matching ${hashedIdentifiers.length} hashes`);
      console.log('[ContactDiscoveryRepository] Sample hashes:', hashedIdentifiers.slice(0, 2));

      // Call Cloud Function
      const matchFunction = httpsCallable<
        { hashedIdentifiers: string[] },
        MatchContactsResponse
      >(this.functions, 'matchContactsWithUsers');

      const payload = { hashedIdentifiers };
      console.log('[ContactDiscoveryRepository] Sending payload:', {
        hashCount: payload.hashedIdentifiers.length,
        firstHashLength: payload.hashedIdentifiers[0]?.length,
        isArray: Array.isArray(payload.hashedIdentifiers),
        sampleHashes: payload.hashedIdentifiers.slice(0, 2),
        allHashesAreStrings: payload.hashedIdentifiers.every(h => typeof h === 'string'),
      });

      // Add timeout wrapper (30 seconds - generous for slow WiFi)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Network request timed out. Please check your internet connection.')), 30000);
      });

      const result: HttpsCallableResult<MatchContactsResponse> = await Promise.race([
        matchFunction(payload),
        timeoutPromise
      ]);

      const response = result.data;

      if (!response.success) {
        console.error('[ContactDiscoveryRepository] Match failed:', response.error);
        throw new Error(response.error || 'Failed to match contacts');
      }

      console.log(`[ContactDiscoveryRepository] Found ${response.matches.length} matches`);
      return response.matches;
    } catch (error: any) {
      console.error('============================================');
      console.error('[ContactDiscoveryRepository] matchContacts ERROR');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Full error:', JSON.stringify(error, null, 2));
      console.error('============================================');
      
      // Map Firebase error codes to user-friendly messages
      if (error.code === 'functions/unauthenticated') {
        throw new Error('You must be signed in to match contacts');
      }
      
      if (error.code === 'functions/invalid-argument') {
        // Include the detailed error message from the function
        throw new Error(error.message || 'Invalid contact data format');
      }
      
      if (error.code === 'functions/resource-exhausted') {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Network errors (common on WiFi-only devices)
      if (error.code === 'functions/unavailable' || error.message?.includes('network') || error.message?.includes('timeout')) {
        throw new Error('Network error. Please check your internet connection and try again.');
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
    inviteMethod: InviteMethodType,
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
          inviteMethod: InviteMethodType;
          contactName?: string;
        },
        SendInviteResponse
      >(this.functions, 'sendContactInvite');

      // Add timeout wrapper (20 seconds - SMS/email generation is fast)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Network request timed out. Please check your internet connection.')), 20000);
      });

      const result: HttpsCallableResult<SendInviteResponse> = await Promise.race([
        inviteFunction({
          contactIdentifier,
          inviteMethod,
          contactName,
        }),
        timeoutPromise
      ]);

      const response = result.data;

      if (!response.success) {
        throw new Error(response.error || 'Failed to send invite');
      }

      return response;
    } catch (error: any) {
      console.error('============================================');
      console.error('[ContactDiscoveryRepository] sendInvite ERROR');
      console.error('============================================');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Full error:', JSON.stringify(error, null, 2));
      console.error('============================================');
      
      // Map Firebase error codes to user-friendly messages
      if (error.code === 'functions/unauthenticated') {
        throw new Error('You must be signed in to send invites');
      }
      
      if (error.code === 'functions/invalid-argument') {
        // Include the detailed error message from the function
        throw new Error(error.message || 'Invalid contact data format');
      }
      
      if (error.code === 'functions/resource-exhausted') {
        throw new Error('Daily invite limit reached (100/day). Try again tomorrow.');
      }

      // Network errors (common on WiFi-only devices)
      if (error.code === 'functions/unavailable' || error.message?.includes('network') || error.message?.includes('timeout')) {
        throw new Error('Network error. Please check your internet connection and try again.');
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

/**
 * ContactsService.ts - Main contact discovery orchestrator
 * 
 * Coordinates contact fetching, hashing, and matching following S.O.L.I.D principles:
 * - Single Responsibility: Only handles contact discovery flow
 * - Open/Closed: Extensible via platform providers
 * - Liskov Substitution: Any IContactsPlatformProvider works
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Depends on abstractions, not concrete implementations
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IContactsPlatformProvider } from './platform/IContactsPlatformProvider';
import { MobileContactsProvider } from './platform/MobileContactsProvider';
import { WebContactsProvider } from './platform/WebContactsProvider';
import { IHashingService, HashingService } from './HashingService';
import { ContactDiscoveryRepository } from '../../repositories/contacts/ContactDiscoveryRepository';
import {
  RawContact,
  HashedContact,
  ContactSyncResult,
  ContactPermissionStatus,
  MatchedContact,
  UnmatchedContact,
} from './types';

// Cache configuration
const CACHE_KEY = '@contacts_sync_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface IContactsService {
  requestPermission(): Promise<ContactPermissionStatus>;
  getPermissionStatus(): Promise<ContactPermissionStatus>;
  syncContacts(forceRefresh?: boolean): Promise<ContactSyncResult>;
  clearCache(): Promise<void>;
  isSupported(): boolean;
}

export class ContactsService implements IContactsService {
  private platformProvider: IContactsPlatformProvider;
  private hashingService: IHashingService;
  private repository: ContactDiscoveryRepository;

  constructor(
    platformProvider?: IContactsPlatformProvider,
    hashingService?: IHashingService,
    repository?: ContactDiscoveryRepository
  ) {
    // Dependency Injection with default platform-specific provider
    this.platformProvider = platformProvider || this.getDefaultProvider();
    this.hashingService = hashingService || new HashingService();
    this.repository = repository || new ContactDiscoveryRepository();
  }

  async requestPermission(): Promise<ContactPermissionStatus> {
    return this.platformProvider.requestPermission();
  }

  async getPermissionStatus(): Promise<ContactPermissionStatus> {
    return this.platformProvider.getPermissionStatus();
  }

  /**
   * Main contact sync flow:
   * 1. Check cache (unless forceRefresh=true)
   * 2. Check permission
   * 3. Fetch contacts from device
   * 4. Hash phone numbers and emails
   * 5. Send hashes to server for matching
   * 6. Cache results for 24 hours
   * 7. Return matched and unmatched contacts
   * 
   * @param forceRefresh - Skip cache and force full sync
   */
  async syncContacts(forceRefresh = false): Promise<ContactSyncResult> {
    // Check cache first (95%+ cost savings on repeat syncs)
    if (!forceRefresh) {
      const cachedResult = await this.getCachedResult();
      if (cachedResult) {
        console.log('[ContactsService] Returning cached sync result');
        return cachedResult;
      }
    }
    const errors: string[] = [];
    
    try {
      // Step 1: Verify permission
      const permissionStatus = await this.getPermissionStatus();
      if (permissionStatus !== ContactPermissionStatus.GRANTED) {
        throw new Error('Contact permission not granted');
      }

      // Step 2: Fetch raw contacts
      const rawContacts = await this.platformProvider.getAllContacts();
      
      if (rawContacts.length === 0) {
        return {
          totalContactsScanned: 0,
          totalHashesGenerated: 0,
          matched: [],
          unmatched: [],
          syncedAt: new Date(),
        };
      }

      // Step 3: Hash contacts
      const hashedContacts = await this.hashContacts(rawContacts, errors);

      // Step 4: Extract all hashes for server matching
      const allHashes = hashedContacts.flatMap(c => c.hashedIdentifiers);
      
      // Validate hashes are proper SHA-256 format (64 hex characters)
      const validHashes = allHashes.filter(hash => {
        const isValid = /^[a-f0-9]{64}$/i.test(hash);
        if (!isValid) {
          console.warn('[ContactsService] Invalid hash format:', hash);
        }
        return isValid;
      });
      
      if (validHashes.length !== allHashes.length) {
        console.warn(`[ContactsService] Filtered ${allHashes.length - validHashes.length} invalid hashes`);
        errors.push(`Filtered ${allHashes.length - validHashes.length} invalid hashes`);
      }
      
      // Validate we have valid hashes before calling server
      if (validHashes.length === 0) {
        console.log('[ContactsService] No valid hashes generated from contacts');
        return {
          totalContactsScanned: rawContacts.length,
          totalHashesGenerated: 0,
          matched: [],
          unmatched: [],
          syncedAt: new Date(),
          errors: errors.length > 0 ? errors : ['No phone numbers or emails found in contacts'],
        };
      }

      console.log(`[ContactsService] Matching ${validHashes.length} valid hashes against server`);
      
      // Step 5: Match with server via Cloud Function (with batching for large contact lists)
      // Cloud Function has a rate limit of 1000 hashes per request
      // Users with >1000 contacts need batched requests to stay under the limit
      const BATCH_SIZE = 1000;
      const allMatchResults: any[] = [];
      
      if (validHashes.length <= BATCH_SIZE) {
        // Small contact list: single request
        const matchResults = await this.repository.matchContacts(validHashes);
        allMatchResults.push(...matchResults);
      } else {
        // Large contact list: batch requests
        const batchCount = Math.ceil(validHashes.length / BATCH_SIZE);
        console.log(`[ContactsService] Batching ${validHashes.length} hashes into ${batchCount} requests`);
        
        for (let i = 0; i < validHashes.length; i += BATCH_SIZE) {
          const batch = validHashes.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          console.log(`[ContactsService] Processing batch ${batchNum}/${batchCount} (${batch.length} hashes)`);
          
          try {
            const batchResults = await this.repository.matchContacts(batch);
            allMatchResults.push(...batchResults);
          } catch (error) {
            console.error(`[ContactsService] Batch ${batchNum} failed:`, error);
            errors.push(`Batch ${batchNum} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
      
      // Step 6: Convert repository matches to domain model
      const matched: MatchedContact[] = allMatchResults.map(m => ({
        userId: m.userId,
        displayName: m.displayName,
        username: m.username,
        profilePhotoUrl: m.profilePhotoUrl,
      }));
      
      // Step 7: Extract unmatched contacts (all contacts not in matched set)
      const matchedHashes = new Set(allMatchResults.map(m => m.hash));
      const unmatchedContacts = hashedContacts.filter(hc => 
        !hc.hashedIdentifiers.some(h => matchedHashes.has(h))
      );
      const unmatched: UnmatchedContact[] = this.extractUnmatchedFromHashed(
        unmatchedContacts, 
        rawContacts
      );

      const result: ContactSyncResult = {
        totalContactsScanned: rawContacts.length,
        totalHashesGenerated: hashedContacts.length,
        matched,
        unmatched,
        syncedAt: new Date(),
        errors: errors.length > 0 ? errors : undefined,
      };

      // Cache the successful result
      await this.cacheResult(result);

      return result;
    } catch (error) {
      errors.push(`Sync failed: ${error}`);
      throw new Error(`Contact sync failed: ${error}`);
    }
  }

  isSupported(): boolean {
    return this.platformProvider.isSupported();
  }

  /**
   * Hash all phone numbers and emails from contacts
   */
  private async hashContacts(
    contacts: RawContact[],
    errors: string[]
  ): Promise<HashedContact[]> {
    const hashed: HashedContact[] = [];

    for (const contact of contacts) {
      const hashedIdentifiers: string[] = [];

      // Hash phone numbers
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        for (const phone of contact.phoneNumbers) {
          try {
            // Validate phone is a non-empty string
            if (typeof phone !== 'string' || !phone.trim()) {
              console.warn(`[ContactsService] Skipping invalid phone (${typeof phone}) for ${contact.name}`);
              continue;
            }
            
            // Check if phone has any digits
            if (!/\d/.test(phone)) {
              console.warn(`[ContactsService] Skipping phone with no digits for ${contact.name}: "${phone}"`);
              continue;
            }
            
            const hash = await this.hashingService.hashPhoneNumber(phone);
            hashedIdentifiers.push(hash);
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.warn(`[ContactsService] Failed to hash phone for ${contact.name}: ${errMsg}`);
            errors.push(`Failed to hash phone for ${contact.name}: ${errMsg}`);
          }
        }
      }

      // Hash emails
      if (contact.emails && contact.emails.length > 0) {
        for (const email of contact.emails) {
          try {
            // Validate email is a non-empty string
            if (typeof email !== 'string' || !email.trim()) {
              console.warn(`[ContactsService] Skipping invalid email (${typeof email}) for ${contact.name}`);
              continue;
            }
            
            // Check if email has @ symbol
            if (!email.includes('@')) {
              console.warn(`[ContactsService] Skipping invalid email format for ${contact.name}: "${email}"`);
              continue;
            }
            
            const hash = await this.hashingService.hashEmail(email);
            hashedIdentifiers.push(hash);
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.warn(`[ContactsService] Failed to hash email for ${contact.name}: ${errMsg}`);
            errors.push(`Failed to hash email for ${contact.name}: ${errMsg}`);
          }
        }
      }

      // Only add if we successfully hashed at least one identifier
      if (hashedIdentifiers.length > 0) {
        hashed.push({
          originalId: contact.id,
          name: contact.name,
          hashedIdentifiers,
          hashedAt: new Date(),
        });
      }
    }

    return hashed;
  }

  /**
   * Extract unmatched contacts for invite list from hashed contacts
   */
  private extractUnmatchedFromHashed(
    hashedContacts: HashedContact[], 
    rawContacts: RawContact[]
  ): UnmatchedContact[] {
    return hashedContacts.flatMap(hc => {
      const rawContact = rawContacts.find(rc => rc.id === hc.originalId);
      if (!rawContact) return [];
      
      const results: UnmatchedContact[] = [];
      
      // Prefer phone numbers
      if (rawContact.phoneNumbers && rawContact.phoneNumbers.length > 0) {
        results.push({
          contactId: rawContact.id,
          name: rawContact.name,
          identifier: rawContact.phoneNumbers[0],
          identifierType: 'phone' as const,
        });
      }
      // Fallback to email
      else if (rawContact.emails && rawContact.emails.length > 0) {
        results.push({
          contactId: rawContact.id,
          name: rawContact.name,
          identifier: rawContact.emails[0],
          identifierType: 'email' as const,
        });
      }
      
      return results;
    });
  }

  /**
   * Get cached sync result if available and not expired
   */
  private async getCachedResult(): Promise<ContactSyncResult | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) {
        console.log('[ContactsService] No cached result found');
        return null;
      }

      const parsed = JSON.parse(cached);
      const cachedAt = new Date(parsed.cachedAt);
      const now = new Date();
      const age = now.getTime() - cachedAt.getTime();

      if (age > CACHE_TTL_MS) {
        console.log(`[ContactsService] Cache expired (${Math.round(age / 1000 / 60 / 60)}h old)`);
        await this.clearCache();
        return null;
      }

      console.log(`[ContactsService] Cache hit (${Math.round(age / 1000 / 60)}m old)`);
      
      // Reconstruct ContactSyncResult with proper Date objects
      return {
        ...parsed.result,
        syncedAt: new Date(parsed.result.syncedAt),
        fromCache: true, // Add flag to indicate cached result
      };
    } catch (error) {
      console.error('[ContactsService] Cache read error:', error);
      await this.clearCache();
      return null;
    }
  }

  /**
   * Cache sync result with timestamp
   */
  private async cacheResult(result: ContactSyncResult): Promise<void> {
    try {
      const cacheData = {
        result,
        cachedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('[ContactsService] Cached sync result');
    } catch (error) {
      console.error('[ContactsService] Cache write error:', error);
      // Non-critical error - don't throw
    }
  }

  /**
   * Clear cached sync result (public API)
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log('[ContactsService] Cache cleared');
    } catch (error) {
      console.error('[ContactsService] Cache clear error:', error);
    }
  }

  /**
   * Platform detection for default provider
   */
  private getDefaultProvider(): IContactsPlatformProvider {
    if (Platform.OS === 'web') {
      return new WebContactsProvider();
    }
    // iOS and Android use same provider
    return new MobileContactsProvider();
  }
}

// Export singleton instance
export const contactsService = new ContactsService();

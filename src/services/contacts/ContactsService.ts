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
import { IContactsPlatformProvider } from './platform/IContactsPlatformProvider';
import { MobileContactsProvider } from './platform/MobileContactsProvider';
import { WebContactsProvider } from './platform/WebContactsProvider';
import { IHashingService, HashingService } from './HashingService';
import {
  RawContact,
  HashedContact,
  ContactSyncResult,
  ContactPermissionStatus,
} from './types';

export interface IContactsService {
  requestPermission(): Promise<ContactPermissionStatus>;
  getPermissionStatus(): Promise<ContactPermissionStatus>;
  // Keep optional forceRefresh parameter for backwards compatibility
  syncContacts(forceRefresh?: boolean): Promise<ContactSyncResult>;
  // Compatibility shim: clear any local caches (may be a no-op)
  clearCache(): Promise<void>;
  isSupported(): boolean;
}

export class ContactsService implements IContactsService {
  private platformProvider: IContactsPlatformProvider;
  private hashingService: IHashingService;

  constructor(
    platformProvider?: IContactsPlatformProvider,
    hashingService?: IHashingService
  ) {
    // Dependency Injection with default platform-specific provider
    this.platformProvider = platformProvider || this.getDefaultProvider();
    this.hashingService = hashingService || new HashingService();
  }

  async requestPermission(): Promise<ContactPermissionStatus> {
    return this.platformProvider.requestPermission();
  }

  async getPermissionStatus(): Promise<ContactPermissionStatus> {
    return this.platformProvider.getPermissionStatus();
  }

  /**
   * Main contact sync flow:
   * 1. Check permission
   * 2. Fetch contacts from device
   * 3. Hash phone numbers and emails
   * 4. Send hashes to server for matching
   * 5. Return matched and unmatched contacts
   */
  // Accept optional forceRefresh for compatibility; current implementation
  // ignores it and always performs a fresh sync.
  async syncContacts(forceRefresh = false): Promise<ContactSyncResult> {
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

      // Step 4: Match with server (placeholder - will implement with Cloud Function)
      // For now, return empty matches (Phase 2 will add server matching)
      const matched = []; // TODO: Call Cloud Function
      const unmatched = this.extractUnmatchedContacts(rawContacts);

      return {
        totalContactsScanned: rawContacts.length,
        totalHashesGenerated: hashedContacts.length,
        matched,
        unmatched,
        syncedAt: new Date(),
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      errors.push(`Sync failed: ${error}`);
      throw new Error(`Contact sync failed: ${error}`);
    }
  }

  /**
   * Compatibility method: clear any cached contact sync state.
   * The previous implementation used AsyncStorage; current branch may
   * not persist caches — provide a no-op implementation so callers
   * (e.g. ProfilePage) don't throw.
   */
  async clearCache(): Promise<void> {
    // Intentionally no-op for now. If caching is re-introduced,
    // implement removal of CACHE_KEY and related items here.
    return;
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
            const hash = await this.hashingService.hashPhoneNumber(phone);
            hashedIdentifiers.push(hash);
          } catch (error) {
            errors.push(`Failed to hash phone for ${contact.name}: ${error}`);
          }
        }
      }

      // Hash emails
      if (contact.emails && contact.emails.length > 0) {
        for (const email of contact.emails) {
          try {
            const hash = await this.hashingService.hashEmail(email);
            hashedIdentifiers.push(hash);
          } catch (error) {
            errors.push(`Failed to hash email for ${contact.name}: ${error}`);
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
   * Extract unmatched contacts for invite list
   */
  private extractUnmatchedContacts(contacts: RawContact[]) {
    return contacts.flatMap(contact => {
      const results = [];
      
      // Prefer phone numbers
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        results.push({
          contactId: contact.id,
          name: contact.name,
          identifier: contact.phoneNumbers[0],
          identifierType: 'phone' as const,
        });
      }
      // Fallback to email
      else if (contact.emails && contact.emails.length > 0) {
        results.push({
          contactId: contact.id,
          name: contact.name,
          identifier: contact.emails[0],
          identifierType: 'email' as const,
        });
      }
      
      return results;
    });
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

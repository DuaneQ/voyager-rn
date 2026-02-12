/**
 * MobileContactsProvider.ts - iOS/Android contact access implementation
 * 
 * Uses expo-contacts to access device address book
 */

import * as Contacts from 'expo-contacts';
import { IContactsPlatformProvider } from './IContactsPlatformProvider';
import { RawContact, ContactPermissionStatus } from '../types';

export class MobileContactsProvider implements IContactsPlatformProvider {
  async requestPermission(): Promise<ContactPermissionStatus> {
    const { status } = await Contacts.requestPermissionsAsync();
    return this.mapPermissionStatus(status);
  }

  async getPermissionStatus(): Promise<ContactPermissionStatus> {
    const { status } = await Contacts.getPermissionsAsync();
    return this.mapPermissionStatus(status);
  }

  async getAllContacts(): Promise<RawContact[]> {
    const permissionStatus = await this.getPermissionStatus();
    
    if (permissionStatus !== ContactPermissionStatus.GRANTED) {
      throw new Error('Contact permission not granted');
    }

    try {
      console.log('[MobileContactsProvider] Fetching contacts...');
      
      // Fetch contacts with phone numbers and emails
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Name,
        ],
      });

      console.log(`[MobileContactsProvider] Fetched ${data.length} raw contacts`);

      // Map to our domain model with defensive checks
      const mappedContacts = data.map(contact => {
        const phones = contact.phoneNumbers?.map(p => p.number ?? '').filter(Boolean) || [];
        const emails = contact.emails?.map(e => e.email ?? '').filter(Boolean) || [];
        
        return {
          id: contact.id,
          name: contact.name || undefined,
          phoneNumbers: phones,
          emails: emails,
        };
      });

      // Count contacts with at least one identifier
      const validContacts = mappedContacts.filter(
        c => (c.phoneNumbers && c.phoneNumbers.length > 0) || (c.emails && c.emails.length > 0)
      );
      console.log(`[MobileContactsProvider] ${validContacts.length}/${data.length} contacts have phone/email`);
      
      // Log sample of first contact for debugging (without PII)
      if (validContacts.length > 0) {
        const sample = validContacts[0];
        console.log('[MobileContactsProvider] Sample contact:', {
          hasName: !!sample.name,
          phoneCount: sample.phoneNumbers?.length || 0,
          emailCount: sample.emails?.length || 0,
          phoneType: sample.phoneNumbers?.[0] ? typeof sample.phoneNumbers[0] : 'none',
          emailType: sample.emails?.[0] ? typeof sample.emails[0] : 'none',
        });
      }

      return mappedContacts;
    } catch (error) {
      console.error('[MobileContactsProvider] Error fetching contacts:', error);
      throw new Error(`Failed to fetch contacts: ${error}`);
    }
  }

  isSupported(): boolean {
    // expo-contacts works on iOS and Android
    return true;
  }

  private mapPermissionStatus(
    expoStatus: Contacts.PermissionStatus
  ): ContactPermissionStatus {
    switch (expoStatus) {
      case Contacts.PermissionStatus.GRANTED:
        return ContactPermissionStatus.GRANTED;
      case Contacts.PermissionStatus.DENIED:
        return ContactPermissionStatus.DENIED;
      default:
        return ContactPermissionStatus.UNDETERMINED;
    }
  }
}

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
      // Fetch contacts with phone numbers and emails
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Name,
        ],
      });

      // Map to our domain model
      return data.map(contact => ({
        id: contact.id,
        name: contact.name || undefined,
        phoneNumbers: contact.phoneNumbers?.map(p => p.number ?? '').filter(Boolean),
        emails: contact.emails?.map(e => e.email ?? '').filter(Boolean),
      }));
    } catch (error) {
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

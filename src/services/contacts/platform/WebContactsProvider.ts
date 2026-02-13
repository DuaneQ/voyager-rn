/**
 * WebContactsProvider.ts - Web contact access implementation
 * 
 * Uses Contact Picker API (limited browser support)
 * Fallback: Manual entry or import CSV
 */

import { IContactsPlatformProvider } from './IContactsPlatformProvider';
import { RawContact, ContactPermissionStatus } from '../types';

export class WebContactsProvider implements IContactsPlatformProvider {
  async requestPermission(): Promise<ContactPermissionStatus> {
    // Web Contact Picker API doesn't require upfront permission
    // Permission is requested per-invocation
    if (this.isSupported()) {
      return ContactPermissionStatus.GRANTED;
    }
    return ContactPermissionStatus.DENIED;
  }

  async getPermissionStatus(): Promise<ContactPermissionStatus> {
    if (this.isSupported()) {
      return ContactPermissionStatus.GRANTED;
    }
    return ContactPermissionStatus.DENIED;
  }

  async getAllContacts(): Promise<RawContact[]> {
    if (!this.isSupported()) {
      throw new Error('Contact Picker API not supported on this browser');
    }

    try {
      // @ts-ignore - Contact Picker API may not be in TypeScript types
      const contacts = await navigator.contacts.select(
        ['name', 'email', 'tel'],
        { multiple: true }
      );

      return contacts.map((contact: any, index: number) => ({
        id: `web-contact-${index}`,
        name: contact.name?.[0] || undefined,
        phoneNumbers: contact.tel || [],
        emails: contact.email || [],
      }));
    } catch (error) {
      // User cancelled or API failed
      throw new Error(`Contact selection failed: ${error}`);
    }
  }

  isSupported(): boolean {
    // Contact Picker API support:
    // ✅ Chrome Android 80+
    // ✅ Samsung Internet 14+
    // ❌ Desktop Chrome (disabled by default, needs flag)
    // ❌ Safari (all versions)
    // ❌ Firefox (all versions)
    return 'contacts' in navigator && 'ContactsManager' in window;
  }
}

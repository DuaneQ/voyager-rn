/**
 * IContactsPlatformProvider.ts - Platform-agnostic contact access interface
 * 
 * Implements Dependency Inversion Principle: high-level ContactsService
 * depends on this abstraction, not on concrete platform implementations.
 */

import { RawContact, ContactPermissionStatus } from '../types';

export interface IContactsPlatformProvider {
  /**
   * Request permission to access contacts
   */
  requestPermission(): Promise<ContactPermissionStatus>;

  /**
   * Check current permission status
   */
  getPermissionStatus(): Promise<ContactPermissionStatus>;

  /**
   * Fetch all contacts from device
   * Only works if permission granted
   */
  getAllContacts(): Promise<RawContact[]>;

  /**
   * Check if this platform supports contact access
   */
  isSupported(): boolean;
}

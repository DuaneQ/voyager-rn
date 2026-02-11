/**
 * types.ts - Contact Discovery domain types
 */

export interface RawContact {
  id: string;                    // Device contact ID
  name?: string;                 // Display name
  phoneNumbers?: string[];       // Array of phone numbers
  emails?: string[];             // Array of emails
}

export interface HashedContact {
  originalId: string;            // Reference to device contact
  name?: string;                 // Display name (not sent to server)
  hashedIdentifiers: string[];   // SHA-256 hashed phones/emails
  hashedAt: Date;                // When it was hashed
}

export interface MatchedContact {
  userId: string;                // TravalPass user ID
  displayName: string;           // User's display name
  username?: string;             // User's username
  profilePhotoUrl?: string;      // User's profile photo
  mutualFriends?: number;        // Count of mutual connections
}

export interface UnmatchedContact {
  contactId: string;             // Device contact ID
  name?: string;                 // Contact's name
  identifier: string;            // Phone or email (for invite)
  identifierType: 'phone' | 'email';
}

export interface ContactSyncResult {
  totalContactsScanned: number;
  totalHashesGenerated: number;
  matched: MatchedContact[];
  unmatched: UnmatchedContact[];
  syncedAt: Date;
  errors?: string[];
}

export interface InviteMethod {
  type: 'sms' | 'email' | 'link' | 'share';
  available: boolean;
  requiresPermission?: boolean;
}

export enum ContactPermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNDETERMINED = 'undetermined',
}

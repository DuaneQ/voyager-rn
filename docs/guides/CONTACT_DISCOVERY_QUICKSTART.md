# Contact Discovery - Quick Start Implementation Guide

## 🚀 Getting Started

This guide provides code samples and step-by-step instructions to begin implementing the contact discovery feature.

---

## 📦 Step 1: Install Dependencies

```bash
# Install required Expo packages
npx expo install expo-contacts expo-crypto expo-sms

# Verify installation
npx expo doctor
```

---

## 🔧 Step 2: Add Platform Permissions

### iOS (app.json)

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSContactsUsageDescription": "TravalPass needs access to your contacts to help you connect with friends already using the app and invite new ones. Your contacts are never shared with others and are only used to find matches."
      }
    }
  }
}
```

### Android (app.json)

```json
{
  "expo": {
    "android": {
      "permissions": [
        "READ_CONTACTS"
      ]
    }
  }
}
```

---

## 📝 Step 3: Create Type Definitions

**File**: `src/types/Contact.ts`

```typescript
/**
 * Contact types for discovery feature
 */

export interface DeviceContact {
  id: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
  isMatched?: boolean;
}

export interface MatchedContact extends DeviceContact {
  userId: string;
  username: string;
  photoURL?: string;
  mutualFriendsCount?: number;
}

export interface ContactSyncResult {
  matched: MatchedContact[];
  unmatched: DeviceContact[];
  syncedAt: Date;
}

export interface InviteStatus {
  contactHash: string;
  invitedAt: Date;
  method: 'sms' | 'email' | 'share';
  status: 'sent' | 'accepted' | 'expired';
}

export type InviteMethod = 'sms' | 'email' | 'share';
```

---

## 🏗️ Step 4: Create Service Layer

### 4.1 Interface (IContactsProvider.ts)

**File**: `src/services/contacts/IContactsProvider.ts`

```typescript
import { DeviceContact } from '../../types/Contact';

/**
 * Platform-agnostic interface for contact access
 * Allows swapping implementations for iOS, Android, Web
 */
export interface IContactsProvider {
  /**
   * Request permission to access contacts
   * @returns true if granted, false if denied
   */
  requestPermission(): Promise<boolean>;

  /**
   * Check if permission is already granted
   * @returns true if granted, false otherwise
   */
  hasPermission(): Promise<boolean>;

  /**
   * Fetch all contacts from device
   * @returns Array of device contacts
   */
  getContacts(): Promise<DeviceContact[]>;
}
```

### 4.2 iOS Implementation

**File**: `src/platform/contacts/iOSContactsProvider.ts`

```typescript
import * as Contacts from 'expo-contacts';
import { IContactsProvider } from '../../services/contacts/IContactsProvider';
import { DeviceContact } from '../../types/Contact';

export class iOSContactsProvider implements IContactsProvider {
  async requestPermission(): Promise<boolean> {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  }

  async hasPermission(): Promise<boolean> {
    const { status } = await Contacts.getPermissionsAsync();
    return status === 'granted';
  }

  async getContacts(): Promise<DeviceContact[]> {
    const hasAccess = await this.hasPermission();
    if (!hasAccess) {
      throw new Error('Contacts permission not granted');
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
      ],
      sort: Contacts.SortTypes.FirstName,
    });

    return data
      .filter(contact => {
        // Only include contacts with name AND (phone OR email)
        const hasIdentifier = 
          (contact.phoneNumbers && contact.phoneNumbers.length > 0) ||
          (contact.emails && contact.emails.length > 0);
        return contact.name && hasIdentifier;
      })
      .map(contact => ({
        id: contact.id,
        name: contact.name || 'Unknown',
        phoneNumbers: contact.phoneNumbers?.map(p => this.normalizePhone(p.number || '')) || [],
        emails: contact.emails?.map(e => e.email?.toLowerCase() || '') || [],
      }));
  }

  /**
   * Normalize phone number for hashing consistency
   * Removes spaces, dashes, parentheses
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, '');
  }
}
```

### 4.3 Android Implementation

**File**: `src/platform/contacts/AndroidContactsProvider.ts`

```typescript
import * as Contacts from 'expo-contacts';
import { IContactsProvider } from '../../services/contacts/IContactsProvider';
import { DeviceContact } from '../../types/Contact';

/**
 * Android implementation - nearly identical to iOS
 * expo-contacts abstracts platform differences
 */
export class AndroidContactsProvider implements IContactsProvider {
  async requestPermission(): Promise<boolean> {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  }

  async hasPermission(): Promise<boolean> {
    const { status } = await Contacts.getPermissionsAsync();
    return status === 'granted';
  }

  async getContacts(): Promise<DeviceContact[]> {
    const hasAccess = await this.hasPermission();
    if (!hasAccess) {
      throw new Error('Contacts permission not granted');
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
      ],
      sort: Contacts.SortTypes.FirstName,
    });

    return data
      .filter(contact => {
        const hasIdentifier = 
          (contact.phoneNumbers && contact.phoneNumbers.length > 0) ||
          (contact.emails && contact.emails.length > 0);
        return contact.name && hasIdentifier;
      })
      .map(contact => ({
        id: contact.id,
        name: contact.name || 'Unknown',
        phoneNumbers: contact.phoneNumbers?.map(p => this.normalizePhone(p.number || '')) || [],
        emails: contact.emails?.map(e => e.email?.toLowerCase() || '') || [],
      }));
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, '');
  }
}
```

### 4.4 Web Fallback Implementation

**File**: `src/platform/contacts/WebContactsProvider.ts`

```typescript
import { IContactsProvider } from '../../services/contacts/IContactsProvider';
import { DeviceContact } from '../../types/Contact';

/**
 * Web implementation - uses Contact Picker API where available
 * LIMITED SUPPORT: Only works on Chrome 80+, Edge 80+
 * Falls back to manual entry
 */
export class WebContactsProvider implements IContactsProvider {
  async requestPermission(): Promise<boolean> {
    return this.isSupported();
  }

  async hasPermission(): Promise<boolean> {
    return this.isSupported();
  }

  async getContacts(): Promise<DeviceContact[]> {
    if (!this.isSupported()) {
      throw new Error('Contact Picker API not supported on this browser');
    }

    try {
      // @ts-ignore - Contact Picker API not in TypeScript definitions yet
      const contacts = await navigator.contacts.select(
        ['name', 'email', 'tel'],
        { multiple: true }
      );

      return contacts.map((contact: any, index: number) => ({
        id: `web-${index}`,
        name: contact.name?.[0] || 'Unknown',
        phoneNumbers: contact.tel?.map((t: string) => t.replace(/[\s\-\(\)]/g, '')) || [],
        emails: contact.email?.map((e: string) => e.toLowerCase()) || [],
      }));
    } catch (error) {
      console.error('Contact Picker error:', error);
      throw error;
    }
  }

  private isSupported(): boolean {
    // @ts-ignore
    return typeof navigator !== 'undefined' && 
           'contacts' in navigator && 
           'ContactsManager' in window;
  }
}
```

### 4.5 Contacts Service (Facade)

**File**: `src/services/contacts/ContactsService.ts`

```typescript
import { Platform } from 'react-native';
import { IContactsProvider } from './IContactsProvider';
import { iOSContactsProvider } from '../../platform/contacts/iOSContactsProvider';
import { AndroidContactsProvider } from '../../platform/contacts/AndroidContactsProvider';
import { WebContactsProvider } from '../../platform/contacts/WebContactsProvider';
import { DeviceContact } from '../../types/Contact';

/**
 * Main contacts service - abstracts platform differences
 * Follows Facade pattern
 */
export class ContactsService {
  private provider: IContactsProvider;

  constructor() {
    this.provider = this.getProvider();
  }

  private getProvider(): IContactsProvider {
    switch (Platform.OS) {
      case 'ios':
        return new iOSContactsProvider();
      case 'android':
        return new AndroidContactsProvider();
      case 'web':
        return new WebContactsProvider();
      default:
        throw new Error(`Unsupported platform: ${Platform.OS}`);
    }
  }

  /**
   * Request permission to access contacts
   */
  async requestPermission(): Promise<boolean> {
    return this.provider.requestPermission();
  }

  /**
   * Check if permission is already granted
   */
  async hasPermission(): Promise<boolean> {
    return this.provider.hasPermission();
  }

  /**
   * Fetch all contacts from device
   */
  async getContacts(): Promise<DeviceContact[]> {
    return this.provider.getContacts();
  }
}
```

### 4.6 Hashing Service

**File**: `src/services/contacts/ContactHashingService.ts`

```typescript
import * as Crypto from 'expo-crypto';

/**
 * Service for privacy-preserving contact hashing
 * Uses SHA-256 to hash identifiers before sending to server
 */
export class ContactHashingService {
  /**
   * Hash a single identifier (phone or email)
   * Normalizes before hashing for consistency
   */
  static async hashIdentifier(identifier: string): Promise<string> {
    const normalized = identifier.toLowerCase().replace(/\s+/g, '');
    
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      normalized
    );
    
    return hash;
  }

  /**
   * Batch hash multiple identifiers
   */
  static async hashIdentifiers(identifiers: string[]): Promise<string[]> {
    return Promise.all(identifiers.map(id => this.hashIdentifier(id)));
  }

  /**
   * Extract and hash all identifiers from contacts
   */
  static async hashContacts(contacts: DeviceContact[]): Promise<string[]> {
    const identifiers: string[] = [];
    
    contacts.forEach(contact => {
      identifiers.push(...contact.phoneNumbers);
      identifiers.push(...contact.emails);
    });
    
    // Remove duplicates
    const unique = [...new Set(identifiers)];
    
    return this.hashIdentifiers(unique);
  }
}
```

---

## 🔥 Step 5: Create Firebase Repository

**File**: `src/repositories/ContactDiscoveryRepository.ts`

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebaseConfig';
import { MatchedContact } from '../types/Contact';

/**
 * Repository for contact discovery Firebase operations
 * Follows Repository pattern - abstracts Firebase implementation
 */
export class ContactDiscoveryRepository {
  /**
   * Match hashed contacts against Firebase users
   * Calls Cloud Function to perform server-side matching
   */
  static async matchContactHashes(
    hashedIdentifiers: string[]
  ): Promise<MatchedContact[]> {
    const matchContactsFn = httpsCallable<
      { hashedIdentifiers: string[] },
      { success: boolean; matches: any[] }
    >(functions, 'matchContacts');

    try {
      const result = await matchContactsFn({ hashedIdentifiers });
      
      if (!result.data.success) {
        throw new Error('Match contacts failed');
      }

      return result.data.matches.map(match => ({
        id: match.hash,
        userId: match.userId,
        username: match.username,
        name: match.username, // Server doesn't know device contact name
        phoneNumbers: [],
        emails: [],
        isMatched: true,
      }));
    } catch (error) {
      console.error('Error matching contacts:', error);
      throw error;
    }
  }

  /**
   * Record an invitation in Firestore
   */
  static async recordInvite(
    inviteeHash: string,
    inviteeDisplayName: string,
    method: 'sms' | 'email' | 'share'
  ): Promise<void> {
    const recordInviteFn = httpsCallable<
      { inviteeHash: string; inviteeDisplayName: string; method: string },
      { success: boolean }
    >(functions, 'recordInvite');

    try {
      await recordInviteFn({ inviteeHash, inviteeDisplayName, method });
    } catch (error) {
      console.error('Error recording invite:', error);
      throw error;
    }
  }
}
```

---

## ☁️ Step 6: Create Cloud Functions

**File**: `functions/src/contacts/matchContacts.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Cloud Function: Match hashed contacts against Firebase users
 * 
 * Input: { hashedIdentifiers: string[] }
 * Output: { success: boolean, matches: Array<{hash, userId, username}> }
 */
export const matchContacts = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { hashedIdentifiers } = data;

  // Validate input
  if (!hashedIdentifiers || !Array.isArray(hashedIdentifiers)) {
    throw new functions.https.HttpsError('invalid-argument', 'hashedIdentifiers must be an array');
  }

  // Rate limiting
  if (hashedIdentifiers.length > 1000) {
    throw new functions.https.HttpsError('invalid-argument', 'Max 1000 identifiers per request');
  }

  try {
    const db = admin.firestore();
    const matches: { hash: string; userId: string; username: string }[] = [];

    // Firestore 'in' query supports max 10 items per query
    // Process in batches
    for (let i = 0; i < hashedIdentifiers.length; i += 10) {
      const batch = hashedIdentifiers.slice(i, i + 10);

      // Query by phoneHash
      const phoneMatches = await db.collection('users')
        .where('phoneHash', 'in', batch)
        .select('username', 'phoneHash')
        .get();

      phoneMatches.forEach(doc => {
        matches.push({
          hash: doc.data().phoneHash,
          userId: doc.id,
          username: doc.data().username,
        });
      });

      // Query by emailHash
      const emailMatches = await db.collection('users')
        .where('emailHash', 'in', batch)
        .select('username', 'emailHash')
        .get();

      emailMatches.forEach(doc => {
        matches.push({
          hash: doc.data().emailHash,
          userId: doc.id,
          username: doc.data().username,
        });
      });
    }

    // Remove duplicate matches (same user found via phone AND email)
    const uniqueMatches = Array.from(
      new Map(matches.map(m => [m.userId, m])).values()
    );

    return { success: true, matches: uniqueMatches };
  } catch (error: any) {
    console.error('Error matching contacts:', error);
    throw new functions.https.HttpsError('internal', 'Failed to match contacts');
  }
});
```

**File**: `functions/src/index.ts` (export the function)

```typescript
export { matchContacts } from './contacts/matchContacts';
```

---

## 🔄 Step 7: Create Migration Script

**File**: `functions/src/migrations/addUserHashes.ts`

```typescript
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

/**
 * One-time migration script to add emailHash and phoneHash to existing users
 * 
 * Run with: npm run migrate:user-hashes
 */
async function addUserHashes() {
  const db = admin.firestore();
  const usersRef = db.collection('users');

  console.log('Starting user hash migration...');

  // Get all users
  const snapshot = await usersRef.get();
  console.log(`Found ${snapshot.size} users to process`);

  let updated = 0;
  let errors = 0;

  // Process in batches of 500 (Firestore batch limit)
  const batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const user = doc.data();

    const updates: any = {};

    // Add emailHash if email exists and hash doesn't
    if (user.email && !user.emailHash) {
      updates.emailHash = crypto
        .createHash('sha256')
        .update(user.email.toLowerCase())
        .digest('hex');
    }

    // Add phoneHash if phone exists and hash doesn't
    if (user.phoneNumber && !user.phoneHash) {
      const normalized = user.phoneNumber.replace(/[\s\-\(\)]/g, '');
      updates.phoneHash = crypto
        .createHash('sha256')
        .update(normalized)
        .digest('hex');
    }

    // If there are updates, add to batch
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      batchCount++;
      updated++;

      // Commit batch every 500 operations
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`Committed batch of ${batchCount} updates`);
        batchCount = 0;
      }
    }
  }

  // Commit remaining batch
  if (batchCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${batchCount} updates`);
  }

  console.log(`Migration complete: ${updated} users updated, ${errors} errors`);
}

// Run migration
admin.initializeApp();
addUserHashes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

**Add to package.json**:
```json
{
  "scripts": {
    "migrate:user-hashes": "ts-node src/migrations/addUserHashes.ts"
  }
}
```

---

## ⚡ Step 8: Deploy Cloud Function

```bash
cd functions
npm run build
firebase deploy --only functions:matchContacts --project mundo1-dev

# Verify deployment
firebase functions:log --only matchContacts --project mundo1-dev
```

---

## 🧪 Step 9: Test End-to-End

**File**: `src/__test__/contacts/ContactDiscovery.integration.test.ts`

```typescript
import { ContactsService } from '../../services/contacts/ContactsService';
import { ContactHashingService } from '../../services/contacts/ContactHashingService';
import { ContactDiscoveryRepository } from '../../repositories/ContactDiscoveryRepository';

describe('Contact Discovery E2E', () => {
  it('should fetch, hash, and match contacts', async () => {
    // 1. Fetch contacts (requires permission in test env)
    const contactsService = new ContactsService();
    const hasPermission = await contactsService.hasPermission();
    
    if (!hasPermission) {
      console.log('Skipping test - no contact permission');
      return;
    }

    const contacts = await contactsService.getContacts();
    expect(contacts.length).toBeGreaterThan(0);

    // 2. Hash identifiers
    const hashes = await ContactHashingService.hashContacts(contacts);
    expect(hashes.length).toBeGreaterThan(0);

    // 3. Match against Firebase
    const matches = await ContactDiscoveryRepository.matchContactHashes(hashes);
    console.log(`Found ${matches.length} matches`);

    // Verify match structure
    matches.forEach(match => {
      expect(match).toHaveProperty('userId');
      expect(match).toHaveProperty('username');
    });
  });
});
```

---

## 📱 Step 10: Create Basic UI

**File**: `src/pages/ContactDiscoveryPage.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { ContactsService } from '../services/contacts/ContactsService';
import { ContactHashingService } from '../services/contacts/ContactHashingService';
import { ContactDiscoveryRepository } from '../repositories/ContactDiscoveryRepository';
import { DeviceContact, MatchedContact } from '../types/Contact';

export default function ContactDiscoveryPage() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [matched, setMatched] = useState<MatchedContact[]>([]);
  const [unmatched, setUnmatched] = useState<DeviceContact[]>([]);

  const contactsService = new ContactsService();

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const granted = await contactsService.hasPermission();
    setHasPermission(granted);
  };

  const requestPermission = async () => {
    const granted = await contactsService.requestPermission();
    setHasPermission(granted);

    if (granted) {
      syncContacts();
    }
  };

  const syncContacts = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch device contacts
      const contacts = await contactsService.getContacts();
      console.log(`Fetched ${contacts.length} contacts`);

      // 2. Hash identifiers
      const hashes = await ContactHashingService.hashContacts(contacts);
      console.log(`Hashed ${hashes.length} identifiers`);

      // 3. Match against Firebase users
      const matches = await ContactDiscoveryRepository.matchContactHashes(hashes);
      console.log(`Found ${matches.length} matches`);

      // 4. Separate matched and unmatched
      const matchedIds = new Set(matches.map(m => m.userId));
      const unmatchedList = contacts.filter(c => !matchedIds.has(c.id));

      setMatched(matches);
      setUnmatched(unmatchedList);

      Alert.alert('Success', `Found ${matches.length} friends on TravalPass!`);
    } catch (error) {
      console.error('Error syncing contacts:', error);
      Alert.alert('Error', 'Failed to sync contacts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Find Friends on TravalPass</Text>
        <Text style={styles.description}>
          Discover which of your contacts are already using TravalPass
        </Text>
        <Button title="Allow Contact Access" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contact Discovery</Text>
      
      <Button 
        title={isLoading ? 'Syncing...' : 'Sync Contacts'} 
        onPress={syncContacts}
        disabled={isLoading}
      />

      <Text style={styles.sectionTitle}>Friends on TravalPass ({matched.length})</Text>
      <FlatList
        data={matched}
        keyExtractor={item => item.userId}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.username}</Text>
            <Button title="Connect" onPress={() => console.log('Connect', item.userId)} />
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>Invite Friends ({unmatched.length})</Text>
      <FlatList
        data={unmatched}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Button title="Invite" onPress={() => console.log('Invite', item.name)} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  description: { fontSize: 16, marginBottom: 20, color: '#666' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  card: { padding: 15, borderBottomWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16 },
});
```

---

## ✅ Verification Checklist

- [ ] Dependencies installed (`expo-contacts`, `expo-crypto`)
- [ ] Platform permissions added to `app.json`
- [ ] Type definitions created
- [ ] Platform providers implemented (iOS, Android, Web)
- [ ] Service layer created (ContactsService, HashingService)
- [ ] Repository created (ContactDiscoveryRepository)
- [ ] Cloud Function deployed (`matchContacts`)
- [ ] Migration script ready (add user hashes)
- [ ] Basic UI page created
- [ ] End-to-end test passes

---

## 🚀 Next Steps

1. **Run the app**: `npx expo run:ios` or `npx expo run:android`
2. **Test permission flow**: Navigate to ContactDiscoveryPage
3. **Verify contacts fetch**: Check console logs
4. **Test Firebase matching**: Deploy function and test with real users
5. **Add advanced UI**: Implement components from architecture doc
6. **Add invitation system**: SMS, email, share functionality

---

**Ready to start? Begin with Step 1 and work sequentially.**

---

**Document Owner**: Development Team  
**Last Updated**: February 11, 2026

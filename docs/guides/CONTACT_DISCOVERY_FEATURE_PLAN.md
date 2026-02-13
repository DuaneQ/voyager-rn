# Contact Discovery Feature - Implementation Plan

## 📋 Overview

LinkedIn-style feature that checks if a user's contacts are already using TravalPass and allows sending invites to those who aren't. This creates a viral growth loop and improves user engagement by connecting people who already know each other.

**Target Platforms**: iOS, Android, Web

**Start Date**: February 11, 2026  
**Status**: Planning Phase

---

## 🎯 Feature Requirements

### Core Functionality

1. **Contact Access**
   - Request permission to access user's device contacts
   - Read contact names, phone numbers, and email addresses
   - Handle permission denial gracefully

2. **Contact Matching**
   - Securely match contacts against existing TravalPass users
   - Identify which contacts are already on the platform
   - Privacy-preserving matching (no raw contact data sent to server)

3. **Invite System**
   - Allow users to invite contacts who aren't on the platform
   - Send invites via SMS, email, or share link
   - Track invitation status (sent, accepted, etc.)

4. **Discovery UI**
   - Display list of contacts already using TravalPass
   - Show invitation options for contacts not yet on platform
   - Allow quick connection/matching with discovered users

---

## 🔒 Privacy & Security Considerations

### Data Protection

1. **Hashing Strategy**
   - Hash phone numbers and emails client-side before sending to server
   - Use secure hashing algorithm (SHA-256)
   - Never store raw contact data on Firebase

2. **User Consent**
   - Clear permission prompts explaining why contacts are needed
   - Allow users to opt-out at any time
   - Provide settings to delete uploaded contact hashes

3. **GDPR Compliance**
   - Right to access: Users can see what contact data was processed
   - Right to deletion: Users can delete their contact hashes
   - Right to opt-out: Users can disable contact discovery
   - Clear privacy policy updates

4. **Platform-Specific Permissions**

   **iOS:**
   - `NSContactsUsageDescription` in Info.plist
   - Use CNContactStore for read-only access
   - Request permission before access
   
   **Android:**
   - `READ_CONTACTS` permission in AndroidManifest
   - Runtime permission request (Android 6.0+)
   - Handle permission denial gracefully
   
   **Web:**
   - Contact Picker API (limited support)
   - Fallback: Manual phone/email entry
   - No persistent contact storage in browser

---

## 💰 Cost Analysis

### Firebase Costs

1. **Cloud Functions Execution**
   - **Function**: `matchContacts(hashedContactList: string[])`
   - **Estimated calls**: 5-10 per user (on contact sync)
   - **Processing time**: ~2-5 seconds per batch of 100 contacts
   - **Cost**: $0.40/million invocations + $0.0000025/GB-second compute
   - **Monthly estimate**: 
     - 1000 active users × 5 syncs/month = 5,000 invocations
     - Cost: ~$0.002/month (negligible)

2. **Firestore Reads**
   - **Operation**: Query `users` collection by hashed phone/email
   - **Index required**: Composite index on `phoneHash` and `emailHash`
   - **Estimated reads**: 
     - 100 contacts per user × 1000 users = 100,000 reads
     - Cost: $0.06 per 100k reads = $0.06/month

3. **Cloud Functions for Invites**
   - **Function**: `sendContactInvite(contactInfo, inviterUserId)`
   - **Cost**: Same as matchContacts (~$0.002/month for 1000 users)

**Total Monthly Cost (1000 active users)**: ~$0.07-$0.10

**Scaling Concerns:**
- At 100k active users: ~$7-10/month
- Consider rate limiting (max 3 contact syncs per day)
- Cache match results locally for 24 hours to reduce calls

### Alternative: Client-Side Matching
- **Pro**: Zero Firebase cost
- **Con**: Requires downloading all user phone/email hashes (privacy concern)
- **Con**: Large data transfer (potentially MBs for large user base)
- **Verdict**: Not recommended due to privacy and bandwidth concerns

---

## 🏗️ Architecture Design (S.O.L.I.D Principles)

### Directory Structure

```
src/
├── services/
│   ├── contacts/
│   │   ├── ContactsService.ts           # Platform-agnostic contact access
│   │   ├── ContactHashingService.ts     # SHA-256 hashing utility
│   │   ├── ContactMatchingService.ts    # Match contacts with Firebase users
│   │   └── ContactInviteService.ts      # Send invites via SMS/email/share
│   └── platform/
│       ├── iOSContactsProvider.ts       # iOS-specific CNContactStore
│       ├── AndroidContactsProvider.ts   # Android-specific ContactsContract
│       └── WebContactsProvider.ts       # Web Contact Picker API
├── repositories/
│   └── ContactDiscoveryRepository.ts    # Firebase operations for contact matching
├── hooks/
│   ├── contacts/
│   │   ├── useContactAccess.ts          # Request and manage permissions
│   │   ├── useContactDiscovery.ts       # Full discovery flow
│   │   └── useContactInvite.ts          # Invitation functionality
├── components/
│   ├── contacts/
│   │   ├── ContactDiscoveryList.tsx     # List of matched/unmatched contacts
│   │   ├── InviteContactCard.tsx        # Card for inviting a contact
│   │   ├── MatchedContactCard.tsx       # Card for matched user
│   │   └── ContactPermissionPrompt.tsx  # Permission request UI
├── pages/
│   └── ContactDiscoveryPage.tsx         # Main discovery page
└── types/
    └── Contact.ts                       # Contact type definitions
```

### Service Layer Design

#### 1. ContactsService (Abstraction)

```typescript
// src/services/contacts/ContactsService.ts

import { Platform } from 'react-native';
import { IContactsProvider, DeviceContact } from './IContactsProvider';
import { iOSContactsProvider } from '../platform/iOSContactsProvider';
import { AndroidContactsProvider } from '../platform/AndroidContactsProvider';
import { WebContactsProvider } from '../platform/WebContactsProvider';

export class ContactsService {
  private provider: IContactsProvider;

  constructor() {
    // Dependency injection based on platform
    if (Platform.OS === 'ios') {
      this.provider = new iOSContactsProvider();
    } else if (Platform.OS === 'android') {
      this.provider = new AndroidContactsProvider();
    } else {
      this.provider = new WebContactsProvider();
    }
  }

  async requestPermission(): Promise<boolean> {
    return this.provider.requestPermission();
  }

  async getContacts(): Promise<DeviceContact[]> {
    return this.provider.getContacts();
  }

  async hasPermission(): Promise<boolean> {
    return this.provider.hasPermission();
  }
}
```

#### 2. ContactHashingService (Security)

```typescript
// src/services/contacts/ContactHashingService.ts

import * as Crypto from 'expo-crypto';

export class ContactHashingService {
  /**
   * Hash a phone number or email using SHA-256
   * Normalizes input before hashing (lowercase, remove spaces)
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
}
```

#### 3. ContactMatchingService (Business Logic)

```typescript
// src/services/contacts/ContactMatchingService.ts

import { ContactDiscoveryRepository } from '../../repositories/ContactDiscoveryRepository';
import { ContactHashingService } from './ContactHashingService';
import { DeviceContact, MatchedContact } from '../../types/Contact';

export class ContactMatchingService {
  constructor(
    private repository: ContactDiscoveryRepository,
    private hashingService: ContactHashingService
  ) {}

  /**
   * Match device contacts with TravalPass users
   */
  async matchContacts(
    deviceContacts: DeviceContact[]
  ): Promise<{ matched: MatchedContact[]; unmatched: DeviceContact[] }> {
    // Extract all phone numbers and emails
    const identifiers = this.extractIdentifiers(deviceContacts);
    
    // Hash identifiers client-side
    const hashedIdentifiers = await this.hashingService.hashIdentifiers(identifiers);
    
    // Call Cloud Function to match against Firebase users
    const matchResults = await this.repository.matchContactHashes(hashedIdentifiers);
    
    // Combine results with original contact data
    return this.combineResults(deviceContacts, matchResults);
  }

  private extractIdentifiers(contacts: DeviceContact[]): string[] {
    const identifiers: string[] = [];
    contacts.forEach(contact => {
      if (contact.phoneNumbers) identifiers.push(...contact.phoneNumbers);
      if (contact.emails) identifiers.push(...contact.emails);
    });
    return identifiers;
  }

  private combineResults(
    deviceContacts: DeviceContact[],
    matchResults: Map<string, string> // hash -> userId
  ): { matched: MatchedContact[]; unmatched: DeviceContact[] } {
    // Implementation details...
    return { matched: [], unmatched: [] };
  }
}
```

### Firebase Backend

#### Cloud Function: matchContacts

```typescript
// functions/src/matchContacts.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const matchContacts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { hashedIdentifiers }: { hashedIdentifiers: string[] } = data;

  if (!hashedIdentifiers || !Array.isArray(hashedIdentifiers)) {
    throw new functions.https.HttpsError('invalid-argument', 'hashedIdentifiers must be an array');
  }

  // Rate limiting: Max 500 contacts per request
  if (hashedIdentifiers.length > 500) {
    throw new functions.https.HttpsError('invalid-argument', 'Max 500 contacts per request');
  }

  try {
    const db = admin.firestore();
    const matches: { hash: string; userId: string; username: string }[] = [];

    // Query users collection for matching hashes
    // Use batches of 10 (Firestore 'in' query limit)
    for (let i = 0; i < hashedIdentifiers.length; i += 10) {
      const batch = hashedIdentifiers.slice(i, i + 10);
      
      const phoneMatches = await db.collection('users')
        .where('phoneHash', 'in', batch)
        .select('username', 'phoneHash')
        .get();
      
      const emailMatches = await db.collection('users')
        .where('emailHash', 'in', batch)
        .select('username', 'emailHash')
        .get();

      phoneMatches.forEach(doc => {
        matches.push({
          hash: doc.data().phoneHash,
          userId: doc.id,
          username: doc.data().username,
        });
      });

      emailMatches.forEach(doc => {
        matches.push({
          hash: doc.data().emailHash,
          userId: doc.id,
          username: doc.data().username,
        });
      });
    }

    return { success: true, matches };
  } catch (error: any) {
    console.error('Error matching contacts:', error);
    throw new functions.https.HttpsError('internal', 'Failed to match contacts');
  }
});
```

#### Firestore Schema Updates

**users collection:**
```typescript
{
  uid: string;
  username: string;
  email: string;
  emailHash: string;      // SHA-256 hash of email (NEW)
  phoneNumber?: string;   // Optional phone number
  phoneHash?: string;     // SHA-256 hash of phone (NEW)
  // ... existing fields
}
```

**contactInvites collection (NEW):**
```typescript
{
  inviterId: string;      // User who sent the invite
  inviteeIdentifier: string; // Hashed phone/email of invitee
  inviteMethod: 'sms' | 'email' | 'share';
  sentAt: Timestamp;
  acceptedAt?: Timestamp;
  status: 'sent' | 'accepted' | 'expired';
}
```

**Indexes Required:**
- `users` collection: Index on `phoneHash` (ascending)
- `users` collection: Index on `emailHash` (ascending)
- `contactInvites` collection: Composite index on `inviterId` + `sentAt`

---

## 📱 Platform-Specific Implementation

### iOS (CNContactStore)

**Library**: `expo-contacts`

**Permission**: Add to `app.json`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSContactsUsageDescription": "TravalPass needs access to your contacts to help you connect with friends already using the app and invite new ones."
      }
    }
  }
}
```

**Implementation**:
```typescript
// src/services/platform/iOSContactsProvider.ts

import * as Contacts from 'expo-contacts';
import { IContactsProvider, DeviceContact } from '../contacts/IContactsProvider';

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
    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
      ],
    });

    return data.map(contact => ({
      id: contact.id,
      name: contact.name || 'Unknown',
      phoneNumbers: contact.phoneNumbers?.map(p => p.number) || [],
      emails: contact.emails?.map(e => e.email) || [],
    }));
  }
}
```

### Android (ContactsContract)

**Library**: `expo-contacts`

**Permission**: Add to `app.json`:
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

**Implementation**: Same as iOS (expo-contacts abstracts platform differences)

### Web (Contact Picker API / Fallback)

**Limitation**: Web Contact Picker API has limited browser support and requires user interaction per selection.

**Implementation**:
```typescript
// src/services/platform/WebContactsProvider.ts

import { IContactsProvider, DeviceContact } from '../contacts/IContactsProvider';

export class WebContactsProvider implements IContactsProvider {
  async requestPermission(): Promise<boolean> {
    // Web doesn't require upfront permission
    return this.isSupported();
  }

  async hasPermission(): Promise<boolean> {
    return this.isSupported();
  }

  async getContacts(): Promise<DeviceContact[]> {
    if (!this.isSupported()) {
      throw new Error('Contact Picker API not supported');
    }

    try {
      // @ts-ignore - Contact Picker API not in TS types yet
      const contacts = await navigator.contacts.select(
        ['name', 'email', 'tel'],
        { multiple: true }
      );

      return contacts.map((contact: any) => ({
        id: Math.random().toString(),
        name: contact.name?.[0] || 'Unknown',
        phoneNumbers: contact.tel || [],
        emails: contact.email || [],
      }));
    } catch (error) {
      console.error('Contact Picker error:', error);
      return [];
    }
  }

  private isSupported(): boolean {
    // @ts-ignore
    return 'contacts' in navigator && 'ContactsManager' in window;
  }
}
```

**Web Fallback**: Manual entry form for phone/email to search for friends.

---

## 🎨 User Experience Flow

### 1. Entry Points

- **Profile Tab**: "Find Friends" button
- **Navigation Menu**: "Discover Friends Using TravalPass"
- **Onboarding**: Optional step after sign-up

### 2. Permission Request Flow

```
User taps "Find Friends"
  ↓
Display permission explanation modal
  - "Find friends already on TravalPass"
  - "Your contacts are private and never shared"
  - "You can disconnect at any time"
  ↓
User taps "Allow Access"
  ↓
Request OS-level contact permission
  ↓
IF GRANTED:
  - Fetch contacts
  - Show loading screen
  - Match contacts in background
  - Display results
IF DENIED:
  - Show manual search option
  - Allow entering phone/email manually
```

### 3. Discovery Page UI

**Sections:**
1. **Matched Contacts (Already on TravalPass)**
   - List of matched users with profile photos
   - "Connect" button to send match request
   - Sorted by mutual friends count

2. **Invite Friends**
   - List of unmatched contacts
   - "Invite" button for each contact
   - Bulk invite option (select multiple)

3. **Search Bar**
   - Manual search by phone/email
   - For web fallback or users who deny permission

### 4. Invitation Methods

- **SMS**: "Join me on TravalPass! Download: [app link]"
- **Email**: Full HTML email with app preview
- **Share Sheet**: Native OS share with app link + referral code

---

## 🔧 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create service layer architecture
- [ ] Implement ContactsService with platform providers
- [ ] Add ContactHashingService
- [ ] Create types and interfaces
- [ ] Write unit tests for services

### Phase 2: Backend (Week 2-3)
- [ ] Create `matchContacts` Cloud Function
- [ ] Add `phoneHash` and `emailHash` to users schema
- [ ] Create migration script to hash existing user data
- [ ] Set up Firestore indexes
- [ ] Write integration tests for Cloud Function

### Phase 3: Mobile Implementation (Week 3-4)
- [ ] Implement iOS contacts provider
- [ ] Implement Android contacts provider
- [ ] Create discovery hooks
- [ ] Build Contact Discovery UI
- [ ] Add permission request flow
- [ ] Implement invitation system

### Phase 4: Web Implementation (Week 4-5)
- [ ] Implement Web contacts provider
- [ ] Add manual search fallback
- [ ] Test Contact Picker API on supported browsers
- [ ] Ensure responsive design

### Phase 5: Testing & Polish (Week 5-6)
- [ ] E2E testing on iOS, Android, Web
- [ ] Privacy audit
- [ ] Performance optimization
- [ ] Rate limiting implementation
- [ ] Analytics integration
- [ ] Documentation

---

## 📊 Success Metrics

1. **Adoption Rate**
   - % of users who grant contact permission
   - % of users who discover at least 1 match
   - % of users who send at least 1 invite

2. **Viral Growth**
   - Invite acceptance rate
   - New user signups from invites
   - Time from invite sent to accepted

3. **Engagement**
   - Increase in connections/matches after feature launch
   - Retention rate of users who use discovery

4. **Technical Metrics**
   - Cloud Function execution time (<2s)
   - Error rate (<1%)
   - Cost per 1000 syncs (<$0.10)

---

## ❓ Open Questions & Decisions Needed

### 1. Feature Scope
- [x] **Q:** Should we allow importing ALL contacts or limit to X number?
  - **DECISION**: ✅ Unlimited contacts with rate limiting
  - **Rationale**: Best user experience, costs controlled via rate limiting

- [x] **Q:** Should matched contacts automatically show in search/discovery or require explicit connection?
  - **DECISION**: ✅ Dedicated "Friends on TravalPass" section
  - **Rationale**: Clear separation improves UX and makes privacy boundaries explicit

- [x] **Q:** How often should we re-sync contacts?
  - **DECISION**: ✅ Once per day (automatic background) + manual option
  - **Rationale**: Keeps data fresh without excessive API calls

### 2. Privacy & Data Handling
- [x] **Q:** Should we store hashed contact data permanently or only during matching?
  - **DECISION**: ✅ Store hash + timestamp in `contactSyncs` collection
  - **Rationale**: Enables deduplication and prevents redundant processing while maintaining privacy

- [ ] **Q:** What happens when a user deletes their account?
  - **Options**:
    - A) Remove their user data but keep phoneHash/emailHash for matching
    - B) Complete removal (breaks existing contact matches)
  - **Recommendation**: B - Full GDPR compliance

### 3. Invitation System
- [x] **Q:** Should we track who invited whom for referral rewards?
  - **DECISION**: ✅ Track inviter with `invitedBy` field in user profile
  - **Rationale**: Enables future referral rewards program and growth attribution

- [ ] **Q:** What happens if someone is invited by multiple users?
  - **Options**:
    - A) First inviter gets credit
    - B) Last inviter gets credit
    - C) All inviters get partial credit
  - **Recommendation**: A - First inviter (fairness)

### 4. Technical Architecture
- [ ] **Q:** Should we use Algolia for faster contact search?
  - **Pro**: Much faster search
  - **Con**: Additional cost ($1/month for 10k records)
  - **Decision**: Not yet - start with Firestore queries, migrate if needed

- [ ] **Q:** Should we cache matched contacts locally?
  - **Recommendation**: Yes - Cache for 24 hours to reduce Cloud Function calls

### 5. User Experience
- [ ] **Q:** Should we show contact's full name or anonymize?
  - **Options**:
    - A) Show full name "John Smith is on TravalPass"
    - B) Anonymize "JS is on TravalPass - Send connection request to reveal"
  - **Recommendation**: A - Transparency builds trust

- [x] **Q:** Should contact discovery be opt-out or opt-in?
  - **DECISION**: ✅ Opt-in (request permission, user chooses)
  - **Rationale**: Privacy-first approach, App Store friendly, builds trust

---

## 🚨 Risks & Mitigation

### Risk 1: Poor Adoption (Users Deny Permission)
- **Mitigation**: 
  - Clear value proposition before asking
  - Allow manual search as alternative
  - Show testimonials/social proof

### Risk 2: Privacy Concerns / Bad PR
- **Mitigation**:
  - Transparent privacy policy
  - User controls (delete contact hashes)
  - Don't spam contacts with invites
  - Limit invites per day (max 10)

### Risk 3: Platform Rejection (App Store / Play Store)
- **Mitigation**:
  - Follow platform guidelines exactly
  - Clear permission descriptions
  - No dark patterns or forced access

### Risk 4: High Cloud Function Costs
- **Mitigation**:
  - ✅ **Rate limiting: 1 sync per day max** (user-specified - very conservative)
  - Client-side caching (24h)
  - Batch processing (unlimited contacts with chunking)
  - Monitor costs closely in dev

### Risk 5: Spam / Abuse
- **Mitigation**:
  - ✅ **100 INVITES PER DAY LIMIT** (prevents spam while allowing generous sharing)
  - Track invite acceptance rate (warn if <5%)
  - Monitor reported spam
  - Auto-disable if users report as spam (3+ reports)
  - Add "Report Spam" option in invites
  - Ban users who abuse system

---

## 📚 Resources & References

### Similar Implementations
- LinkedIn Contact Sync
- Instagram "Find Facebook Friends"
- WhatsApp "Invite to WhatsApp"
- Clubhouse Contact Matching (privacy-focused)

### Libraries & Tools
- [expo-contacts](https://docs.expo.dev/versions/latest/sdk/contacts/) - Cross-platform contact access
- [expo-crypto](https://docs.expo.dev/versions/latest/sdk/crypto/) - SHA-256 hashing
- [react-native-contacts](https://github.com/morenoh149/react-native-contacts) - Alternative contact library

### Privacy Best Practices
- [Apple Privacy Guidelines](https://developer.apple.com/app-store/review/guidelines/#privacy)
- [Google Play Privacy Policy](https://support.google.com/googleplay/android-developer/answer/9888076)
- [GDPR Contact Data Processing](https://gdpr.eu/what-is-personal-data/)

---

## 📝 Next Steps

1. **Review & Approve Plan** (Stakeholder decision)
2. **Answer Open Questions** (Product owner input)
3. **Finalize Architecture** (Engineering review)
4. **Create Detailed Tickets** (Sprint planning)
5. **Begin Phase 1 Implementation**

---

**Document Owner**: Development Team  
**Last Updated**: February 11, 2026  
**Next Review**: After Phase 1 completion

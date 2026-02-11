# Contact Discovery - Architecture & Code Organization

## 📍 Where Should This Functionality Reside?

Based on your project's S.O.L.I.D architecture and the decisions you've made, here's the recommended code organization:

---

## 🗂️ Directory Structure

```
src/
├── services/
│   └── contacts/
│       ├── ContactsService.ts              # Main service - coordinates all contact operations
│       ├── ContactHashingService.ts        # SHA-256 hashing for privacy
│       ├── ContactMatchingService.ts       # Business logic for matching
│       ├── ContactInviteService.ts         # Invitation sending logic
│       ├── ContactSyncService.ts           # Daily sync coordination
│       └── IContactsProvider.ts            # Interface for platform providers
│
├── platform/                               # NEW: Platform-specific implementations
│   └── contacts/
│       ├── iOSContactsProvider.ts          # iOS CNContactStore implementation
│       ├── AndroidContactsProvider.ts      # Android ContactsContract implementation
│       └── WebContactsProvider.ts          # Web Contact Picker API + fallback
│
├── repositories/
│   └── ContactDiscoveryRepository.ts       # Firebase calls for contact matching
│
├── hooks/
│   └── contacts/
│       ├── useContactPermission.ts         # Permission management hook
│       ├── useContactDiscovery.ts          # Main discovery flow hook
│       ├── useContactSync.ts               # Daily sync logic hook
│       └── useContactInvite.ts             # Invitation hook
│
├── components/
│   └── contacts/
│       ├── ContactDiscoveryList.tsx        # Main list component
│       ├── MatchedContactCard.tsx          # Card for matched users
│       ├── InviteContactCard.tsx           # Card for unmatched contacts
│       ├── ContactPermissionModal.tsx      # Permission request modal
│       ├── ContactSyncIndicator.tsx        # Sync status indicator
│       └── InviteMethodPicker.tsx          # SMS/Email/Share picker
│
├── pages/
│   └── ContactDiscoveryPage.tsx            # Main discovery page
│
└── types/
    └── Contact.ts                          # Contact type definitions
```

---

## 🔨 Service Layer Breakdown

### 1. ContactsService (Main Coordinator)

**Purpose**: Facade pattern - single entry point for all contact operations  
**Dependencies**: Platform providers (injected)  
**Responsibilities**:
- Abstract platform differences
- Coordinate permission requests
- Fetch contacts from device
- Cache contact data locally

```typescript
// src/services/contacts/ContactsService.ts
import { Platform } from 'react-native';
import { IContactsProvider } from './IContactsProvider';
import { iOSContactsProvider } from '../../platform/contacts/iOSContactsProvider';
import { AndroidContactsProvider } from '../../platform/contacts/AndroidContactsProvider';
import { WebContactsProvider } from '../../platform/contacts/WebContactsProvider';

export class ContactsService {
  private provider: IContactsProvider;

  constructor() {
    // Dependency injection based on platform
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

  async requestPermission(): Promise<boolean> {
    return this.provider.requestPermission();
  }

  async getContacts(): Promise<DeviceContact[]> {
    return this.provider.getContacts();
  }
}
```

### 2. ContactHashingService (Security)

**Purpose**: Privacy-preserving hashing  
**Dependencies**: expo-crypto  
**Responsibilities**:
- Hash phone numbers and emails
- Normalize inputs before hashing
- Batch hash operations

**Placement Rationale**: Separate service follows Single Responsibility Principle

### 3. ContactMatchingService (Business Logic)

**Purpose**: Core matching algorithm  
**Dependencies**: ContactDiscoveryRepository, ContactHashingService  
**Responsibilities**:
- Extract identifiers from contacts
- Hash identifiers client-side
- Call Cloud Function via repository
- Combine results with original contact data

**Placement Rationale**: Contains complex business logic, testable in isolation

### 4. ContactSyncService (Orchestration)

**Purpose**: Manages daily sync schedule  
**Dependencies**: ContactsService, ContactMatchingService, AsyncStorage  
**Responsibilities**:
- Check last sync timestamp
- Enforce 1 sync per day rate limit
- Store sync state locally
- Queue background sync jobs

**Key Implementation**:
```typescript
// src/services/contacts/ContactSyncService.ts
export class ContactSyncService {
  private static SYNC_KEY = '@contact_last_sync';
  private static SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  static async canSyncNow(): Promise<boolean> {
    const lastSync = await AsyncStorage.getItem(this.SYNC_KEY);
    if (!lastSync) return true;
    
    const lastSyncTime = parseInt(lastSync, 10);
    const now = Date.now();
    return (now - lastSyncTime) >= this.SYNC_INTERVAL_MS;
  }

  static async recordSync(): Promise<void> {
    await AsyncStorage.setItem(this.SYNC_KEY, Date.now().toString());
  }
}
```

### 5. ContactInviteService (Invitations)

**Purpose**: Send invites via different channels  
**Dependencies**: SMS API, Email API, Share API  
**Responsibilities**:
- Generate referral links
- Send SMS invites
- Send email invites
- Open native share sheet
- Track invite status in Firebase

**Placement Rationale**: Separate from matching logic, allows independent testing

---

## 🪝 Hook Layer

### useContactPermission

**Purpose**: Manage permission state  
**Returns**: `{ hasPermission, requestPermission, isLoading }`  
**Usage**: Permission button in UI

### useContactDiscovery

**Purpose**: Full discovery flow orchestration  
**Returns**: 
```typescript
{
  matched: MatchedContact[];
  unmatched: DeviceContact[];
  isLoading: boolean;
  error: string | null;
  syncContacts: () => Promise<void>;
  canSync: boolean;
  lastSyncTime: Date | null;
}
```
**Usage**: Main discovery page

### useContactSync

**Purpose**: Background sync management  
**Returns**: `{ lastSyncTime, syncNow, isSyncing }`  
**Usage**: Sync indicator component

### useContactInvite

**Purpose**: Invitation functionality  
**Returns**: 
```typescript
{
  sendInvite: (contact: DeviceContact, method: InviteMethod) => Promise<void>;
  isInviting: boolean;
  error: string | null;
}
```
**Usage**: Invite button in contact cards

---

## 🔄 Data Flow

```
User Opens Discovery Page
        ↓
    useContactDiscovery Hook
        ↓
    ContactSyncService.canSyncNow()
        ↓
    [IF ALLOWED] ContactsService.getContacts()
        ↓
    ContactHashingService.hashIdentifiers()
        ↓
    ContactMatchingService.matchContacts()
        ↓
    ContactDiscoveryRepository.matchContactHashes()
        ↓
    [Firebase Cloud Function] matchContacts
        ↓
    [Firestore Query] Match hashes against users
        ↓
    Return matches to client
        ↓
    Update UI with matched/unmatched contacts
```

---

## 🔥 Firebase Backend Architecture

### Cloud Functions

**Location**: `functions/src/contacts/`

```
functions/
├── src/
│   ├── contacts/
│   │   ├── matchContacts.ts        # Main matching function
│   │   ├── recordInvite.ts         # Track invitation sent
│   │   └── acceptInvite.ts         # Handle invite acceptance
│   └── index.ts                    # Export all functions
```

### Firestore Collections

#### 1. `users` Collection (Updated Schema)

```typescript
{
  uid: string;
  email: string;
  emailHash: string;                    // NEW: SHA-256(email)
  phoneNumber?: string;
  phoneHash?: string;                   // NEW: SHA-256(phone)
  username: string;
  invitedBy?: string;                   // NEW: userId of inviter
  inviteAcceptedAt?: Timestamp;         // NEW: When invite was accepted
  // ... existing fields
}
```

#### 2. `contactSyncs` Collection (NEW)

**Purpose**: Track sync history and prevent duplicate processing

```typescript
{
  userId: string;                       // Who synced
  syncedAt: Timestamp;                  // When synced
  contactCount: number;                 // How many contacts processed
  matchCount: number;                   // How many matches found
  hashedIdentifiers: string[];          // Hashes processed (for dedup)
}
```

**Indexes**: 
- `userId` + `syncedAt` (desc)

#### 3. `contactInvites` Collection (NEW)

**Purpose**: Track all invitations sent

```typescript
{
  inviterId: string;                    // Who sent invite
  inviteeHash: string;                  // Hashed phone/email
  inviteeDisplayName: string;           // Contact's name (for inviter's reference)
  method: 'sms' | 'email' | 'share';
  sentAt: Timestamp;
  acceptedAt?: Timestamp;
  acceptedByUserId?: string;            // NEW: Populated when invite accepted
  status: 'sent' | 'accepted' | 'expired';
  referralCode?: string;                // Unique invite code
}
```

**Indexes**:
- `inviterId` + `sentAt` (desc)
- `inviteeHash` (for checking if already invited)
- `referralCode` (unique)

### Security Rules

```javascript
// Firestore Security Rules for new collections

// Users: Allow reading emailHash/phoneHash for matching
match /users/{userId} {
  allow read: if request.auth != null;
  allow update: if request.auth.uid == userId;
}

// Contact Syncs: User can only read/write their own
match /contactSyncs/{syncId} {
  allow read, write: if request.auth != null 
                     && resource.data.userId == request.auth.uid;
}

// Contact Invites: User can only read their own invites
match /contactInvites/{inviteId} {
  allow read: if request.auth != null 
              && (resource.data.inviterId == request.auth.uid 
                  || resource.data.acceptedByUserId == request.auth.uid);
  allow create: if request.auth != null 
                && request.resource.data.inviterId == request.auth.uid;
}
```

---

## 🎨 UI Component Organization

### Pages (Top-Level Routes)

**ContactDiscoveryPage.tsx**
- Location: `src/pages/ContactDiscoveryPage.tsx`
- Route: `/discover-friends` or navigation tab
- Purpose: Main entry point for feature
- Uses: `useContactDiscovery`, `useContactPermission`

### Feature Components (Contact-Specific)

All located in: `src/components/contacts/`

1. **ContactDiscoveryList.tsx**
   - Renders matched and unmatched lists
   - Handles empty states
   - Infinite scroll for large lists

2. **MatchedContactCard.tsx**
   - Shows user profile photo, name, username
   - "Connect" button
   - Mutual friends count

3. **InviteContactCard.tsx**
   - Shows contact name, phone/email
   - Invite button with method picker
   - Shows "Already invited" if applicable

4. **ContactPermissionModal.tsx**
   - Explains why permission is needed
   - Shows privacy guarantees
   - Handles denial gracefully

---

## 🧪 Testing Strategy

### Unit Tests

**Services** (`src/services/contacts/__tests__/`)
- `ContactHashingService.test.ts` - Hash consistency, normalization
- `ContactMatchingService.test.ts` - Matching logic, edge cases
- `ContactSyncService.test.ts` - Rate limiting, sync state

**Hooks** (`src/hooks/contacts/__tests__/`)
- `useContactDiscovery.test.ts` - Full flow integration
- `useContactPermission.test.ts` - Permission state machine

### Integration Tests

**Cloud Functions** (`functions/__tests__/contacts/`)
- `matchContacts.test.ts` - E2E matching against Firestore emulator

### E2E Tests

**User Flows** (`e2e/contacts/`)
- Discovery flow: Permission → Sync → Match → Invite
- Test on iOS, Android, Web

---

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "expo-contacts": "^13.0.0",        // iOS/Android contact access
    "expo-crypto": "^13.0.0",          // SHA-256 hashing
    "expo-sms": "^12.0.0",             // SMS invites (optional)
    "@react-native-async-storage/async-storage": "^1.21.0"  // Already installed
  }
}
```

**Installation**:
```bash
npx expo install expo-contacts expo-crypto expo-sms
```

---

## ✅ Implementation Checklist

### Phase 1: Core Services (Week 1)
- [ ] Create `IContactsProvider` interface
- [ ] Implement `iOSContactsProvider`
- [ ] Implement `AndroidContactsProvider`
- [ ] Implement `WebContactsProvider`
- [ ] Build `ContactsService` (facade)
- [ ] Build `ContactHashingService`
- [ ] Build `ContactMatchingService`
- [ ] Build `ContactSyncService`
- [ ] Write unit tests for all services

### Phase 2: Firebase Backend (Week 2)
- [ ] Update `users` schema with `emailHash` and `phoneHash`
- [ ] Create migration script to hash existing users
- [ ] Create `matchContacts` Cloud Function
- [ ] Create `recordInvite` Cloud Function
- [ ] Set up Firestore indexes
- [ ] Add security rules for new collections
- [ ] Write integration tests for functions

### Phase 3: React Hooks (Week 3)
- [ ] Implement `useContactPermission`
- [ ] Implement `useContactDiscovery`
- [ ] Implement `useContactSync`
- [ ] Implement `useContactInvite`
- [ ] Write hook tests with React Testing Library

### Phase 4: UI Components (Week 4)
- [ ] Build `ContactPermissionModal`
- [ ] Build `ContactDiscoveryList`
- [ ] Build `MatchedContactCard`
- [ ] Build `InviteContactCard`
- [ ] Build `ContactSyncIndicator`
- [ ] Implement empty states and loading skeletons

### Phase 5: Integration & Polish (Week 5-6)
- [ ] Add to navigation (profile tab or menu)
- [ ] E2E testing on iOS
- [ ] E2E testing on Android
- [ ] E2E testing on Web
- [ ] Privacy audit
- [ ] Performance optimization
- [ ] Analytics integration
- [ ] User documentation

---

## 🚦 Review & Decision Points

### Before Starting Development

1. **Review Cost Projections**: Confirm 1 sync/day limit is acceptable
2. **Legal Review**: Have privacy policy updated and approved
3. **Design Review**: Confirm UI mockups for all components
4. **Security Audit**: Review hashing strategy and Firebase rules

### After Phase 2

1. **Test Backend in Isolation**: Verify Cloud Function performance
2. **Monitor Costs**: Check actual vs projected Firebase costs
3. **Load Testing**: Simulate 1000 users syncing contacts

### Before Production Release

1. **Privacy Compliance**: GDPR/CCPA checklist complete
2. **App Store Submission**: Permission descriptions approved
3. **Beta Testing**: Dogfood with internal team
4. **Rollout Plan**: Gradual rollout (10% → 50% → 100%)

---

**Document Owner**: Development Team  
**Last Updated**: February 11, 2026  
**Status**: Architecture Approved ✅

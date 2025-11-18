# Connection & Chat — PWA/RN Compatibility Guide

## Overview

The Connection & Chat feature enables users to communicate across both PWA (web) and RN (mobile) 
platforms. Both apps share the same Firebase backend, so **all data schemas must be identical** 
to ensure seamless cross-platform messaging.

## Shared Data Models

### Connection Document (`connections/{connectionId}`)

```typescript
{
  id: string;
  users: string[];                    // Array of all user UIDs in the chat
  itineraryIds: string[];             // Original matched itinerary IDs
  itineraries: Itinerary[];           // Itinerary summaries for UI display
  createdAt: Timestamp;               // When connection was created
  unreadCounts: {                     // Per-user unread message count
    [userId: string]: number;
  };
  addedUsers?: Array<{                // Track who added each user (for removal permission)
    userId: string;
    addedBy: string;
  }>;
}
```

### Message Document (`connections/{connectionId}/messages/{messageId}`)

```typescript
{
  id: string;
  sender: string;                     // User ID of message sender
  text: string;                       // Message text content
  imageUrl?: string;                  // Optional image attachment URL
  createdAt: Timestamp;               // Message timestamp
  readBy: string[];                   // Array of user IDs who read the message
  clientMessageId?: string;           // Client-generated ID for idempotency
  pending?: boolean;                  // True during upload (optimistic UI)
}
```

## Shared Utilities

Both PWA and RN implement identical utility functions:

### connectionUtils

| Function | PWA Location | RN Location | Purpose |
|----------|--------------|-------------|---------|
| `addUserToConnection` | `src/utils/connectionUtils.ts` | `src/utils/connectionUtils.ts` | Add user to group chat with tracking |
| `removeUserFromConnection` | `src/utils/connectionUtils.ts` | `src/utils/connectionUtils.ts` | Remove user (permission check: only adder can remove) |

### getEligibleUsersForChat

| PWA Location | RN Location |
|--------------|-------------|
| `src/utils/getEligibleUsersForChat.ts` | `src/utils/getEligibleUsersForChat.ts` |

Queries all connections for current user and returns eligible users to add to a chat 
(excludes current chat members and current user).

### useRemoveConnection

| PWA Location | RN Location |
|--------------|-------------|
| `src/hooks/useRemoveConnection.ts` | `src/hooks/useRemoveConnection.ts` |

Hook for deleting a connection document (unmatching).

## Implementation Guidelines

### 1. Function Signatures Must Match

Both platforms use identical function signatures for all shared utilities:

```typescript
// ✅ CORRECT — Same signature in both PWA and RN
async function addUserToConnection(
  connectionId: string,
  userIdToAdd: string,
  addedByUserId: string
): Promise<boolean>

// ❌ WRONG — Don't change parameter order or types
async function addUserToConnection(
  userIdToAdd: string,           // Wrong order
  connectionId: string,
  addedByUserId: string
): Promise<void>                 // Wrong return type
```

### 2. Firestore Operations Must Be Identical

Both platforms must perform the same Firestore operations in the same order:

```typescript
// ✅ CORRECT — Both use arrayUnion for atomic updates
await updateDoc(connRef, {
  users: arrayUnion(userIdToAdd),
  addedUsers: arrayUnion({ userId: userIdToAdd, addedBy: addedByUserId })
});

// ❌ WRONG — Don't use different update strategies
await updateDoc(connRef, {
  users: [...existingUsers, userIdToAdd],  // Non-atomic, race condition
});
```

### 3. Error Messages Should Match

Use identical error messages for consistency across platforms:

```typescript
// ✅ CORRECT — Same error messages
throw new Error('Connection not found');
throw new Error('User already in chat');
throw new Error('You can only remove users you added');

// ❌ WRONG — Different error messages
throw new Error('Cannot find connection');  // Inconsistent wording
```

### 4. Timestamp Handling

Both platforms must handle Firestore Timestamps consistently:

```typescript
// PWA uses firebase/firestore Timestamp directly
import { Timestamp } from 'firebase/firestore';

// RN defines compatible interface
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
  toMillis?: () => number;
}
```

## Testing Cross-Platform Compatibility

### Manual Testing Checklist

- [ ] PWA user sends message → RN user receives in real-time
- [ ] RN user sends message → PWA user receives in real-time
- [ ] PWA user adds member to group → RN displays updated member list
- [ ] RN user removes member (they added) → PWA reflects removal
- [ ] Unread counts sync correctly between PWA and RN
- [ ] Image uploads from RN display correctly in PWA
- [ ] Image uploads from PWA display correctly in RN

### Integration Test Requirements

1. **Connection Creation**
   - Create connection from PWA → verify RN can read and display
   - Create connection from RN → verify PWA can read and display

2. **Message Exchange**
   - Send text messages bidirectionally
   - Send image messages bidirectionally
   - Verify `createdAt` timestamps are consistent

3. **Group Chat Management**
   - Add user from PWA → verify RN sees new member
   - Add user from RN → verify PWA sees new member
   - Remove user permission enforcement works on both platforms

## Common Pitfalls

### ❌ Platform-Specific Logic in Shared Utilities

```typescript
// ❌ WRONG — Don't add platform-specific code
async function addUserToConnection(...) {
  if (Platform.OS === 'ios') {
    // iOS-specific logic
  }
}
```

### ❌ Different Field Names

```typescript
// ❌ WRONG — Field names must match exactly
{
  sender: string;      // PWA uses 'sender'
  senderId: string;    // RN must also use 'sender', not 'senderId'
}
```

### ❌ Inconsistent Validation

```typescript
// ❌ WRONG — Different validation rules
// PWA: allows empty text if imageUrl exists
// RN: requires text to always be non-empty
// This breaks cross-platform compatibility!
```

## Reference Documentation

- PWA Implementation: `/voyager-pwa/docs/GROUP_CHAT_MEMBER_LOGIC.md`
- RN Requirements: `/voyager-RN/docs/connection_chat/REQUIREMENTS.md`
- Design Notes: `/voyager-RN/openspec/changes/add-connection-chat/design.md`

## Version History

- 2025-11-16: Initial implementation of PWA-compatible utilities in RN

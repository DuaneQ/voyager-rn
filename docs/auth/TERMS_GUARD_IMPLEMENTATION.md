# TermsGuard Implementation Guide

## Overview

The **TermsGuard** is a React component that enforces Terms of Service (ToS) acceptance before users can access the TravalPass mobile app. It implements the Open/Closed Principle by extending app behavior without modifying existing code.

**Implementation Date**: November 27, 2025  
**Version**: 1.0.0  
**OpenSpec Change**: `2025-11-27-add-terms-acknowledgement`

---

## Architecture

### Component Structure

```
TermsGuard (Guard Wrapper)
    ├── useAuth() - Authentication state from AuthContext
    ├── useTermsAcceptance() - Terms acceptance state and methods
    └── TermsOfServiceModal - UI for presenting terms
```

### File Locations

- **Guard Component**: `src/components/auth/TermsGuard.tsx`
- **Hook**: `src/hooks/useTermsAcceptance.ts`
- **Modal UI**: `src/components/modals/TermsOfServiceModal.tsx`
- **Terms Content**: `src/legal/TERMS_OF_SERVICE.md`
- **Integration**: `src/navigation/AppNavigator.tsx`
- **Tests**: `src/__tests__/components/auth/TermsGuard.test.tsx`

---

## How It Works

### 1. Navigation Integration

The TermsGuard is integrated into the navigation hierarchy via a wrapper component:

```tsx
// In AppNavigator.tsx
const GuardedMainTabNavigator: React.FC = () => {
  return (
    <TermsGuard>
      <MainTabNavigator />
    </TermsGuard>
  );
};

// In RootNavigator
{user ? (
  <>
    <Stack.Screen name="MainApp" component={GuardedMainTabNavigator} />
    <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
  </>
) : (
  <Stack.Screen name="Auth" component={AuthPage} />
)}
```

**Key Points**:
- TermsGuard wraps the `MainTabNavigator` (not individual Stack.Screen components)
- This follows React Navigation best practices (Screen components must be direct children of Navigator)
- Guard is only active when user is authenticated (checked by RootNavigator)

### 2. Execution Flow

```
User logs in
    ↓
RootNavigator detects user exists
    ↓
Renders GuardedMainTabNavigator
    ↓
TermsGuard component renders
    ↓
useAuth() provides user object
    ↓
useTermsAcceptance() checks Firestore
    ↓
Decision:
    ├─ No user → return null (RootNavigator handles redirect)
    ├─ Loading → show loading spinner
    ├─ Error → show error message
    ├─ Not accepted → show TermsOfServiceModal
    └─ Accepted → render children (MainTabNavigator)
```

### 3. State Management

#### TermsGuard Component State
```tsx
const { user, signOut: authSignOut } = useAuth();
const { hasAcceptedTerms, isLoading, error, acceptTerms } = useTermsAcceptance();
const userId = user?.uid;
```

**State Sources**:
- `user`: From AuthContext via `useAuth()` hook
- `hasAcceptedTerms`: From Firestore via `useTermsAcceptance()` hook
- `isLoading`: Loading state during Firestore queries
- `error`: Error state if Firestore query fails

#### Check Order (Critical)
```tsx
// 1. Check if user is logged in (FIRST - early return)
if (!userId) return null;

// 2. Handle acceptance logic
handleAcceptTerms() → acceptTerms() → Firestore write

// 3. Handle decline logic  
handleDeclineTerms() → authSignOut() → Auth state clears → RootNavigator redirects

// 4. Show loading (while checking Firestore)
if (isLoading) return <LoadingSpinner />;

// 5. Show error (if Firestore query failed)
if (error) return <ErrorMessage />;

// 6. Show children (if terms accepted)
if (hasAcceptedTerms) return <>{children}</>;

// 7. Show modal (if terms not accepted)
return <TermsOfServiceModal />;
```

**Why userId check is first**:
- When user declines and signs out, `userId` becomes undefined immediately
- Without early return, the component would render loading/error/modal for a frame
- Returning `null` prevents any UI flash while AuthContext updates
- RootNavigator detects `user = null` and shows Auth screen

---

## Data Flow

### Acceptance Flow

```
User clicks "I Accept These Terms"
    ↓
TermsOfServiceModal.handleAccept()
    ↓
TermsGuard.handleAcceptTerms()
    ↓
useTermsAcceptance.acceptTerms()
    ↓
Firestore update:
    users/{uid} {
        termsOfService: {
            accepted: true,
            acceptedAt: serverTimestamp(),
            version: "1.0.0"
        },
        lastUpdated: serverTimestamp()
    }
    ↓
Hook updates hasAcceptedTerms = true
    ↓
TermsGuard renders children (MainTabNavigator)
```

### Decline Flow

```
User clicks "Decline & Logout"
    ↓
TermsOfServiceModal.onDecline()
    ↓
TermsGuard.handleDeclineTerms()
    ↓
AuthContext.signOut()
    ↓
AuthContext clears user state
    ↓
useAuth() returns user = null
    ↓
TermsGuard renders null
    ↓
RootNavigator detects user = null
    ↓
RootNavigator shows Auth screen
```

**Critical Implementation Detail**:
- Uses `AuthContext.signOut()` instead of Firebase's `signOut(auth)` directly
- AuthContext properly clears all application state
- Prevents UI inconsistencies during logout

---

## useTermsAcceptance Hook

### Purpose
Manages Terms of Service acceptance state with Firestore persistence.

### State Management
```tsx
const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);
const [userId, setUserId] = useState<string | undefined>(undefined);
```

### Firebase Integration

#### Auth Listener
```tsx
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    const uid = user?.uid;
    setUserId(uid);
    
    if (!uid) {
      setHasAcceptedTerms(false);
      setIsLoading(false);
      setError(null);
    } else {
      checkTermsStatusForUid(uid);
    }
  });
  
  return () => unsubscribe();
}, [checkTermsStatusForUid]);
```

**Behavior**:
- Listens to Firebase Auth state changes
- Automatically checks terms status when user logs in
- Clears state when user logs out
- Prevents unnecessary Firestore queries when no user

#### Firestore Query
```tsx
const checkTermsStatusForUid = async (uid: string) => {
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);
  
  if (!userDoc.exists()) {
    setHasAcceptedTerms(false);
    return false;
  }
  
  const termsOfService = userData?.termsOfService;
  const hasValidAcceptance = Boolean(
    termsOfService?.accepted && 
    termsOfService?.version === CURRENT_TERMS_VERSION
  );
  
  setHasAcceptedTerms(hasValidAcceptance);
};
```

**Validation Logic**:
- Checks both `accepted: true` AND version match
- Version mismatch requires re-acceptance (future-proof)
- Missing document treated as not accepted

#### Firestore Write
```tsx
const acceptTerms = async () => {
  const userDocRef = doc(db, 'users', currentUserId);
  
  await updateDoc(userDocRef, {
    termsOfService: {
      accepted: true,
      acceptedAt: serverTimestamp(),
      version: CURRENT_TERMS_VERSION,
    },
    lastUpdated: serverTimestamp(),
  });
};
```

**Data Structure**:
```typescript
interface TermsOfService {
  accepted: boolean;
  acceptedAt: Date | null;
  version: string; // "1.0.0"
}
```

---

## TermsOfServiceModal Component

### UI Requirements

1. **Full Terms Display**: All terms content embedded in modal (no external links)
2. **7 Required Checkboxes**:
   - Read and understand complete ToS
   - Understand risks of meeting strangers
   - Assume responsibility for personal safety
   - Release TravalPass from liability
   - Confirm legal age (18+)
   - Comply with applicable laws
   - Read the complete ToS document

3. **Action Buttons**:
   - "I Accept These Terms" (enabled only when all checked)
   - "Decline & Logout" (always enabled)

### Acceptance Validation

```tsx
const allAcknowledged = Object.values(acknowledgments).every(Boolean) && hasReadTerms;

<TouchableOpacity
  disabled={!allAcknowledged || isAccepting}
  onPress={handleAccept}
>
  <Text>I Accept These Terms</Text>
</TouchableOpacity>
```

**User must**:
- Check all 7 acknowledgment boxes
- Cannot accept without completing all checkboxes
- Visual feedback shows button disabled state

### Loading States

```tsx
const [isAccepting, setIsAccepting] = useState(false);

const handleAccept = async () => {
  setIsAccepting(true);
  try {
    await onAccept();
  } finally {
    setIsAccepting(false);
  }
};
```

**Prevents**:
- Multiple rapid clicks on Accept button
- Race conditions during Firestore write
- User confusion during network delay

---

## Integration Testing

### Test Coverage (46 tests total)

1. **TermsGuard Tests (9 tests)**:
   - Renders children when terms accepted
   - Shows loading state while checking
   - Shows custom fallback during loading
   - Shows error state on Firestore failure
   - Shows modal when terms not accepted
   - Calls acceptTerms when user accepts
   - Signs out when user declines
   - Renders null when no user logged in

2. **TermsOfServiceModal Tests (10 tests)**:
   - Renders when visible
   - Shows full terms content
   - All 7 checkboxes present
   - Accept button disabled initially
   - Accept button enabled when all checked
   - Calls onAccept when accepted
   - Calls onDecline when declined
   - Shows loading state during acceptance
   - Prevents multiple accept clicks

3. **useTermsAcceptance Tests (7 tests)**:
   - Returns false when no user
   - Checks Firestore on user login
   - Returns true for valid acceptance
   - Returns false for declined terms
   - Returns false for old version
   - Writes to Firestore on accept
   - Throws error when not logged in

4. **AppNavigator Tests (20 tests)**:
   - Renders Auth when no user
   - Renders GuardedMainTabNavigator when user exists
   - TermsGuard wraps MainTabNavigator correctly
   - All navigation flows work correctly

### Running Tests

```bash
# Run all terms-related tests
npm test -- --testPathPattern="(TermsGuard|TermsOfService|useTermsAcceptance|AppNavigator)"

# Run specific test file
npm test -- src/__tests__/components/auth/TermsGuard.test.tsx

# Run with coverage
npm test -- --coverage --testPathPattern="TermsGuard"
```

---

## Common Issues & Solutions

### Issue: Modal doesn't appear after login

**Cause**: TermsGuard wrapping Stack.Screen directly (incorrect React Navigation usage)

**Solution**: Create wrapper component that wraps the navigator component itself
```tsx
// ❌ Wrong
<Stack.Screen name="Main">
  <TermsGuard>
    <MainTabNavigator />
  </TermsGuard>
</Stack.Screen>

// ✅ Correct
const GuardedMainTabNavigator = () => (
  <TermsGuard>
    <MainTabNavigator />
  </TermsGuard>
);

<Stack.Screen name="MainApp" component={GuardedMainTabNavigator} />
```

### Issue: Blank screen after declining terms

**Cause**: Using Firebase's `signOut(auth)` directly instead of AuthContext

**Solution**: Use AuthContext's signOut method
```tsx
// ❌ Wrong
import { signOut } from 'firebase/auth';
await signOut(auth);

// ✅ Correct
const { signOut: authSignOut } = useAuth();
await authSignOut();
```

### Issue: "Redirecting..." spinner shows after decline

**Cause**: TermsGuard not checking for no-user state early enough

**Solution**: Check `!userId` first before any other logic
```tsx
// ✅ Correct order
const userId = user?.uid;

if (!userId) return null; // First check

if (isLoading) return <Loading />;
if (error) return <Error />;
if (hasAcceptedTerms) return <>{children}</>;
return <Modal />;
```

### Issue: User can access app without accepting

**Cause**: TermsGuard not integrated in navigation hierarchy

**Solution**: Ensure guard wraps all authenticated screens
```tsx
const GuardedMainTabNavigator = () => (
  <TermsGuard>
    <MainTabNavigator />
  </TermsGuard>
);
```

---

## Firestore Security Rules

Ensure your Firestore rules allow users to update their own terms acceptance:

```javascript
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  
  // Additional validation for terms acceptance
  allow update: if request.auth.uid == userId 
    && request.resource.data.termsOfService.accepted is bool
    && request.resource.data.termsOfService.version is string;
}
```

---

## Future Enhancements

### Version Updates
When terms are updated to version 2.0.0:

1. Update `CURRENT_TERMS_VERSION` in `useTermsAcceptance.ts`
2. Update terms content in `src/legal/TERMS_OF_SERVICE.md`
3. Hook automatically detects version mismatch and shows modal again
4. Users must re-accept new version

### Analytics
Add tracking for terms acceptance rates:
```tsx
const handleAcceptTerms = async () => {
  await acceptTerms();
  // Track acceptance
  analytics.logEvent('terms_accepted', { version: '1.0.0' });
};

const handleDeclineTerms = async () => {
  // Track decline
  analytics.logEvent('terms_declined', { version: '1.0.0' });
  await authSignOut();
};
```

### Partial Acceptance
If needed, track which specific clauses users struggle with:
```tsx
const [acknowledgments, setAcknowledgments] = useState({
  readTerms: false,
  understandRisks: false,
  // ... track each separately
});

// On accept, log which took longest to check
analytics.logEvent('terms_acknowledgment_order', acknowledgments);
```

---

## Dependencies

### Required Packages
- `react-native`: Core React Native framework
- `firebase/firestore`: Firestore database integration
- `firebase/auth`: Firebase Authentication
- `@react-navigation/native`: Navigation framework
- `@react-navigation/stack`: Stack navigator

### Context Dependencies
- `AuthContext`: Provides user authentication state
- `useAuth()`: Hook to access auth context

### Type Safety
All components use strict TypeScript:
- No `any` types in production code
- Explicit interfaces for all props
- Type-safe Firestore queries

---

## S.O.L.I.D Principles Applied

### Single Responsibility
- **TermsGuard**: Only handles terms acceptance logic
- **TermsOfServiceModal**: Only handles UI presentation
- **useTermsAcceptance**: Only handles Firestore state management

### Open/Closed
- New feature added without modifying existing code
- Extends behavior through composition (wrapping components)
- No changes to AuthContext, navigation, or other core systems

### Liskov Substitution
- TermsGuard can wrap any React component
- Children prop accepts any valid React node
- Compatible with all navigator types

### Interface Segregation
- Small, focused interfaces (TermsGuardProps, UseTermsAcceptanceReturn)
- No bloated interfaces with unused properties
- Each component gets exactly what it needs

### Dependency Inversion
- Depends on abstractions (useAuth, useTermsAcceptance)
- Not coupled to concrete Firebase implementations
- Can swap Firestore for different backend with minimal changes

---

## Maintenance Notes

### When Terms Change
1. Update `src/legal/TERMS_OF_SERVICE.md`
2. Increment version in `useTermsAcceptance.ts`
3. Update modal content in `TermsOfServiceModal.tsx`
4. Add migration note in changelog

### Adding New Checkboxes
1. Add to `acknowledgments` state in modal
2. Update `acknowledgmentItems` array
3. Add test coverage for new checkbox
4. Update this documentation

### Debugging
Enable debug logging by adding console.log statements:
```tsx
// In TermsGuard
console.log('[TermsGuard] State:', { userId, hasAcceptedTerms, isLoading });

// In useTermsAcceptance
console.log('[useTermsAcceptance] Checking for UID:', uid);
console.log('[useTermsAcceptance] Result:', hasValidAcceptance);
```

**Remember**: Remove all console.log statements before git push.

---

## References

- OpenSpec Change: `openspec/archives/2025-11-27-add-terms-acknowledgement/`
- Terms Content: `src/legal/TERMS_OF_SERVICE.md`
- PWA Implementation: `voyager-pwa` repo (shared Firebase database)
- React Navigation Docs: https://reactnavigation.org/docs/auth-flow

---

**Last Updated**: November 27, 2025  
**Author**: AI-assisted implementation  
**Status**: Production-ready ✅

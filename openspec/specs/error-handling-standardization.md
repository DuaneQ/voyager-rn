# Standardized Error Handling — Design Specification

**Status**: Proposal  
**Date**: 2026-02-06  
**Author**: AI Assistant  
**Scope**: Cross-platform (iOS, Android, Web)

---

## 1. Problem Statement

### 1.1 Production Incident (Trigger)

A user signed in successfully via Firebase Auth but had **no document in the Firestore `users` collection**. The `useTermsAcceptance` hook called `updateDoc()` on a non-existent document, and the raw Firestore error surfaced directly to the user:

> **Error loading profile**  
> No document to update: projects/mundo1-1/databases/(default)/documents/users/BwYMglU1PCdkHeUCbXL9HFL2yuj1

This is a Firestore internal path — meaningless and alarming to users.

### 1.2 Root Cause Chain

```
1. User authenticates → Firebase Auth succeeds → user.uid exists
2. TermsGuard renders → useTermsAcceptance runs
3. useTermsAcceptance.acceptTerms() calls updateDoc(userDocRef, {...})
4. Firestore rejects: "No document to update" (doc doesn't exist)
5. Error caught by hook → setError(errorObj) with raw Firestore message
6. TermsGuard renders: <Text>{error.message}</Text>  ← RAW ERROR SHOWN
```

**The deeper problem**: `updateDoc()` requires an existing document. If the user's Firestore profile doesn't exist (orphaned auth, failed signup, data deletion), every `updateDoc()` call in the app will throw this same cryptic error.

### 1.3 Systemic Issues Found During Audit

| Issue | Severity | Occurrences |
|-------|----------|-------------|
| **No Error Boundaries** — Zero `ErrorBoundary` components exist. Any uncaught render error crashes the entire app. | 🔴 Critical | 0 boundaries |
| **No Global Error Handler** — No `ErrorUtils.setGlobalHandler`, no `unhandledRejection` listener. Unhandled JS errors crash silently on mobile. | 🔴 Critical | 0 handlers |
| **Raw errors shown to users** — Firestore paths, stack traces, and internal messages displayed directly in UI. | 🔴 Critical | ~10+ locations |
| **Silent error swallowing** — Empty `catch {}` blocks, `catch (_) {}`, errors logged but no user feedback. | 🟡 High | 14+ locations |
| **Inconsistent error types** — Hooks return `string | null`, `Error | null`, `{ success, error }`, or throw. No standard contract. | 🟡 High | Every hook |
| **Inconsistent error display** — Mix of `Alert.alert('Error', ...)`, `showAlert('error', ...)`, `window.alert(...)`, inline `<Text>`. | 🟡 High | 24+ `Alert.alert('Error')`, 30+ `showAlert`, 4 `window.alert` |
| **Only 1 domain has typed errors** — `TravelPreferencesError` is the only custom error class with `getUserMessage()`. All other domains use raw `Error`. | 🟡 High | 1 of ~8 domains |
| **No retry/recovery mechanisms** — Errors are dead ends. No "Retry" buttons, no automatic retry, no fallback states. | 🟡 High | All pages |
| **`updateDoc` used without existence check** — `UserProfileContext.updateProfile()` and `useTermsAcceptance.acceptTerms()` call `updateDoc()` assuming the document exists. | 🟡 High | 2+ locations |

---

## 2. Architecture Overview

### 2.1 Error Handling Layers (Defense in Depth)

```
┌─────────────────────────────────────────────────────────┐
│  Layer 5: Global Error Boundary + Unhandled JS Handler  │  ← Last resort
├─────────────────────────────────────────────────────────┤
│  Layer 4: Page-Level Error Boundaries                   │  ← Per-screen recovery
├─────────────────────────────────────────────────────────┤
│  Layer 3: UI Error Display (AlertContext / inline)       │  ← User feedback
├─────────────────────────────────────────────────────────┤
│  Layer 2: Hook Error State (standardized contract)      │  ← State management
├─────────────────────────────────────────────────────────┤
│  Layer 1: Service/Repository Error Translation          │  ← Domain errors
├─────────────────────────────────────────────────────────┤
│  Layer 0: External APIs (Firebase, Google, Stripe)      │  ← Raw errors
└─────────────────────────────────────────────────────────┘
```

### 2.2 S.O.L.I.D. Alignment

| Principle | Application |
|-----------|-------------|
| **Single Responsibility** | Each layer handles one concern: translation, state, display, or recovery |
| **Open/Closed** | New error domains added via factory functions + error code enums without modifying existing code |
| **Liskov Substitution** | All `AppError` subclasses are substitutable — any consumer expecting `AppError` works with `FirestoreError`, `AuthError`, etc. |
| **Interface Segregation** | Hooks expose a small `{ error, clearError }` interface. Components don't need to know about error internals |
| **Dependency Inversion** | Components depend on the abstract `AppError` interface and `ErrorDisplayService`, not on raw Firebase/Stripe errors |

---

## 3. Detailed Design

### 3.1 Layer 1: Base Error Class (`src/errors/AppError.ts`)

A single base error class that all domain errors extend. Replaces the patchwork of `string | Error | null`.

```typescript
// src/errors/AppError.ts

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum ErrorDomain {
  AUTH = 'auth',
  PROFILE = 'profile',
  FIRESTORE = 'firestore',
  ITINERARY = 'itinerary',
  CHAT = 'chat',
  SEARCH = 'search',
  NETWORK = 'network',
  VIDEO = 'video',
  SUBSCRIPTION = 'subscription',
  TRAVEL_PREFERENCES = 'travel_preferences',
  UNKNOWN = 'unknown',
}

export interface AppErrorOptions {
  code: string;
  message: string;                    // Technical message (for logs)
  userMessage: string;                // User-facing message (for UI)
  severity?: ErrorSeverity;
  domain: ErrorDomain;
  recoverable?: boolean;              // Can the user retry?
  retryAction?: string;               // Hint for retry button label
  originalError?: unknown;            // Wrapped raw error
  context?: Record<string, unknown>;  // Additional debug info
}

export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly severity: ErrorSeverity;
  public readonly domain: ErrorDomain;
  public readonly recoverable: boolean;
  public readonly retryAction?: string;
  public readonly originalError?: unknown;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.severity = options.severity ?? ErrorSeverity.ERROR;
    this.domain = options.domain;
    this.recoverable = options.recoverable ?? false;
    this.retryAction = options.retryAction;
    this.originalError = options.originalError;
    this.context = options.context;
    this.timestamp = Date.now();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /** Safe getter for UI display — never exposes internal details */
  getUserMessage(): string {
    return this.userMessage;
  }

  /** Structured log output */
  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      domain: this.domain,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      context: this.context,
      originalError: this.originalError instanceof Error
        ? { message: this.originalError.message, stack: this.originalError.stack }
        : this.originalError,
    };
  }
}

/** Type guard */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
```

### 3.2 Layer 1: Error Factories (per domain)

Each domain gets a factory module that translates raw external errors into `AppError` instances. These are the **only** places that understand raw Firebase/API error shapes.

#### 3.2.1 Firestore Error Factory (`src/errors/factories/firestoreErrors.ts`)

```typescript
// src/errors/factories/firestoreErrors.ts

import { AppError, ErrorDomain, ErrorSeverity } from '../AppError';

export function createFirestoreError(
  rawError: unknown,
  operation: string,
  context?: Record<string, unknown>
): AppError {
  const err = rawError as any;
  const code = err?.code || 'firestore/unknown';
  const message = err?.message || 'Unknown Firestore error';

  // Map Firestore error codes to user-friendly messages
  switch (code) {
    case 'not-found':
      return new AppError({
        code: 'FIRESTORE_DOC_NOT_FOUND',
        message: `Document not found during ${operation}: ${message}`,
        userMessage: 'The requested data was not found. It may have been removed.',
        severity: ErrorSeverity.WARNING,
        domain: ErrorDomain.FIRESTORE,
        recoverable: true,
        retryAction: 'Retry',
        originalError: rawError,
        context: { ...context, operation },
      });

    case 'permission-denied':
      return new AppError({
        code: 'FIRESTORE_PERMISSION_DENIED',
        message: `Permission denied during ${operation}: ${message}`,
        userMessage: 'You don\'t have permission to perform this action. Please sign in again.',
        severity: ErrorSeverity.ERROR,
        domain: ErrorDomain.FIRESTORE,
        recoverable: true,
        retryAction: 'Sign In Again',
        originalError: rawError,
        context: { ...context, operation },
      });

    case 'unavailable':
    case 'deadline-exceeded':
      return new AppError({
        code: 'FIRESTORE_NETWORK_ERROR',
        message: `Network error during ${operation}: ${message}`,
        userMessage: 'Connection error. Please check your internet and try again.',
        severity: ErrorSeverity.WARNING,
        domain: ErrorDomain.NETWORK,
        recoverable: true,
        retryAction: 'Retry',
        originalError: rawError,
        context: { ...context, operation },
      });

    default:
      // Detect "No document to update" pattern (the production bug)
      if (message.includes('No document to update') || message.includes('NOT_FOUND')) {
        return new AppError({
          code: 'FIRESTORE_DOC_NOT_FOUND',
          message: `Document missing during ${operation}: ${message}`,
          userMessage: 'Your profile data was not found. Please try signing out and back in.',
          severity: ErrorSeverity.ERROR,
          domain: ErrorDomain.PROFILE,
          recoverable: true,
          retryAction: 'Sign Out & Retry',
          originalError: rawError,
          context: { ...context, operation },
        });
      }

      return new AppError({
        code: `FIRESTORE_${code.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
        message: `Firestore error during ${operation}: ${message}`,
        userMessage: 'Something went wrong. Please try again.',
        severity: ErrorSeverity.ERROR,
        domain: ErrorDomain.FIRESTORE,
        recoverable: true,
        retryAction: 'Retry',
        originalError: rawError,
        context: { ...context, operation },
      });
  }
}
```

#### 3.2.2 Profile Error Factory (`src/errors/factories/profileErrors.ts`)

```typescript
import { AppError, ErrorDomain, ErrorSeverity } from '../AppError';

export function createProfileNotFoundError(userId: string): AppError {
  return new AppError({
    code: 'PROFILE_NOT_FOUND',
    message: `User profile not found for uid: ${userId}`,
    userMessage: 'Your profile could not be found. Please create your profile to continue.',
    severity: ErrorSeverity.ERROR,
    domain: ErrorDomain.PROFILE,
    recoverable: true,
    retryAction: 'Create Profile',
    context: { userId },
  });
}

export function createProfileUpdateError(rawError: unknown): AppError {
  return new AppError({
    code: 'PROFILE_UPDATE_FAILED',
    message: `Failed to update profile: ${(rawError as Error)?.message || 'Unknown'}`,
    userMessage: 'Failed to update your profile. Please try again.',
    severity: ErrorSeverity.ERROR,
    domain: ErrorDomain.PROFILE,
    recoverable: true,
    retryAction: 'Retry',
    originalError: rawError,
  });
}
```

#### 3.2.3 Migration path for TravelPreferencesError

`TravelPreferencesErrors.ts` already follows a similar pattern. It can be gradually adapted to extend `AppError` instead of `Error`, preserving the existing `getUserMessage()` API and `isTravelPreferencesError()` type guard. This is a **non-breaking refactor** — `AppError` has the same `getUserMessage()` method.

### 3.3 Layer 2: Standardized Hook Error Contract

Every hook that does async work MUST expose the same error shape:

```typescript
// src/types/HookErrorState.ts

import { AppError } from '../errors/AppError';

export interface HookErrorState {
  /** The current error, or null */
  error: AppError | null;
  /** Clear the error (e.g., when retrying) */
  clearError: () => void;
}
```

**Migration mapping** (existing → standard):

| Current Pattern | Standard Pattern |
|----------------|------------------|
| `error: string \| null` + `setError(msg)` | `error: AppError \| null` + `clearError()` |
| `error: Error \| null` | `error: AppError \| null` |
| `return { success: false, error: string }` | `return { success: false, error: AppError }` (or throw) |
| `throw new Error('...')` | `throw new AppError({...})` |
| `catch (err) { console.error(err) }` | `catch (err) { setError(toAppError(err)); }` |

**Helper for migration** — wraps unknown errors into `AppError`:

```typescript
// src/errors/toAppError.ts

import { AppError, isAppError, ErrorDomain, ErrorSeverity } from './AppError';

export function toAppError(err: unknown, domain?: ErrorDomain): AppError {
  if (isAppError(err)) return err;

  if (err instanceof Error) {
    return new AppError({
      code: 'UNKNOWN_ERROR',
      message: err.message,
      userMessage: 'Something went wrong. Please try again.',
      domain: domain ?? ErrorDomain.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      recoverable: true,
      retryAction: 'Retry',
      originalError: err,
    });
  }

  return new AppError({
    code: 'UNKNOWN_ERROR',
    message: String(err),
    userMessage: 'An unexpected error occurred.',
    domain: domain ?? ErrorDomain.UNKNOWN,
    severity: ErrorSeverity.ERROR,
    recoverable: false,
    originalError: err,
  });
}
```

### 3.4 Layer 3: Error Display Components

#### 3.4.1 Inline Error Display (`src/components/common/ErrorDisplay.tsx`)

A reusable component for showing errors within a screen, with optional retry:

```typescript
interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  compact?: boolean;     // Small inline vs full-screen
}
```

This replaces the ad-hoc patterns like:
```tsx
// BEFORE (raw error shown)
<Text style={styles.errorText}>Error loading profile</Text>
<Text style={styles.errorDetail}>{error.message}</Text>

// AFTER (safe user message + retry)
<ErrorDisplay error={error} onRetry={refresh} />
```

#### 3.4.2 Enhanced AlertContext

Extend the existing `AlertContext.showAlert()` to accept `AppError` objects:

```typescript
// Add to AlertContext
const showErrorAlert = (error: AppError) => {
  showAlert(error.severity, error.getUserMessage());
};
```

### 3.5 Layer 4: Page-Level Error Boundaries

```typescript
// src/components/common/ErrorBoundary.tsx

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  level: 'page' | 'section' | 'global';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service (future: Sentry/Crashlytics)
    console.error(`[ErrorBoundary:${this.props.level}]`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.resetError);
      }
      return <DefaultErrorFallback error={this.state.error!} onReset={this.resetError} />;
    }
    return this.props.children;
  }
}
```

**Placement strategy**:

```tsx
// App.tsx — Global boundary (last resort)
<ErrorBoundary level="global" fallback={GlobalCrashScreen}>
  <SafeAreaProvider>
    <AuthProvider>
      <AlertProvider>
        <UserProfileProvider>
          <AppNavigator />
        </UserProfileProvider>
      </AlertProvider>
    </AuthProvider>
  </SafeAreaProvider>
</ErrorBoundary>

// AppNavigator.tsx — Per-tab boundaries
<Tab.Screen name="Search">
  {() => (
    <ErrorBoundary level="page">
      <SearchPage />
    </ErrorBoundary>
  )}
</Tab.Screen>
```

### 3.6 Layer 5: Global Unhandled Error Handler

```typescript
// src/utils/globalErrorHandler.ts

import { Platform } from 'react-native';

export function setupGlobalErrorHandlers() {
  // React Native unhandled JS errors
  if (typeof ErrorUtils !== 'undefined') {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.error('[GlobalErrorHandler]', { error, isFatal });
      // Future: send to Sentry/Crashlytics
      // Always call default handler to preserve crash reporting
      defaultHandler(error, isFatal);
    });
  }

  // Unhandled promise rejections (web + native)
  if (typeof globalThis !== 'undefined') {
    globalThis.addEventListener?.('unhandledrejection', (event) => {
      console.error('[UnhandledRejection]', event.reason);
      // Future: send to error reporting service
    });
  }
}
```

---

## 4. Fixing the Production Bug (Immediate)

The `useTermsAcceptance.acceptTerms()` function calls `updateDoc()` which fails when the user document doesn't exist. The fix:

### 4.1 `useTermsAcceptance.ts` — Use `setDoc` with merge

```typescript
// CURRENT (breaks when doc doesn't exist):
await updateDoc(userDocRef, {
  termsOfService: { ... },
  lastUpdated: firestoreServerTimestamp(),
});

// FIXED (creates doc if needed, updates if exists):
import { setDoc } from 'firebase/firestore';

await setDoc(userDocRef, {
  termsOfService: { ... },
  lastUpdated: firestoreServerTimestamp(),
}, { merge: true });
```

### 4.2 `UserProfileContext.tsx` — Same fix + error translation

```typescript
// CURRENT:
await updateDoc(doc(db, 'users', userId), data);

// FIXED:
try {
  await setDoc(doc(db, 'users', userId), data, { merge: true });
} catch (error) {
  throw createFirestoreError(error, 'updateProfile', { userId });
}
```

### 4.3 `TermsGuard.tsx` — Show user-friendly error + recovery

```tsx
// CURRENT (shows raw Firestore message):
<Text style={styles.errorDetail}>{error.message}</Text>

// FIXED (shows safe message + sign-out recovery):
<ErrorDisplay
  error={isAppError(error) ? error : toAppError(error, ErrorDomain.PROFILE)}
  onRetry={() => checkTermsStatus()}
/>
<TouchableOpacity onPress={handleDeclineTerms}>
  <Text>Sign Out & Try Again</Text>
</TouchableOpacity>
```

---

## 5. Implementation Plan (Phased)

### Phase 1: Foundation + Critical Fixes (Week 1) — Zero Breaking Changes

| Task | Files | Risk |
|------|-------|------|
| Create `AppError` base class + `toAppError` helper | `src/errors/AppError.ts`, `src/errors/toAppError.ts` | None — new files |
| Create Firestore error factory | `src/errors/factories/firestoreErrors.ts` | None — new file |
| Create Profile error factory | `src/errors/factories/profileErrors.ts` | None — new file |
| Fix `updateDoc` → `setDoc({merge:true})` in `useTermsAcceptance` | `src/hooks/useTermsAcceptance.ts` | Low — more permissive, handles missing docs |
| Fix `updateDoc` → `setDoc({merge:true})` in `UserProfileContext` | `src/context/UserProfileContext.tsx` | Low — same |
| Fix `updateDoc` → `setDoc({merge:true})` in `useUsageTracking` | `src/hooks/useUsageTracking.ts` | Low — same |
| Create `ErrorBoundary` component | `src/components/common/ErrorBoundary.tsx` | None — new file |
| Wrap `App.tsx` in global `ErrorBoundary` | `App.tsx` | None — additive |
| Create `ErrorDisplay` component | `src/components/common/ErrorDisplay.tsx` | None — new file |
| Fix `TermsGuard` to use `ErrorDisplay` instead of raw `error.message` | `src/components/auth/TermsGuard.tsx` | Low — UI change only |
| Setup global error handlers | `src/utils/globalErrorHandler.ts`, `App.tsx` | None — additive |
| Tests for all new code | `src/__tests__/errors/`, `src/__tests__/components/ErrorBoundary.test.tsx` | None |

**Verification**: `npx tsc --noEmit` + `npm test` + manual test on iOS/Android/Web

### Phase 2: Hook Migration (Week 2–3) — Gradual

Migrate hooks one at a time to use `AppError` instead of raw strings/Errors. Each migration is atomic and independently testable.

**Priority order** (by user impact):

1. `useTermsAcceptance` — blocks entire app on failure
2. `useAllItineraries` — main page data
3. `useSearchItineraries` — search functionality
4. `useCreateItinerary` — itinerary creation
5. `useDeleteItinerary` — itinerary deletion
6. `useUsageTracking` — usage limits
7. `useConnections` / `useMessages` — chat
8. `useAIGenerationV2` — AI features
9. `useRemoveConnection` — connection removal

**Per-hook migration pattern**:

```typescript
// BEFORE:
const [error, setError] = useState<string | null>(null);
// ...
catch (err) {
  setError(err instanceof Error ? err.message : 'Failed');
}

// AFTER:
const [error, setError] = useState<AppError | null>(null);
const clearError = useCallback(() => setError(null), []);
// ...
catch (err) {
  setError(createFirestoreError(err, 'fetchItineraries'));
}
// Return: { error, clearError, ... }
```

### Phase 3: Page Error Boundaries (Week 3) — Additive

Wrap each tab screen in a page-level `ErrorBoundary`:

```tsx
// Each tab gets its own boundary — crash in Chat doesn't kill Search
<ErrorBoundary level="page">
  <SearchPage />
</ErrorBoundary>
```

### Phase 4: Consolidate Display Patterns (Week 4) — Gradual

Replace ad-hoc error display with `ErrorDisplay` component:

| Current | Count | Replacement |
|---------|-------|-------------|
| `Alert.alert('Error', rawMessage)` | 24 | `Alert.alert('Error', error.getUserMessage())` |
| `showAlert('error', rawMessage)` | 30 | `showAlert('error', error.getUserMessage())` |
| `window.alert(...)` | 4 | Route through `AlertContext` |
| `<Text>{error.message}</Text>` (raw) | ~10 | `<ErrorDisplay error={error} />` |

### Phase 5: TravelPreferencesError Migration (Week 4+) — Non-Breaking

Make `TravelPreferencesError` extend `AppError`:

```typescript
// BEFORE:
export class TravelPreferencesError extends Error { ... }

// AFTER:
export class TravelPreferencesError extends AppError {
  constructor(message: string, code: TravelPreferencesErrorCode, details?: any) {
    super({
      code,
      message,
      userMessage: getUserMessageForCode(code), // existing switch logic
      domain: ErrorDomain.TRAVEL_PREFERENCES,
      severity: ErrorSeverity.ERROR,
      recoverable: true,
      context: details,
    });
  }
}
```

The existing `isTravelPreferencesError()` type guard and `getUserMessage()` continue to work — `AppError` already has `getUserMessage()`.

---

## 6. File Structure

```
src/
├── errors/
│   ├── AppError.ts                    # Base error class + types
│   ├── toAppError.ts                  # Unknown → AppError converter
│   ├── TravelPreferencesErrors.ts     # Existing (Phase 5: extend AppError)
│   └── factories/
│       ├── authErrors.ts              # Firebase Auth → AppError
│       ├── firestoreErrors.ts         # Firestore → AppError
│       ├── profileErrors.ts           # Profile domain errors
│       ├── itineraryErrors.ts         # Itinerary domain errors
│       ├── chatErrors.ts              # Chat domain errors
│       ├── networkErrors.ts           # Network/connectivity errors
│       └── subscriptionErrors.ts      # Stripe/subscription errors
├── components/
│   └── common/
│       ├── ErrorBoundary.tsx          # React error boundary (class component)
│       └── ErrorDisplay.tsx           # Reusable inline error UI
├── utils/
│   └── globalErrorHandler.ts          # Global JS error + promise rejection handler
└── types/
    └── HookErrorState.ts              # Standardized hook error interface
```

---

## 7. Cost Analysis

| Item | Cost |
|------|------|
| New files (errors/, ErrorBoundary, ErrorDisplay) | $0 — code only |
| Error reporting service (future: Sentry/Crashlytics) | Not included in this spec. Would be a separate proposal with cost analysis |
| Bundle size impact | Minimal — ~2-3 KB gzipped for all error infrastructure |
| Development effort | ~1-2 weeks for Phases 1-3, ~1 week for Phase 4-5 |
| Risk of regressions | Low — Phase 1 is entirely additive. Phases 2-5 are gradual migrations with per-hook testing |

---

## 8. Testing Strategy

### 8.1 Unit Tests

- `AppError` construction, `getUserMessage()`, `toLogObject()`, `isAppError()` type guard
- Each error factory: input Firestore/Auth errors → expected `AppError` output
- `toAppError()` with various inputs: `Error`, `string`, `null`, `AppError` (passthrough)
- `ErrorBoundary`: render children normally, catch error → show fallback, reset → show children

### 8.2 Integration Tests

- `useTermsAcceptance` with missing Firestore doc → `AppError` with friendly message (not raw path)
- `UserProfileContext.updateProfile` with missing doc → `setDoc` merge succeeds
- `TermsGuard` rendering with error state → `ErrorDisplay` shown (not raw message)

### 8.3 Manual Testing Checklist

Each scenario below includes **exact steps**, **expected behavior**, and **what to verify**. Test on all three platforms (iOS, Android, Web) unless stated otherwise.

---

#### 8.3.1 Firestore "Document Not Found" Error (The Production Bug)

**What it tests**: Raw Firestore paths are never shown to users when a user's document is missing.

**Prerequisites**:
- Access to the Firebase Console (dev project)
- A test user account you can safely modify

**Steps**:
1. Sign in to the app with a test user on **iOS, Android, and Web**
2. Confirm the user can navigate normally (profile loads, tabs work)
3. Open Firebase Console → Firestore → `users` collection
4. **Delete the user's document** (or rename the document ID so it can't be found)
5. In the app, navigate to a screen that reads the user's profile:
   - Go to **Profile tab** → should trigger a profile load
   - Go to **Settings** → try updating a setting
   - If Terms of Service acceptance is required, trigger that flow
6. Observe the error displayed

**Expected behavior**:
- ✅ A friendly message appears: *"Your profile could not be found. Please try signing out and back in."* or *"Your data was not found."*
- ✅ A recovery option is shown (e.g., "Sign Out & Retry" button)
- ❌ **NEVER** see raw Firestore paths like `projects/mundo1-1/databases/(default)/documents/users/...`
- ❌ **NEVER** see `No document to update` raw error text
- ❌ **NEVER** see a stack trace or internal error code

**Cleanup**: Re-create the user's document in Firestore Console, or sign out and sign in again to trigger profile creation.

---

#### 8.3.2 Network Connectivity Errors

**What it tests**: Clean error messages appear when the network is unavailable, with a retry option.

**Steps (Mobile — iOS/Android)**:
1. Sign in and navigate to the **Search** or **Video Feed** tab
2. Turn on **Airplane Mode** (Settings → Airplane Mode)
3. Pull to refresh, or navigate to a different tab that loads data
4. Observe the error displayed
5. Turn **Airplane Mode off**
6. Press the **Retry** button (or pull to refresh again)

**Steps (Web)**:
1. Sign in and navigate to the **Search** or **Video Feed** tab
2. Open **DevTools → Network tab** → set throttling to **Offline**
3. Refresh the page or navigate to a tab that loads data
4. Observe the error displayed
5. Set throttling back to **No Throttling**
6. Press **Retry** or refresh

**Expected behavior**:
- ✅ A friendly message appears: *"Connection error. Please check your internet and try again."* or *"Could not load this video. Please check your connection and try again."*
- ✅ A **Retry** button is visible
- ✅ After restoring connectivity and pressing Retry, data loads normally
- ❌ **NEVER** see `ETIMEDOUT`, `ECONNREFUSED`, `deadline-exceeded`, or any raw error code
- ❌ **NEVER** see a stack trace

---

#### 8.3.3 ErrorBoundary — Component Crash Isolation

**What it tests**: A crash in one screen/tab does not crash the entire app. Other tabs remain functional.

**Steps (Development mode — `__DEV__` only)**:
1. Start the app in development mode (`npx expo start`)
2. Temporarily inject a crash into a single page component:
   - In **SearchPage.tsx**, add `throw new Error('Test crash')` as the first line of the component body
3. Navigate to the **Search** tab
4. Observe the error screen
5. Navigate to **other tabs** (Profile, Chat, Video Feed)

**Expected behavior**:
- ✅ The Search tab shows a fallback: *"This section encountered an error"* with a **"Try Again"** button
- ✅ If level="global", shows: *"Something went wrong"* with a **"Try Again"** button
- ✅ **Other tabs still work** — you can navigate to Profile, Chat, etc. without crashing
- ✅ In `__DEV__` mode, debug info (error message) appears below the friendly message
- ✅ Pressing **"Try Again"** resets the boundary and re-renders the component
- ❌ The entire app does **NOT** crash or show a white/blank screen

**Cleanup**: Remove the injected `throw` statement.

---

#### 8.3.4 ErrorDisplay Component — Various Error Types

**What it tests**: The `ErrorDisplay` component renders safely for all error types and never leaks internal details.

**Steps**:
1. Navigate to any screen that uses `ErrorDisplay` (e.g., profile load error state, video feed error state)
2. Trigger an error condition (see scenarios below)
3. Verify the UI

**Scenario A — AppError (preferred path)**:
- Trigger a Firestore error (e.g., delete a document and try to load it)
- **Verify**: User sees the error's `userMessage`, not the raw `message`. Retry button shows the `retryAction` label.

**Scenario B — Raw Error object (backward-compatible path)**:
- If any hook still returns a raw `Error` instead of `AppError`, the `ErrorDisplay` should show: *"Something went wrong. Please try again."*
- **Verify**: The raw `error.message` (which may contain Firestore paths) is **NOT** displayed.

**Scenario C — String error (legacy path)**:
- If an error state is a plain string, `ErrorDisplay` should show: *"Something went wrong. Please try again."*
- **Verify**: The raw string is **NOT** displayed.

---

#### 8.3.5 Video Error — Deleted Video (Cross-Platform)

**What it tests**: When a video is deleted on one platform, the other platform shows a friendly message instead of a raw error.

**Prerequisites**:
- A test user with at least one uploaded video
- Access to the app on two platforms (e.g., Web + iOS, or Web + Android)

**Steps**:
1. On **Platform A** (e.g., Web), sign in and go to the **Profile** tab
2. Open the video grid and **delete a video** that you know the other platform has cached or will try to load
3. On **Platform B** (e.g., iOS or Android), navigate to the **Video Feed** or the user's profile
4. Scroll to where the deleted video would appear
5. Observe the error displayed on the video card

**Expected behavior**:
- ✅ The video card shows: *"This video is no longer available. It may have been removed."*
- ✅ No retry button (deleted videos can't be retried — `recoverable: false`)
- ❌ **NEVER** see `Object does not exist at location`, `404`, `storage/object-not-found`, or Firebase Storage URLs
- ❌ **NEVER** see the video's Firestore document ID (e.g., `BwYMglU1PCdkHeUCbXL9HFL2yuj1`)

---

#### 8.3.6 Video Error — Codec Incompatibility (Android)

**What it tests**: Android devices with limited codec support show a friendly message instead of a raw `MediaCodecVideoRenderer` error.

**Prerequisites**:
- An Android device or emulator
- A video encoded in HEVC/H.265 (or a format the test device doesn't support)

**Steps**:
1. Upload a video in an uncommon codec (HEVC/H.265) from Web or iOS
2. On an Android device/emulator, navigate to the **Video Feed**
3. Scroll to the video and let it attempt to play
4. Observe the error

**Expected behavior**:
- ✅ The video card shows: *"This video format is not compatible with your device."*
- ✅ No retry button (`recoverable: false` — retrying won't fix codec support)
- ❌ **NEVER** see `MediaCodecVideoRenderer error, index=0, format=Format(2, null, video/hevc, 1920x1080...`
- ❌ **NEVER** see raw codec names like `video/hevc` or decoder pipeline details

---

#### 8.3.7 Video Error — Network Failure During Playback

**What it tests**: Videos that fail to load due to network issues show a recoverable error.

**Steps**:
1. Navigate to the **Video Feed** and let a few videos start loading
2. **Kill the network** (Airplane Mode on mobile, Offline throttling on Web)
3. Scroll to a new video that hasn't loaded yet
4. Observe the error
5. **Restore the network**
6. Press **Retry** (if available) or scroll away and back

**Expected behavior**:
- ✅ The video card shows: *"Could not load this video. Please check your connection and try again."*
- ✅ A **Retry** button is visible (`recoverable: true`)
- ✅ After restoring network and retrying, the video loads and plays
- ❌ **NEVER** see `timeout`, `416 Range Not Satisfiable`, `ECONNREFUSED`, or raw HTTP status codes

---

#### 8.3.8 Video Error — Autoplay Blocked (Web Only)

**What it tests**: Web browsers that block autoplay show a helpful tap-to-play message.

**Prerequisites**:
- A desktop web browser (Chrome, Safari, Firefox)
- Browser autoplay settings set to block (or a fresh tab with no prior user interaction)

**Steps**:
1. Open the app in a **new incognito/private browser window** (no prior interaction)
2. Navigate directly to the **Video Feed** (some browsers require user interaction before allowing autoplay)
3. Observe the first video card

**Expected behavior**:
- ✅ If autoplay is blocked, the video shows: *"Tap to play this video."*
- ✅ Severity is INFO (not a real error — just a browser policy)
- ✅ Tapping the video starts playback
- ❌ **NEVER** see `play() request was interrupted` or `user didn't interact with the document first`

---

#### 8.3.9 Video Feed — Firestore Query Failure

**What it tests**: When the video feed Firestore query fails, the page shows a friendly error instead of crashing.

**Steps**:
1. Navigate to the **Video Feed** tab
2. Trigger a Firestore failure (one of):
   - Kill the network **before** the feed loads
   - Temporarily modify Firestore security rules to deny reads on the `videos` collection (dev only)
3. Observe the feed error state

**Expected behavior**:
- ✅ The feed shows: *"Failed to load videos. Please check your connection and try again."*
- ✅ A **Retry** button is visible
- ✅ The error is an `AppError` with `code: 'VIDEO_FEED_LOAD_FAILED'`
- ❌ **NEVER** see raw Firestore error messages or permission denial details

---

#### 8.3.10 Video Error — Video Grid Playback Failure (Cross-Platform Alert)

**What it tests**: The VideoGrid component uses cross-platform `showAlert()` instead of `Alert.alert()` which is broken on web.

**Steps (Web)**:
1. Navigate to a user's profile that has uploaded videos
2. Open the **video grid**
3. Trigger a playback error (e.g., corrupted video file, or delete the video's storage object)
4. Observe the alert/notification

**Expected behavior**:
- ✅ On **Web**: A banner/toast alert appears (via `showAlert('error', ...)`)
- ✅ On **iOS/Android**: The same `showAlert` system works (not `Alert.alert`)
- ❌ On **Web**: Does **NOT** call `Alert.alert()` (which shows nothing or crashes on web)
- ❌ **NEVER** see `window.alert()` or browser-native dialogs for errors

---

#### 8.3.11 Global Error Handler — Unhandled Promise Rejection

**What it tests**: Unhandled promise rejections are caught and logged (not silently swallowed).

**Steps (Development mode)**:
1. Open the **Metro bundler console** or **browser DevTools console**
2. Temporarily add an unhandled promise rejection somewhere in the app:
   ```typescript
   // Temporary test code in any component
   useEffect(() => {
     Promise.reject(new Error('Test unhandled rejection'));
   }, []);
   ```
3. Navigate to that screen
4. Check the console output

**Expected behavior**:
- ✅ Console shows: `[GlobalErrorHandler] Unhandled promise rejection: { reason: { message: 'Test unhandled rejection' } }`
- ✅ The app does **NOT** crash
- ❌ The rejection is **NOT** silently swallowed (it appears in console)

**Cleanup**: Remove the temporary test code.

---

#### 8.3.12 Verification Checklist (Run After All Scenarios)

After completing manual testing, verify these cross-cutting concerns:

| Check | Status |
|-------|--------|
| No raw Firestore paths visible anywhere in the UI | ☐ |
| No raw stack traces visible anywhere in the UI | ☐ |
| No raw video IDs visible to users (outside `__DEV__` debug info) | ☐ |
| No raw error codes visible (e.g., `not-found`, `permission-denied`) | ☐ |
| No `Alert.alert()` used on web (check browser console for warnings) | ☐ |
| All retry buttons work and actually retry the failed operation | ☐ |
| ErrorBoundary isolates crashes — other tabs survive | ☐ |
| `__DEV__` mode shows debug info; production does not | ☐ |
| All three platforms (iOS, Android, Web) tested | ☐ |
| All existing tests still pass: `npm test` | ☐ |
| TypeScript compiles: `npx tsc --noEmit` | ☐ |

---

## 9. Migration Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing error consumers | `AppError` has `.message` (inherits from `Error`) — existing `error.message` reads still work |
| Breaking existing `TravelPreferencesError` | Phase 5 makes it extend `AppError` — `getUserMessage()` method name matches exactly |
| Test failures from changed error shapes | Hooks that currently return `string` errors will return `AppError` — update tests to check `error.getUserMessage()` or `error.userMessage` |
| Platform-specific differences | `ErrorBoundary` is React core — works on all platforms. `ErrorUtils` guarded with `typeof` check |

---

## 10. Success Metrics

- [ ] Zero raw error messages shown to users (no Firestore paths, stack traces, or internal codes)
- [ ] Every async hook exposes `error: AppError | null` + `clearError()`
- [ ] Global + page-level Error Boundaries catch render crashes
- [ ] The specific "No document to update" production bug is impossible to reproduce
- [ ] All 2001+ existing tests continue to pass
- [ ] TypeScript compilation remains clean

# Authentication Documentation

## Quick Reference

### Current Implementation (Dec 2025)
- **Firebase Web SDK v12.5.0** - Direct SDK usage, no REST API
- **AuthContext** - Manages authentication state using Web SDK
- **UserProfileContext** - Loads profile after auth via `onAuthStateChanged`

### Key Documents
- [AUTH_GUIDE.md](AUTH_GUIDE.md) - Current implementation guide
- [SIMPLE_AUTH_FLOW.md](SIMPLE_AUTH_FLOW.md) - Migration from REST API to Web SDK
- [TESTING_GOOGLE_SIGNIN_ON_DEVICE.md](TESTING_GOOGLE_SIGNIN_ON_DEVICE.md) - Google Sign-In testing
- [CREATE_IOS_OAUTH_CLIENT_ID.md](CREATE_IOS_OAUTH_CLIENT_ID.md) - iOS OAuth setup

---

## Overview

The authentication system uses **Firebase Web SDK** directly (matches PWA architecture). Clean separation between authentication (AuthContext) and profile management (UserProfileContext).

---

## Core Architecture Principles

### S.O.L.I.D Compliance

1. **Single Responsibility**: Each component has one clear purpose
   - `AuthPage`: Orchestrates authentication flows
   - Form components: Handle UI and validation only
   - `AuthContext`: Manages authentication state
   - Firebase services: Handle API communication

2. **Open/Closed**: Extensible without modification
   - New auth forms can be added without changing `AuthPage`
   - New authentication methods can be added through new form components

3. **Liskov Substitution**: All form components implement consistent interfaces
   - All forms receive similar callback props
   - All forms handle loading states uniformly

4. **Interface Segregation**: Small, focused interfaces
   - Each form component has specific, minimal props
   - No bloated interfaces with unused methods

5. **Dependency Inversion**: Depends on abstractions
   - Components depend on `AuthContext`, not Firebase directly
   - Forms receive callbacks, not concrete auth implementations

---

## Architecture

### Code Organization
```
src/
├── context/
│   ├── AuthContext.tsx           # Firebase Web SDK auth state
│   └── UserProfileContext.tsx    # Profile management (loads after auth)
├── pages/
│   └── AuthPage.tsx              # Authentication UI entry point
├── components/auth/forms/        # Reusable form components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── ForgotPasswordForm.tsx
│   └── ResendVerificationForm.tsx
└── config/
    └── firebaseConfig.ts         # Firebase initialization
```

### Authentication Flow
1. User fills form (login/register)
2. AuthContext calls Firebase Web SDK
3. `auth.onAuthStateChanged` fires
4. UserProfileContext loads profile from Firestore
5. App checks `hasAcceptedTerms` → shows modal if needed

---

## Google Sign-In Setup

Google Sign-In requires native build (won't work with Expo Go).

**Testing:**
```bash
./scripts/test-google-signin.sh
# or
npx expo run:android --device
```

**Documentation:**
- [TESTING_GOOGLE_SIGNIN_ON_DEVICE.md](TESTING_GOOGLE_SIGNIN_ON_DEVICE.md) - Testing guide
- [CREATE_IOS_OAUTH_CLIENT_ID.md](CREATE_IOS_OAUTH_CLIENT_ID.md) - iOS OAuth setup

---

## Implementation Details

### Sign Up
```typescript
// AuthContext.signUp()
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
await setDoc(doc(db, 'users', userCredential.user.uid), profileData);
await sendEmailVerification(userCredential.user);
```

### Sign In
```typescript
// AuthContext.signIn()
const userCredential = await signInWithEmailAndPassword(auth, email, password);
if (!userCredential.user.emailVerified) {
  throw new Error('Please verify your email');
}
```

### Profile Load
```typescript
// UserProfileContext - after onAuthStateChanged
const userDoc = await getDoc(doc(db, 'users', userId));
const profile = userDoc.data();
if (!profile.hasAcceptedTerms) {
  // Show terms modal
}
```

---

## Testing

**Run tests:**
```bash
npm test src/context/AuthContext.test.tsx
npm test src/pages/AuthPage.test.tsx
```

**Key test coverage:**
- Sign up flow with email verification
- Sign in with email verification check
- Google Sign-In/Sign-Up flows
- Error handling and validation

---

## Migration History

**Dec 2025**: Migrated from REST API + custom tokens to Firebase Web SDK
- See [SIMPLE_AUTH_FLOW.md](SIMPLE_AUTH_FLOW.md) for details
- Removed 765+ lines of complex REST API code
- Now matches PWA architecture exactly

**Location**: `src/components/auth/forms/ForgotPasswordForm.tsx`

**Props**:
```typescript
interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBackPress: () => void;
  isLoading?: boolean;
}
```

**Features**:
- Email validation
- Descriptive help text
- Back to Sign In link
- Loading state with "SENDING..." text

---

### ResendVerificationForm

**Location**: `src/components/auth/forms/ResendVerificationForm.tsx`

**Props**:
```typescript
interface ResendVerificationFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBackPress: () => void;
  isLoading?: boolean;
}
```

**Features**:
- Email validation
- Descriptive help text
- Back to Sign In link
- Loading state with "SENDING..." text

---

## Styling Guidelines

### Design System

All forms use consistent styling:

**Colors**:
- Primary Blue: `#1976d2`
- Button Background: `rgba(255, 255, 255, 0.95)` (card)
---

## Historical Notes

This README previously documented S.O.L.I.D architecture principles and component APIs from an earlier version. The current implementation (Dec 2025) is simpler:
- Direct Firebase Web SDK usage (no service layer abstraction)
- Profile loading separated into UserProfileContext
- See [SIMPLE_AUTH_FLOW.md](SIMPLE_AUTH_FLOW.md) for architecture evolution

**Last Updated**: Dec 27, 2025


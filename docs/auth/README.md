# Authentication Architecture Documentation

## Overview

The voyager-RN authentication system implements a **clean S.O.L.I.D-based architecture** following a single-page authentication model with reusable form components. This design ensures maintainability, testability, and consistency across the application.

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

## Directory Structure

```
src/
├── pages/
│   └── AuthPage.tsx              # Single authentication entry point
├── components/
│   └── auth/
│       ├── forms/                # Reusable form components
│       │   ├── LoginForm.tsx           # Login UI and validation
│       │   ├── RegisterForm.tsx        # Registration UI and validation
│       │   ├── ForgotPasswordForm.tsx  # Password reset UI
│       │   └── ResendVerificationForm.tsx # Email resend UI
│       └── icons/
│           └── GoogleIcon.tsx    # Official Google logo SVG
├── context/
│   ├── AuthContext.tsx           # Authentication state management
│   └── AlertContext.tsx          # User notification system
├── config/
│   └── firebaseConfig.ts         # Firebase initialization
├── navigation/
│   └── AppNavigator.tsx          # Main navigation controller
└── __tests__/
    └── auth/
        ├── AuthPage.test.tsx     # Page and form integration tests
        ├── AuthContext.test.tsx  # Context unit tests
        └── authUtilities.test.ts # Utility function tests
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      AuthPage                                │
│  (Single entry point - conditionally renders forms)          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  LoginForm   │  │RegisterForm  │  │ForgotPassword│     │
│  │              │  │              │  │    Form      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                   │              │
│         └─────────────────┴───────────────────┘              │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  AuthContext   │
                    │  (useAuth hook)│
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │ Firebase Auth  │
                    │   Firestore    │
                    └────────────────┘
```

### User Flow

1. **App Launch**
   - `AppNavigator` checks `AuthContext` for existing user
   - If authenticated → Show main app tabs
   - If not authenticated → Show `AuthPage`

2. **Login Flow**
   - User enters email/password in `LoginForm`
   - `LoginForm` calls `onSubmit` callback (provided by `AuthPage`)
   - `AuthPage` calls `AuthContext.signIn()`
   - Firebase validates credentials
   - On success: `AuthContext` updates user state → App navigates to main app
   - On error: `AlertContext` shows error message

3. **Registration Flow**
   - User fills out `RegisterForm` (username, email, password, confirm)
   - Form validates input locally (email format, password length, matching passwords)
   - On submit: Creates Firebase user, sends verification email, creates Firestore user document
   - Navigates back to login form with success message

4. **Forgot Password Flow**
   - User enters email in `ForgotPasswordForm`
   - Sends password reset email via Firebase
   - Navigates back to login with success message

5. **Resend Verification Flow**
   - User enters email in `ResendVerificationForm`
   - Prompts user to sign in (Firebase requires authenticated session to resend)

---

## Component API Reference

### AuthPage

**Location**: `src/pages/AuthPage.tsx`

**Purpose**: Single entry point that orchestrates all authentication flows

**State**:
```typescript
type AuthMode = 'login' | 'register' | 'forgot' | 'resend';
const [mode, setMode] = useState<AuthMode>('login');
```

**Handlers**:
- `handleLogin(email, password)` - Calls `AuthContext.signIn()`
- `handleRegister(username, email, password)` - Creates new user account
- `handleForgotPassword(email)` - Sends password reset email
- `handleResendVerification(email)` - Prompts user to sign in
- `handleGoogleSignIn()` - TODO: Google OAuth integration
- `handleGoogleSignUp()` - TODO: Google OAuth integration

**Features**:
- Conditional form rendering based on `mode`
- Shared background image (login-image.jpeg)
- Semi-transparent card styling (95% opacity)
- Loading state management
- Console logging for navigation and TODO actions

---

### LoginForm

**Location**: `src/components/auth/forms/LoginForm.tsx`

**Props**:
```typescript
interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => void;
  onForgotPassword: () => void;
  onResendVerification: () => void;
  onSignUpPress: () => void;
  isLoading?: boolean;
}
```

**Features**:
- Email validation (regex pattern)
- Password validation (minimum 6 characters)
- "Welcome to TravalPass" feature box with ✈️ icons
- Google Sign-In button with official logo
- Forgot password and resend verification links
- Sign up navigation link

---

### RegisterForm

**Location**: `src/components/auth/forms/RegisterForm.tsx`

**Props**:
```typescript
interface RegisterFormProps {
  onSubmit: (username: string, email: string, password: string) => Promise<void>;
  onGoogleSignUp: () => void;
  onSignInPress: () => void;
  isLoading?: boolean;
}
```

**Features**:
- Username validation (minimum 2 characters)
- Email validation
- Password validation (minimum 10 characters)
- Confirm password matching
- Real-time error display
- Google Sign-Up button
- Sign in navigation link

---

### ForgotPasswordForm

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
- Error Red: `#e74c3c`
- Text Gray: `#757575` (Google button text)
- Neutral Gray: `#666`, `#999`, `#ccc`

**Typography**:
- Title: 20px, weight 400
- Labels: 13px, weight 500
- Inputs: 14px
- Buttons: 14px, weight 600
- Errors: 11px
- Links: 11px-14px

**Spacing**:
- Card padding: 20px
- Input margins: 12px bottom
- Button margins: 4px vertical
- Divider margins: 12px vertical

**Effects**:
- Card shadow: opacity 0.3, radius 12, elevation 8
- Border radius: 4px (inputs/buttons), 8px (card)

### Background Image

**Location**: `assets/images/login-image.jpeg`
**Usage**: Full-screen background with `resizeMode="cover"`
**Styling**: Card overlays image with semi-transparent white

---

## Testing Strategy

### Unit Tests

**Location**: `src/__tests__/auth/AuthPage.test.tsx`

**Coverage**:
- `AuthPage` rendering and form switching
- `LoginForm` component isolation tests
- Email/password validation
- Form submission with valid/invalid data
- Error handling
- Loading states
- Navigation between forms
- Google button interaction

**Test Pattern**:
```typescript
// Mock contexts
jest.mock('../../context/AuthContext');
jest.mock('../../context/AlertContext');

// Test form submission
const mockOnSubmit = jest.fn();
const { getByTestId } = render(
  <LoginForm onSubmit={mockOnSubmit} {...otherProps} />
);
fireEvent.press(getByTestId('signin-button'));
expect(mockOnSubmit).toHaveBeenCalledWith(email, password);
```

**Test Results**: ✅ 38/38 tests passing

---

## Console Logging

All TODO actions include comprehensive logging for debugging:

```typescript
// Google Sign-In
console.log('[AuthPage] Google Sign-In requested');
console.log('[TODO] Implement Google Sign-In for React Native');
console.log('[INFO] This requires @react-native-google-signin/google-signin package');

// Navigation
console.log('[AuthPage] Navigation: Login → Register');
console.log('[AuthPage] Navigation: Register → Login');

// Password Reset
console.log('[AuthPage] Forgot Password requested for email:', email);
console.error('[AuthPage] Forgot Password error:', error);
```

---

## Migration from Old Architecture

### What Changed

**Before** (Separate Screens):
- Multiple screen components with duplicated logic
- `screens/` directory
- Navigation stack for auth screens
- Harder to maintain consistency

**After** (Single Page + Forms):
- `src/pages/AuthPage.tsx` (single orchestrator)
- `src/components/auth/forms/` (reusable components)
- Shared styling through composition
- Easy to add new forms

### Benefits

1. **Cleaner Architecture**: Single responsibility per component
2. **Reusability**: Forms can be used independently or in modals
3. **Consistency**: Shared background and card styling
4. **Testability**: Isolated unit tests for each form
5. **Maintainability**: Changes to one form don't affect others
6. **Extensibility**: Add new forms without touching existing code

---

**Last Updated**: 2025-10-23
**Version**: 2.1 (Refactored to single-page architecture)

## Running the auth flows locally

1. Start Expo / Metro from the project root:
```bash
npm start
# or
npx expo start
```

2. iOS Simulator:
   - Open Simulator (Xcode → Open Developer Tool → Simulator) and boot a device
   - Run:
```bash
npm run ios
```

3. Android Emulator:
   - Create an AVD in Android Studio Device Manager (Tools → Device Manager)
   - Boot the emulator and verify with `adb devices`
   - Run:
```bash
npm run android
```

4. Web (quick UI checks):
```bash
npm run web
```

## Important notes & TODOs

- AsyncStorage: Firebase Auth for React Native will default to in-memory persistence unless you provide AsyncStorage. Install and configure `@react-native-async-storage/async-storage` and pass it to `initializeAuth` to persist sessions across app restarts.
- Google Sign-In: Google OAuth for React Native is not implemented yet. We use a placeholder Google button in the UI. To enable real Google Sign-In/Sign-Up you should install and configure `@react-native-google-signin/google-signin` and wire `handleGoogleSignIn` / `handleGoogleSignUp` in `src/pages/AuthPage.tsx`.

## Notes about the refactor
- `AuthPage.tsx` is now the single orchestrator for all auth flows (login, register, forgot password, resend verification). It conditionally renders the form components in `src/components/auth/forms/`.
- This approach reduces duplicated logic and centralizes navigation between auth states.


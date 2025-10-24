# Authentication API Reference

## Context & Hooks

### `useAuth()`

Hook to access authentication context.

**Returns**: `AuthContextValue`

```typescript
const {
  user,                    // Current user or null
  tokens,                  // Auth tokens or null
  status,                  // Auth status
  error,                   // Error message or null
  signIn,                  // Sign in function
  signOut,                 // Sign out function
  forgotPassword,          // Password reset function
  resendVerification,      // Resend email verification
  refreshUser              // Refresh user data
} = useAuth();
```

**Usage Example**:
```typescript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, signIn, status } = useAuth();

  const handleLogin = async () => {
    try {
      await signIn('user@example.com', 'password123');
      // Success - user is now authenticated
    } catch (error) {
      // Handle error
    }
  };

  if (status === 'loading') return <LoadingSpinner />;
  if (!user) return <LoginPrompt />;
  
  return <WelcomeMessage user={user} />;
}
```

---

## AuthContext Methods

### `signIn(email, password)`

Signs in a user with email and password.

**Parameters**:
- `email`: `string` - User's email address
- `password`: `string` - User's password

**Returns**: `Promise<void>`

**Throws**: Error with mapped message if sign in fails

**Side Effects**:
- Updates `status` to `'loading'` then `'authenticated'` or `'error'`
- Stores user data in state
- Stores tokens in SecureStore
- Triggers navigation update (auto-redirect to main app)

**Example**:
```typescript
try {
  await signIn('user@example.com', 'mypassword');
  // User is now authenticated, UI updates automatically
} catch (error) {
  // Error is already mapped to user-friendly message
  console.error(error.message);
}
```

---

### `signOut()`

Signs out the current user.

**Returns**: `Promise<void>`

**Side Effects**:
- Clears user data from state
- Clears tokens from SecureStore
- Updates `status` to `'idle'`
- Triggers navigation update (auto-redirect to login)

**Example**:
```typescript
const handleLogout = async () => {
  await signOut();
  // User is now signed out, shows login screen
};
```

---

### `forgotPassword(email)`

Sends a password reset email to the user.

**Parameters**:
- `email`: `string` - User's email address

**Returns**: `Promise<void>`

**Throws**: Error if email is invalid or sending fails

**Example**:
```typescript
const handleForgotPassword = async () => {
  try {
    await forgotPassword('user@example.com');
    showAlert('success', 'Password reset email sent!');
  } catch (error) {
    showAlert('error', error.message);
  }
};
```

---

### `resendVerification(email)`

Resends email verification to the user.

**Parameters**:
- `email`: `string` - User's email address

**Returns**: `Promise<void>`

**Throws**: Error if user is not signed in or sending fails

**Note**: User must be signed in for this to work (uses `auth.currentUser`)

**Example**:
```typescript
const handleResendVerification = async () => {
  try {
    await resendVerification('user@example.com');
    showAlert('success', 'Verification email sent!');
  } catch (error) {
    showAlert('error', error.message);
  }
};
```

---

### `refreshUser()`

Refreshes the current user data from the backend.

**Returns**: `Promise<void>`

**Side Effects**:
- Updates `status` to `'loading'`
- Fetches latest user data
- Updates user in state
- Updates `status` to `'authenticated'` or `'error'`

**Example**:
```typescript
const handleRefresh = async () => {
  await refreshUser();
  // User data is now up-to-date
};
```

---

## AuthService Interface

### `login(request)`

**Parameters**:
```typescript
{
  email: string;
  password: string;
}
```

**Returns**:
```typescript
Promise<{
  user: UserProfile;
  tokens?: AuthTokens;
}>
```

---

### `register(request)`

**Parameters**:
```typescript
{
  email: string;
  password: string;
  displayName: string;
}
```

**Returns**:
```typescript
Promise<{
  user: UserProfile;
  tokens?: AuthTokens;
}>
```

---

### `forgotPassword(request)`

**Parameters**:
```typescript
{
  email: string;
}
```

**Returns**: `Promise<void>`

---

### `resendVerification(request)`

**Parameters**:
```typescript
{
  email: string;
}
```

**Returns**: `Promise<void>`

---

### `getCurrentUser()`

**Returns**: `Promise<UserProfile | null>`

---

## Type Definitions

### `UserProfile`

```typescript
interface UserProfile {
  id: string;                    // User unique ID
  email: string;                 // User email
  displayName?: string;          // User display name
  emailVerified: boolean;        // Email verification status
  [key: string]: any;           // Additional profile fields
}
```

### `AuthTokens`

```typescript
interface AuthTokens {
  accessToken: string;           // JWT access token
  refreshToken?: string;         // Optional refresh token
}
```

### `AuthStatus`

```typescript
type AuthStatus = 
  | 'idle'           // Not authenticated
  | 'loading'        // Processing auth operation
  | 'authenticated'  // Successfully authenticated
  | 'error';         // Authentication error occurred
```

### `AuthState`

```typescript
interface AuthState {
  user: UserProfile | null;      // Current user
  tokens: AuthTokens | null;     // Auth tokens
  status: AuthStatus;            // Current status
  error?: string | null;         // Error message
}
```

---

## Validation Schemas

### Login Schema

```typescript
import { loginSchema } from '../utilities/auth/validators';

// Validates:
// - email: valid email format
// - password: minimum 6 characters

const result = loginSchema.safeParse({
  email: 'user@example.com',
  password: 'mypassword'
});

if (result.success) {
  // Data is valid
  const { email, password } = result.data;
}
```

### Register Schema

```typescript
import { registerSchema } from '../utilities/auth/validators';

// Validates:
// - email: valid email format
// - password: minimum 8 characters
// - displayName: minimum 2 characters

const result = registerSchema.safeParse({
  email: 'user@example.com',
  password: 'mypassword123',
  displayName: 'John Doe'
});
```

### Forgot Password Schema

```typescript
import { forgotPasswordSchema } from '../utilities/auth/validators';

// Validates:
// - email: valid email format

const result = forgotPasswordSchema.safeParse({
  email: 'user@example.com'
});
```

---

## Error Handling

### Error Mapping

```typescript
import { mapAuthError } from '../utilities/auth/errorMap';

// Maps backend error codes to user-friendly messages
const friendlyMessage = mapAuthError(
  'INVALID_CREDENTIALS',
  'Default message'
);
// Returns: "Email or password is incorrect."
```

### Error Codes

| Code | Message |
|------|---------|
| `INVALID_CREDENTIALS` | Email or password is incorrect. |
| `EMAIL_NOT_VERIFIED` | Your email is not verified. Please verify or resend verification email. |
| `USER_EXISTS` | An account with this email already exists. |
| `RATE_LIMITED` | Too many attempts. Please wait and try again later. |
| `NETWORK_ERROR` | Network error. Check your connection and try again. |

---

## Token Storage

### TokenStorage Interface

```typescript
interface TokenStorage {
  get(): Promise<AuthTokens | null>;
  set(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
}
```

### Usage

```typescript
import { secureTokenStorage } from '../utilities/auth/tokenStorage';

// Store tokens
await secureTokenStorage.set({
  accessToken: 'eyJhbGc...',
  refreshToken: 'refresh_token_here'
});

// Retrieve tokens
const tokens = await secureTokenStorage.get();

// Clear tokens
await secureTokenStorage.clear();
```

**Implementation**:
- Uses `expo-secure-store` (encrypted) as primary storage
- Falls back to `AsyncStorage` if SecureStore unavailable
- Automatically handles storage errors

---

## Navigation Integration

### Protected Routes Pattern

The app uses conditional rendering based on auth state:

```typescript
// AppNavigator.tsx
const RootNavigator = () => {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator>
      {user ? (
        // User is authenticated
        <Stack.Screen name="MainApp" component={MainTabNavigator} />
      ) : (
        // User is NOT authenticated
        <Stack.Screen name="Auth" component={AuthStackNavigator} />
      )}
    </Stack.Navigator>
  );
};
```

**No manual navigation needed** - the UI automatically updates based on auth state changes.

---

## Common Patterns

### Check Authentication Status

```typescript
const { user, status } = useAuth();

if (status === 'loading') {
  return <LoadingSpinner />;
}

if (!user) {
  return <PleaseSignIn />;
}

// User is authenticated
return <AuthenticatedContent />;
```

### Handle Sign In with Validation

```typescript
const handleSignIn = async () => {
  // Validate inputs
  const result = loginSchema.safeParse({ email, password });
  
  if (!result.success) {
    // Show validation errors
    showAlert('error', result.error.issues[0].message);
    return;
  }

  // Attempt sign in
  try {
    await signIn(result.data.email, result.data.password);
    // Success - UI updates automatically
  } catch (error) {
    // Error is already user-friendly
    showAlert('error', error.message);
  }
};
```

### Conditional UI Based on Auth

```typescript
const MyComponent = () => {
  const { user } = useAuth();

  return (
    <View>
      {user ? (
        <Text>Welcome, {user.displayName}!</Text>
      ) : (
        <Text>Please sign in to continue</Text>
      )}
    </View>
  );
};
```

---

## Testing

### Mock useAuth for Tests

```typescript
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext');

beforeEach(() => {
  (useAuth as jest.Mock).mockReturnValue({
    user: null,
    status: 'idle',
    signIn: jest.fn(),
    signOut: jest.fn(),
  });
});
```

### Test with AuthProvider

```typescript
import { AuthProvider } from '../context/AuthContext';

const mockService = createMockAuthService();
const mockStorage = createMockTokenStorage();

const wrapper = ({ children }) => (
  <AuthProvider 
    authService={mockService} 
    tokenStorage={mockStorage}
  >
    {children}
  </AuthProvider>
);

render(<MyComponent />, { wrapper });
```

---

## Best Practices

### ✅ DO

- Use `useAuth()` hook to access auth state
- Let navigation update automatically based on auth state
- Use Zod schemas for validation
- Handle errors with try/catch
- Show user-friendly error messages
- Clear sensitive data on sign out

### ❌ DON'T

- Don't store tokens in plain AsyncStorage
- Don't manually navigate after sign in/out (it's automatic)
- Don't bypass validation
- Don't show raw error codes to users
- Don't access Firebase directly from components

---

## Migration from PWA

### Key Differences

| PWA | React Native |
|-----|--------------|
| `window.location.href = '/'` | Auto-navigation via state |
| `localStorage` | SecureStore + AsyncStorage |
| React Router | React Navigation |
| Direct Firebase calls | Repository pattern |

### Equivalent Patterns

```typescript
// PWA
window.location.href = '/';

// RN - Automatic based on state
// Just update auth state, navigation handles redirect

// PWA
localStorage.setItem('token', token);

// RN
await secureTokenStorage.set({ accessToken: token });
```

---

**See Also**:
- [Authentication Flow](./README.md)
- [Testing Guide](../../TESTING.md)
- [Architecture Overview](../architecture/README.md)

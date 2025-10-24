# Authentication Sequence Diagrams

## 1. Sign In Flow (Detailed)

```mermaid
sequenceDiagram
    actor User
    participant UI as LoginScreen
    participant Hook as useAuth()
    participant Context as AuthContext
    participant Service as AuthService
    participant Repo as FirebaseAuthRepository
    participant Firebase as Firebase Auth
    participant Store as SecureStore
    participant Nav as AppNavigator

    User->>UI: Enter email & password
    User->>UI: Click Sign In
    
    UI->>UI: Validate input (Zod)
    
    alt Validation Failed
        UI->>User: Show validation error
    else Validation Passed
        UI->>Hook: signIn(email, password)
        Hook->>Context: signIn(email, password)
        Context->>Context: setState({ status: 'loading' })
        
        Context->>Service: login({ email, password })
        Service->>Repo: login({ email, password })
        
        Repo->>Firebase: signInWithEmailAndPassword()
        
        alt Sign In Failed
            Firebase-->>Repo: Error (auth/wrong-password)
            Repo-->>Service: throw Error
            Service->>Service: mapAuthError()
            Service-->>Context: throw "Incorrect password..."
            Context->>Context: setState({ status: 'error' })
            Context-->>Hook: throw Error
            Hook-->>UI: Error
            UI->>User: Show error alert
        else Sign In Success
            Firebase-->>Repo: UserCredential
            Repo->>Repo: Check emailVerified
            
            alt Email Not Verified
                Repo-->>Context: throw "Email not verified"
                Context->>Context: setState({ status: 'error' })
                Context-->>UI: Error
                UI->>User: Show verification error
            else Email Verified
                Repo->>Firebase: Get user document
                Firebase-->>Repo: UserProfile
                Repo-->>Service: { user, tokens }
                Service-->>Context: { user, tokens }
                
                Context->>Store: set(tokens)
                Store-->>Context: Success
                
                Context->>Context: setState({ user, tokens, status: 'authenticated' })
                Context-->>Hook: Success
                Hook-->>UI: Success
                
                UI->>User: Show success message
                
                Note over Nav: Auth state changed
                Nav->>Nav: Detect user != null
                Nav->>User: Redirect to Main App
            end
        end
    end
```

---

## 2. App Initialization Flow

```mermaid
sequenceDiagram
    participant App
    participant Provider as AuthProvider
    participant Store as SecureStore
    participant Service as AuthService
    participant Nav as AppNavigator
    actor User

    App->>Provider: Mount (useEffect)
    
    Provider->>Provider: setState({ status: 'loading' })
    Provider->>Store: get()
    
    alt No Tokens Found
        Store-->>Provider: null
        Provider->>Provider: setState({ status: 'idle', user: null })
        Provider->>Nav: Render
        Nav->>User: Show Login Screen
    else Tokens Found
        Store-->>Provider: { accessToken, refreshToken }
        Provider->>Service: getCurrentUser()
        
        alt Valid Token
            Service-->>Provider: UserProfile
            Provider->>Provider: setState({ user, tokens, status: 'authenticated' })
            Provider->>Nav: Render
            Nav->>User: Show Main App
        else Invalid Token
            Service-->>Provider: null
            Provider->>Provider: setState({ status: 'idle', user: null })
            Provider->>Nav: Render
            Nav->>User: Show Login Screen
        end
    end
```

---

## 3. Sign Out Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as ProfileScreen
    participant Hook as useAuth()
    participant Context as AuthContext
    participant Store as SecureStore
    participant Nav as AppNavigator

    User->>UI: Click Sign Out
    UI->>Hook: signOut()
    Hook->>Context: signOut()
    
    Context->>Store: clear()
    Store-->>Context: Success
    
    Context->>Context: setState({ user: null, tokens: null, status: 'idle' })
    Context-->>Hook: Success
    Hook-->>UI: Success
    
    Note over Nav: Auth state changed
    Nav->>Nav: Detect user == null
    Nav->>User: Redirect to Login Screen
```

---

## 4. Forgot Password Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as AuthScreen/LoginScreen
    participant Hook as useAuth()
    participant Context as AuthContext
    participant Service as AuthService
    participant Repo as FirebaseAuthRepository
    participant Firebase as Firebase Auth
    participant Email as User's Email

    User->>UI: Click "Forgot Password"
    UI->>UI: Show password reset form
    User->>UI: Enter email
    User->>UI: Submit
    
    UI->>UI: Validate email (Zod)
    
    alt Invalid Email
        UI->>User: Show validation error
    else Valid Email
        UI->>Hook: forgotPassword(email)
        Hook->>Context: forgotPassword(email)
        Context->>Context: setState({ status: 'loading' })
        
        Context->>Service: forgotPassword({ email })
        Service->>Repo: forgotPassword({ email })
        Repo->>Firebase: sendPasswordResetEmail(email)
        
        alt Email Not Found
            Firebase-->>Repo: Error (auth/user-not-found)
            Repo-->>Context: throw Error
            Context->>Context: setState({ status: 'error' })
            Context-->>UI: Error
            UI->>User: Show error alert
        else Email Found
            Firebase-->>Repo: Success
            Firebase->>Email: Send reset link
            Repo-->>Context: Success
            Context->>Context: setState({ status: 'idle' })
            Context-->>UI: Success
            UI->>User: Show "Email sent" message
            Email->>User: Receive reset link
        end
    end
```

---

## 5. Email Verification Resend Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as AuthScreen
    participant Hook as useAuth()
    participant Context as AuthContext
    participant Service as AuthService
    participant Repo as FirebaseAuthRepository
    participant Firebase as Firebase Auth
    participant Email as User's Email

    User->>UI: Click "Resend Verification"
    UI->>UI: Show resend form
    User->>UI: Enter email
    User->>UI: Submit
    
    UI->>Hook: resendVerification(email)
    Hook->>Context: resendVerification(email)
    Context->>Context: setState({ status: 'loading' })
    
    Context->>Service: resendVerification({ email })
    Service->>Repo: resendVerification({ email })
    
    Repo->>Firebase: Get auth.currentUser
    
    alt No Current User
        Repo-->>Context: throw "NOT_SIGNED_IN"
        Context->>Context: setState({ status: 'error' })
        Context-->>UI: Error
        UI->>User: Show "Please sign in first"
    else Current User Found
        Repo->>Firebase: sendEmailVerification(currentUser)
        Firebase-->>Repo: Success
        Firebase->>Email: Send verification link
        Repo-->>Context: Success
        Context->>Context: setState({ status: 'idle' })
        Context-->>UI: Success
        UI->>User: Show "Verification sent"
        Email->>User: Receive verification link
    end
```

---

## 6. Token Refresh Flow (Future Enhancement)

```mermaid
sequenceDiagram
    participant Context as AuthContext
    participant Service as AuthService
    participant Repo as Repository
    participant API as Backend API
    participant Store as SecureStore

    Note over Context: Token expires during app use
    
    Context->>Service: getCurrentUser()
    Service->>Repo: getCurrentUser()
    Repo->>API: Request with access token
    
    API-->>Repo: 401 Unauthorized (Token expired)
    
    Repo->>Store: get() [Get refresh token]
    Store-->>Repo: { refreshToken }
    
    Repo->>API: POST /refresh with refreshToken
    
    alt Refresh Token Valid
        API-->>Repo: { newAccessToken, newRefreshToken }
        Repo->>Store: set(newTokens)
        Repo->>API: Retry original request
        API-->>Repo: User data
        Repo-->>Context: UserProfile
        Context->>Context: Update state
    else Refresh Token Invalid
        Repo->>Store: clear()
        Repo-->>Context: null
        Context->>Context: setState({ user: null, status: 'idle' })
        Note over Context: User redirected to login
    end
```

---

## 7. Navigation State Machine

```mermaid
stateDiagram-v2
    [*] --> Initializing: App Launch
    
    Initializing --> CheckingTokens: Check SecureStore
    
    CheckingTokens --> Authenticated: Tokens valid
    CheckingTokens --> Unauthenticated: No tokens/Invalid
    
    Unauthenticated --> ShowLogin: Render Auth Stack
    ShowLogin --> Authenticating: User signs in
    
    Authenticating --> Authenticated: Sign in success
    Authenticating --> ShowLogin: Sign in failed
    
    Authenticated --> ShowMainApp: Render Main Tabs
    ShowMainApp --> Unauthenticated: User signs out
    ShowMainApp --> Unauthenticated: Token expires
    
    Authenticated --> RefreshingUser: Pull to refresh
    RefreshingUser --> Authenticated: Refresh success
    RefreshingUser --> Unauthenticated: Refresh failed
```

---

## 8. Error Handling Flow

```mermaid
flowchart TD
    A[Error Occurs] --> B{Where?}
    
    B -->|Repository| C[Firebase Error]
    B -->|Service| D[Validation Error]
    B -->|Network| E[Network Error]
    
    C --> F[Map Firebase Code]
    D --> G[Map Validation Error]
    E --> H[Map Network Error]
    
    F --> I[mapAuthError]
    G --> I
    H --> I
    
    I --> J[User-Friendly Message]
    J --> K[Update Context State]
    K --> L{Show Error}
    
    L -->|AuthContext| M[Set error in state]
    L -->|Component| N[AlertContext.showAlert]
    
    M --> O[Component reads error]
    O --> N
    N --> P[User Sees Error]
    
    style P fill:#f96,stroke:#333,stroke-width:2px
```

---

## 9. Component Communication Pattern

```mermaid
graph TB
    subgraph "App Layer"
        App[App.tsx]
    end
    
    subgraph "Provider Layer"
        Auth[AuthProvider]
        Alert[AlertProvider]
    end
    
    subgraph "Navigation Layer"
        Nav[AppNavigator]
        AuthNav[AuthStackNavigator]
        MainNav[MainTabNavigator]
    end
    
    subgraph "Screen Layer"
        Login[LoginScreen]
        Register[RegisterScreen]
        Profile[ProfileScreen]
    end
    
    subgraph "Hook Layer"
        UseAuth[useAuth Hook]
        UseAlert[useAlert Hook]
    end
    
    subgraph "Business Logic"
        Service[AuthService]
        Repo[AuthRepository]
    end
    
    subgraph "External"
        Firebase[(Firebase)]
        Store[(SecureStore)]
    end
    
    App --> Auth
    App --> Alert
    App --> Nav
    
    Auth --> Service
    Service --> Repo
    Repo --> Firebase
    Repo --> Store
    
    Nav --> AuthNav
    Nav --> MainNav
    Nav -.watches.-> Auth
    
    AuthNav --> Login
    AuthNav --> Register
    MainNav --> Profile
    
    Login --> UseAuth
    Register --> UseAuth
    Profile --> UseAuth
    Profile --> UseAlert
    
    UseAuth -.consumes.-> Auth
    UseAlert -.consumes.-> Alert
    
    style Auth fill:#9f9,stroke:#333,stroke-width:2px
    style Firebase fill:#f96,stroke:#333,stroke-width:2px
    style Store fill:#69f,stroke:#333,stroke-width:2px
```

---

## 10. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER ACTION                           │
│                  (Click Sign In Button)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   LoginScreen.tsx      │
            │   - Validate inputs    │
            │   - Call useAuth()     │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   useAuth() Hook       │
            │   - Access context     │
            │   - Return methods     │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   AuthContext          │
            │   - Manage state       │
            │   - Call service       │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   AuthService          │
            │   - Business logic     │
            │   - Error mapping      │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   AuthRepository       │
            │   - Data access        │
            │   - Firebase calls     │
            └────────────┬───────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
┌───────────────────┐     ┌──────────────────┐
│  Firebase Auth    │     │  SecureStore     │
│  - Authenticate   │     │  - Store tokens  │
│  - Get user data  │     │  - Encrypted     │
└───────────┬───────┘     └────────┬─────────┘
            │                      │
            └──────────┬───────────┘
                       │
                       ▼
            ┌────────────────────────┐
            │   AuthContext          │
            │   - Update state       │
            │   - user: {...}        │
            │   - status: 'auth'     │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   AppNavigator         │
            │   - Detect state       │
            │   - Conditional render │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   MainTabNavigator     │
            │   - Search             │
            │   - Videos             │
            │   - Chat               │
            │   - Profile            │
            └────────────────────────┘
```

---

**Note**: These diagrams show the complete authentication flow including all success and error paths. The actual implementation follows these patterns exactly as documented in the [Authentication Flow](./README.md) documentation.

**Tools Used**: 
- Mermaid.js for sequence diagrams
- ASCII art for data flow

**See Also**:
- [Authentication Flow Overview](./README.md)
- [API Reference](./API.md)
- [Testing Documentation](../../TESTING.md)

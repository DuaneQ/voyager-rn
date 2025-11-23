# Google Sign-In Flow Diagrams

## Scenario 1: New User Tries to Sign In (No Account)

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW USER - SIGN IN FLOW                      │
└─────────────────────────────────────────────────────────────────┘

User                  UI                 AuthContext         Firebase/Firestore
  │                    │                      │                      │
  │  Click "Sign In    │                      │                      │
  │  with Google"      │                      │                      │
  ├───────────────────>│                      │                      │
  │                    │ signInWithGoogle()   │                      │
  │                    ├─────────────────────>│                      │
  │                    │                      │ Google Sign-In Sheet │
  │                    │                      ├─────────────────────>│
  │  Select Account    │                      │                      │
  ├───────────────────────────────────────────────────────────────>│
  │                    │                      │   Google ID Token    │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ signInWithGoogleIdToken()
  │                    │                      ├─────────────────────>│
  │                    │                      │  Firebase User Auth  │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ getUserProfile(uid)  │
  │                    │                      ├─────────────────────>│
  │                    │                      │   ❌ NOT FOUND       │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ signOut()            │
  │                    │                      ├─────────────────────>│
  │                    │                      │   ✅ Signed Out      │
  │                    │                      │<─────────────────────┤
  │                    │  throw 'ACCOUNT_NOT_FOUND'                  │
  │                    │<─────────────────────┤                      │
  │  Error Alert:      │                      │                      │
  │  "No account found.│                      │                      │
  │  Please sign up"   │                      │                      │
  │<───────────────────┤                      │                      │
  │                    │                      │                      │
  │  ✅ AUTO-REDIRECT  │                      │                      │
  │  to Sign Up form   │                      │                      │
  │<───────────────────┤                      │                      │
  │                    │                      │                      │
```

**Key Points:**
- User is **signed out** immediately after profile check fails
- Error message is **user-friendly** ("No account found...")
- UI **automatically switches** to Sign Up form
- No orphaned Firebase auth session left behind

---

## Scenario 2: Existing User Tries to Sign Up (Already Has Account)

```
┌─────────────────────────────────────────────────────────────────┐
│                  EXISTING USER - SIGN UP FLOW                   │
└─────────────────────────────────────────────────────────────────┘

User                  UI                 AuthContext         Firebase/Firestore
  │                    │                      │                      │
  │  Click "Sign Up    │                      │                      │
  │  with Google"      │                      │                      │
  ├───────────────────>│                      │                      │
  │                    │ signUpWithGoogle()   │                      │
  │                    ├─────────────────────>│                      │
  │                    │                      │ Google Sign-In Sheet │
  │                    │                      ├─────────────────────>│
  │  Select Account    │                      │                      │
  ├───────────────────────────────────────────────────────────────>│
  │                    │                      │   Google ID Token    │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ signInWithGoogleIdToken()
  │                    │                      ├─────────────────────>│
  │                    │                      │  Firebase User Auth  │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ getUserProfile(uid)  │
  │                    │                      ├─────────────────────>│
  │                    │                      │   ✅ PROFILE FOUND   │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ profileExists = true │
  │                    │                      │ (skip creation)      │
  │                    │                      │                      │
  │                    │                      │ setUser()            │
  │                    │                      │ setStatus('authenticated')
  │                    │                      │                      │
  │                    │  ✅ SUCCESS          │                      │
  │                    │<─────────────────────┤                      │
  │  Success Alert:    │                      │                      │
  │  "Successfully     │                      │                      │
  │  signed up!"       │                      │                      │
  │<───────────────────┤                      │                      │
  │                    │                      │                      │
  │  ✅ NAVIGATE TO    │                      │                      │
  │  Main App          │                      │                      │
  │<───────────────────┤                      │                      │
```

**Key Points:**
- Profile **already exists**, so no new profile created
- User is **logged in successfully** (not treated as error)
- Success message shown ("Successfully signed up!")
- **No duplicate profiles** created in Firestore
- Graceful handling of user confusion (clicked wrong button)

---

## Scenario 3: New User Signs Up Successfully (Creates Account)

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW USER - SIGN UP FLOW                      │
└─────────────────────────────────────────────────────────────────┘

User                  UI                 AuthContext         Firebase/Firestore
  │                    │                      │                      │
  │  Click "Sign Up    │                      │                      │
  │  with Google"      │                      │                      │
  ├───────────────────>│                      │                      │
  │                    │ signUpWithGoogle()   │                      │
  │                    ├─────────────────────>│                      │
  │                    │                      │ Google Sign-In Sheet │
  │                    │                      ├─────────────────────>│
  │  Select Account    │                      │                      │
  ├───────────────────────────────────────────────────────────────>│
  │                    │                      │   Google ID Token    │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ signInWithGoogleIdToken()
  │                    │                      ├─────────────────────>│
  │                    │                      │  Firebase User Auth  │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ getUserProfile(uid)  │
  │                    │                      ├─────────────────────>│
  │                    │                      │   ❌ NOT FOUND       │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ profileExists = false│
  │                    │                      │                      │
  │                    │                      │ Build profile data:  │
  │                    │                      │ {                    │
  │                    │                      │   username: "john",  │
  │                    │                      │   email: "j@g.com",  │
  │                    │                      │   photos: [],        │
  │                    │                      │   subscriptionType: 'free'
  │                    │                      │ }                    │
  │                    │                      │                      │
  │                    │                      │ createUserProfile()  │
  │                    │                      ├─────────────────────>│
  │                    │                      │ (Cloud Function)     │
  │                    │                      │                      │
  │                    │                      │  ✅ Profile Created  │
  │                    │                      │  in users/{uid}      │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ setUser()            │
  │                    │                      │ setStatus('authenticated')
  │                    │                      │                      │
  │                    │  ✅ SUCCESS          │                      │
  │                    │<─────────────────────┤                      │
  │  Success Alert:    │                      │                      │
  │  "Successfully     │                      │                      │
  │  signed up!"       │                      │                      │
  │<───────────────────┤                      │                      │
  │                    │                      │                      │
  │  ✅ NAVIGATE TO    │                      │                      │
  │  Main App          │                      │                      │
  │<───────────────────┤                      │                      │
```

**Key Points:**
- Profile **doesn't exist**, so new one is created
- Profile created via **Cloud Function** (server-side)
- User is **logged in** after successful profile creation
- **Complete profile data** saved to Firestore
- Success message shown and user navigates to app

---

## Scenario 4: Existing User Signs In (Normal Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                 EXISTING USER - SIGN IN FLOW                    │
└─────────────────────────────────────────────────────────────────┘

User                  UI                 AuthContext         Firebase/Firestore
  │                    │                      │                      │
  │  Click "Sign In    │                      │                      │
  │  with Google"      │                      │                      │
  ├───────────────────>│                      │                      │
  │                    │ signInWithGoogle()   │                      │
  │                    ├─────────────────────>│                      │
  │                    │                      │ Google Sign-In Sheet │
  │                    │                      ├─────────────────────>│
  │  Select Account    │                      │                      │
  ├───────────────────────────────────────────────────────────────>│
  │                    │                      │   Google ID Token    │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ signInWithGoogleIdToken()
  │                    │                      ├─────────────────────>│
  │                    │                      │  Firebase User Auth  │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ getUserProfile(uid)  │
  │                    │                      ├─────────────────────>│
  │                    │                      │   ✅ PROFILE FOUND   │
  │                    │                      │<─────────────────────┤
  │                    │                      │                      │
  │                    │                      │ setUser()            │
  │                    │                      │ setStatus('authenticated')
  │                    │                      │                      │
  │                    │  ✅ SUCCESS          │                      │
  │                    │<─────────────────────┤                      │
  │  Success Alert:    │                      │                      │
  │  "Login successful!│                      │                      │
  │  Welcome back."    │                      │                      │
  │<───────────────────┤                      │                      │
  │                    │                      │                      │
  │  ✅ NAVIGATE TO    │                      │                      │
  │  Main App          │                      │                      │
  │<───────────────────┤                      │                      │
```

**Key Points:**
- Profile **exists**, so user is logged in immediately
- **Standard login flow** - most common scenario
- No profile creation needed
- Success message shown ("Login successful! Welcome back.")
- User navigates to main app

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ERROR SCENARIOS                          │
└─────────────────────────────────────────────────────────────────┘

Error Type                    System Response                User Experience
────────────────────────────────────────────────────────────────────────────
ACCOUNT_NOT_FOUND            • Sign out user                 • Error alert
(New user sign in)           • Throw specific error          • Auto-redirect
                             • Set status to 'idle'           to Sign Up

Profile Creation Failed      • Sign out user                 • Error alert
(New user sign up)           • Throw error                   • Stay on form
                             • Set status to 'idle'           • Can retry

Google Popup Closed          • No state change               • Info alert
(User canceled)              • Set status to 'idle'           • Stay on form

Native Module Unavailable    • Throw descriptive error       • Error alert
(Not rebuilt)                • Set status to 'idle'           with instructions

Network Error                • Throw network error           • Error alert
(No connection)              • Set status to 'idle'           • Can retry
────────────────────────────────────────────────────────────────────────────
```

---

## Decision Tree

```
                     User Clicks Google Button
                              │
                              ▼
                      Which Button Clicked?
                              │
              ┌───────────────┴───────────────┐
              │                               │
         "Sign In"                       "Sign Up"
              │                               │
              ▼                               ▼
    Google Authentication           Google Authentication
              │                               │
              ▼                               ▼
    Check Profile Exists           Check Profile Exists
              │                               │
      ┌───────┴───────┐               ┌───────┴───────┐
      │               │               │               │
  ✅ EXISTS      ❌ MISSING       ✅ EXISTS      ❌ MISSING
      │               │               │               │
      ▼               ▼               ▼               ▼
  LOG IN          SIGN OUT      LOG IN          CREATE
   USER             USER         USER          PROFILE
      │               │               │               │
      │               ▼               │               ▼
      │           THROW              │           LOG IN
      │           ERROR              │            USER
      │               │               │               │
      │               ▼               │               │
      │           REDIRECT            │               │
      │           TO SIGNUP           │               │
      │                               │               │
      └───────┬───────────────────────┴───────────────┘
              │
              ▼
    NAVIGATE TO MAIN APP

```

---

## Data Flow - Profile Creation

```
┌─────────────────────────────────────────────────────────────────┐
│          PROFILE CREATION DATA FLOW (Scenario 3)                │
└─────────────────────────────────────────────────────────────────┘

Google User Info              AuthContext              Cloud Function
     │                            │                          │
     │  displayName: "John Doe"   │                          │
     │  email: "john@gmail.com"   │                          │
     │  photoURL: "https://..."   │                          │
     ├───────────────────────────>│                          │
     │                            │                          │
     │                            │  Build Profile Data:     │
     │                            │  {                       │
     │                            │    username: "John Doe"  │
     │                            │    email: "john@..."     │
     │                            │    photos: []            │
     │                            │    subscriptionType: 'free'
     │                            │    dailyUsage: {...}     │
     │                            │  }                       │
     │                            │                          │
     │                            │  createUserProfile()     │
     │                            ├─────────────────────────>│
     │                            │                          │
     │                            │              Validate Data
     │                            │              Create Document
     │                            │              in Firestore
     │                            │              users/{uid}
     │                            │                          │
     │                            │  ✅ SUCCESS             │
     │                            │  { profile: {...} }      │
     │                            │<─────────────────────────┤
     │                            │                          │
     │                            │  setUser(firebaseUser)   │
     │                            │  setStatus('authenticated')
     │                            │                          │
```

**Profile Fields Populated:**
- `username` - from Google displayName or email prefix
- `email` - from Google account email
- `bio`, `gender`, etc. - empty strings (user fills later)
- `photos` - array of 5 empty strings
- `subscriptionType` - defaults to 'free'
- `dailyUsage` - initialized with today's date, 0 views

---

## Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY & TOKEN FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Google OAuth                Firebase Auth          Secure Storage
     │                          │                        │
     │  1. User selects         │                        │
     │     Google account       │                        │
     │                          │                        │
     │  2. Google ID Token      │                        │
     ├─────────────────────────>│                        │
     │                          │                        │
     │                          │  3. Exchange for       │
     │                          │     Firebase tokens    │
     │                          │                        │
     │                          │  4. Store tokens       │
     │                          ├───────────────────────>│
     │                          │                        │
     │                          │                        │  SecureStore:
     │                          │                        │  - idToken
     │                          │                        │  - refreshToken
     │                          │                        │
     │                          │                        │  AsyncStorage:
     │                          │                        │  - uid
     │                          │                        │  - email
     │                          │                        │  - emailVerified
     │                          │                        │
     │                          │  5. Subsequent         │
     │                          │     requests use       │
     │                          │     Firebase tokens    │
     │                          │<───────────────────────┤
```

**Security Guarantees:**
- Google ID tokens are **one-time use**, exchanged for Firebase tokens
- Firebase tokens stored **securely** (SecureStore on mobile)
- All Firestore operations require **valid Firebase token**
- Cloud Functions validate **authentication** before operations
- No client-side token manipulation possible

---

## Summary - All Flows

| Scenario | Button | Profile Exists? | Action | Result |
|----------|--------|----------------|--------|--------|
| **1** | Sign In | ❌ No | Sign out + Error | Redirect to Sign Up |
| **2** | Sign Up | ✅ Yes | Skip creation | Log in |
| **3** | Sign Up | ❌ No | Create profile | Log in |
| **4** | Sign In | ✅ Yes | Normal flow | Log in |

**All scenarios end with user either:**
- ✅ Logged in and navigated to main app
- ❌ Signed out with helpful error message
- ℹ️ Prompted to retry (on network errors)

See `GOOGLE_SIGNIN_BUSINESS_LOGIC.md` for implementation details.

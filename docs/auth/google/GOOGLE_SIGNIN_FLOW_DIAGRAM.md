# Google Sign-In Flow Diagram

## 🎯 Overview: What Happens When You Tap "Sign in with Google"

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR iOS APP                                │
│                   (voyager-rn)                                  │
│                                                                 │
│  1. User taps "Sign in with Google" button                     │
│     └─> Calls signInWithGoogle() in AuthContext               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│         @react-native-google-signin Package                     │
│                                                                 │
│  2. GoogleSignin.signIn() is called                            │
│     • Uses iosClientId to identify your app                    │
│     • Uses webClientId for backend verification                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Sign-In Sheet (iOS Native)                  │
│                                                                 │
│  3. iOS shows Google's native sign-in interface                │
│     • User sees their Google accounts                          │
│     • User selects an account                                  │
│     • User grants permissions                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Google OAuth Server                             │
│                                                                 │
│  4. Google validates the request                               │
│     • Checks iosClientId matches Bundle ID                     │
│     • Generates an ID token                                    │
│     • Returns token to your app                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│         @react-native-google-signin Package                     │
│                                                                 │
│  5. Returns user info + idToken                                │
│     { idToken: "eyJhbG...", userInfo: {...} }                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              YOUR APP - AuthContext                             │
│                                                                 │
│  6. Create Firebase credential                                 │
│     credential = GoogleAuthProvider.credential(idToken)        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                Firebase Authentication                          │
│                                                                 │
│  7. Sign in with credential                                    │
│     signInWithCredential(auth, credential)                     │
│     • Validates token with Google                              │
│     • Creates/updates user in Firebase                         │
│     • Returns Firebase user object                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              YOUR APP - Navigation                              │
│                                                                 │
│  8. User is now authenticated                                  │
│     • Navigate to home screen                                  │
│     • User can access protected features                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Required Credentials & Where They're Used

### 1. iOS Client ID
**Format**: `296095212837-abc123xyz.apps.googleusercontent.com`

**Where created**: Google Cloud Console → Credentials → Create OAuth Client ID (iOS)

**Where used**:
- `AuthContext.tsx` → `GoogleSignin.configure({ iosClientId: "..." })`
- Tells Google: "This request is coming from the iOS app with Bundle ID `com.voyager.rn`"

**Purpose**:
- Identifies your iOS app to Google
- Links to your Bundle ID for security
- Required for iOS native sign-in flow

---

### 2. Web Client ID
**Format**: `296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com`

**Where created**: Automatically created with Firebase project

**Where used**:
- `AuthContext.tsx` → `GoogleSignin.configure({ webClientId: "..." })`
- Sent to Google servers for backend verification

**Purpose**:
- Used by Firebase to verify the ID token
- Links the sign-in to your Firebase project
- Required for Firebase Authentication

---

### 3. URL Scheme
**Format**: `com.googleusercontent.apps.296095212837-abc123xyz`

**Where created**: Derived from iOS Client ID (reversed)

**Where used**:
- `ios/VoyagerRN/Info.plist` → `CFBundleURLSchemes`
- iOS system uses this to redirect back to your app

**Purpose**:
- After user signs in with Google, iOS needs to know which app to return to
- Acts like a "return address" for the OAuth flow
- Required for the callback to work

**How to create**:
```
iOS Client ID:    296095212837-abc123xyz.apps.googleusercontent.com
                  ↓ Remove .apps.googleusercontent.com
                  296095212837-abc123xyz
                  ↓ Reverse it (add com.googleusercontent.apps. prefix)
URL Scheme:       com.googleusercontent.apps.296095212837-abc123xyz
```

---

### 4. Bundle ID
**Format**: `com.voyager.rn`

**Where defined**: 
- `app.json` → `ios.bundleIdentifier`
- `ios/VoyagerRN.xcodeproj` → Bundle Identifier

**Where used**:
- Google Cloud Console when creating iOS OAuth Client
- iOS system to identify your app

**Purpose**:
- Unique identifier for your iOS app
- Google uses it to ensure the request is from YOUR app
- Security measure to prevent other apps from impersonating yours

---

## 🔒 Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Why Google needs to verify your app:                           │
│                                                                 │
│  1. User taps "Sign in" in your app                            │
│                                                                 │
│  2. Google checks:                                             │
│     • Is the iosClientId valid? ✓                              │
│     • Does it match the Bundle ID? ✓                           │
│     • Is the Bundle ID registered? ✓                           │
│                                                                 │
│  3. If all checks pass:                                        │
│     → Show sign-in UI                                          │
│     → Generate secure ID token                                 │
│     → Return token to app via URL scheme                       │
│                                                                 │
│  4. Your app then:                                             │
│     → Sends ID token to Firebase                               │
│     → Firebase verifies with Google                            │
│     → Creates authenticated user session                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚫 Common Configuration Mistakes

### ❌ Mistake 1: Wrong URL Scheme
```
iOS Client ID:  296095212837-abc123.apps.googleusercontent.com
Wrong URL:      296095212837-abc123  (missing prefix)
Wrong URL:      apps.googleusercontent.com.296095212837-abc123  (wrong order)
✅ Correct:     com.googleusercontent.apps.296095212837-abc123
```

### ❌ Mistake 2: Bundle ID Mismatch
```
In app.json:          com.voyager.rn
In Google Console:    com.voyager.app  ← MISMATCH!
Result:               DEVELOPER_ERROR
```

### ❌ Mistake 3: Using Wrong Client ID
```
iosClientId:  <Web Client ID>  ← WRONG! Use iOS Client ID
webClientId:  <iOS Client ID>  ← WRONG! Use Web Client ID
```

### ❌ Mistake 4: Forgetting to Rebuild
```
1. Changed AuthContext.tsx  ✓
2. Changed Info.plist       ✓
3. Ran `expo start`         ← WRONG! Must rebuild native
4. Should run: npm run ios  ✓
```

---

## ✅ Success Indicators

When everything is configured correctly:

1. **No console errors** about missing configuration
2. **Google Sign-In sheet appears** (native iOS UI)
3. **Can select Google account** from the list
4. **Sheet closes after selection** (doesn't stay open)
5. **App navigates to home screen** (user is authenticated)
6. **No "DEVELOPER_ERROR"** messages
7. **ID token is successfully retrieved** (check logs)
8. **Firebase user is created/retrieved** (check Firebase Console)

---

## 🔍 Debug Checklist

If sign-in fails, check these in order:

- [ ] **iOS Client ID**: Exists in Google Cloud Console?
- [ ] **iOS Client ID**: Copy-pasted correctly (no spaces/typos)?
- [ ] **iOS Client ID**: Has `.apps.googleusercontent.com` at end?
- [ ] **Bundle ID**: Same in Google Console and app.json?
- [ ] **URL Scheme**: Correctly reversed iOS Client ID?
- [ ] **URL Scheme**: Added to Info.plist?
- [ ] **AuthContext**: Both iosClientId AND webClientId set?
- [ ] **Pods**: Installed? (`cd ios && pod install`)
- [ ] **Rebuild**: Did you rebuild? (`npm run ios`)
- [ ] **Console**: Any error messages?

---

## 📱 What the User Sees

### ✅ Successful Flow:
```
1. User opens app
2. Sees login screen with "Sign in with Google" button
3. Taps button
4. Google sheet slides up from bottom (native iOS UI)
5. Sees list of Google accounts
6. Taps an account
7. Sheet asks for permissions (if first time)
8. User taps "Continue"
9. Sheet closes
10. App shows home screen
11. ✅ User is signed in!
```

### ❌ Failed Flow (DEVELOPER_ERROR):
```
1. User opens app
2. Sees login screen with "Sign in with Google" button
3. Taps button
4. Google sheet slides up from bottom
5. Sheet shows: "DEVELOPER_ERROR"
6. ❌ Can't sign in
   → Check URL scheme matches iOS Client ID
   → Check Bundle ID in Google Console
```

### ❌ Failed Flow (Nothing happens):
```
1. User opens app
2. Sees login screen with "Sign in with Google" button
3. Taps button
4. Nothing happens (no sheet appears)
5. ❌ Sign-in didn't start
   → Check console for errors
   → Check iosClientId is set in AuthContext
   → Rebuild the app
```

---

## 🎓 Learning Resources

- [Google Sign-In iOS Documentation](https://developers.google.com/identity/sign-in/ios)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [Firebase iOS Auth Guide](https://firebase.google.com/docs/auth/ios/google-signin)
- [OAuth 2.0 Overview](https://developers.google.com/identity/protocols/oauth2)

---

**This diagram should help you understand how all the pieces fit together!** 🧩

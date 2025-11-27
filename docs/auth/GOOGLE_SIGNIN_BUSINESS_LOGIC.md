# Google Sign-In/Sign-Up Business Logic

## Overview
This document explains the complete business logic for Google authentication, handling all 4 user scenarios exactly like the PWA.

## The 4 Scenarios

### Scenario 1: New User Tries to Sign In (No Account)
**User Action:** Clicks "Sign in with Google" on Login screen  
**System State:** No Firestore profile exists for this Google account

**Flow:**
1. User clicks "Sign in with Google" button
2. Google Sign-In sheet appears
3. User selects their Google account
4. Firebase authenticates the Google ID token
5. **Backend checks if user profile exists in Firestore**
6. ❌ **Profile NOT found**
7. System signs out the user immediately
8. Shows error: "No account found for this Google account. Please sign up first."
9. **Automatically switches to Sign Up form**

**Code Path:**
```typescript
AuthPage.handleGoogleSignIn()
  → AuthContext.signInWithGoogle()
    → FirebaseAuthService.signInWithGoogleIdToken()
    → UserProfileService.getUserProfile() // ❌ THROWS ERROR
    → FirebaseAuthService.signOut()
    → throw new Error('ACCOUNT_NOT_FOUND')
  → AuthPage catches error
  → Shows alert and switches to 'register' mode
```

**Expected Behavior:**
- User is NOT logged in
- Error message is user-friendly
- User is guided to create an account via Sign Up

---

### Scenario 2: Existing User Tries to Sign Up (Already Has Account)
**User Action:** Clicks "Sign up with Google" on Register screen  
**System State:** Firestore profile already exists for this Google account

**Flow:**
1. User clicks "Sign up with Google" button
2. Google Sign-In sheet appears
3. User selects their Google account
4. Firebase authenticates the Google ID token
5. **Backend checks if user profile exists in Firestore**
6. ✅ **Profile FOUND**
7. System logs them in (no new profile created)
8. Shows success: "Successfully signed up with Google! Welcome to TravalPass."
9. **Navigates to main app**

**Code Path:**
```typescript
AuthPage.handleGoogleSignUp()
  → AuthContext.signUpWithGoogle()
    → FirebaseAuthService.signInWithGoogleIdToken()
    → UserProfileService.getUserProfile() // ✅ SUCCESS
    → profileExists = true
    → setUser(firebaseUser)
    → setStatus('authenticated')
  → AuthPage shows success alert
  → AppNavigator redirects to main app
```

**Expected Behavior:**
- User is logged in successfully
- No duplicate profile is created
- User proceeds to main app
- Graceful handling of "accidental sign up"

---

### Scenario 3: New User Signs Up Successfully (Creates Account)
**User Action:** Clicks "Sign up with Google" on Register screen  
**System State:** No Firestore profile exists for this Google account

**Flow:**
1. User clicks "Sign up with Google" button
2. Google Sign-In sheet appears
3. User selects their Google account
4. Firebase authenticates the Google ID token
5. **Backend checks if user profile exists in Firestore**
6. ❌ **Profile NOT found**
7. **System creates new user profile via Cloud Function**
8. Profile data populated:
   ```javascript
   {
     username: displayName || email.split('@')[0],
     email: user.email,
     bio: '',
     gender: '',
     sexualOrientation: '',
     edu: '',
     drinking: '',
     smoking: '',
     dob: '',
     photos: ['', '', '', '', ''],
     subscriptionType: 'free',
     subscriptionStartDate: null,
     subscriptionEndDate: null,
     subscriptionCancelled: false,
     stripeCustomerId: null,
     dailyUsage: {
       date: '2025-11-23',
       viewCount: 0
     }
   }
   ```
9. ✅ Profile created successfully
10. User is logged in
11. Shows success: "Successfully signed up with Google! Welcome to TravalPass."
12. **Navigates to main app**

**Code Path:**
```typescript
AuthPage.handleGoogleSignUp()
  → AuthContext.signUpWithGoogle()
    → FirebaseAuthService.signInWithGoogleIdToken()
    → UserProfileService.getUserProfile() // ❌ THROWS ERROR (no profile)
    → profileExists = false
    → UserProfileService.createUserProfile() // ✅ CREATE PROFILE
    → setUser(firebaseUser)
    → setStatus('authenticated')
  → AuthPage shows success alert
  → AppNavigator redirects to main app
```

**Expected Behavior:**
- New user account created
- Profile document exists in `users/{uid}` collection
- User is logged in
- User proceeds to main app

---

### Scenario 4: Existing User Signs In (Normal Flow)
**User Action:** Clicks "Sign in with Google" on Login screen  
**System State:** Firestore profile already exists for this Google account

**Flow:**
1. User clicks "Sign in with Google" button
2. Google Sign-In sheet appears
3. User selects their Google account
4. Firebase authenticates the Google ID token
5. **Backend checks if user profile exists in Firestore**
6. ✅ **Profile FOUND**
7. User is logged in
8. Shows success: "Login successful! Welcome back." (web only)
9. **Navigates to main app**

**Code Path:**
```typescript
AuthPage.handleGoogleSignIn()
  → AuthContext.signInWithGoogle()
    → FirebaseAuthService.signInWithGoogleIdToken()
    → UserProfileService.getUserProfile() // ✅ SUCCESS
    → setUser(firebaseUser)
    → setStatus('authenticated')
  → AuthPage shows success alert (web only)
  → AppNavigator redirects to main app
```

**Expected Behavior:**
- User is logged in successfully
- Existing profile data is preserved
- User proceeds to main app
- Standard successful login flow

---

## Error Handling Matrix

| Scenario | Error Type | User Message | Action |
|----------|-----------|--------------|---------|
| 1 | ACCOUNT_NOT_FOUND | "No account found for this Google account. Please sign up first." | Switch to Sign Up form |
| 2 | N/A (Success) | "Successfully signed up with Google! Welcome to TravalPass." | Navigate to app |
| 3 | Profile creation fails | "Failed to create user profile. Please try again." | Sign out user, stay on form |
| 4 | N/A (Success) | "Login successful! Welcome back." | Navigate to app |
| All | Google popup closed | "Google sign-in was canceled." | Stay on form |
| All | Network error | Error message from exception | Stay on form |
| All | Module unavailable | "Google Sign-In is not configured. Please rebuild the app after installing dependencies." | Show error |

---

## Security Considerations

### Token Validation
- All Google ID tokens validated server-side by Firebase
- No client-side token manipulation possible
- Tokens expire and require refresh

### Profile Access Control
- Firestore security rules enforce profile ownership
- Only authenticated users can read/write their own profiles
- Cloud Functions run with admin privileges for profile creation

### Sign-Out on Failure
- **Critical:** Scenario 1 and failed Scenario 3 MUST sign out the user
- Prevents orphaned Firebase auth sessions without profiles
- Ensures clean state for retry attempts

---

## Testing Strategy

### Unit Tests Required
1. **AuthContext.signInWithGoogle()**
   - Mock `UserProfileService.getUserProfile()` to throw error (Scenario 1)
   - Mock `UserProfileService.getUserProfile()` to return profile (Scenario 4)
   - Verify `FirebaseAuthService.signOut()` called on ACCOUNT_NOT_FOUND

2. **AuthContext.signUpWithGoogle()**
   - Mock profile exists (Scenario 2) - should skip creation
   - Mock profile doesn't exist (Scenario 3) - should call createUserProfile
   - Mock profile creation failure - should sign out user

3. **AuthPage.handleGoogleSignIn()**
   - Mock ACCOUNT_NOT_FOUND error - verify mode switches to 'register'
   - Mock success - verify no mode change

### Integration Tests Required
1. End-to-end flow with real Firebase emulator
2. Verify Firestore profile documents created correctly
3. Test all 4 scenarios with real Google Sign-In flow

---

## Migration from isNewUser Flag

**Old Implementation:**
```typescript
if (firebaseUser.isNewUser) {
  await createProfile();
}
```

**Problems:**
- `isNewUser` flag unreliable
- Doesn't distinguish sign-in vs sign-up intent
- Can't redirect users to correct flow

**New Implementation:**
```typescript
try {
  await UserProfileService.getUserProfile(uid);
  // Profile exists - handle accordingly
} catch {
  // Profile doesn't exist - handle accordingly
}
```

**Benefits:**
- Firestore is source of truth
- Clear separation of sign-in vs sign-up flows
- Proper error handling for all scenarios
- Matches PWA behavior exactly

---

## Cloud Function Used

### `createUserProfile`
**Location:** `functions/src/createUserProfile.ts` (in voyager-pwa repo)

**Input:**
```typescript
{
  userId: string;
  profile: {
    username: string;
    email: string;
    photos: string[];
    subscriptionType: 'free';
    // ... other fields
  }
}
```

**Output:**
```typescript
{
  success: boolean;
  message: string;
  profile: UserProfile;
}
```

**Security:**
- Requires authenticated user
- Validates input data
- Uses admin SDK for Firestore write
- Handles duplicate profile attempts gracefully

---

## Troubleshooting

### "Google Sign-In is not configured"
**Problem:** Native module not available  
**Solution:** Rebuild the app with `npx expo run:android` or `npx expo run:ios`

### User stuck in auth loop
**Problem:** Firebase authenticated but no Firestore profile  
**Solution:** Check Cloud Function logs, verify `createUserProfile` succeeded

### Profile created but user not logged in
**Problem:** Error after profile creation  
**Solution:** Check `setUser()` and `setStatus()` calls in `signUpWithGoogle()`

### "No account found" but user swears they signed up
**Problem:** Profile creation failed silently  
**Solution:** Check Firestore for profile document, check Cloud Function logs

---

## Code Locations

- **AuthContext Logic:** `src/context/AuthContext.tsx`
- **UI Handlers:** `src/pages/AuthPage.tsx`
- **Firebase Service:** `src/services/auth/FirebaseAuthService.ts`
- **Profile Service:** `src/services/userProfile/UserProfileService.ts`
- **Google Sign-In Wrapper:** `src/utils/SafeGoogleSignin.ts`
- **Cloud Function:** `functions/src/createUserProfile.ts` (voyager-pwa)

---

## Summary

The implementation now correctly handles all 4 Google authentication scenarios:

1. ✅ **New user sign in** → Error + redirect to sign up
2. ✅ **Existing user sign up** → Just log them in
3. ✅ **New user sign up** → Create profile + log in
4. ✅ **Existing user sign in** → Normal login

This matches the PWA's behavior exactly and provides a smooth user experience regardless of which button users click.

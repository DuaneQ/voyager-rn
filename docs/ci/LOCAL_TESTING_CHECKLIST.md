# Local Testing Checklist - Pre-TestFlight Validation

**Date**: December 25, 2025  
**Goal**: Thorough local testing before TestFlight upload (2 free uploads remaining)

## ✅ Test Environment Setup

- [ ] **iOS Simulator Testing**: Test on multiple iOS versions if possible
  - iPhone 15 Pro (iOS 17+)
  - iPhone 14 (iOS 16)
  - iPad (if applicable)

- [ ] **Physical Device Testing** (CRITICAL - catches device-specific issues)
  - Test on actual iPhone with latest iOS
  - Verify on different network conditions (WiFi vs Cellular)

## 🔐 Authentication Testing (PRIORITY - Just Fixed)

### Email/Password Authentication
- [X] **Sign Up with Email/Password**
  - Enter new email and password
  - Verify email verification screen appears
  - Check Firebase Console: user created in Authentication
  - Check Firebase Console: profile document created in `users` collection
  - Verify profile has correct fields: `uid`, `displayName`, `email`, etc.

- [X] **Sign In with Email/Password**
  - Use existing account credentials
  - Verify successful login
  - Check that user data loads correctly

- [X] **Password Reset Flow**
  - Click "Forgot Password"
  - Enter email and submit
  - Verify reset email received (check spam folder)

### Google Authentication (JUST FIXED - CRITICAL TEST)
- [X] **Sign Up with Google**
  - Click "Sign up with Google" button
  - **Verify NO crash** (this was the bug we just fixed)
  - Complete Google OAuth flow
  - **CRITICAL**: Check Firebase Console - verify profile created in `users` collection
  - Verify profile has Google photo, display name, email

- [ ] **Sign In with Google**
  - Sign out if logged in
  - Click "Sign in with Google"
  - Verify successful authentication
  - Check that user data loads correctly

- [ ] **Google OAuth Screen**
  - Note what app name displays (currently shows project ID in Testing mode)
  - Verify permissions requested are correct

## 🧪 Core Functionality Testing

### Navigation & UI
- [X] **Bottom Navigation**
  - Tap each tab (Search, Matches, Chat, Profile)
  - Verify smooth transitions
  - Check for any layout issues

- [X] **Header/Navigation Bar**
  - Test back buttons
  - Test navigation stack

- [ ] **Modals & Overlays**
  - Test all modal dialogs
  - Verify they dismiss correctly
  - Check for keyboard issues

### Feature-Specific Tests
- [ ] **Search/Swipe Feature**
  - Search for itineraries
  - Test swipe gestures (like/dislike)
  - Verify usage tracking (free tier limits)

- [ ] **Chat Feature**
  - Open existing chat
  - Send message
  - Verify real-time updates
  - Test message notifications

- [ ] **Profile Management**
  - View own profile
  - Edit profile fields
  - Upload profile photo (if applicable)
  - Verify changes save to Firestore

- [ ] **AI Itinerary Generation** (Premium feature)
  - Test if accessible based on user tier
  - If premium: test generation flow
  - Verify progress tracking works

## 🐛 Error Handling & Edge Cases

- [ ] **Network Errors**
  - Enable Airplane Mode mid-operation
  - Verify graceful error messages
  - Test offline behavior

- [ ] **Invalid Inputs**
  - Try invalid email formats
  - Try weak passwords
  - Verify validation messages

- [ ] **Session Management**
  - Force quit app and reopen
  - Verify user stays logged in (or logs out correctly)
  - Test session timeout behavior

## 📱 Device-Specific Testing

- [ ] **Permissions**
  - Photo library access (if used)
  - Camera access (if used)
  - Notifications (if implemented)
  - Verify permission prompts are clear

- [ ] **Orientations**
  - Test portrait and landscape (if supported)
  - Check layout doesn't break

- [ ] **Different Screen Sizes**
  - Test on iPhone SE (small screen)
  - Test on iPhone 15 Pro Max (large screen)
  - Test on iPad (if universal app)

## 🔍 Console & Debugging

- [ ] **Metro Bundler Logs**
  - Check for any errors or warnings during app usage
  - Look for: `Error`, `Warning`, `Failed`, `undefined`

- [ ] **Xcode Console** (for Release build)
  - Run: `npx expo run:ios --configuration Release`
  - Watch Xcode console for crashes or errors
  - Check for memory warnings

- [ ] **Firebase Console**
  - Verify all data writes are happening correctly
  - Check Authentication users
  - Check Firestore `users`, `itineraries`, `connections` collections
  - Check Cloud Functions logs for errors

## 🧪 Automated Testing

- [ ] **Run Full Test Suite**
  ```bash
  npm test -- --passWithNoTests
  ```
  - Verify: **1809+ tests passing**
  - Current status: ✅ 1809 passed, 23 skipped

- [ ] **Run Integration Tests** (if applicable)
  ```bash
  npm run test:integration
  ```

- [ ] **Type Checking**
  ```bash
  npx tsc --noEmit
  ```
  - Verify: **No TypeScript errors**

## 🚀 Build Validation

- [ ] **Release Build Runs Without Crashes**
  ```bash
  npx expo run:ios --configuration Release
  ```
  - App launches successfully
  - No immediate crashes
  - All features work in Release mode

- [ ] **Check Build Size** (optional but good practice)
  - Review app size is reasonable
  - Check for any bloat

## 📋 Pre-Upload Checklist

Before running `eas build --platform ios`:

- [ ] All critical tests above are ✅ PASSED
- [ ] No console errors or warnings
- [ ] Firebase data is being written correctly
- [ ] Google Sign-In works end-to-end with profile creation
- [ ] Email/Password auth works end-to-end with profile creation
- [ ] App doesn't crash on any tested devices
- [ ] Version number updated in app.json (if needed)
- [ ] Build configuration is correct (Release mode)

## 🎯 Known Issues to Watch For

Based on recent fixes, pay special attention to:

1. **Google Sign-In Crash**: Was fixed by updating URL scheme in Info.plist
   - Verify: App doesn't crash when clicking "Sign up with Google"
   - Verify: Google OAuth screen appears

2. **Profile Creation**: Was fixed by switching to Firebase Auth SDK
   - Verify: Profiles ARE created in Firestore `users` collection
   - Check for both email/password AND Google sign-ups

3. **Test Failures**: Were fixed by removing dynamic imports
   - Verify: All 1809+ tests still passing

## 📝 Testing Notes

Record any issues found during testing:

**Date**: _____________  
**Device/Simulator**: _____________  
**iOS Version**: _____________

### Issues Found:
1. 
2. 
3. 

### Status:
- [ ] ✅ All tests passed - ready for TestFlight
- [ ] ❌ Issues found - needs fixes before upload

---

**Remember**: You only have 2 free TestFlight uploads remaining this month. Make this count! 🎯

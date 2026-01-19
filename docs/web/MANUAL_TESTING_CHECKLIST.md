# TravalPass Mobile App - Manual Testing Checklist

**Date:** January 17, 2026  
**Purpose:** Validate all features work correctly on iOS and Android before web migration  
**Tester:** _________________  
**Build:** iOS Build 15 / Android Build ___

---

## Test Environment Setup

- [ ] iOS device/simulator version: ___________
- [ ] Android device/emulator version: ___________
- [ ] Network: WiFi / Cellular
- [ ] Firebase Environment: Dev / Prod
- [ ] Test account credentials ready

---

## 1. Authentication & Onboarding

### 1.1 Email/Password Sign Up
- [ ] Navigate to registration screen
- [ ] Fill in valid email and password
- [ ] Submit registration form
- [ ] **Expected:** Account created, redirected to Terms modal
- [ ] **Notes:** ___________

### 1.2 Terms of Service Acceptance
- [ ] Terms modal appears automatically for new user
- [ ] Scroll through all terms content
- [ ] Verify Section 4 "ZERO TOLERANCE POLICY" is visible
- [ ] Try to dismiss modal without accepting
- [ ] **Expected:** Cannot dismiss, must accept or decline
- [ ] Check all 6 required acknowledgment checkboxes
- [ ] **Expected:** Accept button becomes enabled
- [ ] Tap "I Accept These Terms"
- [ ] **Expected:** Modal closes, app accessible
- [ ] **Notes:** ___________

### 1.3 Email/Password Login
- [ ] Log out from app
- [ ] Navigate to login screen
- [ ] Enter valid credentials
- [ ] Submit login form
- [ ] **Expected:** Logged in successfully, no Terms modal (already accepted)
- [ ] **Notes:** ___________

### 1.4 Google Sign-In
- [ ] Tap "Sign in with Google"
- [ ] Select Google account
- [ ] Grant permissions
- [ ] **Expected:** Logged in, Terms modal appears if first time
- [ ] **Notes:** ___________

### 1.5 Apple Sign-In (iOS only)
- [ ] Tap "Sign in with Apple"
- [ ] Authenticate with Face ID/Touch ID
- [ ] **Expected:** Logged in, Terms modal appears if first time
- [ ] **Notes:** ___________

### 1.6 Logout
- [ ] Navigate to Profile/Settings
- [ ] Tap Logout
- [ ] **Expected:** Returned to login screen, session cleared
- [ ] **Notes:** ___________

---

## 2. Profile Management

### 2.1 Create Profile
- [ ] Navigate to Profile screen
- [ ] Fill in all required fields:
  - [ ] Username
  - [ ] Date of Birth
  - [ ] Gender
  - [ ] Relationship Status
  - [ ] Sexual Orientation
- [ ] Upload profile photo
- [ ] **Expected:** Photo uploads successfully, preview shown
- [ ] Save profile
- [ ] **Expected:** Profile saved, confirmation shown
- [ ] **Notes:** ___________

### 2.2 View Own Profile
- [ ] Navigate to Profile tab
- [ ] Verify all profile data displays correctly
- [ ] Verify profile photo displays
- [ ] Check Ratings tab (should be empty for new user)
- [ ] Check Videos tab (should be empty initially)
- [ ] **Notes:** ___________

### 2.3 Edit Profile
- [ ] Tap Edit Profile
- [ ] Change username
- [ ] Change bio/description
- [ ] Save changes
- [ ] **Expected:** Changes persist after refresh
- [ ] **Notes:** ___________

### 2.4 Upload Profile Video
- [ ] Navigate to Profile → Videos tab
- [ ] Tap "Upload Video"
- [ ] Select video from library OR record new video
- [ ] Add title and description
- [ ] Submit upload
- [ ] **Expected:** Video uploads, appears in Videos tab
- [ ] **Expected:** Video appears in main Video Feed
- [ ] **Notes:** ___________

---

## 3. Search & Matching

### 3.1 Create Itinerary
- [ ] Navigate to Create Itinerary screen
- [ ] Fill in trip details:
  - [ ] Destination (use autocomplete)
  - [ ] Start date
  - [ ] End date
  - [ ] Trip activities (select multiple)
- [ ] Save itinerary
- [ ] **Expected:** Itinerary created successfully
- [ ] **Notes:** ___________

### 3.2 Search for Matches
- [ ] Navigate to Search tab
- [ ] Select your active itinerary
- [ ] Start search
- [ ] **Expected:** Matching users appear in swipeable cards
- [ ] Verify each card shows:
  - [ ] Username
  - [ ] Profile photo
  - [ ] Destination
  - [ ] Dates
  - [ ] Activities
- [ ] **Notes:** ___________

### 3.3 Like/Dislike Users
- [ ] Swipe RIGHT (or tap ❤️) to like a user
- [ ] **Expected:** Card disappears, next card appears
- [ ] Swipe LEFT (or tap ✖️) to dislike a user
- [ ] **Expected:** Card disappears, next card appears
- [ ] **Notes:** ___________

### 3.4 Mutual Match (Connection)
- [ ] Like a user who has already liked you
- [ ] **Expected:** Connection created, notification/modal appears
- [ ] Navigate to Connections/Chat tab
- [ ] **Expected:** New connection appears in list
- [ ] **Notes:** ___________

### 3.5 View Other User's Profile
- [ ] From search card, tap profile/info button
- [ ] ViewProfileModal opens
- [ ] Verify tabs: Profile, Ratings, Videos
- [ ] Check profile details display correctly
- [ ] **Notes:** ___________

---

## 4. Chat & Messaging

### 4.1 Open Chat Thread
- [ ] Navigate to Connections tab
- [ ] Tap on a connection
- [ ] Chat thread opens
- [ ] Verify other user's username displays in header
- [ ] Verify chat history loads (if any)
- [ ] **Notes:** ___________

### 4.2 Send Text Message
- [ ] Type message in input field
- [ ] Tap Send
- [ ] **Expected:** Message appears immediately (optimistic UI)
- [ ] **Expected:** Message shows as sent (check mark or timestamp)
- [ ] **Notes:** ___________

### 4.3 Send Image Message
- [ ] Tap image/photo icon in chat
- [ ] Select image from library OR take photo
- [ ] Image uploads with loading indicator
- [ ] **Expected:** Image appears in chat thread
- [ ] **Expected:** Image is clickable/expandable
- [ ] **Notes:** ___________

### 4.4 Receive Messages (Real-time)
- [ ] Have another user send you a message (use second device/account)
- [ ] **Expected:** Message appears in chat thread without refresh
- [ ] **Expected:** Unread indicator appears on Connections tab
- [ ] **Notes:** ___________

### 4.5 Mark Messages as Read
- [ ] Open chat thread with unread messages
- [ ] **Expected:** Unread count clears automatically
- [ ] **Expected:** Messages marked as read in Firestore
- [ ] **Notes:** ___________

### 4.6 Group Chat - Add User
- [ ] In chat thread, tap "Add User" or "+" button
- [ ] Select user(s) to add
- [ ] **Expected:** User(s) added to chat
- [ ] **Expected:** All members can see messages
- [ ] **Notes:** ___________

### 4.7 Group Chat - Remove User (if creator)
- [ ] Open group chat (must be creator)
- [ ] Tap "Manage Members"
- [ ] Remove a user
- [ ] **Expected:** User removed from chat
- [ ] **Expected:** Removed user can't see new messages
- [ ] **Notes:** ___________

---

## 5. Video Feed

### 5.1 View Video Feed
- [ ] Navigate to Video Feed tab
- [ ] **Expected:** Videos from all users display in scrollable list
- [ ] Scroll through feed
- [ ] Verify each video card shows:
  - [ ] Video thumbnail or player
  - [ ] Title
  - [ ] Username
  - [ ] Upload date
- [ ] **Notes:** ___________

### 5.2 Play Video
- [ ] Tap on a video card
- [ ] **Expected:** Video plays automatically OR tap play button
- [ ] **Expected:** Video plays smoothly without crashes
- [ ] Tap pause
- [ ] **Expected:** Video pauses
- [ ] **Notes:** ___________

### 5.3 Like Video
- [ ] Tap heart/like button on video
- [ ] **Expected:** Like count increments
- [ ] **Expected:** Like button changes state (filled heart)
- [ ] Tap again to unlike
- [ ] **Expected:** Like count decrements
- [ ] **Notes:** ___________

### 5.4 Report Video
- [ ] Tap "Report" button on video card
- [ ] Report modal opens
- [ ] Select violation reason (e.g., "Inappropriate content")
- [ ] Add description
- [ ] Submit report
- [ ] **Expected:** Report submitted, confirmation shown
- [ ] **Expected:** Report stored in Firestore `violations` collection
- [ ] **Notes:** ___________

---

## 6. User Safety Features (CRITICAL FOR APPLE)

### 6.1 Block User
- [ ] Open any user's profile (ViewProfileModal)
- [ ] Tap 🚫 Block button
- [ ] Confirmation alert appears
- [ ] Confirm block action
- [ ] **Expected:** Modal closes immediately
- [ ] **Expected:** User disappears from search results
- [ ] Navigate to Search, swipe through cards
- [ ] **Expected:** Blocked user does NOT appear
- [ ] Navigate to Video Feed
- [ ] **Expected:** Blocked user's videos do NOT appear
- [ ] Check Firebase Console → users → your UID → blocked array
- [ ] **Expected:** Blocked user's UID is in the array
- [ ] **Notes:** ___________

### 6.2 Report User
- [ ] Open any user's profile (ViewProfileModal)
- [ ] Tap "Report User" button
- [ ] Select violation reason from dropdown
- [ ] Add detailed description
- [ ] Submit report
- [ ] **Expected:** Report submitted, confirmation shown
- [ ] Check Firebase Console → `violations` collection
- [ ] **Expected:** New violation document created with:
  - reportedUserId
  - reportedByUserId
  - reason
  - description
  - timestamp
- [ ] **Notes:** ___________

### 6.3 Terms of Service Enforcement (New User)
- [ ] Create brand new account (new email)
- [ ] Complete registration
- [ ] **Expected:** Terms modal appears IMMEDIATELY
- [ ] **Expected:** Cannot access app without accepting
- [ ] Try tapping outside modal
- [ ] **Expected:** Modal does not dismiss
- [ ] Try navigating to other screens
- [ ] **Expected:** Blocked by Terms modal
- [ ] **Notes:** ___________

---

## 7. Navigation & UI

### 7.1 Bottom Navigation
- [ ] Tap each bottom tab icon:
  - [ ] Search/Home
  - [ ] Connections/Chat
  - [ ] Video Feed
  - [ ] Profile
- [ ] **Expected:** Each screen loads without crashes
- [ ] **Expected:** Active tab is highlighted
- [ ] **Notes:** ___________

### 7.2 Back Navigation
- [ ] Navigate deep into app (Profile → Edit → Photos)
- [ ] Tap back button at each level
- [ ] **Expected:** Returns to previous screen correctly
- [ ] **Expected:** No navigation stack errors
- [ ] **Notes:** ___________

### 7.3 Modals
- [ ] Open various modals (Terms, Report, ViewProfile)
- [ ] Verify modal opens with correct animation
- [ ] Tap outside modal OR tap X button
- [ ] **Expected:** Modal closes (except Terms)
- [ ] **Notes:** ___________

---

## 8. Push Notifications (Optional)

### 8.1 New Message Notification
- [ ] Have another user send you a message while app is backgrounded
- [ ] **Expected:** Push notification appears
- [ ] Tap notification
- [ ] **Expected:** App opens to chat thread
- [ ] **Notes:** ___________

### 8.2 New Connection Notification
- [ ] Have another user like your itinerary (creating match)
- [ ] **Expected:** Push notification appears
- [ ] Tap notification
- [ ] **Expected:** App opens to Connections tab
- [ ] **Notes:** ___________

---

## 9. Edge Cases & Error Handling

### 9.1 Offline Mode
- [ ] Enable Airplane Mode
- [ ] Navigate through app
- [ ] **Expected:** Graceful error messages (not crashes)
- [ ] Try to send message
- [ ] **Expected:** "No internet connection" error
- [ ] Re-enable network
- [ ] **Expected:** App recovers, pending actions retry
- [ ] **Notes:** ___________

### 9.2 Poor Network Connection
- [ ] Throttle network to 2G speed (dev tools)
- [ ] Try to upload video
- [ ] **Expected:** Progress indicator shows upload status
- [ ] **Expected:** Timeout error after reasonable time
- [ ] **Notes:** ___________

### 9.3 Invalid Data
- [ ] Try to create itinerary with past dates
- [ ] **Expected:** Validation error shown
- [ ] Try to register with invalid email
- [ ] **Expected:** Email validation error
- [ ] **Notes:** ___________

### 9.4 Session Expiration
- [ ] Manually delete auth token (Firebase Console)
- [ ] Try to perform action requiring auth
- [ ] **Expected:** Redirected to login screen
- [ ] **Notes:** ___________

---

## 10. Performance & Stability

### 10.1 App Launch Time
- [ ] Close app completely
- [ ] Launch app (cold start)
- [ ] Time from tap to usable screen: _______ seconds
- [ ] **Expected:** < 3 seconds on modern device
- [ ] **Notes:** ___________

### 10.2 Memory Usage
- [ ] Navigate through all screens
- [ ] Upload multiple videos/images
- [ ] Return to home screen
- [ ] Check device memory monitor
- [ ] **Expected:** No significant memory leaks
- [ ] **Notes:** ___________

### 10.3 Crash Testing
- [ ] Use app continuously for 10 minutes
- [ ] Navigate rapidly between screens
- [ ] Upload/download content simultaneously
- [ ] **Expected:** No crashes or freezes
- [ ] **Notes:** ___________

---

## Test Results Summary

### Critical Issues (Blockers)
List any features that don't work at all:
1. ___________
2. ___________

### High Priority Issues
List features that work but have significant bugs:
1. ___________
2. ___________

### Medium Priority Issues
List minor bugs or UX issues:
1. ___________
2. ___________

### Low Priority Issues
List cosmetic issues or nice-to-haves:
1. ___________
2. ___________

---

## Platform-Specific Notes

### iOS Specific
- Apple Sign-In: ___________
- Push Notifications: ___________
- Photo Picker: ___________
- Video Player: ___________

### Android Specific
- Google Sign-In: ___________
- Push Notifications: ___________
- Photo Picker: ___________
- Video Player: ___________

---

## Features Ready for Web Migration

Based on testing, which features work well and are ready for web?

- [ ] Authentication (Email/Password, Google, Apple)
- [ ] Profile Management
- [ ] Search & Matching
- [ ] Chat & Messaging
- [ ] Video Feed
- [ ] User Safety (Block/Report)
- [ ] Terms Enforcement
- [ ] Navigation

**Overall Assessment:** PASS / NEEDS WORK / FAIL

**Ready for Web Migration?** YES / NO / PARTIAL

**Notes:**
___________________________________________________________
___________________________________________________________
___________________________________________________________

---

**Tester Signature:** _________________  
**Date Completed:** _________________

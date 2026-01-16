# iOS App Store Deployment Guide - Initial Release

## Status: Pre-Deployment Preparation

**Last Updated**: December 29, 2025  
**App Version**: 1.0.0  
**Bundle ID**: com.travalpass.app

---

## Prerequisites Checklist

### ✅ What You Have
- [x] DUNS number
- [x] Apple Developer Account (assumed - verify below)
- [x] App built and tested locally
- [x] 1809 tests passing
- [x] Firebase backend configured

### 🔍 What You Need to Verify
- [ ] Apple Developer Program membership is **active** ($99/year)
- [ ] App Store Connect account is set up
- [ ] Payment and tax information configured in App Store Connect
- [ ] Certificates & Provisioning Profiles created (EAS handles this)

---

## Phase 1: Apple Developer Account Setup

### 1.1 Verify Developer Program Membership

**Check status:**
1. Go to [developer.apple.com](https://developer.apple.com/account)
2. Sign in with your Apple ID
3. Verify "Membership" shows "Apple Developer Program"
4. Check expiration date

**If not enrolled:**
1. Go to [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll)
2. Sign in with Apple ID
3. Select "Company/Organization" enrollment (you have DUNS)
4. Enter DUNS number
5. Pay $99 annual fee
6. Wait for approval (can take 1-3 days)

### 1.2 App Store Connect Access

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Sign in with the same Apple ID
3. Accept any pending agreements
4. Set up payment/tax info:
   - Click your name → Agreements, Tax, and Banking
   - Complete all required sections

---

## Phase 2: App Store Connect App Setup

### 2.1 Create New App

1. **Go to App Store Connect** → My Apps → + (plus icon)
2. **Select "New App"**
3. **Fill in required info:**
   - **Platforms**: iOS
   - **Name**: TravalPass
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.travalpass.app (must match app.json)
   - **SKU**: travalpass-001 (unique identifier, never shown to users)
   - **User Access**: Full Access

### 2.2 App Information

**Category** (Primary):
- **Suggested**: Social Networking or Travel

**Category** (Secondary - optional):
- **Suggested**: Lifestyle

**Content Rights**:
- ☑️ Contains third-party content (if using user-generated content)

**Age Rating** (Complete questionnaire):
- Realistic Violence: None
- Cartoon/Fantasy Violence: None
- Sexual Content or Nudity: **Review carefully** (dating app)
- Profanity or Crude Humor: Depends on chat moderation
- Alcohol, Tobacco, or Drug Use: None (unless travel content includes)
- Medical/Treatment Information: None
- Gambling: None
- Horror/Fear Themes: None
- Mature/Suggestive Themes: **Likely YES** (dating app)
- Unrestricted Web Access: **YES** (if you have in-app browser)
- Gambling: None
- User-Generated Content: **YES** (chat, profiles, photos, videos)

**Expected Rating**: 17+ (Most dating apps are 17+)

---

## Phase 3: App Store Listing Requirements

### 3.1 Required Assets

#### App Icon
- **Size**: 1024x1024 pixels
- **Format**: PNG (no transparency)
- **Location**: `./assets/icon.png` (verify dimensions)
- **Requirements**: Must not have rounded corners (Apple adds them)

#### Screenshots (REQUIRED for each device size)

**iPhone 6.7" Display** (iPhone 15 Pro Max, 14 Pro Max, etc.):
- **Size**: 1290 x 2796 pixels
- **Quantity**: 3-10 screenshots required
- **Format**: PNG or JPG

**iPhone 6.5" Display** (iPhone 11 Pro Max, XS Max):
- **Size**: 1242 x 2688 pixels
- **Quantity**: 3-10 screenshots required

**Recommended Screenshots to Capture:**
1. Welcome/Login screen
2. Profile creation/editing
3. Search/Browse interface
4. Match results
5. Chat interface
6. Video feed (if core feature)
7. User profile view
8. Settings screen (optional)

**Tool Recommendations:**
- Use iPhone 15 Pro Max simulator
- Use `Cmd + S` to save screenshots
- Or use [App Store Screenshot Generator](https://www.appscreenshots.com/)

#### App Preview Videos (Optional but Recommended)
- **Duration**: 15-30 seconds
- **Size**: Same as screenshots
- **Format**: .mov, .mp4, .m4v
- **Quantity**: 1-3 videos

### 3.2 App Description & Metadata

#### App Name
**Maximum**: 30 characters  
**Example**: "TravalPass - Travel Dating"

#### Subtitle
**Maximum**: 30 characters  
**Example**: "Meet travelers worldwide"

#### Promotional Text (Optional)
**Maximum**: 170 characters  
**Can be updated anytime without new build**  
**Example**: "Connect with fellow travelers! Plan trips together, share experiences, and find travel companions around the world."

#### Description
**Maximum**: 4000 characters  
**Required content:**

```
TravalPass helps you connect with travelers around the world. Whether you're looking for travel companions, local guides, or fellow adventurers, TravalPass makes it easy to find like-minded people.

KEY FEATURES:
• Browse travel itineraries from users worldwide
• Match with travelers based on destination and interests
• Real-time chat with potential travel companions
• Share your travel plans and find companions
• Video feed showcasing travel experiences
• Secure authentication with email or Google Sign-In

PERFECT FOR:
• Solo travelers seeking companions
• Adventure seekers looking for group trips
• Digital nomads connecting worldwide
• Travel enthusiasts sharing experiences

HOW IT WORKS:
1. Create your profile and travel preferences
2. Browse or search for travel itineraries
3. Connect with travelers going to the same destinations
4. Chat and plan your adventures together
5. Share your experiences through photos and videos

SAFE & SECURE:
• Email verification required
• Secure Firebase authentication
• Report and block features
• Privacy controls

Start your next adventure with TravalPass!
```

#### Keywords
**Maximum**: 100 characters (comma-separated)  
**Example**: "travel,dating,companion,itinerary,trip,adventure,nomad,vacation,tourism,meet"

**Tips**:
- No spaces after commas
- Most important keywords first
- No app name in keywords
- Research competitor keywords

#### Support URL
**Required**: Must be active before submission  
**Options**:
1. Create support page on your website
2. Use GitHub Issues: `https://github.com/[your-org]/voyager-RN/issues`
3. Create simple Firebase Hosting page

#### Marketing URL (Optional)
**Example**: `https://travalpass.com`

#### Privacy Policy URL
**REQUIRED for all apps**  
**Status**: ⚠️ CRITICAL - MUST CREATE BEFORE SUBMISSION

---

## Phase 4: Legal Requirements (CRITICAL)

### 4.1 Privacy Policy (MANDATORY)

You **must** have a Privacy Policy URL before submission. Apple will reject without it.

**Required Sections:**
1. **What data you collect:**
   - Email addresses
   - Profile information (name, age, photos, bio)
   - Location data (if using GPS)
   - Chat messages
   - Photos and videos
   - Usage analytics

2. **How you use data:**
   - Matching users
   - Communication between users
   - App functionality
   - Analytics and improvements

3. **Data sharing:**
   - Firebase (Google) as backend
   - Any analytics services
   - Third-party authentication (Google Sign-In)

4. **User rights:**
   - Data access requests
   - Data deletion
   - Account deletion
   - Communication preferences

5. **Contact information:**
   - Email for privacy inquiries
   - Physical address (if company)

**Hosting Options:**
1. **Firebase Hosting** (free)
2. **GitHub Pages** (free)
3. **Your own website**

**Quick Start Template:**
- Check `src/legal/PRIVACY_POLICY.md` (if exists)
- Use generators: [Privacy Policy Generator](https://www.privacypolicygenerator.info/)

### 4.2 Terms of Service

Located at: `src/legal/TERMS_OF_SERVICE.md`

**Verify it includes:**
- [ ] User conduct rules
- [ ] Content guidelines
- [ ] Age requirements (17+)
- [ ] Account termination policy
- [ ] Dispute resolution
- [ ] Liability limitations

### 4.3 App Privacy Details (New iOS Requirement)

In App Store Connect, you must disclose:

**Data Used to Track You**: (across apps/websites owned by other companies)
- [ ] Identifiers (if using analytics)

**Data Linked to You**:
- [x] Contact Info (email)
- [x] User Content (profile, photos, videos, messages)
- [x] Identifiers (user ID)
- [ ] Location (if using)
- [ ] Usage Data (if analytics)

**Data Not Linked to You**:
- [ ] Diagnostics (crash logs)

---

## Phase 5: Technical Requirements

### 5.1 App Review Information

**Contact Information** (private, only for App Review team):
- First Name:
- Last Name:
- Phone Number: (must be reachable)
- Email: (must monitor during review)

**Demo Account** (REQUIRED for dating/social apps):
```
Username/Email: testuser@travalpass.com
Password: [Create test account with:
  - Complete profile
  - Sample conversations
  - Example itineraries
  - Test photos/videos]
```

**Notes for Reviewer** (Help them test your app):
```
TravalPass is a travel companion matching app.

HOW TO TEST:
1. Sign in with provided demo account
2. Browse the Search tab to see travel itineraries
3. Like an itinerary to create a match
4. Navigate to Matches tab to see connections
5. Tap a match to open chat
6. Navigate to Videos tab to see travel content
7. Test profile editing in Profile tab

FEATURES TO TEST:
- Email/Google authentication
- Search and matching
- Real-time chat
- Video feed
- Profile management

The app requires email verification for new sign-ups, but the test account is already verified.

Firebase backend is live and fully functional.
```

### 5.2 Export Compliance

**Does your app use encryption?**
- **Answer**: YES (HTTPS for API calls)
- **Use standard encryption**: YES
- **Exempt from regulations**: YES (standard HTTPS)

You may need to register with [encryption.bis.doc.gov](https://encryption.bis.doc.gov/) but standard HTTPS apps are usually exempt.

### 5.3 Content Rights

**Does your app contain, display, or access third-party content?**
- **Answer**: YES (user-generated content)
- **Have rights to use**: Users grant rights via Terms of Service

---

## Phase 6: Build and Submit

### 6.1 TestFlight Testing First (REQUIRED)

```bash
# 1. Build for production
eas build --platform ios --profile production

# 2. Wait for build (10-20 minutes)

# 3. Submit to TestFlight
eas submit --platform ios --latest

# 4. Wait for processing (15-30 minutes)

# 5. Test on TestFlight before submitting to App Review
```

**TestFlight Testing Checklist:**
- [ ] Install via TestFlight
- [ ] Test all core features
- [ ] Verify no crashes
- [ ] Check Google Sign-In works
- [ ] Verify chat works
- [ ] Test video upload/playback
- [ ] Verify profile editing
- [ ] Check search/matching

### 6.2 Submit for App Review

**In App Store Connect:**

1. Go to your app → Version 1.0.0
2. Complete all required fields (metadata, screenshots, etc.)
3. Select your TestFlight build
4. Click "Submit for Review"

**Review Times:**
- First submission: 1-3 days typically
- Can be up to 7 days
- Monitor email for App Review updates

---

## Phase 7: Common Rejection Reasons (Prepare for These)

### 7.1 User-Generated Content Apps

**Requirement 1.2 - User Generated Content**
- ✅ MUST have in-app reporting mechanism
- ✅ MUST have block/report user feature
- ✅ MUST have content moderation
- ✅ MUST have way to contact you about objectionable content

**Check your app has:**
- [ ] Report user button
- [ ] Block user functionality
- [ ] Report message/content feature
- [ ] Content moderation plan documented

### 7.2 Sign In with Apple (May be required)

**Guideline 4.8 - Sign in with Apple**

If you offer Google Sign-In, Apple may require Sign in with Apple.

**Prepare to add:**
```bash
# Install Apple Sign-In
npx expo install expo-apple-authentication

# Implementation may be required after first review
```

### 7.3 Privacy Issues

Common rejections:
- Missing Privacy Policy URL
- Privacy Policy doesn't match data collection
- Missing app privacy details in App Store Connect
- Collecting data without disclosure

### 7.4 Minimum Functionality

**Guideline 4.2 - Minimum Functionality**

Ensure:
- [ ] App has enough content to be useful
- [ ] Core features work without errors
- [ ] Not just a web view wrapper
- [ ] Provides sufficient utility

### 7.5 Dating App Specific

**If classified as dating app:**
- [ ] Must be 17+ rating
- [ ] Must have reporting/blocking
- [ ] Should have safety tips
- [ ] May require identity verification plan

---

## Phase 8: Pre-Submission Checklist

### Complete Before Clicking "Submit"

#### App Store Connect
- [ ] App name filled in
- [ ] Subtitle written
- [ ] Description complete (4000 chars max)
- [ ] Keywords added (100 chars max)
- [ ] Screenshots uploaded (all required sizes)
- [ ] App icon uploaded (1024x1024)
- [ ] Category selected
- [ ] Age rating completed
- [ ] Privacy Policy URL added
- [ ] Support URL added
- [ ] App Privacy details disclosed
- [ ] Build selected from TestFlight
- [ ] Demo account credentials provided
- [ ] Review notes written
- [ ] Contact info for App Review filled
- [ ] Export compliance completed
- [ ] Content rights acknowledged

#### Legal
- [ ] Privacy Policy published and accessible
- [ ] Terms of Service in app
- [ ] Age gate implemented (if 17+)

#### Technical
- [ ] Tested on TestFlight
- [ ] All core features work
- [ ] No crashes
- [ ] Firebase backend live
- [ ] Google Sign-In works
- [ ] All tests passing (1809 tests)

#### Safety/Moderation
- [ ] Report user feature implemented
- [ ] Block user feature implemented
- [ ] Content reporting mechanism
- [ ] Moderation plan documented

---

## Phase 9: After Submission

### 9.1 Monitor Email

Watch for emails from App Store Connect:
- **"Ready for Review"**: App moved to review queue
- **"In Review"**: Reviewer is testing (usually 24-48 hours)
- **"Pending Developer Release"**: APPROVED! 🎉
- **"Metadata Rejected"** or **"Binary Rejected"**: Issues found

### 9.2 If Rejected

**Don't panic - rejections are common for first submission**

1. **Read rejection reason carefully**
2. **Check Resolution Center in App Store Connect**
3. **Fix the issue**
4. **Respond or resubmit**

Common fixes:
- Add missing features (Sign in with Apple, reporting)
- Update Privacy Policy
- Clarify functionality in review notes
- Fix crashes/bugs
- Add missing screenshots/metadata

### 9.3 If Approved

**You have two options:**

1. **Manual Release**:
   - You control when app goes live
   - Review → Status: "Pending Developer Release"
   - Click "Release" when ready

2. **Automatic Release**:
   - App goes live immediately after approval
   - Set in App Store Connect → Pricing and Availability

**After going live:**
- Monitor crash reports
- Check user reviews
- Respond to reviews (encouraged by Apple)
- Monitor downloads in App Analytics

---

## Phase 10: Post-Launch

### 10.1 App Analytics

Monitor in App Store Connect:
- Downloads/impressions
- Crashes
- User retention
- Conversion rate

### 10.2 Updates

**For bug fixes or features:**
```bash
# Update version in app.json
"version": "1.0.1",
"buildNumber": "1.0.1"

# Build and submit
eas build --platform ios --profile production
eas submit --platform ios --latest
```

**Update review times:**
- Usually faster than initial (1-2 days)
- Unless you change core functionality

---

## Quick Command Reference

```bash
# Build for TestFlight
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest

# Check build status
eas build:list --platform ios

# Update app version
# Edit app.json: version and buildNumber

# Rebuild after changes
eas build --platform ios --profile production
```

---

## Resources

### Apple Documentation
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

### Tools
- [App Store Screenshot Generator](https://www.appscreenshots.com/)
- [Privacy Policy Generator](https://www.privacypolicygenerator.info/)
- [App Store Optimization](https://www.apptopia.com/)

### Support
- [Apple Developer Forums](https://developer.apple.com/forums/)
- [App Store Connect API](https://developer.apple.com/app-store-connect/api/)

---

## Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| Developer Account Setup | 1-3 days | If not already enrolled |
| App Store Connect Setup | 2-4 hours | First time |
| Asset Creation (screenshots, etc.) | 4-8 hours | Design time |
| Privacy Policy Creation | 2-3 hours | Using templates |
| TestFlight Build & Test | 1-2 hours | Plus testing time |
| Submit for Review | 30 min | Filling forms |
| **App Review** | **1-7 days** | **Average: 2-3 days** |
| Launch | Instant | After approval |

**Total: 2-14 days** (mostly waiting for approval)

---

## Next Steps

1. **[ ] Verify Apple Developer Program membership**
2. **[ ] Create Privacy Policy and host it**
3. **[ ] Capture app screenshots (all required sizes)**
4. **[ ] Create demo/test account**
5. **[ ] Build for TestFlight: `eas build --platform ios --profile production`**
6. **[ ] Test on TestFlight thoroughly**
7. **[ ] Complete App Store Connect listing**
8. **[ ] Submit for review**

**CRITICAL**: Do not skip TestFlight testing. It catches issues before reviewers see them.

---

**Questions or Issues?**
- Check Apple Developer Forums
- Review App Store Review Guidelines
- Contact Apple Developer Support (phone support available with membership)

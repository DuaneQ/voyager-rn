# App Store Update Deployment Guide

**Last Updated**: January 26, 2026  
**Purpose**: Deploy updates/patches to existing App Store apps (iOS & Android)

---

## Overview

This guide covers deploying **updates** to apps already approved and live in the App Store. For initial deployment, see [APP_STORE_DEPLOYMENT_GUIDE.md](docs/ios/APP_STORE_DEPLOYMENT_GUIDE.md).

---

## Update vs Initial Release

### Updates MUST Go Through Review

❌ **Myth**: "Bug fixes don't need review"  
✅ **Reality**: ALL updates require Apple review (no exceptions)

**Good News**: Updates review faster:
- New app: 1-7 days
- Update: Same day to 48 hours
- Bug fix update: Usually fastest (hours to 1 day)

---

## iOS Update Deployment Process

### Step 1: Determine Version Number

**Semantic Versioning**: `MAJOR.MINOR.PATCH`

#### When to Increment

| Change Type | Example | Old Version | New Version |
|------------|---------|-------------|-------------|
| **Bug fix** | Auth persistence fix | 1.0.0 | 1.0.1 |
| **New feature** | Add filters | 1.0.0 | 1.1.0 |
| **Breaking change** | Complete redesign | 1.0.0 | 2.0.0 |

#### Build Number MUST ALWAYS Increment

```json
// app.json
{
  "expo": {
    "version": "1.0.1",     // User-facing version
    "ios": {
      "buildNumber": "17"    // MUST be higher than previous (was 16)
    }
  }
}
```

**Critical**: Apple requires unique build numbers. Reusing a build number will cause submission to fail.

---

### Step 2: Test Release Build Locally

**DO THIS BEFORE EAS BUILD** (saves build credits and money!)

```bash
# See RELEASE_BUILD_TESTING.md for full guide

# Quick version:
cd ios
xcodebuild -workspace TravalPass.xcworkspace \
  -scheme TravalPass \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'name=iPhone 17 Pro' \
  -derivedDataPath ./build

SIMULATOR_ID=$(xcrun simctl list devices | grep "iPhone 17 Pro" | grep "Booted" | grep -oE '\([A-F0-9-]+\)' | tr -d '()')
xcrun simctl install $SIMULATOR_ID ./build/Build/Products/Release-iphonesimulator/TravalPass.app
xcrun simctl launch $SIMULATOR_ID com.travalpass.app
cd ..
```

**Test Checklist**:
- [ ] App launches without crashes
- [ ] Bug fix works as expected
- [ ] No regressions in existing features
- [ ] Auth persistence works (kill/relaunch test)

---

### Step 3: Build with EAS

```bash
# Auto-build and auto-submit to App Store Connect
eas build --platform ios --profile production --auto-submit
```

**What happens**:
1. EAS queues the build (~150 min wait on free tier)
2. Build completes (~20 minutes)
3. Automatically uploads to App Store Connect
4. You receive email when ready

**Track progress**:
- Build: Check email or https://expo.dev/accounts/[your-account]/projects/voyager-rn/builds
- Submission: https://expo.dev/accounts/[your-account]/projects/voyager-rn/submissions

---

### Step 4: Add Update Notes in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app → **TestFlight** or **App Store**
3. Find version 1.0.1 (build 17)
4. Add **"What's New"** text:

```
Bug Fixes:
- Fixed authentication persistence - users no longer need to log in every time they open the app
```

**Tips**:
- ✅ Be specific and user-focused
- ✅ Lead with "Bug Fixes:" for faster review
- ✅ Keep under 4000 characters
- ❌ Don't mention Apple, competitor apps, or pricing

---

### Step 5: Submit for Review

In App Store Connect:

1. Select the new build (build 17)
2. Review all metadata (should be unchanged from v1.0.0)
3. **Important**: Add "What's New" text (Step 4)
4. Click **"Submit for Review"**

**No need to re-upload**:
- Screenshots (unless UI changed)
- App icon
- Description
- Keywords
- Privacy Policy

---

### Step 6: Monitor Review

**Expected Timeline**:
- Submitted → In Review: 0-24 hours
- In Review → Approved: 4-48 hours
- **Total**: Usually < 48 hours for bug fixes

**Status Meanings**:
- **Waiting for Review**: In queue
- **In Review**: Apple testing (don't make changes!)
- **Pending Developer Release**: ✅ APPROVED!
- **Rejected**: Fix issue and resubmit

---

## Android Update Deployment

```bash
# Build Android app
eas build --platform android --profile production

# Submit to Google Play (if configured)
eas submit --platform android --latest
```

**Google Play Review**:
- Usually automatic (hours)
- Faster than Apple
- Internal testing track available for instant deployment

---

## What If You Already Submitted 1.0.0 but It's Not Released Yet?

**Option 1**: Keep version 1.0.0, just increment build
```json
"version": "1.0.0",     // Same
"buildNumber": "17"      // Increment
```

**Option 2**: Increment to 1.0.1 (recommended for clarity)
```json
"version": "1.0.1",     // Increment
"buildNumber": "17"      // Increment
```

**Best Practice**: If 1.0.0 was approved but not released, you can upload build 17 as 1.0.0 or 1.0.1. Incrementing to 1.0.1 makes it clearer this is a newer build.

---

## Common Update Scenarios

### Scenario 1: Critical Bug Fix (This Guide)
- Version: 1.0.0 → 1.0.1
- Build: 16 → 17
- Review time: ~24 hours
- Release: ASAP after approval

### Scenario 2: New Feature
- Version: 1.0.1 → 1.1.0
- Build: 17 → 18
- Review time: 1-3 days
- Release: Coordinate marketing

### Scenario 3: Major Update
- Version: 1.9.0 → 2.0.0
- Build: 25 → 26
- Review time: 2-5 days
- Release: Plan launch campaign

---

## Cost Considerations

### EAS Build Credits

**Free tier**: 30 builds/month
- iOS: 1 build = 1 credit
- Android: 1 build = 1 credit

**Paid tier**: Faster builds (no queue)
- $29/month: Priority builds
- Unlimited builds

### Saving Build Credits

1. **Test locally first** (this guide!)
2. Don't build until you're confident
3. Use TestFlight before submitting to review
4. Run full test suite: `npm test`

**Today's Example**:
- ✅ Tested release build locally first (free)
- ✅ Verified auth persistence works (free)
- ✅ Then built with EAS (1 credit)
- ❌ Without testing: Would've wasted builds on failed attempts

---

## Pre-Deployment Checklist

Before running `eas build`:

### Version Management
- [ ] Incremented build number in `app.json`
- [ ] Updated version number appropriately (MAJOR.MINOR.PATCH)
- [ ] Verified version/build higher than current live version

### Testing
- [ ] All unit tests passing: `npm test`
- [ ] Release build tested locally (see RELEASE_BUILD_TESTING.md)
- [ ] Auth persistence verified (kill/relaunch test)
- [ ] Critical user flows tested
- [ ] No console errors or warnings

### Documentation
- [ ] Updated CHANGELOG.md (if exists)
- [ ] Prepared "What's New" text for App Store
- [ ] Documented breaking changes (if any)

### App Store Connect
- [ ] Have Apple Developer account access
- [ ] Know what's changed for review notes
- [ ] Privacy policy still accurate
- [ ] Screenshots still accurate (or new ones ready)

---

## After Approval

### Releasing the Update

**Option 1: Automatic Release** (set in App Store Connect)
- App goes live immediately after approval
- Best for critical bug fixes

**Option 2: Manual Release**
- You control when app goes live
- Coordinate with marketing/announcements

### Monitor Post-Release

1. **Crash Reports**: App Store Connect → Analytics → Crashes
2. **User Reviews**: Respond to reviews (encouraged by Apple)
3. **Download Stats**: Monitor adoption rate
4. **Firebase Analytics**: Track user behavior changes

---

## Update Rejection Handling

### If Rejected

1. **Read rejection carefully** in Resolution Center
2. **Common reasons for update rejections**:
   - New bug introduced
   - Broke existing functionality
   - Changed privacy data collection without updating policy
   - New feature violates guideline

3. **Fix and resubmit**:
   - Increment build number again (17 → 18)
   - Keep same version (1.0.1)
   - Address the issue
   - Respond in Resolution Center explaining fix

### Appeal Process

If you believe rejection is wrong:
1. Resolution Center → "Appeal"
2. Clearly explain why you believe it should be approved
3. Reference specific App Store Review Guidelines
4. Provide evidence/screenshots

---

## Version History Example

```
Version 1.0.1 (Build 17) - January 26, 2026
- Fixed: Users no longer need to log in every time they open the app
- Fixed: Auth persistence now works across app restarts

Version 1.0.0 (Build 16) - January 24, 2026
- Initial release
- Travel matching and planning
- Real-time chat
- Video sharing
```

---

## Command Reference

```bash
# Update version in app.json
# Increment: version AND buildNumber

# Build iOS
eas build --platform ios --profile production --auto-submit

# Build Android
eas build --platform android --profile production

# Check build status
eas build:list --platform ios

# Submit manually (if not using --auto-submit)
eas submit --platform ios --latest
eas submit --platform android --latest

# View submissions
eas submit:list
```

---

## Related Documentation

- [RELEASE_BUILD_TESTING.md](RELEASE_BUILD_TESTING.md) - Test before building
- [IOS_RELEASE_CHECKLIST.md](docs/ios/IOS_RELEASE_CHECKLIST.md) - Complete checklist
- [APP_STORE_DEPLOYMENT_GUIDE.md](docs/ios/APP_STORE_DEPLOYMENT_GUIDE.md) - Initial deployment

---

## Real Example: Today's Deployment (Jan 26, 2026)

**Change**: Fixed auth persistence bug  
**Version**: 1.0.0 → 1.0.1  
**Build**: 16 → 17  
**Testing**: Verified locally on iPhone 17 Pro simulator  
**Build Command**: `eas build --platform ios --profile production --auto-submit`  
**Review Time**: Expected ~24-48 hours  
**What's New**: "Bug Fixes: Fixed authentication persistence - users no longer need to log in every time they open the app"

**Why this should approve quickly**:
1. Existing app already approved
2. Small bug fix (not new features)
3. Clear description in "What's New"
4. No privacy/security changes
5. Tested thoroughly before submission

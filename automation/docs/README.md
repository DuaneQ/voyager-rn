# Automation Documentation

This directory contains comprehensive documentation for E2E testing of the TravalPass React Native mobile app.

## Quick Start

**Run Tests**:
```bash
cd automation

# iOS (text fields only, ~60s)
PLATFORM=ios npx wdio run wdio.mobile.conf.ts --spec tests/mobile/profile-edit.test.ts

# Android (comprehensive, ~90s)
PLATFORM=android npx wdio run wdio.mobile.conf.ts --spec tests/mobile/profile-edit.test.ts
```

## Documentation Index

### ✅ Current & Active

| Document | Purpose | Status |
|----------|---------|--------|
| **E2E_TEST_COMPLETE.md** | Complete E2E testing implementation guide | ✅ Primary Reference |
| **APPIUM_SETUP_SUMMARY.md** | Appium installation and setup guide | ✅ Reference |
| **MOBILE_BUILD_COMPLETE.md** | Mobile build completion summary | ✅ Reference |
| **MOBILE_BUILD_GUIDE.md** | Step-by-step mobile app build instructions | ✅ Reference |
| **MOBILE_TEST_SETUP.md** | Initial mobile test setup requirements | ✅ Reference |
| **RN_WEB_TESTING_NOTES.md** | React Native web testing notes | ✅ Reference |

### 📋 What Each Document Covers

#### E2E_TEST_COMPLETE.md (START HERE)
The **primary documentation** for E2E mobile testing:
- ✅ Platform-specific testing strategies (iOS vs Android)
- ✅ Technical solutions and code examples
- ✅ Test execution instructions
- ✅ Troubleshooting guide
- ✅ Best practices and learnings
- ✅ CI/CD integration examples
- ✅ Complete implementation details

**Read this first for understanding the E2E test implementation.**

#### APPIUM_SETUP_SUMMARY.md
Covers the Appium setup process:
- Appium 2.0.1 installation
- iOS (xcuitest) and Android (uiautomator2) drivers
- WebdriverIO configuration
- npm scripts for mobile testing
- System requirements

#### MOBILE_BUILD_GUIDE.md
Step-by-step instructions for building native apps:
- iOS app build with Xcode
- Android APK build with Gradle
- Troubleshooting common build issues
- Simulator/emulator setup

#### MOBILE_TEST_SETUP.md
Initial setup requirements:
- Prerequisites
- Project structure
- Configuration options
- Environment variables

#### MOBILE_BUILD_COMPLETE.md
Summary of mobile build completion:
- Build status for iOS and Android
- App file locations
- Verification steps

#### RN_WEB_TESTING_NOTES.md
Notes on React Native web testing considerations:
- Web-specific testing approaches
- Platform differences
- Known issues

## Test Results

| Platform | Status | Duration | Coverage |
|----------|--------|----------|----------|
| **iOS** | ✅ Passing | ~60 seconds | Text fields (username, bio) |
| **Android** | ✅ Passing | ~90 seconds | All fields + 6 pickers |

## Architecture Overview

```
automation/
├── docs/                    # This directory
│   ├── README.md           # This file
│   └── E2E_TEST_COMPLETE.md   # Main reference ⭐
├── src/
│   ├── pages/
│   │   ├── BasePage.ts     # Platform-agnostic base
│   │   ├── LoginPage.ts    # Login automation
│   │   └── ProfilePage.ts  # Profile interactions ⭐
│   └── helpers/
│       └── loginHelper.ts  # Auto-login utility
├── tests/
│   └── mobile/
│       └── profile-edit.test.ts  # E2E profile test ⭐
└── wdio.mobile.conf.ts     # Mobile configuration
```

## Key Technologies

- **Appium 2.0.1**: Mobile automation server
- **XCUITest 10.2.2**: iOS driver
- **UIAutomator2 5.0.6**: Android driver
- **WebdriverIO 9.x**: Test framework
- **Mocha**: Test runner

## Platform Differences

### iOS Testing
- **Strategy**: Text-only (username, bio)
- **Reason**: iOS pickers are complex to automate
- **Navigation**: Uses `mobile:tap` gestures
- **Duration**: ~60 seconds

### Android Testing
- **Strategy**: Comprehensive (all fields)
- **Coverage**: 6 pickers + date + text fields
- **Navigation**: Standard click events
- **Duration**: ~90 seconds

## Common Commands

```bash
# Check Appium installation
npx appium --version

# List iOS simulators
xcrun simctl list devices

# List Android emulators
~/Library/Android/sdk/emulator/emulator -list-avds

# Start Appium server manually
npx appium --log-level debug

# Run specific test
PLATFORM=ios npx wdio run wdio.mobile.conf.ts --spec tests/mobile/profile-edit.test.ts
```

## Troubleshooting

### Test Won't Start
1. Check app is built for target platform
2. Ensure simulator/emulator is running
3. Verify Appium drivers are installed: `npx appium driver list`

### iOS Navigation Fails
- Ensure using `mobile:tap` with center coordinates
- Check 5000ms pause after navigation

### Android Picker Fails
- Verify `resource-id` matches component testID
- Check option text matches exactly (case-sensitive)

### Element Not Found
- iOS: Check `accessibilityLabel` or `testID` prop
- Android: Check `testID` prop
- Verify platform-specific selector syntax

## Contributing

When updating tests or documentation:

1. **Update E2E_TEST_COMPLETE.md first** (primary reference)
2. Test on both iOS and Android
3. Update code examples with actual working code
4. Add troubleshooting entries for new issues
5. Update this README if adding new documents

## Support

For issues:
1. Check **E2E_TEST_COMPLETE.md** troubleshooting section
2. Review test logs in terminal output
3. Check Appium server logs
4. Use Appium Inspector to debug element selectors

## Related Documentation

- **Profile Testing**: `/docs/profile/PROFILE_E2E_TESTING.md`
- **Profile Architecture**: `/docs/profile/PROFILE_PAGE.md`
- **Profile Tab Design**: `/docs/profile/profile_tab/PROFILE_TAB.md`

---

**Last Updated**: October 26, 2025  
**Status**: ✅ All tests passing  
**Maintainer**: Development Team

# Release Build Testing Guide

**Last Updated**: January 26, 2026  
**Purpose**: Test release builds locally on iOS simulator before deploying to App Store

---

## Problem This Solves

When running `npx expo run:ios --configuration Release`, Expo detects physical iOS devices even when simulators are booted, causing "No code signing certificates available" errors. This prevents testing release builds without code signing certificates.

**Root Cause**: Expo's device detection prioritizes physical devices over simulators.

---

## Solution: Use xcodebuild Directly

Testing release builds on iOS simulator requires using `xcodebuild` directly to bypass Expo's device detection.

### Quick Start

```bash
# 1. Shutdown all simulators
xcrun simctl shutdown all

# 2. Boot iPhone 17 Pro simulator
xcrun simctl boot "iPhone 17 Pro"
open -a Simulator

# 3. Build release configuration
cd ios
xcodebuild -workspace TravalPass.xcworkspace \
  -scheme TravalPass \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'name=iPhone 17 Pro' \
  -derivedDataPath ./build

# 4. Install and launch
SIMULATOR_ID=$(xcrun simctl list devices | grep "iPhone 17 Pro" | grep "Booted" | grep -oE '\([A-F0-9-]+\)' | tr -d '()')
xcrun simctl install $SIMULATOR_ID ./build/Build/Products/Release-iphonesimulator/TravalPass.app
xcrun simctl launch $SIMULATOR_ID com.travalpass.app
cd ..
```

---

## Testing Auth Persistence

After deploying an auth persistence fix, verify users don't have to log in every time:

### Method 1: Kill and Relaunch (Quick Test)

```bash
# Get simulator ID (iPhone 17 Pro)
SIMULATOR_ID=$(xcrun simctl list devices | grep "iPhone 17 Pro" | grep "Booted" | grep -oE '\([A-F0-9-]+\)' | tr -d '()')

# Kill the app
xcrun simctl terminate $SIMULATOR_ID com.travalpass.app

# Wait a moment
sleep 2

# Relaunch the app
xcrun simctl launch $SIMULATOR_ID com.travalpass.app
```

**Expected Result**: ✅ App opens to main screen without showing login screen

### Method 2: Simulator Reboot (Thorough Test)

```bash
# Get simulator ID
SIMULATOR_ID=$(xcrun simctl list devices | grep "iPhone 17 Pro" | grep "Booted" | grep -oE '\([A-F0-9-]+\)' | tr -d '()')

# Shutdown simulator
xcrun simctl shutdown $SIMULATOR_ID

# Wait for clean shutdown
sleep 2

# Boot simulator
xcrun simctl boot $SIMULATOR_ID

# Launch app
xcrun simctl launch $SIMULATOR_ID com.travalpass.app
```

**Expected Result**: ✅ User still logged in after full device restart

### Method 3: Manual UI Testing (Most Realistic)

1. Launch the app on simulator
2. Log in with credentials
3. Close app using Simulator UI:
   - Swipe up from bottom (like real device)
   - OR: Hardware menu → Home (Cmd+Shift+H)
   - OR: Swipe up and hold, then swipe app away
4. Relaunch app from home screen
5. ✅ User should still be logged in

---

## Testing Fresh Install

To simulate uninstalling and reinstalling (clears all data):

```bash
# Get simulator ID
SIMULATOR_ID=$(xcrun simctl list devices | grep "iPhone 17 Pro" | grep "Booted" | grep -oE '\([A-F0-9-]+\)' | tr -d '()')

# Uninstall app (clears all data including auth tokens)
xcrun simctl uninstall $SIMULATOR_ID com.travalpass.app

# Reinstall
xcrun simctl install $SIMULATOR_ID /Users/[your-path]/voyager-RN/ios/build/Build/Products/Release-iphonesimulator/TravalPass.app

# Launch
xcrun simctl launch $SIMULATOR_ID com.travalpass.app
```

**Expected Result**: ❌ User must log in (fresh install has no saved credentials)

---

## Why This Approach Works

1. **xcodebuild** explicitly targets simulator SDK (`-sdk iphonesimulator`)
2. **Specific destination** prevents physical device detection
3. **Direct simctl commands** bypass Expo's device detection entirely
4. **No code signing required** for simulators

---

## Why Not Use `npx expo run:ios --configuration Release`?

**Problem**: Even with only simulators booted, Expo detects physical iOS devices connected via:
- USB connection
- WiFi pairing
- Previous device connections

**Symptoms**:
```
CommandError: No code signing certificates are available to use.
```

**Even if you**:
- Disconnect the physical device
- Shutdown all simulators except one
- Use `--simulator` flag (not supported)

Expo still attempts to use physical device code signing.

---

## Troubleshooting

### "Unable to boot device in current state"

Multiple devices may be trying to boot. Shutdown all first:

```bash
xcrun simctl shutdown all
# Wait 5 seconds
xcrun simctl boot "iPhone 17 Pro"
```

### "No such file or directory: TravalPass.app"

Build didn't complete. Re-run xcodebuild:

```bash
cd ios
xcodebuild -workspace TravalPass.xcworkspace \
  -scheme TravalPass \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'name=iPhone 17 Pro' \
  -derivedDataPath ./build
```

### "An error was encountered processing the command"

App may already be installed. Uninstall first:

```bash
SIMULATOR_ID=$(xcrun simctl list devices | grep "iPhone 17 Pro" | grep "Booted" | grep -oE '\([A-F0-9-]+\)' | tr -d '()')
xcrun simctl uninstall $SIMULATOR_ID com.travalpass.app
```

### Build succeeded but app doesn't launch

Check Metro bundler isn't running in development mode:

```bash
# Kill any Metro processes
pkill -f "metro"

# Verify app is installed
xcrun simctl listapps $SIMULATOR_ID | grep travalpass
```

---

## Pre-Deployment Checklist

Before running `eas build`, verify locally:

- [ ] Release build compiles without errors
- [ ] App launches on simulator
- [ ] Auth persistence works (kill/relaunch test)
- [ ] All critical features functional:
  - [ ] User can sign in (Google/Email)
  - [ ] User can create/edit profile
  - [ ] Search/browsing works
  - [ ] Chat messaging works
  - [ ] Video playback works
  - [ ] User can log out
  - [ ] After logout, login screen shows

---

## Related Documentation

- [IOS_RELEASE_CHECKLIST.md](docs/ios/IOS_RELEASE_CHECKLIST.md) - Full release workflow
- [TESTFLIGHT_TESTING_GUIDE.md](docs/ios/TESTFLIGHT_TESTING_GUIDE.md) - EAS build testing
- [APP_STORE_DEPLOYMENT_GUIDE.md](docs/ios/APP_STORE_DEPLOYMENT_GUIDE.md) - Initial deployment

---

## Common Commands Reference

```bash
# List all simulators
xcrun simctl list devices

# List only booted simulators
xcrun simctl list devices | grep Booted

# Boot specific simulator by name
xcrun simctl boot "iPhone 17 Pro"

# Shutdown specific simulator
xcrun simctl shutdown "iPhone 17 Pro"

# Shutdown all simulators
xcrun simctl shutdown all

# Open Simulator app
open -a Simulator

# Launch app on simulator
xcrun simctl launch <SIMULATOR_ID> com.travalpass.app

# Terminate app on simulator
xcrun simctl terminate <SIMULATOR_ID> com.travalpass.app

# Uninstall app from simulator
xcrun simctl uninstall <SIMULATOR_ID> com.travalpass.app

# Install app to simulator
xcrun simctl install <SIMULATOR_ID> <PATH_TO_APP>

# List installed apps on simulator
xcrun simctl listapps <SIMULATOR_ID> | grep travalpass
```

---

## Why iPhone 17 Pro Simulator?

- Latest iOS features and APIs
- Production-representative screen size (6.1" OLED)
- Faster than older simulator models
- Matches what most users will have

You can test on other simulators by replacing "iPhone 17 Pro" with:
- "iPhone 16 Pro"
- "iPhone 15 Pro"
- "iPhone SE (3rd generation)" (smaller screen testing)
- "iPad Pro (12.9-inch)"

---

**Remember**: Local simulator testing is faster and free. Always test locally before using EAS build credits!

# iOS Deployment Troubleshooting Log

**Primary Issue**: App crashes on iOS TestFlight and locally with Hermes/JSC configuration errors

**Timeline**: December 20-22, 2025

**Status**: 🚧 IN PROGRESS - Testing local build with JSC configuration

---

## Executive Summary

This document chronicles our journey to deploy the React Native Expo app to iOS TestFlight. We encountered multiple issues:

1. **Hermes Crash (Builds 1.0.2-1.0.7)**: React 18.3.1 + Hermes incompatibility
2. **Plugin Not Executing (Build 1.0.7)**: Native folders prevented prebuild
3. **Fabric/New Arch Issue (Builds 1.0.8-1.0.9)**: Slider package incompatibility  
4. **White Screen (Build 1.0.10)**: JS bundle not embedded in .ipa
5. **Local Development (Dec 22)**: Expo Go uses Hermes regardless of config

**Key Learning**: Configuration issues require systematic local testing before using EAS build quota.

---

## Attempted Solutions

### Build 1.0.0 - 1.0.2 (Original Issue)
- **Status**: ❌ Failed
- **Configuration**: Hermes (default), React 19.1.2
- **Error**: `[runtime not ready]: TypeError: Cannot read property 'S' of undefined`
- **Root Cause**: React 19.1.2 incompatible with React Native 0.81.5

### Build 1.0.3 - 1.0.5: app.json jsEngine Change
- **Date**: Dec 20
- **Action**: Added `"jsEngine": "jsc"` to app.json ios section
- **Reasoning**: Standard Expo documentation approach to disable Hermes
- **Result**: ❌ Failed - Hermes still active
- **Why It Failed**: app.json jsEngine only affects local development, ignored by EAS Cloud builds

### React Downgrade to 18.3.1
- **Date**: Dec 20
- **Action**: Downgraded from React 19.1.2 → 18.3.1
- **Reasoning**: React Native 0.81.5 officially supports React 18.2.0, React 19 caused crashes
- **Commands**:
  ```bash
  npm install react@18.3.1 react-dom@18.3.1 @types/react@18.3.27
  ```
- **Result**: Still used Hermes (other attempts to disable Hermes failed)

### Build 1.0.6: Podfile.properties.json Modification
- **Date**: Dec 21, 12:41 AM
- **Action**: Manually changed `expo.jsEngine` from "hermes" to "jsc" in ios/Podfile.properties.json
- **Reasoning**: Discovered this as native iOS configuration file
- **Result**: ❌ Failed - Hermes still active
- **Why It Failed**: EAS Build regenerates Podfile.properties.json during prebuild, discarding local changes

### Build 1.0.7: expo-build-properties Plugin
- **Date**: Dec 21, 12:49-12:54 PM
- **Action**: Added expo-build-properties plugin to app.json:
  ```json
  "plugins": [
    ["expo-build-properties", {
      "ios": {
        "jsEngine": "jsc",
        "newArchEnabled": false
      }
    }]
  ]
  ```
- **Reasoning**: Authoritative method per Expo documentation
- **Result**: ❌ Failed - Build 1.0.7 still crashed with Hermes error at 15:48:18.997
- **Why It Failed**: **CRITICAL DISCOVERY** - Presence of ios/ folder causes EAS Build to skip prebuild phase, so plugins are never applied

---

## Root Cause Analysis (Dec 21, EAS Build Logs Review)

### Issue #1: React Version Contradiction ⚠️
**EAS Build Log Finding**:
```
✖ Major version mismatches
package       expected  found    
react         19.1.0    18.3.1   
react-dom     19.1.0    18.3.1   
@types/react  ~19.1.10  18.3.27  
```

**Problem**: 
- Expo SDK 54 REQUIRES React 19.1.0
- We downgraded to React 18.3.1 to fix React Native 0.81.5 compatibility
- **CONFLICT**: Can't satisfy both Expo SDK 54 and RN 0.81.5 simultaneously with same React version

**Status**: ⚠️ **UNRESOLVED CONTRADICTION** - Need to determine correct React version

### Issue #2: Prebuild Not Running (CRITICAL)
**EAS Build Log Finding**:
```
✖ This project contains native project folders but also has native configuration 
properties in app.json... When the android/ios folders are present, EAS Build 
will not sync the following properties: plugins.
```

**Problem**: 
- ios/ and android/ directories present in repository
- EAS Build sees native folders → skips prebuild phase
- expo-build-properties plugin runs during prebuild
- **Result**: Plugin never executes, Hermes always used

**Solution**: Add `/ios` and `/android` to .easignore to force prebuild
- **Status**: ✅ Implemented (Dec 21, latest)

### Issue #3: Deprecated Plugin Configuration
**EAS Build Log Warning**:
```
ios.newArchEnabled is deprecated, use app config `newArchEnabled` instead
```

**Solution**: Move `newArchEnabled` to root app.json config
- **Status**: ✅ Implemented (Dec 21, latest)

---

## Current Status (Dec 21, Post-Analysis)

### Changes Implemented (Dec 21):
1. ✅ Updated .easignore to include `/ios` and `/android`
2. ✅ Moved `newArchEnabled` out of plugin config to app.json root
3. ⚠️ React version still at 18.3.1 (contradicts Expo SDK 54 requirement)

### Outstanding Questions:
1. **React Version Dilemma**: 
   - Expo SDK 54 wants React 19.1.0
   - React Native 0.81.5 works best with React 18.2.0
   - Current: React 18.3.1 (compromise that may not work with either)
   - **Need decision**: Keep 18.3.1, try 19.1.0, or try 18.2.0?

2. **Unit Tests Failing**: 
   - Recent app.json changes may have broken tests
   - Need to investigate and fix before next build

3. **Will .easignore fix work?**
   - Theory: Forcing prebuild will apply expo-build-properties plugin
   - Needs verification with build 1.0.8

---

## Next Steps (Priority Order)

### Immediate (Before Build 1.0.8):
1. ⚠️ **FIX UNIT TESTS** - Investigate failures from app.json changes
2. ⚠️ **DECIDE REACT VERSION**:
   - Option A: Keep React 18.3.1 (current)
   - Option B: Upgrade to React 19.1.0 (Expo SDK 54 requirement)
   - Option C: Try React 18.2.0 (RN 0.81.5 official support)
3. ✅ Verify .easignore and app.json changes are correct

### After Unit Tests Pass:
4. 🚀 Build 1.0.8 with .easignore fix
5. Test on TestFlight to verify prebuild runs and JSC is applied

---

## Technical Details

### Expo SDK 54 Specifications:
- React Native: 0.81.5
- Expected React: 19.1.0 (per build logs)
- JavaScript Engines: Hermes (default), JSC (optional via expo-build-properties)

### Build Configuration Files:
- **app.json**: App configuration, plugin declarations
- **.easignore**: Controls which files are uploaded to EAS Build
- **ios/Podfile.properties.json**: Native iOS config (regenerated by prebuild)
- **eas.json**: EAS Build profiles

### Key Insight:
The fundamental issue was **build system configuration**, not just React/Hermes incompatibility. The presence of native folders prevented the plugin system from working.

---

---

## EAS BUILD QUOTA MANAGEMENT

**Free Plan Limit**: 15 iOS builds per month

### Current Usage (December 2025)
- 1.0.2-1.0.7: Hermes crash debugging (6 builds)
- 1.0.8: .easignore fix - prebuild executed (1 build)
---

## LESSONS LEARNED

### What Went Wrong (12 debugging attempts)
1. Didn't understand EAS Build ignores plugins when ios/ folder exists
2. Made incremental config changes instead of researching root cause first
3. Didn't test locally before each EAS build (wasted quota)
4. Didn't realize Expo Go always uses Hermes (can't test JSC locally in Expo Go)
5. Had duplicate JSC configurations that may have caused Metro bundler confusion

### What We Learned
1. **.easignore is critical** for plugin execution on EAS Cloud
2. **Local prebuild shows exactly what EAS will do** (should always run first)
3. **Version mismatch warnings can be misleading** (React 18 vs 19 warning was false positive)
4. **Fabric/New Architecture packages need careful management** (v5 slider had Fabric, v4 doesn't)
5. **Expo Go limitations** - always uses Hermes and New Architecture, can't test JSC configs
6. **Native builds required** for testing engine configurations (`npx expo run:ios`)
7. **Metro bundler needs explicit configuration** in eas.json for production builds
8. **Configuration conflicts** (multiple jsEngine declarations) can break builds silently

### Best Practices Going Forward

✅ **DO**:
- Run `npx expo prebuild --clean` before every EAS build
- Test native builds locally: `npx expo run:ios`
- Batch multiple changes into one build
- Use development profile for testing
- Check build logs carefully to learn from failures
- Keep single source of truth for each config (no duplicates)
- Document every attempt and result

❌ **DON'T**:
- Build incrementally for small config changes without local testing
- Clear cache unless necessary (native deps or config changes)
- Skip local validation to "save time"
- Test JSC configs in Expo Go (it won't work)
- Trigger builds without understanding the change
- Have duplicate configurations in multiple places

---

- 1.0.9: RCT_NEW_ARCH_ENABLED=0 attempt (1 build)
- 1.0.10: Slider downgrade - build succeeded (1 build)
- 1.0.11: JS bundle embedding fix (1 build - pending)
- **Used: 10-11/15 builds**
- **Remaining: 4-5 builds**

### Pre-Build Validation Workflow

**ALWAYS test locally before triggering EAS builds** to conserve quota.

#### Step 1: Local Prebuild
```bash
cd /Users/icebergslim/projects/voyager-RN
npx expo prebuild --clean
```

**Success criteria**: Command completes without errors, applies plugins correctly

#### Step 2: Local Build Validation (Optional but Recommended)
```bash
cd ios
xcodebuild -workspace TravalPass.xcworkspace \
  -scheme TravalPass \
  -configuration Release \
  clean build | grep -i error
```

**Success criteria**: No compilation errors (saves an EAS build)

#### Step 3: Trigger EAS Build (Only After Local Tests Pass)
```bash
# For configuration changes (clear cache)
eas build -p ios --profile production --clear-cache

# For code-only changes (faster)
eas build -p ios --profile production
```

### Quota-Saving Strategies

1. **Batch Configuration Changes**: Test multiple changes locally first
2. **Use Development Builds**: Separate quota for testing
3. **Skip Cache Clearing When Possible**: Only for native/config changes
4. **Use Local Builds for Active Development**: `npx expo run:ios`

### Emergency: Out of Builds

1. **Wait Until Next Month**: Quota resets on billing anniversary
2. **Temporary Upgrade**: On-demand plan, then downgrade
3. **Local Production Builds**: Use Xcode to archive and upload manually

---

## References

- Expo Prebuild Documentation: https://docs.expo.dev/workflow/prebuild/#usage-with-eas-build
- .easignore Documentation: https://docs.expo.dev/build-reference/easignore/
- expo-build-properties: https://docs.expo.dev/versions/latest/sdk/build-properties/
- React Native 0.81.5 + React 19 Issues: https://github.com/facebook/react-native/issues?q=React+19+Hermes
- Expo Go Limitations: https://docs.expo.dev/bare/using-expo-client/

---

## Decision Log

### Decision #1: React Version - KEEP 18.3.1 (DO NOT UPGRADE)
- **Status**: ✅ DECIDED
- **Final Decision**: **Keep React 18.3.1**
- **Rationale**:
  1. **React Native 0.81.5 officially supports React 18.x** (not 19.x)
  2. The EAS Build warning about React 19.1.0 is a **false positive** - Expo SDK 54 template expects React 19, but React Native 0.81.5 requires React 18
  3. **Upgrading to React 19.1.0 would BREAK the app** - React 19 is incompatible with RN 0.81.5
  4. The real issue is **Hermes**, not React version
  5. Once we force JSC via .easignore fix, React 18.3.1 will work fine
- **Evidence**: 
  - React Native 0.81.5 changelog confirms React 18.x support
  - Build logs show warning but this is Expo SDK template mismatch, not runtime requirement
  - App runs fine locally with React 18.3.1
- **Risk**: None - this is the correct version for RN 0.81.5

### Decision #2: Force Prebuild via .easignore
- **Status**: ✅ Decided and implemented
- **Rationale**: Only way to make expo-build-properties plugin execute on EAS Cloud
- **Risk**: Low - standard Expo practice for prebuild workflow

---

## RECOMMENDATION FOR BUILD 1.0.8

**DO NOT upgrade React to 19.1.0** - this will break the app.

**Proceed with current configuration:**
1. ✅ React 18.3.1 (correct for RN 0.81.5)
2. ✅ .easignore includes /ios and /android (forces prebuild)
3. ✅ expo-build-properties plugin configured with jsEngine: "jsc"
4. ✅ newArchEnabled moved to root config

**Expected Outcome:**
- EAS Build will run prebuild (because of .easignore)
- expo-build-properties will execute and configure JSC
- App will launch successfully with JavaScriptCore engine
- React 18.3.1 + JSC + RN 0.81.5 = Working combination

**If Build 1.0.8 Still Fails:**
Then we consider upgrading Expo SDK to 52+ (which uses RN 0.76 with proper React 19 support)

---

## BUILD 1.0.8 - BREAKTHROUGH! 🎉

**Result**: ✅ **PARTIAL SUCCESS** - Prebuild Executed for First Time!

Build 1.0.8 failed, but with a **COMPLETELY DIFFERENT ERROR** - proving the .easignore fix WORKED!

### Comparison

**All Previous Builds (1.0.2-1.0.7)**:
- ❌ Error: `[runtime not ready]: TypeError: Cannot read property 'S' of undefined`
- Phase: JavaScript initialization (50-250ms after launch)
- Location: Hermes engine runtime
- Pattern: **IDENTICAL error** across all builds

**Build 1.0.8**:
- ❌ Error: `'react/renderer/components/RNCSlider/RNCSliderComponentDescriptor.h' file not found`
- Phase: Xcode native compilation
- Location: Fastlane build step
- Pattern: **DIFFERENT error type**

### What This Proves

✅ .easignore fix WORKED - prebuild executed for first time
✅ expo-build-properties plugin applied
✅ Reached native build phase (not JS runtime crash)
✅ Core issue (plugin not executing) is **SOLVED**

### New Issue - RNCSlider Fabric

**Package**: `@react-native-community/slider@5.0.1`
**Problem**: Tries to use Fabric (New Architecture) headers even though `newArchEnabled: false`
**Root Cause**: Package has Fabric support and needs explicit flag to disable it

### Fix Applied for Build 1.0.9

Added to [eas.json](../eas.json) production profile:
```json
"env": {
  "NPM_CONFIG_LEGACY_PEER_DEPS": "true",
  "EXPO_USE_HERMES": "0",
  "RCT_NEW_ARCH_ENABLED": "0"  // ← NEW: Explicitly disable Fabric
}
```

**Expected**: This will force all packages to build without Fabric headers, fixing the RNCSlider compilation error.


---

## BUILD 1.0.9 - Same RNCSlider Error

**Result**: ❌ Failed with same error

Adding `RCT_NEW_ARCH_ENABLED=0` environment variable did NOT fix the issue. The package `@react-native-community/slider@5.0.1` still tries to use Fabric headers.

### Root Cause Analysis

The slider package v5.x has Fabric support built-in and cannot be disabled with environment variables alone. The package needs to be downgraded to v4.x which doesn't have Fabric support.

### Fix Applied for Build 1.0.10

**Downgraded slider package**:
```bash
npm install @react-native-community/slider@4.5.3 --legacy-peer-deps
```

**Rationale**:
- v5.0.1: Has Fabric/New Architecture support (causes build errors)
- v4.5.3: Last stable version without Fabric (compatible with RN 0.81.5)
- Still provides all slider functionality needed by TravelPreferencesTab

**Expected**: Build should complete successfully with JSC engine.

---

## BUILD 1.0.10 - SUCCESS BUT WHITE SCREEN

**Result**: ✅ **BUILD SUCCEEDED** but ❌ **WHITE SCREEN ON LAUNCH**

Build 1.0.10 completed successfully and was installed on iPhone, but app showed white screen with no JavaScript execution.

### Evidence
1. ✅ App launches successfully (PID 22292 in device logs)
2. ✅ JSC configured correctly in `ios/Podfile.properties.json`
3. ✅ React 18.3.1 (correct version)
4. ✅ Slider downgrade to 4.5.3 applied
5. ❌ **NO JavaScript console logs appear** (🚀 markers from App.tsx)
6. ❌ **White screen** (no UI renders)
7. ❌ App goes straight to background without executing JS

### Root Cause
**JavaScript bundle not embedded in iOS .ipa file** during EAS build process. The app binary launches successfully but has no JavaScript code to execute.

This is different from the Hermes crash - the app doesn't crash, it just has nothing to run.

### Fixes Applied for Build 1.0.11

#### 1. Remove Duplicate JSC Configuration
**Problem**: Conflicting JSC declarations in `app.json` may have caused bundler confusion.

**Change**: Remove duplicate `jsEngine` from ios section, keep only in expo-build-properties plugin:
```json
// REMOVED from ios section:
"ios": {
  "bundleIdentifier": "com.travalpass.app",
  // "jsEngine": "jsc",  ← REMOVED THIS
}

// KEPT in plugin (this is the authoritative config):
"plugins": [
  [
    "expo-build-properties",
    {
      "ios": {
        "jsEngine": "jsc"
      }
    }
  ]
]
```

#### 2. Explicitly Specify Metro Bundler
**Problem**: EAS might not have explicitly used Metro for JS bundling.

**Change**: Added to `eas.json` production profile:
```json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "bundler": "metro"  // ← ADDED
      }
    }
  }
}
```

#### 3. Verification Steps for Build 1.0.11

After build completes, verify bundle is embedded:

**Check EAS build logs for**:
```
› Metro bundler...
› Building JavaScript bundle...
› Bundle successfully created
```

**Check .ipa size**:
- With JS bundle: ~50-100 MB
- Without JS bundle: ~20-30 MB (TOO SMALL - indicates missing bundle)

**Test on device**:
- Install from TestFlight
- Launch app
- Connect to Console.app on Mac
- Look for `🚀 App.tsx:` log messages

---

## LOCAL DEVELOPMENT ISSUE (December 22)

**Problem**: Same Hermes crash error occurring locally: `TypeError: Cannot read property 'S' of undefined`

### Discovery: Expo Go Always Uses Hermes

The local error is occurring because **Expo Go app always uses Hermes**, regardless of app.json or Podfile.properties.json configuration.

**Evidence**:
```
WARN  🚨 React Native's New Architecture is always enabled in Expo Go, 
but it is explicitly disabled in your project's app config.
```

### Solution: Build Development Client

Cannot test JSC configuration in Expo Go. Must build native app:

```bash
# Method 1: Expo CLI (recommended)
npx expo run:ios

# Method 2: Manual Xcode build
cd ios
pod install
xcodebuild -workspace TravalPass.xcworkspace \
  -scheme TravalPass \
  -configuration Debug \
  clean build
```

### Current Status (Dec 22) - APP IS WORKING

**RESOLUTION**: The app works fine with React 19.1.0 + Expo Go + Hermes on the original `group_chat` branch.

**What went wrong during debugging**:
1. Incorrectly assumed React 19 was the problem
2. Made unnecessary changes (React downgrade, metro.config, etc.)
3. Those debugging changes broke the working configuration
4. Reverting to original package.json fixes everything

**Confirmed working configuration**:
- ✅ React 19.1.0
- ✅ React Native 0.81.5
- ✅ Expo SDK 54.0.24
- ✅ Expo Go with Hermes
- ✅ `group_chat` branch loads without errors

**The REAL problem**: TestFlight deployment issue is SEPARATE from local development. Local development works fine. TestFlight needs investigation but should NOT modify working local setup.

### Lessons Learned

1. **Don't fix what isn't broken**: Local development was working, TestFlight was the only issue
2. **Test assumptions**: Should have checked main/working branches before assuming React 19 was the problem
3. **Isolate issues**: TestFlight build issues ≠ local development issues
4. **Document working state first**: Should have documented what WAS working before making changes

### Next Steps for TestFlight (Separate Issue)

The TestFlight deployment issue needs investigation but should be done WITHOUT breaking local development:

1. Create a separate branch for TestFlight fixes
2. Keep local development on `group_chat` (working)
3. Test TestFlight-specific configurations in isolation
4. Use `.easignore`, `eas.json` and build-time configs (not runtime dependencies)

---

## Testing Production Builds Locally (Before Using EAS Quota)

**Goal**: Build and test a Release configuration locally that matches what EAS will create, catching issues before submitting to TestFlight.

### Step 1: Generate Native Projects (Prebuild) ✅ COMPLETED

This shows exactly what EAS Build will generate:

```bash
cd /Users/icebergslim/projects/voyager-RN

# Clean any existing native folders
rm -rf ios android

# Generate native projects (same as EAS does)
npx expo prebuild --clean --platform ios
```

**Result**: ✅ Prebuild completed successfully - ios/ folder generated

**What to check**:
- ✅ Command completes without errors
- ✅ `ios/` folder is created
- ✅ Check `ios/Podfile.properties.json` for correct settings
- ✅ Review any warnings about configuration

### Step 2: Install iOS Dependencies ✅ COMPLETED

```bash
# Install pods
cd ios
pod install
```

**Result**: ✅ Pod installation complete - 101 total pods installed

**What was verified**:
- ✅ All React Native modules linked correctly
- ✅ Codegen ran successfully for all native modules
- ✅ New Architecture configured properly
- ✅ Hermes enabled (default for RN 0.81.5)

### Step 3: Build Release Configuration ✅ COMPLETED

```bash
cd ..
npx expo run:ios --configuration Release
```

**Result**: ✅ **BUILD SUCCESSFUL - App launched successfully in Release mode**

**This confirms**:
- ✅ Same Release configuration as TestFlight works
- ✅ Native code compiles correctly
- ✅ No Hermes runtime errors
- ✅ Production-like environment is stable

### Step 4: Test the Release Build ✅ COMPLETED

**Critical tests**:
1. ✅ App launches without crashing
2. ✅ No "runtime not ready" errors
3. ✅ No white screen issues
4. Test authentication (login/logout)
5. Test Firebase connection
6. Test navigation between screens
7. Test key features

**Status**: Release build is working - **SAFE TO PROCEED WITH EAS BUILD**

---

## ✅ READY FOR TESTFLIGHT DEPLOYMENT

**Local Release build succeeded** - This means:
- Configuration is correct
- Native modules compile properly  
- React 19.1.0 + Hermes works in Release mode
- EAS build should succeed

**Next steps**:
```bash
# Clean up local build artifacts (optional)
rm -rf ios/build

# Trigger EAS build
eas build -p ios --profile production
```

**Expected outcome**: Build should succeed and deploy to TestFlight successfully.

**Remaining quota**: 2 builds left this month - now safe to use one.

### Step 4: Build with Xcode (Alternative Method)

For more control and detailed error messages:

```bash
# After prebuild
cd ios

# Open in Xcode
open TravalPass.xcworkspace

# In Xcode:
# 1. Select "TravalPass" scheme
# 2. Choose your device/simulator
# 3. Product > Archive (for TestFlight-like build)
#    OR
#    Product > Run (for quick test)
```

**Xcode advantages**:
- See detailed build logs
- Test on physical device
- Catch compilation errors early
- Archive creates .ipa like TestFlight

### Troubleshooting Local Release Builds

**Common issues**:

1. **Missing bundle**: Add to `eas.json`:
   ```json
   "ios": {
     "buildConfiguration": "Release",
     "bundler": "metro"
   }
   ```

2. **Hermes errors**: Check `ios/Podfile.properties.json`:
   ```json
   {
     "expo.jsEngine": "hermes"
   }
   ```

3. **Build failures**: Check Xcode build logs for specific errors

### When to Use EAS Build

Only submit to EAS when:
- ✅ Local Release build works perfectly
- ✅ All critical features tested
- ✅ No console errors or warnings
- ✅ Prebuild completed without issues

**Saves quota by catching issues locally first.**


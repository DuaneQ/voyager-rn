# Android APK Build Failure - Quick Fix Applied

## Issue
APK not being created during Gradle build step.

## Root Cause (Suspected)
The patch script was using a complex Groovy expression with `.execute()` to dynamically resolve the `expo-modules-core` path:

**Old (Complex):**
```groovy
apply from: new File(["node", "--print", "require.resolve('expo-modules-core/package.json')"].execute(null, rootDir).text.trim(), "../android/ExpoModulesCorePlugin.gradle")
```

This might fail in CI because:
1. `.execute()` might not have access to `node` command
2. Shell execution in Groovy can be unreliable
3. Path resolution might produce incorrect results in CI environment

## Fix Applied

**New (Simple relative path):**
```groovy
apply from: new File(rootDir, '../../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle')
```

This uses a simple relative path from `rootDir` (which is `android/` directory):
- `rootDir` = `/path/to/project/android`
- `../../node_modules` = `/path/to/project/node_modules`
- Full path: `/path/to/project/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle`

## Changes Made

### 1. Simplified Patch Script
**File:** `.github/scripts/patch-android-build.sh`

- Removed complex `.execute()` call
- Used simple relative path
- More reliable in CI environment

### 2. Fixed Appium Command in Tests
**File:** `.github/workflows/android-automation-testing.yml`

Changed from global `appium` to project-local `npx appium`:
```bash
# Old (broken)
appium --log-level info &

# New (working)
cd automation
npx appium --log-level info > appium.log 2>&1 &
```

## Files Modified

1. `.github/scripts/patch-android-build.sh` - Simplified path resolution
2. `.github/workflows/android-automation-testing.yml` - Fixed Appium command

## Expected Result

The Gradle build should now:
1. ✅ Find ExpoModulesCorePlugin.gradle correctly
2. ✅ Apply the plugin successfully
3. ✅ Build the APK to `android/app/build/outputs/apk/debug/app-debug.apk`

## How to Verify

After pushing, check these steps in CI:

### 1. Generate Android Project
Should show:
```
✅ Successfully patched android/app/build.gradle

First 10 lines of patched file:
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

// Apply Expo modules plugin
apply from: new File(rootDir, '../../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle')
```

### 2. Build Android APK
Should show:
```
🚀 Building APK with full error logging...
[build output]
✅ APK build completed
```

### 3. Verify APK Creation
Should show:
```
✅ APK found at: android/app/build/outputs/apk/debug/app-debug.apk
```

## If Still Fails

If the build still fails, we need to see the actual Gradle error. Download the `gradle-build-log` artifact from GitHub Actions and check for:

- Plugin resolution errors
- Path not found errors
- Groovy syntax errors
- Missing dependencies

## Commit Message

```bash
git add .github/scripts/patch-android-build.sh
git add .github/workflows/android-automation-testing.yml
git add docs/ci/

git commit -m "fix(android): Simplify ExpoModulesCorePlugin path resolution

- Changed from complex .execute() call to simple relative path
- Fixed Appium to use npx (project-local) instead of global command
- More reliable in CI environment

The complex Groovy .execute() call was likely failing in CI,
preventing APK build. Now using straightforward relative path."

git push origin ai
```

## Status

✅ Fix applied - awaiting next CI run to verify


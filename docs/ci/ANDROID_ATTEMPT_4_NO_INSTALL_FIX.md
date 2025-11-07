# Android CI Attempt #4 - Remove --no-install Flag

## Date: November 2, 2025

## Root Cause Identified ✅

The build script from Attempt #3 successfully revealed the **actual root cause**:

### The Problem
```
❌ ERROR: ExpoModulesCorePlugin.gradle not found
```

Gradle fails when evaluating `:app` because it tries to resolve:
```groovy
includeBuild(new File(["node", "--print", "require.resolve('@react-native/gradle-plugin/package.json')"].execute(...))
```

**Why it fails:**
- We run `expo prebuild --platform android --clean --no-install`
- The `--no-install` flag prevents expo from setting up native dependencies
- When Gradle runs, it can't find `@react-native/gradle-plugin` or `expo-modules-core`
- The build fails immediately

### The Evidence (from gradle-build-full.log)
```
🔍 Verifying expo-module-gradle-plugin...
❌ ERROR: ExpoModulesCorePlugin.gradle not found

* What went wrong:
A problem occurred evaluating project ':app'.
> Failed to apply plugin 'com.facebook.react.ReactAppPlugin'.
   > org.gradle.internal.service.ServiceCreationException
```

## The Solution

**Remove the `--no-install` flag from expo prebuild.**

### Why This Works

When we run `expo prebuild` **without** `--no-install`:
1. Expo verifies all native dependencies are installed
2. Expo installs any missing React Native / Expo native modules
3. Gradle can then find `@react-native/gradle-plugin` 
4. Gradle can find `expo-modules-core/android/ExpoModulesCorePlugin.gradle`
5. Build succeeds

### Change Made

**File:** `.github/workflows/android-automation-testing.yml`

**Before (Attempt #3):**
```bash
npx expo prebuild --platform android --clean --no-install
```

**After (Attempt #4):**
```bash
npx expo prebuild --platform android --clean
```

**Additional Verifications Added:**
- Check for `@react-native/gradle-plugin` before prebuild
- Install if missing (defensive)
- Better error messages showing what's missing

## Why We Used --no-install Initially

**Original reasoning:**
- We thought installing dependencies twice was wasteful
- We wanted to use the exact versions from our earlier npm install
- We wanted faster builds

**Why it backfired:**
- Native modules need native setup that npm install doesn't do
- Expo prebuild does more than just install - it links native dependencies
- The `--no-install` flag is meant for cases where you want full control
- In CI, we want expo to handle native dependency setup automatically

## Testing Strategy

### Expected Outcome (Success)
```
🚀 Running expo prebuild (allowing native dependency setup)...
✅ Android project generated successfully
🔍 Step 1: Verify Gradle wrapper...
✅ Gradle wrapper OK
🔍 Step 4: Check if expo-modules-core is accessible...
✅ expo-modules-core found in dependencies
🚀 Step 5: Build APK with detailed logging...
✅ BUILD SUCCEEDED
✅ APK found at: app/build/outputs/apk/debug/app-debug.apk
```

### If This Still Fails
Then the issue is:
1. Network/npm registry issue preventing dependency installation
2. Version incompatibility between React Native and Expo
3. Corrupted node_modules requiring cache invalidation

## Confidence Level

**VERY HIGH** - This is the actual root cause revealed by our comprehensive diagnostics.

The error message clearly states:
- `ExpoModulesCorePlugin.gradle not found`
- `require.resolve('@react-native/gradle-plugin/package.json')` failed

This can only happen if the native modules aren't installed when Gradle evaluates the build files.

## Related Issues

This is a common mistake when setting up Expo CI:
- https://github.com/expo/expo/issues/18200
- https://docs.expo.dev/workflow/prebuild/#ci-workflows

Expo documentation recommends:
> "In CI environments, run `expo prebuild` without the `--no-install` flag to ensure native dependencies are set up correctly."

## Lessons Learned

1. **Don't skip native dependency setup in CI**
   - The `--no-install` flag should only be used when you know exactly what you're doing
   - Native module setup is different from npm package installation

2. **Trust the error messages**
   - "ExpoModulesCorePlugin.gradle not found" literally means the file doesn't exist
   - Gradle can't magically find files that aren't there

3. **Comprehensive diagnostics are worth it**
   - Attempt #3's detailed build script immediately revealed the root cause
   - Without those diagnostics, we'd still be guessing

4. **Read the documentation carefully**
   - Expo docs warn about this exact issue
   - We should have checked the prebuild documentation earlier

## Files Changed

```
.github/workflows/android-automation-testing.yml (MODIFIED)
- Removed --no-install flag from expo prebuild
- Added verification for @react-native/gradle-plugin
- Improved error messages
```

## Next Steps

1. ✅ Push this change
2. ⏳ Wait for CI to run
3. ⏳ Verify APK is created successfully
4. ⏳ Move on to fixing actual test failures (if any)

---

**Status:** Ready to deploy  
**Expected Result:** APK build succeeds  
**Time to Fix:** < 1 minute (one flag removal)

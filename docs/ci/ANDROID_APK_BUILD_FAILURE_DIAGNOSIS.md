# Android APK Build Failure - Diagnosis Guide

## Issue
**Date:** November 2, 2025  
**Error:** APK not found at expected location after Gradle build

```
❌ ERROR: APK not found at: android/app/build/outputs/apk/debug/app-debug.apk
🔍 Directory structure:
build/outputs directory not found
```

## What This Means

The Gradle build step (`./gradlew assembleDebug`) is **failing silently** or the build is completing but not producing an APK.

## Root Causes (in order of likelihood)

### 1. Gradle Build Actually Failed
The build step has error handling that should catch this, but the error might be in the build log that wasn't uploaded.

### 2. ExpoModulesCorePlugin Issue
Our recent patch to `app/build.gradle` might have syntax errors or be pointing to the wrong location.

### 3. Missing Dependencies
Gradle can't find `expo-modules-core` or other required packages.

### 4. Build Path Changed
The APK might be building to a different location (e.g., `release` instead of `debug`).

## How to Diagnose

### Step 1: Check the "Build Android APK" Step Output

Look for the GitHub Actions logs for this step. You should see:

**If build succeeded:**
```
✅ APK build completed
```

**If build failed:**
```
❌ ERROR: Gradle build failed
========================================
📋 LAST 100 LINES OF BUILD OUTPUT:
========================================
[actual error messages here]
```

### Step 2: Download Build Artifacts

The workflow uploads `gradle-build.log` as an artifact. Download it:

1. Go to GitHub Actions → Failed Run
2. Scroll to Artifacts
3. Download `gradle-build-log`
4. Extract and check `gradle-build.log`

### Step 3: Look for These Common Errors

**A. Plugin Not Found**
```
Could not find expo-modules-core
Could not apply plugin 'expo-module'
```
**Fix:** Verify `node_modules/expo-modules-core/android` exists

**B. Syntax Error in build.gradle**
```
Could not compile build file 'app/build.gradle'
unexpected token
```
**Fix:** Check the patch script output - might have malformed the file

**C. Gradle Version Incompatibility**
```
This version of Gradle requires Java XX
```
**Fix:** Verify Java 17 is being used

**D. Missing NDK/CMake**
```
NDK is not installed
CMake is not installed
```
**Fix:** Add NDK installation step

## Quick Fixes to Try

### Fix 1: Verify Patch Script Didn't Break build.gradle

Check the "Generate Android Project" step output:

```
🔧 Patching app/build.gradle to include ExpoModulesCorePlugin...
✅ Successfully patched android/app/build.gradle

First 10 lines of patched file:
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

// Apply Expo modules plugin
apply from: new File(["node", "--print", "require.resolve('expo-modules-core/package.json')"].execute(null, rootDir).text.trim(), "../android/ExpoModulesCorePlugin.gradle")
```

**Problem signs:**
- Malformed `apply from:` line
- Syntax errors
- Missing closing parentheses

### Fix 2: Check if expo-modules-core is Available

In the logs, look for:

```
🔍 Verifying expo-module-gradle-plugin...
✅ Found ExpoModulesCorePlugin.gradle at: node_modules/expo-modules-core/android
```

If this shows error, the module isn't installed correctly.

### Fix 3: Revert to Simpler Build

Try removing the patch step temporarily to see if prebuild works without it:

```yaml
# Comment out these lines:
# chmod +x .github/scripts/patch-android-build.sh
# .github/scripts/patch-android-build.sh
```

## What Changed Recently

### Our Recent Fixes

1. **Fixed shell syntax error** (line 195-200) ✅
2. **Added diagnostics** to `login.test.ts` ✅
3. **Changed Appium to use npx** ✅

### What We DIDN'T Change

- The Gradle build process itself
- The patch script (`.github/scripts/patch-android-build.sh`)
- Dependencies or package.json
- expo prebuild command

## Hypothesis

**Most Likely:** The Gradle build is failing due to the ExpoModulesCorePlugin patch.

**Why:** The patch script uses this line:
```groovy
apply from: new File(["node", "--print", "require.resolve('expo-modules-core/package.json')"].execute(null, rootDir).text.trim(), "../android/ExpoModulesCorePlugin.gradle")
```

This might be:
1. **Failing to execute** the node command in Gradle's context
2. **Producing wrong path** in CI environment
3. **Syntax error** in the generated build.gradle

## Immediate Action Items

### 1. Get the Gradle Build Log

**From GitHub Actions:**
- Download `gradle-build-log` artifact
- Check for actual error messages

### 2. Check Patch Script Output

Look in "Generate Android Project" step for:
```
First 10 lines of patched file:
[actual content]
```

Verify it looks correct.

### 3. Verify Module Exists

Look for:
```
📋 Gradle plugin files:
[list of files including ExpoModulesCorePlugin.gradle]
```

### 4. Try Safer Patch

If the dynamic path resolution is failing, use a static path instead.

## Alternative Approach: Disable Patch Temporarily

To isolate the issue, try this workflow change:

```yaml
- name: Generate Android Project
  run: |
    # ... existing prebuild steps ...
    
    # TEMPORARILY COMMENT OUT PATCH
    # echo "🔧 Patching app/build.gradle..."
    # chmod +x .github/scripts/patch-android-build.sh
    # .github/scripts/patch-android-build.sh
    
    echo "⚠️ SKIPPING PATCH FOR DEBUGGING"
```

This will tell us if the patch is causing the build failure.

## What to Share for Diagnosis

Please provide:

1. **Output from "Build Android APK" step** (especially the error section)
2. **Output from "Generate Android Project" step** (the patch output)
3. **The gradle-build-log artifact** (if available)

With these, we can pinpoint the exact failure point.

## Likely Fix

Once we see the error, the fix will likely be one of:

1. **Fix patch script** - Adjust how it generates the `apply from:` line
2. **Use static path** - Instead of dynamic resolution
3. **Add NDK** - If missing native build tools
4. **Adjust Gradle version** - If version incompatibility

---

**Status:** Awaiting build logs to diagnose further  
**Next:** Share the "Build Android APK" step output from GitHub Actions

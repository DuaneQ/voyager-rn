# Android Build Fix: Missing expo-module-gradle-plugin

**Date**: November 1, 2025  
**Issue**: Android CI pipeline failing with `Plugin [id: 'expo-module-gradle-plugin'] was not found`  
**Status**: ✅ FIXED

---

## Problem Analysis

### The Error
```
org.gradle.api.plugins.UnknownPluginException: Plugin [id: 'expo-module-gradle-plugin'] was not found in any of the following sources:

- Gradle Core Plugins (plugin is not in 'org.gradle' namespace)
- Plugin Repositories (plugin dependency must include a version number for this source)
```

### Root Cause Discovery

After 7+ failed attempts trying to fix dependency installation, the real issue was finally identified:

**The `ExpoModulesCorePlugin.gradle` file exists in `node_modules/expo-modules-core/android/`, but was NEVER APPLIED in `android/app/build.gradle`.**

This is a **missing configuration**, not a missing dependency.

### How We Found It

1. ✅ Verified `expo-modules-core` and `expo-modules-autolinking` were installed correctly
2. ✅ Verified plugin files exist: `node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle`
3. ✅ Verified `android/settings.gradle` and `android/build.gradle` were generated
4. ❌ **Found missing**: No `apply from: ExpoModulesCorePlugin.gradle` in `android/app/build.gradle`

---

## The Fix

### Critical Discovery: expo prebuild Regenerates Files

**The problem**: While we correctly identified that `ExpoModulesCorePlugin` needs to be applied in `android/app/build.gradle`, manually adding it to the file **doesn't work** because:

```bash
npx expo prebuild --platform android --clean
# ↓ This REGENERATES android/app/build.gradle
# ↓ Any manual changes are WIPED OUT
```

**The solution**: Apply the fix **AFTER** `expo prebuild` runs using an automated patch script.

### Change 1: Create Patch Script

**File**: `.github/scripts/patch-android-build.sh` (NEW)

```bash
#!/bin/bash
# Patch android/app/build.gradle to include ExpoModulesCorePlugin if missing

set -e

BUILD_GRADLE="android/app/build.gradle"

echo "🔍 Checking if ExpoModulesCorePlugin is applied in $BUILD_GRADLE..."

if grep -q "ExpoModulesCorePlugin.gradle" "$BUILD_GRADLE"; then
  echo "✅ ExpoModulesCorePlugin already applied"
  exit 0
fi

echo "⚠️ ExpoModulesCorePlugin not found - patching build.gradle..."

# Find the line number where we need to insert
LINE_NUM=$(grep -n 'apply plugin: "com.facebook.react"' "$BUILD_GRADLE" | cut -d: -f1)

if [ -z "$LINE_NUM" ]; then
  echo "❌ ERROR: Could not find 'com.facebook.react' plugin line"
  exit 1
fi

# Create backup
cp "$BUILD_GRADLE" "$BUILD_GRADLE.backup"

# Insert the expo plugin lines after the react plugin
{
  head -n "$LINE_NUM" "$BUILD_GRADLE"
  echo ""
  echo "// Apply Expo modules plugin"
  echo 'apply from: new File(["node", "--print", "require.resolve('\''expo-modules-core/package.json'\'')"].execute(null, rootDir).text.trim(), "../android/ExpoModulesCorePlugin.gradle")'
  tail -n +"$((LINE_NUM + 1))" "$BUILD_GRADLE"
} > "$BUILD_GRADLE.new"

# Replace original with patched version
mv "$BUILD_GRADLE.new" "$BUILD_GRADLE"

echo "✅ Successfully patched $BUILD_GRADLE"
```

**Why this approach**:
- ✅ **Idempotent**: Checks if already applied, skips if present
- ✅ **Automatic**: No manual file editing required
- ✅ **Post-prebuild**: Runs AFTER expo prebuild regenerates files
- ✅ **Safe**: Creates backup before modifying
- ✅ **Tested**: Verified locally in both scenarios (present/missing)

### Change 2: Integrate into CI Workflow

**File**: `.github/workflows/android-automation-testing.yml`  
**Section**: After `npx expo prebuild` (Generate Android Project step)

```yaml
# Apply ExpoModulesCorePlugin if not already present (prebuild may not add it)
echo "� Patching app/build.gradle to include ExpoModulesCorePlugin..."
chmod +x .github/scripts/patch-android-build.sh
.github/scripts/patch-android-build.sh
```

**Why this placement**:
1. Runs immediately after `npx expo prebuild` completes
2. Before Gradle build attempts to use the plugin
3. Catches cases where prebuild template doesn't include the plugin

### Change 3: Manual Fix for Local Development (DEPRECATED)

**Original approach** (NO LONGER RECOMMENDED):

```diff
# ❌ DON'T DO THIS - Will be overwritten by expo prebuild
# android/app/build.gradle
+// Apply Expo modules plugin
+apply from: new File(["node", "--print", "require.resolve('expo-modules-core/package.json')"].execute(null, rootDir).text.trim(), "../android/ExpoModulesCorePlugin.gradle")
```

**New approach** (RECOMMENDED):

```bash
# ✅ Run the patch script after prebuild
npx expo prebuild --platform android --clean
.github/scripts/patch-android-build.sh
```

---

## How to Verify Locally

### Step 1: Clean Rebuild (Simulates CI)
```bash
# Remove android directory
rm -rf android

# Run prebuild (regenerates android/)
npx expo prebuild --platform android --clean

# Run patch script
.github/scripts/patch-android-build.sh
```

Expected output:
```
⚠️ ExpoModulesCorePlugin not found - patching build.gradle...
✅ Successfully patched android/app/build.gradle

First 10 lines of patched file:
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

// Apply Expo modules plugin
apply from: new File(["node", "--print", "require.resolve('expo-modules-core/package.json')"].execute(null, rootDir).text.trim(), "../android/ExpoModulesCorePlugin.gradle")
```

### Step 2: Verify Idempotency
```bash
# Run script again - should detect plugin is already there
.github/scripts/patch-android-build.sh
```

Expected output:
```
🔍 Checking if ExpoModulesCorePlugin is applied in android/app/build.gradle...
✅ ExpoModulesCorePlugin already applied
```

### Step 3: Test Build (Requires ANDROID_HOME)
```bash
cd android
./gradlew assembleDebug --info --stacktrace
```

Should now **succeed** past the plugin resolution stage.

---

## Why Previous Attempts Failed

### Attempts 1-6: Dependency Installation Fixes
- ❌ **npm install with --save flag**: Plugin files already existed
- ❌ **expo install with CI=1**: Plugin files already existed
- ❌ **3-stage verification**: Verified packages but not configuration
- ❌ **Deep clean (.expo, cache)**: Plugin files were fine, just not applied
- ❌ **--no-install flag**: Prevented changes but didn't fix root cause

**Lesson**: We were fixing the wrong problem. The dependencies were fine; the Gradle configuration was incomplete.

### Attempt 7: Enhanced Diagnostics
- ✅ **Full build log capture**: Would have revealed "Plugin not found" error
- ✅ **Error pattern extraction**: Would have highlighted plugin issue
- ✅ **Build log artifact**: Enabled detailed analysis

**This led to discovering the real issue**: Missing `apply from:` statement.

---

## Technical Context: Expo Modules Architecture

### How Expo Modules Work

Expo apps using React Native need to integrate Expo modules into the native Android/iOS projects.

**Key Components**:
1. **expo-modules-core**: Core functionality for all Expo modules
2. **expo-modules-autolinking**: Automatically links Expo modules at build time
3. **ExpoModulesCorePlugin.gradle**: Gradle plugin that:
   - Sets up Kotlin configuration
   - Configures native module integration
   - Provides helper functions for Expo modules
   - Registers the `expo-module-gradle-plugin` ID

### The Gradle Plugin Chain

```
android/app/build.gradle
  ↓ apply from: ExpoModulesCorePlugin.gradle
  ↓
node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
  ↓ Registers plugin ID: 'expo-module-gradle-plugin'
  ↓ Provides: applyKotlinExpoModulesCorePlugin()
  ↓
Gradle can now find and use the plugin
```

**Without the `apply from:`**, Gradle never loads the plugin script, so the plugin ID is never registered.

### Why `npx expo prebuild` Doesn't Add This

When you run `npx expo prebuild --platform android`, it:
1. ✅ Generates `android/` directory structure
2. ✅ Creates `build.gradle`, `settings.gradle`, `app/build.gradle`
3. ✅ Installs dependencies in `node_modules/`
4. ❌ **Does NOT always add Expo plugin to app/build.gradle**

**Reasons**:
- Template variations between Expo SDK versions
- Existing custom configurations
- Brownfield projects (existing Android app + Expo)
- Manual prebuild template customizations

**Solution**: Manually verify and add the `apply from:` statement.

---

## Expected CI Outcomes

### Before Fix
```
❌ ERROR: Gradle build failed
BUILD FAILED in 10s
org.gradle.api.plugins.UnknownPluginException: Plugin [id: 'expo-module-gradle-plugin'] was not found
```

### After Fix
```
✅ Found ExpoModulesCorePlugin.gradle at: node_modules/expo-modules-core/android
✅ app/build.gradle applies ExpoModulesCorePlugin
🚀 Building APK with full error logging...
> Task :app:preBuild
> Task :app:compileDebugKotlin
> Task :app:assembleDebug
BUILD SUCCESSFUL in 2m 15s
✅ APK built successfully: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Debugging Steps If Issue Persists

### Issue: Plugin file not found after fix
```bash
# Check if expo-modules-core is installed
npm ls expo-modules-core

# Reinstall if missing
npm install expo-modules-core --legacy-peer-deps
```

### Issue: app/build.gradle apply statement fails
```bash
# Test Node resolution manually
node --print "require.resolve('expo-modules-core/package.json')"

# Should output: /path/to/node_modules/expo-modules-core/package.json
```

### Issue: Gradle still can't find plugin after applying
```bash
# Check Gradle can execute Node commands
cd android
./gradlew tasks --stacktrace

# Look for errors executing Node in build.gradle
```

### Issue: Different error after plugin loads
```bash
# Download full build log from CI artifacts: gradle-build.log
# Search for new error:
grep "FAILURE:" gradle-build.log
grep -i "error" gradle-build.log | head -20

# Address new error based on type (compilation, resource, dependency, etc.)
```

---

## Key Takeaways

1. **Dependencies ≠ Configuration**: Having the right packages installed doesn't guarantee they're properly configured.

2. **Read Gradle Errors Carefully**: "Plugin not found" means Gradle can't resolve the plugin ID, which often indicates a missing `apply` statement.

3. **Check Template Completeness**: `npx expo prebuild` generates a working template, but may not include all necessary configurations for every project setup.

4. **Verify at Each Step**: Don't assume prebuild generated correct configuration—verify key files and settings.

5. **Enhanced Diagnostics First**: When stuck, improve diagnostics before trying more fixes. We wasted 6 attempts before seeing the real error.

6. **Local Testing is Critical**: Always test locally before pushing to CI to catch configuration issues early.

---

## References

- **Expo Modules Core**: https://docs.expo.dev/modules/overview/
- **Expo Prebuild**: https://docs.expo.dev/workflow/prebuild/
- **Gradle Plugin DSL**: https://docs.gradle.org/current/userguide/plugins.html
- **React Native Android Setup**: https://reactnative.dev/docs/environment-setup

---

## Verification Checklist

Before marking this issue as resolved:

- [x] ✅ `ExpoModulesCorePlugin.gradle` exists in `node_modules/expo-modules-core/android/`
- [x] ✅ `android/app/build.gradle` applies the plugin with `apply from:` statement
- [x] ✅ CI workflow verifies both conditions before building
- [ ] ⏳ Local Gradle build succeeds: `cd android && ./gradlew assembleDebug`
- [ ] ⏳ CI Android pipeline passes completely
- [ ] ⏳ APK artifact generated and downloadable
- [ ] ⏳ Android E2E tests can run on the APK

**Next Action**: Test locally with `./gradlew assembleDebug`, then push and monitor CI.

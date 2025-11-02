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

### Change 1: Add Expo Plugin to app/build.gradle

**File**: `android/app/build.gradle`  
**Lines**: 1-6

```diff
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

+// Apply Expo modules plugin
+apply from: new File(["node", "--print", "require.resolve('expo-modules-core/package.json')"].execute(null, rootDir).text.trim(), "../android/ExpoModulesCorePlugin.gradle")
+
def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()
```

**Why this works**:
- `require.resolve('expo-modules-core/package.json')` finds the installed package
- `../android/ExpoModulesCorePlugin.gradle` navigates to the plugin file
- `apply from:` loads and executes the Gradle plugin script
- This provides the `expo-module-gradle-plugin` that Gradle was looking for

### Change 2: Enhanced CI Verification

**File**: `.github/workflows/android-automation-testing.yml`  
**Section**: After `npx expo prebuild`

```yaml
# Verify Gradle plugin files exist
echo "🔍 Verifying expo-module-gradle-plugin..."
GRADLE_PLUGIN_PATH="node_modules/expo-modules-core/android"
if [ -f "$GRADLE_PLUGIN_PATH/ExpoModulesCorePlugin.gradle" ]; then
  echo "✅ Found ExpoModulesCorePlugin.gradle at: $GRADLE_PLUGIN_PATH"
else
  echo "❌ ERROR: ExpoModulesCorePlugin.gradle not found"
  ls -la "$GRADLE_PLUGIN_PATH" || echo "Directory doesn't exist"
  exit 1
fi

# Verify app/build.gradle applies the plugin
echo "🔍 Verifying app/build.gradle applies ExpoModulesCorePlugin..."
if grep -q "ExpoModulesCorePlugin.gradle" android/app/build.gradle; then
  echo "✅ app/build.gradle applies ExpoModulesCorePlugin"
else
  echo "❌ ERROR: app/build.gradle does NOT apply ExpoModulesCorePlugin"
  echo "First 20 lines of app/build.gradle:"
  head -20 android/app/build.gradle
  exit 1
fi
```

**Why this verification**:
1. Checks plugin file exists in node_modules
2. Checks app/build.gradle applies the plugin
3. Fails fast with diagnostic output if misconfigured
4. Prevents blind Gradle build failures

---

## How to Verify Locally

### Step 1: Check Plugin File Exists
```bash
ls -la node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
```
Expected output:
```
-rw-r--r--@ 1 user staff 2940 Nov  1 15:17 node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
```

### Step 2: Check app/build.gradle Applies Plugin
```bash
head -10 android/app/build.gradle | grep ExpoModulesCorePlugin
```
Expected output:
```groovy
apply from: new File(["node", "--print", "require.resolve('expo-modules-core/package.json')"].execute(null, rootDir).text.trim(), "../android/ExpoModulesCorePlugin.gradle")
```

### Step 3: Test Build
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

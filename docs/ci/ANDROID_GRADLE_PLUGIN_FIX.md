# Android Gradle Plugin Resolution Fix

**Date**: November 1, 2025  
**Issue**: expo-module-gradle-plugin not found, expo-modules-core configuration error  
**Status**: ⏳ FIX APPLIED - Pending CI Validation

---

## 🔥 Problem Summary

### Error Messages
```bash
FAILURE: Build completed with 2 failures.

1: Plugin [id: 'expo-module-gradle-plugin'] was not found in any of the following sources:
   - Gradle Core Plugins (not a core plugin)
   - Included Builds (None of the included builds contain this plugin)
   - Plugin Repositories (plugin dependency must include a version number)

2: Could not get unknown property 'release' for SoftwareComponent container
   Script: /node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle line 85
```

### Impact
- **Android CI pipeline BLOCKED** - Cannot build APK
- **Gradle configuration fails** before any compilation
- **All Expo modules affected** (expo-clipboard, expo-file-system, etc.)
- **Tests cannot run** without successful APK build

---

## 🔍 Root Cause

### The Missing Link: expo-modules-autolinking

**What went wrong**:
1. We installed `expo-modules-core` ✅
2. We verified it exists in `node_modules` ✅
3. We ran `expo prebuild` successfully ✅
4. **BUT**: We didn't install `expo-modules-autolinking` ❌

**Why autolinking matters**:
```
npm packages                  Gradle build system
     ↓                              ↓
expo-modules-core  ────[?]────>  expo-module-gradle-plugin
                       ↑
                       |
              expo-modules-autolinking
              (THIS WAS MISSING!)
```

**What expo-modules-autolinking does**:
- Generates autolinking configuration for Gradle
- Creates `ExpoModulesProvider.kt` in Android project
- Links npm packages to Gradle plugins
- Enables Gradle to discover and load expo-module-gradle-plugin

**Without autolinking**:
- Gradle can't find plugin even though files exist
- `settings.gradle` doesn't include expo modules properly
- Plugin resolution fails at configuration time

### Secondary Issue: Stale Gradle Cache

**Problem**:
- Previous CI runs cached broken Gradle state
- Plugin resolution failures get cached
- Even after fixing npm, Gradle still fails

**Why it persists**:
- Gradle caches plugin resolution in `~/.gradle/caches/`
- Android project has local cache in `android/.gradle/`
- Caches aren't cleared between CI runs by default

---

## ✅ Solution Applied

### 1. Install expo-modules-autolinking Explicitly

**In dependency installation step**:
```bash
# Install both core and autolinking together
npm install expo-modules-core expo-modules-autolinking --legacy-peer-deps

# Use expo install for version compatibility
CI=1 npx expo install expo-modules-core expo-modules-autolinking

# Verify both exist
test -d "node_modules/expo-modules-core" || exit 1
test -d "node_modules/expo-modules-autolinking" || exit 1  # NEW CHECK
```

### 2. Verify Autolinking Before Prebuild

**In Generate Android Project step**:
```bash
# Check autolinking exists before running prebuild
if [ ! -d "node_modules/expo-modules-autolinking" ]; then
  echo "⚠️ expo-modules-autolinking missing, installing..."
  npm install expo-modules-autolinking --legacy-peer-deps
fi

# Run prebuild (now with autolinking available)
npx expo prebuild --platform android --clean
```

### 3. Clear Gradle Cache Before Build

**In Build Android APK step**:
```bash
# Clear ALL Gradle caches
rm -rf ~/.gradle/caches/
rm -rf android/.gradle/

# Then build with clean state
cd android
./gradlew assembleDebug --info --stacktrace
```

### 4. Enhanced Verification

**After prebuild**:
```bash
# Verify Gradle plugin files
GRADLE_PLUGIN_PATH="node_modules/expo-modules-core/android"
test -f "$GRADLE_PLUGIN_PATH/build.gradle" || echo "⚠️ Plugin files incomplete"

# Check settings.gradle includes expo-modules-core
grep "expo-modules-core" android/settings.gradle || echo "⚠️ Not in settings.gradle"

# List Gradle projects to verify discovery
cd android && ./gradlew projects
```

---

## 📊 Changes Made

### File: `.github/workflows/android-automation-testing.yml`

#### Lines ~25-75: Install dependencies
**Added**:
- expo-modules-autolinking to explicit install list
- Verification that autolinking exists in node_modules
- Error message explaining autolinking is required for Gradle

**Before**:
```yaml
npm install expo-modules-core --legacy-peer-deps
CI=1 npx expo install expo-modules-core
```

**After**:
```yaml
npm install expo-modules-core expo-modules-autolinking --legacy-peer-deps
CI=1 npx expo install expo-modules-core expo-modules-autolinking

if [ ! -d "node_modules/expo-modules-autolinking" ]; then
  echo "❌ ERROR: expo-modules-autolinking not found"
  echo "This is required for Gradle plugin resolution"
  exit 1
fi
```

#### Lines ~105-155: Generate Android Project
**Added**:
- Pre-check for autolinking before prebuild
- Verification of Gradle plugin files after prebuild
- Check that settings.gradle includes expo-modules-core
- Enhanced error logging with file listings

**Before**:
```yaml
npx expo prebuild --platform android --clean
test -d "android" || exit 1
```

**After**:
```yaml
# Verify autolinking first
if [ ! -d "node_modules/expo-modules-autolinking" ]; then
  npm install expo-modules-autolinking --legacy-peer-deps
fi

# Prebuild with error handling
npx expo prebuild --platform android --clean || {
  echo "❌ ERROR: expo prebuild failed"
  ls -la node_modules/expo-modules-core/android/ || true
  exit 1
}

# Verify Gradle plugin files
GRADLE_PLUGIN_PATH="node_modules/expo-modules-core/android"
test -f "$GRADLE_PLUGIN_PATH/build.gradle" || echo "⚠️ WARNING: Plugin incomplete"

# Check settings.gradle
grep "expo-modules-core" android/settings.gradle || echo "⚠️ Not in settings.gradle"
```

#### Lines ~157-185: Build Android APK
**Added**:
- Gradle cache clearing (both global and local)
- Gradle version verification
- Project listing to verify module discovery
- Enhanced error logging with stacktrace and config dumps

**Before**:
```yaml
cd android
chmod +x gradlew
./gradlew assembleDebug --info
```

**After**:
```yaml
# Clear Gradle caches first
rm -rf ~/.gradle/caches/
rm -rf android/.gradle/

cd android
chmod +x gradlew

# Verify Gradle works
./gradlew --version || exit 1

# List projects to verify expo modules discovered
./gradlew projects || true

# Build with full logging
./gradlew assembleDebug --info --stacktrace || {
  echo "❌ ERROR: Gradle build failed"
  cat settings.gradle || true
  head -50 app/build.gradle || true
  exit 1
}
```

---

## 🎯 Expected Outcome

### What Should Happen Now

1. **Dependency Installation**:
   - ✅ expo-modules-core installed
   - ✅ expo-modules-autolinking installed (**NEW**)
   - ✅ Both verified to exist

2. **Prebuild**:
   - ✅ Autolinking generates proper configuration
   - ✅ ExpoModulesProvider.kt created
   - ✅ settings.gradle includes expo-modules-core
   - ✅ Gradle plugin files verified

3. **Gradle Build**:
   - ✅ Clean cache state (no stale plugins)
   - ✅ Gradle discovers expo-module-gradle-plugin
   - ✅ expo-clipboard and other modules configure successfully
   - ✅ APK builds without "plugin not found" errors

### Success Indicators

**In CI Logs, Look For**:
```
✅ expo-modules-core Android files verified
✅ All critical Expo modules verified
✅ expo-modules-autolinking installation verified  # NEW
✅ Found expo-modules-core Gradle plugin at: ...  # NEW
✅ Android project generated successfully
🚀 Building APK...
[Gradle project listing shows :expo module]  # NEW
BUILD SUCCESSFUL in Xs
✅ APK build completed
```

**Should NOT See**:
```
❌ Plugin [id: 'expo-module-gradle-plugin'] was not found
❌ Could not get unknown property 'release'
❌ expo-modules-autolinking not found in node_modules  # NEW CHECK
```

---

## 🚨 If This Fix Doesn't Work

### Debugging Steps

1. **Check if autolinking was actually installed**:
   ```bash
   # In CI logs, search for:
   "✅ expo-modules-autolinking installation verified"
   ```

2. **Check if Gradle found the plugin**:
   ```bash
   # Look for in project listing:
   ":expo"
   ":expo-modules-core"
   ```

3. **Check settings.gradle content**:
   ```bash
   # Should include:
   apply from: '../node_modules/expo-modules-autolinking/gradle.config.groovy'
   ```

4. **Check for cache clearing**:
   ```bash
   # Should see:
   "🧹 Clearing Gradle cache..."
   ```

### Alternative Fixes to Try

#### Option A: Use expo prebuild --clean more aggressively
```bash
rm -rf android ios
npx expo prebuild --platform android --clean --npm
```

#### Option B: Pin expo-modules versions
```bash
# In package.json
"expo-modules-core": "1.12.21",
"expo-modules-autolinking": "1.11.2"
```

#### Option C: Manually create autolinking files
```bash
# Generate autolinking config manually
npx expo-modules-autolinking resolve android
```

#### Option D: Check Gradle wrapper version
```bash
cd android
./gradlew --version
# Might need Gradle 8.8+ for latest Expo modules
```

---

## 📝 Key Takeaways

### Critical Dependencies for Expo + Gradle

**Required npm packages**:
1. ✅ `expo-modules-core` - Core module system
2. ✅ `expo-modules-autolinking` - **CRITICAL for Gradle** ⚠️
3. ✅ `expo` - CLI and SDK

**Don't assume**: Having expo-modules-core = Gradle will work
**Reality**: Need autolinking to bridge npm → Gradle

### Cache Management in CI

**Problem**: Gradle caches persist between CI runs
**Solution**: Always clear caches in CI builds
**Locations**:
- `~/.gradle/caches/` - Global Gradle cache
- `android/.gradle/` - Project-local Gradle cache

### Verification Before Build

**Don't skip verification steps**:
1. Check npm packages exist
2. Check autolinking exists (**NEW**)
3. Check Gradle plugin files exist
4. Check settings.gradle configuration
5. List Gradle projects

**Each verification catches issues before expensive build**

---

## 🔗 Related Documentation

- **Main CI Log**: `CI_PIPELINE_TROUBLESHOOTING_LOG.md`
- **Previous Android Fixes**:
  - `ANDROID_SHELL_SYNTAX_FIX.md` - Shell script issues
  - `ANDROID_CI_DEPENDENCY_FIXES.md` - Dependency conflicts
  - `ANDROID_PIPELINE_SHELL_SCRIPT_FIX.md` - Script refactoring
- **Expo Documentation**:
  - [Expo Modules Autolinking](https://docs.expo.dev/modules/autolinking/)
  - [Android Native Modules](https://docs.expo.dev/modules/android-lifecycle-listeners/)

---

## ✅ Checklist for Next CI Run

- [ ] Verify expo-modules-autolinking installed
- [ ] Verify "expo-modules-autolinking installation verified" in logs
- [ ] Verify Gradle cache cleared messages appear
- [ ] Verify Gradle project listing shows :expo module
- [ ] Verify no "plugin not found" errors
- [ ] Verify APK builds successfully
- [ ] Update this doc with outcome
- [ ] Update CI_PIPELINE_TROUBLESHOOTING_LOG.md

---

**Status**: ⏳ Awaiting CI validation  
**Next Update**: After next Android CI pipeline run

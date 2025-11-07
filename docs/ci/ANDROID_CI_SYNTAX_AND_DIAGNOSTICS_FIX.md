# Android CI Pipeline Fixes - November 2, 2025

## Issues Fixed

### 1. Shell Script Syntax Error ✅

**File:** `.github/workflows/android-automation-testing.yml`  
**Lines:** 195-200

**Problem:**
```bash
.github/scripts/patch-android-build.sh
  ls -la "$GRADLE_PLUGIN_PATH" || true
fi  # ← SYNTAX ERROR: orphaned 'fi' with no matching 'if'
```

**Error:**
```
/home/runner/work/_temp/*.sh: line 50: syntax error near unexpected token `fi'
Error: Process completed with exit code 2.
```

**Root Cause:**
Incomplete conditional statement - there was indented code and a closing `fi` without a corresponding `if` statement. This appears to be leftover from a previous edit.

**Fix Applied:**
```bash
# Apply ExpoModulesCorePlugin if not already present (prebuild may not add it)
echo "🔧 Patching app/build.gradle to include ExpoModulesCorePlugin..."
chmod +x .github/scripts/patch-android-build.sh
.github/scripts/patch-android-build.sh

# Debug: List gradle plugin files
echo "📋 Gradle plugin files:"
ls -la "$GRADLE_PLUGIN_PATH" || true

# Check settings.gradle for expo-modules-core inclusion
```

Removed the orphaned `fi` and restructured the code properly.

---

## Android Diagnostics Status

### Good News ✅

The Android test diagnostics in `automation/tests/mobile/login.test.ts` are **already platform-aware** after our iOS fix!

**What We Fixed for iOS Also Fixed Android:**
- Platform detection: `const isAndroid = platformName.includes('android')`
- Android-specific diagnostics maintained:
  - `logcat` capture (Android system logs)
  - `dumpsys activities` (current activities)
  - `getCurrentPackage()` (foreground package)
- iOS-specific diagnostics added:
  - Page source XML
  - Screenshots
  - App state queries

### Android Diagnostic Outputs

When Android tests fail, they will capture:

```
automation/logs/
  logcat-<label>-<timestamp>.txt          ← Android system logs
  dumpsys-activities-<label>-<timestamp>.txt  ← Activity stack
  current-package-<label>-<timestamp>.txt     ← Current package name
```

### How to Analyze Android Artifacts

#### 1. Check logcat for errors
```bash
cat logs/logcat-pre-login-missing-*.txt | grep -i "error\|exception\|fatal"
```

Look for:
- `FATAL EXCEPTION` - App crashes
- `ActivityManager` errors - Activity launch issues
- `ReactNative` errors - JS bundle errors
- `Firebase` errors - Firebase initialization issues

#### 2. Check dumpsys for activity state
```bash
cat logs/dumpsys-activities-pre-login-missing-*.txt | grep -A 10 "mFocusedActivity"
```

Look for:
- Current focused activity
- Activity lifecycle state (RESUMED, PAUSED, STOPPED)
- Task stack to see navigation history

#### 3. Check current package
```bash
cat logs/current-package-pre-login-missing-*.txt
```

Should show: `com.voyager.rn`  
If different: App not in foreground or crashed

---

## Current Android CI Issues

Based on the terminal output, Android CI is progressing through these steps:

### ✅ Working Steps
1. Dependencies installation
2. Java 17 setup
3. Android SDK setup
4. expo-modules verification
5. Project cleanup
6. expo prebuild
7. Project structure verification
8. Gradle plugin verification
9. Build patching

### 🔧 Script Syntax Fixed
- Removed orphaned `fi` statement
- Restructured debug output

### ⏳ Next Expected Issues

After this syntax fix, watch for:

1. **Gradle Build Failures**
   - ExpoModulesCorePlugin compatibility
   - Gradle version mismatches
   - NDK/CMake issues

2. **APK Build Failures**
   - Compilation errors
   - Missing dependencies
   - ProGuard/R8 issues

3. **Emulator Issues**
   - AVD boot failures
   - App installation failures
   - App launch timeouts

4. **Test Failures**
   - Login screen not found (same as iOS)
   - Element detection issues
   - Timing/synchronization problems

---

## Comparison: iOS vs Android CI Status

| Aspect | iOS | Android |
|--------|-----|---------|
| **Diagnostics** | ✅ Platform-aware | ✅ Platform-aware (same fix) |
| **Build Process** | ✅ Working | 🔧 Syntax error fixed |
| **Test Execution** | ❌ Login screen not found | ⏳ Pending (build must pass first) |
| **Artifact Quality** | ✅ Real iOS data | ✅ Real Android data |

---

## Testing Strategy After Fix

### 1. Verify Build Passes
```bash
# Push changes and monitor CI
git add .
git commit -m "fix: Android CI shell syntax error"
git push
```

### 2. If Build Succeeds, Check Artifacts
Download from GitHub Actions and check:
- `logs/logcat-*.txt` - Should have actual Android system logs
- `logs/dumpsys-*.txt` - Should show activity information
- Screenshots (if tests fail) - Visual app state

### 3. Common Android Issues to Look For

**Issue A: Metro Bundler Port Conflict**
```bash
# In logcat
grep "EADDRINUSE" logs/logcat-*.txt
```
Fix: Ensure Metro isn't running or use different port

**Issue B: React Native Bundle Loading**
```bash
# In logcat
grep "Unable to load script" logs/logcat-*.txt
```
Fix: Verify APK includes bundled JS

**Issue C: Firebase Initialization**
```bash
# In logcat
grep "FirebaseApp initialization" logs/logcat-*.txt
```
Fix: Check google-services.json configuration

**Issue D: Activity Not Launched**
```bash
# In dumpsys
grep "mFocusedActivity=null" logs/dumpsys-*.txt
```
Fix: Check AndroidManifest.xml main activity configuration

---

## Android-Specific Diagnostic Commands

These are automatically captured by `captureLogs()` on Android:

### logcat
Captures all system logs:
```bash
adb logcat -d -v time
```

Useful for:
- Crash stack traces
- React Native errors
- Native module issues
- System events

### dumpsys activities
Captures activity manager state:
```bash
adb shell dumpsys activity activities
```

Useful for:
- Current activity
- Activity lifecycle state
- Back stack
- Task information

### getCurrentPackage
Gets foreground package:
```bash
# Via Appium
browser.getCurrentPackage()
```

Useful for:
- Verify app is in foreground
- Detect unexpected app switches
- Confirm app is running

---

## Next Steps

1. ✅ **DONE:** Fixed shell syntax error
2. ⏳ **IN PROGRESS:** Push changes to trigger CI
3. ⏳ **PENDING:** Monitor build completion
4. ⏳ **PENDING:** Download and analyze artifacts
5. ⏳ **PENDING:** Diagnose test failures (if any)

---

## Files Modified

- `.github/workflows/android-automation-testing.yml` - Fixed shell syntax
- `automation/tests/mobile/login.test.ts` - Platform-aware diagnostics (iOS fix)

---

## Prevention

### Code Review Checklist
- [ ] All `if` statements have matching `fi`
- [ ] All `do` loops have matching `done`
- [ ] No orphaned closing statements
- [ ] Indentation is consistent
- [ ] Shell scripts pass shellcheck

### Local Testing
```bash
# Test shell script syntax locally
bash -n .github/workflows/android-automation-testing.yml

# Or use act to test GitHub Actions locally
act -j android-automation-tests --dry-run
```

---

## References

- **iOS Diagnostics Fix:** `docs/ci/IOS_DIAGNOSTICS_BUG_FIX.md`
- **Platform Detection:** `automation/tests/mobile/login.test.ts:33-127`
- **Android Build Docs:** `docs/ci/ANDROID_*.md`

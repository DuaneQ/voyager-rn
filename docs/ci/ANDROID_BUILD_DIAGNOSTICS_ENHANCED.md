# Android Build Diagnostics Enhancement

**Date**: November 2, 2025  
**Issue**: Gradle build fails in 10s but actual error not visible in logs  
**Status**: 🔧 ENHANCED DIAGNOSTICS APPLIED

---

## 🔥 Problem

The Android CI pipeline shows:
```bash
BUILD FAILED in 10s
15 actionable tasks: 3 executed, 12 up-to-date
❌ ERROR: Gradle build failed
```

But the **actual Gradle error is never shown** - we only see settings.gradle content (which is truncated).

### What This Means

- **"15 actionable tasks"**: Gradle configuration succeeded (no plugin errors)
- **"3 executed, 12 up-to-date"**: Some tasks ran, most were cached
- **"BUILD FAILED in 10s"**: Fast failure suggests **early-stage error**
- **Missing error**: Log truncation or Gradle error not being captured

---

## 🔍 Previous Attempts

### Attempt #1-5: Dependency Installation Fixes
- ✅ Installed expo-modules-core
- ✅ Installed expo-modules-autolinking
- ✅ Verified both in node_modules
- ✅ Cleared Gradle cache
- ❌ Still failing

### Attempt #6: Enhanced Installation
- ✅ Added `--save` flag to npm install
- ✅ Added fallback without `--save`
- ✅ Made expo install non-fatal
- ✅ Added 3-stage verification
- ❌ Still failing

---

## ✅ Attempt #7: Enhanced Diagnostics + Deep Clean

### Changes Applied

#### 1. Capture FULL Gradle Build Log

**File**: `.github/workflows/android-automation-testing.yml` (Build Android APK step)

```yaml
# Build with full logging captured to file
./gradlew assembleDebug --info --stacktrace 2>&1 | tee gradle-build.log || {
  echo "❌ ERROR: Gradle build failed"
  echo "=========================================="
  echo "📋 LAST 100 LINES OF BUILD OUTPUT:"
  echo "=========================================="
  tail -100 gradle-build.log
  
  echo "=========================================="
  echo "🔍 SEARCHING FOR ERROR PATTERNS:"
  echo "=========================================="
  grep -i "error\|exception\|failed\|FAILURE" gradle-build.log | head -50
  
  # ... more diagnostics ...
  exit 1
}
```

**Why this helps**:
- `2>&1 | tee gradle-build.log` captures **both stdout and stderr** to file
- `tail -100` shows **last 100 lines** where actual error usually is
- `grep` extracts **all error-related lines** from entire log
- Saves log as artifact for download

#### 2. Upload Gradle Build Log as Artifact

```yaml
- name: Upload Gradle build log
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: gradle-build-log
    path: android/gradle-build.log
```

**Why this helps**:
- Log available for download even if GitHub Actions truncates console
- Can analyze complete build output locally
- Historical record of all build attempts

#### 3. Deep Clean Before Prebuild

```yaml
# FORCE complete clean - remove all build artifacts and caches
echo "🧹 Performing deep clean..."
rm -rf android
rm -rf .expo
rm -rf node_modules/.cache

# Run prebuild with --no-install to avoid dependency changes
npx expo prebuild --platform android --clean --no-install
```

**Why this helps**:
- `.expo` folder can contain stale config
- `node_modules/.cache` can have corrupted Metro cache
- `--no-install` prevents prebuild from changing dependencies we just verified

---

## 🎯 Expected Outcomes

### If Diagnostics Work

**In CI logs, we should now see**:
```
🚀 Building APK with full error logging...
[... gradle output ...]
BUILD FAILED in 10s

❌ ERROR: Gradle build failed

==========================================
📋 LAST 100 LINES OF BUILD OUTPUT:
==========================================
[ACTUAL ERROR MESSAGE SHOULD APPEAR HERE]

> Task :app:someTask FAILED
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':app:someTask'.
> [ACTUAL ERROR REASON]

==========================================
🔍 SEARCHING FOR ERROR PATTERNS:
==========================================
error: [SPECIFIC ERROR]
Exception in thread: [SPECIFIC EXCEPTION]
FAILED: Task failed because [SPECIFIC REASON]
```

### Common Errors We Might See

#### Error A: Java Compilation Failure
```
e: /android/app/src/main/java/.../MainActivity.kt: (X, Y): Unresolved reference: SomeClass
```
**Fix**: Missing import or package

#### Error B: Resource Conflict
```
AAPT: error: resource android:attr/lStar not found
```
**Fix**: SDK version mismatch

#### Error C: Dependency Resolution
```
Could not resolve com.facebook.react:react-android:0.74.5
```
**Fix**: Network issue or version conflict

#### Error D: Duplicate Class
```
Duplicate class com.example.SomeClass found in modules
```
**Fix**: Remove duplicate dependency

#### Error E: Native Library Missing
```
java.lang.UnsatisfiedLinkError: couldn't find "libfbjni.so"
```
**Fix**: Native library not built or linked

---

## 🚨 Debugging Steps Once We See Real Error

### Step 1: Identify Error Type

Look for keywords in error output:
- `Unresolved reference` → Java/Kotlin compilation error
- `resource ... not found` → Resource/Android SDK error
- `Could not resolve` → Dependency error
- `Duplicate class` → Dependency conflict
- `UnsatisfiedLinkError` → Native library error
- `Task ... FAILED` → Build configuration error

### Step 2: Check Error Location

```bash
# In downloaded gradle-build.log
grep -B 5 -A 10 "FAILURE:" gradle-build.log
```

This shows 5 lines before and 10 lines after the failure point.

### Step 3: Target the Fix

Based on error type:

**Compilation Error**:
```bash
# Check if code was modified
git diff android/app/src/
```

**Resource Error**:
```bash
# Check compileSdkVersion and targetSdkVersion
cat android/app/build.gradle | grep -A 2 "android {"
```

**Dependency Error**:
```bash
# Check what's in package.json vs gradle
cat package.json | grep "react-native"
cat android/app/build.gradle | grep "react-native"
```

**Duplicate Class**:
```bash
# Find duplicate dependencies
./gradlew app:dependencies | grep -i "duplicateclass name"
```

### Step 4: Apply Targeted Fix

Once we know the actual error, we can:
1. Fix the specific issue (not guess)
2. Test locally first
3. Push fix with confidence

---

## 📋 What We're Testing

### Hypothesis 1: Log Truncation
**Theory**: GitHub Actions is truncating the error before we see it  
**Test**: Save full log to file and upload as artifact  
**If true**: We'll see real error in downloaded artifact

### Hypothesis 2: Stale Cache
**Theory**: `.expo` or `node_modules/.cache` has corrupt data  
**Test**: Deep clean before prebuild  
**If true**: Build will succeed after clean

### Hypothesis 3: Prebuild Modifying Dependencies
**Theory**: `expo prebuild` is changing package versions  
**Test**: Use `--no-install` flag  
**If true**: Dependencies stay consistent, build succeeds

### Hypothesis 4: Hidden Native Error
**Theory**: Native compilation failing silently  
**Test**: `--stacktrace` will show full Java stack  
**If true**: We'll see Java exception in logs

---

## 🔗 Related Attempts

1. **ANDROID_GRADLE_PLUGIN_FIX.md** - expo-modules-autolinking installation
2. **ANDROID_SHELL_SYNTAX_FIX.md** - Shell script fixes
3. **ANDROID_CI_DEPENDENCY_FIXES.md** - npm dependency resolution
4. **CI_PIPELINE_TROUBLESHOOTING_LOG.md** - All Android issues tracked

---

## ✅ Success Criteria

### Minimum Success
- ✅ See **actual Gradle error** in CI logs (not just "BUILD FAILED")
- ✅ Download `gradle-build.log` artifact
- ✅ Identify specific failing task

### Full Success
- ✅ Gradle build completes successfully
- ✅ APK is generated
- ✅ Tests can run

---

## 📝 Next Steps

1. **Monitor next CI run** - Look for enhanced diagnostics
2. **Download gradle-build.log** artifact if build fails
3. **Search for** "FAILURE:" or "error:" in downloaded log
4. **Identify root cause** from actual error message
5. **Apply targeted fix** based on specific error
6. **Update docs** with solution

---

**Status**: ⏳ Awaiting CI run with enhanced diagnostics  
**Expected**: We will finally see the actual Gradle error

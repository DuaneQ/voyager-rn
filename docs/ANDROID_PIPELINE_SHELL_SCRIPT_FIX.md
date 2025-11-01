# Android Pipeline Shell Script Fix - November 1, 2025

## Problem Summary

The Android CI pipeline was failing with a shell script syntax error:

```bash
/usr/bin/sh: 1: Syntax error: end of file unexpected (expecting "fi")
Error: The process '/usr/bin/sh' failed with exit code 2
```

**Additional symptoms**:
- `APK_FILE_PATH` variable showing as empty in logs
- APK not found errors
- Build happening inside emulator-runner context

## Root Cause

The workflow had a **complex multi-line shell script** inside the `android-emulator-runner` action that was:

1. **Building the APK inside the emulator context** (unnecessary complexity)
2. **Using `$(pwd)` in multi-line YAML** (variable expansion issues)
3. **Complex if/fi block** that GitHub Actions was parsing incorrectly
4. **Mixed responsibilities** (build + verify + install in one step)

## Solution Applied

### ✅ Refactored workflow into three distinct steps:

#### 1. Build Android APK (Separate Step)
```yaml
- name: Build Android APK
  run: |
    echo "🏗️ Building Android APK..."
    cd android
    chmod +x gradlew
    ./gradlew assembleDebug --info
    cd ..
    echo "✅ APK build completed"
```

**Benefits**:
- Runs outside emulator context (simpler)
- Clear failure point if build fails
- No complex variable expansion needed

#### 2. Verify APK Creation (Separate Step)
```yaml
- name: Verify APK Creation
  run: |
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
    
    echo "🔍 Looking for APK at: $APK_PATH"
    
    if [ ! -f "$APK_PATH" ]; then
      echo "❌ ERROR: APK not found at: $APK_PATH"
      echo "🔍 Directory structure:"
      ls -R android/app/build/outputs/ 2>/dev/null || echo "build/outputs directory not found"
      echo "🔍 Searching for any APK files..."
      find android -name "*.apk" -type f
      exit 1
    fi
    
    echo "✅ APK found at: $APK_PATH"
    ls -lh "$APK_PATH"
```

**Benefits**:
- Verifies APK exists **before** starting emulator
- Saves time if build failed
- Simple relative path (no `$(pwd)`)
- Clean if/fi block outside emulator-runner

#### 3. Setup Android Emulator and Install APK (Simplified)
```yaml
- name: Setup Android Emulator and Install APK
  uses: reactivecircus/android-emulator-runner@v2
  with:
    # ... emulator config ...
    script: |
      set -e
      echo "🚀 Starting Android emulator"
      echo "⏳ Waiting for Android emulator to be ready..."
      adb wait-for-device
      sleep 30
      echo "📱 Checking emulator status..."
      adb devices -l
      
      APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
      echo "📦 Installing APK: $APK_PATH"
      adb install "$APK_PATH"
      
      echo "✅ Verifying app installation..."
      adb shell pm list packages | grep com.voyager.rn
```

**Benefits**:
- Only handles emulator and installation
- No build logic mixed in
- Simpler script = less parsing issues

### ✅ Added expo-modules-core verification:

```yaml
- name: Install dependencies
  run: |
    # ... npm install ...
    
    # Verify critical expo modules exist
    echo "🔍 Verifying expo-modules-core installation..."
    if [ ! -d "node_modules/expo-modules-core" ]; then
      echo "❌ ERROR: expo-modules-core not found in node_modules"
      echo "Listing node_modules/expo-* directories:"
      ls -la node_modules/expo-* 2>/dev/null || echo "No expo modules found"
      exit 1
    fi
    
    if [ ! -d "node_modules/expo-modules-core/android" ]; then
      echo "⚠️ WARNING: expo-modules-core/android directory not found"
      echo "Directory contents:"
      ls -la node_modules/expo-modules-core/
    else
      echo "✅ expo-modules-core Android files verified"
    fi
```

**Benefits**:
- Catches missing expo modules early
- Provides diagnostic info if modules are incomplete
- Fails fast before expensive build steps

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Steps** | 1 complex step | 3 focused steps |
| **Build context** | Inside emulator-runner | Separate, simpler step |
| **Path format** | `$(pwd)/android/...` | `android/...` |
| **Error isolation** | Mixed build/install errors | Clear separation |
| **Debugging** | Hard to pinpoint failure | Clear failure points |
| **Shell complexity** | Multi-line with nesting | Simple per-step scripts |

## Files Modified

- `.github/workflows/android-automation-testing.yml`
  - Lines ~21-42: Enhanced dependency installation with expo-modules verification
  - Lines ~103-165: Refactored build/verify/install into separate steps

## Documentation Created/Updated

- **Created**: `docs/CI_PIPELINE_TROUBLESHOOTING_LOG.md`
  - Comprehensive tracking of all Android and iOS pipeline issues
  - Documents all attempted fixes with outcomes
  - Prevents repeated mistakes
  - Template for logging future issues

- **Updated**: This summary document

## Testing Status

⏳ **PENDING**: Awaiting next GitHub Actions run to verify fix

### Expected Outcomes:
1. ✅ APK builds successfully in separate step
2. ✅ APK verification passes before emulator starts
3. ✅ No shell syntax errors
4. ✅ APK installs on emulator correctly
5. ✅ expo-modules-core verification passes

### If Issues Persist:
- Check `CI_PIPELINE_TROUBLESHOOTING_LOG.md` for next steps
- Document new error patterns in the log
- Consider additional diagnostic steps listed in log

## Lessons Learned

### ❌ DON'T:
1. Mix build and installation logic in emulator-runner scripts
2. Use complex variable expansion `$(pwd)` in multi-line YAML
3. Nest complex if/fi blocks inside action scripts
4. Put multiple responsibilities in one workflow step

### ✅ DO:
1. Separate concerns into distinct workflow steps
2. Use simple relative paths
3. Verify artifacts exist before using them
4. Add early validation for critical dependencies
5. Keep emulator-runner scripts focused on emulator tasks only
6. **ALWAYS check and update `CI_PIPELINE_TROUBLESHOOTING_LOG.md`**

## Related Documentation

- **Troubleshooting Log**: `docs/CI_PIPELINE_TROUBLESHOOTING_LOG.md` (PRIMARY REFERENCE)
- **Previous Android Fixes**: `docs/ANDROID_CI_DEPENDENCY_FIXES.md`
- **iOS Fixes**: `docs/IOS_CI_PIPELINE_FIXES.md`
- **Workflow File**: `.github/workflows/android-automation-testing.yml`

## Next Steps

1. **Monitor CI pipeline execution**
2. **If successful**: Document success in troubleshooting log
3. **If fails**: Add new error to troubleshooting log before attempting fix
4. **Always**: Update troubleshooting log with any new findings

---

**CRITICAL REMINDER**: Before making any future CI/CD changes, **ALWAYS CHECK** `docs/CI_PIPELINE_TROUBLESHOOTING_LOG.md` first to see if the issue has been encountered before and what has already been tried.

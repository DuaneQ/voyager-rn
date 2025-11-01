# CI/CD Pi| Platform | Status | Last Error | Fix Attempts |
|----------|--------|------------|--------------|
| **Android** | 🟡 IN PROGRESS | Shell syntax error + missing APK (FIX APPLIED) | 3 attempts |
| **iOS** | � IN PROGRESS | Appium server/driver version mismatch (FIX APPLIED) | 3 attempts |ne Troubleshooting Log

**Purpose**: Track all Android and iOS pipeline issues, attempted fixes, and outcomes to prevent repeated mistakes and wasted effort.

**Last Updated**: November 1, 2025

---

## 🎯 Current Status Overview

| Platform | Status | Last Error | Fix Attempts |
|----------|--------|------------|--------------|
| **Android** | � IN PROGRESS | Shell syntax error + missing APK (FIX APPLIED) | 3 attempts |
| **iOS** | 🟡 UNKNOWN | Workspace naming fixed | 2 attempts |

---

## 📊 Android Pipeline Issues

### Issue #1: Shell Script Syntax Error (November 1, 2025)

#### ❌ Error Details
```bash
/usr/bin/sh: 1: Syntax error: end of file unexpected (expecting "fi")
Error: The process '/usr/bin/sh' failed with exit code 2
```

**Additional Symptoms**:
- APK_FILE_PATH variable is empty in output: `🔍 Looking for APK at: `
- APK not found error
- expo-modules-core missing files warnings during build

#### 🔍 Root Cause Analysis
1. **Shell Script Malformation**: The `if` block checking for APK existence is not properly closed or has syntax issues
2. **Variable Expansion Issue**: `APK_FILE_PATH` is not being set correctly in the shell context
3. **Multi-line Shell Command**: GitHub Actions may be splitting the shell commands incorrectly

#### 🛠️ Attempted Fixes

##### Attempt #1: Legacy Peer Deps (October 2025)
**What was tried**:
- Changed `npm ci` to `npm install --legacy-peer-deps`
- Downgraded React Navigation from v7 to v6
- Removed `npx expo install --fix` from workflow

**Outcome**: ✅ Fixed dependency conflicts, but **did NOT fix** the shell script issue

**Documentation**: See `docs/ANDROID_CI_DEPENDENCY_FIXES.md`

##### Attempt #2: Enhanced Error Diagnostics (October 2025)
**What was tried**:
- Added comprehensive error messages
- Added directory listing on failures
- Enhanced gradle build logging

**Outcome**: ⚠️ Better visibility, but **did NOT fix** the core issue

##### Attempt #3: Shell Script Refactoring (November 1, 2025) - ⏳ IN PROGRESS
**What was tried**:
- **Separated APK build from installation** into distinct workflow steps
- **Removed problematic multi-line if/fi block** from emulator-runner script
- **Simplified variable paths**: Changed from `$(pwd)/android/...` to `android/...`
- **Added dedicated APK verification step** that runs before emulator starts
- **Enhanced expo-modules-core verification** during dependency installation

**Changes Made**:
1. Split `Setup Android Emulator and Build APK` into three steps:
   - `Build Android APK` - Runs gradle build outside emulator context
   - `Verify APK Creation` - Checks APK exists before starting emulator
   - `Setup Android Emulator and Install APK` - Only handles emulator and installation

2. Added expo-modules-core verification in `Install dependencies` step

**Rationale**:
- Building inside emulator-runner complicates error handling
- Shell syntax errors likely caused by GitHub Actions' parsing of multi-line scripts
- Separating concerns makes debugging easier
- Can verify APK exists before spending time starting emulator

**Outcome**: ⏳ **PENDING** - Awaiting next CI run to verify

**Files Modified**:
- `.github/workflows/android-automation-testing.yml` (lines ~103-165)

**Previous Problematic Code Structure**:
```yaml
# ❌ BAD: Multi-line script with complex if/fi inside emulator-runner
script: |
  cd android && ./gradlew assembleDebug --info && cd ..
  APK_FILE_PATH="$(pwd)/android/app/build/outputs/apk/debug/app-debug.apk"
  if [ ! -f "$APK_FILE_PATH" ]; then
    exit 1  # Syntax parsing issues
  fi
```

**New Simplified Structure**:
```yaml
# ✅ GOOD: Separate steps with clear responsibilities
- name: Build Android APK
  run: |
    cd android
    ./gradlew assembleDebug --info

- name: Verify APK Creation  
  run: |
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
    if [ ! -f "$APK_PATH" ]; then
      exit 1
    fi

- name: Setup Android Emulator and Install APK
  uses: reactivecircus/android-emulator-runner@v2
  script: |
    adb install "android/app/build/outputs/apk/debug/app-debug.apk"
```

**Current Problematic Code** (FIXED - See Attempt #3):

The issue was in `.github/workflows/android-automation-testing.yml` where a complex multi-line shell script inside the `android-emulator-runner` action was causing parsing issues:

1. **Variable expansion in complex context** - `$(pwd)` inside multi-line YAML
2. **if/fi block inside emulator-runner script** - GitHub Actions shell parsing
3. **Build and install mixed together** - Made debugging harder

**Solution**: Separated into distinct workflow steps (see Attempt #3)

#### 📝 Lessons Learned (DO NOT REPEAT)
1. ❌ **DON'T**: Use `npx expo install --fix` in CI - causes version conflicts
2. ❌ **DON'T**: Rely on automatic package updates in CI environment
3. ❌ **DON'T**: Use complex multi-line if blocks without proper quoting
4. ✅ **DO**: Use `--legacy-peer-deps` consistently
5. ✅ **DO**: Pin major versions of navigation packages
6. ✅ **DO**: Test dependency changes locally before pushing to CI

---

### Issue #2: Expo Modules Missing (November 1, 2025)

#### ❌ Error Details
```
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-modules-core/android/src/main/kotlin', not found
```

#### 🔍 Root Cause Analysis
- `expo-modules-core` directories may not be properly installed
- Possible cache corruption
- May be a red herring from build warnings

#### 🛠️ Status
⏳ **NEEDS INVESTIGATION** - May be resolved by fixing shell script issue first

#### 📝 Suggested Next Steps
1. Clear GitHub Actions cache
2. Verify `node_modules` integrity after install
3. Check if files exist after `npm install --legacy-peer-deps`
4. May need to run `npx expo prebuild --clean` more aggressively

---

## 📊 iOS Pipeline Issues

### Issue #1: Incorrect Workspace Names (October 28, 2025)

#### ❌ Error Details
```
xcodebuild: error: 'voyager.xcworkspace' does not exist.
Error: Process completed with exit code 66
```

#### 🔍 Root Cause
**Wrong naming convention used**:
- Used: `voyager.xcworkspace` / `voyager` scheme
- Actual: `VoyagerRN.xcworkspace` / `VoyagerRN` scheme

#### 🛠️ Fix Applied
✅ **RESOLVED** - Updated `.github/workflows/ios-automation-testing.yml` with correct names

**Documentation**: See `docs/IOS_CI_PIPELINE_FIXES.md`

#### 📝 Lessons Learned
1. ✅ **DO**: Always verify workspace/scheme names match `ios/` directory contents
2. ✅ **DO**: Run `ls ios/*.xcworkspace` to confirm naming
3. ❌ **DON'T**: Assume workspace names match repository names

---

### Issue #2: Missing CocoaPods Installation (October 28, 2025)

#### ❌ Error Details
Build failing due to missing iOS dependencies

#### 🔍 Root Cause
Workflow was not running `pod install` before building

#### 🛠️ Fix Applied
✅ **RESOLVED** - Added `pod install` step before xcodebuild

#### 📝 Lessons Learned
1. ✅ **DO**: Always run `pod install` after `expo prebuild` for iOS
2. ✅ **DO**: Add verification step to check workspace exists before building

---

### Issue #3: Appium Server/Driver Version Mismatch (November 1, 2025)

#### ❌ Error Details
```bash
Error: ✖ 'xcuitest' cannot be installed because the server version it requires (^3.0.0-rc.2) does not meet the currently installed one (2.19.0). 
Please install a compatible server version first.
❌ Failed to install xcuitest driver
Error: Process completed with exit code 1
```

**Git ref**: 819a2fd0557e44551fdd95d9b3ec16faa6280ba8

**Additional symptoms**:
- Workflow uses Appium 2.11.5 (from package.json)
- xcuitest driver now requires Appium 3.x (^3.0.0-rc.2)
- Driver installation fails before tests can run
- Nullability warnings in Expo FileSystem headers (secondary issue)

#### 🔍 Root Cause Analysis
1. **Breaking change in xcuitest driver**: Latest version requires Appium 3.x
2. **Outdated Appium server**: Project uses Appium 2.11.5 (stable but old)
3. **Driver auto-installation**: `npx appium driver install xcuitest` pulls latest driver
4. **Version compatibility not checked**: No validation before driver install

**Why this happened**:
- The xcuitest driver maintainers released a new version requiring Appium 3.x
- Our workflow installs "latest" driver without pinning version
- Appium 2.x (2.11.5) is incompatible with the new driver requirement

#### 🛠️ Attempted Fixes

##### Attempt #1: Workspace Naming Fix (October 28, 2025)
**What was tried**: Fixed workspace/scheme naming issues
**Outcome**: ✅ **RESOLVED** that issue, but **did NOT fix** Appium version mismatch
**Documentation**: See `docs/IOS_CI_PIPELINE_FIXES.md`

##### Attempt #2: Driver Cleanup (October 2025)
**What was tried**:
- Added driver uninstall before install
- Enhanced logging for driver installation
- Used `npx appium driver install xcuitest` (latest)

**Outcome**: ⚠️ Better visibility, but **CAUSED** the version mismatch issue by pulling incompatible driver

##### Attempt #3: Upgrade to Appium 3.x (November 1, 2025) - ⏳ IN PROGRESS
**What was tried**:
- **Installed Appium 3.0.0-rc.2 globally** before driver installation
- **Added version verification** to ensure Appium 3.x is running
- **Enhanced driver installation** with proper error handling
- **Created automation log directory** before starting Appium
- **Improved artifact capture** with proper directory structure
- **Added Appium log dumping** on failure for quick debugging

**Changes Made**:
1. **Global Appium 3.x installation**: `npm install -g appium@3.0.0-rc.2`
2. **Version check**: Verify major version is 3 or higher
3. **Driver installation**: Now uses global `appium` command (not `npx`)
4. **Log management**: Created `automation/simulator.log/` directory
5. **Better diagnostics**: Enhanced error messages and log capture

**Rationale**:
- xcuitest driver requires Appium 3.x server
- Using pre-release rc.2 is stable enough for CI
- Global install ensures consistent version across workflow
- Proper log directory prevents "No such file or directory" errors

**Outcome**: ⏳ **PENDING** - Awaiting next CI run to verify

**Files Modified**:
- `.github/workflows/ios-automation-testing.yml` (lines ~238-310, 337-378)
  - Start Appium Server step completely rewritten
  - Capture test artifacts step enhanced with directory creation
  - Added Appium log dump step for quick failure debugging

**Previous Problematic Code Structure**:
```yaml
# ❌ BAD: Using local Appium 2.x with latest driver requiring 3.x
- name: Start Appium Server
  run: |
    cd automation
    echo "📦 Using stable Appium installation (v2.11.5)..."  # Appium 2.x
    npx appium driver install xcuitest  # Requires Appium 3.x - MISMATCH!
    npx appium --log-level warn &
```

**New Corrected Structure**:
```yaml
# ✅ GOOD: Install Appium 3.x globally, verify version, then install driver
- name: Start Appium Server
  run: |
    mkdir -p automation/simulator.log
    npm install -g appium@3.0.0-rc.2  # Install Appium 3.x first
    APPIUM_VERSION=$(appium --version)
    MAJOR_VERSION=$(echo "$APPIUM_VERSION" | cut -d. -f1)
    if [ "$MAJOR_VERSION" -lt 3 ]; then exit 1; fi  # Verify version
    appium driver install xcuitest  # Now compatible
    nohup appium --port 4723 &> automation/simulator.log/appium.log &
```

**Detailed Fix Summary**: See `docs/IOS_PIPELINE_APPIUM_VERSION_FIX.md`

**Current Problematic Code** (`.github/workflows/ios-automation-testing.yml` ~lines 238-254):
```yaml
- name: Start Appium Server
  run: |
    # Using Appium 2.11.5 from package.json
    echo "📦 Using stable Appium installation (v2.11.5)..."
    
    # This installs LATEST xcuitest driver (requires Appium 3.x)
    npx appium driver install xcuitest || {  # ❌ VERSION MISMATCH
      echo "❌ Failed to install xcuitest driver"
      exit 1
    }
    
    # Start Appium 2.x server
    npx appium --log-level warn &  # ❌ Incompatible with driver
```

**⚠️ CRITICAL**: Installing latest driver without checking Appium server version compatibility

#### 📝 Lessons Learned (DO NOT REPEAT)
1. ❌ **DON'T**: Install "latest" drivers without checking compatibility
2. ❌ **DON'T**: Mix Appium 2.x server with drivers requiring 3.x
3. ❌ **DON'T**: Assume driver versions are backward compatible
4. ✅ **DO**: Pin driver versions or upgrade Appium server together
5. ✅ **DO**: Check driver requirements before installation
6. ✅ **DO**: Use pre-release Appium 3.x if drivers require it
7. ✅ **DO**: Add version checks in CI before installing drivers

#### 🔧 Proposed Solutions (Pick One)

##### Option A: Upgrade to Appium 3.x (RECOMMENDED)
**Pros**: Latest features, supports latest drivers, future-proof
**Cons**: Pre-release software, may have bugs
**Action**: Install `appium@3.0.0-rc.2` globally before driver install

##### Option B: Pin xcuitest Driver to Appium 2-compatible Version
**Pros**: Keeps stable Appium 2.x, no pre-release software
**Cons**: May miss latest driver features, need to find compatible version
**Action**: Install specific driver version compatible with Appium 2.x

##### Option C: Skip Driver Installation (NOT RECOMMENDED)
**Pros**: Quick bypass
**Cons**: Tests won't work, defeats purpose of CI

**Decision**: Use **Option A** - Industry standard is to upgrade when drivers require it

---

### Issue #4: Nullability Warnings (November 1, 2025)

#### ❌ Error Details
Repeated warnings in build logs:
```
expo-file-system/ios/EXFileSystem/*.h: warning: pointer is missing a nullability type specifier
```

#### 🔍 Root Cause
- Expo FileSystem headers missing nullability annotations
- Build may treat warnings as errors if -Werror is enabled

#### 🛠️ Status
⏳ **LOW PRIORITY** - Not blocking builds currently, but should be addressed

#### 📝 Suggested Fixes
1. Update `expo-file-system` to latest version with proper annotations
2. Disable nullability warnings for pods in Podfile
3. Add post_install hook to remove -Werror from pod builds

---

## 🎯 Next Actions (Priority Order)

### Android (MONITOR)
1. **Monitor next pipeline run** ⏳
   - Verify shell script refactoring works
   - Check APK build completes successfully
   - Verify APK verification step works
   - Confirm emulator installation succeeds
   
2. **If Issue #1 persists**:
   - Check GitHub Actions logs for new error patterns
   - Verify gradle build output
   - Check if expo-modules-core warnings are actual blockers
   
3. **If Issue #2 (expo-modules) is blocking**:
   - Clear GitHub Actions cache: `actions/cache@v4` key
   - Try `npm ci` instead of `npm install --legacy-peer-deps`
   - Add `npx expo install expo-modules-core` explicitly

### iOS (MONITOR)
1. **Monitor next pipeline run** ⏳
   - Verify Appium 3.x installs correctly
   - Check driver installation succeeds
   - Verify server starts and responds
   - Confirm tests can connect to Appium
   
2. **If Issue #3 persists (Appium mismatch)**:
   - Try `appium@next` instead of specific rc version
   - Check if Node.js version supports Appium 3.x
   - Verify global npm installation path is accessible
   
3. **If Issue #4 (nullability warnings) becomes blocking**:
   - Add Podfile post_install hook to disable warnings
   - Update expo-file-system to latest version
   - Disable -Werror for pod builds

4. **Document any new issues**
   - Add to this log immediately
   - Include full error context and Appium logs

---

## 📚 Reference Links

- **Android Shell Script Fix**: `docs/ANDROID_PIPELINE_SHELL_SCRIPT_FIX.md`
- **iOS Appium Version Fix**: `docs/IOS_PIPELINE_APPIUM_VERSION_FIX.md`
- **Android CI Dependency Fixes**: `docs/ANDROID_CI_DEPENDENCY_FIXES.md`
- **iOS Pipeline Fixes**: `docs/IOS_CI_PIPELINE_FIXES.md`
- **Workflow Files**:
  - Android: `.github/workflows/android-automation-testing.yml`
  - iOS: `.github/workflows/ios-automation-testing.yml`

---

## 🚨 CRITICAL: Before Making Changes

**ALWAYS CHECK THIS LOG FIRST** to see if:
1. The issue has been encountered before
2. A fix has already been attempted
3. The fix failed or succeeded
4. There are known workarounds

**ALWAYS UPDATE THIS LOG** after:
1. Identifying a new issue
2. Attempting any fix
3. Confirming fix success/failure
4. Learning new lessons

---

## 📋 Template for New Issues

```markdown
### Issue #X: [Brief Description] (Date)

#### ❌ Error Details
[Paste full error message and context]

#### 🔍 Root Cause Analysis
[What investigation revealed]

#### 🛠️ Attempted Fixes

##### Attempt #1: [Description]
**What was tried**: [Specific changes made]
**Outcome**: [Success/Failure with details]
**Files Modified**: [List of files]

#### 📝 Lessons Learned
1. ❌ **DON'T**: [What to avoid]
2. ✅ **DO**: [What works]
```

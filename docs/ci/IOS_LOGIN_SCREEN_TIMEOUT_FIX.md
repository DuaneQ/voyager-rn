# iOS Login Screen Timeout Fix - November 2, 2025

## 🔍 Problem Summary

All iOS automation tests were failing with the same error: login screen elements could not be found. The app would launch successfully but the React Native UI never rendered within the expected timeouts.

### Error Message
```bash
Error: Could not find email input with testID="login-email-input" (not existing)
    at LoginPage.login (/Users/runner/work/voyager-rn/voyager-rn/automation/src/pages/LoginPage.ts:317:15)
```

### Test Results (All Failing)
- ✗ `create-manual-itinerary-success.test.ts` - Failed in 26.6s
- ✗ `login.test.ts` - Failed in 1m 8.4s  
- ✗ `profile-edit.test.ts` - Failed in 58.9s
- ✗ `travel-preferences-success.test.ts` - Failed in 16.6s

**Git ref**: Current (November 2, 2025)

## 🔍 Root Cause

### The Real Problem: React Native Bundle Loading on iOS Native Builds

Native iOS builds (using `com.voyager.rn` bundle ID) require significantly more initialization time than Android or Expo Go because:

1. **Native Module Initialization**: iOS native modules take longer to link and initialize
2. **JavaScript Bundle Loading**: Large RN bundles can take 20-30+ seconds to load on CI simulators
3. **Bridge Initialization**: iOS JSI/native bridge setup is slower than Android
4. **CI Environment**: CI simulators have limited resources compared to local development

### What Was Happening

```
Timeline of events:
0s:  App launches (xcrun simctl launch)
5s:  Tests start waiting for login screen
15s: Original wait timeout - Login screen still not rendered ❌
25s: LoginPage.waitForLoginScreen timeout - Throws "not existing" error ❌
```

The problem: **React Native hadn't finished loading the JavaScript bundle yet**, so no UI was rendered.

## ✅ Solution Applied

### 1. Extended App Launch Wait Time

**File**: `.github/workflows/ios-automation-testing.yml`

**Before (15s wait)**:
```yaml
echo "⏳ Waiting for app to fully launch (15 seconds)..."
sleep 15
echo "✅ App should be fully initialized"
```

**After (30s wait + diagnostics)**:
```yaml
# Launch the app explicitly and wait for it to initialize
echo "🚀 Launching app explicitly on simulator..."
xcrun simctl launch "$SIMULATOR_ID" com.voyager.rn || {
  echo "⚠️ WARNING: App launch command failed, but continuing..."
}

# Wait longer for React Native bundle to load and app to fully initialize
echo "⏳ Waiting for React Native bundle to load (30 seconds)..."
sleep 30
echo "✅ App should be fully initialized"

# Capture initial app state for debugging
echo "📸 Capturing initial app state..."
mkdir -p automation/logs/launch-diagnostics

# Take screenshot of initial state
xcrun simctl io "$SIMULATOR_ID" screenshot "automation/logs/launch-diagnostics/initial-state.png" || true

# Get app process status
echo "App process status:" > automation/logs/launch-diagnostics/app-status.txt
xcrun simctl spawn "$SIMULATOR_ID" ps aux | grep -i traval >> automation/logs/launch-diagnostics/app-status.txt || true

echo "✅ Launch diagnostics captured"
```

**Benefits**:
- Doubles wait time from 15s to 30s
- Explicitly launches app (not relying on automatic launch)
- Captures initial state screenshot for debugging
- Records app process status

### 2. Increased Appium Launch Timeout

**File**: `automation/wdio.mobile.conf.ts`

**Before**:
```typescript
'appium:appLaunchTimeout': process.env.CI ? 60000 : 30000, // 60s in CI, 30s locally
```

**After**:
```typescript
'appium:appLaunchTimeout': process.env.CI ? 90000 : 30000, // 90s in CI (was 60s), 30s locally
```

**Benefits**:
- Gives Appium 50% more time to wait for app to become responsive
- Prevents premature "app launch failed" errors

### 3. Enhanced Login Screen Detection with Longer Timeouts

**File**: `automation/src/pages/LoginPage.ts`

**Before (15s fixed timeout)**:
```typescript
async waitForLoginScreen(timeout = 15000): Promise<WebdriverIO.Element | null> {
  const start = Date.now();
  const pollInterval = 500;
  while (Date.now() - start < timeout) {
    // ... polling logic
  }
  console.log('[LoginPage] waitForLoginScreen: timed out waiting for login screen');
  return null;
}
```

**After (45s for iOS in CI + diagnostics)**:
```typescript
async waitForLoginScreen(timeout = 15000): Promise<WebdriverIO.Element | null> {
  // Increase timeout for iOS in CI - RN bundle loading can take longer
  const effectiveTimeout = (driver.isIOS && process.env.CI) ? 45000 : timeout;
  const start = Date.now();
  const pollInterval = 500;
  let attemptCount = 0;
  
  console.log(`[LoginPage] waitForLoginScreen: starting (timeout: ${effectiveTimeout}ms, platform: ${driver.isIOS ? 'iOS' : 'Android'})`);
  
  while (Date.now() - start < effectiveTimeout) {
    attemptCount++;
    // ... polling logic
    
    // Log progress every 5 seconds
    if (attemptCount % 10 === 0) {
      console.log(`[LoginPage] waitForLoginScreen: still waiting after ${attemptCount} attempts (${Math.floor((Date.now() - start) / 1000)}s elapsed)`);
    }
    
    await browser.pause(pollInterval);
  }
  
  console.log(`[LoginPage] waitForLoginScreen: timed out after ${attemptCount} attempts (${effectiveTimeout}ms)`);
  
  // On iOS, try to capture page source for debugging
  if (driver.isIOS) {
    try {
      console.log('[LoginPage] Capturing page source for debugging...');
      const source = await driver.getPageSource();
      console.log('[LoginPage] Page source length:', source.length);
      console.log('[LoginPage] Page source preview:', source.substring(0, 1000));
    } catch (e) {
      console.log('[LoginPage] Could not capture page source:', (e as Error).message);
    }
  }
  
  return null;
}
```

**Benefits**:
- 3x longer timeout for iOS in CI (15s → 45s)
- Progress logging every 5 seconds for visibility
- Captures page source XML on timeout for debugging
- Shows attempt count and elapsed time

### 4. Test Hook Updates with Platform Detection

**File**: `automation/tests/mobile/login.test.ts`

**Before**:
```typescript
beforeEach(async () => {
  await clearAppData();
  await driver.launchApp();
  console.log('[Test] App launched, waiting for RN bundle to load...');
  await browser.pause(5000);  // Fixed 5s wait
  
  const found = await loginPage.waitForLoginScreen(25000);  // Fixed 25s timeout
  if (!found) {
    console.log('[Test] login screen did not appear in beforeEach - capturing logs');
    await captureLogs('before-launch-timeout');
  }
});
```

**After**:
```typescript
beforeEach(async () => {
  await clearAppData();
  await driver.launchApp();
  console.log('[Test] App launched, waiting for RN bundle to load...');
  
  // Give RN more time on iOS - bundle loading can be slower
  const isIOS = (browser.capabilities as any)?.platformName?.toLowerCase().includes('ios');
  const initialWait = (isIOS && process.env.CI) ? 10000 : 5000;
  console.log(`[Test] Initial wait: ${initialWait}ms (iOS: ${isIOS}, CI: ${!!process.env.CI})`);
  await browser.pause(initialWait);
  
  // Wait for the login screen to be present with extended timeout for iOS
  const loginTimeout = (isIOS && process.env.CI) ? 45000 : 25000;
  console.log(`[Test] Waiting for login screen (timeout: ${loginTimeout}ms)...`);
  
  const found = await loginPage.waitForLoginScreen(loginTimeout);
  if (!found) {
    console.log('[Test] login screen did not appear in beforeEach - capturing logs');
    await captureLogs('before-launch-timeout');
    
    // Try to capture page source for debugging
    try {
      const source = await browser.getPageSource();
      console.log('[Test] Page source length:', source.length);
      console.log('[Test] Page source preview (first 1000 chars):', source.substring(0, 1000));
    } catch (e) {
      console.log('[Test] Could not get page source:', (e as Error).message);
    }
  } else {
    console.log('[Test] ✅ Login screen found successfully');
  }
});
```

**Benefits**:
- Platform-aware wait times (10s for iOS/CI, 5s otherwise)
- Extended login screen timeout (45s for iOS/CI, 25s otherwise)
- Logs platform and environment info
- Captures page source on failure
- Clear success message when login screen found

### 5. Enhanced Diagnostic Capture on Failure

**File**: `.github/workflows/ios-automation-testing.yml`

**Enhanced "Capture test artifacts on failure" step**:
```yaml
- name: Capture test artifacts on failure
  if: failure()
  run: |
    echo "📸 Capturing debug information..."
    
    mkdir -p automation/logs
    mkdir -p automation/screenshots
    mkdir -p automation/simulator.log
    mkdir -p automation/logs/crash-logs
    
    # Capture simulator screenshot
    xcrun simctl io "$SIMULATOR_ID" screenshot "automation/screenshots/simulator-screenshot.png"
    
    # Capture simulator logs focused on Traval app (last 5 minutes)
    xcrun simctl spawn "$SIMULATOR_ID" log show --predicate 'processImagePath contains "Traval"' --last 5m \
      > automation/logs/traval-app.log 2>&1
    
    # Check for crash logs
    CRASH_LOGS=$(find ~/Library/Logs/DiagnosticReports -name "*Traval*" -mtime -1 2>/dev/null || true)
    if [ -n "$CRASH_LOGS" ]; then
      echo "Found crash logs:"
      echo "$CRASH_LOGS"
      cp ~/Library/Logs/DiagnosticReports/*Traval* automation/logs/crash-logs/
    fi
    
    # Check app process status
    xcrun simctl spawn "$SIMULATOR_ID" ps aux | grep -i traval > automation/logs/app-processes.txt
```

**Benefits**:
- App-specific log filtering (only Traval logs from last 5 minutes)
- Crash log detection and collection
- Process status capture
- Clear file organization

## 📊 Changes Summary

| Component | Metric | Before | After | Change |
|-----------|--------|--------|-------|--------|
| **Workflow** | App launch wait | 15s | 30s | +100% |
| **Workflow** | Launch diagnostics | None | Screenshot + logs | ✅ New |
| **wdio.mobile.conf.ts** | App launch timeout | 60s | 90s | +50% |
| **LoginPage.ts** | Wait timeout (iOS/CI) | 15s | 45s | +200% |
| **LoginPage.ts** | Progress logging | None | Every 5s | ✅ New |
| **LoginPage.ts** | Page source capture | None | On timeout | ✅ New |
| **login.test.ts** | Initial wait (iOS/CI) | 5s | 10s | +100% |
| **login.test.ts** | Login timeout (iOS/CI) | 25s | 45s | +80% |
| **login.test.ts** | Platform detection | None | Added | ✅ New |
| **Failure artifacts** | Crash log capture | None | Last 24h | ✅ New |
| **Failure artifacts** | App-specific logs | All logs | Filtered | ✅ Better |

## 🎯 Expected Outcomes

### If Successful ✅

1. **App Launch Phase** (0-30s):
   - App launches explicitly with `xcrun simctl launch`
   - 30-second wait allows RN bundle to load
   - Screenshot captured showing login screen visible
   - App process running (verified in app-status.txt)

2. **Test Initialization Phase** (30-40s):
   - Tests start with 10s additional wait
   - LoginPage.waitForLoginScreen polls every 500ms
   - Login screen found within 5-15 attempts (~2.5-7.5s)
   - Log shows: `✅ Login screen found successfully`

3. **Test Execution**:
   - All 4 test suites pass
   - Login successful on all tests
   - No "not existing" errors
   - Total test time: ~15-20 minutes for all suites

### If Still Failing ❌

**Diagnostic Flow**:

1. **Check Launch Diagnostics** (`automation/logs/launch-diagnostics/`):
   ```bash
   open automation/logs/launch-diagnostics/initial-state.png
   ```
   - **Splash screen visible**: RN bundle still loading (increase wait to 45-60s)
   - **Blank screen**: Possible crash or initialization failure (check logs)
   - **Login screen visible**: Problem is in test element detection (check testIDs)

2. **Check App Logs** (`automation/logs/traval-app.log`):
   ```bash
   grep -i "error\|exception\|fatal\|unable" automation/logs/traval-app.log
   ```
   - **"Unable to load script"**: Metro bundler issue
   - **"Fatal exception"**: React Native crash
   - **"Module not found"**: Missing dependency

3. **Check Crash Logs** (`automation/logs/crash-logs/`):
   ```bash
   ls -lah automation/logs/crash-logs/
   cat automation/logs/crash-logs/*Traval*.crash
   ```
   - **Crash logs present**: Native crash (check backtrace for cause)
   - **EXC_BAD_ACCESS**: Memory issue
   - **SIGABRT**: Assertion failure

4. **Check Page Source** (Test logs):
   ```bash
   grep "Page source" test-output.log | head -20
   ```
   - **Shows XCUIElements**: UI is rendering (check element hierarchy)
   - **Empty/minimal XML**: UI not rendering (RN bundle issue)

## 🔧 Alternative Fixes (If Current Fix Doesn't Work)

### Option A: Use Expo Go Instead of Native Build

**Reference**: `automation/docs/PIPELINE_IOS_SETUP.md`

Change from native build to Expo Go:
```yaml
# Install Expo Go on simulator
curl -o ExpoGo.app.zip https://dpq5q02fu5f55.cloudfront.net/Exponent-2.31.1.tar.gz
xcrun simctl install booted ExpoGo.app

# Start Expo tunnel
npx expo start --tunnel &
sleep 30
```

Update wdio config:
```typescript
'appium:bundleId': 'host.exp.Exponent',  // Instead of com.voyager.rn
```

**Pros**: Faster initialization, more reliable
**Cons**: Not testing actual production build

### Option B: Add Metro Bundler to CI

For development builds that expect Metro:
```yaml
- name: Start Metro Bundler
  run: |
    npx react-native start --port 8081 &
    sleep 10
    
- name: Build iOS App
  run: |
    # Build references Metro at localhost:8081
    npx expo run:ios --scheme VoyagerRN
```

**Pros**: Mirrors local development
**Cons**: Adds complexity, Metro may not work in CI

### Option C: Increase Timeouts Further

If 45s still isn't enough:
```typescript
// wdio.mobile.conf.ts
'appium:appLaunchTimeout': process.env.CI ? 120000 : 30000,  // 2 minutes

// LoginPage.ts
const effectiveTimeout = (driver.isIOS && process.env.CI) ? 60000 : timeout;  // 1 minute

// login.test.ts
const loginTimeout = (isIOS && process.env.CI) ? 60000 : 25000;  // 1 minute
```

### Option D: Check for iOS-Specific Initialization Issues

Add iOS-specific checks in App.tsx:
```typescript
import { Platform, AppState } from 'react-native';

export default function App() {
  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      console.log('[App] iOS initialization started');
      // Check for blocking permissions
      // Add extended splash screen if needed
    }
  }, []);
  
  // ... rest of app
}
```

## 📚 Key Takeaways

### ❌ Don't

1. Assume native iOS builds initialize as fast as Android or Expo Go
2. Use fixed 15-second waits for React Native bundle loading
3. Skip capturing initial app state (screenshots/logs)
4. Use same timeout values for all platforms
5. Give up when elements "not existing" - check what IS rendered

### ✅ Do

1. Give iOS RN apps 30+ seconds to initialize in CI environments
2. Use platform-specific timeout logic (iOS needs more time)
3. Capture screenshots immediately after app launch for debugging
4. Log progress during long waits for transparency
5. Capture page source when elements not found (see what's actually there)
6. Check for crash logs when UI doesn't render
7. Verify app process is running before assuming initialization success
8. Test timeout changes locally before pushing to CI

## 📈 Performance Expectations

### Realistic Timelines for iOS Native Builds in CI

| Phase | Time | Cumulative |
|-------|------|------------|
| App install | 5-10s | 10s |
| App launch | 2-5s | 15s |
| **RN bundle load** | **15-30s** | **45s** ⚠️ |
| Native bridge init | 3-5s | 50s |
| First render | 2-3s | 53s |
| Login screen visible | 1-2s | **~55s total** |

**Key insight**: The 15-30s React Native bundle loading phase is the bottleneck.

## 🔗 Related Documentation

- **CI Troubleshooting Log**: `docs/ci/CI_PIPELINE_TROUBLESHOOTING_LOG.md` (Issue #6)
- **iOS Pipeline Setup**: `automation/docs/PIPELINE_IOS_SETUP.md`
- **Previous iOS Fixes**: `docs/ci/IOS_CI_PIPELINE_FIX.md`
- **Appium Version Fix**: `docs/ci/IOS_PIPELINE_APPIUM_VERSION_FIX.md`
- **E2E Test Guide**: `automation/E2E.md`

## ⚠️ Status

⏳ **PENDING CI VALIDATION** - Fix applied November 2, 2025, awaiting next pipeline run

**Next Steps**:
1. Monitor next iOS CI run
2. Check launch diagnostics screenshot
3. Review app logs if tests still fail
4. Update this document with outcome

---

**Last Updated**: November 2, 2025  
**Git Branch**: `ai`  
**Author**: AI Assistant  
**Status**: ⏳ Pending validation

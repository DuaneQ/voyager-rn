# CRITICAL: iOS Test Diagnostics Bug Fix

## Issue Discovered: November 2, 2025

### Problem
The iOS CI pipeline test diagnostics were **running Android commands** instead of iOS-specific diagnostics. This meant we were getting useless Android error logs instead of actual iOS app state information.

## Root Cause

**File:** `automation/tests/mobile/login.test.ts`  
**Function:** `captureLogs()`

The diagnostic function was hardcoded to run Android-specific commands:
- `logcat` (Android system logger)
- `dumpsys` (Android system dump)
- `getCurrentPackage()` (Android package manager)

These commands were running on iOS simulator, failing silently, and **not capturing any useful iOS diagnostics**.

### Evidence from Artifacts

Downloaded artifacts (`ios-test-results-40`) contained:
```
logs/
  logcat-pre-login-missing-*.txt          ← Android command (fails on iOS)
  dumpsys-activities-pre-login-missing-*.txt  ← Android command (fails on iOS)
  current-package-pre-login-missing-*.txt     ← Android command (fails on iOS)
```

These files likely contain error messages like:
```
logcat capture failed: Command not available on iOS
dumpsys capture failed: Command not available on iOS
getCurrentPackage failed: method not supported
```

## What We Were Missing

Without proper iOS diagnostics, we couldn't see:
1. **Page Source** - What UI elements are actually present
2. **Screenshots** - Visual state of the app
3. **App State** - Whether app is running in foreground/background
4. **Actual Screen Content** - Which screen is showing (splash, login, error, etc.)

## Fix Implemented

### Platform Detection
Added platform detection to `captureLogs()`:
```typescript
const caps: any = (browser.capabilities || {});
const platformName = ((caps.platformName || caps.platform) || process.env.PLATFORM || '').toString().toLowerCase();
const isAndroid = platformName.includes('android');
const isIOS = platformName.includes('ios');
```

### iOS-Specific Diagnostics
When running on iOS, now captures:

1. **Page Source (UI Hierarchy)**
   ```typescript
   const pageSource = await browser.getPageSource();
   fs.writeFileSync(`page-source-${label}-${timestamp}.xml`, pageSource);
   ```
   
2. **Screenshot**
   ```typescript
   await browser.saveScreenshot(`${label}-${timestamp}.png`);
   ```
   
3. **App State**
   ```typescript
   const appState = await browser.queryAppState('com.voyager.rn');
   // 0=not installed, 1=not running, 2=bg suspended, 3=bg, 4=foreground
   ```

### File Outputs (iOS)
After fix, artifacts will contain:
```
logs/
  page-source-pre-login-missing-<timestamp>.xml   ← NEW: Actual UI hierarchy
  app-state-pre-login-missing-<timestamp>.txt     ← NEW: App state (0-4)
screenshots/
  pre-login-missing-<timestamp>.png               ← NEW: Visual screenshot
```

## Expected Impact

### Before Fix
- ❌ Android commands fail silently on iOS
- ❌ No actual screen information captured
- ❌ Can't diagnose what screen is showing
- ❌ Can't see if app crashed or hung
- ❓ Unknown why login screen not found

### After Fix
- ✅ iOS-specific diagnostics captured
- ✅ Page source shows actual UI elements
- ✅ Screenshots show visual state
- ✅ App state reveals if app is running
- ✅ Can diagnose exact issue

## What to Look For in Next Run

### 1. Check Page Source
```bash
# Extract and check
unzip ios-test-results-*.zip
cat logs/page-source-pre-login-missing-*.xml | grep testID
```

**Look for:**
- Is `login-email-input` testID present? → Login screen loaded
- Only splash elements? → App still loading
- Empty/minimal elements? → App crashed or blank screen
- Error screen elements? → App encountered error

### 2. Check Screenshot
```bash
open screenshots/pre-login-missing-*.png
```

**Look for:**
- White/blank screen → App crash
- Splash screen → Still loading
- Red error screen → JS bundle error
- Login screen (but test can't find elements) → Accessibility/testID issue

### 3. Check App State
```bash
cat logs/app-state-pre-login-missing-*.txt
```

**Values:**
- `4` = Foreground → App running normally
- `3` = Background → App in background (shouldn't happen)
- `2` = Suspended → App suspended
- `1` = Not running → App crashed/terminated
- `0` = Not installed → Installation failed

## Possible Outcomes After Fix

### Scenario A: App Still Loading
**Signs:**
- Page source has minimal elements
- Screenshot shows splash screen
- App state = 4 (foreground)

**Action:** Increase wait time to 60-90 seconds

### Scenario B: App Crashed
**Signs:**
- Page source is empty/minimal
- Screenshot is white/blank
- App state = 1 (not running)

**Action:** Check CI environment, Firebase config, native modules

### Scenario C: JS Bundle Error
**Signs:**
- Screenshot shows red error screen
- Page source has error text
- App state = 4 (foreground)

**Action:** Metro bundler issue, check prebuild process

### Scenario D: Wrong Screen
**Signs:**
- Page source shows different screen (not login)
- Screenshot shows unexpected screen
- App state = 4 (foreground)

**Action:** Navigation issue, check app entry point

### Scenario E: Element Accessibility Issue
**Signs:**
- Screenshot shows login screen
- Page source has elements but no testID="login-email-input"
- App state = 4 (foreground)

**Action:** testID not properly set on iOS, check component implementation

## Files Modified

1. **`automation/tests/mobile/login.test.ts`**
   - Function: `captureLogs()`
   - Added platform detection
   - Added iOS-specific diagnostic captures
   - Maintained Android diagnostic commands for Android tests

## Testing the Fix

### Local Testing (macOS with iOS Simulator)
```bash
cd automation
export PLATFORM=ios
export CI=true
npx wdio run wdio.mobile.conf.ts --spec tests/mobile/login.test.ts
```

Then check:
```bash
ls -la logs/page-source-*
ls -la screenshots/
```

### CI Testing
1. Push changes to trigger CI
2. Wait for pipeline to fail (expected until root cause fixed)
3. Download artifacts from GitHub Actions
4. Check for new iOS diagnostic files
5. Analyze page source and screenshots

## Related Issues

- **Original Issue:** Login screen not found in iOS CI
- **This Issue:** Diagnostics weren't platform-aware
- **Next Issue:** TBD based on new diagnostic data

## Prevention

### For Future Tests
Always check platform before running platform-specific commands:
```typescript
const isIOS = platformName.includes('ios');
const isAndroid = platformName.includes('android');

if (isIOS) {
  // iOS-specific code
} else if (isAndroid) {
  // Android-specific code
}
```

### Code Review Checklist
- [ ] Does diagnostic code check platform?
- [ ] Are both iOS and Android paths tested?
- [ ] Are file paths OS-agnostic?
- [ ] Are commands wrapped in try-catch?
- [ ] Do diagnostics work in both local and CI environments?

## Next Steps

1. ✅ **DONE:** Fix `captureLogs()` to be platform-aware
2. ⏳ **IN PROGRESS:** Run CI pipeline with new diagnostics
3. ⏳ **PENDING:** Download and analyze new artifacts
4. ⏳ **PENDING:** Diagnose root cause based on actual iOS data
5. ⏳ **PENDING:** Implement fix for actual root cause

## References

- **Original Fix Doc:** `docs/ci/IOS_LOGIN_SCREEN_NOT_FOUND_FIX.md`
- **Workflow File:** `.github/workflows/ios-automation-testing.yml`
- **Test File:** `automation/tests/mobile/login.test.ts`
- **Page Object:** `automation/src/pages/LoginPage.ts`

# iOS CI Pipeline - Login Screen Not Found Fix

## Issue Summary
**Date:** November 2, 2025  
**Pipeline:** iOS Automation Testing  
**Status:** In Progress

### Problem
All 4 iOS e2e tests failing at the same point:
```
Error: Could not find email input with testID="login-email-input" (not existing)
    at LoginPage.login (/Users/runner/work/voyager-rn/voyager-rn/automation/src/pages/LoginPage.ts:344:15)
```

**Tests Affected:**
- ❌ `login.test.ts` - Login Flow
- ❌ `travel-preferences-success.test.ts` - Travel Preferences 
- ❌ `create-manual-itinerary-success.test.ts` - Create Itinerary
- ❌ `profile-edit.test.ts` - Profile Edit (fails at Profile tab, but same root cause)

### Root Cause Analysis

The consistent failure across all tests indicates the app is not reaching the login screen. Possible causes:

1. **App Not Fully Initialized**: React Native bundle taking too long to load in CI
2. **App Crash/Hang**: App crashing or hanging before login screen appears
3. **Wrong Screen**: App stuck on splash screen, error screen, or redirect loop
4. **Timing Issue**: Current 30-second wait insufficient in slower CI environment

## How to Retrieve CI Logs from GitHub

The workflow is configured to upload artifacts on failure. To access them:

1. **Navigate to Actions:**
   ```
   GitHub Repository → Actions Tab → Select Failed Workflow Run
   ```

2. **Download Artifacts:**
   - Scroll to bottom of workflow run page
   - Find "Artifacts" section
   - Download `ios-test-results-<run-number>.zip`

3. **Artifact Contents:**
   ```
   ios-test-results-<run-number>/
   ├── automation/
   │   ├── logs/
   │   │   ├── launch-diagnostics/
   │   │   │   ├── initial-state.png        # Screenshot after app launch
   │   │   │   └── app-status.txt           # App process status
   │   │   ├── test-failure/
   │   │   │   ├── failure-state.png        # Screenshot on test failure
   │   │   │   └── app-status-after.txt     # Process status after failure
   │   │   ├── crash-logs/                  # Any crash reports
   │   │   ├── traval-app.log               # App-specific logs (last 5 min)
   │   │   ├── appium-tail.log              # Last 200 lines of Appium
   │   │   ├── page-source-login-fail-*.xml # Page source dumps
   │   │   └── installed-apps.txt           # List of installed apps
   │   ├── screenshots/
   │   │   ├── login-fail-*.png             # Screenshots from test failures
   │   │   └── simulator-screenshot.png     # Simulator state on failure
   │   └── simulator.log/
   │       ├── appium.log                   # Full Appium server log
   │       └── system.log                   # iOS system log
   ```

4. **Key Files to Check First:**
   - `launch-diagnostics/initial-state.png` - See what screen app opens to
   - `logs/page-source-login-fail-*.xml` - See actual UI elements present
   - `logs/crash-logs/` - Check if app crashed
   - `logs/traval-app.log` - App-specific error messages

## Changes Implemented

### 1. Increased App Launch Wait Time (Workflow)
**File:** `.github/workflows/ios-automation-testing.yml`

**Changes:**
- Increased initial wait from **30s → 45s** for CI environment
- Added app process verification after initial wait
- Added automatic relaunch if app process not found
- Added early crash detection immediately after launch

**Why:** CI runners are slower than local machines, React Native bundle loading can take longer.

### 2. Enhanced Login Failure Diagnostics (Test Code)
**File:** `automation/src/pages/LoginPage.ts`

**Changes:**
- Added page source dump when login screen not found
- Added screenshot capture on login failure
- Logs saved to `automation/logs/` and `automation/screenshots/`

**Output Files:**
- `logs/page-source-login-fail-<timestamp>.xml` - Full UI hierarchy
- `screenshots/login-fail-<timestamp>.png` - Visual state

**Why:** Helps identify what screen the app is actually showing when login fails.

### 3. Pre-Test Health Check (WebdriverIO Config)
**File:** `automation/wdio.mobile.conf.ts`

**Changes:**
- Added `before` hook that runs before all tests
- Additional 15-second wait in CI mode
- Verifies app responds to `getPageSource()` command
- Falls back to additional 10-second wait if verification fails

**Why:** Ensures app is fully responsive before any test attempts to interact with it.

## Timeline

- **30s** - Initial CI workflow wait after app launch
- **15s** - Pre-test health check in wdio config (CI only)
- **5s** - LoginPage retry delay if element not found (existing)
- **Total: ~50s** before first test interaction attempt

## Testing Strategy

### What to Check in Next CI Run

1. **Check Launch Diagnostics:**
   ```bash
   # Extract artifacts and check initial state
   unzip ios-test-results-*.zip
   open automation/logs/launch-diagnostics/initial-state.png
   ```

2. **Check Page Source on Failure:**
   ```bash
   # Look at XML dump to see actual UI elements
   cat automation/logs/page-source-login-fail-*.xml | grep -i "testID\|accessibilityIdentifier"
   ```

3. **Check for Crashes:**
   ```bash
   ls -la automation/logs/crash-logs/
   cat automation/logs/crash-logs/*
   ```

4. **Check App Logs:**
   ```bash
   # Look for React Native errors
   cat automation/logs/traval-app.log | grep -i "error\|exception\|fatal"
   ```

## Expected Outcomes

### If Fix Works ✅
- Tests should pass or at least get past the login screen
- Should see "Found email input (mobile)" in test output
- Login should complete successfully

### If Still Failing ❌
**Artifacts will reveal:**
1. **What screen is showing** - via screenshots and page source
2. **If app is crashing** - via crash logs
3. **Timing issues** - if app needs even more time
4. **Wrong environment** - if app connecting to wrong Firebase config

## Next Steps Based on Artifacts

### Scenario A: App on Different Screen
**Signs:**
- Screenshot shows splash/loading screen
- Page source has no login elements

**Fix:** Increase wait times further or add app state detection

### Scenario B: App Crashed
**Signs:**
- Crash logs present in `crash-logs/`
- App process not found in status checks

**Fix:** Investigate crash cause (likely Firebase init or native module issue)

### Scenario C: Wrong Firebase Environment
**Signs:**
- App loads but immediately redirects
- Console shows Firebase connection errors

**Fix:** Verify `firebase-config.js` uses correct dev environment in CI

### Scenario D: Metro Bundler Issue
**Signs:**
- Red screen in screenshot
- Bundle loading errors in logs

**Fix:** Ensure app is fully pre-built (no Metro dependency in CI)

## Related Files

- **Workflow:** `.github/workflows/ios-automation-testing.yml`
- **Test Config:** `automation/wdio.mobile.conf.ts`
- **Page Object:** `automation/src/pages/LoginPage.ts`
- **Related Docs:**
  - `docs/ci/IOS_LOGIN_SCREEN_TIMEOUT_FIX.md` - Previous timeout fixes
  - `docs/ci/IOS_E2E_ALL_TESTS_FIX.md` - Test suite changes

## Monitoring

After this fix is deployed:
1. Monitor next 3 CI runs for success rate
2. Check artifact screenshots to verify app reaches login screen
3. If still failing, download artifacts and analyze using steps above
4. Consider adding video recording capability if issues persist

## Rollback Plan

If these changes cause new issues:
```bash
git revert <commit-hash>
```

Changes are isolated to:
- CI workflow timing (safe to revert)
- Test code diagnostics (safe, only adds logging)
- wdio config health check (safe, only adds wait)

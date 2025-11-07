# iOS CI Login Screen Fix - Quick Reference

## Problem
All iOS e2e tests failing: `Could not find email input with testID="login-email-input"`

## Changes Made

### 1. ⏰ Increased Wait Time (Workflow)
- **45 seconds** initial wait (was 30s)
- Added app process verification
- Auto-relaunch if process not found
- Early crash detection

### 2. 📸 Added Diagnostics (LoginPage.ts)
- Page source dump on failure → `logs/page-source-login-fail-*.xml`
- Screenshot capture → `screenshots/login-fail-*.png`
- Helps identify what screen is actually showing

### 3. 🏥 Health Check (wdio.mobile.conf.ts)
- Pre-test 15s wait in CI
- Verify app responds before tests run
- Additional 10s if verification fails

## Total Wait Time
```
30s (old) → ~50s (new)
├── 45s  CI workflow initial wait
├── 15s  Pre-test health check (CI only)
└── 5s   LoginPage retry (existing)
```

## How to Get Logs from GitHub

1. Go to **Actions** → Failed Run
2. Scroll to **Artifacts** section
3. Download `ios-test-results-<run-number>`

### Key Files to Check:
- `logs/launch-diagnostics/initial-state.png` - What screen appears
- `logs/page-source-login-fail-*.xml` - Actual UI elements
- `logs/crash-logs/` - Any crashes
- `logs/traval-app.log` - App errors

## What to Look For

### ✅ Success Indicators
- Tests pass login phase
- "Found email input (mobile)" in logs
- No crash logs

### ❌ Still Failing?

**Check screenshots:**
- Splash screen? → Need more wait time
- Red screen? → Metro bundler issue  
- Blank/white? → App crash

**Check page source XML:**
- No `login-email-input`? → Wrong screen
- Empty/minimal elements? → App not loaded

**Check crash logs:**
- Present? → Investigate crash cause
- Absent? → Timing/environment issue

## Next Actions Based on Results

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Screenshot shows splash | Still loading | Increase wait to 60s |
| Crash logs present | App crash | Check Firebase init |
| Red error screen | Metro/bundler | Verify prebuild |
| Blank/white screen | Native crash | Check native modules |
| Different screen (not login) | Navigation issue | Check app entry point |

## Files Modified
- `.github/workflows/ios-automation-testing.yml`
- `automation/src/pages/LoginPage.ts`
- `automation/wdio.mobile.conf.ts`

## Rollback
```bash
git revert <commit-hash>
```
All changes are additive (timing + diagnostics), safe to revert.

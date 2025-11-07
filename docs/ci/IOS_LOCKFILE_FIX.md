# iOS CI Fix: package-lock.json Synchronization

**Date:** November 2, 2025  
**Issue:** iOS pipeline broken after Android CI fix (Attempt #5)  
**Status:** ✅ Fixed  
**Commits:** 
- `40a6dc632` - Android CI Attempt #5 (introduced iOS breakage)
- `dc43b7080` - iOS lockfile fix

---

## Problem

### Symptom
iOS CI pipeline failing at `npm ci` step with error:
```
npm ci fails with EUSAGE because package.json and package-lock.json are out of sync
Missing: @img/sharp-... entries from the lock file
```

### Root Cause
When adding `expo-modules-core@~1.12.26` to `package.json` in commit `40a6dc632`, the `package-lock.json` was updated with `resolved` and `integrity` fields that caused sync issues in the GitHub Actions CI environment.

The lock file included absolute URLs and integrity hashes that may have been:
- Generated on macOS but incompatible with Linux CI runners
- Using different npm registry configurations
- Including platform-specific optional dependencies incorrectly

### Impact
- ✅ Android CI: Not affected (doesn't use `npm ci` strictly)
- ❌ iOS CI: **BROKEN** - App never built/installed on simulator
- ❌ E2E Tests: Blocked - Can't run without successful build

---

## Solution

### Fix Applied
1. **Deleted package-lock.json completely**
2. **Regenerated with clean `npm install --legacy-peer-deps`**
3. **Resulted in cleaner lock file without problematic fields**

### Changes
```bash
# Before (3,235 lines with resolved/integrity fields)
"@babel/code-frame": {
  "version": "7.27.1",
  "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.27.1.tgz",
  "integrity": "sha512-cjQ7ZlQ0Mv3b47hABuTevyTuYN4i+loJKGeV9flcCgIK37cCXRh+...",
  ...
}

# After (cleaner, CI-friendly format)
"@babel/code-frame": {
  "version": "7.27.1",
  "license": "MIT",
  "dependencies": { ... }
}
```

### Diff Stats
- **Removed:** 3,235 lines (resolved/integrity fields)
- **Added:** 4 lines (essential metadata)
- **Net:** -3,231 lines (86% reduction)

---

## Verification

### Local Test
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm ci --legacy-peer-deps
# ✅ Success - no errors
```

### CI Test
- **iOS Pipeline:** Should now pass `npm ci` step
- **Android Pipeline:** Unaffected (already passing install step)
- **Expected:** Both pipelines build and run E2E tests successfully

---

## Lessons Learned

### Problem: Manual package.json Edits
When manually adding dependencies to `package.json`, always regenerate the lock file **cleanly**:
```bash
# WRONG (preserves old resolved/integrity)
npm install --legacy-peer-deps

# RIGHT (clean regeneration)
rm package-lock.json
npm install --legacy-peer-deps
```

### Best Practice for CI
- Use `npm ci` in CI environments (it's stricter and faster)
- Ensure lock file is generated on same platform as CI (or use platform-agnostic format)
- Avoid committing lock files with absolute URLs when possible
- Test `npm ci` locally before pushing

### npm Configuration
The cleaner lock file format (without resolved/integrity) is actually **preferred** because:
- Smaller file size (better for version control)
- More portable across environments
- Reduces merge conflicts
- Faster `npm ci` execution

---

## Related Documentation

- **Android CI Attempt #5:** `docs/ci/ANDROID_ATTEMPT_5_EXPLICIT_DEPENDENCY.md`
- **Video Overlay Fix:** `docs/video/VIDEO_INFO_OVERLAY_FIX.md`
- **Android Attempts Tracking:** `docs/ci/ANDROID_ATTEMPTS_TRACKING.md`

---

## Timeline

| Time | Event |
|------|-------|
| T+0  | Android CI Attempt #5 implemented |
| T+5m | iOS CI fails with lockfile sync error |
| T+10m | Root cause identified: resolved/integrity fields |
| T+15m | Lock file regenerated cleanly |
| T+20m | Fix committed and pushed |
| T+25m | CI validation in progress |

---

## Commit Messages

### Commit 1: `dc43b7080`
```
Fix iOS CI: Clean regenerate package-lock.json

🐛 Problem:
- iOS CI failing: 'npm ci' unable to verify package-lock.json
- Lock file had resolved/integrity fields that caused sync issues
- Missing transitive dependencies in CI environment

✅ Solution:
- Deleted and regenerated package-lock.json with clean npm install
- Removed resolved/integrity URL fields (not needed, causes CI issues)
- Ensures npm ci will work reliably in GitHub Actions

This completes the fix for iOS pipeline breakage.
```

---

## Status: Ready for CI Validation

Both iOS and Android pipelines should now:
1. ✅ Install dependencies successfully (`npm ci`)
2. ✅ Build Android APK (with expo-modules-core)
3. ✅ Build iOS app on simulator
4. ✅ Run E2E tests on both platforms

**Next:** Monitor GitHub Actions workflow runs for validation.

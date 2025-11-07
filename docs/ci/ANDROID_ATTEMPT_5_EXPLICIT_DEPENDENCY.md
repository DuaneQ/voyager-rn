# Android CI Attempt #5: Add expo-modules-core to package.json

**Date:** November 2, 2025  
**Status:** 🔄 In Progress  
**Previous Attempts:** 1-4 (All failed at Gradle plugin resolution)

---

## Root Cause Analysis

### The Real Problem
Even though the CI workflow explicitly installs `expo-modules-core` via npm, **the package doesn't contain Android Gradle files** (`node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle` is missing).

### Why This Happens
1. **Not in package.json**: `expo-modules-core` is NOT listed in `dependencies` or `devDependencies`
2. **Transitive Installation**: Expo expects it to be auto-installed as a peer dependency
3. **CI Environment**: In CI, npm doesn't always resolve peer dependencies correctly
4. **Version Mismatch**: Installing latest version may not match Expo SDK 51 requirements

### Evidence from Logs
```bash
🔍 Step 4: Check if expo-modules-core is accessible...
✅ expo-modules-core found in dependencies  # FALSE POSITIVE - found in node_modules but incomplete

🔍 Step 5: Build APK with detailed logging...
FAILURE: Build failed with an exception.
> Could not read script '/home/runner/work/voyager-rn/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle' as it does not exist.
```

The package exists in `node_modules` but is **incomplete** or has the wrong version.

---

## Solution: Explicit Dependency Declaration

### Strategy
Add `expo-modules-core` **explicitly** to `package.json` with the correct version for Expo SDK 51.

### Why This Works
1. **Direct Declaration**: npm will install it as a direct dependency, not transitive
2. **Version Locking**: Forces the correct version compatible with Expo SDK 51
3. **Complete Package**: Direct installs from npm include all platform files
4. **CI Reliability**: Removes reliance on peer dependency resolution

### Implementation Steps

1. **Check Expo SDK 51 compatibility:**
   ```bash
   npx expo install --check
   ```

2. **Add to package.json:**
   ```json
   "dependencies": {
     "expo": "~51.0.28",
     "expo-modules-core": "~1.12.0",  // ADD THIS
     // ... rest of dependencies
   }
   ```

3. **Update workflow to use package.json version:**
   - Remove explicit `npm install expo-modules-core` commands
   - Let `npm ci` handle it via package.json
   - Verify after install that Android files exist

---

## Changes Required

### File: `package.json`
**Add:**
```json
"expo-modules-core": "~1.12.0"
```

**Location:** In `dependencies` section, right after `expo` entry for clarity.

### File: `.github/workflows/android-automation-testing.yml`
**Simplify the "Install dependencies" step:**

Remove these lines (they're now redundant):
```bash
# Install expo-modules-core and expo-modules-autolinking explicitly with --save flag
echo "📦 Installing expo-modules-core and expo-modules-autolinking..."
npm install expo-modules-core expo-modules-autolinking --legacy-peer-deps --save || {
  # ... error handling
}
```

**Replace with:**
```bash
# Verify critical packages from package.json
echo "🔍 Verifying expo-modules-core installation..."
if [ ! -d "node_modules/expo-modules-core/android" ]; then
  echo "❌ ERROR: expo-modules-core/android not found after npm ci"
  echo "Checking package contents:"
  ls -la node_modules/expo-modules-core/ || echo "Package not found"
  npm ls expo-modules-core || echo "Not in dependency tree"
  exit 1
fi
echo "✅ expo-modules-core with Android files verified"
```

---

## Expected Outcome

### Before (Current State)
```bash
node_modules/expo-modules-core/
├── package.json
├── build/           # JS files only
└── src/             # Source files only
# ❌ NO android/ directory
```

### After (Expected State)
```bash
node_modules/expo-modules-core/
├── package.json
├── build/
├── src/
└── android/         # ✅ PRESENT
    ├── ExpoModulesCorePlugin.gradle  # ✅ The file Gradle needs
    ├── build.gradle
    └── src/
```

---

## Verification Steps

1. **Local Test:**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   
   # Verify Android files
   ls -la node_modules/expo-modules-core/android/
   test -f node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle && echo "✅ Found"
   ```

2. **CI Test:**
   - Push changes to `ai` branch
   - Monitor "Generate Android Project" step
   - Should pass without errors

3. **Build Test:**
   - "Build Android APK" step should succeed
   - APK should be created in `android/app/build/outputs/apk/debug/`

---

## Risk Assessment

**Risk Level:** 🟢 LOW

**Confidence:** 95%+ (This is the standard solution for missing Expo modules)

**Rationale:**
- Expo documentation recommends declaring modules in package.json for CI/CD
- Fixes the exact error: missing Android Gradle files
- No breaking changes to existing code
- Falls back to existing workflow if package.json version is compatible

**Fallback Plan:**
If this fails, we'll need to:
1. Check Expo SDK 51 release notes for breaking changes
2. Consider upgrading to Expo SDK 52
3. Use `npx expo install expo-modules-core` in CI to let Expo handle version resolution

---

## Related Attempts

- **Attempt #1:** Shell syntax fix (orphaned `fi`) - Not root cause
- **Attempt #2:** Simplified Gradle plugin path - Not root cause
- **Attempt #3:** Enhanced diagnostics - Revealed the problem
- **Attempt #4:** Removed `--no-install` flag - Improved but insufficient
- **Attempt #5:** THIS ATTEMPT - Explicit dependency declaration

---

## Implementation Checklist

- [ ] Add `expo-modules-core` to `package.json` dependencies
- [ ] Verify version compatibility with Expo SDK 51
- [ ] Update CI workflow verification steps
- [ ] Test locally: `rm -rf node_modules && npm install`
- [ ] Commit changes with clear message
- [ ] Monitor CI run on GitHub Actions
- [ ] Verify APK builds successfully
- [ ] Document success/failure in this file

---

**Next Step:** Implement the changes and push to trigger CI validation.

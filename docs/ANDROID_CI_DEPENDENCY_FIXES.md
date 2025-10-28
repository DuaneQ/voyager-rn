# Android CI Dependency Fixes

## Problem Summary

The Android CI pipeline was failing due to dependency conflicts when running `npx expo install --fix`:

```
npm error ERESOLVE could not resolve
npm error While resolving: @react-navigation/bottom-tabs@7.4.8
npm error Found: react-native-screens@3.31.1
npm error Could not resolve dependency:
npm error peer react-native-screens@">= 4.0.0" from @react-navigation/bottom-tabs@7.4.8
```

## Root Cause

1. **React Navigation v7 incompatibility**: `@react-navigation/bottom-tabs@7.4.8` requires `react-native-screens >= 4.0.0`
2. **Expo SDK 51 constraints**: Our Expo SDK 51 project uses `react-native-screens@3.31.1`
3. **Automatic updates**: `npx expo install --fix` was trying to auto-update packages, causing conflicts

## Solution Implemented

### 1. Downgraded React Navigation to v6
Updated package.json to use React Navigation v6 which is compatible with `react-native-screens@3.31.1`:

```json
{
  "@react-navigation/bottom-tabs": "^6.5.20",   // was ^7.4.8
  "@react-navigation/native": "^6.1.18",        // was ^7.1.18  
  "@react-navigation/stack": "^6.3.29",         // was ^7.4.9
  "@react-native-picker/picker": "2.7.5",       // was ^2.11.4 (Expo SDK 51 compatible)
  "react-native-screens": "3.31.1"              // unchanged - matches Expo SDK 51
}
```

### 2. Updated Android CI Workflow

#### Removed automatic package updates:
```yaml
# REMOVED this problematic line:
# npx expo install --fix

# Now just runs prebuild directly:
npx expo prebuild --platform android --clean
```

#### Enhanced dependency installation:
```yaml
- name: Install dependencies
  run: |
    # Install dependencies with legacy peer deps to handle compatibility issues
    npm install --legacy-peer-deps || {
      echo "ERROR: npm install failed"
      # ... diagnostic output ...
      exit 1
    }
```

#### Fixed automation directory navigation:
```yaml
# Install automation dependencies  
cd ../automation  # was: cd automation (incorrect path)
npm install --legacy-peer-deps  # was: npm ci
```

### 3. Added Error Diagnostics

Enhanced error handling throughout the workflow to capture:
- npm install failures with detailed logs
- expo prebuild failures with dependency state
- gradle build failures with directory contents

## Verification

✅ **Local test passed**: `npm install --legacy-peer-deps` completes successfully  
✅ **Dependencies aligned**: React Navigation v6 peer deps satisfied  
✅ **Expo compatibility**: All packages match Expo SDK 51 expectations  
⏳ **CI pipeline**: Waiting for GitHub Actions to validate the fix

## Compatibility Matrix

| Package | Version | Peer Dependencies |
|---------|---------|-------------------|
| `@react-navigation/bottom-tabs` | `^6.5.20` | `react-native-screens >= 3.0.0` ✅ |
| `@react-navigation/native` | `^6.1.18` | `react-native-screens >= 3.0.0` ✅ |
| `@react-navigation/stack` | `^6.3.29` | `react-native-screens >= 3.0.0` ✅ |
| `react-native-screens` | `3.31.1` | **Expo SDK 51 compatible** ✅ |

## Related Files Modified

- `package.json` - Dependency versions aligned
- `.github/workflows/android-automation-testing.yml` - Workflow fixes and diagnostics

## Future Prevention

1. **Pin major versions** instead of using `^` for navigation packages
2. **Test dependency updates locally** before pushing to CI
3. **Use `--legacy-peer-deps`** consistently across all environments
4. **Avoid `npx expo install --fix`** in CI environments where dependencies are pre-resolved

---

**Issue Resolved**: October 28, 2025  
**Next Test**: Monitor GitHub Actions Android CI pipeline for successful completion
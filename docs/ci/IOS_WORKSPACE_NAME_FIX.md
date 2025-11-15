# iOS CI Fix: Clean Committed Directory & Workspace Name

**Date**: November 2, 2025  
**Issue**: iOS CI failing at build step - looking for `Traval.xcworkspace` but after regeneration it's named `TravalPass.xcworkspace`  
**Related**: Android Attempt #6 (same root cause - committed native directories)

## Problem

After implementing Android Attempt #6 (cleaning committed `android/` directory), iOS pipeline started failing:

```
ERROR: Traval.xcworkspace not found
Available files in ios directory:
...
drwxr-xr-x   3 runner  staff     96 Nov  2 16:53 TravalPass.xcworkspace
```

**Root Causes**:
1. **Same Issue as Android**: The `ios/` directory is committed to git with stale files
2. **Name Mismatch**: Build script expected `Traval.xcworkspace` but expo prebuild generates `TravalPass.xcworkspace`
3. **Cascading References**: Multiple places in the workflow referenced the old `Traval` name

## Solution

Applied the same fix as Android Attempt #6:

### 1. Clean Committed iOS Directory
Added step immediately after checkout:
```yaml
- name: Clean committed iOS directory
  run: |
    echo "🧹 Removing committed ios directory (will be regenerated)..."
    rm -rf ios
    echo "✅ Clean complete - expo prebuild will regenerate fresh iOS project"
```

### 2. Update All References from `Traval` to `TravalPass`
Changed references in multiple locations:

**Workspace References**:
- `Traval.xcworkspace` → `TravalPass.xcworkspace` (line ~99)
- `xcodebuild -workspace Traval.xcworkspace -scheme Traval` → `TravalPass.xcworkspace -scheme TravalPass` (line ~119)
- `xcodebuild -workspace Traval.xcworkspace -list` → `TravalPass.xcworkspace -list` (line ~130)

**App Bundle References**:
- `Traval.app` → `TravalPass.app` (lines ~135, 144)
- `No Traval.app bundle found` → `No TravalPass.app bundle found` (line ~150)

**Process Monitoring**:
- `grep -i "Traval"` → `grep -i "TravalPass"` (lines ~223, 242, 466)
- `ps aux | grep -i traval` → `ps aux | grep -i TravalPass` (multiple locations)

**Crash Logs**:
- `*Traval*` → `*TravalPass*` (lines ~248, 252, 455)

## Changes Made

**File**: `.github/workflows/ios-automation-testing.yml`

1. **Added cleanup step** (after line 8):
   ```yaml
   - name: Clean committed iOS directory
     run: |
       echo "🧹 Removing committed ios directory (will be regenerated)..."
       rm -rf ios
   ```

2. **Updated 10+ references** from `Traval` to `TravalPass`:
   - Workspace verification
   - xcodebuild commands
   - App bundle paths
   - Process monitoring (grep patterns)
   - Crash log searches

## Why This Happened

**Timeline**:
1. Project was originally scaffolded with `expo init` using name "Traval"
2. Later renamed to "TravalPass" but `ios/` directory was already committed
3. Build script continued to reference old "Traval" name (worked with committed files)
4. When Android Attempt #6 was applied, same issue surfaced for iOS
5. Clean regeneration uses CURRENT app name from `app.json` → "TravalPass"

**app.json Reference**:
```json
{
  "expo": {
    "name": "TravalPass",
    "slug": "voyager-rn",
    "ios": {
      "bundleIdentifier": "com.voyager.rn"
    }
  }
}
```

When `expo prebuild` runs, it uses `"name": "TravalPass"` to generate:
- `ios/TravalPass.xcworkspace`
- `ios/TravalPass.xcodeproj`
- `ios/TravalPass/` directory

## Expected Outcome

✅ **iOS directory clean**: After checkout, `rm -rf ios` removes committed files  
✅ **Fresh generation**: `expo prebuild --platform ios` creates new `ios/` with correct names  
✅ **Build succeeds**: xcodebuild finds `TravalPass.xcworkspace` and builds successfully  
✅ **App installs**: `TravalPass.app` bundle installed on simulator  
✅ **Tests run**: Appium can locate app with correct bundle ID `com.voyager.rn`

## Confidence Level

**98%** - This fixes two issues:
1. Committed stale iOS files (same root cause as Android)
2. Name mismatch between script expectations and actual generated names

The only risk is if there are OTHER references to "Traval" in the iOS native code, but since we're regenerating fresh, those shouldn't exist.

## Related Issues

- **Android Attempt #6**: Same committed directory issue (ANDROID_ATTEMPT_6_CLEAN_COMMITTED_ANDROID.md)
- **iOS Lockfile Fix**: Previous package-lock.json sync issue (IOS_LOCKFILE_FIX.md)

## Verification Steps

When CI runs:
1. Check "Clean committed iOS directory" step shows `rm -rf ios` execution
2. Check "Generate Native iOS Project" finds NO existing ios/ directory
3. Check "Build iOS app" finds `TravalPass.xcworkspace` (not error)
4. Check xcodebuild succeeds with `TravalPass.xcworkspace -scheme TravalPass`
5. Check app bundle created at `Build/Products/Debug-iphonesimulator/TravalPass.app`

## Lessons Learned

1. **Never commit generated native directories** (`ios/`, `android/`) to git with Expo projects
2. **Clean before regenerate** in CI if directories ARE committed
3. **Consistent naming** - ensure all references match current app.json configuration
4. **Test both platforms** when applying fixes - iOS and Android often have parallel issues
5. **Search globally** - name changes affect many locations (workspace, schemes, bundles, logs)

## Next Steps

1. ✅ Applied fix to iOS workflow
2. ⏳ Commit changes with Android Attempt #6
3. ⏳ Push to trigger CI validation
4. ⏳ Verify both iOS AND Android pipelines succeed
5. ⏳ Consider adding `.gitignore` entries for `ios/` and `android/` directories (after this is working)

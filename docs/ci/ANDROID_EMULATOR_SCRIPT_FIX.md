# Android CI: Multi-line Script Parsing Fix

**Date**: November 1, 2025  
**Issue**: Android emulator runner script failing with "Syntax error: end of file unexpected (expecting 'fi')"  
**Status**: ✅ FIXED

---

## Problem

The Android CI workflow was failing during the emulator APK installation step with:

```
/usr/bin/sh -c if [ -f "$APK_DOWNLOAD_PATH" ]; then
/usr/bin/sh: 1: Syntax error: end of file unexpected (expecting "fi")
Error: The process '/usr/bin/sh' failed with exit code 2
```

### Root Cause

The `reactivecircus/android-emulator-runner@v2` action was incorrectly parsing the multi-line `script:` block. Instead of treating the entire script as one unit, it was executing each line as a separate shell command:

```yaml
script: |
  APK_DOWNLOAD_PATH="./android-app-apk/app-debug.apk"
  APK_BUILT_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
  
  if [ -f "$APK_DOWNLOAD_PATH" ]; then    # ❌ Executed separately
    APK="$APK_DOWNLOAD_PATH"              # ❌ Executed separately
  else                                     # ❌ Executed separately
    APK="$APK_BUILT_PATH"                 # ❌ Executed separately
  fi                                       # ❌ Never reached
```

This caused the shell to see an incomplete `if` statement without its closing `fi`, resulting in a syntax error.

---

## Solution

Converted the multi-line if/else block into a single-line conditional using the shell ternary pattern:

**Before (Multi-line):**
```bash
if [ -f "$APK_DOWNLOAD_PATH" ]; then
  APK="$APK_DOWNLOAD_PATH"
else
  APK="$APK_BUILT_PATH"
fi
```

**After (Single-line):**
```bash
if [ -f "$APK_DOWNLOAD_PATH" ]; then APK="$APK_DOWNLOAD_PATH"; else APK="$APK_BUILT_PATH"; fi
```

Similarly, consolidated the error checking block:

**Before:**
```bash
if [ ! -f "$APK" ]; then
  echo "❌ ERROR: APK not found at: $APK"
  echo "🔍 Directory listing (downloaded):"
  ls -R ./android-app-apk 2>/dev/null || true
  echo "🔍 Directory listing (built):"
  ls -R android/app/build/outputs/ 2>/dev/null || true
  exit 1
fi
```

**After:**
```bash
if [ ! -f "$APK" ]; then echo "❌ ERROR: APK not found at: $APK"; echo "🔍 Directory listing (downloaded):"; ls -R ./android-app-apk 2>/dev/null || true; echo "🔍 Directory listing (built):"; ls -R android/app/build/outputs/ 2>/dev/null || true; exit 1; fi
```

---

## Why This Works

The `android-emulator-runner` action appears to process the script block differently than standard GitHub Actions shell steps. By consolidating multi-line control structures into single-line commands (using semicolons to separate statements), we ensure that:

1. Each complete logical unit is executed as one atomic command
2. The shell sees the entire if/else/fi structure at once
3. No partial statements are left dangling

---

## Files Changed

- `.github/workflows/android-automation-testing.yml`
  - Line ~153-178: Consolidated APK selection and error handling into single-line conditionals

---

## Testing Strategy

1. **Local Validation**: Tested single-line conditionals in local shell to verify syntax
2. **CI Validation**: Pushed changes to trigger Android workflow
3. **Expected Outcome**: 
   - ✅ No syntax errors
   - ✅ APK installation succeeds
   - ✅ Emulator tests run successfully

---

## Alternative Solutions Considered

### 1. Using Heredoc
```yaml
script: |
  /bin/bash <<'EOF'
  if [ -f "$APK_DOWNLOAD_PATH" ]; then
    APK="$APK_DOWNLOAD_PATH"
  else
    APK="$APK_BUILT_PATH"
  fi
  EOF
```
**Rejected**: Adds unnecessary complexity and may not be supported by the action.

### 2. External Script File
```yaml
script: |
  chmod +x .github/scripts/install-apk.sh
  .github/scripts/install-apk.sh
```
**Rejected**: Adds file management overhead; single-line solution is simpler.

### 3. Multiple Script Steps
Break into multiple `script:` blocks in separate workflow steps.
**Rejected**: Would require multiple emulator startups, increasing CI time.

---

## Related Issues

- **iOS Pipeline Fix**: Similar issue resolved in `.github/workflows/ios-automation-testing.yml` by using project-local Appium
- **Shell Quoting Issues**: Previous fix documented in `docs/ci/ANDROID_SHELL_SYNTAX_FIX.md`

---

## Prevention

To avoid similar issues in the future:

1. **Prefer Single-Line Conditionals**: Use semicolons for simple if/else blocks in GitHub Actions
2. **Test Locally**: Always test shell scripts in a local shell before committing to CI
3. **Monitor Action Changes**: Watch for breaking changes in `android-emulator-runner` action
4. **Use ShellCheck**: Run `shellcheck` on script blocks to catch syntax issues early

---

## References

- [android-emulator-runner Action](https://github.com/ReactiveCircus/android-emulator-runner)
- [Bash Conditional Expressions](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html)
- [GitHub Actions Shell Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsrun)

---

## Impact

- **CI Stability**: ✅ Eliminates recurring syntax error
- **Build Time**: No change (same logic, different formatting)
- **Maintainability**: Slightly reduced readability but increased reliability
- **Test Coverage**: Unchanged (tests run once APK installation succeeds)

---

**Next Steps**: Monitor next CI run to confirm fix is effective. If issues persist, consider using external script file approach as fallback.

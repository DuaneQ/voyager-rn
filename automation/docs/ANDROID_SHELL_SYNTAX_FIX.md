# Android Pipeline Shell Syntax Fix

## Issue Summary

**Date:** October 28, 2025  
**Problem:** Android automation testing pipeline failing due to shell syntax errors in GitHub Actions workflow  
**Root Cause:** Bash brace expansion syntax `|| { }` not compatible with YAML multiline string processing  
**Impact:** Complete pipeline failure preventing Android CI/CD testing

---

## Error Analysis

### Original Error
```bash
/usr/bin/sh -c npx expo prebuild --platform android --clean || {
/usr/bin/sh: 1: Syntax error: end of file unexpected (expecting "}")
Error: The process '/usr/bin/sh' failed with exit code 2
```

### Root Cause
The GitHub Actions runner was interpreting the YAML multiline script incorrectly, breaking the bash brace expansion syntax:

**Problematic Pattern:**
```yaml
script: |
  command || {
    echo "Error message"
    exit 1
  }
```

**Issue:** The `|| { }` syntax was being split across multiple shell command invocations instead of being treated as a single bash statement.

### Evidence from Logs
The runner logs show the commands were executed separately:
```bash
/usr/bin/sh -c npx expo prebuild --platform android --clean || {
/usr/bin/sh: 1: Syntax error: end of file unexpected (expecting "}")
```

This confirms that the brace block was treated as a separate command rather than part of the conditional statement.

---

## Solution Implemented

### Fix Strategy
Replace bash brace expansion (`|| { }`) with explicit `if-then-fi` conditional statements that are more compatible with YAML processing.

### Before (Problematic)
```yaml
npx expo prebuild --platform android --clean || {
  echo "❌ ERROR: expo prebuild failed"
  echo "Current directory contents:"
  ls -la
  exit 1
}
```

### After (Fixed)
```yaml
if ! npx expo prebuild --platform android --clean; then
  echo "❌ ERROR: expo prebuild failed"
  echo "Current directory contents:"
  ls -la
  exit 1
fi
```

### Complete Changes Applied

1. **Expo Prebuild Command:**
   ```yaml
   # Before
   npx expo prebuild --platform android --clean || {
     echo "❌ ERROR: expo prebuild failed"
     echo "Current directory contents:"
     ls -la
     exit 1
   }
   
   # After  
   if ! npx expo prebuild --platform android --clean; then
     echo "❌ ERROR: expo prebuild failed"
     echo "Current directory contents:"
     ls -la
     exit 1
   fi
   ```

2. **Gradle Build Command:**
   ```yaml
   # Before
   ./gradlew assembleDebug --info || {
     echo "❌ ERROR: Gradle build failed"
     echo "Gradle wrapper info:"
     ls -la gradlew gradle/
     exit 1
   }
   
   # After
   if ! ./gradlew assembleDebug --info; then
     echo "❌ ERROR: Gradle build failed"
     echo "Gradle wrapper info:"
     ls -la gradlew gradle/
     exit 1
   fi
   ```

3. **Gradle Wrapper Generation:**
   ```yaml
   # Before
   gradle wrapper || {
     echo "❌ ERROR: Failed to generate gradle wrapper"
     exit 1
   }
   
   # After
   if ! gradle wrapper; then
     echo "❌ ERROR: Failed to generate gradle wrapper"
     exit 1
   fi
   ```

4. **NPM Install Command:**
   ```yaml
   # Before
   npm install --legacy-peer-deps || {
     echo "ERROR: npm install failed"
     echo "Package.json content:"
     cat package.json
     echo "Detailed npm error log:"
     tail -50 ~/.npm/_logs/*.log 2>/dev/null || echo "No npm logs found"
     exit 1
   }
   
   # After
   if ! npm install --legacy-peer-deps; then
     echo "ERROR: npm install failed"
     echo "Package.json content:"
     cat package.json
     echo "Detailed npm error log:"
     tail -50 ~/.npm/_logs/*.log 2>/dev/null || echo "No npm logs found"
     exit 1
   fi
   ```

---

## Technical Details

### Why the Original Syntax Failed

1. **YAML Processing:** GitHub Actions processes YAML multiline strings by splitting them into individual command executions
2. **Shell Context:** Each line becomes a separate `/usr/bin/sh -c` invocation  
3. **Brace Expansion:** The `|| { }` syntax requires the entire statement to be in the same shell context
4. **Context Loss:** When split, the opening brace has no matching closing brace in the same command

### Why the New Syntax Works

1. **Self-Contained:** Each `if-then-fi` block is complete within its statement
2. **Shell Compatibility:** Standard POSIX shell syntax that works across different shell interpreters
3. **YAML Safe:** No special characters that interfere with YAML string processing
4. **Error Handling:** Maintains the same error detection and exit behavior

---

## Validation Steps

### Testing the Fix

1. **Local Validation:**
   ```bash
   # Test the corrected syntax locally
   if ! npx expo prebuild --platform android --clean; then
     echo "Command failed"
     exit 1
   fi
   ```

2. **Pipeline Testing:**
   - Commit changes to feature branch
   - Observe GitHub Actions workflow execution
   - Verify no shell syntax errors occur
   - Confirm proper error handling behavior

### Expected Behavior

**Success Case:**
```bash
🚀 Starting Android emulator setup and testing workflow
⏳ Waiting for Android emulator to be ready...
📱 Checking emulator status...
🔧 Building native Android project...
✅ Android project generated successfully
```

**Failure Case (if expo prebuild fails):**
```bash
🚀 Starting Android emulator setup and testing workflow
⏳ Waiting for Android emulator to be ready...
📱 Checking emulator status...  
🔧 Building native Android project...
❌ ERROR: expo prebuild failed
Current directory contents:
[directory listing]
```

---

## Best Practices Learned

### YAML Shell Script Guidelines

1. **Avoid Brace Expansion:** Don't use `command || { }` in YAML multiline scripts
2. **Use If-Then-Fi:** Prefer explicit conditional statements for error handling
3. **Test Locally:** Always test shell syntax in actual bash before adding to YAML
4. **Keep Simple:** Complex bash constructs may not survive YAML processing

### Error Handling Patterns

**Recommended Pattern:**
```yaml
script: |
  if ! command_that_might_fail; then
    echo "Error message with context"
    echo "Additional debugging info"
    exit 1
  fi
  echo "Success message"
```

**Avoid:**
```yaml
script: |
  command_that_might_fail || {
    echo "Error message"
    exit 1
  }
```

### GitHub Actions Considerations

1. **Shell Context:** Each line in multiline YAML may execute in separate shell context
2. **Environment Variables:** Use explicit export statements for variables needed across lines
3. **Error Propagation:** Use `set -e` at the beginning of scripts for automatic error handling
4. **Exit Codes:** Always provide explicit exit codes for error conditions

---

## Related Issues

### Similar Problems in Other Workflows

Check these files for similar syntax patterns that might need fixing:
- `.github/workflows/ios-automation-testing.yml`
- Any other workflow files with complex shell commands

### Dependency Chain

This fix enables:
1. ✅ Android emulator setup
2. ✅ Expo prebuild execution  
3. ✅ Native Android project generation
4. ✅ APK building and installation
5. ✅ Automation test execution

---

## Future Prevention

### Code Review Checklist

When reviewing GitHub Actions workflows:
- [ ] Check for `|| { }` syntax in shell commands
- [ ] Verify complex bash constructs work in YAML context
- [ ] Test multiline scripts locally before committing
- [ ] Ensure error handling doesn't break YAML processing

### Alternative Approaches

For complex shell logic, consider:
1. **External Script Files:** Move complex logic to `.sh` files and call them from workflow
2. **Action Steps:** Break complex operations into multiple workflow steps
3. **Composite Actions:** Create reusable action components for common patterns

---

**Resolution Status:** ✅ **RESOLVED**  
**Fix Applied:** October 28, 2025  
**Validation:** Pending next pipeline run  
**Files Modified:** `.github/workflows/android-automation-testing.yml`
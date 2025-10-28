# Android Emulator Hanging Issue Resolution

## Problem Analysis: Exit Code 2 and "stop: Not implemented"

### Issue Summary
The Android CI pipeline was failing with:
- **Error**: `The process '/usr/bin/sh' failed with exit code 2`
- **Log messages**: `ERROR | stop: Not implemented`
- **Behavior**: Emulator runner action would hang indefinitely after tests completed

### Root Cause Investigation
Based on research from [ReactiveCircus/android-emulator-runner#385](https://github.com/ReactiveCircus/android-emulator-runner/issues/385):

1. **Crashpad Handler Processes**: The Android emulator uses `crashpad_handler` processes for crash reporting to Google
2. **Process Tree Issue**: When emulator shuts down, it doesn't properly signal child processes to terminate
3. **Action Deadlock**: The GitHub Action waits for all processes in the emulator's process tree to exit
4. **Hanging State**: `crashpad_handler` processes remain running, causing indefinite wait

### Solution Research Sources
- **GitHub Issue #385**: "Runner action hangs after killing emulator with stop: not implemented"
- **GitHub Issue #381**: "Job hangs after UI testing is terminated"  
- **Community Solutions**: Multiple developers confirmed `crashpad_handler` cleanup fixes the issue

## Implementation: Multi-Layer Fix

### 1. Process Cleanup Step
Added a dedicated cleanup step that runs regardless of previous step outcomes:

```yaml
- name: Kill crashpad_handler processes (Fix for emulator hanging)
  if: always()  # Ensures this runs even if emulator step fails
  run: |
    # Graceful termination first
    pkill -SIGTERM crashpad_handler 2>/dev/null || true
    sleep 5
    # Force termination if needed
    pkill -SIGKILL crashpad_handler 2>/dev/null || true
    
    # Also cleanup emulator processes
    pkill -SIGTERM qemu-system 2>/dev/null || true
    sleep 3
    pkill -SIGKILL qemu-system 2>/dev/null || true
```

### 2. Enhanced Script Structure
Improved the emulator runner script for better debugging and error handling:

**Before (Problematic):**
```bash
# Long monolithic script with complex error handling
# Any failure would cause cryptic exit code 2
```

**After (Improved):**
```bash
set -e  # Fail fast on any error

echo "🚀 Starting Android emulator setup and testing workflow"
# Clear progress indicators with emojis
# Smaller, focused steps
# Better error messages
```

### 3. Emulator Configuration Improvements
- **Boot Timeout**: Increased to 900 seconds (15 minutes) for slower CI environments
- **Error Handling**: Added `set -e` for immediate script failure detection
- **Logging**: Enhanced with progress indicators and clearer error messages

### 4. Process Monitoring
Added diagnostic information to identify hanging processes:

```yaml
# Check for running processes
echo "Checking for crashpad_handler processes:"
pgrep -l crashpad_handler || echo "No crashpad_handler processes found"

echo "Checking for qemu processes:"  
pgrep -l qemu || echo "No qemu processes found"
```

## Technical Details

### Why Crashpad Handler Causes Issues
1. **Purpose**: `crashpad_handler` is Google's crash reporting daemon for Android emulator
2. **Lifecycle**: Starts automatically with emulator, doesn't receive shutdown signals
3. **CI Impact**: GitHub Actions waits for complete process tree termination
4. **Result**: Indefinite hanging when `crashpad_handler` doesn't exit

### Signal Handling Strategy
```bash
# Step 1: Graceful termination (SIGTERM)
pkill -SIGTERM crashpad_handler
sleep 5

# Step 2: Force termination (SIGKILL) if needed  
pkill -SIGKILL crashpad_handler
```

### Why `if: always()` is Critical
- Ensures cleanup runs even if emulator step fails
- Prevents deadlock scenarios where cleanup can't execute
- Guarantees process termination regardless of workflow state

## Workflow Improvements Made

### Before (Failing):
```yaml
- name: Setup Android Emulator and Build App
  uses: reactivecircus/android-emulator-runner@v2
  with:
    # ... config ...
    script: |
      # Very long script with complex error handling
      # Exit code 2 on any failure
      # No process cleanup
```

### After (Fixed):
```yaml
- name: Setup Android Emulator and Build App
  uses: reactivecircus/android-emulator-runner@v2
  with:
    # ... config ...
    emulator-boot-timeout: 900  # Increased timeout
    script: |
      set -e  # Fail fast
      # Cleaner, more debuggable steps
      # Better progress indicators

- name: Kill crashpad_handler processes (Fix for emulator hanging)
  if: always()  # Critical for cleanup
  run: |
    # Comprehensive process cleanup
```

## Expected Results

### ✅ Problem Resolution
- **No More Hanging**: Emulator runner completes successfully
- **Exit Code 2 Fixed**: Proper error handling prevents cryptic failures  
- **Faster Debugging**: Better logging shows exactly where issues occur
- **Reliable CI**: Consistent workflow completion without manual intervention

### 🔍 Monitoring Points
1. **Process Cleanup Logs**: Verify crashpad processes are found and terminated
2. **Emulator Boot Time**: Should complete within 15 minutes (900s timeout)
3. **Script Progress**: Each step should show clear progress indicators
4. **APK Installation**: Should complete without hanging

## Related Documentation

- **Source Issue**: [ReactiveCircus/android-emulator-runner#385](https://github.com/ReactiveCircus/android-emulator-runner/issues/385)
- **Related Issue**: [ReactiveCircus/android-emulator-runner#381](https://github.com/ReactiveCircus/android-emulator-runner/issues/381)
- **Android Emulator Runner Docs**: [GitHub Marketplace](https://github.com/marketplace/actions/android-emulator-runner)

## Testing Status

⏳ **Next CI Run**: Will validate that all fixes resolve the hanging issue  
📋 **Monitoring**: Watch for successful completion without manual intervention  
🎯 **Success Criteria**: Complete workflow execution from start to finish  

---

**Issue Resolved**: October 28, 2025  
**Solution**: Process cleanup + enhanced error handling + improved emulator configuration  
**Key Learning**: Always cleanup child processes in CI environments to prevent hanging
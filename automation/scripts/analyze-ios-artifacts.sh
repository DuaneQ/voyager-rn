#!/bin/bash
# iOS CI Artifact Analyzer
# Helps diagnose why tests can't find login screen
# Usage: ./analyze-ios-artifacts.sh <path-to-extracted-artifacts>

set -e

ARTIFACT_DIR="${1:-./ios-test-results}"

if [ ! -d "$ARTIFACT_DIR" ]; then
  echo "❌ Error: Directory not found: $ARTIFACT_DIR"
  echo ""
  echo "Usage: $0 <path-to-extracted-artifacts>"
  echo "Example: $0 ./ios-test-results-123"
  echo ""
  echo "First, download and extract the artifacts from GitHub Actions:"
  echo "  1. Go to Actions → Failed Run"
  echo "  2. Scroll to Artifacts section"
  echo "  3. Download ios-test-results-*.zip"
  echo "  4. Extract: unzip ios-test-results-*.zip"
  echo "  5. Run: $0 ./ios-test-results-*"
  exit 1
fi

echo "🔍 iOS CI Artifact Analyzer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Analyzing: $ARTIFACT_DIR"
echo ""

# Detect if these are actually Android artifacts (bug in diagnostic code)
LOGCAT_FILES=$(find "$ARTIFACT_DIR" -name "*logcat*" 2>/dev/null || true)
DUMPSYS_FILES=$(find "$ARTIFACT_DIR" -name "*dumpsys*" 2>/dev/null || true)

if [ -n "$LOGCAT_FILES" ] || [ -n "$DUMPSYS_FILES" ]; then
  echo "⚠️  WARNING: ANDROID DIAGNOSTICS DETECTED IN iOS ARTIFACTS!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "This indicates a BUG in the diagnostic code - it's running"
  echo "Android commands (logcat, dumpsys) on iOS which don't work."
  echo ""
  echo "These artifacts are NOT useful for diagnosing iOS issues."
  echo ""
  echo "✅ FIX APPLIED: automation/tests/mobile/login.test.ts"
  echo "   → captureLogs() now detects platform and runs iOS-specific commands"
  echo ""
  echo "📋 After fix is deployed, artifacts will contain:"
  echo "   • logs/page-source-*.xml (iOS UI hierarchy)"
  echo "   • screenshots/*.png (actual app screenshots)"
  echo "   • logs/app-state-*.txt (iOS app state)"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Continuing analysis with limited data..."
  echo ""
fi

# 1. Check Launch State
echo "📱 1. LAUNCH STATE ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LAUNCH_SCREENSHOT="$ARTIFACT_DIR/automation/logs/launch-diagnostics/initial-state.png"
if [ -f "$LAUNCH_SCREENSHOT" ]; then
  echo "✅ Launch screenshot found: $LAUNCH_SCREENSHOT"
  echo "   → Opening screenshot..."
  open "$LAUNCH_SCREENSHOT" 2>/dev/null || echo "   (Run 'open $LAUNCH_SCREENSHOT' to view)"
else
  echo "⚠️  No launch screenshot found"
fi

APP_STATUS="$ARTIFACT_DIR/automation/logs/launch-diagnostics/app-status.txt"
if [ -f "$APP_STATUS" ]; then
  echo "✅ App status captured:"
  cat "$APP_STATUS" | grep -v "grep" | head -5
else
  echo "⚠️  No app status file"
fi
echo ""

# 2. Check for Crashes
echo "💥 2. CRASH ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CRASH_DIR="$ARTIFACT_DIR/automation/logs/crash-logs"
if [ -d "$CRASH_DIR" ] && [ "$(ls -A $CRASH_DIR 2>/dev/null)" ]; then
  echo "⚠️  CRASH LOGS FOUND!"
  echo "   App crashed during testing. Check these files:"
  ls -lh "$CRASH_DIR"
  echo ""
  echo "   First crash log preview:"
  head -30 "$CRASH_DIR"/* | head -30
  echo "   ..."
  echo "   (See full logs in: $CRASH_DIR)"
else
  echo "✅ No crash logs found (app didn't crash)"
fi
echo ""

# 3. Check Page Source Dumps
echo "🌐 3. PAGE SOURCE ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PAGE_SOURCE_FILES=$(find "$ARTIFACT_DIR/automation/logs" -name "page-source-login-fail-*.xml" 2>/dev/null || true)
if [ -n "$PAGE_SOURCE_FILES" ]; then
  echo "✅ Page source dumps found:"
  echo "$PAGE_SOURCE_FILES" | while read -r file; do
    echo "   → $file"
  done
  echo ""
  
  # Analyze first page source
  FIRST_PAGE_SOURCE=$(echo "$PAGE_SOURCE_FILES" | head -1)
  echo "   Analyzing: $FIRST_PAGE_SOURCE"
  echo ""
  
  # Check for login screen elements
  echo "   🔍 Looking for login screen elements..."
  if grep -q "login-email-input" "$FIRST_PAGE_SOURCE" 2>/dev/null; then
    echo "   ✅ Found login-email-input testID"
  else
    echo "   ❌ login-email-input testID NOT FOUND"
  fi
  
  # Check what elements ARE present
  echo ""
  echo "   📋 TestIDs/Accessibility IDs present in UI:"
  grep -o 'testID="[^"]*"' "$FIRST_PAGE_SOURCE" 2>/dev/null | head -20 || \
  grep -o 'accessibilityIdentifier="[^"]*"' "$FIRST_PAGE_SOURCE" 2>/dev/null | head -20 || \
  echo "   (No testIDs found in page source)"
  
  # Check for common screens
  echo ""
  echo "   🎯 Detecting screen type..."
  if grep -qi "splash" "$FIRST_PAGE_SOURCE" 2>/dev/null; then
    echo "   → Appears to be SPLASH SCREEN (app still loading)"
  elif grep -qi "login\|sign.*in" "$FIRST_PAGE_SOURCE" 2>/dev/null; then
    echo "   → Appears to be LOGIN SCREEN (but elements not accessible?)"
  elif grep -qi "error\|retry" "$FIRST_PAGE_SOURCE" 2>/dev/null; then
    echo "   → Appears to be ERROR SCREEN"
  elif grep -qi "home\|main" "$FIRST_PAGE_SOURCE" 2>/dev/null; then
    echo "   → Appears to be HOME SCREEN (already logged in?)"
  else
    echo "   → Unknown screen type"
  fi
  
else
  echo "⚠️  No page source dumps found"
  echo "   (Diagnostic feature may not have triggered)"
fi
echo ""

# 4. Check Test Failure Screenshots
echo "📸 4. FAILURE SCREENSHOTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SCREENSHOT_DIR="$ARTIFACT_DIR/automation/screenshots"
if [ -d "$SCREENSHOT_DIR" ] && [ "$(ls -A $SCREENSHOT_DIR 2>/dev/null)" ]; then
  echo "✅ Screenshots found:"
  ls -lh "$SCREENSHOT_DIR"
  echo ""
  echo "   Opening screenshots..."
  open "$SCREENSHOT_DIR"/*.png 2>/dev/null || \
  echo "   (Run 'open $SCREENSHOT_DIR/*.png' to view all)"
else
  echo "⚠️  No failure screenshots found"
fi
echo ""

# 5. Check App Logs
echo "📋 5. APP LOG ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
APP_LOG="$ARTIFACT_DIR/automation/logs/traval-app.log"
if [ -f "$APP_LOG" ]; then
  echo "✅ App log found: $APP_LOG"
  echo ""
  
  # Check for errors
  echo "   🔍 Searching for errors..."
  ERROR_COUNT=$(grep -ci "error\|exception\|fatal" "$APP_LOG" 2>/dev/null || echo "0")
  if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "   ⚠️  Found $ERROR_COUNT error-related lines:"
    grep -i "error\|exception\|fatal" "$APP_LOG" 2>/dev/null | head -10
    echo "   ..."
  else
    echo "   ✅ No errors found in app log"
  fi
  
  # Check for Firebase issues
  echo ""
  echo "   🔥 Checking Firebase connection..."
  if grep -qi "firebase.*error\|firebase.*fail" "$APP_LOG" 2>/dev/null; then
    echo "   ⚠️  Firebase connection issues detected:"
    grep -i "firebase" "$APP_LOG" 2>/dev/null | grep -i "error\|fail" | head -5
  else
    echo "   ✅ No Firebase errors found"
  fi
  
else
  echo "⚠️  No app log found"
fi
echo ""

# 6. Check Appium Logs
echo "🤖 6. APPIUM LOG ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
APPIUM_LOG="$ARTIFACT_DIR/automation/logs/appium-tail.log"
if [ -f "$APPIUM_LOG" ]; then
  echo "✅ Appium log found (last 200 lines)"
  echo ""
  
  # Check for connection issues
  echo "   🔍 Checking for XCUITest issues..."
  if grep -qi "xcuitest.*error\|wda.*error\|session.*fail" "$APPIUM_LOG" 2>/dev/null; then
    echo "   ⚠️  XCUITest/WDA issues found:"
    grep -i "xcuitest\|wda\|session" "$APPIUM_LOG" 2>/dev/null | grep -i "error\|fail" | head -5
  else
    echo "   ✅ No XCUITest errors"
  fi
  
  # Check for app launch issues
  echo ""
  echo "   🚀 Checking app launch..."
  if grep -qi "app.*launch.*fail\|app.*crash" "$APPIUM_LOG" 2>/dev/null; then
    echo "   ⚠️  App launch issues:"
    grep -i "launch\|crash" "$APPIUM_LOG" 2>/dev/null | tail -5
  else
    echo "   ✅ No app launch errors"
  fi
else
  echo "⚠️  No Appium log found"
fi
echo ""

# 7. Summary and Recommendations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY & RECOMMENDATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Determine most likely cause
if [ -d "$CRASH_DIR" ] && [ "$(ls -A $CRASH_DIR 2>/dev/null)" ]; then
  echo "🎯 LIKELY CAUSE: App Crash"
  echo "   → App is crashing before reaching login screen"
  echo "   → Check crash logs in: $CRASH_DIR"
  echo "   → Look for native module or Firebase initialization issues"
  echo ""
  echo "   Next Steps:"
  echo "   1. Review crash logs for stack trace"
  echo "   2. Check if it's a Firebase config issue"
  echo "   3. Verify all native modules are properly linked"
  
elif [ -n "$PAGE_SOURCE_FILES" ] && grep -qi "splash" "$(echo "$PAGE_SOURCE_FILES" | head -1)" 2>/dev/null; then
  echo "🎯 LIKELY CAUSE: App Still Loading"
  echo "   → App stuck on splash/loading screen"
  echo "   → Current wait time (45s) insufficient"
  echo ""
  echo "   Next Steps:"
  echo "   1. Increase wait time to 60-90 seconds"
  echo "   2. Add React Native bundle loading detection"
  echo "   3. Check if Metro bundler is involved"
  
elif [ -f "$APP_LOG" ] && grep -qi "firebase.*error\|firebase.*fail" "$APP_LOG" 2>/dev/null; then
  echo "🎯 LIKELY CAUSE: Firebase Configuration"
  echo "   → Firebase connection/initialization failing"
  echo "   → May be using wrong environment (prod vs dev)"
  echo ""
  echo "   Next Steps:"
  echo "   1. Verify firebase-config.js uses correct environment"
  echo "   2. Check Firebase rules allow dev access"
  echo "   3. Verify CI environment variables"
  
elif [ -n "$PAGE_SOURCE_FILES" ]; then
  echo "🎯 LIKELY CAUSE: Wrong Screen / Navigation Issue"
  echo "   → App loaded but on different screen than expected"
  echo "   → Check page source to see actual screen"
  echo ""
  echo "   Next Steps:"
  echo "   1. Review page source: $(echo "$PAGE_SOURCE_FILES" | head -1)"
  echo "   2. Check app entry point and initial route"
  echo "   3. Verify auth state detection logic"
  
else
  echo "🎯 CAUSE: Insufficient Diagnostic Data"
  echo "   → Need more information to diagnose"
  echo ""
  echo "   Next Steps:"
  echo "   1. Ensure diagnostic features are enabled"
  echo "   2. Re-run CI and download artifacts"
  echo "   3. Check if artifacts were uploaded correctly"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Analysis complete!"
echo ""
echo "For detailed investigation, see:"
echo "  • Screenshots: $SCREENSHOT_DIR"
echo "  • Logs: $ARTIFACT_DIR/automation/logs"
echo "  • Documentation: docs/ci/IOS_LOGIN_SCREEN_NOT_FOUND_FIX.md"

#!/bin/bash
# Android CI Artifact Analyzer
# Helps diagnose Android test failures
# Usage: ./analyze-android-artifacts.sh <path-to-extracted-artifacts>

set -e

ARTIFACT_DIR="${1:-./android-test-results}"

if [ ! -d "$ARTIFACT_DIR" ]; then
  echo "❌ Error: Directory not found: $ARTIFACT_DIR"
  echo ""
  echo "Usage: $0 <path-to-extracted-artifacts>"
  echo "Example: $0 ./android-test-results-123"
  echo ""
  echo "First, download and extract the artifacts from GitHub Actions:"
  echo "  1. Go to Actions → Failed Run"
  echo "  2. Scroll to Artifacts section"
  echo "  3. Download android-test-results-*.zip"
  echo "  4. Extract: unzip android-test-results-*.zip"
  echo "  5. Run: $0 ./android-test-results-*"
  exit 1
fi

echo "🔍 Android CI Artifact Analyzer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Analyzing: $ARTIFACT_DIR"
echo ""

# 1. Check logcat logs
echo "📱 1. LOGCAT ANALYSIS (Android System Logs)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LOGCAT_FILES=$(find "$ARTIFACT_DIR" -name "logcat-*.txt" 2>/dev/null || true)

if [ -n "$LOGCAT_FILES" ]; then
  echo "✅ Logcat files found:"
  echo "$LOGCAT_FILES" | while read -r file; do
    echo "   → $file"
  done
  echo ""
  
  # Analyze first logcat file
  FIRST_LOGCAT=$(echo "$LOGCAT_FILES" | head -1)
  echo "   Analyzing: $FIRST_LOGCAT"
  echo ""
  
  # Check for fatal crashes
  echo "   💥 Checking for FATAL crashes..."
  FATAL_COUNT=$(grep -c "FATAL EXCEPTION" "$FIRST_LOGCAT" 2>/dev/null || echo "0")
  if [ "$FATAL_COUNT" -gt 0 ]; then
    echo "   ⚠️  Found $FATAL_COUNT FATAL EXCEPTION(s):"
    grep -A 20 "FATAL EXCEPTION" "$FIRST_LOGCAT" 2>/dev/null | head -40
    echo "   ..."
  else
    echo "   ✅ No FATAL EXCEPTION found"
  fi
  
  # Check for React Native errors
  echo ""
  echo "   ⚛️  Checking for React Native errors..."
  RN_ERRORS=$(grep -i "ReactNative.*error\|RedBox\|JS error" "$FIRST_LOGCAT" 2>/dev/null || true)
  if [ -n "$RN_ERRORS" ]; then
    echo "   ⚠️  React Native errors found:"
    echo "$RN_ERRORS" | head -10
  else
    echo "   ✅ No React Native errors found"
  fi
  
  # Check for Firebase issues
  echo ""
  echo "   🔥 Checking for Firebase errors..."
  FIREBASE_ERRORS=$(grep -i "firebase.*error\|firebase.*fail" "$FIRST_LOGCAT" 2>/dev/null || true)
  if [ -n "$FIREBASE_ERRORS" ]; then
    echo "   ⚠️  Firebase errors found:"
    echo "$FIREBASE_ERRORS" | head -10
  else
    echo "   ✅ No Firebase errors found"
  fi
  
  # Check for Activity launch issues
  echo ""
  echo "   🚀 Checking for Activity launch issues..."
  ACTIVITY_ERRORS=$(grep -i "ActivityManager.*error\|Unable to start activity" "$FIRST_LOGCAT" 2>/dev/null || true)
  if [ -n "$ACTIVITY_ERRORS" ]; then
    echo "   ⚠️  Activity launch errors found:"
    echo "$ACTIVITY_ERRORS" | head -10
  else
    echo "   ✅ No Activity launch errors found"
  fi
  
else
  echo "⚠️  No logcat files found"
fi
echo ""

# 2. Check dumpsys activities
echo "🎯 2. ACTIVITY STATE ANALYSIS (dumpsys)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DUMPSYS_FILES=$(find "$ARTIFACT_DIR" -name "dumpsys-activities-*.txt" 2>/dev/null || true)

if [ -n "$DUMPSYS_FILES" ]; then
  echo "✅ Dumpsys files found:"
  echo "$DUMPSYS_FILES" | while read -r file; do
    echo "   → $file"
  done
  echo ""
  
  # Analyze first dumpsys file
  FIRST_DUMPSYS=$(echo "$DUMPSYS_FILES" | head -1)
  echo "   Analyzing: $FIRST_DUMPSYS"
  echo ""
  
  # Check focused activity
  echo "   🎯 Current focused activity:"
  FOCUSED=$(grep "mFocusedActivity" "$FIRST_DUMPSYS" 2>/dev/null || echo "Not found")
  if echo "$FOCUSED" | grep -q "com.voyager.rn"; then
    echo "   ✅ App is focused: $FOCUSED"
  elif echo "$FOCUSED" | grep -q "null"; then
    echo "   ❌ No activity focused (app may have crashed)"
  else
    echo "   ⚠️  Different app focused: $FOCUSED"
  fi
  
  # Check resumed activities
  echo ""
  echo "   📊 Resumed activities (active):"
  RESUMED=$(grep -A 2 "RESUMED" "$FIRST_DUMPSYS" 2>/dev/null | head -10 || echo "None found")
  echo "$RESUMED"
  
  # Check task stack
  echo ""
  echo "   📚 Task stack (navigation history):"
  grep -A 5 "TaskRecord" "$FIRST_DUMPSYS" 2>/dev/null | head -20 || echo "   Task stack not found"
  
else
  echo "⚠️  No dumpsys files found"
fi
echo ""

# 3. Check current package
echo "📦 3. CURRENT PACKAGE ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PACKAGE_FILES=$(find "$ARTIFACT_DIR" -name "current-package-*.txt" 2>/dev/null || true)

if [ -n "$PACKAGE_FILES" ]; then
  echo "✅ Package files found:"
  echo "$PACKAGE_FILES" | while read -r file; do
    PACKAGE_CONTENT=$(cat "$file" 2>/dev/null || echo "Failed to read")
    echo "   → $file: $PACKAGE_CONTENT"
    
    if echo "$PACKAGE_CONTENT" | grep -q "com.voyager.rn"; then
      echo "      ✅ Correct package in foreground"
    else
      echo "      ⚠️  Unexpected package or error"
    fi
  done
else
  echo "⚠️  No package files found"
fi
echo ""

# 4. Check screenshots
echo "📸 4. SCREENSHOT ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SCREENSHOT_FILES=$(find "$ARTIFACT_DIR" -name "*.png" 2>/dev/null || true)

if [ -n "$SCREENSHOT_FILES" ]; then
  echo "✅ Screenshots found:"
  echo "$SCREENSHOT_FILES" | while read -r file; do
    echo "   → $file"
  done
  echo ""
  echo "   Opening screenshots..."
  echo "$SCREENSHOT_FILES" | while read -r file; do
    open "$file" 2>/dev/null || echo "   (Run 'open $file' to view)"
  done
else
  echo "⚠️  No screenshots found"
fi
echo ""

# 5. Check page source (if captured)
echo "🌐 5. PAGE SOURCE ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PAGE_SOURCE_FILES=$(find "$ARTIFACT_DIR" -name "page-source-*.xml" 2>/dev/null || true)

if [ -n "$PAGE_SOURCE_FILES" ]; then
  echo "✅ Page source files found:"
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
  
  # Check for resource-ids (Android equivalent of testID)
  echo ""
  echo "   📋 Resource IDs present:"
  grep -o 'resource-id="[^"]*"' "$FIRST_PAGE_SOURCE" 2>/dev/null | head -20 || echo "   (None found)"
  
else
  echo "⚠️  No page source files found"
  echo "   (Page source capture may not be enabled for Android tests)"
fi
echo ""

# 6. Summary and Recommendations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY & RECOMMENDATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Determine most likely cause
if [ -n "$LOGCAT_FILES" ]; then
  FIRST_LOGCAT=$(echo "$LOGCAT_FILES" | head -1)
  
  if grep -q "FATAL EXCEPTION" "$FIRST_LOGCAT" 2>/dev/null; then
    echo "🎯 LIKELY CAUSE: App Crash (Fatal Exception)"
    echo "   → App crashed before reaching login screen"
    echo "   → Check FATAL EXCEPTION stack trace in logcat"
    echo ""
    echo "   Next Steps:"
    echo "   1. Review full stack trace in logcat file"
    echo "   2. Look for specific exception type (NullPointerException, etc.)"
    echo "   3. Check if it's native or JS error"
    echo "   4. Verify Firebase configuration"
    
  elif grep -qi "unable to load script\|could not connect to development server" "$FIRST_LOGCAT" 2>/dev/null; then
    echo "🎯 LIKELY CAUSE: JS Bundle Loading Failed"
    echo "   → React Native bundle not loaded"
    echo "   → Metro bundler connection issue"
    echo ""
    echo "   Next Steps:"
    echo "   1. Verify APK includes bundled JS (not dev mode)"
    echo "   2. Check if Metro port is blocked in CI"
    echo "   3. Ensure prebuild creates production bundle"
    
  elif grep -qi "firebase.*error" "$FIRST_LOGCAT" 2>/dev/null; then
    echo "🎯 LIKELY CAUSE: Firebase Configuration"
    echo "   → Firebase initialization failing"
    echo "   → google-services.json issue"
    echo ""
    echo "   Next Steps:"
    echo "   1. Verify google-services.json is correct for environment"
    echo "   2. Check Firebase project configuration"
    echo "   3. Ensure Firebase SDK versions are compatible"
    
  elif [ -n "$DUMPSYS_FILES" ]; then
    FIRST_DUMPSYS=$(echo "$DUMPSYS_FILES" | head -1)
    if grep -q "mFocusedActivity=null" "$FIRST_DUMPSYS" 2>/dev/null; then
      echo "🎯 LIKELY CAUSE: Activity Not Launched"
      echo "   → Main activity not starting"
      echo "   → AndroidManifest.xml issue"
      echo ""
      echo "   Next Steps:"
      echo "   1. Check AndroidManifest.xml main activity configuration"
      echo "   2. Verify intent filters are correct"
      echo "   3. Check for permission issues"
    else
      echo "🎯 LIKELY CAUSE: Timing / Synchronization Issue"
      echo "   → App may still be loading"
      echo "   → Need more wait time before tests"
      echo ""
      echo "   Next Steps:"
      echo "   1. Increase wait times in test setup"
      echo "   2. Add explicit waits for app initialization"
      echo "   3. Check if splash screen is showing"
    fi
  else
    echo "🎯 CAUSE: Insufficient Diagnostic Data"
    echo "   → Need more information"
    echo ""
    echo "   Next Steps:"
    echo "   1. Ensure diagnostics are enabled"
    echo "   2. Re-run CI and download artifacts"
  fi
else
  echo "🎯 CAUSE: No Diagnostic Files Found"
  echo "   → Artifacts may not have been uploaded"
  echo "   → Build may have failed before tests ran"
  echo ""
  echo "   Next Steps:"
  echo "   1. Check if build step completed"
  echo "   2. Verify artifact upload step ran"
  echo "   3. Check for earlier failures in CI log"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Analysis complete!"
echo ""
echo "For detailed investigation, see:"
echo "  • Logs: $ARTIFACT_DIR/logs/"
echo "  • Screenshots: $ARTIFACT_DIR/screenshots/"
echo "  • Documentation: docs/ci/ANDROID_CI_SYNTAX_AND_DIAGNOSTICS_FIX.md"

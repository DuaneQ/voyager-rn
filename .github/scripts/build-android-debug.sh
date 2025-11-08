#!/bin/bash
# Build Android APK with comprehensive error capture
# This script ensures Gradle actually builds and doesn't skip due to "up-to-date" checks

set -e  # Exit on first error

echo "=========================================="
echo "🏗️ Android APK Build Script"
echo "=========================================="
echo ""

# Navigate to android directory
cd android || { echo "❌ ERROR: android directory not found"; exit 1; }

# Ensure Gradle picks up repo-provided init scripts
export GRADLE_USER_HOME="$(pwd)/gradle-user-home"
mkdir -p "$GRADLE_USER_HOME/init.d"

# Make gradlew executable
chmod +x gradlew

echo "🔍 Step 1: Verify Gradle wrapper..."
./gradlew --version || {
  echo "❌ ERROR: Gradle wrapper verification failed"
  exit 1
}
echo "✅ Gradle wrapper OK"
echo ""

echo "🧹 Step 2: Clean all build artifacts to force fresh build..."
./gradlew clean --info 2>&1 | tail -20
echo "✅ Clean complete"
echo ""

echo "🔍 Step 3: List all Gradle projects..."
./gradlew projects || {
  echo "⚠️ WARNING: Could not list projects"
}
echo ""

echo "🔍 Step 4: Check if expo-modules-core is accessible..."
if ./gradlew :app:dependencies --configuration debugRuntimeClasspath 2>&1 | grep -q "expo-modules-core"; then
  echo "✅ expo-modules-core found in dependencies"
else
  echo "⚠️ WARNING: expo-modules-core not found in dependencies tree"
fi
echo ""

echo "🚀 Step 5: Build APK with detailed logging..."
echo "Command: ./gradlew :app:assembleDebug --info --stacktrace --no-daemon"
echo ""

# Build with explicit task, detailed logging, and no daemon to avoid caching issues
# Capture ALL output to log file AND display to console
./gradlew :app:assembleDebug \
  --info \
  --stacktrace \
  --no-daemon \
  --rerun-tasks \
  2>&1 | tee gradle-build-full.log

BUILD_EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "=========================================="
echo "📊 Build Result"
echo "=========================================="
echo "Exit code: $BUILD_EXIT_CODE"

if [ $BUILD_EXIT_CODE -ne 0 ]; then
  echo "❌ BUILD FAILED"
  echo ""
  echo "=========================================="
  echo "🔍 ERROR ANALYSIS"
  echo "=========================================="
  echo ""
  
  echo "📋 Last 100 lines of build output:"
  tail -100 gradle-build-full.log
  echo ""
  
  echo "📋 All ERROR lines:"
  grep -i "error" gradle-build-full.log | head -50 || echo "No ERROR lines found"
  echo ""
  
  echo "📋 All FAILURE lines:"
  grep -i "failure" gradle-build-full.log | head -50 || echo "No FAILURE lines found"
  echo ""
  
  echo "📋 All EXCEPTION lines:"
  grep -i "exception" gradle-build-full.log | head -50 || echo "No EXCEPTION lines found"
  echo ""
  
  echo "📋 Checking build.gradle syntax:"
  head -20 app/build.gradle
  echo ""
  
  echo "📋 Checking settings.gradle:"
  cat settings.gradle
  echo ""
  
  exit 1
fi

echo "✅ BUILD SUCCEEDED"
echo ""

echo "=========================================="
echo "🔍 Verifying APK Creation"
echo "=========================================="

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
  echo "✅ APK found at: $APK_PATH"
  ls -lh "$APK_PATH"
  
  # Show APK details
  echo ""
  echo "📋 APK Details:"
  if [ -f "app/build/outputs/apk/debug/output-metadata.json" ]; then
    cat app/build/outputs/apk/debug/output-metadata.json
  fi
  
  exit 0
else
  echo "❌ ERROR: APK not found at: $APK_PATH"
  echo ""
  echo "🔍 Directory structure:"
  ls -R app/build/outputs/ 2>/dev/null || echo "build/outputs directory not found"
  echo ""
  echo "🔍 Searching for any APK files..."
  find app/build -name "*.apk" -type f 2>/dev/null || echo "No APK files found"
  echo ""
  echo "📋 Build task output:"
  grep -i "assemble\|build.*apk" gradle-build-full.log | tail -50
  exit 1
fi

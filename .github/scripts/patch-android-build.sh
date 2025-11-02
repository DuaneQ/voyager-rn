#!/bin/bash
# Patch android/app/build.gradle to include ExpoModulesCorePlugin if missing

set -e

BUILD_GRADLE="android/app/build.gradle"

echo "🔍 Checking if ExpoModulesCorePlugin is applied in $BUILD_GRADLE..."

if grep -q "ExpoModulesCorePlugin.gradle" "$BUILD_GRADLE"; then
  echo "✅ ExpoModulesCorePlugin already applied"
  exit 0
fi

echo "⚠️ ExpoModulesCorePlugin not found - patching build.gradle..."

# Find the line number where we need to insert
LINE_NUM=$(grep -n 'apply plugin: "com.facebook.react"' "$BUILD_GRADLE" | cut -d: -f1)

if [ -z "$LINE_NUM" ]; then
  echo "❌ ERROR: Could not find 'com.facebook.react' plugin line"
  exit 1
fi

# Create backup
cp "$BUILD_GRADLE" "$BUILD_GRADLE.backup"

# Use a simpler, more reliable path resolution for CI
# The path from android/app directory is: ../../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
{
  head -n "$LINE_NUM" "$BUILD_GRADLE"
  echo ""
  echo "// Apply Expo modules plugin"
  echo "apply from: new File(rootDir, '../../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle')"
  tail -n +"$((LINE_NUM + 1))" "$BUILD_GRADLE"
} > "$BUILD_GRADLE.new"

# Replace original with patched version
mv "$BUILD_GRADLE.new" "$BUILD_GRADLE"

echo "✅ Successfully patched $BUILD_GRADLE"
echo ""
echo "First 10 lines of patched file:"
head -10 "$BUILD_GRADLE"

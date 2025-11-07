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

# Use a simpler, more reliable path resolution for CI. Prefer the installed
# package path under node_modules, but if that file is missing (common in
# transient CI failures), fall back to the repository-local helper in
# .github/gradle-helpers so the generated build.gradle refers to an existing
# file. This avoids Gradle errors that occur when the apply-from file doesn't
# exist.
INSTALLED_PATH='../../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle'
FALLBACK_PATH='../../.github/gradle-helpers/ExpoModulesCorePlugin.gradle'

APPLY_LINE_INSTALLED="apply from: new File(rootDir, '${INSTALLED_PATH}')"
APPLY_LINE_FALLBACK="apply from: new File(rootDir, '${FALLBACK_PATH}') // (patched by CI fallback)"

{
  head -n "$LINE_NUM" "$BUILD_GRADLE"
  echo ""
  echo "// Apply Expo modules plugin"
  if [ -f "$(dirname "$BUILD_GRADLE")/${INSTALLED_PATH}" ]; then
    echo "$APPLY_LINE_INSTALLED"
  else
    echo "$APPLY_LINE_FALLBACK"
  fi
  tail -n +"$((LINE_NUM + 1))" "$BUILD_GRADLE"
} > "$BUILD_GRADLE.new"

# Replace original with patched version
mv "$BUILD_GRADLE.new" "$BUILD_GRADLE"

echo "✅ Successfully patched $BUILD_GRADLE"
echo ""
echo "First 10 lines of patched file:"
head -10 "$BUILD_GRADLE"

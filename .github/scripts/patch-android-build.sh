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

# Create a repo-local copy inside the generated android/ directory so Gradle
# can always reference a local file that exists during the Gradle evaluation
# phase. This is more robust than pointing only at node_modules which can be
# missing or reinstalled between steps in CI.

# Destination paths for the fallback helper
# Gradle will look for ../expo-gradle-helpers/ExpoModulesCorePlugin.gradle relative to android/
# so place a copy at the repository root: ./expo-gradle-helpers/
REPO_HELPER_DIR="expo-gradle-helpers"
REPO_HELPER_FILE="$REPO_HELPER_DIR/ExpoModulesCorePlugin.gradle"

# Also keep a copy under android/ so we cover both resolution strategies
ANDROID_HELPER_DIR="android/expo-gradle-helpers"
ANDROID_HELPER_FILE="$ANDROID_HELPER_DIR/ExpoModulesCorePlugin.gradle"

# Source fallback in the repo
REPO_FALLBACK_SOURCE=".github/gradle-helpers/ExpoModulesCorePlugin.gradle"

# Ensure repository-level helper exists
mkdir -p "$REPO_HELPER_DIR" || true
if [ -f "$REPO_FALLBACK_SOURCE" ]; then
  cp "$REPO_FALLBACK_SOURCE" "$REPO_HELPER_FILE"
  echo "Copied repo fallback to: $REPO_HELPER_FILE"
else
  echo "Warning: repo fallback $REPO_FALLBACK_SOURCE not found; proceeding without repo-level copy"
fi

# Also attempt to place a copy inside android/ for legacy lookup
mkdir -p "$ANDROID_HELPER_DIR" || true
if [ -f "$REPO_FALLBACK_SOURCE" ]; then
  cp "$REPO_FALLBACK_SOURCE" "$ANDROID_HELPER_FILE"
  echo "Also copied repo fallback to: $ANDROID_HELPER_FILE"
else
  echo "Warning: repo fallback $REPO_FALLBACK_SOURCE not found; proceeding without android-level copy"
fi

# Groovy-level apply logic: prefer node_modules path if available, otherwise
# use the local copy placed under android/expo-gradle-helpers.
APPLY_GROOVY='// Apply Expo modules plugin (patched by CI)
def installedPlugin = new File(rootDir, "../../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle")
def repoFallback = new File(rootDir, "../expo-gradle-helpers/ExpoModulesCorePlugin.gradle")
if (installedPlugin.exists()) {
  apply from: installedPlugin
} else if (repoFallback.exists()) {
  apply from: repoFallback
} else {
  throw new GradleException("ExpoModulesCorePlugin.gradle not found in node_modules or repo fallback: ${installedPlugin}, ${repoFallback}")
}'

{
  head -n "$LINE_NUM" "$BUILD_GRADLE"
  echo ""
  echo "$APPLY_GROOVY"
  tail -n +"$((LINE_NUM + 1))" "$BUILD_GRADLE"
} > "$BUILD_GRADLE.new"

# Replace original with patched version
mv "$BUILD_GRADLE.new" "$BUILD_GRADLE"

echo "✅ Successfully patched $BUILD_GRADLE"
echo ""
echo "First 10 lines of patched file:"
head -10 "$BUILD_GRADLE"

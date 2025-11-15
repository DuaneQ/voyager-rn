#!/bin/bash
# Patch android/app/build.gradle to include ExpoModulesCorePlugin if missing

set -e

BUILD_GRADLE="android/app/build.gradle"

echo "🔍 Checking if ExpoModulesCorePlugin is applied in $BUILD_GRADLE..."

if grep -q "ExpoModulesCorePlugin.gradle" "$BUILD_GRADLE"; then
  echo "✅ ExpoModulesCorePlugin already applied in $BUILD_GRADLE"
else
  echo "⚠️ ExpoModulesCorePlugin not found - patching $BUILD_GRADLE..."

  # Find the line number where we need to insert
  LINE_NUM=$(grep -n 'apply plugin: "com.facebook.react"' "$BUILD_GRADLE" | cut -d: -f1)

  if [ -z "$LINE_NUM" ]; then
    echo "❌ ERROR: Could not find 'com.facebook.react' plugin line in $BUILD_GRADLE"
    exit 1
  fi

  # Create backup
  cp "$BUILD_GRADLE" "$BUILD_GRADLE.backup"

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
fi

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

echo "✅ Patch script finished (no node_modules modifications performed)."

# Additionally, some node modules declare the expo plugin using the plugins { id 'expo-module-gradle-plugin' }
# block at the top of their Android build.gradle files. The plugins DSL triggers Gradle plugin
# resolution early and fails when the plugin id isn't available. As a safer alternative to the
# plugins DSL we replace that plugins { ... } block with an apply-from that sources the
# ExpoModulesCorePlugin helper and then apply the plugin class defined by that helper.
# This keeps the module's android {} block intact while avoiding the early plugin resolution step.

echo "\n🔍 Scanning node_modules for build.gradle files that reference expo-module-gradle-plugin..."
FOUND_FILES=$(grep -rl "expo-module-gradle-plugin" node_modules || true)
if [ -z "$FOUND_FILES" ]; then
  echo "No node_module build.gradle files referenced expo-module-gradle-plugin"
else
  echo "Patching files found under node_modules (safe apply-from + apply plugin)..."
  echo "$FOUND_FILES"
  while IFS= read -r f; do
    # Only operate on groovy build.gradle files (not .kts). Create a backup first.
    if [[ "$f" == *.kts ]]; then
      echo "Skipping Kotlin DSL file: $f"
      continue
    fi
    echo "- Patching $f"
    cp "$f" "$f.bak"
    # Replace the plugins { ... } block that references expo-module-gradle-plugin with
    # an apply from to the repo helper and then apply the plugin class provided by that file.
    perl -0777 -pe "s/plugins\s*\{[^\}]*expo-module-gradle-plugin[^\}]*\}/apply from: rootProject.file('expo-gradle-helpers\/ExpoModulesCorePlugin.gradle')\napply plugin: KotlinExpoModulesCorePlugin/s" "$f.bak" > "$f" || {
      echo "Warning: failed to patch $f; restoring backup"
      mv "$f.bak" "$f"
    }
  done <<< "$FOUND_FILES"
  echo "Node module patches complete. Backups created with .bak suffix."
fi

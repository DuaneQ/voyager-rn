#!/bin/bash
# Script to help gather diagnostic information from GitHub Actions logs
# Run this locally to check what expo prebuild actually generates

set -e

echo "🔍 Android Build Diagnostic Script"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ ERROR: Not in project root directory"
  echo "Please run from voyager-RN directory"
  exit 1
fi

echo "📦 Step 1: Checking current Android directory state"
echo "======================================"
if [ -d "android" ]; then
  echo "✅ android/ directory exists"
  echo ""
  echo "📄 Checking settings.gradle:"
  if [ -f "android/settings.gradle" ]; then
    echo "✅ settings.gradle exists"
    echo ""
    echo "Content:"
    cat android/settings.gradle
    echo ""
    
    if grep -q "ExpoModulesCorePlugin" android/settings.gradle; then
      echo "✅ ExpoModulesCorePlugin found in settings.gradle"
    else
      echo "⚠️  ExpoModulesCorePlugin NOT found in settings.gradle"
    fi
  else
    echo "❌ settings.gradle not found"
  fi
  
  echo ""
  echo "📄 Checking app/build.gradle (first 20 lines):"
  if [ -f "android/app/build.gradle" ]; then
    echo "✅ app/build.gradle exists"
    echo ""
    echo "Content:"
    head -20 android/app/build.gradle
    echo ""
    
    if grep -q "ExpoModulesCorePlugin" android/app/build.gradle; then
      echo "⚠️  ExpoModulesCorePlugin found in app/build.gradle (WRONG LOCATION)"
    else
      echo "✅ ExpoModulesCorePlugin not in app/build.gradle (correct)"
    fi
  else
    echo "❌ app/build.gradle not found"
  fi
else
  echo "⚠️  android/ directory does not exist"
  echo "Need to run expo prebuild first"
fi

echo ""
echo "📦 Step 2: Checking expo-modules-core"
echo "======================================"
if [ -d "node_modules/expo-modules-core" ]; then
  echo "✅ expo-modules-core installed"
  
  if [ -d "node_modules/expo-modules-core/android" ]; then
    echo "✅ expo-modules-core/android exists"
    
    if [ -f "node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle" ]; then
      echo "✅ ExpoModulesCorePlugin.gradle exists"
      echo ""
      echo "Plugin file location:"
      ls -la node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle
    else
      echo "❌ ExpoModulesCorePlugin.gradle NOT found"
    fi
  else
    echo "❌ expo-modules-core/android NOT found"
  fi
  
  echo ""
  echo "📦 expo-modules-core version:"
  cat node_modules/expo-modules-core/package.json | grep '"version"' | head -1
else
  echo "❌ expo-modules-core NOT installed"
  echo "Run: npm install --legacy-peer-deps"
fi

echo ""
echo "📦 Step 3: Testing expo prebuild (DRY RUN)"
echo "======================================"
echo "This will show what prebuild WOULD generate without actually doing it"
echo ""

# Clean android dir for fresh test
if [ -d "android" ]; then
  echo "⚠️  Removing existing android/ directory for clean test..."
  rm -rf android
fi

echo "🚀 Running: npx expo prebuild --platform android --dry-run"
echo ""

npx expo prebuild --platform android --dry-run 2>&1 | tee prebuild-dryrun.log || {
  echo "❌ Dry run failed"
  echo "Check prebuild-dryrun.log for details"
}

echo ""
echo "📊 Step 4: Summary & Recommendations"
echo "======================================"
echo ""

if [ -f "prebuild-dryrun.log" ]; then
  if grep -q "ExpoModulesCorePlugin" prebuild-dryrun.log; then
    echo "✅ Expo prebuild mentions ExpoModulesCorePlugin"
  else
    echo "⚠️  Expo prebuild doesn't mention ExpoModulesCorePlugin"
  fi
fi

echo ""
echo "📋 Next Steps:"
echo "1. Review the output above"
echo "2. Check if settings.gradle has ExpoModulesCorePlugin after prebuild"
echo "3. If NOT, we need to patch settings.gradle (not app/build.gradle)"
echo "4. Share this output with the team"
echo ""
echo "💾 Logs saved to: prebuild-dryrun.log"

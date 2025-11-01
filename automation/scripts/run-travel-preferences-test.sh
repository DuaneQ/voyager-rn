#!/bin/bash

# Script to run Travel Preferences E2E test
# Usage: ./scripts/run-travel-preferences-test.sh [ios|android]

PLATFORM="${1:-ios}"

echo "🚀 Starting Travel Preferences E2E Test on $PLATFORM..."
echo ""

# Check if app is built
if [ "$PLATFORM" = "ios" ]; then
  APP_PATH="../ios/build/Build/Products/Debug-iphonesimulator/VoyagerRN.app"
  if [ ! -d "$APP_PATH" ]; then
    echo "❌ iOS app not found at $APP_PATH"
    echo "Please build the app first: cd ios && xcodebuild -workspace VoyagerRN.xcworkspace -scheme VoyagerRN -configuration Debug -sdk iphonesimulator -derivedDataPath build"
    exit 1
  fi
elif [ "$PLATFORM" = "android" ]; then
  APP_PATH="../android/app/build/outputs/apk/debug/app-debug.apk"
  if [ ! -f "$APP_PATH" ]; then
    echo "❌ Android APK not found at $APP_PATH"
    echo "Please build the app first: cd android && ./gradlew assembleDebug"
    exit 1
  fi
fi

echo "✅ App found, starting test..."
echo ""

# Set platform environment variable
export PLATFORM="$PLATFORM"

# Run specific test file
npx wdio run wdio.mobile.conf.ts --spec tests/mobile/travel-preferences-success.test.ts

echo ""
echo "✅ Travel Preferences E2E Test complete!"
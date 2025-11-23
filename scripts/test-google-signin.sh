#!/bin/bash

# Google Sign-In Testing Helper Script
# Prepares and launches the app on a physical Android device

set -e

echo "🚀 Google Sign-In Testing Helper"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ADB is available
if ! command -v adb &> /dev/null; then
    echo -e "${RED}❌ Error: ADB not found${NC}"
    echo "Please install Android SDK and add to PATH"
    exit 1
fi

echo "📱 Step 1: Checking for connected devices..."
echo ""

# Kill and restart ADB to ensure clean state
adb kill-server > /dev/null 2>&1
sleep 1
adb start-server > /dev/null 2>&1

# Get list of connected devices
DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No devices connected${NC}"
    echo ""
    echo "Please connect your Android device via USB and:"
    echo "  1. Enable Developer Mode (tap Build Number 7 times)"
    echo "  2. Enable USB Debugging in Developer Options"
    echo "  3. Allow USB debugging when prompted on device"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo -e "${GREEN}✅ Found $DEVICES device(s) connected${NC}"
echo ""
adb devices
echo ""

# Ask user to confirm
echo "📋 This script will:"
echo "  1. Build the app with native Google Sign-In module"
echo "  2. Install it on your connected device"
echo "  3. Launch the app"
echo ""
echo "⏱️  First build takes 5-10 minutes (subsequent builds: 1-2 min)"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "🔨 Step 2: Building and installing app..."
echo ""
echo -e "${YELLOW}This may take several minutes on first run...${NC}"
echo ""

# Build and run on device
npx expo run:android --device

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "📱 The app should now be running on your device."
echo ""
echo "🧪 Test Scenarios:"
echo "  1. New user Sign In → Should show error and switch to Register"
echo "  2. Existing user Sign Up → Should login without duplicate profile"
echo "  3. New user Sign Up → Should create profile and login"
echo "  4. Existing user Sign In → Should login normally"
echo ""
echo "🔍 Verify in Firestore Console:"
echo "  https://console.firebase.google.com/"
echo "  → mundo1-dev → Firestore → users collection"
echo ""
echo "📝 For detailed testing guide, see:"
echo "  docs/auth/TESTING_GOOGLE_SIGNIN_ON_DEVICE.md"
echo ""
echo -e "${GREEN}Happy testing! 🎉${NC}"

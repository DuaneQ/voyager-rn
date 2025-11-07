#!/usr/bin/env bash
# Simple project helper to check Android SDK/ADB/Emulator availability and common fixes
# Run from project root: bash scripts/check-android-env.sh

set -euo pipefail

SDK_DIR="$HOME/Library/Android/sdk"
EMULATOR_BIN="$SDK_DIR/emulator/emulator"
ADB_BIN="$SDK_DIR/platform-tools/adb"
SDKMANAGER_BIN="$SDK_DIR/cmdline-tools/latest/bin/sdkmanager"

echo "Checking Android SDK dir: $SDK_DIR"
if [ ! -d "$SDK_DIR" ]; then
  echo "ERROR: Android SDK not found at $SDK_DIR"
  exit 2
fi

echo
echo "1) Environment"
printenv ANDROID_SDK_ROOT || echo "ANDROID_SDK_ROOT not set"

echo
echo "2) Tools availability"
if command -v adb >/dev/null 2>&1; then
  echo "adb on PATH: $(command -v adb) -- $(adb --version | head -n1)"
else
  echo "adb not on PATH. Will try SDK path: $ADB_BIN"
fi

if [ -x "$EMULATOR_BIN" ]; then
  echo "emulator binary present: $EMULATOR_BIN"
else
  echo "emulator binary NOT present at $EMULATOR_BIN"
fi

if [ -x "$SDKMANAGER_BIN" ]; then
  echo "sdkmanager present: $SDKMANAGER_BIN"
fi

echo
echo "3) List AVDs (via emulator binary if available)"
if [ -x "$EMULATOR_BIN" ]; then
  "$EMULATOR_BIN" -list-avds || echo "No AVDs or emulator binary couldn't list AVDs"
else
  echo "Cannot list AVDs because emulator binary is not executable or not found"
fi

echo
echo "4) adb devices (via SDK path if adb not on PATH)"
if command -v adb >/dev/null 2>&1; then
  adb devices -l
elif [ -x "$ADB_BIN" ]; then
  "$ADB_BIN" devices -l
else
  echo "adb not found. Add $SDK_DIR/platform-tools to PATH"
fi

cat <<'EOF'

If you see that emulator/adb are not on PATH, add to ~/.zshrc (macOS):

export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"

Then run: source ~/.zshrc

To create an AVD, open Android Studio -> Device Manager -> Create Virtual Device.
To start an AVD from the CLI (once created):

$HOME/Library/Android/sdk/emulator/emulator -avd <AVD_NAME> -no-window -no-audio -no-boot-anim

EOF

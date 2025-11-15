#!/usr/bin/env bash
set -euo pipefail

# Tiny helper to start an Android AVD and wait until it's online for Expo
# Usage: ./scripts/start-android-emulator.sh [AVD_NAME]
# If no AVD_NAME is provided the script uses the first entry from `emulator -list-avds`.

DEFAULT_TIMEOUT=300
SLEEP_INTERVAL=2

AVD_NAME="${1-}"

ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="${ADB:-$ANDROID_HOME/platform-tools/adb}"
EMULATOR_BIN="${EMULATOR_BIN:-$ANDROID_HOME/emulator/emulator}"

if [ ! -x "$ADB" ]; then
  if command -v adb >/dev/null 2>&1; then
    ADB="$(command -v adb)"
  else
    echo "Error: adb not found. Please ensure Android SDK platform-tools are installed and on PATH." >&2
    exit 2
  fi
fi

if [ ! -x "$EMULATOR_BIN" ]; then
  if command -v emulator >/dev/null 2>&1; then
    EMULATOR_BIN="$(command -v emulator)"
  else
    echo "Error: emulator binary not found. Please ensure Android SDK emulator is installed." >&2
    exit 2
  fi
fi

if [ -z "$AVD_NAME" ]; then
  AVD_NAME="$($EMULATOR_BIN -list-avds | sed -n '1p' || true)"
fi

if [ -z "$AVD_NAME" ]; then
  echo "No AVD name specified and no AVDs found. Run '$EMULATOR_BIN -list-avds' to see available AVDs." >&2
  exit 3
fi

echo "Using AVD: $AVD_NAME"

# If an emulator with that AVD is already running and online, reuse it.
echo "Checking running emulators..."
RUNNING_SERIALS=$("$ADB" devices -l | awk '/emulator-/{print $1 ":" $2}' || true)
if echo "$RUNNING_SERIALS" | grep -q "device"; then
  if echo "$RUNNING_SERIALS" | grep -E ":device" >/dev/null 2>&1; then
    echo "Found at least one emulator already online. Listing devices:"
    "$ADB" devices -l
    # proceed but still ensure target AVD is present
  fi
fi

# Start the AVD if not already running
AVD_RUNNING=$($EMULATOR_BIN -list-avds | grep -x "$AVD_NAME" >/dev/null 2>&1 && $ADB devices -l | awk '/emulator-/{print}' | grep -q "$AVD_NAME" >/dev/null 2>&1 && echo yes || echo no || true)

# We can't reliably detect AVD name from adb output in all cases; just start a new instance if there is no online emulator
ONLINE_COUNT=$($ADB devices | awk 'NR>1 && $2=="device"{count++}END{print count+0}')
if [ "$ONLINE_COUNT" -eq 0 ]; then
  echo "No online emulator detected. Starting AVD '$AVD_NAME'..."
  LOGFILE="/tmp/emulator-${AVD_NAME}.log"
  mkdir -p "$(dirname "$LOGFILE")"
  nohup "$EMULATOR_BIN" -avd "$AVD_NAME" -netdelay none -netspeed full > "$LOGFILE" 2>&1 &
  EMU_PID=$!
  echo "Emulator started (PID=$EMU_PID). Log: $LOGFILE"
else
  echo "At least one emulator already online. If you want to force a fresh emulator, shut existing ones down first."
fi

echo "Waiting for emulator to be listed as 'device' by adb... (timeout ${DEFAULT_TIMEOUT}s)"
START_TS=$(date +%s)
while true; do
  # look for any emulator serial that is 'device'
  if "$ADB" devices -l | awk '/emulator-/{ if ($2=="device") { print $1; exit 0 } }' | grep -q .; then
    echo "Emulator is online."
    break
  fi
  NOW=$(date +%s)
  if [ $((NOW - START_TS)) -ge $DEFAULT_TIMEOUT ]; then
    echo "Timed out waiting for emulator to become online after ${DEFAULT_TIMEOUT}s" >&2
    echo "Last 'adb devices -l' output:" >&2
    "$ADB" devices -l >&2 || true
    exit 4
  fi
  sleep $SLEEP_INTERVAL
done

echo "Attempting to reverse common Expo ports for emulator (8081, 8082, 8083)"
for p in 8081 8082 8083; do
  if "$ADB" reverse tcp:$p tcp:$p 2>/dev/null; then
    echo "Reversed tcp:$p -> tcp:$p"
  else
    echo "adb reverse tcp:$p failed or already set (may be fine)"
  fi
done

echo "Current adb reverse list:"
"$ADB" reverse --list 2>/dev/null || echo "(no reverse mappings or command not supported)"

echo "Done — emulator ready. Current devices:"
"$ADB" devices -l
echo "If you need to start Expo, run: expo start --android (or npx expo start and press 'a')"

exit 0

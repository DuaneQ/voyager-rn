#!/bin/bash
# Quick script to run integration tests with Firebase Emulators
# Usage: ./scripts/run-integration-tests.sh

set -e

echo "🚀 Starting Firebase Emulators Integration Tests"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from voyager-RN root directory"
  exit 1
fi

# Function to check if emulators are running
check_emulators() {
  curl -s http://127.0.0.1:8080 > /dev/null 2>&1
}

# Function to cleanup emulators on exit
cleanup_emulators() {
  if [ ! -z "$EMULATOR_PID" ]; then
    echo ""
    echo "🛑 Stopping Firebase Emulators..."
    kill $EMULATOR_PID 2>/dev/null || true
    wait $EMULATOR_PID 2>/dev/null || true
    echo "✅ Emulators stopped"
  fi
}

# Trap to ensure cleanup on script exit
trap cleanup_emulators EXIT INT TERM

# Check if Firebase emulators are already running
echo "🔍 Checking if Firebase Emulators are running..."
if check_emulators; then
  echo "✅ Firebase Emulators are already running"
  EMULATOR_PID=""
else
  echo "🚀 Starting Firebase Emulators..."
  
  # Start emulators in background (no functions needed - Admin SDK tests don't need them)
  firebase emulators:start --only firestore,auth --project mundo1-dev > /tmp/firebase-emulator.log 2>&1 &
  EMULATOR_PID=$!
  
  echo "⏳ Waiting for emulators to be ready (PID: $EMULATOR_PID)..."
  
  # Wait up to 60 seconds for emulators to start
  for i in {1..60}; do
    if check_emulators; then
      echo "✅ Firebase Emulators are ready!"
      break
    fi
    
    if [ $i -eq 60 ]; then
      echo "❌ Emulators failed to start in 60 seconds"
      echo "Check logs: tail -f /tmp/firebase-emulator.log"
      exit 1
    fi
    
    # Check if process is still running
    if ! kill -0 $EMULATOR_PID 2>/dev/null; then
      echo "❌ Emulator process died unexpectedly"
      echo "Check logs: cat /tmp/firebase-emulator.log"
      exit 1
    fi
    
    sleep 1
    echo -n "."
  done
  echo ""
fi

# Set environment variables for emulators
export FIRESTORE_EMULATOR_HOST=localhost:8080
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
export FIREBASE_FUNCTIONS_EMULATOR_HOST=localhost:5001

echo ""
echo "🧪 Running Integration Tests..."
echo "================================"

# Run integration tests with integration config (no Firebase mocks)
npm test -- --config=jest.integration.config.js src/__tests__/integrations --watchAll=false --runInBand

echo ""
echo "✅ Integration tests completed!"
echo ""
echo "📊 View results:"
echo "  - Test output above"
echo "  - Emulator UI: http://localhost:4000"
echo "  - Coverage report: open coverage/lcov-report/index.html"

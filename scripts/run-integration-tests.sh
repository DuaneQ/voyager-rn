#!/bin/bash
# Quick script to run integration tests against real Cloud Functions
# Usage: ./scripts/run-integration-tests.sh

set -e

echo "🚀 Starting Integration Tests (Real Cloud Functions)"
echo "===================================================="
echo ""
echo "ℹ️  These tests call deployed Cloud Functions in mundo1-dev project:"
echo "   - createItinerary"
echo "   - searchItineraries"
echo "   - deleteItinerary"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from voyager-RN root directory"
  exit 1
fi

echo "🧪 Running Integration Tests..."
echo "================================"

# Run integration tests with integration config
# Run the entire integrations folder so CI runs all integration suites
npm test -- --config=jest.integration.config.js src/__tests__/integrations --watchAll=false --runInBand --testTimeout=120000

echo ""
echo "✅ Integration tests completed!"
echo ""
echo "📊 Test Summary:"
echo "  - Tests validate searchItineraries Cloud Function filters"
echo "  - All filters tested: destination, gender, age, status, orientation, dates, excludedIds, combined"
echo "  - Test data automatically seeded and cleaned up"

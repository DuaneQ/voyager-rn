# Integration Tests CI/CD Setup

## Overview
Integration tests for the voyager-RN app now run **in parallel** with unit tests using GitHub Actions. This document explains the setup, configuration, and how to maintain it.

## Test Architecture

### Two Test Suites (Parallel Execution)
1. **Unit Tests** - `.github/workflows/ci.yml`
   - Fast, mocked tests
   - No Firebase emulators needed
   - Runs Jest with `jest.config.js`
   - Excludes `src/__tests__/integrations/` directory
   
2. **Integration Tests** - `.github/workflows/integration-tests.yml`
   - Tests against real Firebase emulators
   - Uses Firebase Admin SDK
   - Runs Jest with `jest.integration.config.js`
   - Only tests in `src/__tests__/integrations/` directory

### Why Firebase Admin SDK?
**Problem**: Firebase v10 client SDK is incompatible with Jest/Babel
- The internal `_container` property becomes `undefined` after Babel transformation
- `getAuth(app)` fails with "Cannot read properties of undefined (reading 'getProvider')"

**Solution**: Firebase Admin SDK v12
- Node.js-native, no Babel transformation issues
- Direct Firestore/Auth access via environment variables
- Perfect for integration tests in CI/CD

## Local Development

### Running Tests Locally

```bash
# Unit tests only (fast, mocked)
npm test

# Integration tests only (requires emulators)
npm run test:integration

# All tests (unit + integration)
npm run test:all
```

### Starting Emulators Manually

```bash
# From voyager-pwa directory
cd ../voyager-pwa
firebase emulators:start --only functions,firestore,auth --project mondo1-dev
```

The `test:integration` script automatically detects running emulators and starts them if needed.

## CI/CD Workflows

### 1. Unit Tests Workflow (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests modifying `src/**` or config files

**Steps:**
1. Checkout code
2. Install Node.js 20
3. Install dependencies
4. Run TypeScript checks
5. Run Jest unit tests with coverage
6. Upload coverage to Codecov

**Runtime:** ~2-3 minutes

### 2. Integration Tests Workflow (`integration-tests.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests modifying:
  - `src/**` (source code)
  - `firebase-config.js`
  - `src/__tests__/integrations/**`
  - `src/testUtils/emulatorSetup.ts`
  - `jest.integration.config.js`
  - `.github/workflows/integration-tests.yml`

**Steps:**
1. **Setup**
   - Checkout voyager-RN code
   - Install Node.js 20 and dependencies
   - Install Java 17 (required for Firebase emulators)
   - Install Firebase CLI globally

2. **Firebase Configuration**
   - Checkout voyager-pwa repository (contains Firebase config and functions)
   - Install voyager-pwa dependencies

3. **Emulator Startup**
   - Start Firebase emulators in background (Firestore, Auth, Functions)
   - Wait for emulators to be ready (max 60 seconds)
   - Check port 5001 (Functions) for readiness

4. **Test Execution**
   - Run `npm run test:integration`
   - Environment variables:
     - `FIRESTORE_EMULATOR_HOST=localhost:8080`
     - `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`
   - Timeout: 10 minutes

5. **Cleanup**
   - Stop emulators (always runs, even on failure)
   - Upload test results as artifacts (7-day retention)

6. **Validation Job** (runs after tests pass)
   - Validates that integration tests cover:
     - `startDay` / `endDay` (date overlap matching)
     - `age` (age range filtering)
     - `blocked` / `blocking` (blocking logic)
     - Firebase Admin SDK helpers usage

**Runtime:** ~4-6 minutes

## Test Coverage

### Current Integration Tests (26 passing)

**Admin SDK Tests** (`firebaseAdmin.integration.test.ts`) - 8 tests:
1. ✅ Create and read user profiles from Firestore
2. ✅ Create and read itineraries from Firestore
3. ✅ Clear test data from Firestore
4. ✅ Find itineraries with overlapping dates (startDay/endDay)
5. ✅ Exclude itineraries with non-overlapping dates
6. ✅ Filter itineraries by age range (lowerRange/upperRange)
7. ✅ Exclude blocked users from search results
8. ✅ Exclude users who blocked the current user

**SearchPage Tests** (`SearchPage.integration.test.tsx`) - 18 tests:
- Component rendering and user interaction
- Mock Firebase integration
- UI state management

### Critical Matching Fields Validated
- ✅ **Date Overlap**: `startDay`, `endDay` (most important - validates travel date matching)
- ✅ **Age Range**: `age`, `lowerRange`, `upperRange`
- ✅ **Blocking**: `blockedUsers` array in user profiles
- ✅ **User Profiles**: Basic CRUD operations

### Future Test Expansion Ideas
- Gender/status/orientation filtering
- Complex multi-user blocking scenarios
- Multiple overlapping itineraries per user
- Edge cases: same-day trips, year boundaries, leap years

## Configuration Files

### `jest.integration.config.js`
```javascript
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',  // Node.js environment (not jsdom)
  setupFiles: ['<rootDir>/jest.integration.setup.js'],
  testMatch: ['**/__tests__/integrations/**/*.test.ts(x)?'],  // Only integration tests
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo|@expo|@firebase|firebase)'
  ]
};
```

### `jest.integration.setup.js`
```javascript
// Polyfill fetch for Node.js environment
global.fetch = require('node-fetch');

// Import firebase-admin (will be initialized in test setup)
require('firebase-admin');

// Clean up any existing Firebase Admin apps
const admin = require('firebase-admin');
const apps = admin.apps;
if (apps.length > 0) {
  apps.forEach(app => app.delete());
}
```

### `scripts/run-integration-tests.sh`
Self-contained test runner with automatic emulator management:
- Detects if emulators are already running
- Starts emulators if needed (from `../voyager-pwa`)
- Waits for emulator readiness
- Runs integration tests
- Cleans up on exit (Ctrl+C handling)

## Maintenance Guide

### Adding New Integration Tests

1. **Create test file** in `src/__tests__/integrations/`
   ```typescript
   import { setupEmulatorTests, cleanupEmulatorTests, createTestItinerary } from '../../testUtils/emulatorSetup';
   
   describe('My Feature Integration Tests', () => {
     beforeAll(async () => {
       await setupEmulatorTests();
     });
     
     afterAll(async () => {
       await cleanupEmulatorTests();
     });
     
     it('should test something with real Firebase', async () => {
       // Your test here
     });
   });
   ```

2. **Use Admin SDK helpers** from `emulatorSetup.ts`:
- `getTestFirestore()` - Get Firestore instance
- `getTestAuth()` - Get Auth instance
- `getTestUserId()` - Get test user ID
- `createTestItinerary(data)` - Create test itinerary
- `createTestUserProfile(data)` - Create test user profile
- `clearFirestoreEmulator()` - Clean up test data

3. **Test locally first**:
```bash
npm run test:integration
```

4. **Commit and push** - CI will automatically run both unit and integration tests

### Troubleshooting

#### "Firebase Emulators failed to start"
- Check if Java 17+ is installed: `java -version`
- Check voyager-pwa is accessible: `cd ../voyager-pwa`
- Verify Firebase CLI version: `firebase --version` (should be 13.x+)

#### "Cannot connect to Firestore emulator"
- Ensure emulator is running on port 8080
- Check environment variables: `FIRESTORE_EMULATOR_HOST=localhost:8080`
- Verify no firewall blocking localhost connections

#### "Tests timeout in CI"
- Increase timeout in workflow (`timeout-minutes: 10`)
- Check emulator startup wait time (currently 60 seconds max)
- Review Firebase function logs for errors

#### "Integration tests pass locally but fail in CI"
- Ensure voyager-pwa repository is accessible (check GitHub token)
- Verify Node.js version matches (20.x)
- Check for hardcoded file paths or environment dependencies

### Updating Dependencies

When updating Firebase or Jest:

1. **Update package.json**:
```bash
npm install firebase-admin@latest --legacy-peer-deps
npm install jest@latest --save-dev
```

2. **Test locally**:
```bash
npm run test:integration
```

3. **Update CI workflow** if needed (Node version, Java version, etc.)

## Performance & Cost Optimization

### Firebase Emulator Benefits
- ✅ No Firebase quota consumption
- ✅ Fast test execution (local)
- ✅ Isolated test environment
- ✅ No need for test data cleanup in production

### Parallel Execution Benefits
- ✅ Unit tests and integration tests run simultaneously
- ✅ Total CI time: ~5 minutes (vs 8-10 minutes serial)
- ✅ Faster feedback on PRs
- ✅ Independent failure isolation

### Cost Considerations
- GitHub Actions minutes: ~10 minutes per PR (free tier: 2000 min/month)
- Firebase costs: $0 (emulators are free)
- Development time saved: Significant (parallel execution + fast feedback)

## References

- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [GitHub Actions - Node.js](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)
- [Voyager PWA Repository](https://github.com/icebergslim/voyager-pwa)

## Summary

✅ Integration tests validate the **most critical app feature**: travel date matching  
✅ Tests run in parallel with unit tests for fast CI/CD feedback  
✅ Firebase Admin SDK eliminates Jest/Babel compatibility issues  
✅ Automatic emulator management makes local testing simple  
✅ Clear validation job ensures matching criteria are always tested  

The setup is production-ready and maintainable. Add new tests as features grow! 🚀

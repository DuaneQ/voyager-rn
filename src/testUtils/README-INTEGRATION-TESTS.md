# Integration Tests - Itinerary Matching

This directory contains **true integration tests** that validate the critical matching logic powering the TravalPass app.

## 🎯 What We Test

These tests validate the **MOST IMPORTANT** part of the app: how users are matched based on their travel itineraries. All tests run against **Firebase Emulators** to ensure real-world behavior.

### Critical Matching Criteria

1. **Date Overlap** (`startDay` / `endDay`)
   - Exact overlap (trip A: Dec 1-7, trip B: Dec 3-5) ✅
   - Partial overlap at start (trip A: Dec 1-7, trip B: Nov 28-Dec 3) ✅
   - Partial overlap at end (trip A: Dec 1-7, trip B: Dec 5-10) ✅
   - No overlap (trip A: Dec 1-7, trip B: Dec 10-15) ❌
   - Same-day trips (both Dec 5) ✅

2. **Age Range Matching** (`age` vs `lowerRange`/`upperRange`)
   - Candidate age within range (age 35, range 30-40) ✅
   - Candidate age below range (age 25, range 30-40) ❌
   - Candidate age above range (age 45, range 30-40) ❌
   - Boundary conditions (age exactly 30 or 40) ✅

3. **Gender Preference**
   - "No Preference" matches all ✅
   - Exact gender match (Female wants Female) ✅
   - Gender mismatch (Female wants Male, candidate is Female) ❌

4. **Relationship Status**
   - "No Preference" matches all ✅
   - Exact status match (Single wants Single) ✅
   - Status mismatch (Single wants Married, candidate is Single) ❌

5. **Sexual Orientation**
   - "No Preference" matches all ✅
   - Exact orientation match (Heterosexual wants Heterosexual) ✅
   - Orientation mismatch (Heterosexual wants Homosexual, candidate is Heterosexual) ❌

6. **Destination Matching**
   - Exact destination match ✅
   - Different destinations ❌

7. **Bidirectional Blocking**
   - Current user blocked candidate ❌
   - Candidate blocked current user ❌
   - No blocking between users ✅

8. **Excluded IDs** (Already viewed itineraries)
   - Itinerary in excludedIds array ❌

## 📁 Test Files

### `itineraryMatching.integration.test.ts`
**Purpose:** Validates `useSearchItineraries` hook and `searchItineraries` RPC

**Test Coverage:**
- ✅ Date overlap logic (5 test cases)
- ✅ Age range filtering (5 test cases)
- ✅ Gender preference matching (3 test cases)
- ✅ Relationship status matching (3 test cases)
- ✅ Sexual orientation matching (3 test cases)
- ✅ Destination matching (2 test cases)
- ✅ Bidirectional blocking (3 test cases)
- ✅ Excluded IDs (1 test case)
- ✅ Combined criteria validation (1 complex test)
- ✅ Critical field validation (3 test cases)

**Total:** 29 comprehensive test cases

### `itineraryCreation.integration.test.ts`
**Purpose:** Validates `useCreateItinerary` hook and `createItinerary` RPC

**Test Coverage:**
- ✅ Manual itinerary creation with all required fields
- ✅ `startDay` and `endDay` timestamp generation
- ✅ `age` calculation from user DOB
- ✅ All preference fields (gender, status, orientation, age ranges)
- ✅ Complete `userInfo` object
- ✅ Edge cases (invalid DOB, same-day trips, empty activities)
- ✅ Itinerary editing (preserving existing data)
- ✅ Direct RPC validation
- ✅ Cross-field validation (dates match timestamps, age matches DOB)
- ✅ Validation error handling

**Total:** 20+ comprehensive test cases

## 🚀 Running Integration Tests

### Prerequisites

1. **Start Firebase Emulators** (from voyager-pwa directory):
   ```bash
   cd ../voyager-pwa
   firebase emulators:start
   ```

   This starts:
   - Auth Emulator: `http://localhost:9099`
   - Functions Emulator: `http://localhost:5001`
   - Firestore Emulator: `http://localhost:8080`
   - Emulator UI: `http://localhost:4000`

2. **Environment Variables** (automatic in tests):
   ```bash
   FIRESTORE_EMULATOR_HOST=localhost:8080
   FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
   FIREBASE_FUNCTIONS_EMULATOR_HOST=localhost:5001
   ```

### Run Tests Locally

```bash
# Run all integration tests (with special config that connects to emulators)
npm test -- --config=jest.integration.config.js src/__tests__/integrations

# Run specific test file
npm test -- --config=jest.integration.config.js src/__tests__/integrations/itineraryMatching.integration.test.ts

# Run with coverage
npm test -- --config=jest.integration.config.js src/__tests__/integrations --coverage

# OR use the helper script (recommended):
./scripts/run-integration-tests.sh
```

**Note:** Integration tests use `jest.integration.config.js` which does NOT mock Firebase, allowing real connections to emulators.

### Run Tests in CI/CD

Integration tests run automatically in GitHub Actions when:
- Pull requests are opened/updated
- Code is pushed to `main` or `develop` branches
- Changes affect `src/`, `firebase-config.js`, or integration tests

See: `.github/workflows/integration-tests.yml`

## 🔍 Debugging Integration Tests

### View Emulator UI
Open `http://localhost:4000` to see:
- Created itineraries in Firestore
- Function call logs
- Authentication state

### Enable Verbose Logging
In test files, add:
```typescript
beforeAll(() => {
  console.log('Starting integration tests with emulators');
});
```

### Check Emulator Status
```bash
curl http://localhost:5001
curl http://localhost:8080
curl http://localhost:9099
```

### Common Issues

**Problem:** Tests fail with "ECONNREFUSED"
- **Solution:** Ensure emulators are running (`firebase emulators:start`)

**Problem:** Tests timeout
- **Solution:** Increase timeout in test: `jest.setTimeout(30000)`

**Problem:** Tests pass locally but fail in CI
- **Solution:** Check GitHub Actions logs, emulator startup may be slow

## 📊 Test Assertions

### Critical Field Validation
All integration tests validate that these fields are present:

**Itinerary Creation:**
```typescript
expect(itinerary.startDay).toBeDefined();
expect(itinerary.endDay).toBeDefined();
expect(itinerary.age).toBeDefined();
expect(itinerary.gender).toBeDefined();
expect(itinerary.status).toBeDefined();
expect(itinerary.sexualOrientation).toBeDefined();
expect(itinerary.lowerRange).toBeDefined();
expect(itinerary.upperRange).toBeDefined();
expect(itinerary.userInfo).toBeDefined();
```

**Search Matching:**
```typescript
expect(searchPayload.minStartDay).toBeDefined();
expect(searchPayload.maxEndDay).toBeDefined();
expect(searchPayload.lowerRange).toBeDefined();
expect(searchPayload.upperRange).toBeDefined();
```

## 🛠️ Maintenance

### Adding New Tests

1. **Identify the matching criterion** you want to test
2. **Create test itineraries** with specific values using `createTestItinerary()`
3. **Call the RPC** (`searchItineraries` or `createItinerary`)
4. **Assert the expected behavior** (match/no match, field presence)

Example:
```typescript
it('should match when X condition is met', async () => {
  const userItinerary = createTestItinerary({ /* search criteria */ });
  const candidateItinerary = createTestItinerary({ /* candidate data */ });
  
  await createItineraryFn({ itinerary: candidateItinerary });
  
  const result = await searchItinerariesFn({ /* search params */ });
  
  expect(result.data.data).toHaveLength(1); // Should match
});
```

### Updating Tests for Schema Changes

If the Itinerary schema changes:
1. Update `createTestItinerary()` helper in test files
2. Add assertions for new required fields
3. Update `src/testUtils/emulatorSetup.ts` if new Firebase services are needed
4. Update `.github/workflows/integration-tests.yml` validation step

## 📖 Related Documentation

- [Emulator Setup Utilities](../../testUtils/emulatorSetup.ts)
- [PWA Integration Tests](../../../voyager-pwa/src/__tests__/)
- [Firebase Emulator Suite Docs](https://firebase.google.com/docs/emulator-suite)
- [Jest Testing Library](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)

## ✅ Test Coverage Goals

- **Date Overlap:** 100% (all combinations covered)
- **Age Filtering:** 100% (boundary conditions tested)
- **Preferences:** 100% (all fields validated)
- **Blocking:** 100% (bidirectional logic verified)
- **Field Presence:** 100% (all required fields asserted)

**Current Status:** ✅ All goals met with 49+ test cases covering every matching scenario.

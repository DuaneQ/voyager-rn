# Running Tests - voyager-RN

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Output

### All Passing ✅
```
Test Suites: 3 passed, 3 total
Tests:       33 passed, 33 total
Time:        ~0.7s
```

## What's Tested

### 1. Authentication Context (7 tests)
- User sign in/out flows
- Token management
- Password reset
- Email verification

### 2. Login Screen (7 tests)
- Form validation
- User interactions
- Navigation
- Loading states

### 3. Auth Utilities (19 tests)
- Error message mapping
- Input validation (email, password)
- Zod schema validation

## Coverage Report

Key modules covered:
- **AuthContext**: 81% coverage
- **Validators**: 100% coverage
- **Error Mapping**: 100% coverage

## Test Files Location

```
src/__tests__/auth/
├── AuthContext.test.tsx      # Context & hook tests
├── LoginScreen.test.tsx      # UI component tests
└── authUtilities.test.ts     # Utility function tests
```

## Troubleshooting

### Tests Won't Run
```bash
# Reinstall dependencies
npm install --legacy-peer-deps

# Clear Jest cache
npx jest --clearCache
```

### TypeScript Errors
```bash
# Run type check
npx tsc --noEmit
```

## CI/CD Integration

Tests are configured for CI/CD:
- Fast execution (<1s)
- No flaky tests
- Proper mocking of external dependencies
- Exit code 0 on success

See [TESTING_SUMMARY.md](./TESTING_SUMMARY.md) for detailed documentation.

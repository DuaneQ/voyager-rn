# Video Test Failures - Resolution Plan

## Problem
The VideoCommentsModal tests are failing with `TypeError: timestamp.toMillis is not a function`.

## Root Cause
Test file creates mock video objects with inline timestamp objects like:
```typescript
{
  seconds: Date.now() / 1000 - 30,
  nanoseconds: 0
}
```

These don't have the `toMillis()` method that the real Firebase Timestamp has.

## Solution
1. Add helper function at top of test file:
```typescript
const createMockTimestamp = (seconds: number) => ({
  seconds,
  nanoseconds: 0,
  toMillis: () => seconds * 1000,
  toDate: () => new Date(seconds * 1000),
});
```

2. Replace ALL inline timestamp objects with `createMockTimestamp()` calls:

### Lines to fix:
- Line ~418: `createdAt: createMockTimestamp(Date.now() / 1000 - 30)`
- Line ~445: `createdAt: createMockTimestamp(Date.now() / 1000 - 300)` // 5 minutes
- Line ~472: `createdAt: createMockTimestamp(Date.now() / 1000 - 7200)` // 2 hours  
- Line ~499: `createdAt: createMockTimestamp(Date.now() / 1000 - 172800)` // 2 days
- Line ~600: `createdAt: createMockTimestamp(Date.now() / 1000 - i * 60)` // loop

## Status
⏳ PENDING - File got corrupted during automated fixes. Needs manual correction.

## Alternative: Recreate Test File
If fixes continue to corrupt the file, consider recreating it from scratch with proper mocks from the start.

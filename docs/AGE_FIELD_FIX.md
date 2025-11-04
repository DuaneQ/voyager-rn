# Age Field Fix Documentation

## Problem
Itinerary matching was failing because the `age` field in the database was empty for all itineraries (both manual and AI-generated), preventing the `searchItineraries` RPC from properly filtering candidates by age compatibility.

### Test Case That Revealed the Bug
Two test itineraries in Austin, TX with:
- **Overlapping dates**: Nov 20-30 (within Nov 14-Dec 5)
- **Compatible age ranges**: 18-50 and 18-96 (both users ~25 years old)
- **Same destination**: Austin, TX
- **Result**: ❌ No match found

Despite meeting all criteria, matching failed because `age` field was empty in database.

## Root Cause
Neither the PWA nor React Native app was calculating user age from `userInfo.dob` when creating itineraries:

1. **Manual Itineraries**: 
   - PWA: `AddItineraryModal.tsx` didn't calculate age before calling `createItinerary` RPC
   - RN: `useCreateItinerary.ts` didn't calculate age before building payload

2. **AI-Generated Itineraries**:
   - PWA: `useAIGeneration.ts` didn't calculate age when building `itineraryData`
   - RN: `useAIGeneration.ts` didn't calculate age in 4 different places where itinerary payloads are built

The backend `searchItineraries` RPC requires the `age` field for filtering:
```typescript
filters.age = { gte: userLower, lte: userUpper }
```

Without this field populated, the SQL query filters out all potential matches.

## Why Unit Tests Missed This

1. **Mocked Dependencies**: Tests mocked Firebase Functions and Prisma, bypassing real RPC filtering logic
2. **No End-to-End Matching Tests**: Tests verified itinerary creation but not the search/matching flow
3. **Test Fixtures Had Age**: Mock data likely included age fields manually
4. **Isolated Component Tests**: Each layer (UI, hooks, RPC) tested in isolation without integration

## Solution Implemented

### Changes Made

#### 1. Created `calculateAge` utility (both PWA and RN)
**File**: `src/utils/calculateAge.ts`

Calculates current age from date of birth, handling birthday logic correctly.

#### 2. Updated Manual Itinerary Creation

**PWA** (`src/components/forms/AddItineraryModal.tsx`):
- Import `calculateAge`
- Calculate `userAge` from `userProfile.dob` in `handleSaveItinerary`
- Include `age: userAge` in `itineraryData` payload

**RN** (`src/hooks/useCreateItinerary.ts`):
- Import `calculateAge`
- Calculate `userAge` from `userProfile.dob` in `createItinerary`
- Include `age: userAge` in payload
- Updated `ManualItineraryData` type to include `age?: number`

#### 3. Updated AI-Generated Itinerary Creation

**PWA** (`src/hooks/useAIGeneration.ts`):
- Import `calculateAge`
- Calculate `userAge` from `userProfile.dob` before building `itineraryData`
- Include `age: userAge` in `itineraryData` object

**RN** (`src/hooks/useAIGeneration.ts`):
- Import `calculateAge`
- Calculate `userAge` in **4 locations** (non-flight path: 2, flight path: 2)
- Include `age: userAge` in both `itineraryData` and `fullItinerary` objects
- Fixed for both transportation modes (driving/flight)

### Files Modified
```
PWA:
- src/utils/calculateAge.ts (created)
- src/components/forms/AddItineraryModal.tsx (updated)
- src/hooks/useAIGeneration.ts (updated)

RN:
- src/utils/calculateAge.ts (created)
- src/hooks/useCreateItinerary.ts (updated)
- src/types/ManualItinerary.ts (updated)
- src/hooks/useAIGeneration.ts (updated - 4 locations)
- docs/AGE_FIELD_FIX.md (created)
```

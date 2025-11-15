# AI Itinerary Save Fix - Prisma Schema Compatibility

## Issue
AI-generated itineraries were failing to save to the PostgreSQL database with Prisma validation errors:
```
PrismaClientValidationError: \nInvalid 'prisma.itinerary.create()' invocation
```

## Root Causes

### Issue 1: Incorrect Date Format
**CRITICAL**: The cloud function expects date **strings**, not Date objects!
- ❌ **Wrong**: `startDate: new Date(dateString)`
- ✅ **Correct**: `startDate: dateString`

The `createItinerary` cloud function has its own date normalization logic that converts strings to Date objects. Sending Date objects directly causes serialization issues.

### Issue 2: Fields Sent That Don't Exist in Schema
The React Native app was sending raw fields directly to the `createItinerary` cloud function that **don't exist in the Prisma schema**:

### Issue 2: Fields Sent That Don't Exist in Schema
The React Native app was sending raw fields directly to the `createItinerary` cloud function that **don't exist in the Prisma schema**:

- `tripType`, `mustInclude`, `mustAvoid`, `specialRequests`
- `transportType`, `preferenceProfile`
- `departureAirportCode`, `destinationAirportCode`, `flightPreferences`
- `departure` (raw field)

### Issue 3: Missing Required Top-Level Fields
The Prisma schema expects these **top-level filter fields** for search functionality:
- `gender` (string)
- `sexualOrientation` (string)
- `status` (string)

**We were only sending these inside `userInfo` object, not as top-level fields!**

### Prisma Schema Columns (VALID):
- Scalar: `id`, `userId`, `destination`, `title`, `description`, `startDate`, `endDate`, `startDay`, `endDay`, etc.
- JSON: `likes`, `activities`, `userInfo`, `response`, `metadata`, `externalData`, `recommendations`, `costBreakdown`, `dailyPlans`, `days`, `flights`, `accommodations`

## Solution
**Match the PWA pattern**: Wrap all AI-specific data inside the `response` object with proper structure.

### Before (BROKEN):
```typescript
const itineraryData = {
  id: generationId,
  destination: 'Paris',
  startDate: new Date(dateString),  // ❌ Date object causes serialization issues
  endDate: new Date(dateString),    // ❌ Date object causes serialization issues
  tripType: 'leisure',              // ❌ Not in Prisma schema
  mustInclude: [...],               // ❌ Not in Prisma schema
  transportType: 'driving',         // ❌ Not in Prisma schema
  preferenceProfile: {...},         // ❌ Not in Prisma schema
  response: aiResult.data,          // ❌ Wrong structure
  // Missing top-level filter fields!
};
```

### After (FIXED):
```typescript
const itineraryData = {
  id: generationId,
  userId: userId,                   // ✅ Added explicit userId
  destination: 'Paris',
  startDate: '2025-11-01',          // ✅ String format - cloud function normalizes
  endDate: '2025-11-07',            // ✅ String format - cloud function normalizes
  startDay: timestamp,
  endDay: timestamp,
  lowerRange: 18,
  upperRange: 100,
  // ✅ CRITICAL: Top-level filter fields for search/matching
  gender: 'Male',
  sexualOrientation: 'Straight',
  status: 'Single',
  likes: [],
  userInfo: {...},                // ✅ JSON field
  accommodations: [...],          // ✅ JSON field
  activities: [...],              // ✅ JSON field
  externalData: {...},            // ✅ JSON field
  response: {                     // ✅ Properly structured
    success: true,
    data: {
      ...aiResult.data,
      metadata: {                 // ✅ All app-specific data in metadata
        generationId,
        tripType: 'leisure',
        mustInclude: [...],
        mustAvoid: [...],
        specialRequests: '',
        transportType: 'driving',
        preferenceProfile: {...}
      }
    }
  }
};
```

## Changes Made

### 1. Non-Flight AI Generation Save (`src/hooks/useAIGeneration.ts` lines 310-360)
- ✅ **Send dates as strings** (critical fix!) - `startDate: sanitizedRequest.startDate` not `new Date(...)`
- ✅ Added explicit `userId` field
- ✅ **Added top-level `gender`, `sexualOrientation`, `status` fields** (critical for DB schema)
- ✅ Moved `tripType`, `mustInclude`, `mustAvoid`, `specialRequests`, `transportType`, `preferenceProfile` into `response.data.metadata`
- ✅ Wrapped AI result in proper `response` structure

### 2. Flight-Based Itinerary Save (`src/hooks/useAIGeneration.ts` lines 400-455)
- ✅ **Send dates as strings** (critical fix!) - `startDate: sanitizedRequest.startDate` not `new Date(...)`
- ✅ Added explicit `userId` field
- ✅ **Added top-level `gender`, `sexualOrientation`, `status` fields** (critical for DB schema)
- ✅ Removed invalid top-level fields
- ✅ Moved all flight-specific metadata into `response.data.metadata`
- ✅ Created proper `response` structure with flight data

## Why This Matters

1. **Database Integrity**: Prisma validates all fields against the schema - sending invalid fields causes immediate rejection
2. **Search Functionality**: The top-level `gender`, `sexualOrientation`, and `status` fields are used for **search filtering and matching** - without them, users can't find itineraries!
3. **PWA Parity**: The PWA already follows this pattern, ensuring consistency
4. **UI Compatibility**: The UI expects metadata at `response.data.metadata.*` for filtering and display
5. **Extensibility**: New fields can be added to metadata without changing the database schema

## Testing
- ✅ All 701 unit tests passing
- ✅ No TypeScript compilation errors
- ✅ Ready for production deployment

## Migration Notes
If you have existing AI itineraries in Firestore that need to be migrated to PostgreSQL:
1. Extract top-level fields (`tripType`, etc.) 
2. Restructure into `response.data.metadata`
3. Ensure `userId`, `startDate`, `endDate` are properly typed
4. Use the `createItinerary` cloud function for consistency

## References
- Prisma Schema: `functions/prisma/schema.prisma`
- Cloud Function: `functions/src/functions/itinerariesRpc.ts`
- PWA Hook: `voyager-pwa/src/hooks/useAIGeneration.ts` (lines 520-700)
- RN Hook: `src/hooks/useAIGeneration.ts`

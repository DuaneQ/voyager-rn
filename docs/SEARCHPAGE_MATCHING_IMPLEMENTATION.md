# SearchPage Matching Implementation - Complete Guide

## Overview
This document tracks the implementation of the full matching itinerary feature in SearchPage, which was incomplete. The goal is to replicate the PWA's behavior where users can select their itinerary, see matching travelers, and create connections via mutual likes.

## Implementation Status

### ✅ Completed (2024-11-02)

1. **useSearchItineraries Hook Integration**
   - Already existed in `src/hooks/useSearchItineraries.ts`
   - Imported and wired up in SearchPage
   - Provides: `matchingItineraries`, `searchItineraries()`, `getNextItinerary()`, `loading`, `hasMore`, `error`

2. **handleItinerarySelect Enhancement**
   - Now triggers search when user selects an itinerary from dropdown
   - Calls `searchItineraries(selectedItinerary, userId)`
   - Shows error if user not logged in

3. **ItineraryCard Component Integration**
   - Imported from `src/components/forms/ItineraryCard.tsx`
   - Renders when matching itineraries exist
   - Shows user profile, destination, dates, description, activities
   - Displays like/dislike buttons

4. **Updated Render Logic**
   - **Scenario 1**: No itineraries → Show mock onboarding cards (no tracking)
   - **Scenario 2**: Has itineraries but none selected → Show "Select an itinerary" message
   - **Scenario 3**: Selected itinerary + searching → Show loading spinner
   - **Scenario 4**: Selected + matches found → Render ItineraryCard
   - **Scenario 5**: Selected + no matches → Show helpful "No matches" message

5. **Handler Functions**
   - `handleLike(itinerary)` - Checks limits, tracks usage, TODO: update likes array, check mutual match
   - `handleDislike(itinerary)` - Checks limits, tracks usage, advances to next
   - `handleMockLike()` - For onboarding mocks only (no tracking)
   - `handleMockDislike()` - For onboarding mocks only (no tracking)

### ⏳ In Progress

6. **handleLike Mutual Match Detection**
   - ✅ Basic structure in place
   - ❌ Need to call `updateItinerary` RPC to persist likes
   - ❌ Need to call `connectionRepository.createConnection()` for mutual matches
   - ❌ Need to trigger notification for new connection

### 🔴 TODO (Critical)

7. **Update Itinerary RPC Integration**
   - Create or wire up `useUpdateItinerary` hook to call Cloud Function
   - RPC: `updateItinerary({ itineraryId, updates: { likes: [...] } })`
   - Reference: `voyager-pwa/functions/src/functions/itinerariesRpc.ts` line ~107

8. **Connection Creation Service**
   - Create `connectionRepository.createConnection(userId1, userId2, itinerary1Id, itinerary2Id)`
   - Should create Firestore document in `connections` collection
   - Structure:
     ```typescript
     {
       participants: [userId1, userId2],
       itineraries: {
         [userId1]: itinerary1Id,
         [userId2]: itinerary2Id
       },
       createdAt: timestamp,
       lastMessage: null
     }
     ```
   - Reference: PWA's Search.tsx lines 248-269

9. **Integration Tests**
   - Test: Selecting itinerary triggers search
   - Test: Matching itineraries render in ItineraryCard
   - Test: Like button updates likes array
   - Test: Mutual match creates connection
   - Test: Dislike advances to next match
   - Test: Usage tracking enforces limits
   - Test: Empty results show helpful message

### 🟡 TODO (Important)

10. **Error Handling Improvements**
    - Better error messages for network failures
    - Retry logic for failed RPC calls
    - Offline state handling

11. **Loading State Refinements**
    - Show skeleton loader during search
    - Disable buttons during processing
    - Add pull-to-refresh for itinerary list

12. **ViewProfileModal Integration**
    - Currently referenced in ItineraryCard
    - Needs to be created for React Native
    - Should show user's profile, photos, ratings

## Architecture Flow

### User Journey
```
1. User opens SearchPage
   ↓
2. If no itineraries → Show mock cards (onboarding)
   If has itineraries → Show "Select an itinerary" message
   ↓
3. User selects itinerary from dropdown
   ↓
4. handleItinerarySelect() triggers searchItineraries()
   ↓
5. useSearchItineraries fetches matches from Firestore/PostgreSQL
   ↓
6. ItineraryCard renders with first match
   ↓
7. User clicks Like button
   ↓
8. handleLike():
   - Checks usage limits (10/day free)
   - Tracks view via useUsageTracking
   - Updates liked itinerary's likes array (RPC)
   - Checks if other user already liked current user
   - If mutual match → Creates connection
   - Shows alert: "🎉 It's a match!"
   - Advances to next itinerary
   ↓
9. User can navigate to Chats tab to message matched traveler
```

### Data Flow
```
SearchPage
  ↓
  useSearchItineraries (src/hooks/useSearchItineraries.ts)
    ↓
    Firestore query: `itineraries` collection
    Filters: destination, gender, status, dates, age range
    Excludes: viewed itineraries, blocked users
    ↓
  matchingItineraries[] state
    ↓
  ItineraryCard component
    ↓
  onLike → handleLike
    ↓
  updateItinerary RPC (functions/src/functions/itinerariesRpc.ts)
    ↓
  PostgreSQL update
    ↓
  Check mutual match logic
    ↓
  connectionRepository.createConnection()
    ↓
  Firestore: `connections` collection
```

## Key Files

### React Native (voyager-RN)
- **SearchPage**: `src/pages/SearchPage.tsx` (main implementation)
- **ItineraryCard**: `src/components/forms/ItineraryCard.tsx` (display component)
- **useSearchItineraries**: `src/hooks/useSearchItineraries.ts` (search logic)
- **useUsageTracking**: `src/hooks/useUsageTracking.ts` (freemium limits)
- **useUpdateItinerary**: `src/hooks/useUpdateItinerary.ts` (TODO: create/wire up)
- **connectionRepository**: `src/repositories/ConnectionRepository.ts` (TODO: create)
- **Itinerary types**: `src/types/Itinerary.ts` (shared types)

### Cloud Functions (voyager-pwa)
- **itinerariesRpc**: `functions/src/functions/itinerariesRpc.ts`
  - `createItinerary`
  - `updateItinerary` (line ~107)
  - `deleteItinerary`
  - `listItinerariesForUser`
  - `searchItineraries` (line ~189)

### Reference Implementation (PWA)
- **Search page**: `src/components/pages/Search.tsx` (lines 198-274 for handleLike)
- **useSearchItineraries**: `src/hooks/useSearchItineraries.tsx`

## Testing Strategy

### Unit Tests
- `useSearchItineraries.test.ts` - Search hook logic
- `useUsageTracking.test.ts` - Limit enforcement (already exists)
- `connectionRepository.test.ts` - Connection creation

### Integration Tests
- `SearchPage.integration.test.tsx` - Full user flow
  - Select itinerary → search triggers
  - Matches render
  - Like → updates likes
  - Mutual match → creates connection
  - Dislike → advances to next
  - Limits enforced

### E2E Tests (Appium)
- Create test itineraries in database
- Navigate to SearchPage
- Select itinerary
- Verify matches display
- Click like button
- Verify connection created
- Check Chats tab for new chat

## Known Issues

1. **Type Mismatch**: useSearchItineraries defines its own Itinerary interface instead of importing from `src/types/Itinerary.ts`
   - Current workaround: `as any` cast in ItineraryCard
   - Proper fix: Update useSearchItineraries to use shared type

2. **Firestore vs PostgreSQL**: Hook uses Firestore, but PWA uses PostgreSQL via RPC
   - React Native should also use RPC for consistency
   - TODO: Update useSearchItineraries to call `searchItineraries` RPC

3. **ViewProfileModal**: Referenced but not created yet for React Native

## Next Steps

1. ✅ Wire up useUpdateItinerary to call `updateItinerary` RPC
2. ✅ Create connectionRepository with createConnection method
3. ✅ Update handleLike to persist likes and create connections
4. ✅ Add push notifications for new matches
5. ✅ Create comprehensive integration tests
6. ✅ Manual QA testing end-to-end
7. ✅ Fix type mismatch in useSearchItineraries
8. ✅ Consider migrating to RPC-based search (vs Firestore)

## Related Documentation
- [SEARCHPAGE_BUSINESS_LOGIC_FIXES.md](./SEARCHPAGE_BUSINESS_LOGIC_FIXES.md) - Usage tracking fixes
- [PWA copilot-instructions.md](../../voyager-pwa/.github/copilot-instructions.md) - Reference architecture

---

**Last Updated**: 2024-11-02  
**Status**: In Progress - Core rendering complete, need RPC integration  
**Blocked By**: updateItinerary RPC integration, connectionRepository creation

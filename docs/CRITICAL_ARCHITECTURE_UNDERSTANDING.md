# CRITICAL: PostgreSQL-First Architecture (via RPC)

## ⚠️ FUNDAMENTAL RULE: ALL ITINERARY CRUD GOES THROUGH POSTGRESQL RPCs

### The Complete Truth (Verified from PWA)

**ALL itinerary operations use PostgreSQL via Cloud Function RPCs:**

1. **CREATE** → `createItinerary` RPC (usePostItineraryToFirestore hook)
2. **READ** → `listItinerariesForUser` RPC (useGetItinerariesFromFirestore hook) 
3. **UPDATE** → `updateItinerary` RPC (useUpdateItinerary hook)
4. **DELETE** → `deleteItinerary` RPC (useDeleteItinerary hook)
5. **SEARCH** → `searchItineraries` RPC (useSearchItineraries hook)

### Where is Firestore Actually Used?

**ONLY these specific cases:**

1. **Connections** (chat/matching) - `collection(db, 'connections')`
   - Search.tsx line 252: `addDoc(collection(db, "connections"), {...})`
   - Chat component: reading/writing messages subcollection
   
2. **AI Share Modal** - AIItineraryDisplay.tsx ONLY
   - Line 253: `await setDoc(ref, payload, { merge: false });`
   - Purpose: Share link requires Firestore for legacy share page
   - This is the ONLY place itineraries are written to Firestore directly

3. **User Profiles** - `collection(db, 'users')`
   - ViewProfileModal: blocking users
   - Reports collection

4. **Videos** - `collection(db, 'videos')`
   - Video feed and video pages

5. **Messages** - subcollections under connections

### What getFunctions Does

`getFunctions()` returns a Firebase Functions instance that enables:
- `httpsCallable(functions, 'rpcName')` to call Cloud Functions
- Cloud Functions query PostgreSQL via Prisma ORM
- All itinerary business logic lives in PostgreSQL (filtering, date overlap, blocking, etc.)

### Why This Architecture?

**PostgreSQL Benefits:**
- Complex relational queries (date overlap, age filtering)
- Better indexing for search performance  
- Transactional integrity
- Prisma ORM type safety on backend
- Bidirectional blocking logic enforced server-side

**Firestore Benefits:**
- Real-time listeners (chat messages)
- Simple document storage (connections, user profiles)
- Good for unstructured data

### Common Mistakes to Avoid

❌ **WRONG**: Reading itineraries with `collection(db, 'itineraries')`
✅ **RIGHT**: Call `listItinerariesForUser` RPC

❌ **WRONG**: Updating itineraries with `updateDoc()`  
✅ **RIGHT**: Call `updateItinerary` RPC

❌ **WRONG**: Creating itineraries with `addDoc()`
✅ **RIGHT**: Call `createItinerary` RPC

❌ **WRONG**: Writing itineraries to Firestore in general code
✅ **RIGHT**: ONLY in AI Share Modal for legacy share links

### The Hooks Tell the Truth

Every itinerary hook in PWA uses RPC:

```typescript
// usePostItineraryToFirestore.tsx - CREATES via RPC
const fn = httpsCallable(functions, 'createItinerary');
await fn({ itinerary: { ...itinerary, userId } });

// useGetItinerariesFromFirestore.tsx - READS via RPC  
const fn = httpsCallable(functions, 'listItinerariesForUser');
await fn({ userId: userUid });

// useUpdateItinerary.tsx - UPDATES via RPC
const fn = httpsCallable(functions, 'updateItinerary');
await fn({ itineraryId, updates });

// useDeleteItinerary.tsx - DELETES via RPC
const fn = httpsCallable(functions, 'deleteItinerary');
await fn({ itineraryId });

// useSearchItineraries.tsx - SEARCHES via RPC
const searchFn = httpsCallable(functions, 'searchItineraries');
await searchFn({ destination, gender, ... });
```

### React Native Implementation Status

✅ **Correct**: useSearchItineraries.ts uses searchItineraries RPC
❌ **NEEDS FIX**: Check all other itinerary hooks use RPC, not Firestore
❌ **NEEDS FIX**: AddItineraryModal must call createItinerary RPC
❌ **NEEDS FIX**: Any itinerary updates must call updateItinerary RPC

### Action Items for React Native

1. **Audit all itinerary operations** - ensure they call RPCs
2. **Remove any Firestore direct access** for itineraries (except AI Share Modal equivalent)
3. **Use ConnectionRepository** for creating connections (Firestore OK here)
4. **Match PWA hook architecture exactly** - same RPC calls, same patterns
5. **Never write itineraries to Firestore** except in AI share functionality

## Summary

**PostgreSQL (via RPC)**: Itineraries (ALL CRUD + Search)
**Firestore (direct)**: Connections, Messages, User Profiles, Videos, Reports

The hook names are misleading (`useGetItinerariesFromFirestore`) but they ALL use PostgreSQL RPCs under the hood. This is by design to maintain backward compatibility while migrating to PostgreSQL.

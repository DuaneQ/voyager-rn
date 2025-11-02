Prompt for Copilot (Implement useSearchItineraries & Match Flow in React Native)

You are a senior React Native engineer tasked with implementing the Itinerary Matching and Search system for the TravalPass mobile app.
The mobile app uses the same Firebase Cloud Functions and PostgreSQL backend as the PWA.

🎯 Objective

Implement the useSearchItineraries hook and related components in React Native by replicating the logic from the PWA’s useSearchItineraries.ts and Search.tsx, while adhering to S.O.L.I.D. principles, TypeScript strong typing, and React Native best practices.
The goal is to:

Query itineraries from Cloud SQL via Firebase callable searchItineraries.

Match itineraries based on user preferences (age, gender, sexual orientation, status, destination, and date range).

Display results in the same card format as the PWA’s ItineraryCard.

Allow users to “like” or “dislike” itineraries, enforcing daily usage limits and mutual match detection.

Track all actions (likes, dislikes, viewed itineraries) for usage and analytics.

⚙️ Functional Requirements
1️⃣ Search Flow

When a user selects one of their itineraries, call the Firebase Cloud Function searchItineraries (from itinerariesRpc.ts) with the same payload shape as the PWA:

{
  destination: string;
  gender: string;
  status: string;
  sexualOrientation: string;
  minStartDay: number;  // derived from itinerary.startDate
  maxEndDay: number;    // derived from itinerary.endDate
  pageSize: 10;
  excludedIds: string[];
  blockedUserIds: string[];
  currentUserId: string;
  lowerRange: number;
  upperRange: number;
}


Ensure the request/response schema matches the existing PWA version (no shape changes).

Filter and validate results before displaying:

Exclude itineraries from the current user.

Exclude itineraries already viewed (tracked locally).

Validate object integrity using a validateItinerary() helper identical to the PWA.

2️⃣ User Actions: Like / Dislike

Dislike:

Track the action via useUsageTracking.

Add itinerary ID to local viewedItineraries storage to avoid future repeats.

Advance to the next itinerary.

Like:

Track usage via useUsageTracking.

Add itinerary ID to viewedItineraries.

Update the liked itinerary’s likes array using useUpdateItinerary (Cloud Function updateItinerary).

Check for a mutual match:

Fetch the current user’s itineraries.

If the other user’s UID exists in your itinerary’s likes array → it’s a match.

Create a document in the connections collection:

Show a local toast or modal: “It’s a match! You can now chat with this user.”

Usage Tracking

Use useUsageTracking to enforce daily limits (10 free views per day).

The tracker must not count interactions with mock example itineraries (those only render on empty state).

If the limit is reached, disable like/dislike buttons and show a prompt:

“Daily limit reached! Upgrade to Premium for unlimited views.”

4️⃣ Viewed Itinerary Management

Replace browser localStorage with AsyncStorage for React Native.

Maintain a viewedItinerariesRef (Set<string>) to avoid repeats.

Create a utility:

async function saveViewedItinerary(id: string): Promise<void> { ... }
async function getViewedItineraries(): Promise<Set<string>> { ... }


Store under key "VIEWED_ITINERARIES".

onnection Context Evaluation

Assess whether the existing ConnectionContext from the PWA is necessary.

For now, only track hasNewConnection state locally after mutual match.

If it doesn’t manage real-time chat presence, remove it to simplify the architecture.

6️⃣ UI Integration

Display itinerary results using a component similar to the PWA’s ItineraryCard.

Each card includes:
User's profile pic (You should be able to click the profile pic to view the other user's profile to see their details, ratings and any comments someone has left for the user.)
Destination

Date range

Description

“Like” and “Dislike” buttons

On interaction, use smooth animations (Framer Motion or React Native Animated).

Show a loading spinner during search and a “No more itineraries” message at the end.

Architecture
Layer	Responsibility
/hooks/useSearchItineraries.ts	Handles querying, pagination, filtering, and match progression.
/hooks/useUsageTracking.ts	Enforces and logs daily interaction limits.
/hooks/useUpdateItinerary.ts	Updates itinerary likes (Firebase RPC).
/utils/itineraryValidator.ts	Validates itinerary objects before rendering.
/utils/viewedStorage.ts	Handles AsyncStorage logic for viewed itineraries.
/components/ItineraryCard.tsx	Renders each match card.
/components/MatchDisplay.tsx	Displays loading, results, and end-of-list states.
🧪 Testing

Create Jest tests with ≥ 90% coverage for:

Validation logic.

RPC call payload consistency.

Like/dislike flow.

Usage tracking limits.

Viewed itinerary persistence.

Mock Firebase Functions and AsyncStorage using Jest Mocks.

🧰 Enhancements Over PWA

Replace localStorage with AsyncStorage (mobile-safe).

Wrap all Cloud Function calls with callWithRetry() (exponential backoff).

Use an AbortController to cancel requests if the user navigates away.

Centralize all RPC calls in itinerariesRpc.ts and simplify any duplicated logic.

Improve separation of concerns:

UI (Card / Display)

Business logic (useSearchItineraries)

Persistence (useUsageTracking / viewedStorage)

Important:

Preserve data schema and RPC payloads from the PWA.

Follow S.O.L.I.D. principles (especially single responsibility and dependency inversion).

Simplify Connection state unless it’s required for real-time chat features.

Validate all itineraries before rendering to prevent malformed data crashes.
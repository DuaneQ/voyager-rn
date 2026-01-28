# AI Itinerary Data Contract & Backwards Compatibility

**Created**: January 24, 2026  
**Status**: Planning - Pre-Implementation  
**Critical**: This document defines the production data contract that MUST be maintained.

> ⚠️ **PRODUCTION WARNING**: The data structure defined here is currently in production. Any changes to the AI-First architecture MUST output data in this exact format to avoid breaking existing functionality.

---

## Overview

This document defines:
1. The **exact data structure** expected by `AIItineraryDisplay` (production contract)
2. How the **new AI-First architecture** will output compatible data
3. The **transformation layer** that ensures backwards compatibility
4. **Testing strategy** to prevent production regressions

---

## Current Production Data Structure

### Top-Level Itinerary Document

```typescript
interface AIGeneratedItinerary {
  id: string;
  userId: string;
  destination: string;
  startDate: string;              // "2025-08-01"
  endDate: string;                // "2025-08-07"
  ai_status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  response: {
    data: {
      itinerary: ItineraryData;
      recommendations?: Recommendations;
      transportation?: Transportation;
      assumptions?: Assumptions;
      metadata?: Metadata;
      costBreakdown?: CostBreakdown;
      assistant?: string;         // Legacy: JSON string of AI response
    };
  };
}
```

### ItineraryData Structure

```typescript
interface ItineraryData {
  destination: string;
  startDate: string;
  endDate: string;
  
  // Daily plans - UI checks BOTH locations
  days?: DailyPlan[];            // Primary location
  dailyPlans?: DailyPlan[];      // Fallback location
  
  // Flights (if airplane transport)
  flights?: Flight[];            // UI checks here FIRST
}
```

### DailyPlan Structure

```typescript
interface DailyPlan {
  day: number;                    // 1, 2, 3...
  date?: string;                  // "2025-08-01"
  title?: string;                 // "Day 1: Arrival & City Tour"
  theme?: string;                 // "Art & Romance"
  
  activities: Activity[];
  meals?: Meal[];
}
```

### Activity Structure (CRITICAL)

```typescript
interface Activity {
  // REQUIRED - UI displays these
  name: string;                   // "Museo Archeologico Nazionale"
  
  // OPTIONAL - UI handles gracefully if missing
  description?: string;           // "World-class Roman artifacts..."
  
  // Location - UI handles BOTH formats
  location?: string | {           // "Piazza Museo, 19" OR { name: "...", address: "..." }
    name?: string;
    address?: string;
  };
  
  // Time - UI handles multiple formats
  startTime?: string;             // "09:00"
  endTime?: string;               // "12:00"
  time?: string;                  // Alternative: "9:00 AM - 12:00 PM"
  duration?: string;              // "3 hours"
  
  // Ratings - from Google Places verification
  rating?: number;                // 4.7
  userRatingsTotal?: number;      // 32456
  
  // Cost - UI handles multiple formats
  estimatedCost?: number | string | { amount: number; currency?: string };
  cost?: string;                  // Alternative
  price?: string;                 // Alternative
  
  // Contact - from Google Places (optional in AI-First)
  phone?: string;                 // "+39 081 442 2149"
  website?: string;               // "https://..."
  
  // NEW FIELDS (AI-First additions - backwards compatible)
  why_for_you?: string;           // "Perfect for your art interest..."
  insider_tip?: string;           // "Arrive at 9 AM to avoid crowds..."
  matched_preferences?: string[]; // ["art", "history", "avoiding crowds"]
  googleMapsUrl?: string;         // "https://www.google.com/maps/place/?q=place_id:..."
  place_id?: string;              // Google Place ID for verification
}
```

### Meal Structure

```typescript
interface Meal {
  // Meal type
  name?: string;                  // "Lunch" or meal description
  type?: string;                  // "lunch", "dinner", "breakfast"
  time?: string;                  // "12:30 PM"
  
  // Restaurant details
  restaurant?: {
    name: string;                 // "Pizzeria Da Michele"
    description?: string;         // "Famous Neapolitan pizza..."
    cuisine?: string;             // "Italian"
    
    // Location - UI handles BOTH formats
    location?: string | {
      name?: string;
      address?: string;
    };
    
    // Ratings
    rating?: number;              // 4.4
    userRatingsTotal?: number;    // 18923
    
    // Contact
    phone?: string;
    website?: string;
    
    // Cost
    estimatedCost?: number | string | { amount: number };
    priceLevel?: number;          // 1-4 scale
    
    // NEW FIELDS (AI-First additions)
    why_for_you?: string;
    dietary_fit?: string;         // "Excellent vegetarian options"
    insider_tip?: string;
    googleMapsUrl?: string;
    place_id?: string;
  };
  
  // Alternative cost location
  cost?: string | { amount: number };
}
```

### Flight Structure (Unchanged - SerpAPI)

```typescript
interface Flight {
  airline?: string;               // "Delta"
  flightNumber?: string;          // "DL1234"
  route?: string;                 // "ATL → CDG"
  
  departure?: {
    date?: string;                // "2025-08-01"
    time?: string;                // "10:30 AM"
    iata?: string;                // "ATL"
  };
  
  arrival?: {
    date?: string;
    time?: string;
    iata?: string;                // "CDG"
  };
  
  duration?: string;              // "8h 45m"
  stops?: number;                 // 0 = direct
  cabin?: string;                 // "economy"
  class?: string;                 // Alternative to cabin
  
  price?: {
    amount: number;               // 850
    currency?: string;            // "USD"
  };
  
  // Round-trip return flight
  return?: {
    airline?: string;
    flightNumber?: string;
    route?: string;
    departure?: { date?: string; time?: string; iata?: string };
    arrival?: { date?: string; time?: string; iata?: string };
    duration?: string;
    stops?: number;
  };
}
```

### Recommendations Structure

```typescript
interface Recommendations {
  flights?: Flight[];             // UI checks here SECOND
  
  accommodations?: Accommodation[];
  
  alternativeActivities?: Activity[];
  alternativeRestaurants?: Restaurant[];
  
  transportation?: Transportation; // Fallback location
}
```

### Accommodation Structure

```typescript
interface Accommodation {
  name: string;                   // "Hotel Excelsior"
  
  // Address - UI checks multiple fields
  address?: string;
  formatted_address?: string;
  location?: { address?: string };
  
  // Ratings
  rating?: number;                // 4.5
  userRatingsTotal?: number;
  user_ratings_total?: number;    // Alternative
  
  // Price - UI handles multiple formats
  pricePerNight?: { amount: number; currency?: string };
  price?: { amount: number };
  priceAmount?: number;
  price_level?: number;           // 1-4 scale
  priceLevel?: number;
  
  // Booking
  bookingUrl?: string;
  website?: string;
  placeId?: string;               // For Google Maps fallback link
  
  // Photos
  photos?: string[];              // Array of URLs
  
  // Vendor data (optional)
  vendorRaw?: { website?: string };
  
  // NEW FIELDS (AI-First additions)
  why_for_you?: string;
  insider_tip?: string;
  googleMapsUrl?: string;
}
```

### Transportation Structure (Non-flight)

```typescript
interface Transportation {
  mode: string;                   // "car", "train", "bus"
  
  // Time/Distance - UI handles multiple formats
  estimatedTime?: string;         // "5h" (preferred)
  estimated_duration_hours?: number; // 5 (alternative)
  
  estimatedDistance?: string;     // "320 miles" (preferred)
  estimated_distance_miles?: number; // 320 (alternative)
  
  // Cost - UI handles multiple formats
  estimatedCost?: string | { amount: number; currency?: string };
  estimated_cost_usd?: number;    // Alternative
  
  // Provider info
  providers?: Provider[];
  provider?: string;              // Single provider alternative
  
  // Guidance
  steps?: string[];
  tips?: string[];
}

interface Provider {
  name: string;                   // "Amtrak"
  url?: string;                   // "https://amtrak.com"
  website?: string;               // Alternative
  link?: string;                  // Alternative
  notes?: string;
}
```

---

## AI-First Output Format

The new AI generator will output data that maps directly to this structure:

### AI Prompt Output Specification

```typescript
// What AI generates (internal format)
interface AIGeneratedOutput {
  trip_narrative: string;
  cultural_context: {
    safety_notes?: string;
    cultural_tips?: string;
    money_tips?: string;
  };
  
  daily_plans: AIDay[];
  
  budget_estimate?: {
    total: number;
    per_person: number;
    breakdown: { [category: string]: number };
  };
}

interface AIDay {
  day: number;
  date: string;
  theme: string;
  
  activities: AIActivity[];
  meals: AIMeal[];
}

interface AIActivity {
  name: string;
  type: string;
  why_for_you: string;           // AI personalization
  insider_tip: string;
  best_time: string;
  duration: string;
  cost_estimate?: string;
}

interface AIMeal {
  meal: string;                   // "lunch", "dinner"
  name: string;                   // Restaurant name
  cuisine: string;
  why_for_you: string;
  dietary_fit?: string;
  insider_tip: string;
  price_range: string;
  reservation_needed?: boolean;
}
```

---

## Transformation Layer

### transformAIOutput Function

This function converts AI output + Google verification into the production format:

```typescript
// src/utils/transformAIOutput.ts

interface TransformInput {
  aiOutput: AIGeneratedOutput;
  verifiedPlaces: Map<string, GooglePlace>;  // name -> verified place data
  destination: string;
  startDate: string;
  endDate: string;
  userId: string;
}

export function transformAIOutput(input: TransformInput): AIGeneratedItinerary {
  const { aiOutput, verifiedPlaces, destination, startDate, endDate, userId } = input;
  
  return {
    id: generateId(),
    userId,
    destination,
    startDate,
    endDate,
    ai_status: 'completed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    
    response: {
      data: {
        itinerary: {
          destination,
          startDate,
          endDate,
          
          // Use 'days' as primary location (matches PWA)
          days: aiOutput.daily_plans.map((aiDay, index) => 
            transformDay(aiDay, index, verifiedPlaces)
          ),
        },
        
        recommendations: {
          accommodations: [],  // Populated separately from hotel search
          alternativeActivities: [],
          alternativeRestaurants: [],
        },
        
        metadata: {
          generatedBy: 'ai-first-v2',
          aiModel: 'gpt-4o-mini',
          transformVersion: '1.0.0',
          culturalContext: aiOutput.cultural_context,
          tripNarrative: aiOutput.trip_narrative,
        },
        
        costBreakdown: aiOutput.budget_estimate ? {
          total: aiOutput.budget_estimate.total,
          perPerson: aiOutput.budget_estimate.per_person,
          byCategory: aiOutput.budget_estimate.breakdown,
        } : undefined,
      },
    },
  };
}

function transformDay(
  aiDay: AIDay, 
  index: number, 
  verifiedPlaces: Map<string, GooglePlace>
): DailyPlan {
  return {
    day: aiDay.day,
    date: aiDay.date,
    title: `Day ${aiDay.day}: ${aiDay.theme}`,
    theme: aiDay.theme,
    
    activities: aiDay.activities.map(activity => 
      transformActivity(activity, verifiedPlaces)
    ),
    
    meals: aiDay.meals.map(meal => 
      transformMeal(meal, verifiedPlaces)
    ),
  };
}

function transformActivity(
  aiActivity: AIActivity,
  verifiedPlaces: Map<string, GooglePlace>
): Activity {
  const verified = verifiedPlaces.get(aiActivity.name);
  
  // CRITICAL: Output in EXACT format expected by AIItineraryDisplay
  return {
    // Required field
    name: verified?.name || aiActivity.name,
    
    // AI enrichment (NEW - but backwards compatible since optional)
    description: aiActivity.why_for_you,  // Map AI's 'why' to description
    why_for_you: aiActivity.why_for_you,  // Also keep original field
    insider_tip: aiActivity.insider_tip,
    
    // Time handling - use AI's duration, convert to start/end if possible
    duration: aiActivity.duration,
    startTime: parseTimeFromBestTime(aiActivity.best_time, 'start'),
    endTime: parseTimeFromBestTime(aiActivity.best_time, 'end'),
    
    // From Google Places verification (if available)
    ...(verified ? {
      location: verified.formatted_address,
      rating: verified.rating,
      userRatingsTotal: verified.user_ratings_total,
      place_id: verified.place_id,
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${verified.place_id}`,
      // Note: phone/website NOT included (skip Place Details for cost savings)
    } : {
      location: undefined,  // AI can't provide reliable locations
    }),
    
    // Cost estimate from AI
    estimatedCost: aiActivity.cost_estimate,
  };
}

function transformMeal(
  aiMeal: AIMeal,
  verifiedPlaces: Map<string, GooglePlace>
): Meal {
  const verified = verifiedPlaces.get(aiMeal.name);
  
  return {
    name: aiMeal.meal.charAt(0).toUpperCase() + aiMeal.meal.slice(1),
    type: aiMeal.meal,
    time: getMealDefaultTime(aiMeal.meal),
    
    restaurant: {
      name: verified?.name || aiMeal.name,
      description: aiMeal.why_for_you,
      cuisine: aiMeal.cuisine,
      
      // AI enrichment
      why_for_you: aiMeal.why_for_you,
      dietary_fit: aiMeal.dietary_fit,
      insider_tip: aiMeal.insider_tip,
      
      // From Google Places verification
      ...(verified ? {
        location: verified.formatted_address,
        rating: verified.rating,
        userRatingsTotal: verified.user_ratings_total,
        place_id: verified.place_id,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${verified.place_id}`,
      } : {}),
      
      // Price from AI
      estimatedCost: aiMeal.price_range,
    },
  };
}
```

---

## Backwards Compatibility Guarantees

### What MUST NOT Change

| Field | Location | Reason |
|-------|----------|--------|
| `response.data.itinerary.days` | Primary | UI reads days from here first |
| `activity.name` | Required | UI displays this directly |
| `activity.description` | Optional | UI displays if present |
| `activity.location` | Optional | UI handles string OR object |
| `activity.rating` | Optional | UI displays if present |
| `flight.*` | All fields | SerpAPI format, unchanged |
| `transportation.mode` | Required | UI displays this |

### What CAN Be Added (New Fields)

| New Field | Type | Purpose |
|-----------|------|---------|
| `activity.why_for_you` | string | AI personalization |
| `activity.insider_tip` | string | AI local knowledge |
| `activity.matched_preferences` | string[] | Preference matching |
| `activity.googleMapsUrl` | string | Replace website/phone |
| `activity.place_id` | string | Google verification |
| `meal.restaurant.why_for_you` | string | AI personalization |
| `meal.restaurant.dietary_fit` | string | Dietary explanation |
| `metadata.tripNarrative` | string | AI story |
| `metadata.culturalContext` | object | AI context |

### What CAN Be Removed (Optional Fields)

| Field | Impact | Mitigation |
|-------|--------|------------|
| `activity.phone` | UI shows link if present | Use googleMapsUrl instead |
| `activity.website` | UI shows link if present | Use googleMapsUrl instead |
| `activity.priceLevel` | UI shows $ signs | Use estimatedCost string |

---

## Testing Strategy

### 1. Snapshot Tests

Create snapshots of current production itineraries to compare against AI-First output:

```typescript
// __tests__/dataContract.test.ts

describe('AI-First Data Contract', () => {
  it('transforms AI output to match production structure', () => {
    const aiOutput = mockAIOutput();
    const verifiedPlaces = mockVerifiedPlaces();
    
    const result = transformAIOutput({
      aiOutput,
      verifiedPlaces,
      destination: 'Naples, Italy',
      startDate: '2025-08-01',
      endDate: '2025-08-07',
      userId: 'test-user',
    });
    
    // Verify structure matches production
    expect(result.response.data.itinerary.days).toBeDefined();
    expect(result.response.data.itinerary.days[0].activities[0].name).toBeDefined();
    expect(result.response.data.itinerary.days[0].meals[0].restaurant.name).toBeDefined();
  });
  
  it('renders correctly in AIItineraryDisplay', () => {
    const transformed = transformAIOutput(mockInput());
    
    const { getByText } = render(
      <AIItineraryDisplay itinerary={transformed} />
    );
    
    expect(getByText('Naples, Italy')).toBeTruthy();
    expect(getByText(/Day 1/)).toBeTruthy();
  });
});
```

### 2. E2E Comparison

Run both old and new systems in parallel, compare outputs:

```typescript
// Integration test
it('AI-First produces identical visible output', async () => {
  const request = {
    destination: 'Paris, France',
    startDate: '2025-08-01',
    endDate: '2025-08-07',
    tripType: 'leisure',
  };
  
  // Generate with both systems
  const oldResult = await generateWithOldSystem(request);
  const newResult = await generateWithAIFirst(request);
  
  // Compare user-visible fields
  expect(newResult.destination).toBe(oldResult.destination);
  expect(newResult.response.data.itinerary.days.length).toBe(
    oldResult.response.data.itinerary.days.length
  );
  
  // New result should have ADDITIONAL fields
  expect(newResult.response.data.itinerary.days[0].activities[0].why_for_you).toBeDefined();
});
```

### 3. Production Canary

Deploy AI-First to 5% of users first:

```typescript
// Feature flag
const useAIFirst = async (userId: string): Promise<boolean> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  const bucket = hashUserId(userId) % 100;
  
  // Roll out to 5% initially
  return bucket < 5 || userDoc.data()?.betaTester === true;
};
```

---

## Migration Plan

### Phase 1: Build Transformation Layer (Week 1)

1. ✅ Document current data contract (this document)
2. Create `transformAIOutput` function
3. Write comprehensive unit tests
4. Verify with production snapshots

### Phase 2: AI Generator (Week 2)

1. Build AI prompt that outputs `AIGeneratedOutput` format
2. Build Google verification layer
3. Integrate transformation layer
4. Test end-to-end locally

### Phase 3: Canary Deployment (Week 3)

1. Deploy with feature flag (5% of users)
2. Monitor for errors
3. Compare outputs with old system
4. Gather user feedback

### Phase 4: Full Rollout (Week 4)

1. Increase to 25% → 50% → 100%
2. Monitor metrics (generation time, error rate, user satisfaction)
3. Keep old system as fallback for 2 weeks
4. Deprecate old system

---

## Rollback Plan

If AI-First causes production issues:

1. **Immediate**: Feature flag to 0% (affects new generations only)
2. **Existing Data**: Old itineraries unaffected (same format)
3. **Fallback**: Old system remains deployable for 30 days

---

## Summary

| Aspect | Strategy |
|--------|----------|
| **Data Structure** | Exact match to current production |
| **New Fields** | Additive only (optional fields) |
| **Removed Fields** | phone/website → googleMapsUrl |
| **Transformation** | Server-side, before storage |
| **Testing** | Snapshot + E2E + Canary |
| **Rollout** | Gradual (5% → 100%) |
| **Rollback** | Feature flag + old system available |

**The UI will NOT need any changes** - the transformation layer ensures the data structure matches exactly what `AIItineraryDisplay` expects.

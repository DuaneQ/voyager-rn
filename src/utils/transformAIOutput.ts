/**
 * transformAIOutput - Transform AI-First Output to Production Format
 * 
 * This utility transforms the output from generateFullItinerary + verifyPlaces
 * into the exact production data format expected by AIItineraryDisplay.
 * 
 * CRITICAL: The output format MUST match existing production itineraries
 * to ensure backwards compatibility. See DATA_CONTRACT_BACKWARDS_COMPATIBILITY.md
 * 
 * @created January 2026
 */

// ============================================================================
// Input Types (from Cloud Functions)
// ============================================================================

/** Activity from AI generation */
export interface AIActivity {
  name: string;
  type: string;
  insider_tip: string;
  best_time: string;
  duration: string;
  cost_estimate?: string;
}

/** Meal from AI generation */
export interface AIMeal {
  meal: string;  // 'breakfast' | 'lunch' | 'dinner'
  name: string;  // Restaurant name
  cuisine: string;
  dietary_fit?: string;
  insider_tip: string;
  price_range: string;
  reservation_needed?: boolean;
}

/** Day from AI generation */
export interface AIDay {
  day: number;
  date: string;
  theme: string;
  activities: AIActivity[];
  meals: AIMeal[];
}

/** Full AI output from generateFullItinerary */
export interface AIGeneratedOutput {
  travel_agent_summary: string;  // Personalized greeting from the "travel agent"
  trip_narrative?: string;  // Legacy field (deprecated)
  cultural_context: {
    safety_notes?: string;
    cultural_tips?: string;
    money_tips?: string;
    language_tips?: string;
  };
  daily_plans: AIDay[];
  budget_estimate?: {
    total: number;
    per_person: number;
    currency: string;
    breakdown: {
      activities: number;
      food: number;
      transportation: number;
    };
  };
  packing_tips?: string[];
  best_time_to_visit?: string;
}

/** Verified place from verifyPlaces */
export interface VerifiedPlace {
  originalName: string;
  verified: boolean;
  verificationConfidence: 'high' | 'medium' | 'low' | 'not_found';
  place_id?: string;
  name?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  coordinates?: { lat: number; lng: number };
  types?: string[];
  business_status?: string;
  googleMapsUrl?: string;
  reason?: string;
}

// ============================================================================
// Output Types (Production Format)
// ============================================================================

/** Production activity format - matches AIItineraryDisplay exactly */
export interface ProductionActivity {
  id: string;
  name: string;
  description?: string;
  category: string;
  location?: string | { name?: string; address?: string };
  startTime?: string;
  endTime?: string;
  duration?: string;
  rating?: number;
  userRatingsTotal?: number;
  estimatedCost?: string | number | { amount: number; currency?: string };
  phone?: string;  // Omitted in AI-first (use googleMapsUrl)
  website?: string;  // Omitted in AI-first (use googleMapsUrl)
  
  // NEW AI-first fields (backwards compatible - optional)
  insider_tip?: string;
  matched_preferences?: string[];
  googleMapsUrl?: string;
  place_id?: string;
}

/** Production meal format */
export interface ProductionMeal {
  name?: string;
  type?: string;
  time?: string;
  restaurant?: {
    name: string;
    description?: string;
    cuisine?: string;
    location?: string | { name?: string; address?: string };
    rating?: number;
    userRatingsTotal?: number;
    estimatedCost?: string | number | { amount: number };
    priceLevel?: number;
    phone?: string;
    website?: string;
    
    // NEW AI-first fields
    dietary_fit?: string;
    insider_tip?: string;
    googleMapsUrl?: string;
    place_id?: string;
  };
  cost?: string | { amount: number };
}

/** Production daily plan format */
export interface ProductionDailyPlan {
  day: number;
  date?: string;
  title?: string;
  theme?: string;
  activities: ProductionActivity[];
  meals?: ProductionMeal[];
}

/** Full production itinerary format */
export interface ProductionItinerary {
  destination: string;
  startDate: string;
  endDate: string;
  days?: ProductionDailyPlan[];
  dailyPlans?: ProductionDailyPlan[];  // Fallback location
  flights?: any[];
}

/** Production response format (what's saved to Firestore) */
export interface ProductionItineraryDocument {
  id: string;
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  ai_status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  response: {
    data: {
      itinerary: ProductionItinerary;
      recommendations?: {
        accommodations?: any[];
        alternativeActivities?: any[];
        alternativeRestaurants?: any[];
      };
      transportation?: any;
      assumptions?: any;
      metadata?: {
        generatedBy: string;
        aiModel: string;
        transformVersion: string;
        culturalContext?: any;
        travelAgentSummary?: string;  // Personalized greeting for the card
        tripNarrative?: string;  // Legacy fallback
        processingTimeMs?: number;
      };
      costBreakdown?: {
        total: number;
        perPerson: number;
        byCategory?: { [key: string]: number };
      };
    };
  };
}

// ============================================================================
// Transform Input
// ============================================================================

export interface TransformInput {
  aiOutput: AIGeneratedOutput;
  verifiedPlaces: Map<string, VerifiedPlace>;  // Map by originalName
  destination: string;
  startDate: string;
  endDate: string;
  userId: string;
  processingTimeMs?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for activities/meals
 */
function generateId(prefix: string, dayIndex: number, itemIndex: number): string {
  return `${prefix}_${dayIndex}_${itemIndex}_${Date.now()}`;
}

/**
 * Parse time from AI's best_time field
 * e.g., "morning" -> "09:00", "afternoon" -> "14:00", "evening" -> "19:00"
 */
function parseTimeFromBestTime(bestTime: string, type: 'start' | 'end'): string | undefined {
  const normalized = (bestTime || '').toLowerCase().trim();
  
  const timeMap: { [key: string]: { start: string; end: string } } = {
    'morning': { start: '09:00', end: '12:00' },
    'late morning': { start: '10:00', end: '12:30' },
    'afternoon': { start: '14:00', end: '17:00' },
    'late afternoon': { start: '15:00', end: '18:00' },
    'evening': { start: '19:00', end: '22:00' },
    'night': { start: '20:00', end: '23:00' }
  };
  
  const mapped = timeMap[normalized];
  if (mapped) {
    return type === 'start' ? mapped.start : mapped.end;
  }
  
  return undefined;
}

/**
 * Get default meal time based on meal type
 */
function getMealDefaultTime(mealType: string): string {
  const normalized = (mealType || '').toLowerCase();
  
  switch (normalized) {
    case 'breakfast':
      return '08:30';
    case 'lunch':
      return '12:30';
    case 'dinner':
      return '19:30';
    case 'snack':
      return '15:00';
    default:
      return '12:00';
  }
}

/**
 * Infer category from AI activity type
 */
function inferCategory(type: string): string {
  const normalized = (type || '').toLowerCase();
  
  const categoryMap: { [key: string]: string } = {
    'museum': 'museum',
    'attraction': 'attraction',
    'walking': 'walking_tour',
    'experience': 'experience',
    'shopping': 'shopping',
    'park': 'outdoor',
    'beach': 'outdoor',
    'tour': 'tour',
    'nightlife': 'nightlife',
    'restaurant': 'dining'
  };
  
  return categoryMap[normalized] || 'attraction';
}

// ============================================================================
// Main Transform Functions
// ============================================================================

/**
 * Transform a single AI activity into production format
 */
function transformActivity(
  aiActivity: AIActivity,
  verifiedPlaces: Map<string, VerifiedPlace>,
  dayIndex: number,
  activityIndex: number
): ProductionActivity {
  const verified = verifiedPlaces.get(aiActivity.name);
  
  // Build production activity
  const activity: ProductionActivity = {
    id: generateId('activity', dayIndex, activityIndex),
    
    // Use verified name if available, fallback to AI name
    name: verified?.name || aiActivity.name,
    
    // Use insider tip as description (brief context about the place)
    description: aiActivity.insider_tip,
    insider_tip: aiActivity.insider_tip,
    
    // Category from AI type
    category: inferCategory(aiActivity.type),
    
    // Time handling
    duration: aiActivity.duration,
    startTime: parseTimeFromBestTime(aiActivity.best_time, 'start'),
    endTime: parseTimeFromBestTime(aiActivity.best_time, 'end'),
    
    // Cost from AI
    estimatedCost: aiActivity.cost_estimate
  };
  
  // Add verified Google Places data if available
  if (verified?.verified) {
    activity.location = verified.formatted_address;
    activity.rating = verified.rating;
    activity.userRatingsTotal = verified.user_ratings_total;
    activity.place_id = verified.place_id;
    activity.googleMapsUrl = verified.googleMapsUrl;
    
    // Note: We intentionally skip phone/website (Place Details cost)
    // Users can click googleMapsUrl to get contact info
  }
  
  return activity;
}

/**
 * Transform a single AI meal into production format
 */
function transformMeal(
  aiMeal: AIMeal,
  verifiedPlaces: Map<string, VerifiedPlace>,
  dayIndex: number,
  mealIndex: number
): ProductionMeal {
  const verified = verifiedPlaces.get(aiMeal.name);
  
  // Build restaurant object
  const restaurant: ProductionMeal['restaurant'] = {
    name: verified?.name || aiMeal.name,
    description: aiMeal.insider_tip,  // Use insider tip as brief description
    cuisine: aiMeal.cuisine,
    
    // AI enrichment
    dietary_fit: aiMeal.dietary_fit,
    insider_tip: aiMeal.insider_tip,
    
    // Price from AI
    estimatedCost: aiMeal.price_range
  };
  
  // Add verified data if available
  if (verified?.verified) {
    restaurant.location = verified.formatted_address;
    restaurant.rating = verified.rating;
    restaurant.userRatingsTotal = verified.user_ratings_total;
    restaurant.place_id = verified.place_id;
    restaurant.googleMapsUrl = verified.googleMapsUrl;
  }
  
  return {
    name: aiMeal.meal.charAt(0).toUpperCase() + aiMeal.meal.slice(1),
    type: aiMeal.meal,
    time: getMealDefaultTime(aiMeal.meal),
    restaurant,
    cost: aiMeal.price_range
  };
}

/**
 * Transform a single AI day into production format
 */
function transformDay(
  aiDay: AIDay,
  verifiedPlaces: Map<string, VerifiedPlace>,
  dayIndex: number
): ProductionDailyPlan {
  return {
    day: aiDay.day,
    date: aiDay.date,
    title: `Day ${aiDay.day}: ${aiDay.theme}`,
    theme: aiDay.theme,
    
    activities: aiDay.activities.map((activity, idx) => 
      transformActivity(activity, verifiedPlaces, dayIndex, idx)
    ),
    
    meals: aiDay.meals.map((meal, idx) => 
      transformMeal(meal, verifiedPlaces, dayIndex, idx)
    )
  };
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Transform AI output + verified places into production format
 * 
 * This is the main function that ensures backwards compatibility.
 * The output matches EXACTLY what AIItineraryDisplay expects.
 */
export function transformAIOutput(input: TransformInput): ProductionItineraryDocument {
  const { 
    aiOutput, 
    verifiedPlaces, 
    destination, 
    startDate, 
    endDate, 
    userId,
    processingTimeMs 
  } = input;
  
  // Transform all daily plans
  const transformedDays = aiOutput.daily_plans.map((day, index) => 
    transformDay(day, verifiedPlaces, index)
  );
  
  // Build production document
  return {
    id: `ai_${userId}_${Date.now()}`,
    userId,
    destination,
    startDate,
    endDate,
    ai_status: 'completed',
    createdAt: new Date(),
    updatedAt: new Date(),
    
    response: {
      data: {
        itinerary: {
          destination,
          startDate,
          endDate,
          // Use 'days' as primary location (matches PWA)
          days: transformedDays
        },
        
        recommendations: {
          accommodations: [],  // Populated separately if needed
          alternativeActivities: [],
          alternativeRestaurants: []
        },
        
        metadata: {
          generatedBy: 'ai-first-v1',
          aiModel: 'gpt-4o-mini',
          transformVersion: '1.1.0',
          culturalContext: aiOutput.cultural_context,
          travelAgentSummary: aiOutput.travel_agent_summary,  // Personalized greeting
          tripNarrative: aiOutput.trip_narrative,  // Legacy fallback
          processingTimeMs
        },
        
        costBreakdown: aiOutput.budget_estimate ? {
          total: aiOutput.budget_estimate.total,
          perPerson: aiOutput.budget_estimate.per_person,
          byCategory: aiOutput.budget_estimate.breakdown
        } : undefined
      }
    }
  };
}

/**
 * Helper to create a Map of verified places from array
 */
export function createVerifiedPlacesMap(
  verifiedPlaces: VerifiedPlace[]
): Map<string, VerifiedPlace> {
  const map = new Map<string, VerifiedPlace>();
  
  for (const place of verifiedPlaces) {
    map.set(place.originalName, place);
  }
  
  return map;
}

/**
 * Extract all place names from AI output for verification
 */
export function extractPlaceNames(aiOutput: AIGeneratedOutput): string[] {
  const names: string[] = [];
  
  for (const day of aiOutput.daily_plans) {
    // Extract activity names
    for (const activity of day.activities) {
      if (activity.name) {
        names.push(activity.name);
      }
    }
    
    // Extract restaurant names
    for (const meal of day.meals) {
      if (meal.name) {
        names.push(meal.name);
      }
    }
  }
  
  return names;
}

export default transformAIOutput;

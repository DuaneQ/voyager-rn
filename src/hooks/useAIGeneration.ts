/**
 * React Native AI Generation Hook
 * Maintains full parity with PWA Firebase Cloud Functions while adding mobile optimizations
 */

import { useState, useCallback, useRef } from 'react';
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '../config/firebaseConfig';
import { 
  AIGenerationRequest, 
  AIGenerationProgress, 
  ItineraryResult, 
  CloudFunctionResult,
  RetryConfig,
  AIGenerationError,
  AIGenerationErrorType 
} from '../types/AIGeneration';
import { sanitizeAIGenerationRequest } from '../utils/sanitizeInput';
import { applyProfileDefaults } from '../utils/profileDefaults';
import { calculateAge } from '../utils/calculateAge';

// Default retry configuration for network resilience
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,     // 1 second
  maxDelay: 10000,     // 10 seconds
  backoffMultiplier: 2
};

// Progress stages matching PWA exactly
const PROGRESS_STAGES = {
  INITIALIZING: { stage: 'initializing' as const, percent: 10, message: 'Preparing your request...' },
  SEARCHING: { stage: 'searching' as const, percent: 30, message: 'Finding flights and accommodations...' },
  ACTIVITIES: { stage: 'activities' as const, percent: 50, message: 'Discovering amazing activities...' },
  AI_GENERATION: { stage: 'ai_generation' as const, percent: 75, message: 'Creating your personalized itinerary...' },
  SAVING: { stage: 'saving' as const, percent: 90, message: 'Saving your itinerary...' },
  DONE: { stage: 'done' as const, percent: 100, message: 'Your itinerary is ready!' }
} as const;

export interface UseAIGenerationReturn {
  generateItinerary: (request: AIGenerationRequest) => Promise<ItineraryResult>;
  progress: AIGenerationProgress;
  isGenerating: boolean;
  error: AIGenerationError | null;
  cancelGeneration: () => void;
}

export const useAIGeneration = (): UseAIGenerationReturn => {
  const [progress, setProgress] = useState<AIGenerationProgress>(PROGRESS_STAGES.INITIALIZING);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<AIGenerationError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper function to create AI Generation errors
  const createAIError = (
    type: AIGenerationErrorType, 
    message: string, 
    code?: string, 
    details?: any
  ): AIGenerationError => {
    const error = new Error(message) as AIGenerationError;
    error.type = type;
    error.code = code;
    error.details = details;
    return error;
  };

  // Exponential backoff retry mechanism
  const retryWithBackoff = async <T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    errorType: AIGenerationErrorType = 'network_error'
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        // Check if operation was cancelled
        if (abortControllerRef.current?.signal.aborted) {
          throw createAIError('unknown_error', 'Operation was cancelled');
        }
        
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain error types
        if (error instanceof Error) {
          if (error.message.includes('permission-denied') || 
              error.message.includes('unauthenticated') ||
              error.message.includes('invalid-argument')) {
            throw createAIError('permission_denied', error.message, undefined, error);
          }
          
          if (error.message.includes('quota-exceeded') || 
              error.message.includes('resource-exhausted')) {
            throw createAIError('quota_exceeded', error.message, undefined, error);
          }
        }
        
        // If this was the last attempt, throw the error
        if (attempt === config.maxAttempts) {
          throw createAIError(errorType, lastError.message, undefined, lastError);
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;
        
        console.warn(`AI Generation attempt ${attempt} failed, retrying in ${jitteredDelay}ms:`, lastError.message);
        
        // Wait before retrying (with abort signal support)
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(resolve, jitteredDelay);
          
          if (abortControllerRef.current) {
            abortControllerRef.current.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(createAIError('unknown_error', 'Operation was cancelled'));
            });
          }
        });
      }
    }
    
    throw createAIError(errorType, lastError!.message, undefined, lastError!);
  };

  // Firebase Cloud Function caller with retry logic
  const callCloudFunction = async (
    functionName: string, 
    data: any
  ): Promise<CloudFunctionResult> => {

    return retryWithBackoff(async () => {
      const callable = httpsCallable(functions, functionName);
      // Pass data directly - Firebase httpsCallable already handles wrapping
      const result = await callable(data);

      // Type assertion since Firebase callable returns unknown
      const functionResult = result.data as CloudFunctionResult;
      
      if (!functionResult.success) {
        throw new Error(functionResult.error || `${functionName} failed`);
      }
      
      return functionResult;
    }, DEFAULT_RETRY_CONFIG, 'server_error');
  };

  // Cancel current generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    setProgress(PROGRESS_STAGES.INITIALIZING);
    setError(null);
  }, []);

  // Main generation function - matches PWA flow exactly
  const generateItinerary = useCallback(async (request: AIGenerationRequest): Promise<ItineraryResult> => {
    // Reset state
    setIsGenerating(true);
    setError(null);
    setProgress(PROGRESS_STAGES.INITIALIZING);
    
    // Create new AbortController for this generation
    abortControllerRef.current = new AbortController();
    
    try {
      // Step 1: Input sanitization and validation
      const sanitizedRequest = sanitizeAIGenerationRequest(request);
      
      if (!sanitizedRequest.destination || !sanitizedRequest.startDate || !sanitizedRequest.endDate) {
        throw createAIError('validation_error', 'Missing required fields: destination, startDate, or endDate');
      }
      
      // Validate user ID early to avoid wasting API calls
      const userId = sanitizedRequest.userInfo?.uid;
      if (!userId) {
        throw createAIError('validation_error', 'User ID is required to save itinerary');
      }
      
  // Step 2: Determine transport type and flight needs (matching PWA logic)
  const selectedProfile = sanitizedRequest.travelPreferences || sanitizedRequest.preferenceProfile;

  // Apply conservative defaults for first-time/empty profiles so the AI flow
  // has sensible values but does not unexpectedly enable flights.
  const profileWithDefaults = applyProfileDefaults(selectedProfile);

  const transportTypeRaw = profileWithDefaults?.transportation?.primaryMode || 'driving';

      // Map 'airplane' to 'flight' to match cloud function expectations
      const transportType = transportTypeRaw === 'airplane' ? 'flight' : transportTypeRaw;
  const includeFlights = transportType === 'flight' || transportTypeRaw === 'airplane';
      
      setProgress(PROGRESS_STAGES.SEARCHING);
      
      // Step 3: Build function calls (matching PWA pattern exactly)
      // CRITICAL: Calculate trip duration FIRST so we can pass it to cloud functions for enrichment
      const startDate = new Date(sanitizedRequest.startDate);
      const endDate = new Date(sanitizedRequest.endDate);
      const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Build base payload for all functions
      // IMPORTANT: Include 'days' parameter so searchActivities enriches the right number of activities!
      const basePayload = {
        destination: sanitizedRequest.destination,
        departure: sanitizedRequest.departure || '',
        startDate: sanitizedRequest.startDate,
        endDate: sanitizedRequest.endDate,
        days: tripDays, // CRITICAL: This tells searchActivities how many activities to enrich
        preferenceProfile: profileWithDefaults,
        userInfo: sanitizedRequest.userInfo,
        tripType: sanitizedRequest.tripType || 'leisure',
        mustInclude: sanitizedRequest.mustInclude || [],
        mustAvoid: sanitizedRequest.mustAvoid || [],
        specialRequests: sanitizedRequest.specialRequests || ''
      };
      
      // Parallel external API calls
      const promises: Promise<CloudFunctionResult>[] = [
        // Always call accommodations and activities  
        callCloudFunction('searchAccommodations', basePayload),
        callCloudFunction('searchActivities', basePayload)
      ];
      
      // Track whether we actually searched for flights
      let didSearchFlights = false;
      
      // Only add flights if transportation mode is flight AND airport codes are provided
      if (includeFlights && sanitizedRequest.departureAirportCode && sanitizedRequest.destinationAirportCode) {
        const flightPayload = {
          ...basePayload,
          departureAirportCode: sanitizedRequest.departureAirportCode,
          destinationAirportCode: sanitizedRequest.destinationAirportCode,
          cabinClass: sanitizedRequest.flightPreferences?.class?.toUpperCase() || 'ECONOMY',
          preferredAirlines: sanitizedRequest.flightPreferences?.preferredAirlines || [],
          stops: sanitizedRequest.flightPreferences?.stopPreference === 'non-stop' ? 'NONSTOP' : 
                 sanitizedRequest.flightPreferences?.stopPreference === 'one-stop' ? 'ONE_OR_FEWER' : 'ANY'
        };
        promises.push(callCloudFunction('searchFlights', flightPayload));
        didSearchFlights = true;
      }
      
      setProgress(PROGRESS_STAGES.ACTIVITIES);
      
      // Execute all searches in parallel
      const results = await Promise.all(promises);
      
      // Extract results - handle both shapes returned by callCloudFunction
      // callCloudFunction returns the function result (result.data), but some functions
      // may themselves nest useful arrays under `.data` or at the top level. Support both.
      const accommodationsResult = results[0] || {};
      const accommodationsData = Array.isArray((accommodationsResult as any).hotels)
        ? (accommodationsResult as any).hotels
        : (Array.isArray((accommodationsResult as any).data?.hotels) ? (accommodationsResult as any).data.hotels : []);

      const activitiesResult = results[1] || {};
      const activitiesData = Array.isArray((activitiesResult as any).activities)
        ? (activitiesResult as any).activities
        : (Array.isArray((activitiesResult as any).data?.activities) ? (activitiesResult as any).data.activities : []);

      const restaurantsData = Array.isArray((activitiesResult as any).restaurants)
        ? (activitiesResult as any).restaurants
        : (Array.isArray((activitiesResult as any).data?.restaurants) ? (activitiesResult as any).data.restaurants : []);

      const flightsResult = didSearchFlights ? (results[2] || {}) : {};
      const flightsData = didSearchFlights
        ? (Array.isArray((flightsResult as any).flights)
            ? (flightsResult as any).flights
            : (Array.isArray((flightsResult as any).data?.flights) ? (flightsResult as any).data.flights : []))
        : [];

      // === CRITICAL WARNING if activities are empty ===
      if (activitiesData.length === 0) {
        console.error('❌ CRITICAL: No activities returned from searchActivities!');
        console.error('📋 basePayload sent:', JSON.stringify(basePayload, null, 2));
        console.error('📊 Full activitiesResult:', JSON.stringify(activitiesResult, null, 2));
      }
      
      setProgress(PROGRESS_STAGES.AI_GENERATION);
      
      // Create daily plans by distributing activities and restaurants across trip days (matching PWA)
      const dailyPlans: any[] = [];
      const enrichedActivities = activitiesData.filter((act: any) => act.phone || act.website || act.price_level);
      const enrichedRestaurants = restaurantsData.filter((rest: any) => rest.phone || rest.website || rest.price_level);

      // Log helpful diagnostics when enrichment is missing or insufficient (tests rely on these messages)
      const expectedEnrichedCount = Math.min(tripDays, 6);
      if (enrichedActivities.length === 0) {
        console.error('No enriched activities found');
      }
      if (enrichedActivities.length < expectedEnrichedCount) {
        // Matches test expectation: console.error('Expected at least', <number>, 'enriched activities for', <tripDays>, 'day trip')
        console.error('Expected at least', expectedEnrichedCount, 'enriched activities for', tripDays, 'day trip');
      }
      
      // Helper function to calculate price from Google Places price_level
      const calculatePrice = (item: any, defaultCategory: string) => {
        if (typeof item.price_level === 'number') {
          switch (item.price_level) {
            case 0: return 0;
            case 1: return 15;
            case 2: return 35;
            case 3: return 65;
            case 4: return 100;
            default: return 25;
          }
        }
        const category = (item.category || item.type || defaultCategory).toLowerCase();
        if (category.includes('museum') || category.includes('gallery')) return 20;
        if (category.includes('park') || category.includes('beach')) return 0;
        if (category.includes('restaurant') || category.includes('food')) return 40;
        if (category.includes('theater') || category.includes('show')) return 75;
        if (category.includes('tour') || category.includes('attraction')) return 30;
        return 25;
      };
      
      for (let dayIndex = 0; dayIndex < tripDays; dayIndex++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + dayIndex);
        const dayDateString = currentDate.toISOString().split('T')[0];
        
        // Use ONLY enriched activities/restaurants (matching PWA exactly)
        const dayActivity = enrichedActivities[dayIndex % Math.max(1, enrichedActivities.length)];
        const dayRestaurant = enrichedRestaurants[dayIndex % Math.max(1, enrichedRestaurants.length)];
        
        const dayPlan = {
          date: dayDateString,
          day: dayIndex + 1,
          activities: dayActivity ? [{
            id: dayActivity.id || `activity_${dayIndex}`,
            name: dayActivity.name || 'Explore Local Area',
            description: dayActivity.description || `Discover ${sanitizedRequest.destination}`,
            location: dayActivity.location?.name || dayActivity.location?.address || sanitizedRequest.destination,
            startTime: '10:00',
            endTime: '16:00',
            category: dayActivity.category || 'sightseeing',
            estimatedCost: {
              amount: calculatePrice(dayActivity, 'sightseeing'),
              currency: 'USD'
            },
            phone: dayActivity.phone,
            website: dayActivity.website,
            rating: dayActivity.rating,
            userRatingsTotal: dayActivity.userRatingsTotal,
            placeId: dayActivity.placeId,
            coordinates: dayActivity.location?.coordinates
          }] : [],
          meals: dayRestaurant ? [{
            id: dayRestaurant.id || `meal_${dayIndex}`,
            name: 'Dinner',
            type: 'dinner',
            time: '19:00',
            timing: { time: '19:00' },
            cost: {
              amount: calculatePrice(dayRestaurant, 'restaurant'),
              currency: 'USD'
            },
            restaurant: {
              id: dayRestaurant.id || `restaurant_${dayIndex}`,
              name: dayRestaurant.name || 'Local Restaurant',
              description: dayRestaurant.description || `Dine in ${sanitizedRequest.destination}`,
              location: dayRestaurant.location?.name || dayRestaurant.location?.address || sanitizedRequest.destination,
              category: dayRestaurant.category || 'restaurant',
              phone: dayRestaurant.phone,
              website: dayRestaurant.website,
              rating: dayRestaurant.rating,
              userRatingsTotal: dayRestaurant.userRatingsTotal,
              placeId: dayRestaurant.placeId,
              coordinates: dayRestaurant.location?.coordinates,
              cuisine: dayRestaurant.category || 'restaurant'
            }
          }] : []
        };
        
        dailyPlans.push(dayPlan);
      }
      
      // Generate description from daily plans (matching PWA)
      const generateDescriptionFromDailyPlans = (dailyPlans: any[], destination: string): string => {
        if (!dailyPlans || dailyPlans.length === 0) {
          return `AI-generated itinerary for ${destination}`;
        }
        
        const activities: string[] = [];
        const restaurants: string[] = [];
        
        dailyPlans.forEach((day) => {
          if (day.activities && day.activities.length > 0) {
            const activity = day.activities[0];
            if (activity.name && activity.name !== 'Explore Local Area') {
              activities.push(activity.name);
            }
          }
          if (day.meals && day.meals.length > 0) {
            const meal = day.meals[0];
            if (meal.restaurant && meal.restaurant.name && meal.restaurant.name !== 'Local Restaurant') {
              restaurants.push(meal.restaurant.name);
            }
          }
        });
        
        const uniqueActivities = [...new Set(activities)].slice(0, 3);
        const uniqueRestaurants = [...new Set(restaurants)].slice(0, 3);
        
        let description = `AI-generated ${dailyPlans.length}-day itinerary for ${destination}.`;
        if (uniqueActivities.length > 0) {
          description += ` Experience ${uniqueActivities.join(', ')}`;
          if (uniqueActivities.length < activities.length) {
            description += ` and ${activities.length - uniqueActivities.length} more`;
          }
          description += '.';
        }
        if (uniqueRestaurants.length > 0) {
          description += ` Dine at ${uniqueRestaurants.join(', ')}`;
          if (uniqueRestaurants.length < restaurants.length) {
            description += ` and ${restaurants.length - uniqueRestaurants.length} more`;
          }
          description += '.';
        }
        
        return description;
      };
      
      // Extract activities for search (matching PWA)
      const extractActivitiesFromDailyPlans = (dailyPlans: any[]): string[] => {
        const activities: string[] = [];
        dailyPlans.forEach(day => {
          if (day.activities && day.activities.length > 0) {
            day.activities.forEach((act: any) => {
              if (act.name) activities.push(act.name);
            });
          }
          if (day.meals && day.meals.length > 0) {
            day.meals.forEach((meal: any) => {
              if (meal.restaurant && meal.restaurant.name) {
                activities.push(meal.restaurant.name);
              }
            });
          }
        });
        return activities;
      };
      
      // Step 4: AI generation with external data - ONLY for non-flight transportation
      // For flights, we return the flight search results directly without AI generation
      // Use didSearchFlights instead of includeFlights to ensure we actually have flight data
      if (!didSearchFlights) {

        const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const aiPayload = {
          destination: sanitizedRequest.destination,
          startDate: sanitizedRequest.startDate,
          endDate: sanitizedRequest.endDate,
          departureDate: sanitizedRequest.startDate, // Cloud function expects this field
          returnDate: sanitizedRequest.endDate, // Cloud function expects this field
          origin: sanitizedRequest.departure || '',
          originAirportCode: sanitizedRequest.departureAirportCode || null,
          destinationAirportCode: sanitizedRequest.destinationAirportCode || null,
          transportType: transportTypeRaw, // Use the original transportType (NOT 'flight')
          preferenceProfile: profileWithDefaults || null,
          generationId: generationId,
          mustInclude: sanitizedRequest.mustInclude || [],
          mustAvoid: sanitizedRequest.mustAvoid || [],
          specialRequests: sanitizedRequest.specialRequests || '',
          tripType: sanitizedRequest.tripType || 'leisure'
        };
        
        const aiResult = await callCloudFunction('generateItineraryWithAI', aiPayload);
        
        if (!aiResult.data?.assistant) {
          throw createAIError('server_error', 'AI generation failed to return assistant response');
        }
        
        setProgress(PROGRESS_STAGES.SAVING);

        // CRITICAL: Parse the assistant JSON string into structured data (matching PWA exactly)
        let parsedTransportation: any = null;
        try {
          const assistantData = JSON.parse(aiResult.data.assistant);
          parsedTransportation = assistantData?.transportation || null;
          
        } catch (parseError) {
          console.error('Failed to parse AI assistant response:', parseError);
        }
        
                // Step 5: Save the generated itinerary to database (matching PWA pattern)

        // IMPORTANT: Use the daily plans we already generated above (lines 338-427)
        // DO NOT recreate them here - we already have them with proper fallback logic!
        
        // Build itinerary data object (matching PWA exactly)
        // Calculate user age for matching/filtering
        const userAge = sanitizedRequest.userInfo?.dob ? calculateAge(sanitizedRequest.userInfo.dob) : 0;
        
        const itineraryData: any = {
          id: generationId,
          destination: sanitizedRequest.destination,
          departure: sanitizedRequest.departure || '',
          startDate: sanitizedRequest.startDate,
          endDate: sanitizedRequest.endDate,
          startDay: new Date(sanitizedRequest.startDate).getTime(),
          endDay: new Date(sanitizedRequest.endDate).getTime(),
          lowerRange: 18,
          upperRange: 100,
          likes: [],
          age: userAge, // Include age for searchItineraries filtering
          userInfo: {
            username: sanitizedRequest.userInfo?.username || 'Anonymous',
            gender: sanitizedRequest.userInfo?.gender || 'Any',
            dob: sanitizedRequest.userInfo?.dob || '',
            uid: userId,
            email: sanitizedRequest.userInfo?.email || '',
            status: sanitizedRequest.userInfo?.status || 'Any',
            sexualOrientation: sanitizedRequest.userInfo?.sexualOrientation || 'Any',
            blocked: sanitizedRequest.userInfo?.blocked || []
          },
          ai_status: "completed",
          dailyPlans: dailyPlans,
          days: dailyPlans, // Also add as 'days' for compatibility
          flights: flightsData || [],
          accommodations: accommodationsData,
          externalData: {
            hotelRecommendations: accommodationsData
          }
        };
        
        try {
          // Build full itinerary structure for database (matching PWA)
          const fullItinerary = {
            id: generationId,
            userId: userId,
            destination: sanitizedRequest.destination,
            title: '',
            description: generateDescriptionFromDailyPlans(dailyPlans, sanitizedRequest.destination),
            startDate: new Date(sanitizedRequest.startDate).toISOString(),
            endDate: new Date(sanitizedRequest.endDate).toISOString(),
            startDay: new Date(sanitizedRequest.startDate).getTime(),
            endDay: new Date(sanitizedRequest.endDate).getTime(),
            lowerRange: 18,
            upperRange: 100,
            gender: sanitizedRequest.userInfo?.gender || 'No Preference',
            sexualOrientation: sanitizedRequest.userInfo?.sexualOrientation || 'No Preference',
            status: sanitizedRequest.userInfo?.status || 'No Preference',
            likes: [],
            age: userAge, // Include age for searchItineraries filtering
            activities: extractActivitiesFromDailyPlans(dailyPlans),
            ai_status: "completed",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userInfo: {
              username: sanitizedRequest.userInfo?.username || 'Anonymous',
              gender: sanitizedRequest.userInfo?.gender || 'Any',
              dob: sanitizedRequest.userInfo?.dob || '',
              uid: userId,
              email: sanitizedRequest.userInfo?.email || '',
              status: sanitizedRequest.userInfo?.status || 'Any',
              sexualOrientation: sanitizedRequest.userInfo?.sexualOrientation || 'Any',
              blocked: sanitizedRequest.userInfo?.blocked || []
            },
            response: {
              success: true,
              data: {
                // CRITICAL: Include itinerary object with daily plans (matching PWA)
                itinerary: itineraryData,
                // Store the STRUCTURED transportation data
                transportation: parsedTransportation,
                // Store metadata for filtering
                metadata: {
                  filtering: {
                    specialRequestsUsed: false,
                    mustIncludeTermsFound: [],
                    mustAvoidFilteredCount: 0,
                    mustIncludeMatchesCount: 0
                  },
                  generationId: generationId
                },
                // Store recommendations
                recommendations: {
                  transportation: parsedTransportation,
                  accommodations: accommodationsData || [],
                  alternativeActivities: activitiesData || [],
                  alternativeRestaurants: restaurantsData || []
                },
                // Keep the raw assistant response for debugging
                assistant: aiResult.data.assistant
              }
            }
          };

          // For Prisma compatibility we also store flights/accommodations at the ROOT level
          // (some services expect `itinerary.flights` and `itinerary.accommodations` directly)
          (fullItinerary as any).flights = flightsData || [];
          (fullItinerary as any).accommodations = accommodationsData || [];

          // Sanitize undefined values to null (matching PWA)
          const sanitizedPayload = JSON.parse(JSON.stringify(fullItinerary, (_k, v) => v === undefined ? null : v));

          // Save to database using createItinerary function
          // PWA WRAPS the payload with { itinerary: ... } - this is the correct pattern!
          const saveResult = await callCloudFunction('createItinerary', { itinerary: sanitizedPayload });
          
          if (!saveResult.success) {
            throw createAIError('server_error', 'Failed to save itinerary to database');
          }

          setProgress(PROGRESS_STAGES.DONE);

          // Return the saved itinerary result
          return {
            id: generationId,
            success: true,
            data: aiResult.data,
            savedDocId: generationId
          };

        } catch (saveError) {
          console.error('Failed to save AI-generated itinerary:', saveError);
          
          // Still return the AI result even if saving fails
          setProgress(PROGRESS_STAGES.DONE);
          return {
            id: generationId,
            success: true,
            data: aiResult.data,
            saveError: saveError instanceof Error ? saveError.message : 'Failed to save'
          };
        }
        
      } else {
        // For flights, save flight search results without AI generation

        const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        setProgress(PROGRESS_STAGES.SAVING);
        
        try {
          // Calculate user age for matching/filtering (flight path)
          const userAge = sanitizedRequest.userInfo?.dob ? calculateAge(sanitizedRequest.userInfo.dob) : 0;
          
          // Build itinerary data object for flight-based trips (matching PWA)
          const itineraryData: any = {
            id: generationId,
            destination: sanitizedRequest.destination,
            departure: sanitizedRequest.departure || '',
            startDate: sanitizedRequest.startDate,
            endDate: sanitizedRequest.endDate,
            startDay: new Date(sanitizedRequest.startDate).getTime(),
            endDay: new Date(sanitizedRequest.endDate).getTime(),
            lowerRange: 18,
            upperRange: 100,
            likes: [],
            age: userAge, // Include age for searchItineraries filtering
            userInfo: {
              username: sanitizedRequest.userInfo?.username || 'Anonymous',
              gender: sanitizedRequest.userInfo?.gender || 'Any',
              dob: sanitizedRequest.userInfo?.dob || '',
              uid: userId,
              email: sanitizedRequest.userInfo?.email || '',
              status: sanitizedRequest.userInfo?.status || 'Any',
              sexualOrientation: sanitizedRequest.userInfo?.sexualOrientation || 'Any',
              blocked: sanitizedRequest.userInfo?.blocked || []
            },
            ai_status: "completed",
            dailyPlans: dailyPlans,
            days: dailyPlans,
            flights: flightsData || [],
            accommodations: accommodationsData,
            externalData: {
              hotelRecommendations: accommodationsData
            }
          };
          
          // Build full itinerary structure for database (matching PWA)
          const fullItinerary = {
            id: generationId,
            userId: userId,
            destination: sanitizedRequest.destination,
            title: '',
            description: generateDescriptionFromDailyPlans(dailyPlans, sanitizedRequest.destination),
            startDate: new Date(sanitizedRequest.startDate).toISOString(),
            endDate: new Date(sanitizedRequest.endDate).toISOString(),
            startDay: new Date(sanitizedRequest.startDate).getTime(),
            endDay: new Date(sanitizedRequest.endDate).getTime(),
            lowerRange: 18,
            upperRange: 100,
            gender: sanitizedRequest.userInfo?.gender || 'No Preference',
            sexualOrientation: sanitizedRequest.userInfo?.sexualOrientation || 'No Preference',
            status: sanitizedRequest.userInfo?.status || 'No Preference',
            likes: [],
            age: userAge, // Include age for searchItineraries filtering
            activities: extractActivitiesFromDailyPlans(dailyPlans),
            ai_status: "completed",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userInfo: {
              username: sanitizedRequest.userInfo?.username || 'Anonymous',
              gender: sanitizedRequest.userInfo?.gender || 'Any',
              dob: sanitizedRequest.userInfo?.dob || '',
              uid: userId,
              email: sanitizedRequest.userInfo?.email || '',
              status: sanitizedRequest.userInfo?.status || 'Any',
              sexualOrientation: sanitizedRequest.userInfo?.sexualOrientation || 'Any',
              blocked: sanitizedRequest.userInfo?.blocked || []
            },
            response: {
              success: true,
              data: {
                // CRITICAL: Include itinerary object with daily plans
                itinerary: itineraryData,
                // Store metadata
                metadata: {
                  filtering: {
                    specialRequestsUsed: false,
                    mustIncludeTermsFound: [],
                    mustAvoidFilteredCount: 0,
                    mustIncludeMatchesCount: 0
                  },
                  generationId: generationId
                },
                // Store recommendations
                recommendations: {
                  accommodations: accommodationsData || [],
                  alternativeActivities: activitiesData || [],
                  alternativeRestaurants: restaurantsData || [],
                  flights: flightsData || []
                }
              }
            }
          };

          // For Prisma compatibility ensure top-level flights/accommodations exist
          (fullItinerary as any).flights = flightsData || [];
          (fullItinerary as any).accommodations = accommodationsData || [];

          // Sanitize undefined values to null (matching PWA)
          const sanitizedPayload = JSON.parse(JSON.stringify(fullItinerary, (_k, v) => v === undefined ? null : v));

          // Save to database using createItinerary function
          // PWA WRAPS the payload with { itinerary: ... } - this is the correct pattern!
          const saveResult = await callCloudFunction('createItinerary', { itinerary: sanitizedPayload });
          
          if (!saveResult.success) {
            throw createAIError('server_error', 'Failed to save flight-based itinerary to database');
          }

          setProgress(PROGRESS_STAGES.DONE);

          // Return the saved itinerary result
          return {
            id: generationId,
            success: true,
            data: {
              flights: flightsData,
              accommodations: accommodationsData,
              activities: activitiesData,
              transportationType: 'flight'
            },
            savedDocId: generationId
          };

        } catch (saveError) {
          console.error('Failed to save flight-based itinerary:', saveError);
          
          // Still return the flight search results even if saving fails
          setProgress(PROGRESS_STAGES.DONE);
          return {
            id: generationId,
            success: true,
            data: {
              flights: flightsData,
              accommodations: accommodationsData,
              activities: activitiesData,
              transportationType: 'flight'
            },
            saveError: saveError instanceof Error ? saveError.message : 'Failed to save'
          };
        }
      }
      
    } catch (err) {
      console.error('AI generation failed:', err);
      
      let aiError: AIGenerationError;
      
      if (err instanceof Error && (err as any).type) {
        aiError = err as AIGenerationError;
      } else {
        aiError = createAIError('unknown_error', err instanceof Error ? err.message : 'Unknown error occurred');
      }
      
      setError(aiError);
      
      return {
        id: null,
        success: false,
        error: aiError.message
      };
      
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, []);

  return {
    generateItinerary,
    progress,
    isGenerating,
    error,
    cancelGeneration
  };
};
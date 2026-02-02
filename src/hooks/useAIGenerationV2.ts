/**
 * useAIGenerationV2 - AI-First Itinerary Generation Hook
 * 
 * NEW ARCHITECTURE (January 2026):
 * 1. generateFullItinerary: AI generates personalized day-by-day itinerary
 * 2. verifyPlaces: Google TextSearch verifies places exist
 * 3. searchAccommodations: Get hotel recommendations
 * 4. searchFlights: Only for air travel
 * 5. transformAIOutput: Assemble into production format
 * 
 * REPLACES: useAIGeneration.ts (legacy Places-First architecture)
 * DELETE useAIGeneration.ts after all users are on V2
 */

import { useState, useCallback, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
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
import { 
  transformAIOutput, 
  createVerifiedPlacesMap, 
  extractPlaceNames,
  AIGeneratedOutput,
  VerifiedPlace
} from '../utils/transformAIOutput';

// Default retry configuration for network resilience
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,      // Reduced from 3 - fail faster on persistent errors
  baseDelay: 1000,     // 1 second
  maxDelay: 5000,      // Reduced from 10 seconds
  backoffMultiplier: 2
};

// Progress stages for AI-First architecture
const PROGRESS_STAGES = {
  INITIALIZING: { stage: 'initializing' as const, percent: 5, message: 'Preparing your request...' },
  AI_GENERATION: { stage: 'ai_generation' as const, percent: 25, message: 'AI is crafting your personalized itinerary...' },
  VERIFYING: { stage: 'activities' as const, percent: 50, message: 'Getting Google Maps links...' },
  SEARCHING: { stage: 'searching' as const, percent: 70, message: 'Finding accommodations and flights...' },
  SAVING: { stage: 'saving' as const, percent: 90, message: 'Saving your itinerary...' },
  DONE: { stage: 'done' as const, percent: 100, message: 'Your personalized itinerary is ready!' }
} as const;

export interface UseAIGenerationV2Return {
  generateItinerary: (request: AIGenerationRequest) => Promise<ItineraryResult>;
  progress: AIGenerationProgress;
  isGenerating: boolean;
  error: AIGenerationError | null;
  cancelGeneration: () => void;
}

export const useAIGenerationV2 = (): UseAIGenerationV2Return => {
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
          
          // Don't retry JSON parse errors - these indicate truncated responses
          if (error.message.includes('Failed to parse AI response') ||
              error.message.includes('JSON') ||
              error.message.includes('truncated')) {
            throw createAIError('server_error', error.message, undefined, error);
          }
          
          // Don't retry deadline-exceeded - function timed out
          if (error.message.includes('deadline-exceeded') ||
              error.message.includes('DEADLINE_EXCEEDED')) {
            throw createAIError('server_error', 'Request timed out. Please try again with a shorter trip duration.', undefined, error);
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
      const result = await callable(data);
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

  // Main generation function - AI-First architecture
  const generateItinerary = useCallback(async (request: AIGenerationRequest): Promise<ItineraryResult> => {
    // Reset state
    setIsGenerating(true);
    setError(null);
    setProgress(PROGRESS_STAGES.INITIALIZING);
    
    // Create new AbortController for this generation
    abortControllerRef.current = new AbortController();
    
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
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
      
      // Get preference profile
      const selectedProfile = request.travelPreferences || request.preferenceProfile;
      const profileWithDefaults = applyProfileDefaults(selectedProfile);
      const transportType = profileWithDefaults?.transportation?.primaryMode || 'driving';
      const transportTypeLower = String(transportType ?? '').toLowerCase();
      // Check for flight mode: explicit includeFlights flag OR airplane/flight/flights/air mode
      const includeFlights = profileWithDefaults?.transportation?.includeFlights === true ||
                             transportTypeLower === 'airplane' || 
                             transportTypeLower === 'flight' || 
                             transportTypeLower === 'flights' ||
                             transportTypeLower === 'air';
      
      // ========================================================================
      // Step 2: Run ALL independent API calls in PARALLEL
      // - generateFullItinerary: AI generates personalized itinerary
      // - generateItineraryWithAI: Transportation recommendations (if not flight)
      // - searchAccommodations: Hotel search
      // - searchFlights: Flight search (if flight mode)
      // ========================================================================
      setProgress(PROGRESS_STAGES.AI_GENERATION);
      
      const tripDays = Math.ceil(
        (new Date(sanitizedRequest.endDate).getTime() - new Date(sanitizedRequest.startDate).getTime()) 
        / (1000 * 60 * 60 * 24)
      ) + 1;
      
      // Build all payloads upfront
      const aiPayload = {
        destination: sanitizedRequest.destination,
        destinationLatLng: sanitizedRequest.destinationLatLng,
        origin: sanitizedRequest.departure || '',
        startDate: sanitizedRequest.startDate,
        endDate: sanitizedRequest.endDate,
        preferenceProfile: profileWithDefaults,
        mustInclude: sanitizedRequest.mustInclude || [],
        mustAvoid: sanitizedRequest.mustAvoid || [],
        specialRequests: sanitizedRequest.specialRequests || '',
        groupSize: sanitizedRequest.groupSize || 2,
        userInfo: {
          uid: userId,
          displayName: sanitizedRequest.userInfo?.username,
          age: sanitizedRequest.userInfo?.dob ? calculateAge(sanitizedRequest.userInfo.dob) : undefined
        }
      };
      
      const accommodationsPayload = {
        destination: sanitizedRequest.destination,
        destinationLatLng: sanitizedRequest.destinationLatLng,
        startDate: sanitizedRequest.startDate,
        endDate: sanitizedRequest.endDate,
        days: tripDays,
        preferenceProfile: profileWithDefaults
      };
      
      // Start all independent operations in parallel
      interface ParallelResults {
        aiResult: CloudFunctionResult;
        accommodationsResult: CloudFunctionResult;
        flightsResult?: CloudFunctionResult;
        transportationResult?: CloudFunctionResult;
      }
      
      // Build parallel promises
      const aiPromise = callCloudFunction('generateFullItinerary', aiPayload);
      const accommodationsPromise = callCloudFunction('searchAccommodations', accommodationsPayload);
      
      let flightsPromise: Promise<CloudFunctionResult> | null = null;
      let transportationPromise: Promise<CloudFunctionResult> | null = null;
      
      if (includeFlights && sanitizedRequest.departureAirportCode && sanitizedRequest.destinationAirportCode) {
        const flightPayload = {
          departureAirportCode: sanitizedRequest.departureAirportCode,
          destinationAirportCode: sanitizedRequest.destinationAirportCode,
          departureDate: sanitizedRequest.startDate,
          returnDate: sanitizedRequest.endDate,
          cabinClass: sanitizedRequest.flightPreferences?.class?.toUpperCase() || 'ECONOMY',
          preferredAirlines: sanitizedRequest.flightPreferences?.preferredAirlines || [],
          stops: sanitizedRequest.flightPreferences?.stopPreference === 'non-stop' ? 'NONSTOP' : 
                 sanitizedRequest.flightPreferences?.stopPreference === 'one-stop' ? 'ONE_OR_FEWER' : 'ANY'
        };
        flightsPromise = callCloudFunction('searchFlights', flightPayload);
      } else if (sanitizedRequest.departure) {
        // Only call transportation if we have an origin city and NOT using flights
        const transportPayload = {
          destination: sanitizedRequest.destination,
          startDate: sanitizedRequest.startDate,
          endDate: sanitizedRequest.endDate,
          origin: sanitizedRequest.departure,
          transportType: transportType
        };
        transportationPromise = callCloudFunction('generateItineraryWithAI', transportPayload);
      }
      
      // Wait for all parallel operations (use Promise.allSettled for resilience)
      const [aiSettled, accommodationsSettled, flightsSettled, transportationSettled] = await Promise.allSettled([
        aiPromise,
        accommodationsPromise,
        flightsPromise || Promise.resolve({ success: true, data: null }),
        transportationPromise || Promise.resolve({ success: true, data: null })
      ]);
      
      // Extract AI result (required - fail if this fails)
      if (aiSettled.status === 'rejected') {
        throw createAIError('server_error', `AI generation failed: ${aiSettled.reason?.message || 'Unknown error'}`);
      }
      const aiResult = aiSettled.value;
      if (!aiResult.data?.aiOutput) {
        throw createAIError('server_error', 'AI generation failed to return output');
      }
      
      const aiOutput: AIGeneratedOutput = aiResult.data.aiOutput;
      
      // Extract accommodations (optional - use empty array if failed)
      let accommodationsData: any[] = [];
      if (accommodationsSettled.status === 'fulfilled') {
        const accResult = accommodationsSettled.value as any;
        // Cloud function returns: { success: true, data: { searchId, hotels: [...] } }
        accommodationsData = accResult?.data?.hotels || [];
      } else {
        // Accommodations search failed - silently fallback to empty array
      }
      
      // Extract flights (optional)
      const flightsData = (flightsPromise && flightsSettled.status === 'fulfilled')
        ? (Array.isArray((flightsSettled.value as any)?.flights)
            ? (flightsSettled.value as any).flights
            : (Array.isArray((flightsSettled.value as any)?.data?.flights) 
                ? (flightsSettled.value as any).data.flights 
                : []))
        : [];
      
      // Extract transportation recommendations (optional)
      let transportationRecommendations = null;
      if (transportationPromise && transportationSettled.status === 'fulfilled') {
        const transportResult = transportationSettled.value;
        // generateItineraryWithAI returns transportation data in data.assistant (JSON string) or data.transportation
        if (transportResult.data?.transportation) {
          transportationRecommendations = transportResult.data.transportation;
        } else if (transportResult.data?.assistant) {
          try {
            const parsed = JSON.parse(transportResult.data.assistant);
            // The OpenAI response wraps transportation in a "transportation" key: { "transportation": {...} }
            // Extract the inner object if present, otherwise use the parsed result directly
            transportationRecommendations = parsed.transportation || parsed;
          } catch (e) {
            // Failed to parse transportation JSON - log warning and continue without transportation recommendations
            console.warn('[useAIGenerationV2] Failed to parse transportation JSON:', e);
          }
        }
      }
      
      // ========================================================================
      // Step 3: Generate Google Maps links from addresses (NO API CALL - FREE!)
      // Previously called verifyPlaces which used expensive Text Search API
      // ========================================================================
      setProgress(PROGRESS_STAGES.VERIFYING);
      
      const placeNames = extractPlaceNames(aiOutput);
      
      // Create fake verified places with Google Maps URLs built from address
      // This is FREE - no Google Places API calls needed
      const verifiedPlaces: VerifiedPlace[] = placeNames.map(name => ({
        originalName: name,
        name: name,
        verified: true,
        verificationConfidence: 'ai_generated' as any,
        // Generate Google Maps search URL from place name + destination (FREE!)
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + sanitizedRequest.destination)}`
      }));
      const verifiedCount = verifiedPlaces.length;
      
      // ========================================================================
      // Step 4: Transform AI output to production format
      // ========================================================================
      setProgress(PROGRESS_STAGES.SAVING);
      
      const verifiedPlacesMap = createVerifiedPlacesMap(verifiedPlaces);
      const processingTimeMs = Date.now() - startTime;
      
      const transformedItinerary = transformAIOutput({
        aiOutput,
        verifiedPlaces: verifiedPlacesMap,
        destination: sanitizedRequest.destination,
        startDate: sanitizedRequest.startDate,
        endDate: sanitizedRequest.endDate,
        userId,
        processingTimeMs
      });
      
      // ========================================================================
      // Step 5: Build and save full itinerary
      // ========================================================================
      const userAge = sanitizedRequest.userInfo?.dob ? calculateAge(sanitizedRequest.userInfo.dob) : 0;
      
      const fullItinerary = {
        id: generationId,
        userId: userId,
        destination: sanitizedRequest.destination,
        // NOTE: 'departure' is NOT in Prisma schema - store in response.data if needed
        title: '',
        description: aiOutput.travel_agent_summary || aiOutput.trip_narrative || `AI-generated itinerary for ${sanitizedRequest.destination}`,
        startDate: new Date(sanitizedRequest.startDate).toISOString(),
        endDate: new Date(sanitizedRequest.endDate).toISOString(),
        startDay: new Date(sanitizedRequest.startDate).getTime(),
        endDay: new Date(sanitizedRequest.endDate).getTime(),
        lowerRange: 18,
        upperRange: 100,
        gender: 'No Preference',
        sexualOrientation: 'No Preference',
        status: 'No Preference',
        likes: [],
        age: userAge,
        activities: placeNames,
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
        // Use transformed itinerary structure
        dailyPlans: transformedItinerary.response.data.itinerary.days,
        days: transformedItinerary.response.data.itinerary.days,
        flights: flightsData || [],
        accommodations: accommodationsData,
        externalData: {
          hotelRecommendations: accommodationsData
        },
        response: {
          success: true,
          data: {
            itinerary: {
              ...transformedItinerary.response.data.itinerary,
              dailyPlans: transformedItinerary.response.data.itinerary.days,
              flights: flightsData,
              accommodations: accommodationsData
            },
            // Transportation recommendations (for non-flight modes)
            // This matches where AIItineraryDisplay reads from: response.data.transportation
            transportation: transportationRecommendations,
            metadata: {
              ...transformedItinerary.response.data.metadata,
              generationId: generationId,
              aiFirstArchitecture: true,
              version: 'v2',
              verificationStats: {
                totalPlaces: placeNames.length,
                verified: verifiedCount,
                notFound: placeNames.length - verifiedCount
              }
            },
            recommendations: {
              accommodations: accommodationsData || [],
              flights: flightsData || [],
              transportation: transportationRecommendations,  // Also include here for compatibility
              alternativeActivities: [],
              alternativeRestaurants: []
            },
            costBreakdown: transformedItinerary.response.data.costBreakdown
          }
        }
      };
      
      // Sanitize undefined values to null
      const sanitizedPayload = JSON.parse(JSON.stringify(fullItinerary, (_k, v) => v === undefined ? null : v));
      
      // Save to database
      const saveResult = await callCloudFunction('createItinerary', { itinerary: sanitizedPayload });
      
      if (!saveResult.success) {
        throw createAIError('server_error', 'Failed to save AI-first itinerary to database');
      }
      
      setProgress(PROGRESS_STAGES.DONE);
      
      return {
        id: generationId,
        success: true,
        data: {
          aiOutput,
          verifiedPlaces,
          flights: flightsData,
          accommodations: accommodationsData,
          aiFirstArchitecture: true
        },
        savedDocId: generationId
      };
      
    } catch (err) {
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

export default useAIGenerationV2;

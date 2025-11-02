/**
 * Itinerary Repository
 * Data access layer for itinerary operations using Firebase Cloud Functions
 * Implements dependency inversion principle - depends on abstractions (Firebase SDK)
 */

import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import {
  Itinerary,
  ItinerarySearchParams,
  SearchItinerariesResponse
} from '../types/Itinerary';

/**
 * Repository interface for itinerary operations
 * Allows for easy testing and alternative implementations
 */
export interface IItineraryRepository {
  searchItineraries(params: ItinerarySearchParams): Promise<Itinerary[]>;
  updateItinerary(itineraryId: string, updates: Partial<Itinerary>): Promise<Itinerary>;
  listUserItineraries(userId: string): Promise<Itinerary[]>;
  createItinerary(itinerary: Partial<Itinerary>): Promise<Itinerary>;
  deleteItinerary(itineraryId: string): Promise<void>;
}

/**
 * Firebase implementation of ItineraryRepository
 * Uses Firebase Cloud Functions (callable HTTPS functions)
 */
export class FirebaseItineraryRepository implements IItineraryRepository {
  /**
   * Search for itineraries matching criteria
   * Calls Firebase Cloud Function `searchItineraries`
   * @param params - Search parameters (destination, dates, preferences, etc.)
   * @returns Array of matching itineraries
   */
  async searchItineraries(params: ItinerarySearchParams): Promise<Itinerary[]> {
    try {
      const functions = getFunctions();
      const searchFn = httpsCallable<ItinerarySearchParams, SearchItinerariesResponse>(
        functions,
        'searchItineraries'
      );

      // Call the function with search parameters
      const result: HttpsCallableResult<SearchItinerariesResponse> = await searchFn(params);

      // Handle response
      if (result.data.success && Array.isArray(result.data.data)) {
        return result.data.data;
      }

      // Handle error response
      const errorMessage = result.data.error || result.data.message || 'Search failed';
      throw new Error(errorMessage);
    } catch (error: any) {
      console.error('[ItineraryRepository] searchItineraries error:', error);
      
      // Preserve meaningful error messages
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to search itineraries. Please try again.');
    }
  }

  /**
   * Update an existing itinerary
   * Calls Firebase Cloud Function `updateItinerary`
   * @param itineraryId - ID of itinerary to update
   * @param updates - Partial itinerary object with fields to update
   * @returns Updated itinerary
   */
  async updateItinerary(
    itineraryId: string,
    updates: Partial<Omit<Itinerary, 'id'>>
  ): Promise<Itinerary> {
    try {
      if (!itineraryId || typeof itineraryId !== 'string') {
        throw new Error('Invalid itinerary ID');
      }

      const functions = getFunctions();
      const updateFn = httpsCallable<
        { itineraryId: string; updates: Partial<Itinerary> },
        { success: boolean; data?: Itinerary; error?: string }
      >(functions, 'updateItinerary');

      // Call the function
      const result = await updateFn({ itineraryId, updates });

      // Handle response
      if (result.data.success && result.data.data) {
        return result.data.data;
      }

      // Handle error response
      const errorMessage = result.data.error || 'Update failed';
      throw new Error(errorMessage);
    } catch (error: any) {
      console.error('[ItineraryRepository] updateItinerary error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to update itinerary. Please try again.');
    }
  }

  /**
   * List all itineraries for a specific user
   * Calls Firebase Cloud Function `listItinerariesForUser`
   * @param userId - User ID to fetch itineraries for
   * @returns Array of user's itineraries
   */
  async listUserItineraries(userId: string): Promise<Itinerary[]> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID');
      }

      const functions = getFunctions();
      const listFn = httpsCallable<
        { userId: string },
        { success: boolean; data?: Itinerary[]; error?: string }
      >(functions, 'listItinerariesForUser');

      // Call the function
      const result = await listFn({ userId });

      // Handle response
      if (result.data.success && Array.isArray(result.data.data)) {
        return result.data.data;
      }

      // Handle error response
      const errorMessage = result.data.error || 'Failed to fetch itineraries';
      throw new Error(errorMessage);
    } catch (error: any) {
      console.error('[ItineraryRepository] listUserItineraries error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to fetch user itineraries. Please try again.');
    }
  }

  /**
   * Create a new itinerary
   * Calls Firebase Cloud Function `createItinerary`
   * @param itinerary - Itinerary data to create
   * @returns Created itinerary with generated ID
   */
  async createItinerary(itinerary: Partial<Itinerary>): Promise<Itinerary> {
    try {
      const functions = getFunctions();
      const createFn = httpsCallable<
        { itinerary: Partial<Itinerary> },
        { success: boolean; data?: Itinerary; error?: string }
      >(functions, 'createItinerary');

      // Call the function
      const result = await createFn({ itinerary });

      // Handle response
      if (result.data.success && result.data.data) {
        return result.data.data;
      }

      // Handle error response
      const errorMessage = result.data.error || 'Create failed';
      throw new Error(errorMessage);
    } catch (error: any) {
      console.error('[ItineraryRepository] createItinerary error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to create itinerary. Please try again.');
    }
  }

  /**
   * Delete an itinerary
   * Calls Firebase Cloud Function `deleteItinerary`
   * @param itineraryId - ID of itinerary to delete
   */
  async deleteItinerary(itineraryId: string): Promise<void> {
    try {
      if (!itineraryId || typeof itineraryId !== 'string') {
        throw new Error('Invalid itinerary ID');
      }

      const functions = getFunctions();
      const deleteFn = httpsCallable<
        { itineraryId: string },
        { success: boolean; error?: string }
      >(functions, 'deleteItinerary');

      // Call the function
      const result = await deleteFn({ itineraryId });

      // Handle response
      if (!result.data.success) {
        const errorMessage = result.data.error || 'Delete failed';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('[ItineraryRepository] deleteItinerary error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to delete itinerary. Please try again.');
    }
  }
}

/**
 * Singleton instance of the repository
 * Use this for dependency injection in hooks and components
 */
export const itineraryRepository = new FirebaseItineraryRepository();

export default itineraryRepository;

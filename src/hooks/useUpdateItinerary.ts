/**
 * useUpdateItinerary Hook
 * Custom hook for updating itineraries via Firebase Cloud Functions
 * Handles loading states and error handling
 */

import { useState, useCallback } from 'react';
import { Itinerary } from '../types/Itinerary';
import { itineraryRepository } from '../repositories/ItineraryRepository';

interface UseUpdateItineraryReturn {
  updateItinerary: (
    itineraryId: string,
    updates: Partial<Omit<Itinerary, 'id'>>
  ) => Promise<Itinerary>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for updating itineraries
 * @returns Object with updateItinerary function, loading state, and error
 * 
 * @example
 * ```tsx
 * const { updateItinerary, loading, error } = useUpdateItinerary();
 * 
 * const handleLike = async (itineraryId: string, userId: string) => {
 *   const itinerary = await updateItinerary(itineraryId, {
 *     likes: [...existingLikes, userId]
 *   });
 * };
 * ```
 */
export function useUpdateItinerary(): UseUpdateItineraryReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateItinerary = useCallback(
    async (
      itineraryId: string,
      updates: Partial<Omit<Itinerary, 'id'>>
    ): Promise<Itinerary> => {
      setLoading(true);
      setError(null);

      try {
        // Validate inputs
        if (!itineraryId || typeof itineraryId !== 'string') {
          throw new Error('Invalid itinerary ID');
        }

        if (!updates || typeof updates !== 'object') {
          throw new Error('Invalid updates object');
        }

        // Call repository
        const updatedItinerary = await itineraryRepository.updateItinerary(
          itineraryId,
          updates
        );

        setLoading(false);
        return updatedItinerary;
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error('Failed to update itinerary');
        setError(error);
        setLoading(false);
        console.error('[useUpdateItinerary] Error:', error);
        throw error;
      }
    },
    []
  );

  return {
    updateItinerary,
    loading,
    error
  };
}

export default useUpdateItinerary;

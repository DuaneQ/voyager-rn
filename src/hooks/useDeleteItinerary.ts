/**
 * Hook for deleting itineraries
 * Uses deleteItinerary RPC to remove from PostgreSQL
 */

import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../config/firebaseConfig';
import { DeleteItineraryResponse } from '../types/ManualItinerary';

export const useDeleteItinerary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteItinerary = useCallback(async (
    itineraryId: string
  ): Promise<DeleteItineraryResponse> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!itineraryId) {
      return { success: false, error: 'Itinerary ID is required' };
    }

    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const deleteItineraryFn = httpsCallable(functions, 'deleteItinerary');

      console.log('[useDeleteItinerary] Deleting itinerary:', itineraryId);

      const result: any = await deleteItineraryFn({ id: itineraryId });

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to delete itinerary');
      }

      console.log('[useDeleteItinerary] Successfully deleted');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete itinerary';
      console.error('[useDeleteItinerary] Error:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteItinerary,
    loading,
    error,
  };
};

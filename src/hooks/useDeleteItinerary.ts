/**
 * Hook for deleting itineraries
 * Uses deleteItinerary RPC to remove from PostgreSQL
 */

import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import * as firebaseCfg from '../config/firebaseConfig';
import { DeleteItineraryResponse } from '../types/ManualItinerary';

export const useDeleteItinerary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteItinerary = useCallback(async (
    itineraryId: string
  ): Promise<DeleteItineraryResponse> => {
  const tentativeAuth = typeof (firebaseCfg as any).getAuthInstance === 'function'
    ? (firebaseCfg as any).getAuthInstance()
    : (firebaseCfg as any).auth;
  const effectiveAuth = tentativeAuth && tentativeAuth.currentUser ? tentativeAuth : (firebaseCfg as any).auth;
  const userId = effectiveAuth?.currentUser?.uid;
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!itineraryId) {
      return { success: false, error: 'Itinerary ID is required' };
    }

    setLoading(true);
    setError(null);

    try {
  const deleteItineraryFn = httpsCallable((firebaseCfg as any).functions, 'deleteItinerary');

      const result: any = await deleteItineraryFn({ id: itineraryId });

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to delete itinerary');
      }

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

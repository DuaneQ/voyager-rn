/**
 * Hook to fetch and manage all itineraries (both AI-generated and manual)
 * Filters out past itineraries automatically (endDay < now)
 */

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getAuthInstance, functions, auth } from '../config/firebaseConfig';

export interface Itinerary {
  id: string;
  userId: string;
  destination: string;
  title?: string;
  description?: string;
  startDate: string;
  endDate: string;
  startDay: number;
  endDay: number;
  activities?: string[];
  ai_status?: string;
  userInfo?: any;
  response?: {
    success: boolean;
    data?: any;
  };
  createdAt?: string;
  updatedAt?: string;
  likes?: string[];
  
  // Preference fields (for manual itineraries)
  gender?: string;
  status?: string;
  sexualOrientation?: string;
  lowerRange?: string | number;
  upperRange?: string | number;
}

export const useAllItineraries = () => {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItineraries = useCallback(async (): Promise<Itinerary[]> => {
  // If legacy `auth` export is present (tests may toggle it), prefer its explicit value
  // so tests that set `auth.currentUser = null` properly simulate unauthenticated state.
  const legacyProvided = auth && Object.prototype.hasOwnProperty.call(auth, 'currentUser');
  const userId = legacyProvided ? auth.currentUser?.uid : (typeof getAuthInstance === 'function' ? getAuthInstance()?.currentUser?.uid : undefined);
    if (!userId) {
      setError('User not authenticated');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const listItinerariesFn = httpsCallable(functions, 'listItinerariesForUser');
      
      // Fetch ALL itineraries (no ai_status filter) - automatically excludes past itineraries
      const result: any = await listItinerariesFn({ userId });
      
      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to fetch itineraries');
      }

      // Normalize server response into an array. The cloud RPC historically returns
      // an array at result.data.data but some responses (or intermediate wrappers)
      // may return an object. Be defensive: prefer arrays, otherwise try common
      // shapes like { itineraries: [...] } or nested .data, then fallback to [].
      let allItineraries: Itinerary[] = [];
      const raw = result?.data?.data;
      if (Array.isArray(raw)) {
        allItineraries = raw;
      } else if (raw && Array.isArray(raw.itineraries)) {
        allItineraries = raw.itineraries;
      } else if (raw && Array.isArray(raw.data)) {
        allItineraries = raw.data;
      } else {
        allItineraries = [];
      }

      // Sort by startDay (most recent first)
      allItineraries.sort((a: Itinerary, b: Itinerary) => {
        return (b.startDay || 0) - (a.startDay || 0);
      });

      setItineraries(allItineraries);
      return allItineraries; // Return the fresh data
    } catch (err) {
      console.error('Error fetching all itineraries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch itineraries');
      return []; // Return empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItineraries();
  }, [fetchItineraries]);

  const refreshItineraries = useCallback(async (): Promise<Itinerary[]> => {
    return await fetchItineraries();
  }, [fetchItineraries]);

  return {
    itineraries,
    loading,
    error,
    refreshItineraries,
    fetchItineraries // Export fetchItineraries for direct use
  };
};

/**
 * Hook to fetch and manage all itineraries (both AI-generated and manual)
 * Filters out past itineraries automatically (endDay < now)
 */

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../config/firebaseConfig';

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

  const fetchItineraries = useCallback(async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError('User not authenticated');
      return;
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

      const allItineraries = result.data?.data || [];
      
      console.log('[useAllItineraries] Total itineraries (AI + manual):', allItineraries.length);
      console.log('[useAllItineraries] AI itineraries:', allItineraries.filter((i: Itinerary) => i.ai_status === 'completed').length);
      console.log('[useAllItineraries] Manual itineraries:', allItineraries.filter((i: Itinerary) => !i.ai_status || i.ai_status !== 'completed').length);

      // Sort by startDay (most recent first)
      allItineraries.sort((a: Itinerary, b: Itinerary) => {
        return (b.startDay || 0) - (a.startDay || 0);
      });

      setItineraries(allItineraries);
    } catch (err) {
      console.error('Error fetching all itineraries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch itineraries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItineraries();
  }, [fetchItineraries]);

  const refreshItineraries = useCallback(async () => {
    await fetchItineraries();
  }, [fetchItineraries]);

  return {
    itineraries,
    loading,
    error,
    refreshItineraries
  };
};

/**
 * Hook to fetch and manage AI-generated itineraries
 * Matches PWA functionality - returns all completed AI itineraries (no date filtering)
 */

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../config/firebaseConfig';

export interface AIGeneratedItinerary {
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
}

export const useAIGeneratedItineraries = () => {
  const [itineraries, setItineraries] = useState<AIGeneratedItinerary[]>([]);
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
      
      // Match PWA: Filter by ai_status: 'completed' only
      const result: any = await listItinerariesFn({ userId, ai_status: 'completed' });
      
      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to fetch itineraries');
      }

      const allItineraries = result.data?.data || [];
      
      console.log('[useAIGeneratedItineraries] Total AI itineraries:', allItineraries.length);
      if (allItineraries.length > 0) {
        console.log('[useAIGeneratedItineraries] First itinerary:', JSON.stringify(allItineraries[0], null, 2));
      }

      // Sort by startDay (most recent first) - matching PWA behavior
      allItineraries.sort((a: AIGeneratedItinerary, b: AIGeneratedItinerary) => {
        return (b.startDay || 0) - (a.startDay || 0);
      });

      setItineraries(allItineraries);
    } catch (err) {
      console.error('Error fetching AI itineraries:', err);
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

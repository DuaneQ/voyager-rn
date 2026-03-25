/**
 * usePopularDestinations
 * Reads the denormalised `destinationStats` collection and returns the top N
 * destinations ordered by itinerary count.
 *
 * The collection is kept in sync by Cloud Function Firestore triggers
 * (onItineraryCreated / onItineraryDeleted). The client reads it directly
 * via the Firebase SDK — no Cloud Function call required.
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export interface PopularDestination {
  destination: string;
  count: number;
}

interface UsePopularDestinationsResult {
  destinations: PopularDestination[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const usePopularDestinations = (
  topN: number = 3
): UsePopularDestinationsResult => {
  const [destinations, setDestinations] = useState<PopularDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'destinationStats'),
        orderBy('count', 'desc'),
        limit(topN)
      );
      const snapshot = await getDocs(q);
      const results: PopularDestination[] = snapshot.docs.map((doc) => ({
        destination: doc.data().destination as string,
        count: doc.data().count as number,
      }));
      setDestinations(results);
    } catch (err: any) {
      console.error('[usePopularDestinations]', err);
      setError('Could not load popular destinations');
    } finally {
      setLoading(false);
    }
  }, [topN]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { destinations, loading, error, refresh: fetch };
};

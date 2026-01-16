/**
 * Search Itineraries Hook - EXACT REPLICA of voyager-pwa useSearchItineraries.tsx
 * Uses httpsCallable to call searchItineraries RPC (Cloud SQL backend)
 */

import { useState, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import * as firebaseCfg from '../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Itinerary } from '../types/Itinerary';

const VIEWED_STORAGE_KEY = 'VIEWED_ITINERARIES';

// Get viewed itineraries from AsyncStorage
const getViewedFromStorage = async (): Promise<Set<string>> => {
  try {
    const s = await AsyncStorage.getItem(VIEWED_STORAGE_KEY);
    if (!s) return new Set();
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((x: any) => (x && x.id) ? x.id : x).filter((id: any) => typeof id === 'string' && id.trim() !== ''));
  } catch (e) { 
    console.error('Error reading viewed itineraries:', e);
    return new Set(); 
  }
};

const useSearchItineraries = () => {
  const [allMatchingItineraries, setAllMatchingItineraries] = useState<Itinerary[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const viewedItinerariesRef = useRef<Set<string>>(new Set());

  // Initialize viewed itineraries from AsyncStorage
  useState(() => {
    getViewedFromStorage().then(viewed => {
      viewedItinerariesRef.current = viewed;
    });
  });

  const matchingItineraries = currentIndex >= allMatchingItineraries.length ? [] : allMatchingItineraries.slice(currentIndex);

  const validate = (it: any) => {
    if (!it || typeof it !== 'object') return false;
    if (!it.id || typeof it.id !== 'string') return false;
    if (it.startDay !== undefined && (!Number.isSafeInteger(Number(it.startDay)))) return false;
    if (it.endDay !== undefined && (!Number.isSafeInteger(Number(it.endDay)))) return false;
    if (it.metadata !== undefined && typeof it.metadata === 'string') return false;
    if (it.response !== undefined && typeof it.response === 'string') return false;
    return true;
  };

  const fetchFromCloudSQL = async (currentUserItinerary: Itinerary, currentUserId: string): Promise<Itinerary[]> => {
    const PAGE_SIZE = 10;
    const rpcName = 'searchItineraries';

  // Resolve the callable via firebase/functions (same as PWA)
  const functionsInst = (firebaseCfg && (firebaseCfg as any).functions) || undefined;
  const searchFn = httpsCallable(functionsInst, rpcName);
    const callRpc = async (payload: any) => {
      if (typeof searchFn !== 'function') {
        throw new Error('RPC unavailable: httpsCallable not available');
      }
      return await searchFn(payload);
    };

    // Validate dates before conversion to prevent crashes
    if (!currentUserItinerary.startDate || !currentUserItinerary.endDate) {
      throw new Error('Itinerary must have start and end dates');
    }

    // Convert dates to timestamps safely
    const startTimestamp = new Date(currentUserItinerary.startDate).getTime();
    const endTimestamp = new Date(currentUserItinerary.endDate).getTime();

    // Validate timestamps are valid numbers
    if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
      throw new Error('Invalid dates in itinerary');
    }

    const res: any = await callRpc({
      destination: currentUserItinerary.destination,
      gender: currentUserItinerary.gender,
      status: currentUserItinerary.status,
      sexualOrientation: currentUserItinerary.sexualOrientation,
      minStartDay: startTimestamp,
      maxEndDay: endTimestamp,
      pageSize: PAGE_SIZE,
      excludedIds: Array.from(viewedItinerariesRef.current),
      blockedUserIds: currentUserItinerary.userInfo?.blocked || [],
      currentUserId,
      lowerRange: currentUserItinerary.lowerRange,
      upperRange: currentUserItinerary.upperRange,
    });

    // Normalize response into an array to be defensive against unexpected shapes
    const raw = res?.data?.data;
    let results: Itinerary[] = [];
    if (Array.isArray(raw)) {
      results = raw;
    } else if (raw && Array.isArray(raw.itineraries)) {
      results = raw.itineraries;
    } else if (raw && Array.isArray(raw.data)) {
      results = raw.data;
    } else {
      // If RPC reported success but payload shape differs, log and return empty
      if (res?.data?.success) {
        console.warn('[useSearchItineraries] Unexpected RPC payload shape, returning empty results', raw);
        setHasMore(false);
        return [];
      }
      throw new Error(res?.data?.error || 'Unexpected RPC response');
    }

    setHasMore(results.length >= PAGE_SIZE);
    const filtered = results.filter(it => validate(it) && it.userInfo?.uid && it.userInfo.uid !== currentUserId);
    const seen = new Set<string>();
    return filtered.reduce<Itinerary[]>((acc, it) => {
      const dest = it.destination || '';
      if (!seen.has(dest)) { seen.add(dest); acc.push(it); }
      return acc;
    }, []);
  };

  const searchItineraries = async (currentUserItinerary: Itinerary, currentUserId: string) => {
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setHasMore(true);

    try {
      const results = await fetchFromCloudSQL(currentUserItinerary, currentUserId);
      setAllMatchingItineraries(results);
      setCurrentIndex(0);
      if (results.length === 0) setHasMore(false);
    } catch (err: any) {
      const preservePatterns = [/timeout/i, /network/i, /connection|ECONNREFUSED/i, /proxy/i, /first attempt/i, /constraint/i, /test error/i, /RPC unavailable/i, /httpsCallable not available/i];
      let message = 'Failed to search itineraries. Please try again later.';
      if (err instanceof Error && err.message && preservePatterns.some(r => r.test(err.message))) message = err.message;
      setError(message);
      setAllMatchingItineraries([]);
      setHasMore(false);
    } finally { setLoading(false); }
  };

  const getNextItinerary = async () => {
    const nextIndex = currentIndex + 1;
    if (currentIndex < allMatchingItineraries.length) {
      const cur = allMatchingItineraries[currentIndex];
      if (cur?.id) {
        viewedItinerariesRef.current.add(cur.id);
        try { 
          await AsyncStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(Array.from(viewedItinerariesRef.current))); 
        } catch (_) {}
      }
    }
    if (nextIndex < allMatchingItineraries.length) setCurrentIndex(nextIndex);
    else { setHasMore(false); setCurrentIndex(nextIndex); }
  };

  const loadNextItinerary = getNextItinerary;

  const forceRefreshSearch = async (currentUserItinerary: Itinerary, currentUserId: string) => {
    await searchItineraries(currentUserItinerary, currentUserId);
  };

  return { matchingItineraries, searchItineraries, loading, error, hasMore, loadNextItinerary, getNextItinerary, forceRefreshSearch };
};

export default useSearchItineraries;
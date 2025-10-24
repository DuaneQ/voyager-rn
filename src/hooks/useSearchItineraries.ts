/**
 * Search Itineraries Hook - Exact replica of voyager-pwa useSearchItineraries.tsx
 * Handles itinerary search with filtering and pagination
 */

import { useState } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

// Types matching PWA
interface Itinerary {
  id: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  activities?: string[];
  userInfo?: {
    uid: string;
    email: string;
    username: string;
    gender?: string;
    status?: string;
    sexualOrientation?: string;
  };
  likes?: string[];
  tags?: string[];
  endDay?: number;
  gender?: string;
  sexualOrientation?: string;
  status?: string;
}

interface LocalSearchParams {
  currentUserItinerary: Itinerary;
  currentUserId: string;
}

const useSearchItineraries = () => {
  const [allMatchingItineraries, setAllMatchingItineraries] = useState<Itinerary[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentSearchParams, setCurrentSearchParams] = useState<LocalSearchParams | null>(null);

  // Current itinerary to show (same logic as PWA)
  const matchingItineraries = allMatchingItineraries.length > 0 && currentIndex < allMatchingItineraries.length 
    ? [allMatchingItineraries[currentIndex]] 
    : [];

  // Apply client-side filters (simplified version of PWA logic)
  const applyClientSideFilters = (itineraries: Itinerary[], userItinerary: Itinerary, userId: string): Itinerary[] => {
    return itineraries.filter(itinerary => {
      // Exclude user's own itineraries
      if (itinerary.userInfo?.uid === userId) return false;
      
      // Add other filtering logic here as needed
      return true;
    });
  };

  // Fetch from Firestore (same logic as PWA)
  const fetchFromFirestore = async (params: LocalSearchParams, isNewSearch: boolean = true): Promise<Itinerary[]> => {
    const { currentUserItinerary, currentUserId } = params;
    const userStartDay = new Date(currentUserItinerary.startDate!).getTime();

    const PAGE_SIZE = 50;
    
    // Build query constraints (same as PWA)
    const constraints: QueryConstraint[] = [
      where("destination", "==", currentUserItinerary.destination),
      ...(currentUserItinerary.gender && currentUserItinerary.gender !== "No Preference"
        ? [where("userInfo.gender", "==", currentUserItinerary.gender)]
        : []),
      ...(currentUserItinerary?.status && currentUserItinerary?.status !== "No Preference"
        ? [where("userInfo.status", "==", currentUserItinerary?.status)]
        : []),
      ...(currentUserItinerary.sexualOrientation && currentUserItinerary.sexualOrientation !== "No Preference"
        ? [where("userInfo.sexualOrientation", "==", currentUserItinerary.sexualOrientation)]
        : []),
      where("endDay", ">=", userStartDay),
      orderBy("endDay"),
      orderBy("__name__"),
      limit(PAGE_SIZE)
    ];

    if (!isNewSearch && lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const itinerariesQuery = query(collection(db, "itineraries"), ...constraints);
    const snapshot = await getDocs(itinerariesQuery);
    
    console.log(`🔥 Firestore returned ${snapshot.docs.length} documents`);

    const itineraries: Itinerary[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Itinerary[];

    // Apply client-side filters
    const filteredItineraries = applyClientSideFilters(itineraries, currentUserItinerary, currentUserId);
    
    console.log(`📋 After filtering: ${filteredItineraries.length} itineraries`);

    // Update pagination state
    if (snapshot.docs.length > 0) {
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    }
    setHasMore(snapshot.docs.length === PAGE_SIZE);

    return filteredItineraries;
  };

  // Main search function (same API as PWA)
  const searchItineraries = async (selectedItinerary: Itinerary, userId: string) => {
    if (!selectedItinerary || !userId) {
      setError("Missing required parameters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = {
        currentUserItinerary: selectedItinerary,
        currentUserId: userId
      };

      const results = await fetchFromFirestore(searchParams, true);
      
      setAllMatchingItineraries(results);
      setCurrentIndex(0); // Start from the beginning
      setCurrentSearchParams(searchParams);
      
      console.log(`🔍 Search complete: ${results.length} matching itineraries found`);
      
    } catch (err) {
      console.error("Error searching itineraries:", err);
      setError("Failed to search itineraries");
    } finally {
      setLoading(false);
    }
  };

  // Get next itinerary (same as PWA)
  const getNextItinerary = async () => {
    const nextIndex = currentIndex + 1;
    
    // If we have more results in memory, just advance the index
    if (nextIndex < allMatchingItineraries.length) {
      setCurrentIndex(nextIndex);
      return;
    }
    
    // If we've reached the end of current results and there might be more, load more
    if (hasMore && currentSearchParams) {
      setLoading(true);
      try {
        const moreResults = await fetchFromFirestore(currentSearchParams, false);
        
        if (moreResults.length > 0) {
          const updatedResults = [...allMatchingItineraries, ...moreResults];
          setAllMatchingItineraries(updatedResults);
          setCurrentIndex(nextIndex);
        }
      } catch (err) {
        console.error("Error loading more itineraries:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return {
    matchingItineraries,
    searchItineraries,
    getNextItinerary,
    loading,
    hasMore,
    error,
    allMatchingItineraries,
    currentIndex,
  };
};

export default useSearchItineraries;
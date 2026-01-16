/**
 * useConnections Hook
 * Subscribes to connections collection and provides real-time updates
 * Handles pagination, last message preview, and unread counts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { app } from '../../../firebase-config';
import { Connection } from '../../types/Connection';

interface UseConnectionsResult {
  connections: Connection[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => void;
}

const CONNECTIONS_PAGE_SIZE = 10;

/**
 * Hook to manage user's connections with real-time updates
 * @param userId - Current user's ID
 * @returns Connections state and control functions
 */
export function useConnections(userId: string | null): UseConnectionsResult {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const db = getFirestore(app);

  // Subscribe to initial connections
  useEffect(() => {
    
    if (!userId) {
      setConnections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'connections'),
      where('users', 'array-contains', userId),
      orderBy('createdAt', 'desc'),
      limit(CONNECTIONS_PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const conns: Connection[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            users: data.users || [],
            itineraryIds: data.itineraryIds || [],
            itineraries: data.itineraries || [],
            createdAt: data.createdAt as Timestamp,
            unreadCounts: data.unreadCounts || {},
            addedUsers: data.addedUsers || [],
          };
        });

        setConnections(conns);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === CONNECTIONS_PAGE_SIZE);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching connections:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId]); // Only userId in dependencies, db is stable

  // Load more connections (pagination)
  const loadMore = useCallback(async () => {
    if (!userId || !lastDoc || !hasMore) return;

    try {
      const q = query(
        collection(db, 'connections'),
        where('users', 'array-contains', userId),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(CONNECTIONS_PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const moreConns: Connection[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          users: data.users || [],
          itineraryIds: data.itineraryIds || [],
          itineraries: data.itineraries || [],
          createdAt: data.createdAt as Timestamp,
          unreadCounts: data.unreadCounts || {},
          addedUsers: data.addedUsers || [],
        };
      });

      setConnections((prev) => [...prev, ...moreConns]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || lastDoc);
      setHasMore(snapshot.docs.length === CONNECTIONS_PAGE_SIZE);
    } catch (err) {
      console.error('Error loading more connections:', err);
      setError(err as Error);
    }
  }, [userId, lastDoc, hasMore]); // Removed db from dependencies

  // Refresh connections
  const refresh = useCallback(() => {
    if (!userId) return;
    
    // Clean up existing listener before refresh
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setLoading(true);
    setError(null);
    setLastDoc(null);
    setHasMore(true);
    
    const q = query(
      collection(db, 'connections'),
      where('users', 'array-contains', userId),
      orderBy('createdAt', 'desc'),
      limit(CONNECTIONS_PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const conns: Connection[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            users: data.users || [],
            itineraryIds: data.itineraryIds || [],
            itineraries: data.itineraries || [],
            createdAt: data.createdAt as Timestamp,
            unreadCounts: data.unreadCounts || {},
            addedUsers: data.addedUsers || [],
          };
        });

        setConnections(conns);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === CONNECTIONS_PAGE_SIZE);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching connections:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;
  }, [userId]);

  return {
    connections,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

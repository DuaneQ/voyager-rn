/**
 * useMessages.ts
 * 
 * Hook for paginated message loading in a chat thread.
 * Implements infinite scroll pattern with real-time updates.
 * 
 * Requirements:
 * - Load 5 messages initially (limit(5))
 * - loadMore() fetches previous 5 messages with cursor-based pagination
 * - Real-time listener for new messages
 * - Deduplication via clientMessageId
 * - Optimistic UI support (pending flag)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../firebase-config';
import { Message } from '../../types/Message';

interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => void;
}

const MESSAGES_PER_PAGE = 20;

/**
 * Hook for managing message pagination and real-time updates in a chat thread.
 * 
 * @param connectionId - The connection document ID
 * @returns Message list, loading state, pagination controls
 */
export function useMessages(connectionId: string | null | undefined): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Load initial messages and set up real-time listener.
   * MATCHES PWA: Real-time listener replaces entire message array on each update
   */
  const loadInitialMessages = useCallback(() => {
    if (!connectionId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const messagesRef = collection(db, 'connections', connectionId, 'messages');
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(MESSAGES_PER_PAGE)
      );

      // Set up real-time listener - EXACTLY like PWA Chat.tsx
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // Map all messages from snapshot and reverse (oldest first) - EXACTLY like PWA
          const msgs: Message[] = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                sender: data.sender || '',
                text: data.text || '',
                imageUrl: data.imageUrl,
                createdAt: data.createdAt || Timestamp.now(),
                readBy: Array.isArray(data.readBy) ? data.readBy : [],
                clientMessageId: data.clientMessageId,
                pending: data.pending || false,
              };
            })
            .reverse(); // oldest at top - EXACTLY like PWA

          // Set messages directly - real-time listener handles everything
          setMessages(msgs);
          
          // Set pagination cursor
          const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
          setLastDoc(lastVisible);
          setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
          setLoading(false);
        },
        (err) => {
          console.error('Error loading messages:', err);
          setError(err as Error);
          setLoading(false);
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      console.error('Error setting up messages listener:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [connectionId]);

  /**
   * Load more (older) messages using cursor-based pagination.
   */
  const loadMore = useCallback(async () => {
    if (!connectionId || !lastDoc || !hasMore || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const messagesRef = collection(db, 'connections', connectionId, 'messages');
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(MESSAGES_PER_PAGE)
      );

      // One-time fetch for older messages using getDocs
      const snapshot = await getDocs(q);

      const olderMessages: Message[] = [];
      let lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;

      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const message: Message = {
          id: doc.id,
          sender: data.sender || '',
          text: data.text || '',
          imageUrl: data.imageUrl,
          createdAt: data.createdAt || Timestamp.now(),
          readBy: Array.isArray(data.readBy) ? data.readBy : [],
          clientMessageId: data.clientMessageId,
          pending: data.pending || false,
        };

        olderMessages.push(message);
        lastVisible = doc;
      });

      // Reverse and prepend (older messages go at the beginning)
      olderMessages.reverse();
      setMessages((prev) => [...olderMessages, ...prev]);
      setLastDoc(lastVisible);
      setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
      setLoading(false);
    } catch (err) {
      console.error('Error loading more messages:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [connectionId, lastDoc, hasMore, loading]);

  /**
   * Refresh messages (reload from scratch).
   */
  const refresh = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setMessages([]);
    setLastDoc(null);
    setHasMore(true);
    loadInitialMessages();
  }, [loadInitialMessages]);

  // Load initial messages when connectionId changes
  useEffect(() => {
    loadInitialMessages();

    // Cleanup listener on unmount or connectionId change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [loadInitialMessages]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

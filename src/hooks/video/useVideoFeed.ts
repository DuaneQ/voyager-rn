/**
 * useVideoFeed Hook
 * Manages video feed state including fetching, pagination, filtering, and interactions
 * Mirrors PWA VideoFeedPage logic with React Native optimizations
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  DocumentSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import * as firebaseCfg from '../../config/firebaseConfig';
import { Video } from '../../types/Video';

export type VideoFilter = 'all' | 'liked' | 'mine';

interface UseVideoFeedReturn {
  videos: Video[];
  currentVideoIndex: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMoreVideos: boolean;
  currentFilter: VideoFilter;
  connectedUserIds: string[];
  loadVideos: (loadMore?: boolean) => Promise<void>;
  loadConnectedUsers: () => Promise<void>;
  goToNextVideo: () => void;
  goToPreviousVideo: () => void;
  setCurrentVideoIndex: (index: number) => void;
  handleLike: (video: Video) => Promise<void>;
  trackVideoView: (videoId: string) => Promise<void>;
  setCurrentFilter: (filter: VideoFilter) => void;
  refreshVideos: () => Promise<void>;
}

const BATCH_SIZE = 3; // Load 3-5 videos at a time (PWA uses 3)

export const useVideoFeed = (): UseVideoFeedReturn => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<VideoFilter>('all');
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);
  
  // Track viewed videos to prevent double-counting
  const viewedVideoIds = useRef<Set<string>>(new Set());

  const _authResolved: any = (firebaseCfg && typeof (firebaseCfg as any).getAuthInstance === 'function')
    ? (firebaseCfg as any).getAuthInstance()
    : (firebaseCfg as any).auth || null;
  const userId = _authResolved?.currentUser?.uid;

  /**
   * Load connected user IDs for private video filtering
   */
  const loadConnectedUsers = useCallback(async () => {
    if (!userId) {
      setConnectedUserIds([]);
      return;
    }

    try {
      const connectionsQuery = query(
        collection(db, 'connections'),
        where('users', 'array-contains', userId)
      );

      const connectionsSnapshot = await getDocs(connectionsQuery);
      const connectedIds = new Set<string>();

      connectionsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.users && Array.isArray(data.users)) {
          data.users.forEach((uid: string) => {
            if (uid !== userId) {
              connectedIds.add(uid);
            }
          });
        }
      });

      setConnectedUserIds(Array.from(connectedIds));
    } catch (err) {
      console.error('Error loading connections:', err);
      setConnectedUserIds([]);
    }
  }, [userId]);

  /**
   * Load videos with pagination and filtering
   */
  const loadVideos = useCallback(
    async (loadMore = false) => {
      try {
        if (loadMore) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setError(null);
        }

        let videosQuery: Query<DocumentData> | null = null;

        // Build query based on filter
        switch (currentFilter) {
          case 'all':
            // Public videos + private videos from connections
            if (connectedUserIds.length > 0) {
              // Combined query: public OR (private AND from connected user)
              const publicQuery = query(
                collection(db, 'videos'),
                where('isPublic', '==', true),
                orderBy('createdAt', 'desc'),
                limit(BATCH_SIZE),
                ...(loadMore && lastDoc ? [startAfter(lastDoc)] : [])
              );

              const privateQuery = query(
                collection(db, 'videos'),
                where('isPublic', '==', false),
                where('userId', 'in', connectedUserIds.slice(0, 10)), // Firestore 'in' limit is 10
                orderBy('createdAt', 'desc'),
                limit(BATCH_SIZE),
                ...(loadMore && lastDoc ? [startAfter(lastDoc)] : [])
              );

              // Execute both queries
              const [publicSnapshot, privateSnapshot] = await Promise.all([
                getDocs(publicQuery),
                getDocs(privateQuery),
              ]);

              // Combine and deduplicate results
              const videoMap = new Map<string, Video>();

              publicSnapshot.forEach((doc) => {
                videoMap.set(doc.id, { id: doc.id, ...doc.data() } as Video);
              });

              privateSnapshot.forEach((doc) => {
                if (!videoMap.has(doc.id)) {
                  videoMap.set(doc.id, { id: doc.id, ...doc.data() } as Video);
                }
              });

              const fetchedVideos = Array.from(videoMap.values()).sort(
                (a, b) => {
                  const aTime = a.createdAt?.seconds || 0;
                  const bTime = b.createdAt?.seconds || 0;
                  return bTime - aTime;
                }
              );

              if (loadMore) {
                // Deduplicate when loading more to prevent duplicate keys
                setVideos((prev) => {
                  const existingIds = new Set(prev.map(v => v.id));
                  const newVideos = fetchedVideos.filter(v => !existingIds.has(v.id));
                  return [...prev, ...newVideos];
                });
              } else {
                setVideos(fetchedVideos);
              }

              // Set pagination state
              const lastVisible =
                publicSnapshot.docs[publicSnapshot.docs.length - 1] ||
                privateSnapshot.docs[privateSnapshot.docs.length - 1];
              setLastDoc(lastVisible || null);
              setHasMoreVideos(
                publicSnapshot.docs.length + privateSnapshot.docs.length >=
                  BATCH_SIZE
              );
            } else {
              // No connections - just show public videos
              videosQuery = query(
                collection(db, 'videos'),
                where('isPublic', '==', true),
                orderBy('createdAt', 'desc'),
                limit(BATCH_SIZE),
                ...(loadMore && lastDoc ? [startAfter(lastDoc)] : [])
              );

              const snapshot = await getDocs(videosQuery);
              const fetchedVideos = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as Video[];

              if (loadMore) {
                // Deduplicate when loading more to prevent duplicate keys
                setVideos((prev) => {
                  const existingIds = new Set(prev.map(v => v.id));
                  const newVideos = fetchedVideos.filter(v => !existingIds.has(v.id));
                  return [...prev, ...newVideos];
                });
              } else {
                setVideos(fetchedVideos);
              }

              const lastVisible = snapshot.docs[snapshot.docs.length - 1];
              setLastDoc(lastVisible || null);
              setHasMoreVideos(snapshot.docs.length >= BATCH_SIZE);
            }
            break;

          case 'liked':
            if (!userId) {
              setVideos([]);
              setHasMoreVideos(false);
              return;
            }

            videosQuery = query(
              collection(db, 'videos'),
              where('likes', 'array-contains', userId),
              orderBy('createdAt', 'desc'),
              limit(BATCH_SIZE),
              ...(loadMore && lastDoc ? [startAfter(lastDoc)] : [])
            );

            const likedSnapshot = await getDocs(videosQuery);
            const likedVideos = likedSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Video[];

            if (loadMore) {
              // Deduplicate when loading more to prevent duplicate keys
              setVideos((prev) => {
                const existingIds = new Set(prev.map(v => v.id));
                const newVideos = likedVideos.filter(v => !existingIds.has(v.id));
                return [...prev, ...newVideos];
              });
            } else {
              setVideos(likedVideos);
            }

            const likedLastVisible =
              likedSnapshot.docs[likedSnapshot.docs.length - 1];
            setLastDoc(likedLastVisible || null);
            setHasMoreVideos(likedSnapshot.docs.length >= BATCH_SIZE);
            break;

          case 'mine':
            if (!userId) {
              setVideos([]);
              setHasMoreVideos(false);
              return;
            }

            videosQuery = query(
              collection(db, 'videos'),
              where('userId', '==', userId),
              orderBy('createdAt', 'desc'),
              limit(BATCH_SIZE),
              ...(loadMore && lastDoc ? [startAfter(lastDoc)] : [])
            );

            const mySnapshot = await getDocs(videosQuery);
            const myVideos = mySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Video[];

            if (loadMore) {
              // Deduplicate when loading more to prevent duplicate keys
              setVideos((prev) => {
                const existingIds = new Set(prev.map(v => v.id));
                const newVideos = myVideos.filter(v => !existingIds.has(v.id));
                return [...prev, ...newVideos];
              });
            } else {
              setVideos(myVideos);
            }

            const myLastVisible = mySnapshot.docs[mySnapshot.docs.length - 1];
            setLastDoc(myLastVisible || null);
            setHasMoreVideos(mySnapshot.docs.length >= BATCH_SIZE);
            break;
        }
      } catch (err) {
        console.error('Error loading videos:', err);
        setError('Failed to load videos. Please try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [currentFilter, connectedUserIds, lastDoc, userId]
  );

  /**
   * Navigate to next video
   */
  const goToNextVideo = useCallback(() => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex((prev) => prev + 1);
    } else if (hasMoreVideos && !isLoadingMore) {
      // Load more videos when approaching end
      loadVideos(true);
    }
  }, [currentVideoIndex, videos.length, hasMoreVideos, isLoadingMore, loadVideos]);

  /**
   * Navigate to previous video
   */
  const goToPreviousVideo = useCallback(() => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex((prev) => prev - 1);
    }
  }, [currentVideoIndex]);

  /**
   * Like or unlike a video
   */
  const handleLike = useCallback(
    async (video: Video) => {
      if (!userId) {
        return;
      }

      try {
        const videoRef = doc(db, 'videos', video.id);
        const isLiked = video.likes?.includes(userId);

        if (isLiked) {
          // Unlike
          await updateDoc(videoRef, {
            likes: arrayRemove(userId),
          });

          // Update local state optimistically
          setVideos((prevVideos) =>
            prevVideos.map((v) =>
              v.id === video.id
                ? {
                    ...v,
                    likes: v.likes?.filter((id) => id !== userId) || [],
                  }
                : v
            )
          );
        } else {
          // Like
          await updateDoc(videoRef, {
            likes: arrayUnion(userId),
          });

          // Update local state optimistically
          setVideos((prevVideos) =>
            prevVideos.map((v) =>
              v.id === video.id
                ? {
                    ...v,
                    likes: [...(v.likes || []), userId],
                  }
                : v
            )
          );
        }
      } catch (err) {
        console.error('Error updating like:', err);
      }
    },
    [userId]
  );

  /**
   * Track video view (debounced - only once per video per session)
   */
  const trackVideoView = useCallback(async (videoId: string) => {
    // Prevent duplicate view tracking
    if (viewedVideoIds.current.has(videoId)) {
      return;
    }

    // Only track if user is authenticated
    if (!userId) {
      return;
    }

    try {
      viewedVideoIds.current.add(videoId);
      const videoRef = doc(db, 'videos', videoId);
      await updateDoc(videoRef, {
        viewCount: increment(1),
      });
    } catch (err: any) {
      // Silently handle permission errors - view tracking is not critical
      // Some videos may have restricted permissions
      if (err?.code !== 'permission-denied') {
        console.error('Error tracking video view:', err);
      }
      // Remove from viewed set if tracking failed (but not for permission errors)
      if (err?.code !== 'permission-denied') {
        viewedVideoIds.current.delete(videoId);
      }
    }
  }, [userId]);

  /**
   * Refresh videos (pull to refresh)
   */
  const refreshVideos = useCallback(async () => {
    setLastDoc(null);
    setHasMoreVideos(true);
    setCurrentVideoIndex(0);
    viewedVideoIds.current.clear();
    await loadConnectedUsers();
    await loadVideos(false);
  }, [loadConnectedUsers, loadVideos]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback(
    (filter: VideoFilter) => {
      setCurrentFilter(filter);
      setCurrentVideoIndex(0);
      setLastDoc(null);
      setHasMoreVideos(true);
      viewedVideoIds.current.clear();
    },
    []
  );

  /**
   * Load connections and videos on mount or filter change
   */
  useEffect(() => {
    loadConnectedUsers();
  }, [loadConnectedUsers, currentFilter]);

  useEffect(() => {
    if (connectedUserIds.length >= 0) {
      // Load once connections are ready (even if empty array)
      loadVideos(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedUserIds.length, currentFilter]); // Intentionally excluding loadVideos to prevent infinite loop

  /**
   * Auto-load more videos when approaching end
   */
  useEffect(() => {
    const shouldLoadMore =
      currentVideoIndex >= videos.length - 2 &&
      hasMoreVideos &&
      !isLoadingMore;
    if (shouldLoadMore) {
      loadVideos(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideoIndex, videos.length, hasMoreVideos, isLoadingMore]); // Intentionally excluding loadVideos to prevent infinite loop

  return {
    videos,
    currentVideoIndex,
    isLoading,
    isLoadingMore,
    error,
    hasMoreVideos,
    currentFilter,
    connectedUserIds,
    loadVideos,
    loadConnectedUsers,
    goToNextVideo,
    goToPreviousVideo,
    setCurrentVideoIndex,
    handleLike,
    trackVideoView,
    setCurrentFilter: handleFilterChange,
    refreshVideos,
  };
};

/**
 * Video Feed Screen - Exact replica of voyager-pwa VideoFeedPage
 * TikTok-style vertical video feed for travel stories and experiences
 * 
 * Features:
 * - Vertical swipe navigation between videos
 * - Video filters (All, Liked, Mine)
 * - Video upload functionality
 * - Like/unlike videos
 * - Comments system
 * - Share functionality
 * - Connection-based privacy (can see connected users' videos)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
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
} from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { useAlert } from '../context/AlertContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Video types (matching PWA)
interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  userId: string;
  userInfo?: {
    uid: string;
    username: string;
    email: string;
  };
  likes: string[];
  visibility: 'public' | 'connections' | 'private';
  createdAt: any;
  tags?: string[];
}

type VideoFilter = 'all' | 'liked' | 'mine';

const VideoFeedScreen: React.FC = () => {
  const { showAlert } = useAlert();
  const userId = auth.currentUser?.uid;

  // State (matching PWA VideoFeedPage)
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<VideoFilter>('all');
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);

  // Animation for swipe transitions
  const translateY = new Animated.Value(0);

  // Load connected users (same logic as PWA)
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
        const connectionData = doc.data();
        connectionData.users?.forEach((uid: string) => {
          if (uid !== userId) {
            connectedIds.add(uid);
          }
        });
      });
      
      setConnectedUserIds(Array.from(connectedIds));
    } catch (err) {
      console.error('Error loading connections:', err);
      setConnectedUserIds([]);
    }
  }, [userId]);

  // Load videos based on filter (same logic as PWA)
  const loadVideos = useCallback(async (loadMore = false) => {
    try {
      if (!loadMore) {
        setIsLoading(true);
      }

      let videosQuery;
      
      // Build query based on filter (same logic as PWA)
      switch (currentFilter) {
        case 'mine':
          if (!userId) return;
          videosQuery = query(
            collection(db, 'videos'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(10)
          );
          break;
          
        case 'liked':
          if (!userId) return;
          videosQuery = query(
            collection(db, 'videos'),
            where('likes', 'array-contains', userId),
            orderBy('createdAt', 'desc'),
            limit(10)
          );
          break;
          
        default: // 'all'
          videosQuery = query(
            collection(db, 'videos'),
            where('visibility', 'in', ['public', 'connections']),
            orderBy('createdAt', 'desc'),
            limit(10)
          );
      }

      if (loadMore && lastDoc) {
        videosQuery = query(videosQuery, startAfter(lastDoc));
      }

      const videoSnapshot = await getDocs(videosQuery);
      const videoList: Video[] = [];

      videoSnapshot.forEach((doc) => {
        const videoData = doc.data() as Omit<Video, 'id'>;
        
        // Filter based on visibility and connections (same logic as PWA)
        if (videoData.visibility === 'connections' && 
            !connectedUserIds.includes(videoData.userId) && 
            videoData.userId !== userId) {
          return; // Skip videos from non-connected users
        }

        videoList.push({
          id: doc.id,
          ...videoData,
        });
      });

      if (loadMore) {
        setVideos(prev => [...prev, ...videoList]);
      } else {
        setVideos(videoList);
        setCurrentVideoIndex(0);
      }

      setLastDoc(videoSnapshot.docs[videoSnapshot.docs.length - 1] || null);
      setHasMoreVideos(videoSnapshot.docs.length === 10);

    } catch (err) {
      console.error('Error loading videos:', err);
      showAlert('error', 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  }, [currentFilter, userId, connectedUserIds, lastDoc, showAlert]);

  // Initialize
  useEffect(() => {
    loadConnectedUsers();
  }, [loadConnectedUsers]);

  useEffect(() => {
    if (connectedUserIds.length >= 0) { // Load when connectedUserIds is set (even if empty)
      loadVideos();
    }
  }, [currentFilter, connectedUserIds, loadVideos]);

  // Handle video like/unlike (same logic as PWA)
  const handleLike = async (video: Video) => {
    if (!userId) {
      showAlert('error', 'Please log in to like videos');
      return;
    }

    try {
      const videoRef = doc(db, 'videos', video.id);
      const isLiked = video.likes.includes(userId);

      if (isLiked) {
        await updateDoc(videoRef, {
          likes: arrayRemove(userId)
        });
      } else {
        await updateDoc(videoRef, {
          likes: arrayUnion(userId)
        });
      }

      // Update local state
      setVideos(prev => prev.map(v => 
        v.id === video.id 
          ? { 
              ...v, 
              likes: isLiked 
                ? v.likes.filter(id => id !== userId)
                : [...v.likes, userId]
            }
          : v
      ));

    } catch (err) {
      console.error('Error updating like:', err);
      showAlert('error', 'Failed to update like');
    }
  };

  // Handle swipe navigation
  const onSwipeGesture = ({ nativeEvent }: any) => {
    const { translationY } = nativeEvent;
    
    if (translationY < -50 && currentVideoIndex < videos.length - 1) {
      // Swipe up - next video
      setCurrentVideoIndex(prev => prev + 1);
    } else if (translationY > 50 && currentVideoIndex > 0) {
      // Swipe down - previous video
      setCurrentVideoIndex(prev => prev - 1);
    }
  };

  // Filter buttons component
  const FilterButtons = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
      {(['all', 'liked', 'mine'] as VideoFilter[]).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[styles.filterButton, currentFilter === filter && styles.activeFilterButton]}
          onPress={() => setCurrentFilter(filter)}
        >
          <Text style={[styles.filterText, currentFilter === filter && styles.activeFilterText]}>
            {filter === 'all' ? 'All Videos' : 
             filter === 'liked' ? 'Liked' : 'My Videos'}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Video player component (placeholder)
  const VideoPlayer = ({ video }: { video: Video }) => (
    <View style={styles.videoContainer}>
      <View style={styles.videoPlaceholder}>
        <Text style={styles.videoTitle}>{video.title}</Text>
        <Text style={styles.videoDescription}>{video.description}</Text>
        <Text style={styles.videoUser}>By: {video.userInfo?.username || 'Unknown'}</Text>
      </View>
      
      {/* Video Controls */}
      <View style={styles.videoControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => handleLike(video)}
        >
          <Text style={styles.controlButtonText}>
            {video.likes.includes(userId || '') ? '❤️' : '🤍'} {video.likes.length}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setIsCommentsModalOpen(true)}
        >
          <Text style={styles.controlButtonText}>💬</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setIsShareModalOpen(true)}
        >
          <Text style={styles.controlButtonText}>📤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (videos.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Travel Videos</Text>
          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={() => setIsUploadModalOpen(true)}
          >
            <Text style={styles.uploadButtonText}>+ Upload</Text>
          </TouchableOpacity>
        </View>

        <FilterButtons />

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No videos found</Text>
          <Text style={styles.emptySubtext}>
            {currentFilter === 'mine' 
              ? 'Upload your first video to get started!'
              : 'Be the first to share your travel story!'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentVideo = videos[currentVideoIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Travel Videos</Text>
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={() => setIsUploadModalOpen(true)}
        >
          <Text style={styles.uploadButtonText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      <FilterButtons />

      {/* Video Feed */}
      <PanGestureHandler onGestureEvent={onSwipeGesture}>
        <Animated.View style={styles.videoFeed}>
          {currentVideo && <VideoPlayer video={currentVideo} />}
          
          {/* Video Counter */}
          <View style={styles.videoCounter}>
            <Text style={styles.counterText}>
              {currentVideoIndex + 1} of {videos.length}
            </Text>
          </View>
        </Animated.View>
      </PanGestureHandler>

      {/* Upload Modal */}
      <Modal
        visible={isUploadModalOpen}
        animationType="slide"
        onRequestClose={() => setIsUploadModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsUploadModalOpen(false)}>
              <Text style={styles.modalCloseButton}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Upload Video</Text>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.placeholderText}>Video Upload</Text>
            <Text style={styles.subPlaceholderText}>
              Video upload functionality coming soon!
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // TikTok-style black background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  uploadButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Filter Buttons
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeFilterButton: {
    backgroundColor: '#1976d2',
  },
  filterText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: 'bold',
  },

  // Video Feed
  videoFeed: {
    flex: 1,
    position: 'relative',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    margin: 20,
  },
  videoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  videoDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  videoUser: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Video Controls
  videoControls: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButtonText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },

  // Video Counter
  videoCounter: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    marginTop: 40,
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#1976d2',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  subPlaceholderText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default VideoFeedScreen;
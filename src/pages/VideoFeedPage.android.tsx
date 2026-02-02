/**
 * VideoFeedPage (Android-Specific) - RecyclerListView Implementation
 * 
 * WHY THIS EXISTS:
 * - FlatList + expo-av causes render loop (50+ re-renders) + MediaCodec leak on Android
 * - RecyclerListView has better memory management and deterministic recycling
 * - iOS version (VideoFeedPage.tsx) works fine - unchanged
 * 
 * DIFFERENCES FROM iOS VERSION:
 * 1. RecyclerListView instead of FlatList
 * 2. DataProvider/LayoutProvider pattern (required by RecyclerListView)
 * 3. Simplified scrolling logic (no momentum tracking needed)
 * 4. Uses AndroidVideoPlayer with aggressive MediaCodec cleanup
 * 
 * Platform.select() automatically loads this file on Android.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { RecyclerListView, DataProvider, LayoutProvider } from 'recyclerlistview';
import { setAudioModeAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { VideoCard } from '../components/video/VideoCard';
import { VideoCommentsModal } from '../components/video/VideoCommentsModal';
import { VideoUploadModal } from '../components/modals/VideoUploadModal';
import { ReportVideoModal } from '../components/modals/ReportVideoModal';
import { useVideoFeed, VideoFilter } from '../hooks/video/useVideoFeed';
import { useVideoUpload } from '../hooks/video/useVideoUpload';
import { useAlert } from '../context/AlertContext';
import { shareVideo } from '../utils/videoSharing';
import { videoPlaybackManager } from '../services/video/VideoPlaybackManager';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const { width, height } = Dimensions.get('window');

// Layout types for RecyclerListView
const ViewTypes = {
  VIDEO_CARD: 0,
};

const VideoFeedPage: React.FC = () => {
  const { showAlert } = useAlert();
  
  const {
    videos,
    currentVideoIndex,
    isLoading,
    isLoadingMore,
    error,
    hasMoreVideos,
    currentFilter,
    goToNextVideo,
    setCurrentVideoIndex,
    handleLike,
    trackVideoView,
    setCurrentFilter,
    refreshVideos,
    updateVideo,
  } = useVideoFeed();

  const { uploadState, selectVideo, uploadVideo } = useVideoUpload({
    onError: (message, title) => {
      showAlert('error', message);
    },
  });
  
  const resolvedAuth = typeof (require('../config/firebaseConfig') as any).getAuthInstance === 'function'
    ? (require('../config/firebaseConfig') as any).getAuthInstance()
    : (require('../config/firebaseConfig') as any).auth;
    
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
  const [selectedVideoFileSize, setSelectedVideoFileSize] = useState<number | undefined>(undefined);
  const [isMuted, setIsMuted] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<typeof videos[0] | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedVideoForReport, setSelectedVideoForReport] = useState<typeof videos[0] | null>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  
  const recyclerRef = useRef<RecyclerListView<any, any>>(null);

  /**
   * RecyclerListView Data Provider
   * Tracks data changes and determines when to re-render
   */
  const dataProvider = useMemo(() => {
    return new DataProvider((r1, r2) => {
      return r1.id !== r2.id;
    }).cloneWithRows(videos);
  }, [videos]);

  /**
   * RecyclerListView Layout Provider
   * Defines dimensions for each item type
   */
  const layoutProvider = useMemo(() => {
    return new LayoutProvider(
      (index) => ViewTypes.VIDEO_CARD,
      (type, dim) => {
        dim.width = width;
        dim.height = height;
      }
    );
  }, []);

  /**
   * Stop video playback when navigating away
   */
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
        videoPlaybackManager.deactivateAll();
      };
    }, [])
  );

  /**
   * Configure audio session for Android
   */
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await setAudioModeAsync({
          shouldPlayInBackground: false,
          interruptionMode: 'doNotMix',
          shouldRouteThroughEarpiece: false,
        });
      } catch (e) {
        console.warn('⚠️ Audio.setAudioModeAsync failed:', e);
      }
    };
    setupAudio();
  }, []);

  /**
   * Handle video view tracking
   */
  const handleViewTracked = useCallback(
    (videoId: string) => {
      trackVideoView(videoId);
    },
    [trackVideoView]
  );

  /**
   * Handle video sharing
   */
  const handleShare = useCallback(async (videoIndex: number) => {
    const video = videos[videoIndex];
    if (video) {
      await shareVideo(video);
    }
  }, [videos]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshVideos();
    setIsRefreshing(false);
    if (recyclerRef.current && videos.length > 0) {
      recyclerRef.current.scrollToIndex(0, false);
    }
  }, [refreshVideos, videos.length]);

  /**
   * Handle comment button press
   */
  const handleCommentPress = useCallback((videoIndex: number) => {
    const video = videos[videoIndex];
    if (video) {
      setSelectedVideoForComments(video);
      setCommentsModalVisible(true);
    }
  }, [videos]);

  /**
   * Handle comment added - refresh video data to update comment count
   */
  const handleCommentAdded = useCallback(async () => {
    if (!selectedVideoForComments) return;
    
    try {
      // Fetch fresh video data from server
      const videoDoc = await getDocFromServer(doc(db, 'videos', selectedVideoForComments.id));
      if (videoDoc.exists()) {
        const freshVideoData = { id: videoDoc.id, ...videoDoc.data() } as typeof videos[0];
        // Update the video in the feed's videos array
        updateVideo(selectedVideoForComments.id, freshVideoData);
        // Update selectedVideoForComments to show correct count in modal
        setSelectedVideoForComments(freshVideoData);
      }
    } catch (error) {
      console.error('[VideoFeedPage] Error refreshing video after comment:', error);
    }
  }, [selectedVideoForComments, updateVideo]);

  /**
   * Handle report button press
   */
  const handleReportPress = useCallback((videoIndex: number) => {
    const video = videos[videoIndex];
    if (video) {
      setSelectedVideoForReport(video);
      setReportModalVisible(true);
    }
  }, [videos]);

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback(
    (filter: VideoFilter) => {
      setCurrentFilter(filter);
      if (recyclerRef.current) {
        recyclerRef.current.scrollToIndex(0, false);
      }
    },
    [setCurrentFilter]
  );

  /**
   * Handle upload button press
   */
  const handleUploadPress = useCallback(async () => {
    const result = await selectVideo();
    if (result) {
      setSelectedVideoUri(result.uri);
      setSelectedVideoFileSize(result.fileSize);
      setUploadModalVisible(true);
    }
  }, [selectVideo]);

  /**
   * Handle video upload from modal
   */
  const handleVideoUpload = useCallback(async (videoData: any) => {
    await uploadVideo(videoData);
    setUploadModalVisible(false);
    setSelectedVideoUri(null);
    setSelectedVideoFileSize(undefined);
    await refreshVideos();
  }, [uploadVideo, refreshVideos]);

  /**
   * Handle upload modal close
   */
  const handleUploadModalClose = useCallback(() => {
    setUploadModalVisible(false);
    setSelectedVideoUri(null);
    setSelectedVideoFileSize(undefined);
  }, []);

  /**
   * Track scroll position to determine active video
   * Uses scroll offset to calculate which video is >50% visible (centered)
   */
  const handleScroll = useCallback((rawEvent: any, offsetX: number, offsetY: number) => {
    // Calculate which video is centered based on scroll offset
    // Round to nearest index (video is active when >50% visible)
    const centeredIndex = Math.round(offsetY / height);
    
    if (centeredIndex !== currentVideoIndex && centeredIndex >= 0 && centeredIndex < videos.length) {
      // Deactivate all before activating new (prevent audio overlap)
      videoPlaybackManager.deactivateAll();
      setCurrentVideoIndex(centeredIndex);
    }
  }, [currentVideoIndex, setCurrentVideoIndex, videos.length]);

  /**
   * Handle visible indices changed (RecyclerListView's viewability tracking)
   * Now only used for logging/debugging - scroll handler determines active video
   */
  const handleVisibleIndicesChanged = useCallback((all: number[], now: number[]) => {
    // Visibility tracking callback - actual index change handled by onScroll
  }, []);

  /**
   * Handle end reached (load more videos)
   */
  const handleEndReached = useCallback(() => {
    if (hasMoreVideos && !isLoadingMore) {
      goToNextVideo();
    }
  }, [hasMoreVideos, isLoadingMore, goToNextVideo]);

  /**
   * Row renderer for RecyclerListView
   */
  const rowRenderer = useCallback(
    (type: string | number, data: any, index: number) => {
      const currentUserId = resolvedAuth?.currentUser?.uid;
      const isOwnVideo = data.userId === currentUserId;

      return (
        <VideoCard
          video={data}
          isActive={index === currentVideoIndex && isScreenFocused}
          isMuted={isMuted}
          onMuteToggle={setIsMuted}
          onLike={() => handleLike(data)}
          onComment={() => handleCommentPress(index)}
          onShare={() => handleShare(index)}
          onReport={!isOwnVideo ? () => handleReportPress(index) : undefined}
          onViewTracked={() => handleViewTracked(data.id)}
        />
      );
    },
    [currentVideoIndex, isScreenFocused, isMuted, handleLike, handleCommentPress, handleShare, handleReportPress, handleViewTracked, resolvedAuth]
  );

  /**
   * Render filter tabs
   */
  function renderFilterTabs() {
    return (
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, currentFilter === 'all' && styles.filterTabActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              currentFilter === 'all' && styles.filterTabTextActive,
            ]}
          >
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, currentFilter === 'liked' && styles.filterTabActive]}
          onPress={() => handleFilterChange('liked')}
        >
          <Text
            style={[
              styles.filterTabText,
              currentFilter === 'liked' && styles.filterTabTextActive,
            ]}
          >
            Liked
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, currentFilter === 'mine' && styles.filterTabActive]}
          onPress={() => handleFilterChange('mine')}
        >
          <Text
            style={[
              styles.filterTabText,
              currentFilter === 'mine' && styles.filterTabTextActive,
            ]}
          >
            My Videos
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render empty state
   */
  if (videos.length === 0) {
    let emptyMessage = 'No videos found';
    let emptySubtext = 'Be the first to share your travel adventures!';

    if (currentFilter === 'liked') {
      emptyMessage = 'No liked videos yet';
      emptySubtext = 'Videos you like will appear here';
    } else if (currentFilter === 'mine') {
      emptyMessage = 'You haven\'t uploaded any videos';
      emptySubtext = 'Tap the + button to share your first video';
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Travals</Text>
          {renderFilterTabs()}
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-outline" size={80} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          <Text style={styles.emptySubtext}>{emptySubtext}</Text>
          {currentFilter === 'all' && (
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPress}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload Video</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with filters */}
      <View style={styles.header}>
        <Text style={styles.title}>Travals</Text>
        {renderFilterTabs()}
      </View>

      {/* Video feed with RecyclerListView */}
      <RecyclerListView
        ref={recyclerRef}
        dataProvider={dataProvider}
        layoutProvider={layoutProvider}
        rowRenderer={rowRenderer}
        // CRITICAL: Force re-render when props change (isActive updates)
        forceNonDeterministicRendering={true}
        // CRITICAL: Track state changes that affect rendering but aren't in data
        // This forces re-render of visible items when currentVideoIndex changes
        extendedState={{ currentVideoIndex, isScreenFocused, isMuted }}
        // CRITICAL: Only preload 1 screen ahead (reduces memory pressure)
        renderAheadOffset={height}
        // CRITICAL: Use onScroll to determine active video (more accurate than onVisibleIndicesChanged)
        onScroll={handleScroll}
        // Track visible items for logging only
        onVisibleIndicesChanged={handleVisibleIndicesChanged}
        // Load more when reaching bottom
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        // Scrolling performance
        scrollViewProps={{
          pagingEnabled: true,
          snapToInterval: height, // CRITICAL: Force snap to exact screen height
          snapToAlignment: 'start',
          decelerationRate: 'fast',
          showsVerticalScrollIndicator: false,
          disableIntervalMomentum: true, // Prevent momentum scroll past snap points
          onRefresh: isRefreshing ? undefined : handleRefresh,
          refreshing: isRefreshing,
        }}
      />

      {/* Loading more indicator */}
      {isLoadingMore && (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}

      {/* Floating upload button */}
      <TouchableOpacity
        style={styles.floatingUploadButton}
        onPress={handleUploadPress}
        disabled={uploadState.loading}
      >
        {uploadState.loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="add" size={32} color="#fff" />
        )}
      </TouchableOpacity>

      {/* Upload progress indicator */}
      {uploadState.loading && (
        <View style={styles.uploadProgress}>
          <Text style={styles.uploadProgressText}>
            {uploadState.processingStatus || `Uploading ${uploadState.progress}%`}
          </Text>
        </View>
      )}

      {/* Comments Modal */}
      {commentsModalVisible && selectedVideoForComments && (
        <VideoCommentsModal
          visible={commentsModalVisible}
          onClose={() => {
            setCommentsModalVisible(false);
            setSelectedVideoForComments(null);
          }}
          video={selectedVideoForComments}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {/* Report Video Modal */}
      {reportModalVisible && selectedVideoForReport && (
        <ReportVideoModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            setSelectedVideoForReport(null);
          }}
          video={selectedVideoForReport}
          reporterId={resolvedAuth?.currentUser?.uid || ''}
        />
      )}

      {/* Video Upload Modal */}
      {selectedVideoUri && (
        <VideoUploadModal
          visible={uploadModalVisible}
          onClose={handleUploadModalClose}
          onUpload={handleVideoUpload}
          videoUri={selectedVideoUri}
          pickerFileSize={selectedVideoFileSize}
          isUploading={uploadState.loading}
          uploadProgress={uploadState.progress}
          processingStatus={uploadState.processingStatus}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  filterTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterTabText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#1976d2',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#1976d2',
    borderRadius: 24,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingMoreContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  floatingUploadButton: {
    position: 'absolute',
    bottom: 560, // Raised 10% to avoid overlapping heart icon on Android
    right: 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 20,
  },
  uploadProgress: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
  },
  uploadProgressText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
});

export default VideoFeedPage;

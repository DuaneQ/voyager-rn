/**
 * VideoFeedPage - TikTok-style vertical video feed
 * Mirrors PWA VideoFeedPage functionality with mobile optimizations
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
} from 'react-native';
import { setAudioModeAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
// Using new expo-video implementation
import { VideoCardV2 as VideoCard } from '../components/video/VideoCardV2';
import { VideoCommentsModal } from '../components/video/VideoCommentsModal';
import { VideoUploadModal } from '../components/modals/VideoUploadModal';
import { ReportVideoModal } from '../components/modals/ReportVideoModal';
import { useVideoFeed, VideoFilter } from '../hooks/video/useVideoFeed';
import { useVideoUpload } from '../hooks/video/useVideoUpload';
import { useAlert } from '../context/AlertContext';
import { shareVideo } from '../utils/videoSharing';
import { videoPlaybackManagerV2 as videoPlaybackManager } from '../services/video/VideoPlaybackManagerV2';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// Platform-safe useFocusEffect
let useFocusEffect: (callback: () => void | (() => void)) => void;
if (Platform.OS === 'web') {
  useFocusEffect = (callback) => {
    useEffect(() => {
      const cleanup = callback();
      return cleanup;
    }, []);
  };
} else {
  useFocusEffect = require('@react-navigation/native').useFocusEffect;
}

const { height } = Dimensions.get('window');

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
    goToPreviousVideo,
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
  
  // Get auth instance for user ID checks
  const resolvedAuth = typeof (require('../config/firebaseConfig') as any).getAuthInstance === 'function'
    ? (require('../config/firebaseConfig') as any).getAuthInstance()
    : (require('../config/firebaseConfig') as any).auth;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
  const [selectedVideoFileSize, setSelectedVideoFileSize] = useState<number | undefined>(undefined);
  // Web: Start muted to comply with browser autoplay policy (user can tap to unmute)
  // Native: Start with audio (TikTok/Reels behavior)
  const [isMuted, setIsMuted] = useState(Platform.OS === 'web');
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<typeof videos[0] | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedVideoForReport, setSelectedVideoForReport] = useState<typeof videos[0] | null>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true); // Track if screen is focused
  const flatListRef = useRef<FlatList>(null);
  const isScrollingRef = useRef(false); // Use ref instead of state to prevent stale closures
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastViewabilityChangeRef = useRef<number>(0); // Track last viewability change time
  // CRITICAL: Mirror currentVideoIndex in a ref so the useRef-based onViewableItemsChanged
  // callback always reads the latest value (avoids stale closure over initial value of 0)
  const currentVideoIndexRef = useRef(currentVideoIndex);
  // Keep ref in sync with state on every render
  currentVideoIndexRef.current = currentVideoIndex;

  // Stop video playback when navigating away (fixes Android audio continuing)
  useFocusEffect(
    useCallback(() => {
      // Screen is focused - allow playback
      setIsScreenFocused(true);
      
      return () => {
        // Screen is unfocused - stop playback and cleanup manager
        setIsScreenFocused(false);
        videoPlaybackManager.deactivateAll();
        
        // Cleanup scroll timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, [])
  );

  // Configure audio session for both iOS and Android
  // iOS: Enable audio even when silent switch is on (critical for physical devices)
  // Android: Proper ExoPlayer audio focus/route behavior
  useEffect(() => {
    const setupAudio = async () => {
      try {
        if (Platform.OS === 'ios') {
          // iOS: Set audio category to play even when silent switch is on
          await setAudioModeAsync({
            playsInSilentMode: true,  // 🔑 KEY FIX for iOS physical devices!
            shouldPlayInBackground: false,
            allowsRecording: false,
            interruptionMode: 'duckOthers', // Duck other audio (standard for video apps)
          });
          
        } else if (Platform.OS === 'android') {
          await setAudioModeAsync({
            shouldPlayInBackground: false,
            // Keep interruptionMode to doNotMix to avoid ducking issues
            interruptionMode: 'doNotMix',
            shouldRouteThroughEarpiece: false,
          });
          
        }
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
   * Handle scroll begin - immediately deactivate to prevent audio overlap
   */
  const handleScrollBeginDrag = useCallback(() => {
    const timestamp = Date.now();
    console.log(`[DIAG][${timestamp}][VideoFeedPage] Scroll started - calling deactivateAll()`);
    
    // Immediately deactivate current video to stop audio
    videoPlaybackManager.deactivateAll().then(() => {
      const elapsed = Date.now() - timestamp;
      console.log(`[DIAG][${Date.now()}][VideoFeedPage] deactivateAll() completed (${elapsed}ms)`);
    }).catch(err => {
      console.error(`[DIAG][${Date.now()}][VideoFeedPage] deactivateAll() error:`, err);
    });
  }, []);

  /**
   * Handle momentum scroll end
   */
  const handleMomentumScrollEnd = useCallback(() => {
    // Clear any pending timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle scroll end (for non-momentum scrolls)
   */
  const handleScrollEndDrag = useCallback(() => {
    // Just cleanup timeout, rapid change detection handles the rest
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshVideos();
    setIsRefreshing(false);
    // Scroll to top after refresh
    if (flatListRef.current && videos.length > 0) {
      flatListRef.current.scrollToIndex({ index: 0, animated: false });
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
      // Scroll to top on filter change
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
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
      // Show modal to configure upload - pass both uri and fileSize
      setSelectedVideoUri(result.uri);
      setSelectedVideoFileSize(result.fileSize);
      setUploadModalVisible(true);
    }
  }, [selectVideo]);

  /**
   * Handle video upload from modal
   */
  const handleVideoUpload = useCallback(async (videoData: any) => {
    const result = await uploadVideo(videoData);
    
    // Only close modal and refresh if upload succeeded
    if (!result) {
      // Upload failed - keep modal open, error already shown to user
      return;
    }
    
    // Success - close modal and refresh feed
    setUploadModalVisible(false);
    setSelectedVideoUri(null);
    setSelectedVideoFileSize(undefined);
    await refreshVideos();
    
    // Show success message
    showAlert('success', 'Video uploaded successfully!');
  }, [uploadVideo, refreshVideos, showAlert]);

  /**
   * Handle upload modal close
   */
  const handleUploadModalClose = useCallback(() => {
    setUploadModalVisible(false);
    setSelectedVideoUri(null);
    setSelectedVideoFileSize(undefined);
  }, []);

  /**
   * Handle viewable items changed (for tracking current video)
   * Only update if not actively scrolling to prevent premature activation
   * 
   * CRITICAL FIX: Detect rapid viewability changes as scroll events
   * If viewability changes faster than 500ms, treat it as scrolling
   */
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      const now = Date.now();
      const timeSinceLastChange = now - lastViewabilityChangeRef.current;
      const isScrolling = isScrollingRef.current;
      
      // Detect rapid changes (< 300ms) as scroll events - increase threshold
      const isRapidChange = timeSinceLastChange < 300 && lastViewabilityChangeRef.current > 0;
      
      lastViewabilityChangeRef.current = now;
      
      // CRITICAL FIX: Only block during RAPID changes, not during scroll flag
      // This allows index to update when scroll settles (even if flag hasn't cleared yet)
      // Use currentVideoIndexRef.current (not currentVideoIndex) to avoid stale closure!
      // The useRef-based callback captures the initial state value forever,
      // so comparing against the captured `currentVideoIndex` would always compare against 0,
      // making it impossible to scroll back to the first video (index 0).
      if (!isRapidChange && index !== null && index !== currentVideoIndexRef.current) {
        
        // CRITICAL for Android: Force deactivate ALL videos before activating new one
        // This prevents audio overlap during rapid scrolling
        if (Platform.OS === 'android') {
          videoPlaybackManager.deactivateAll();
        }
        
        setCurrentVideoIndex(index);
      } else {
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    // CRITICAL for Android: Higher threshold prevents activation during partial views
    itemVisiblePercentThreshold: Platform.OS === 'android' ? 95 : 80,
    // Android needs longer view time to prevent audio overlap during rapid scrolling
    minimumViewTime: Platform.OS === 'android' ? 200 : 100,
  }).current;

  /**
   * Get item layout for precise scroll positioning (critical for Android)
   */
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: height,
      offset: height * index,
      index,
    }),
    []
  );

  /**
   * Render individual video card
   */
  const renderVideoCard = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const currentUserId = resolvedAuth?.currentUser?.uid;
      const isOwnVideo = item.userId === currentUserId;

      // Web: wrap in View with scroll-snap-align for TikTok-style snapping
      const videoCard = (
        <VideoCard
          video={item}
          isActive={index === currentVideoIndex && isScreenFocused}
          isMuted={isMuted}
          onMuteToggle={setIsMuted}
          onLike={() => handleLike(item)}
          onComment={() => handleCommentPress(index)}
          onShare={() => handleShare(index)}
          onReport={!isOwnVideo ? () => handleReportPress(index) : undefined}
          onViewTracked={() => handleViewTracked(item.id)}
        />
      );

      if (Platform.OS === 'web') {
        return (
          <View style={styles.webVideoCardWrapper}>
            {videoCard}
          </View>
        );
      }

      return videoCard;
    },
    [currentVideoIndex, isScreenFocused, isMuted, handleLike, handleCommentPress, handleShare, handleReportPress, handleViewTracked, resolvedAuth]
  );

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with filters */}
      <View style={styles.header}>
        <Text style={styles.title}>Travals</Text>
        {renderFilterTabs()}
      </View>

      {/* Video feed */}
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        // REMOVED explicit height - was causing Android freeze on scroll
        // FlatList fills available space via flex:1 in container
        // CRITICAL for Android: pagingEnabled ensures ONLY one video visible
        // snapToInterval can show partial views of multiple videos
        pagingEnabled={Platform.OS !== 'web'} // pagingEnabled doesn't work well on web
        snapToInterval={Platform.OS === 'ios' ? height : undefined}
        snapToAlignment="start"
        decelerationRate="fast"
        // Enable clipped subviews to release off-screen native views (Android memory)
        removeClippedSubviews={Platform.OS === 'android'}
        // Keep a small window to reduce memory pressure
        windowSize={3} // Increased to 3 for smoother scroll (preload next)
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        // Scroll event handlers for snap behavior
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        // Viewability tracking
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        // Prevent scroll during rapid events
        scrollEventThrottle={16}
        // Web-specific: CSS scroll snap styles
        style={Platform.OS === 'web' ? styles.webFlatList : undefined}
        contentContainerStyle={Platform.OS === 'web' ? styles.webContentContainer : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
          />
        }
        onEndReached={() => {
          if (hasMoreVideos && !isLoadingMore) {
            goToNextVideo();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : null
        }
      />

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
  // Web-specific: Enable CSS scroll-snap for TikTok-style snapping
  webFlatList: {
    // @ts-ignore - Web-only CSS properties
    scrollSnapType: 'y mandatory',
    // @ts-ignore
    scrollBehavior: 'smooth',
  } as any,
  webContentContainer: {
    // No special styles needed here, individual items handle snap-align
  },
  // Web-specific: Each video card snaps to viewport
  webVideoCardWrapper: {
    height: height,
    // @ts-ignore - Web-only CSS properties
    scrollSnapAlign: 'start',
    // @ts-ignore
    scrollSnapStop: 'always',
  } as any,
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'transparent', // Transparent header for video feed
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
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingUploadButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 450 : 480, // iOS raised by ~15% (330 -> 380), Android unchanged
    right: 4, 
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000', // Black background to match video feed aesthetic
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 20, // Ensure it's above video content
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
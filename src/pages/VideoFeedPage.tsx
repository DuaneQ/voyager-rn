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
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { VideoCard } from '../components/video/VideoCard';
import { VideoCommentsModal } from '../components/video/VideoCommentsModal';
import { useVideoFeed, VideoFilter } from '../hooks/video/useVideoFeed';
import { useVideoUpload } from '../hooks/video/useVideoUpload';
import { shareVideo } from '../utils/videoSharing';

const { height } = Dimensions.get('window');

const VideoFeedPage: React.FC = () => {
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
  } = useVideoFeed();

  const { uploadState, selectVideo, uploadVideo } = useVideoUpload();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Persistent mute state across videos
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<typeof videos[0] | null>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true); // Track if screen is focused
  const flatListRef = useRef<FlatList>(null);

  // Stop video playback when navigating away (fixes Android audio continuing)
  useFocusEffect(
    useCallback(() => {
      // Screen is focused - allow playback
      setIsScreenFocused(true);
      
      return () => {
        // Screen is unfocused - stop playback
        setIsScreenFocused(false);
      };
    }, [])
  );

  // Request a sensible audio mode on Android so ExoPlayer has proper audio
  // focus/route behavior on emulator and devices. This often fixes muted or
  // silent playback cases on certain emulator system images.
  useEffect(() => {
    if (Platform.OS === 'android') {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        // Avoid referencing interruptionModeAndroid constants directly
        // (SDK differences). Keep shouldDuckAndroid false to avoid
        // silent ducking on emulator images.
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      }).catch((e) => console.warn('Audio.setAudioModeAsync failed', e));
    }
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
   * Handle comment added - refresh video data
   */
  const handleCommentAdded = useCallback(() => {
    // Refresh videos to get updated comment count
    refreshVideos();
  }, [refreshVideos]);

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
    const videoUri = await selectVideo();
    if (videoUri) {
      // Upload video with default metadata
      await uploadVideo({
        uri: videoUri,
        title: 'My Travel Video',
        description: '',
        isPublic: true,
      });
      // Refresh feed after upload
      await refreshVideos();
    }
  }, [selectVideo, uploadVideo, refreshVideos]);

  /**
   * Handle viewable items changed (for tracking current video)
   */
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== currentVideoIndex) {
        setCurrentVideoIndex(index);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  /**
   * Render individual video card
   */
  const renderVideoCard = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      return (
        <VideoCard
          video={item}
          isActive={index === currentVideoIndex && isScreenFocused}
          isMuted={isMuted}
          onMuteToggle={setIsMuted}
          onLike={() => handleLike(item)}
          onComment={() => handleCommentPress(index)}
          onShare={() => handleShare(index)}
          onViewTracked={() => handleViewTracked(item.id)}
        />
      );
    },
    [currentVideoIndex, isScreenFocused, isMuted, handleLike, handleCommentPress, handleShare, handleViewTracked]
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
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        removeClippedSubviews={false}
        windowSize={3}
        maxToRenderPerBatch={1}
        initialNumToRender={1}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
    bottom: Platform.OS === 'ios' ? 330 : 480, // Android needs higher position (less bottom space)
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
/**
 * VideoCardV2 Component - Modern Implementation
 * 
 * Uses expo-video through abstraction layer (IVideoPlayer interface).
 * Follows Single Responsibility Principle - only handles UI and user interaction.
 * Business logic delegated to VideoPlayerFactory and VideoPlaybackManagerV2.
 * 
 * IMPORTANT: This is the new implementation for expo-video migration.
 * The old VideoCard.tsx remains for backward compatibility during transition.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Video as VideoType } from '../../types/Video';
import * as firebaseConfig from '../../config/firebaseConfig';
import { IVideoPlayer } from '../../interfaces/IVideoPlayer';
import { videoPlayerFactory } from '../../services/video/VideoPlayerFactory';
import { videoPlaybackManagerV2 } from '../../services/video/VideoPlaybackManagerV2';
import { ExpoVideoPlayer } from '../../services/video/ExpoVideoPlayer';

const { width, height } = Dimensions.get('window');

interface VideoCardV2Props {
  video: VideoType;
  isActive: boolean; // Whether this video is currently in view
  isMuted: boolean; // Controlled mute state from parent
  onMuteToggle: (muted: boolean) => void; // Callback to update parent mute state
  onLike: () => void;
  onComment?: () => void;
  onShare: () => void;
  onReport?: () => void; // Report video for content moderation
  onViewTracked?: () => void;
}

const VideoCardV2Component: React.FC<VideoCardV2Props> = ({
  video,
  isActive,
  isMuted,
  onMuteToggle,
  onLike,
  onComment,
  onShare,
  onReport,
  onViewTracked,
}) => {
  // Player state
  const [player, setPlayer] = useState<IVideoPlayer | null>(null);
  const [expoPlayer, setExpoPlayer] = useState<any>(null); // For VideoView
  const expoPlayerRef = useRef<any>(null); // Immediate ref for Android RecyclerListView
  const [userPaused, setUserPaused] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Specific error message
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  // Web-specific: track if autoplay was blocked by browser policy
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  
  // Refs
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);
  
  // Get Firebase auth
  const resolvedAuth = typeof (firebaseConfig as any).getAuthInstance === 'function'
    ? (firebaseConfig as any).getAuthInstance()
    : (firebaseConfig as any).auth;
  const userId = resolvedAuth?.currentUser?.uid;
  
  // Video metadata
  const isLiked = video.likes?.includes(userId || '');
  const likeCount = video.likes?.length || 0;
  const commentCount = video.comments?.length || 0;
  const viewCount = video.viewCount || 0;

  /**
   * Initialize player on mount
   */
  useEffect(() => {
    // debug logs removed
    
    // Prefer Mux HLS URL when available (universal codec compatibility)
    // Falls back to original Firebase URL if Mux hasn't processed yet
    const playbackUrl = video.muxPlaybackUrl || video.videoUrl;
    const isMuxUrl = !!video.muxPlaybackUrl;
    
    // debug logs removed
    
    // Log video specs to help diagnose playback issues (HTTP 416, black screens, etc.)
    const fileSizeMB = video.fileSize ? (video.fileSize / (1024 * 1024)).toFixed(2) : 'unknown';
    const durationSec = video.duration || 'unknown';
    // video specs available; debug logs removed
    
    // All videos now use Mux HLS adaptive streaming - no size limits needed
    // HLS handles large files automatically via chunking
    
    let playerInstance: IVideoPlayer | null = null;
    
    try {
      // Create player using factory (Dependency Inversion Principle)
      // Use Mux HLS URL when available for universal codec compatibility
      playerInstance = videoPlayerFactory.createPlayer({
        videoUrl: playbackUrl, // Use Mux URL if available, otherwise original
        loop: true,
        muted: isMuted,
        autoPlay: false, // Don't auto-play, wait for isActive
      });
      
      setPlayer(playerInstance);
      
      // Get underlying expo-video player for VideoView
      if (playerInstance instanceof ExpoVideoPlayer) {
        // debug log removed
        const player = playerInstance.getPlayer();
        
        // Set ref immediately (synchronous) - critical for Android RecyclerListView
        expoPlayerRef.current = player;
        // debug log removed
        
        // Also set state for React updates
        if (!isUnmountedRef.current) {
          // debug log removed
          setExpoPlayer(player);
        } else {
          console.warn(`[VideoCardV2][${Platform.OS}] Component unmounted before player state set: ${video.id}`);
        }
      }
      
      // Listen for status changes
      const unsubscribe = playerInstance.addStatusListener((status) => {
        if (isUnmountedRef.current) {
          // Ignore updates after unmount
          return;
        }

        setIsPlaying(status.isPlaying);

        // Handle browser autoplay policy block (web only)
        if (status.autoplayBlocked) {
          setAutoplayBlocked(true);
        }

        if (status.error) {
          console.error(`[VideoCardV2][${Platform.OS}] Player error for ${video.id}:`, status.error);
          setError(true);
          // Store specific error message for better user feedback
          if (status.error.includes('not supported') || status.error.includes('MediaCodec')) {
            setErrorMessage('This video format is not compatible with your device');
          } else {
            setErrorMessage(status.error);
          }
        }
      });

      statusUnsubscribeRef.current = unsubscribe;
      
      // Register with playback manager
      // CRITICAL: Set expectedVideoId to handle FlatList component recycling
      // When FlatList recycles a component, the player instance might have old video loaded
      videoPlaybackManagerV2.register({
        videoId: video.id,
        player: playerInstance,
        expectedVideoId: video.id, // Track which video this player should have loaded
        onBecomeActive: () => {
          setUserPaused(false);
        },
        onBecomeInactive: () => {},
      });
      
      // player initialized; debug log removed
    } catch (err) {
      console.error(`[VideoCardV2][${Platform.OS}] Error initializing player for ${video.id}:`, err);
      setError(true);
    }
    
    // Cleanup on unmount
    return () => {
      isUnmountedRef.current = true;
      // debug log removed
      
      // Unsubscribe from status updates first
      if (statusUnsubscribeRef.current) {
        try {
          // debug log removed
          statusUnsubscribeRef.current();
          statusUnsubscribeRef.current = null;
        } catch (err) {
          console.error(`[VideoCardV2][${Platform.OS}] Error unsubscribing for ${video.id}:`, err);
        }
      }
      
      // Unregister from playback manager
      try {
          // debug log removed
        videoPlaybackManagerV2.unregister(video.id);
      } catch (err) {
        console.error(`[VideoCardV2][${Platform.OS}] Error unregistering for ${video.id}:`, err);
      }
      
      // Release player resources - do this last
      if (playerInstance) {
        playerInstance.release().catch((err) => {
          console.error(`[VideoCardV2][${Platform.OS}] Error releasing player for ${video.id}:`, err);
        });
      }
      
      // Clear view timer
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
      
      // Clear expo player ref
      expoPlayerRef.current = null;
    };
  }, [video.id, video.videoUrl]); // Recreate if video changes

  /**
   * Handle isActive changes - request activation/deactivation
   */
  useEffect(() => {
    if (!player) {
      // No player yet for ${video.id}, skipping playback management
      return;
    }
    
    const timestamp = Date.now();    
    const managePlayback = async () => {
      if (isActive && !userPaused) {
        // Request activation through manager (ensures only one plays)
        await videoPlaybackManagerV2.setActiveVideo(video.id);
      } else {
        // Video scrolled away or user paused
        try {
          await player.pause();
        } catch (err) {
          console.error(`[VideoCardV2][${Platform.OS}] Error pausing ${video.id}:`, err);
        }
      }
    };
    
    managePlayback();
  }, [isActive, userPaused, player, video.id]);

  /**
   * Handle mute state changes AND apply mute when video becomes active
   * CRITICAL: We must apply mute state when isActive changes because:
   * 1. The playback manager mutes videos when they're deactivated
   * 2. When a new video becomes active, the parent's isMuted state hasn't changed
   * 3. So the useEffect dependency on isMuted alone won't trigger
   * 4. This causes audio to not play even though UI shows unmuted
   */
  useEffect(() => {
    if (!player) return;
    
    // Always apply mute state when player exists, isActive changes, or isMuted changes
    // apply mute state; debug log removed
    player.setMuted(isMuted).catch((err) => {
      console.error(`[VideoCardV2] Error setting mute for ${video.id}:`, err);
    });
  }, [isMuted, player, video.id, isActive]); // Added isActive as dependency

  /**
   * Track view after 3 seconds of playing
   */
  useEffect(() => {
    if (isPlaying && !hasTrackedView && onViewTracked) {
      // Start 3-second timer
      viewTimerRef.current = setTimeout(() => {
        if (!isUnmountedRef.current && isPlaying) {
          onViewTracked();
          setHasTrackedView(true);
        }
      }, 3000);
    } else if (!isPlaying && viewTimerRef.current) {
      // Clear timer if stopped playing
      clearTimeout(viewTimerRef.current);
      viewTimerRef.current = null;
    }

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };
  }, [isPlaying, hasTrackedView, onViewTracked]);

  /**
   * Toggle play/pause
   * Also handles the case where autoplay was blocked by browser policy
   */
  const handlePlayPause = useCallback(async () => {
    if (!player) return;
    
    try {
      // If autoplay was blocked, user tapping means they want to play
      // This tap counts as "user interaction" for browser autoplay policy
      if (autoplayBlocked) {
        setAutoplayBlocked(false);
        setUserPaused(false);
        // Activate through manager (user interaction satisfies browser autoplay policy)
        await videoPlaybackManagerV2.setActiveVideo(video.id);
        return;
      }
      
      if (userPaused) {
        // Resume playback
        setUserPaused(false);
        // Re-activate through manager to ensure this video plays
        await videoPlaybackManagerV2.setActiveVideo(video.id);
      } else {
        // Manual pause
        setUserPaused(true);
        await player.pause();
      }
    } catch (err) {
      console.error(`[VideoCardV2] Error toggling playback for ${video.id}:`, err);
    }
  }, [player, userPaused, autoplayBlocked, video.id]);

  /**
   * Toggle mute/unmute
   */
  const handleMuteToggle = useCallback(() => {
    onMuteToggle(!isMuted);
  }, [isMuted, onMuteToggle]);

  /**
   * Handle like with authentication check
   */
  const handleLike = useCallback(() => {
    if (!userId) {
      Alert.alert('Sign In Required', 'Please sign in to like videos');
      return;
    }
    onLike();
  }, [userId, onLike]);

  /**
   * Handle comment with authentication check
   */
  const handleComment = useCallback(() => {
    if (!userId) {
      Alert.alert('Sign In Required', 'Please sign in to comment');
      return;
    }
    onComment?.();
  }, [userId, onComment]);

  /**
   * Render video info overlay
   */
  const renderVideoInfo = () => (
    <View style={styles.infoOverlay}>
      <Text style={styles.title} numberOfLines={2}>
        {video.title}
      </Text>
      <View style={styles.statsRow}>
        <Text style={styles.statText}>{viewCount} views</Text>
      </View>
    </View>
  );

  /**
   * Render action buttons
   */
  const renderActionButtons = () => (
    <View style={styles.actionsContainer}>
      {/* Like button */}
      <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={32}
          color={isLiked ? '#ff0050' : '#fff'}
        />
        {likeCount > 0 && (
          <Text style={styles.actionText}>{likeCount}</Text>
        )}
      </TouchableOpacity>

      {/* Comment button */}
      {onComment && (
        <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={32} color="#fff" />
          {commentCount > 0 && (
            <Text style={styles.actionText}>{commentCount}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Share button */}
      <TouchableOpacity onPress={onShare} style={styles.actionButton}>
        <Ionicons name="share-social-outline" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Report button (only for other users' videos) */}
      {onReport && (
        <TouchableOpacity onPress={onReport} style={styles.actionButton}>
          <Ionicons name="flag-outline" size={32} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );

  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#fff" />
          <Text style={styles.errorText}>Video Unavailable</Text>
          <Text style={styles.errorSubtext}>
            {errorMessage || 'This video may have been removed or is temporarily unavailable'}
          </Text>
          {Platform.OS === 'android' && (
            <Text style={[styles.errorSubtext, { fontSize: 10, marginTop: 8, opacity: 0.5 }]}>
              {video.id}
            </Text>
          )}
        </View>
      </View>
    );
  }

  /**
   * Render loading state while player initializes
   */
  if (!expoPlayer) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="video-card-container">
      {/* Video player */}
      {/* Video player */}
      <View style={styles.videoContainer}>
        {!expoPlayerRef.current ? (
          // Loading state - show until player is ready (use ref for immediate check)
          <View style={[styles.video, styles.loadingContainer]}>
            <Text style={styles.loadingText}>Loading...</Text>
            {Platform.OS === 'android' && (
              <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8 }]}>
                {video.id}
              </Text>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handlePlayPause}
          >
            <VideoView
              player={expoPlayerRef.current}
              style={styles.video}
              contentFit="contain"
              nativeControls={false}
              // CRITICAL for Android: Use textureView to fix rendering issues in lists
              // surfaceView (default) causes problems with overlapping videos in RecyclerListView
              // See: https://docs.expo.dev/versions/latest/sdk/video/#surfacetype
              surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
              onFirstFrameRender={() => {}}
            />

            {/* Play overlay - show when user paused OR autoplay blocked by browser */}
            {(userPaused || autoplayBlocked) && (
              <View style={styles.playOverlay}>
                <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.9)" />
                {autoplayBlocked && Platform.OS === 'web' && (
                  <Text style={styles.tapToPlayText}>Tap to play</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Video info overlay */}
      <View testID="info-overlay" style={[styles.infoOverlayWrapper, { pointerEvents: 'box-none' }]}>
        {renderVideoInfo()}
      </View>

      {/* Action buttons */}
      {renderActionButtons()}
      
      {/* Mute button */}
      <View style={[styles.muteButtonWrapper, { pointerEvents: 'box-none' }]}>
        <TouchableOpacity onPress={handleMuteToggle} style={styles.muteButton}>
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tapToPlayText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  muteButtonWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 50,
    pointerEvents: 'box-none' as any,
  },
  muteButton: {
    position: 'absolute',
    top: Platform.select({ 
      ios: 60, 
      android: 200,
      web: 120,
    }), 
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    elevation: 10,
  },
  infoOverlayWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 140,
    left: 16,
    right: 80,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    padding: 12,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionsContainer: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    alignItems: 'center',
    zIndex: 30,
    elevation: 15,
    pointerEvents: 'box-none',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.7,
  },
});

// Memoize to avoid unnecessary re-renders in large FlatList
const VideoCardV2 = React.memo(VideoCardV2Component);
VideoCardV2.displayName = 'VideoCardV2';

export { VideoCardV2 };

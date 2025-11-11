/**
 * VideoCard Component
 * Displays a single video with player, overlay info, and interaction buttons
 * Optimized for mobile vertical feed (TikTok-style)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Video as VideoType } from '../../types/Video';
import * as firebaseConfig from '../../config/firebaseConfig';

const { width, height } = Dimensions.get('window');

interface VideoCardProps {
  video: VideoType;
  isActive: boolean; // Whether this video is currently in view
  isMuted: boolean; // Controlled mute state from parent
  onMuteToggle: (muted: boolean) => void; // Callback to update parent mute state
  onLike: () => void;
  onComment?: () => void;
  onShare: () => void;
  onViewTracked?: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isActive,
  isMuted,
  onMuteToggle,
  onLike,
  onComment,
  onShare,
  onViewTracked,
}) => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  const resolvedAuth = typeof (firebaseConfig as any).getAuthInstance === 'function'
    ? (firebaseConfig as any).getAuthInstance()
    : (firebaseConfig as any).auth;
  const userId = resolvedAuth?.currentUser?.uid;
  const isLiked = video.likes?.includes(userId || '');
  const likeCount = video.likes?.length || 0;
  const commentCount = video.comments?.length || 0;
  const viewCount = video.viewCount || 0;

  /**
   * Control playback based on isActive
   */
  useEffect(() => {
    const managePlayback = async () => {
      if (!videoRef.current || isUnmountedRef.current) return;

      try {
        if (isActive) {
          // First stop any existing playback
          await videoRef.current.stopAsync().catch(() => {});
          // Reset position
          await videoRef.current.setPositionAsync(0).catch(() => {});
          // Ensure mute state is correct before playing. Try to set it, but
          // don't aggressively unload the native player if the underlying
          // view has been recycled by the platform (emulator quirk on Android).
          try {
            await videoRef.current.setIsMutedAsync(isMuted);
          } catch (muteErr) {
            const muteMessage = muteErr?.message || String(muteErr);
            if (muteMessage.includes('Invalid view returned from registry')) {
              // Don't unload here — a mute toggle shouldn't destroy the player.
              // Log and continue to attempt to play; if the player is truly
              // invalid, subsequent calls will noop safely.
              console.warn('setIsMutedAsync failed due to recycled native view (ignored).');
            } else {
              // Other errors should still be surfaced to the outer handler
              throw muteErr;
            }
          }
          // Play when active
          await videoRef.current.playAsync();
          setIsPlaying(true);
        } else {
          // Aggressively stop audio when inactive
          // Mute first to prevent any audio leakage
          await videoRef.current.setIsMutedAsync(true);
          // Stop playback
          await videoRef.current.stopAsync();
          // Reset position
          await videoRef.current.setPositionAsync(0);
          setIsPlaying(false);
        }
      } catch (err) {
        // Some emulator / native errors (for example: "Invalid view returned from registry")
        // may be thrown when the native view backed by the Video ref has been recycled
        // by the platform. Treat these as recoverable on emulator (no-redbox) and
        // attempt a safe cleanup to prevent the app showing a red error screen.
        const message = err?.message || String(err);
        if (message.includes('Invalid view returned from registry')) {
          // The native view backing the player was recycled by the platform
          // (common on Android emulator when views are aggressively recycled).
          // Don't forcefully unload the player on this error — unloading can
          // make mute/unmute toggles irrecoverable. Instead log a warning and
          // mark playback as stopped so the UI stays consistent.
          console.warn('Video playback native view recycled - skipping aggressive cleanup.');
          setIsPlaying(false);
        } else if (!isUnmountedRef.current) {
          console.error('Error managing video playback:', err);
        }
      }
    };

    managePlayback();
  }, [isActive, isMuted]);

  /**
   * Track view after 3 seconds of play
   */
  useEffect(() => {
    if (isPlaying && !hasTrackedView && onViewTracked) {
      viewTimerRef.current = setTimeout(() => {
        onViewTracked();
        setHasTrackedView(true);
      }, 3000); // Track after 3 seconds
    } else if (!isPlaying && viewTimerRef.current) {
      // Clear timer if video stops playing before 3 seconds
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
   * Cleanup on unmount and when becoming inactive
   */
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      // Cleanup when component unmounts or becomes inactive
      if (videoRef.current) {
        videoRef.current.stopAsync().catch(() => {
          // Ignore errors
        });
        videoRef.current.setPositionAsync(0).catch(() => {
          // Ignore errors
        });
        videoRef.current.setIsMutedAsync(true).catch(() => {
          // Mute to prevent any audio leakage
        });
        videoRef.current.unloadAsync().catch(() => {
          // Ignore errors on cleanup
        });
      }
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, []);

  /**
   * Handle video status changes
   */
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      if (status.didJustFinish) {
        // Loop video
        videoRef.current?.replayAsync();
      }
    }
  };

  /**
   * Toggle play/pause
   */
  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  };

  /**
   * Toggle mute/unmute
   */
  const handleMuteToggle = async () => {
    // Update parent-controlled mute state first. Rely on the controlled
    // `isMuted` prop on the <Video /> to apply the change. Avoid calling
    // instance methods directly here because the native view may be
    // recycled (especially on Android emulator) which can cause errors.
    const newMutedState = !isMuted;
    try {
      onMuteToggle(newMutedState);
      // Best-effort: if the ref is valid, attempt to set mute asynchronously
      // but don't fail if it errors (prevents redbox on emulator).
      if (videoRef.current) {
        videoRef.current.setIsMutedAsync(newMutedState).catch((e) => {
          // Ignore failures; the Video component will receive the new prop
          // and should apply it when possible.
          const m = e?.message || String(e);
          if (!m.includes('Invalid view returned from registry')) {
            console.warn('setIsMutedAsync failed while toggling mute:', e);
          }
        });
      }
    } catch (err) {
      console.error('Error toggling mute:', err);
    }
  };

  /**
   * Handle like with authentication check
   */
  const handleLike = () => {
    if (!userId) {
      Alert.alert('Login Required', 'Please log in to like videos.');
      return;
    }
    onLike();
  };

  /**
   * Handle comment with authentication check
   */
  const handleComment = () => {
    if (!userId) {
      Alert.alert('Login Required', 'Please log in to comment on videos.');
      return;
    }
    onComment?.();
  };

  /**
   * Handle video load error
   */
  const handleError = () => {
    setError(true);
    setIsLoading(false);
    console.error('Video failed to load:', video.videoUrl);
  };

  /**
   * Render video info overlay
   */
  const renderVideoInfo = () => (
    <View style={styles.infoOverlay}>
      {video.title && <Text style={styles.title}>{video.title}</Text>}
      {video.description && (
        <Text style={styles.description} numberOfLines={2}>
          {video.description}
        </Text>
      )}
      <View style={styles.statsRow}>
        <Text style={styles.statText}>👁️ {viewCount.toLocaleString()}</Text>
      </View>
    </View>
  );

  /**
   * Render action buttons (like, comment, share)
   */
  const renderActionButtons = () => (
    <View style={styles.actionsContainer}>
      {/* Like button */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleLike}
        testID="like-button"
        accessibilityLabel={`Like video. ${likeCount} likes`}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={32}
          color={isLiked ? '#ff4458' : '#fff'}
        />
        <Text style={styles.actionText}>{likeCount}</Text>
      </TouchableOpacity>

      {/* Comment button */}
      {onComment && (
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleComment}
          testID="comment-button"
          accessibilityLabel={`Comment on video. ${commentCount} comments`}
        >
          <Ionicons name="chatbubble-outline" size={32} color="#fff" />
          <Text style={styles.actionText}>{commentCount}</Text>
        </TouchableOpacity>
      )}

      {/* Share button */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={onShare}
        testID="share-button"
        accessibilityLabel="Share video"
      >
        <Ionicons name="share-outline" size={32} color="#fff" />
        <Text style={styles.actionText}>Share</Text>
      </TouchableOpacity>
    </View>
  );

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#fff" />
          <Text style={styles.errorText}>Failed to load video</Text>
          <Text style={styles.errorSubtext}>Please try again later</Text>
        </View>
        {renderVideoInfo()}
        {renderActionButtons()}
      </View>
    );
  }

  return (
    <View style={styles.container} testID="video-card-container">
      {/* Video Player */}
      {/* Video container - wrap in View with pointerEvents to allow mute button touches on Android */}
      <View style={styles.videoContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handlePlayPause}
        >
          <Video
            ref={videoRef}
            source={{ uri: video.videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isActive}
            isLooping
            isMuted={isMuted}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={handleError}
            usePoster
            posterSource={{ uri: video.thumbnailUrl || '' }}
          />

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}

          {/* Play/Pause overlay */}
          {!isPlaying && !isLoading && (
            <View style={styles.playOverlay}>
              <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.9)" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Mute button - moved outside videoContainer to prevent touch blocking on Android */}
      <TouchableOpacity 
        style={styles.muteButton} 
        onPress={handleMuteToggle}
        testID="mute-button"
        accessibilityLabel={isMuted ? 'Unmute video' : 'Mute video'}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Video info overlay */}
      <View testID="info-overlay" style={styles.infoOverlayWrapper} pointerEvents="box-none">
        {renderVideoInfo()}
      </View>

      {/* Action buttons */}
      {renderActionButtons()}
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
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  muteButton: {
    position: 'absolute',
    top: Platform.select({ ios: 60, android: 200 }), // Lower on Android to avoid tab bar overlap
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 20, // Higher zIndex to ensure it appears above video and is touchable
    elevation: 10, // Increased Android elevation for proper touch handling (was 5, now 10)
  },
  infoOverlayWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10, // Ensure wrapper has proper stacking
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 140, // Raised from 100 to sit above transparent tab bar (tab bar ~60px + padding)
    left: 16,
    right: 80,
    backgroundColor: 'rgba(0,0,0,0.4)', // Add semi-transparent background for better readability
    borderRadius: 8,
    padding: 12,
    zIndex: 10, // Ensure info overlay appears above video
  },
  title: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#fff',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    bottom: 140, // Raised from 100 to sit above transparent tab bar
    alignItems: 'center',
    zIndex: 10, // Ensure actions appear above video
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
  },
});

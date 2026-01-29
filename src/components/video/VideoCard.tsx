/**
 * VideoCard Component
 * Displays a single video with player, overlay info, and interaction buttons
 * Optimized for mobile vertical feed (TikTok-style)
 * 
 * PLATFORM NOTES:
 * - Web: Uses native HTML5 <video> element (no expo-av)
 * - Android: Uses AndroidVideoPlayerRNV (react-native-video with expo-av fallback)
 * - iOS: Uses expo-av Video component
 * 
 * IMPORTANT: expo-av is NOT imported on web to avoid iOS Safari crash
 * caused by the deprecation warning infinite loop bug.
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
import { Ionicons } from '@expo/vector-icons';
import { Video as VideoType } from '../../types/Video';
import * as firebaseConfig from '../../config/firebaseConfig';
import { videoPlaybackManager } from '../../services/video/VideoPlaybackManager';
import { AndroidVideoPlayerRNV } from './AndroidVideoPlayerRNV';

// Import via adapter (provides web stub automatically)
import { Video, ResizeMode, AVPlaybackStatus } from '../../adapters/expo-av';

const { width, height } = Dimensions.get('window');

interface VideoCardProps {
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

const VideoCardComponent: React.FC<VideoCardProps> = ({
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
  // Video ref - typed as 'any' because expo-av is conditionally loaded
  const videoRef = useRef<any>(null);
  const webVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // Track if user manually paused (vs auto-pause during scroll)
  // Play button should ONLY show when user pauses, not on initial load
  const [userPaused, setUserPaused] = useState(false);
  const [error, setError] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const isUnloadedRef = useRef(false);

  // Handler for when video loads (used by AndroidVideoPlayerRNV)
  const handleVideoLoad = () => {
    // Video loaded successfully
  };
  const resolvedAuth = typeof (firebaseConfig as any).getAuthInstance === 'function'
    ? (firebaseConfig as any).getAuthInstance()
    : (firebaseConfig as any).auth;
  const userId = resolvedAuth?.currentUser?.uid;
  const isLiked = video.likes?.includes(userId || '');
  const likeCount = video.likes?.length || 0;
  const commentCount = video.comments?.length || 0;
  const viewCount = video.viewCount || 0;

  /**
   * Register with VideoPlaybackManager on mount, unregister on unmount.
   */
  useEffect(() => {
    const handleBecomeActive = async () => {
      const ref = videoRef.current;
      if (!ref || isUnmountedRef.current) return;
      
      // Reset user pause state when video becomes active
      setUserPaused(false);
      
      try {
        // If the player was previously unloaded, reload it first (critical for Android scroll-back)
        if (isUnloadedRef.current) {
          try {
            await ref.loadAsync({ uri: video.videoUrl }, {}, false);
            isUnloadedRef.current = false;
          } catch (loadErr) {
            console.error(`[VideoCard] Error reloading video ${video.id}:`, loadErr);
            return; // Don't attempt playback if reload failed
          }
        } else {
          // Player is loaded, stop any existing playback and reset position
          await ref.stopAsync().catch(() => {});
          await ref.setPositionAsync(0).catch(() => {});
        }
        
        // Set mute state
        try {
          await ref.setIsMutedAsync(isMuted);
        } catch (muteErr) {
          const muteMessage = muteErr?.message || String(muteErr);
          if (!muteMessage.includes('Invalid view returned from registry')) {
            throw muteErr;
          }
          console.warn('[VideoCard] setIsMutedAsync failed due to recycled view (ignored)');
        }
        
        // Play
        await ref.playAsync();
        setIsPlaying(true);
      } catch (err) {
        const message = err?.message || String(err);
        if (!message.includes('Invalid view returned from registry') && !isUnmountedRef.current) {
          console.error('[VideoCard] Error in onBecomeActive:', err);
        }
      }
    };
    
    const handleBecomeInactive = async () => {
      const ref = videoRef.current;
      if (!ref || isUnmountedRef.current) return;
      
      try {
        // 1. Mute IMMEDIATELY to prevent audio leakage
        await ref.setIsMutedAsync(true);
        // 2. Pause (faster response than stop)
        await ref.pauseAsync();
        // 3. Stop playback
        await ref.stopAsync();
        // 4. Reset position
        await ref.setPositionAsync(0);
        setIsPlaying(false);
        
        // CRITICAL FIX: Unload on BOTH iOS and Android to prevent audio leakage
        // iOS audio sessions persist even after stop/pause, causing audio to continue
        // playing when scrolling or navigating away from the feed
        try {
          await ref.unloadAsync();
          isUnloadedRef.current = true;
        } catch (unloadErr) {
          console.warn('[VideoCard] unloadAsync failed (ignored):', unloadErr);
        }
      } catch (err) {
        const message = err?.message || String(err);
        if (!message.includes('Invalid view returned from registry') && !isUnmountedRef.current) {
          console.error('[VideoCard] Error in onBecomeInactive:', err);
        }
      }
    };
    
    // Register with playback manager
    videoPlaybackManager.register({
      videoId: video.id,
      ref: videoRef.current,
      onBecomeActive: handleBecomeActive,
      onBecomeInactive: handleBecomeInactive,
    });
    
    return () => {
      // Unregister on unmount
      videoPlaybackManager.unregister(video.id);
    };
  }, [video.id, video.videoUrl]); // Dependencies: video.id and videoUrl
  
  /**
   * Request activation when isActive changes.
   * CRITICAL: No delay - let VideoPlaybackManager handle timing to prevent audio overlap
   */
  useEffect(() => {
    const managePlayback = async () => {
      if (!videoRef.current || isUnmountedRef.current) return;

      // Request activation/deactivation via manager
      // CRITICAL: No setTimeout - immediate activation prevents audio overlap
      // VideoPlaybackManager already has 50ms wait built-in to ensure clean deactivation
      if (isActive) {
        videoPlaybackManager.setActiveVideo(video.id);
      }
      // Note: deactivation happens automatically when another video becomes active
    };

    managePlayback();
  }, [isActive, video.id]);
  
  /**
   * On Android, derive isPlaying from isActive and userPaused.
   * AndroidVideoPlayerRNV auto-plays based on isActive prop, bypassing videoRef,
   * so we must sync isPlaying state here to ensure view tracking works.
   */
  useEffect(() => {
    if (Platform.OS === 'android') {
      setIsPlaying(isActive && !userPaused);
    }
  }, [isActive, userPaused]);

  /**
   * Web: Control video playback when isActive changes
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const webVideo = webVideoRef.current;
    if (!webVideo) return;
    
    if (isActive && !userPaused) {
      webVideo.play().catch((err) => {
        // Autoplay may be blocked by browser
        console.warn('[VideoCard] Web autoplay blocked:', err);
      });
      setIsPlaying(true);
    } else {
      webVideo.pause();
      setIsPlaying(false);
    }
  }, [isActive, userPaused]);

  /**
   * Web: Update mute state when isMuted prop changes
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const webVideo = webVideoRef.current;
    if (webVideo) {
      webVideo.muted = isMuted;
    }
  }, [isMuted]);

  /**
   * Update mute state when isMuted prop changes.
   */
  useEffect(() => {
    const updateMuteState = async () => {
      const ref = videoRef.current;
      if (!ref || !isPlaying) return;
      
      try {
        await ref.setIsMutedAsync(isMuted);
      } catch (err) {
        const m = err?.message || String(err);
        if (!m.includes('Invalid view returned from registry')) {
          console.warn('[VideoCard] setIsMutedAsync failed:', err);
        }
      }
    };
    
    updateMuteState();
  }, [isMuted, isPlaying]);

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
      const ref = videoRef.current;
      if (ref) {
        ref.stopAsync().catch(() => {
          // Ignore errors
        });
        ref.setPositionAsync(0).catch(() => {
          // Ignore errors
        });
        ref.setIsMutedAsync(true).catch(() => {
          // Mute to prevent any audio leakage
        });
        // Attempt to unload to free native resources
        ref.unloadAsync().catch(() => {
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
      // REMOVED setIsLoading(false) - eliminates play button flash
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
    // Web: Uses native video element
    if (Platform.OS === 'web') {
      const webVideo = webVideoRef.current;
      if (!webVideo) return;
      
      try {
        if (webVideo.paused) {
          await webVideo.play();
          setIsPlaying(true);
          setUserPaused(false);
        } else {
          webVideo.pause();
          setIsPlaying(false);
          setUserPaused(true);
        }
      } catch (err) {
        console.error('[VideoCard] Web play/pause error:', err);
      }
      return;
    }

    // Android: Uses isPaused prop - just toggle userPaused state
    if (Platform.OS === 'android') {
      const newPausedState = !userPaused;
      setUserPaused(newPausedState);
      setIsPlaying(!newPausedState);
      return;
    }

    // iOS: Uses expo-av ref directly
    const ref = videoRef.current;
    if (!ref) return;

    try {
      if (isPlaying) {
        await ref.pauseAsync();
        setIsPlaying(false);
        setUserPaused(true); // User manually paused
      } else {
        await ref.playAsync();
        setIsPlaying(true);
        setUserPaused(false); // User resumed
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  };

  /**
   * Toggle mute/unmute
   */
  const handleMuteToggle = async () => {
    console.log('[VideoCard] handleMuteToggle called');
    console.log('[VideoCard] Video ID:', video.id);
    console.log('[VideoCard] Current isMuted:', isMuted);
    console.log('[VideoCard] Platform:', Platform.OS);
    
    const newMutedState = !isMuted;
    console.log('[VideoCard] New muted state:', newMutedState);
    
    try {
      // Call parent callback to update global mute state
      onMuteToggle(newMutedState);
      console.log('[VideoCard] onMuteToggle callback called');
      
      // Platform-specific muting
      if (Platform.OS === 'web') {
        // For web: directly set muted property on HTML5 video element
        const webVideo = webVideoRef.current;
        if (webVideo) {
          webVideo.muted = newMutedState;
          console.log('[VideoCard] Web video muted property set to:', newMutedState);
        } else {
          console.warn('[VideoCard] Web video ref is null');
        }
      } else {
        // For mobile: use expo-av API
        const ref = videoRef.current;
        if (ref) {
          ref.setIsMutedAsync(newMutedState).catch((e) => {
            const m = e?.message || String(e);
            if (!m.includes('Invalid view returned from registry')) {
              console.warn('[VideoCard] setIsMutedAsync failed while toggling mute:', e);
            }
          });
        }
      }
    } catch (err) {
      console.error('[VideoCard] Error toggling mute:', err);
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
    // REMOVED setIsLoading(false)
    console.error('Video failed to load:', video.videoUrl);
  };

  /**
   * Render video info overlay
   */
  const renderVideoInfo = () => (
    <View style={styles.infoOverlay}>
      {video.title && <Text style={styles.title}>{video.title}</Text>}
      {video.description && <Text style={styles.description} numberOfLines={2}>{video.description}</Text>}
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

      {/* Report button - only show for other users' videos */}
      {onReport && (
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={onReport}
          testID="report-button"
          accessibilityLabel="Report video"
        >
          <Ionicons name="flag-outline" size={32} color="#fff" />
          <Text style={styles.actionText}>Report</Text>
        </TouchableOpacity>
      )}
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
          {Platform.OS === 'web' ? (
            <video
              ref={webVideoRef as any}
              src={video.videoUrl}
              poster={video.thumbnailUrl || ''}
              loop
              playsInline
              muted={isMuted}
              autoPlay={isActive && !userPaused}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#000',
              }}
              onError={() => {
                console.error('[VideoCard] Web video error:', video.id);
                setError(true);
              }}
            />
          ) : Platform.OS === 'android' ? (
            <AndroidVideoPlayerRNV
              video={video}
              isActive={isActive}
              isMuted={isMuted}
              isPaused={userPaused}
              onLoad={handleVideoLoad}
              onError={handleError}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            />
          ) : (
            <Video
              ref={videoRef}
              source={{ uri: video.videoUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              isLooping
              isMuted={isMuted}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onError={handleError}
              usePoster
              posterSource={{ uri: video.thumbnailUrl || '' }}
            />
          )}

          {/* REMOVED loading indicator - causes play button flash during scroll */}

          {/* Play/Pause overlay - ONLY show when user manually paused (like TikTok/Instagram) */}
          {userPaused && (
            <View style={styles.playOverlay}>
              <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.9)" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Video info overlay */}
      <View testID="info-overlay" style={styles.infoOverlayWrapper} pointerEvents="box-none">
        {renderVideoInfo()}
      </View>

      {/* Action buttons */}
      {renderActionButtons()}
      
      {/* Mute button wrapper - same pattern as action buttons to allow touches on web */}
      <View pointerEvents="box-none" style={styles.muteButtonWrapper}>
        <TouchableOpacity 
          style={styles.muteButton}
          onPress={() => {
            console.log('[VideoCard] Mute button PRESSED - Video ID:', video.id);
            handleMuteToggle();
          }}
          testID="mute-button"
          accessibilityLabel={isMuted ? 'Unmute video' : 'Mute video'}
          activeOpacity={0.7}
        >
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
  // REMOVED loadingContainer - no longer showing loading state
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  muteButtonWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50, // Highest z-index to ensure wrapper and button are on top
    pointerEvents: 'box-none' as any, // Pass through touches except to children
  },
  muteButton: {
    position: 'absolute',
    top: Platform.select({ 
      ios: 60, 
      android: 200, // Lower on Android to avoid tab bar overlap
      web: 60, // Match iOS - keep it at top to avoid covering heart icon
    }), 
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    elevation: 10, // Increased Android elevation for proper touch handling
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
    zIndex: 30, // Higher than mute button (20) and video to ensure touches work on web
    elevation: 15, // Android elevation
    pointerEvents: 'box-none', // Allow touches to pass through container but children receive touches
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

// Memoize to avoid unnecessary re-renders in large FlatList
const VideoCard = React.memo(VideoCardComponent);
VideoCard.displayName = 'VideoCard';

export { VideoCard };

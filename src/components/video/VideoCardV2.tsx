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
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Video as VideoType } from '../../types/Video';
import * as firebaseConfig from '../../config/firebaseConfig';
import { IVideoPlayer } from '../../interfaces/IVideoPlayer';
import { videoPlayerFactory } from '../../services/video/VideoPlayerFactory';
import { videoPlaybackManagerV2 } from '../../services/video/VideoPlaybackManagerV2';
import { ExpoVideoPlayer } from '../../services/video/ExpoVideoPlayer';
import { AppError, isAppError } from '../../errors/AppError';
import { createVideoError } from '../../errors/factories/videoErrors';

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
  const [videoError, setVideoError] = useState<AppError | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  // Web-specific: track if autoplay was blocked by browser policy
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  
  // Refs
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);
  // Ref for mute state — avoids including isMuted in player creation effect deps,
  // which would destroy & recreate the player on every mute toggle.
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  
  // RECYCLING TRANSITION OVERLAY
  // When RecyclerListView recycles a view, video.id changes but the old player's
  // native TextureView still shows stale content for a few frames until the new
  // player initializes. Instead of clearing the player ref (which shows jarring
  // "Loading..." text), we overlay the NEW video's thumbnail on top of the
  // VideoView. The overlay hides once the new player renders its first frame.
  //
  // This is the same pattern TikTok/Reels use on budget Android devices.
  // React supports setState-during-render for derived state:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(true); // true initially until first frame
  const prevVideoIdRef = useRef(video.id);
  if (prevVideoIdRef.current !== video.id) {
    prevVideoIdRef.current = video.id;
    // Show thumbnail overlay to mask stale native content during player swap.
    // React will re-render immediately before committing — no intermediate paint.
    if (!showTransitionOverlay) {
      setShowTransitionOverlay(true);
    }
  }
  
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

  // Whether to use lazy player creation (only create when active).
  // Android budget devices hit hardware decoder limits (e.g. 8 max on MediaTek),
  // so we MUST avoid creating players for off-screen cells.
  // iOS/Web have no such limit — eager creation eliminates the black flash on scroll.
  const useLazyCreation = Platform.OS === 'android';

  // Whether this video is still being transcoded by Mux.
  // On Android, raw 4K video (e.g. 3840x2160 AVC) cannot be decoded by most
  // hardware decoders, so we MUST wait for Mux adaptive streaming to be ready.
  // On iOS/Web, raw video fallback works fine — no guard needed.
  const isMuxProcessing = Platform.OS === 'android' && !video.muxPlaybackUrl && !!video.muxAssetId;

  /**
   * Creates a player instance for the current video URL, wires up listeners,
   * and registers with the playback manager. Returns the playerInstance.
   * Extracted as a helper so both eager and lazy paths share the same logic.
   */
  const createAndRegisterPlayer = useCallback((): IVideoPlayer | null => {
    const playbackUrl = video.muxPlaybackUrl || video.videoUrl;
    let playerInstance: IVideoPlayer | null = null;

    try {
      playerInstance = videoPlayerFactory.createPlayer({
        videoUrl: playbackUrl,
        loop: true,
        muted: isMutedRef.current,
        autoPlay: false,
      });

      setPlayer(playerInstance);

      if (playerInstance instanceof ExpoVideoPlayer) {
        const rawPlayer = playerInstance.getPlayer();
        expoPlayerRef.current = rawPlayer;
        if (!isUnmountedRef.current) {
          setExpoPlayer(rawPlayer);
        }
      }

      const unsubscribe = playerInstance.addStatusListener((status) => {
        if (isUnmountedRef.current) return;
        setIsPlaying(status.isPlaying);
        if (status.autoplayBlocked) setAutoplayBlocked(true);
        if (status.error) {
          console.error(`[VideoCardV2][${Platform.OS}] Player error for ${video.id}:`, status.error);
          setError(true);
          setVideoError(createVideoError(status.error, video.id, {
            platform: Platform.OS,
            videoUrl: video.videoUrl,
            muxPlaybackUrl: video.muxPlaybackUrl,
          }));
        }
      });
      statusUnsubscribeRef.current = unsubscribe;

      videoPlaybackManagerV2.register({
        videoId: video.id,
        player: playerInstance,
        expectedVideoId: video.id,
        onBecomeActive: () => setUserPaused(false),
        onBecomeInactive: () => {},
      });
    } catch (err) {
      console.error(`[VideoCardV2][${Platform.OS}] Error initializing player for ${video.id}:`, err);
      setError(true);
    }

    return playerInstance;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable factory references
  }, [video.id, video.videoUrl, video.muxPlaybackUrl]);

  /**
   * Tears down the current player: unsubscribes listeners, unregisters from
   * the playback manager, releases resources, and clears state/refs.
   */
  const teardownPlayer = useCallback((playerInstance: IVideoPlayer | null) => {
    if (statusUnsubscribeRef.current) {
      try { statusUnsubscribeRef.current(); statusUnsubscribeRef.current = null; } catch (_) {}
    }
    try { videoPlaybackManagerV2.unregister(video.id); } catch (_) {}
    if (playerInstance) {
      playerInstance.release().catch((err) => {
        console.error(`[VideoCardV2][${Platform.OS}] Error releasing player for ${video.id}:`, err);
      });
    }
    if (viewTimerRef.current) { clearTimeout(viewTimerRef.current); viewTimerRef.current = null; }
    expoPlayerRef.current = null;
    setPlayer(null);
    setExpoPlayer(null);
    setIsPlaying(false);
    setShowTransitionOverlay(true);
  }, [video.id]);

  // ────────────────────────────────────────────────────────────────────
  // ANDROID: LAZY PLAYER CREATION
  // Only allocate an ExoPlayer (and its MediaCodec hardware decoder) for
  // the ACTIVE cell. Non-active cells show a static thumbnail.
  // This keeps concurrent decoders at 1 (max 8 on MediaTek).
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!useLazyCreation) return; // iOS/Web handled by next effect

    isUnmountedRef.current = false;

    if (!isActive) {
      // Not active on Android → no player, show thumbnail
      setPlayer(null);
      setExpoPlayer(null);
      expoPlayerRef.current = null;
      setIsPlaying(false);
      return;
    }

    if (isMuxProcessing) {
      // Mux is still transcoding — don't attempt raw 4K playback on Android.
      // Show "Processing..." UI instead; user can pull-to-refresh.
      setPlayer(null);
      setExpoPlayer(null);
      expoPlayerRef.current = null;
      setIsPlaying(false);
      return;
    }

    // Active on Android → create player and start playback
    setUserPaused(false);
    const playerInstance = createAndRegisterPlayer();
    if (playerInstance) {
      videoPlaybackManagerV2.setActiveVideo(video.id);
    }

    return () => {
      isUnmountedRef.current = true;
      teardownPlayer(playerInstance);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLazyCreation ? isActive : '__skip__', video.id, video.videoUrl]);

  // ────────────────────────────────────────────────────────────────────
  // iOS / WEB: EAGER PLAYER CREATION
  // Create player on mount, keep it alive regardless of isActive.
  // Play/pause is managed by the separate userPaused effect below.
  // No decoder limit issues on these platforms.
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (useLazyCreation) return; // Android handled by previous effect

    isUnmountedRef.current = false;
    const playerInstance = createAndRegisterPlayer();

    return () => {
      isUnmountedRef.current = true;
      teardownPlayer(playerInstance);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLazyCreation ? '__skip__' : video.id, video.videoUrl]);

  /**
   * Handle isActive + userPaused changes — manages play/pause at runtime.
   * On Android (lazy), the player only exists while active so this is a
   * secondary guard. On iOS/Web (eager), this is the primary play/pause driver.
   */
  useEffect(() => {
    if (!player) return;

    const managePlayback = async () => {
      if (isActive && !userPaused) {
        await videoPlaybackManagerV2.setActiveVideo(video.id);
      } else {
        // Scrolled away, user paused, or screen unfocused → pause
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
    // Guard: skip if no player or if the player ref is already gone (released)
    if (!player || !expoPlayerRef.current) return;
    
    player.setMuted(isMuted).catch(() => {
      // Swallow — player may have been released between the guard check and the call
    });
  }, [isMuted, player, video.id, isActive]);

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
      {video.description && (
        <Text style={styles.description} numberOfLines={2}>
          {video.description}
        </Text>
      )}
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
   * Render processing state (Android only)
   * When Mux is still transcoding, Android can't decode the raw 4K file.
   * Show thumbnail with a processing indicator instead of a playback error.
   */
  if (isMuxProcessing) {
    return (
      <View style={styles.container}>
        <View style={styles.videoContainer}>
          {(video.muxThumbnailUrl || video.thumbnailUrl) ? (
            <Image
              source={{ uri: video.muxThumbnailUrl || video.thumbnailUrl }}
              style={styles.video}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.video, styles.loadingContainer]} />
          )}
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Processing video...</Text>
            <Text style={styles.processingSubtext}>Pull down to refresh</Text>
          </View>
        </View>
        <View testID="info-overlay" style={[styles.infoOverlayWrapper, { pointerEvents: 'box-none' }]}>
          {renderVideoInfo()}
        </View>
        {renderActionButtons()}
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    const safeMessage = videoError
      ? videoError.getUserMessage()
      : 'This video may have been removed or is temporarily unavailable';
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#fff" />
          <Text style={styles.errorText}>Video Unavailable</Text>
          <Text style={styles.errorSubtext}>
            {safeMessage}
          </Text>
          {__DEV__ && videoError && (
            <Text style={[styles.errorSubtext, { fontSize: 10, marginTop: 8, opacity: 0.5 }]}>
              [{videoError.code}]
            </Text>
          )}
        </View>
      </View>
    );
  }

  /**
   * On iOS/Web (eager): expoPlayer is set on mount, so this only shows
   * briefly during the very first frame. On Android (lazy): expoPlayer
   * is null for non-active cells, but we still need action buttons etc.
   * So we skip the early return on Android and let the main render
   * handle the thumbnail-vs-VideoView swap inside the full layout.
   */
  if (!expoPlayer && Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        {(video.muxThumbnailUrl || video.thumbnailUrl) ? (
          <Image
            source={{ uri: video.muxThumbnailUrl || video.thumbnailUrl }}
            style={styles.video}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Loading...</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container} testID="video-card-container">
      {/* Video player */}
      {/* Video player */}
      <View style={styles.videoContainer}>
        {!expoPlayerRef.current ? (
          // No player — show thumbnail (cell not active or player initializing)
          <View style={[styles.video, styles.loadingContainer]}>
            {(video.muxThumbnailUrl || video.thumbnailUrl) ? (
              <Image
                source={{ uri: video.muxThumbnailUrl || video.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.loadingText}>Loading...</Text>
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
              onFirstFrameRender={() => setShowTransitionOverlay(false)}
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

            {/* Transition overlay — covers stale native content during RLV view recycling.
                Shows the new video's thumbnail (or solid black) until the new player
                renders its first frame. This prevents the "wrong video flash" on
                budget Android devices like Galaxy A03s where the swap takes longer. */}
            {showTransitionOverlay && (
              <View style={styles.transitionOverlay}>
                {(video.muxThumbnailUrl || video.thumbnailUrl) ? (
                  <Image
                    source={{ uri: video.muxThumbnailUrl || video.thumbnailUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="contain"
                  />
                ) : null}
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
  description: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 18,
    marginBottom: 8,
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
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 5,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  processingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  processingSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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

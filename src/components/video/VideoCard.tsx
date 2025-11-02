/**
 * VideoCard Component
 * Displays a single video with player, overlay info, and interaction buttons
 * Optimized for mobile vertical feed (TikTok-style)
 */

import React, { useState, useRef, useEffect } from 'react';
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
import { auth } from '../../config/firebaseConfig';

const { width, height } = Dimensions.get('window');

interface VideoCardProps {
  video: VideoType;
  isActive: boolean; // Whether this video is currently in view
  onLike: () => void;
  onComment?: () => void;
  onShare: () => void;
  onViewTracked?: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isActive,
  onLike,
  onComment,
  onShare,
  onViewTracked,
}) => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for mobile
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const userId = auth.currentUser?.uid;
  const isLiked = video.likes?.includes(userId || '');
  const likeCount = video.likes?.length || 0;
  const commentCount = video.comments?.length || 0;
  const viewCount = video.viewCount || 0;

  /**
   * Control playback based on isActive
   */
  useEffect(() => {
    if (isActive && videoRef.current) {
      // Play when active
      videoRef.current.playAsync().catch((err) => {
        console.error('Error playing video:', err);
      });
      setIsPlaying(true);
    } else if (!isActive && videoRef.current) {
      // Pause when inactive
      videoRef.current.pauseAsync().catch((err) => {
        console.error('Error pausing video:', err);
      });
      setIsPlaying(false);
    }
  }, [isActive]);

  /**
   * Track view after 3 seconds of play
   */
  useEffect(() => {
    if (isPlaying && !hasTrackedView && onViewTracked) {
      viewTimerRef.current = setTimeout(() => {
        onViewTracked();
        setHasTrackedView(true);
      }, 3000); // Track after 3 seconds
    }

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, [isPlaying, hasTrackedView, onViewTracked]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync().catch(() => {
          // Ignore errors on cleanup
        });
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
    if (!videoRef.current) return;

    try {
      await videoRef.current.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
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
      <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={32}
          color={isLiked ? '#ff4458' : '#fff'}
        />
        <Text style={styles.actionText}>{likeCount}</Text>
      </TouchableOpacity>

      {/* Comment button */}
      {onComment && (
        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <Ionicons name="chatbubble-outline" size={32} color="#fff" />
          <Text style={styles.actionText}>{commentCount}</Text>
        </TouchableOpacity>
      )}

      {/* Share button */}
      <TouchableOpacity style={styles.actionButton} onPress={onShare}>
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
    <View style={styles.container}>
      {/* Video Player */}
      <TouchableOpacity
        style={styles.videoContainer}
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

        {/* Mute button */}
        <TouchableOpacity style={styles.muteButton} onPress={handleMuteToggle}>
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Video info overlay */}
      {renderVideoInfo()}

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
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 80,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
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
    bottom: 100,
    alignItems: 'center',
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

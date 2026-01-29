/**
 * AndroidVideoPlayerRNV.tsx
 * 
 * react-native-video v6 implementation for Android video feeds
 * WITH FALLBACK to expo-av when native module isn't available
 * 
 * TEST 9: Downgraded from v7 beta to v6.19.0 stable (January 22, 2026)
 * 
 * Why react-native-video v6:
 * - v7 beta has completely different API (useVideoPlayer + VideoView)
 * - v6 uses familiar <Video> component with onLoad, onBuffer, paused props
 * - v6.19.0 is stable, released Jan 2026, used by 32k+ projects
 * - Better MediaCodec/ExoPlayer memory management than expo-av
 * - Explicit pause control via `paused` prop
 * 
 * Key differences from expo-av:
 * - Uses `paused` prop (not `shouldPlay`)
 * - Uses `onLoad` (not `onPlaybackStatusUpdate` for load)
 * - Uses `onBuffer` for buffering states
 * - `bufferConfig` for memory optimization
 * - Better native cleanup on unmount
 * 
 * FALLBACK: If react-native-video native module isn't registered (e.g., Expo Go),
 * this component falls back to expo-av Video component.
 * 
 * Device Target: Samsung Galaxy A03s (192MB heap limit)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, UIManager } from 'react-native';
import { Video as VideoType } from '../../types/Video';

// Try to detect if react-native-video is available
let RNVideo: any = null;
let useRNVideo = false;

try {
  // Check if the native module is registered
  const hasNativeModule = UIManager.getViewManagerConfig?.('RCTVideo') != null;
  if (hasNativeModule) {
    RNVideo = require('react-native-video').default;
    useRNVideo = true;
    console.log('[AndroidVideoPlayerRNV] Using react-native-video');
  } else {
    console.log('[AndroidVideoPlayerRNV] RCTVideo not found, falling back to expo-av');
  }
} catch (e) {
  console.log('[AndroidVideoPlayerRNV] react-native-video not available, using expo-av fallback');
}

// Import expo-av as fallback
import { Video as ExpoVideo, ResizeMode, AVPlaybackStatus } from 'expo-av';

interface AndroidVideoPlayerProps {
  video: VideoType;
  isActive: boolean;
  isMuted: boolean;
  isPaused?: boolean; // User tap-to-pause control (separate from isActive scroll control)
  onLoad?: () => void;
  onError?: (error: string) => void;
  onPlaybackStatusUpdate?: (status: any) => void;
}

export const AndroidVideoPlayerRNV: React.FC<AndroidVideoPlayerProps> = ({
  video,
  isActive,
  isMuted,
  isPaused = false, // Default to not paused
  onLoad,
  onError,
  onPlaybackStatusUpdate,
}) => {
  const videoRef = useRef<any>(null);
  const expoVideoRef = useRef<ExpoVideo>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  // ============================================
  // FALLBACK: expo-av implementation
  // ============================================
  if (!useRNVideo) {
    // Use expo-av Video component as fallback
    const handleExpoPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        setIsLoading(false);
        setIsBuffering(status.isBuffering || false);
        onPlaybackStatusUpdate?.(status);
      }
    }, [onPlaybackStatusUpdate]);

    const handleExpoError = useCallback((errorMsg: string) => {
      console.error(`[ExpoAV Fallback] ❌ ERROR: ${video.id}`, errorMsg);
      setError(errorMsg);
      setIsLoading(false);
      onError?.(errorMsg);
    }, [video.id, onError]);

    const handleExpoLoad = useCallback(() => {
      setIsLoading(false);
      setError(null);
      onLoad?.();
    }, [onLoad]);

    // Control playback based on isActive and isPaused
    useEffect(() => {
      if (expoVideoRef.current) {
        if (isActive && !isPaused) {
          expoVideoRef.current.playAsync();
        } else {
          expoVideoRef.current.pauseAsync();
        }
      }
    }, [isActive, isPaused]);

    return (
      <View style={styles.container} pointerEvents="none">
        <ExpoVideo
          ref={expoVideoRef}
          source={{ uri: video.videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive && !isPaused}
          isLooping
          isMuted={isMuted}
          onPlaybackStatusUpdate={handleExpoPlaybackStatusUpdate}
          onLoad={handleExpoLoad}
          onError={(err) => handleExpoError(err || 'Unknown error')}
          usePoster
          posterSource={{ uri: video.thumbnailUrl || '' }}
        />
        
        {/* Loading indicator */}
        {(isLoading || isBuffering) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>Failed to load video</Text>
            <Text style={styles.errorDetails}>{error}</Text>
          </View>
        )}
      </View>
    );
  }

  // ============================================
  // PRIMARY: react-native-video implementation
  // ============================================

  /**
   * Cleanup on unmount
   * react-native-video handles MediaCodec cleanup internally
   */
  useEffect(() => {
    return () => {
      // Reset position for when component is recycled
      videoRef.current?.seek?.(0);
    };
  }, [video.id]);

  /**
   * Handle buffer events (react-native-video)
   */
  const handleBuffer = useCallback((data: any) => {
    setIsBuffering(data?.isBuffering || false);
  }, []);

  /**
   * Handle video load (react-native-video)
   */
  const handleLoad = useCallback((data: any) => {
    setIsLoading(false);
    setError(null);
    onLoad?.();
  }, [onLoad]);

  /**
   * Handle playback progress (react-native-video)
   */
  const handleProgress = useCallback((data: any) => {
    // Pass progress to parent if needed
    onPlaybackStatusUpdate?.({
      isLoaded: true,
      isPlaying: !data?.playableDuration || data?.currentTime < data?.playableDuration,
      positionMillis: (data?.currentTime || 0) * 1000,
      durationMillis: (data?.playableDuration || 0) * 1000,
      shouldPlay: isActive,
    });
  }, [isActive, onPlaybackStatusUpdate]);

  /**
   * Handle errors (react-native-video)
   */
  const handleError = useCallback((err: any) => {
    const errorMsg = err?.error?.errorString || err?.error?.localizedDescription || 'Unknown error';
    console.error(`[RNV] ❌ ERROR: ${video.id}`, errorMsg);
    setError(errorMsg);
    setIsLoading(false);
    onError?.(errorMsg);
  }, [video.id, onError]);

  /**
   * Handle video end - reset position for potential replay
   */
  const handleEnd = useCallback(() => {
    // Reset to beginning for potential replay
    videoRef.current?.seek?.(0);
  }, []);

  // RNVideo is guaranteed to be available here (checked above)
  const VideoComponent = RNVideo;

  return (
    <View style={styles.container} pointerEvents="none">
      <VideoComponent
        ref={videoRef}
        source={{ uri: video.videoUrl }}
        style={styles.video}
        resizeMode="cover"
        // CRITICAL: Pause when not active OR user manually paused
        paused={!isActive || isPaused}
        repeat={false}
        muted={isMuted}
        // Event handlers
        onBuffer={handleBuffer}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onError={handleError}
        onEnd={handleEnd}
        // Poster image while loading
        poster={video.thumbnailUrl}
        posterResizeMode="cover"
        // Memory optimization
        playInBackground={false}
        playWhenInactive={false}
        // CRITICAL: Buffer configuration for memory management on low-memory devices
        bufferConfig={{
          minBufferMs: 10000,          // 10s minimum buffer (reduced for memory)
          maxBufferMs: 20000,          // 20s maximum buffer (reduced for memory)
          bufferForPlaybackMs: 2000,   // 2s before starting playback
          bufferForPlaybackAfterRebufferMs: 3000,  // 3s after rebuffer
        }}
        // Disable controls (we have our own UI)
        controls={false}
        // Progress interval for onProgress callback
        progressUpdateInterval={500}
      />
      
      {/* Loading indicator */}
      {(isLoading || isBuffering) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Failed to load video</Text>
          <Text style={styles.errorDetails}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorDetails: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
  },
});

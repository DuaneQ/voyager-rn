/**
 * AndroidVideoPlayerRNV.tsx
 * 
 * react-native-video v6 implementation for Android video feeds
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
 * Device Target: Samsung Galaxy A03s (192MB heap limit)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import type { VideoRef, OnLoadData, OnBufferData, OnProgressData } from 'react-native-video';
import { Video as VideoType } from '../../types/Video';

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
  const videoRef = useRef<VideoRef>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  /**
   * Cleanup on unmount
   * react-native-video handles MediaCodec cleanup internally
   */
  useEffect(() => {
    return () => {
      // Reset position for when component is recycled
      videoRef.current?.seek(0);
    };
  }, [video.id]);

  /**
   * Handle buffer events
   */
  const handleBuffer = useCallback((data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  }, []);

  /**
   * Handle video load
   */
  const handleLoad = useCallback((data: OnLoadData) => {
    setIsLoading(false);
    setError(null);
    onLoad?.();
  }, [onLoad]);

  /**
   * Handle playback progress
   */
  const handleProgress = useCallback((data: OnProgressData) => {
    // Pass progress to parent if needed
    onPlaybackStatusUpdate?.({
      isLoaded: true,
      isPlaying: !data.playableDuration || data.currentTime < data.playableDuration,
      positionMillis: data.currentTime * 1000,
      durationMillis: data.playableDuration * 1000,
      shouldPlay: isActive,
    } as any);
  }, [isActive, onPlaybackStatusUpdate]);

  /**
   * Handle errors
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
    videoRef.current?.seek(0);
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      <Video
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

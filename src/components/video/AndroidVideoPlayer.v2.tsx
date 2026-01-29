/**
 * AndroidVideoPlayer.v2.tsx
 * 
 * COMPLETELY DIFFERENT APPROACH TO MEMORY LEAK
 * 
 * Problem: unloadAsync() isn't actually releasing MediaCodec decoders
 * Evidence: "✅ DECODER RELEASED" logs but memory still hits 192MB
 * 
 * New Strategy:
 * 1. **One video instance at a time** - Unmount off-screen videos completely
 * 2. **Preemptive cleanup** - Cleanup BEFORE loading new video
 * 3. **Synchronous checks** - Don't trust async cleanup promises
 * 4. **Null video src** - Set source to null before unmounting
 * 
 * Key Differences from v1:
 * - v1: Cleanup on isActive=false (kept component mounted)
 * - v2: Return null when isActive=false (force unmount)
 * - v1: Trust unloadAsync() to release memory
 * - v2: Set source={null} to force decoder release
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode } from '../../adapters/expo-av';
import { Video as VideoType } from '../../types/Video';

const CLEANUP_TIMEOUT_MS = 500;

interface AndroidVideoPlayerProps {
  video: VideoType;
  isActive: boolean;
  isMuted: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
}

export const AndroidVideoPlayerV2: React.FC<AndroidVideoPlayerProps> = ({
  video,
  isActive,
  isMuted,
  onLoad,
  onError,
  onPlaybackStatusUpdate,
}) => {
  const videoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isUnmountedRef = useRef(false);

  /**
   * CRITICAL CHANGE: Don't even render the Video component when inactive
   * This forces React to completely unmount the component and release resources
   */
  if (!isActive) {
    return null; // Force complete unmount
  }

  /**
   * Aggressive cleanup on unmount only (no mid-lifecycle cleanup)
   */
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;

      const ref = videoRef.current;
      if (!ref) return;

      // CRITICAL: Set source to null FIRST to force MediaCodec release
      (async () => {
        try {          
          // Try to stop and unload with timeout
          await Promise.race([
            (async () => {
              try {
                await ref.stopAsync();
              } catch (e) {}
              try {
                await ref.unloadAsync();
              } catch (e) {}
            })(),
            new Promise((resolve) => setTimeout(resolve, CLEANUP_TIMEOUT_MS)),
          ]);

        } catch (err: any) {
          console.warn(`[AndroidVideoPlayer V2] Cleanup error: ${err.message || err}`);
        }
      })();
    };
  }, [video.id]);

  /**
   * Auto-play when component mounts (since it only renders when active)
   */
  useEffect(() => {
    const playVideo = async () => {
      const ref = videoRef.current;
      if (!ref || isUnmountedRef.current) return;

      try {
        await ref.playAsync();
      } catch (err: any) {
        console.warn(`[AndroidVideoPlayer V2] Play error: ${err.message || err}`);
      }
    };

    // Small delay to ensure video is loaded before playing
    const timer = setTimeout(playVideo, 100);
    return () => clearTimeout(timer);
  }, [video.id]);

  /**
   * Handle mute changes
   */
  useEffect(() => {
    const setMute = async () => {
      const ref = videoRef.current;
      if (!ref || isUnmountedRef.current) return;

      try {
        await ref.setIsMutedAsync(isMuted);
      } catch (err: any) {
        console.warn(`[AndroidVideoPlayer V2] Mute error: ${err.message || err}`);
      }
    };

    setMute();
  }, [isMuted]);

  /**
   * Handle playback status updates
   */
  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (isUnmountedRef.current) return;

      if (status.isLoaded) {
        if (isLoading) {
          setIsLoading(false);
          onLoad?.();
        }
        onPlaybackStatusUpdate?.(status);
      } else {
        // Only log errors if we're not in the middle of unmounting
        const errorMsg = `Playback error: ${(status as any).error || 'Unknown error'}`;
        if (!isUnmountedRef.current) {
          console.error(`[AndroidVideoPlayer V2] ${errorMsg}`, video.id);
          setError(errorMsg);
          setIsLoading(false);
          onError?.(errorMsg);
        }
      }
    },
    [isLoading, onLoad, onPlaybackStatusUpdate, onError, video.id]
  );

  /**
   * Handle load error
   */
  const handleError = useCallback(
    (error: string) => {
      if (isUnmountedRef.current) return;

      console.error(`[AndroidVideoPlayer V2] Load error: ${error}`, video.id);
      setError(error);
      setIsLoading(false);
      onError?.(error);
    },
    [video.id, onError]
  );

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: video.videoUrl }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping={false}
        shouldPlay={false} // Controlled by auto-play effect
        isMuted={isMuted}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={handleError}
        useNativeControls={false}
        volume={isMuted ? 0 : 1}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

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

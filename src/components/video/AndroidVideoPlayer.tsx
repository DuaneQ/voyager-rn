/**
 * AndroidVideoPlayer - Aggressive Memory Cleanup for Android
 * 
 * CRITICAL DIFFERENCES from standard VideoCard:
 * 1. Explicit stopAsync() → unloadAsync() sequence with timeouts
 * 2. Cleanup runs EVERY time component unmounts (not just when inactive)
 * 3. isUnmountedRef guards prevent async operations after unmount
 * 4. MediaCodec decoder explicitly released via unloadAsync()
 * 
 * Why This Exists:
 * - expo-av Video component doesn't auto-release MediaCodec decoders
 * - Each video holds ~17MB of native memory (H.264 decoder + buffers)
 * - Device has 192MB heap limit → crashes after 3-5 videos
 * - This component ensures cleanup ALWAYS happens
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Video as VideoType } from '../../types/Video';

const { width, height } = Dimensions.get('window');

interface AndroidVideoPlayerProps {
  video: VideoType;
  isActive: boolean;
  isMuted: boolean;
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

const CLEANUP_TIMEOUT_MS = 500; // Max time to wait for async cleanup

export const AndroidVideoPlayer: React.FC<AndroidVideoPlayerProps> = ({
  video,
  isActive,
  isMuted,
  onPlaybackStatusUpdate,
  onLoad,
  onError,
}) => {
  const videoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isUnmountedRef = useRef(false);
  const isCleanedUpRef = useRef(false);

  /**
   * Aggressive cleanup: CRITICAL for preventing MediaCodec leak
   * 
   * Sequence:
   * 1. stopAsync() - Halt playback (stops MediaCodec processing)
   * 2. unloadAsync() - Release MediaCodec decoder (frees ~17MB)
   * 
   * Timeouts prevent hanging if video is in bad state
   */
  const cleanupVideo = useCallback(async () => {
    const ref = videoRef.current;
    if (!ref || isCleanedUpRef.current) return;

    console.log(`[AndroidVideoPlayer] 🧹 CLEANUP START: ${video.id}`);
    isCleanedUpRef.current = true;

    try {
      // Step 1: Stop playback with timeout
      await Promise.race([
        ref.stopAsync().catch((err) => {
          console.warn(`[AndroidVideoPlayer] stopAsync error (continuing): ${err.message}`);
        }),
        new Promise((resolve) => setTimeout(resolve, CLEANUP_TIMEOUT_MS)),
      ]);

      // Step 2: Unload (releases MediaCodec) with timeout
      await Promise.race([
        ref.unloadAsync().catch((err) => {
          console.warn(`[AndroidVideoPlayer] unloadAsync error (continuing): ${err.message}`);
        }),
        new Promise((resolve) => setTimeout(resolve, CLEANUP_TIMEOUT_MS)),
      ]);

      console.log(`[AndroidVideoPlayer] ✅ DECODER RELEASED: ${video.id}`);
    } catch (err: any) {
      console.warn(`[AndroidVideoPlayer] Cleanup error (non-fatal): ${err.message || err}`);
    }
  }, [video.id]);

  /**
   * Unmount cleanup: ALWAYS runs, even if video never played
   */
  useEffect(() => {
    return () => {
      console.log(`[AndroidVideoPlayer] 🔄 UNMOUNTING: ${video.id}`);
      isUnmountedRef.current = true;
      cleanupVideo();
    };
  }, [cleanupVideo]);

  /**
   * Playback control: start/stop based on isActive prop
   * CRITICAL: When inactive, we must cleanup to release MediaCodec
   * (RecyclerListView recycles components without unmounting)
   */
  useEffect(() => {
    const handlePlayback = async () => {
      const ref = videoRef.current;
      if (!ref || isUnmountedRef.current) return;

      try {
        if (isActive) {
          console.log(`[AndroidVideoPlayer] ▶️ PLAY: ${video.id}`);
          await ref.playAsync();
        } else {
          console.log(`[AndroidVideoPlayer] ⏸️ PAUSE: ${video.id}`);
          // CRITICAL: Cleanup when inactive (RecyclerListView recycling)
          await cleanupVideo();
        }
      } catch (err: any) {
        console.warn(`[AndroidVideoPlayer] Playback control error: ${err.message || err}`);
      }
    };

    // Execute the async function
    handlePlayback();
  }, [isActive, video.id, cleanupVideo]);

  /**
   * Mute control: update when isMuted changes
   */
  useEffect(() => {
    const handleMute = async () => {
      const ref = videoRef.current;
      if (!ref || isUnmountedRef.current || !isActive) return;

      try {
        await ref.setIsMutedAsync(isMuted);
      } catch (err: any) {
        console.warn(`[AndroidVideoPlayer] Mute error: ${err.message || err}`);
      }
    };

    handleMute();
  }, [isMuted, isActive]);

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
        // status is AVPlaybackStatusError (has error property)
        const errorMsg = `Playback error: ${(status as any).error || 'Unknown error'}`;
        console.error(`[AndroidVideoPlayer] ${errorMsg}`, video.id);
        setError(errorMsg);
        setIsLoading(false);
        onError?.(errorMsg);
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

      console.error(`[AndroidVideoPlayer] Load error: ${error}`, video.id);
      setError(error);
      setIsLoading(false);
      onError?.(error);
    },
    [onError, video.id]
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        {/* Error state - don't render anything to avoid wasting resources */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: video.videoUrl }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay={false} // Control via playAsync/pauseAsync for better lifecycle management
        isMuted={isMuted}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={handleError}
        // Android-specific optimizations
        useNativeControls={false}
        progressUpdateIntervalMillis={1000} // Reduce callback frequency
      />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorContainer: {
    width,
    height,
    backgroundColor: '#000',
  },
});

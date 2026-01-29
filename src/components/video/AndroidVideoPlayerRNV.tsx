/**
 * AndroidVideoPlayerRNV.tsx
 * 
 * react-native-video v6 implementation for Android video feeds
 * WITH FALLBACK to expo-av when native module isn't available
 * 
 * ARCHITECTURE:
 * - Detects react-native-video availability at module load time
 * - Uses composition pattern (not conditional hooks) to avoid Rules of Hooks violation
 * - expo-av fallback is disabled on web platform to prevent crash
 * 
 * Why react-native-video v6:
 * - Better MediaCodec/ExoPlayer memory management than expo-av
 * - Explicit pause control via `paused` prop
 * - v6.19.0 is stable, used by 32k+ projects
 * 
 * Device Target: Samsung Galaxy A03s (192MB heap limit)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, UIManager, Platform } from 'react-native';
import { Video as VideoType } from '../../types/Video';

// Detect if react-native-video is available at module load time
let RNVideo: any = null;
let useRNVideo = false;

try {
  const hasNativeModule = UIManager.getViewManagerConfig?.('RCTVideo') != null;
  if (hasNativeModule) {
    RNVideo = require('react-native-video').default;
    useRNVideo = true;
    console.log('[AndroidVideoPlayerRNV] Using react-native-video');
  } else {
    console.log('[AndroidVideoPlayerRNV] RCTVideo not found, will use expo-av fallback');
  }
} catch (e) {
  console.log('[AndroidVideoPlayerRNV] react-native-video not available, will use expo-av fallback');
}

interface AndroidVideoPlayerProps {
  video: VideoType;
  isActive: boolean;
  isMuted: boolean;
  isPaused?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onPlaybackStatusUpdate?: (status: any) => void;
}

// ============================================
// FALLBACK COMPONENT: expo-av implementation
// Separate component to avoid Rules of Hooks violation
// DISABLED ON WEB to prevent expo-av crash
// ============================================
const ExpoAVFallbackPlayer: React.FC<AndroidVideoPlayerProps> = ({
  video,
  isActive,
  isMuted,
  isPaused = false,
  onLoad,
  onError,
  onPlaybackStatusUpdate,
}) => {
  // On web, don't render anything (prevents expo-av from loading)
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Video playback not supported on web</Text>
      </View>
    );
  }

  // expo-av is only used on native platforms
  const ExpoAV = require('expo-av');
  const expoVideoRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  const handlePlaybackStatusUpdate = useCallback((status: any) => {
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

  // Control playback
  useEffect(() => {
    if (expoVideoRef.current) {
      if (isActive && !isPaused) {
        expoVideoRef.current.playAsync?.();
      } else {
        expoVideoRef.current.pauseAsync?.();
      }
    }
  }, [isActive, isPaused]);

  return (
    <View style={styles.container} pointerEvents="none">
      <ExpoAV.Video
        ref={expoVideoRef}
        source={{ uri: video.videoUrl }}
        style={styles.video}
        resizeMode={ExpoAV.ResizeMode.COVER}
        shouldPlay={isActive && !isPaused}
        isLooping
        isMuted={isMuted}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onLoad={handleExpoLoad}
        onError={(err: any) => handleExpoError(err || 'Unknown error')}
        usePoster
        posterSource={{ uri: video.thumbnailUrl || '' }}
      />
      
      {(isLoading || isBuffering) && (
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

// ============================================
// PRIMARY COMPONENT: react-native-video implementation
// ============================================
const RNVideoPlayer: React.FC<AndroidVideoPlayerProps> = ({
  video,
  isActive,
  isMuted,
  isPaused = false,
  onLoad,
  onError,
  onPlaybackStatusUpdate,
}) => {
  const videoRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    return () => {
      videoRef.current?.seek?.(0);
    };
  }, [video.id]);

  const handleBuffer = useCallback((data: any) => {
    setIsBuffering(data?.isBuffering || false);
  }, []);

  const handleLoad = useCallback((data: any) => {
    setIsLoading(false);
    setError(null);
    onLoad?.();
  }, [onLoad]);

  const handleProgress = useCallback((data: any) => {
    onPlaybackStatusUpdate?.({
      isLoaded: true,
      isPlaying: !data?.playableDuration || data?.currentTime < data?.playableDuration,
      positionMillis: (data?.currentTime || 0) * 1000,
      durationMillis: (data?.playableDuration || 0) * 1000,
      shouldPlay: isActive,
    });
  }, [isActive, onPlaybackStatusUpdate]);

  const handleError = useCallback((err: any) => {
    const errorMsg = err?.error?.errorString || err?.error?.localizedDescription || 'Unknown error';
    console.error(`[RNV] ❌ ERROR: ${video.id}`, errorMsg);
    setError(errorMsg);
    setIsLoading(false);
    onError?.(errorMsg);
  }, [video.id, onError]);

  const handleEnd = useCallback(() => {
    videoRef.current?.seek?.(0);
  }, []);

  const VideoComponent = RNVideo;

  return (
    <View style={styles.container} pointerEvents="none">
      <VideoComponent
        ref={videoRef}
        source={{ uri: video.videoUrl }}
        style={styles.video}
        resizeMode="cover"
        paused={!isActive || isPaused}
        repeat={false}
        muted={isMuted}
        onBuffer={handleBuffer}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onError={handleError}
        onEnd={handleEnd}
        poster={video.thumbnailUrl}
        posterResizeMode="cover"
        playInBackground={false}
        playWhenInactive={false}
        bufferConfig={{
          minBufferMs: 10000,
          maxBufferMs: 20000,
          bufferForPlaybackMs: 2000,
          bufferForPlaybackAfterRebufferMs: 3000,
        }}
        controls={false}
        progressUpdateInterval={500}
      />
      
      {(isLoading || isBuffering) && (
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

// ============================================
// MAIN EXPORT: Chooses implementation based on availability
// No conditional hooks - just renders the appropriate component
// ============================================
export const AndroidVideoPlayerRNV: React.FC<AndroidVideoPlayerProps> = (props) => {
  // Composition pattern: render one component or the other
  // This avoids the Rules of Hooks violation
  if (useRNVideo) {
    return <RNVideoPlayer {...props} />;
  }
  return <ExpoAVFallbackPlayer {...props} />;
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

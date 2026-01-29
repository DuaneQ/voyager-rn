/**
 * iOS Video Player Component
 * 
 * Uses expo-av Video component specifically for iOS.
 * This file is only imported on iOS/native platforms, not on web.
 * 
 * IMPORTANT: Do NOT import this file on web - it will crash iOS Safari
 * due to the expo-av deprecation warning infinite loop bug.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

export interface IOSVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  isMuted: boolean;
  isLooping?: boolean;
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  onError?: () => void;
}

export interface IOSVideoPlayerRef {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  replay: () => Promise<void>;
  setPosition: (positionMillis: number) => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
  load: (uri: string) => Promise<void>;
  unload: () => Promise<void>;
}

/**
 * iOS Video Player using expo-av
 * 
 * This component wraps expo-av's Video component with an imperative API
 * that matches our video playback manager interface.
 */
export const IOSVideoPlayer = forwardRef<IOSVideoPlayerRef, IOSVideoPlayerProps>(
  ({ videoUrl, thumbnailUrl, isMuted, isLooping = true, onPlaybackStatusUpdate, onError }, ref) => {
    const videoRef = useRef<Video>(null);

    useImperativeHandle(ref, () => ({
      play: async () => {
        await videoRef.current?.playAsync();
      },
      pause: async () => {
        await videoRef.current?.pauseAsync();
      },
      stop: async () => {
        await videoRef.current?.stopAsync();
      },
      replay: async () => {
        await videoRef.current?.replayAsync();
      },
      setPosition: async (positionMillis: number) => {
        await videoRef.current?.setPositionAsync(positionMillis);
      },
      setMuted: async (muted: boolean) => {
        await videoRef.current?.setIsMutedAsync(muted);
      },
      load: async (uri: string) => {
        await videoRef.current?.loadAsync({ uri }, {}, false);
      },
      unload: async () => {
        await videoRef.current?.unloadAsync();
      },
    }));

    return (
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={isLooping}
        isMuted={isMuted}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onError={onError}
        usePoster
        posterSource={{ uri: thumbnailUrl || '' }}
      />
    );
  }
);

const styles = StyleSheet.create({
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

// Re-export types for convenience
export { AVPlaybackStatus, ResizeMode } from 'expo-av';

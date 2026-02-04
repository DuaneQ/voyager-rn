/**
 * Video Player Factory
 * 
 * Creates appropriate video player implementation based on configuration.
 * Follows Open/Closed Principle - open for extension (new implementations),
 * closed for modification (existing code doesn't change when adding new players).
 * 
 * Also follows Single Responsibility Principle - only creates players.
 */

import { Platform } from 'react-native';
import { IVideoPlayer, VideoPlayerConfig } from '../../interfaces/IVideoPlayer';
import { IVideoPlayerFactory } from '../../interfaces/IVideoPlayerFactory';
import { ExpoVideoPlayer } from './ExpoVideoPlayer';

/**
 * Feature flags for gradual rollout
 */
interface VideoPlayerFeatureFlags {
  useExpoVideo: boolean;
  useExpoVideoOnWeb: boolean;
  useExpoVideoOnIOS: boolean;
  useExpoVideoOnAndroid: boolean;
}

/**
 * Default feature flags - can be overridden for testing
 */
const DEFAULT_FEATURE_FLAGS: VideoPlayerFeatureFlags = {
  useExpoVideo: true, // Master switch
  useExpoVideoOnWeb: true,
  useExpoVideoOnIOS: true,
  useExpoVideoOnAndroid: true,
};

export class VideoPlayerFactory implements IVideoPlayerFactory {
  private featureFlags: VideoPlayerFeatureFlags;

  constructor(featureFlags: Partial<VideoPlayerFeatureFlags> = {}) {
    this.featureFlags = {
      ...DEFAULT_FEATURE_FLAGS,
      ...featureFlags,
    };
  }

  createPlayer(config: VideoPlayerConfig): IVideoPlayer {
    // Determine which implementation to use based on platform and feature flags
    if (this.shouldUseExpoVideo()) {
      return this.createExpoVideoPlayer(config);
    } else {
      // Fallback to expo-av (legacy implementation)
      // For now, throw error as we're fully migrating to expo-video
      throw new Error('Legacy expo-av player not supported in this implementation');
    }
  }

  private shouldUseExpoVideo(): boolean {
    // Check master switch
    if (!this.featureFlags.useExpoVideo) {
      return false;
    }

    // Check platform-specific flags
    if (Platform.OS === 'web' && !this.featureFlags.useExpoVideoOnWeb) {
      return false;
    }

    if (Platform.OS === 'ios' && !this.featureFlags.useExpoVideoOnIOS) {
      return false;
    }

    if (Platform.OS === 'android' && !this.featureFlags.useExpoVideoOnAndroid) {
      return false;
    }

    return true;
  }

  private createExpoVideoPlayer(config: VideoPlayerConfig): IVideoPlayer {
    try {
      return new ExpoVideoPlayer(config);
    } catch (error) {
      console.error('[VideoPlayerFactory] Error creating ExpoVideoPlayer:', error);
      throw new Error(`Failed to create video player: ${error}`);
    }
  }

  get implementationType(): 'expo-av' | 'expo-video' | 'web' {
    if (this.shouldUseExpoVideo()) {
      return 'expo-video';
    }
    return 'expo-av';
  }

  /**
   * Update feature flags at runtime (for A/B testing, gradual rollout)
   */
  updateFeatureFlags(flags: Partial<VideoPlayerFeatureFlags>): void {
    this.featureFlags = {
      ...this.featureFlags,
      ...flags,
    };
  }

  /**
   * Get current feature flags (for debugging)
   */
  getFeatureFlags(): VideoPlayerFeatureFlags {
    return { ...this.featureFlags };
  }
}

/**
 * Singleton factory instance
 * Can be replaced with dependency injection if needed
 */
export const videoPlayerFactory = new VideoPlayerFactory();

/**
 * Hook for creating video players in React components
 */
export const useVideoPlayerFactory = (
  featureFlags?: Partial<VideoPlayerFeatureFlags>
): IVideoPlayerFactory => {
  // For now, return singleton
  // In future, could use React Context for DI
  if (featureFlags) {
    return new VideoPlayerFactory(featureFlags);
  }
  return videoPlayerFactory;
};

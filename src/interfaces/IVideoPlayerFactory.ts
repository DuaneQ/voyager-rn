/**
 * IVideoPlayerFactory Interface
 * 
 * Factory pattern for creating video player instances.
 * Follows Dependency Inversion Principle - depend on abstractions, not concretions.
 * Allows swapping player implementations without changing consuming code.
 */

import { IVideoPlayer, VideoPlayerConfig } from './IVideoPlayer';

export interface IVideoPlayerFactory {
  /**
   * Create a new video player instance
   * @param config - Player configuration
   * @returns Video player instance
   */
  createPlayer(config: VideoPlayerConfig): IVideoPlayer;

  /**
   * Get the implementation type (for debugging/logging)
   */
  readonly implementationType: 'expo-av' | 'expo-video' | 'web';
}

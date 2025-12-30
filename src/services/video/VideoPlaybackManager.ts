/**
 * VideoPlaybackManager - Centralized video playback coordinator
 * 
 * Ensures only one video plays at a time across the app, manages native player
 * lifecycle (load/unload), and prevents memory leaks on Android.
 * 
 * Based on React Native + expo-av best practices:
 * - Single active player to reduce native resource usage
 * - Aggressive unload of inactive players (Android memory management)
 * - Event-driven architecture for loose coupling
 * 
 * @see https://reactnative.dev/docs/optimizing-flatlist-configuration
 * @see https://docs.expo.dev/versions/latest/sdk/video/
 */

import { Platform } from 'react-native';
import { Video } from 'expo-av';

export type VideoPlayerRef = Video | null;

export interface VideoPlaybackRegistration {
  videoId: string;
  ref: VideoPlayerRef;
  onBecomeActive: () => Promise<void>;
  onBecomeInactive: () => Promise<void>;
}

export interface VideoPlaybackManagerEvents {
  onActiveVideoChanged?: (videoId: string | null) => void;
  onPlayerUnloaded?: (videoId: string) => void;
  onPlayerLoaded?: (videoId: string) => void;
}

/**
 * Centralized manager for video playback coordination.
 * Guarantees only one video is playing at a time.
 */
export class VideoPlaybackManager {
  private activeVideoId: string | null = null;
  private registrations: Map<string, VideoPlaybackRegistration> = new Map();
  private events: VideoPlaybackManagerEvents;
  private deactivating: Set<string> = new Set(); // Track videos currently being deactivated
  private isActivating: boolean = false; // Prevent concurrent activations

  constructor(events: VideoPlaybackManagerEvents = {}) {
    this.events = events;
  }

  /**
   * Register a video player instance with the manager.
   * Should be called when a VideoCard mounts or when ref becomes available.
   */
  register(registration: VideoPlaybackRegistration): void {
    console.debug(`[VideoPlaybackManager] Registering video: ${registration.videoId}`);
    this.registrations.set(registration.videoId, registration);
  }

  /**
   * Unregister a video player instance.
   * Should be called when a VideoCard unmounts.
   */
  unregister(videoId: string): void {
    console.debug(`[VideoPlaybackManager] Unregistering video: ${videoId}`);
    
    // If this was the active video, clear active state
    if (this.activeVideoId === videoId) {
      this.activeVideoId = null;
      this.events.onActiveVideoChanged?.(null);
    }
    
    this.registrations.delete(videoId);
  }

  /**
   * Request to make a video active (playing).
   * Will automatically deactivate the currently active video if different.
   * CRITICAL: Waits for deactivation to fully complete before activating new video.
   */
  async setActiveVideo(videoId: string): Promise<void> {
    console.debug(`[VideoPlaybackManager] setActiveVideo called for: ${videoId}`);
    
    // Prevent concurrent activation attempts
    if (this.isActivating) {
      console.debug(`[VideoPlaybackManager] Activation already in progress, queueing request`);
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 50));
      return this.setActiveVideo(videoId);
    }
    
    const registration = this.registrations.get(videoId);
    if (!registration) {
      console.warn(`[VideoPlaybackManager] Video ${videoId} not registered, ignoring`);
      return;
    }

    // If this video is already active, nothing to do
    if (this.activeVideoId === videoId) {
      console.debug(`[VideoPlaybackManager] Video ${videoId} already active`);
      return;
    }

    try {
      this.isActivating = true;
      
      // CRITICAL: Fully deactivate current video before activating new one
      if (this.activeVideoId !== null) {
        console.debug(`[VideoPlaybackManager] Waiting for deactivation to complete...`);
        await this.deactivateVideo(this.activeVideoId);
        // Extra safety: ensure audio is fully stopped
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Activate the new video
      console.debug(`[VideoPlaybackManager] Activating video: ${videoId}`);
      await registration.onBecomeActive();
      this.activeVideoId = videoId;
      this.events.onActiveVideoChanged?.(videoId);
      this.events.onPlayerLoaded?.(videoId);
    } catch (error) {
      console.error(`[VideoPlaybackManager] Error activating video ${videoId}:`, error);
    } finally {
      this.isActivating = false;
    }
  }

  /**
   * Deactivate a specific video (stop playback and unload).
   * Note: The onBecomeInactive callback now handles unloadAsync for both iOS and Android
   * to prevent audio leakage on iOS.
   */
  private async deactivateVideo(videoId: string): Promise<void> {
    // Prevent duplicate deactivation calls (race condition fix)
    if (this.deactivating.has(videoId)) {
      console.debug(`[VideoPlaybackManager] Video ${videoId} already deactivating, skipping`);
      return;
    }

    const registration = this.registrations.get(videoId);
    if (!registration) {
      console.debug(`[VideoPlaybackManager] Video ${videoId} not registered, skipping deactivate`);
      return;
    }

    try {
      this.deactivating.add(videoId); // Mark as deactivating
      console.debug(`[VideoPlaybackManager] Deactivating video: ${videoId}`);
      
      // CRITICAL: Try to mute immediately and synchronously to stop audio overlap
      try {
        if (registration.ref) {
          await registration.ref.setIsMutedAsync(true);
          console.debug(`[VideoPlaybackManager] Pre-emptively muted ${videoId}`);
        }
      } catch (err) {
        console.warn(`[VideoPlaybackManager] Could not pre-mute ${videoId}:`, err);
      }
      
      // The callback now handles mute → pause → stop → unload for both platforms
      await registration.onBecomeInactive();
      this.events.onPlayerUnloaded?.(videoId);
      
    } catch (error) {
      console.error(`[VideoPlaybackManager] Error deactivating video ${videoId}:`, error);
    } finally {
      this.deactivating.delete(videoId); // Clear deactivating flag
    }
  }

  /**
   * Deactivate all videos (useful when navigating away from video feed).
   * CRITICAL: Also immediately mutes all registered videos to stop audio instantly.
   */
  async deactivateAll(): Promise<void> {
    console.debug(`[VideoPlaybackManager] Deactivating all videos`);
    
    // CRITICAL: Immediately mute ALL registered videos to stop audio overlap
    // Do this synchronously before the async deactivation
    const mutePromises: Promise<void>[] = [];
    this.registrations.forEach((registration, videoId) => {
      if (registration.ref) {
        mutePromises.push(
          registration.ref.setIsMutedAsync(true).catch((err): void => {
            console.warn(`[VideoPlaybackManager] Failed to mute ${videoId}:`, err);
          }) as Promise<void>
        );
      }
    });
    
    // Wait for all mutes to complete (should be very fast)
    await Promise.all(mutePromises);
    
    if (this.activeVideoId) {
      await this.deactivateVideo(this.activeVideoId);
      this.activeVideoId = null;
      this.events.onActiveVideoChanged?.(null);
    }
  }

  /**
   * Get the currently active video ID.
   */
  getActiveVideoId(): string | null {
    return this.activeVideoId;
  }

  /**
   * Check if a specific video is currently active.
   */
  isVideoActive(videoId: string): boolean {
    return this.activeVideoId === videoId;
  }

  /**
   * Get count of registered videos.
   */
  getRegistrationCount(): number {
    return this.registrations.size;
  }

  /**
   * Cleanup all registrations (call this when component unmounts).
   */
  cleanup(): void {
    console.debug(`[VideoPlaybackManager] Cleaning up all registrations`);
    
    // Deactivate current video if any
    if (this.activeVideoId) {
      const videoId = this.activeVideoId;
      const registration = this.registrations.get(videoId);
      if (registration) {
        // Call deactivate callback synchronously during cleanup
        registration.onBecomeInactive().catch((error) => {
          console.error(`[VideoPlaybackManager] Error deactivating ${videoId} during cleanup:`, error);
        });
      }
      this.activeVideoId = null;
      this.events.onActiveVideoChanged?.(null);
    }
    
    this.registrations.clear();
  }
}

/**
 * Singleton instance for app-wide video playback coordination.
 * Can be replaced with React Context if needed for testing or advanced use cases.
 */
export const videoPlaybackManager = new VideoPlaybackManager({
  onActiveVideoChanged: (videoId) => {
    console.debug(`[VideoPlaybackManager] Active video changed to: ${videoId}`);
  },
  onPlayerUnloaded: (videoId) => {
    console.debug(`[VideoPlaybackManager] Player unloaded: ${videoId}`);
  },
  onPlayerLoaded: (videoId) => {
    console.debug(`[VideoPlaybackManager] Player loaded: ${videoId}`);
  },
});

/**
 * VideoPlaybackManager V2 - Modernized with Abstraction
 * 
 * Coordinates video playback using IVideoPlayer interface.
 * Follows Dependency Inversion Principle - depends on IVideoPlayer abstraction,
 * not concrete implementations.
 * 
 * IMPORTANT: This is the new implementation for expo-video migration.
 * The old VideoPlaybackManager.ts remains for backward compatibility during transition.
 */

import { Platform } from 'react-native';
import { IVideoPlayer } from '../../interfaces/IVideoPlayer';

export interface VideoPlaybackRegistrationV2 {
  videoId: string;
  player: IVideoPlayer; // Now uses interface instead of concrete ref
  onBecomeActive?: () => void;
  onBecomeInactive?: () => void;
}

export interface VideoPlaybackManagerEvents {
  onActiveVideoChanged?: (videoId: string | null) => void;
  onPlayerUnloaded?: (videoId: string) => void;
  onPlayerLoaded?: (videoId: string) => void;
}

/**
 * Centralized manager for video playback coordination V2
 * Guarantees only one video plays at a time.
 * 
 * Follows Single Responsibility Principle - only manages playback coordination.
 */
export class VideoPlaybackManagerV2 {
  private activeVideoId: string | null = null;
  private registrations: Map<string, VideoPlaybackRegistrationV2> = new Map();
  private events: VideoPlaybackManagerEvents;
  private deactivating: Set<string> = new Set();
  private isActivating: boolean = false;
  // Track if user has interacted with page (for web autoplay policy)
  private hasUserInteraction: boolean = false;

  constructor(events: VideoPlaybackManagerEvents = {}) {
    this.events = events;
    
    // On web, listen for user interaction to know when autoplay is allowed
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const markInteraction = () => {
        if (!this.hasUserInteraction) {
          // user interaction detected; removed debug log
          this.hasUserInteraction = true;
        }
      };
      // These events indicate user interaction
      window.addEventListener('click', markInteraction, { once: false, passive: true });
      window.addEventListener('touchstart', markInteraction, { once: false, passive: true });
      window.addEventListener('keydown', markInteraction, { once: false, passive: true });
    } else {
      // Native platforms don't have autoplay restrictions
      this.hasUserInteraction = true;
    }
  }

  /**
   * Register a video player instance with the manager.
   * Should be called when a VideoCard mounts.
   */
  register(registration: VideoPlaybackRegistrationV2): void {
    this.registrations.set(registration.videoId, registration);
  }

  /**
   * Unregister a video player instance.
   * Should be called when a VideoCard unmounts.
   */
  unregister(videoId: string): void {
    // debug log removed
    
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
  async setActiveVideo(videoId: string, retryCount: number = 0): Promise<void> {
    const MAX_RETRIES = 20; // 20 retries * 50ms = 1 second max wait
    
    // debug log removed
    
    // Prevent concurrent activation attempts with retry limit
    if (this.isActivating) {
      if (retryCount >= MAX_RETRIES) {
        console.error(`[VideoPlaybackManagerV2] Activation timeout after ${MAX_RETRIES} retries, forcing activation`);
        this.isActivating = false; // Force clear the flag
      } else {
        // debug log removed
        await new Promise(resolve => setTimeout(resolve, 50));
        return this.setActiveVideo(videoId, retryCount + 1);
      }
    }
    
    const registration = this.registrations.get(videoId);
    if (!registration) {
      console.warn(`[VideoPlaybackManagerV2] Video ${videoId} not registered, ignoring`);
      return;
    }

    // If this video is already active, ensure playback is started
    // (video may have been paused by user action or other events)
    if (this.activeVideoId === videoId) {
      // debug log removed
      // Simply call play() - the player handles the case where it's already playing
      try {
        await registration.player.play();
        // debug log removed
      } catch (e) {
        console.warn(`[VideoPlaybackManagerV2] Could not ensure playback for ${videoId}:`, e);
      }
      return;
    }

    try {
      this.isActivating = true;
      
      // CRITICAL: Fully deactivate current video before activating new one
      if (this.activeVideoId !== null) {
        // debug log removed
        await this.deactivateVideo(this.activeVideoId);
        // Extra safety: ensure audio is fully stopped
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Activate the new video using interface methods
      // debug log removed
      
      // Call lifecycle hook if provided
      registration.onBecomeActive?.();
      
      // Start playback
      // NOTE: Mute state is handled by the component (VideoCardV2) via isMuted prop.
      // On web, VideoFeedPage initializes with isMuted=true to comply with autoplay policy.
      // The manager should NOT override mute state - just coordinate play/pause.
      try {
        await registration.player.play();
        // debug log removed
      } catch (playError: any) {
        // On web, if autoplay fails (shouldn't happen if component set muted correctly),
        // log but don't crash - the user can tap to play
        console.error(`[VideoPlaybackManagerV2] Playback failed for ${videoId}:`, playError);
      }
      
      this.activeVideoId = videoId;
      this.events.onActiveVideoChanged?.(videoId);
      this.events.onPlayerLoaded?.(videoId);
      
      // debug log removed
    } catch (error) {
      console.error(`[VideoPlaybackManagerV2] Error activating video ${videoId}:`, error);
    } finally {
      this.isActivating = false;
    }
  }

  /**
   * Deactivate a specific video (stop playback).
   */
  private async deactivateVideo(videoId: string): Promise<void> {
    // Prevent duplicate deactivation calls (race condition fix)
    if (this.deactivating.has(videoId)) {
      // debug log removed
      return;
    }

    const registration = this.registrations.get(videoId);
    if (!registration) {
      return;
    }

    try {
      this.deactivating.add(videoId);
      
      // Mute immediately to stop audio overlap
      try {
        await registration.player.setMuted(true);
      } catch (err) {
        console.warn(`[VideoPlaybackManagerV2] Could not pre-mute ${videoId}:`, err);
      }
      
      // Pause playback
      await registration.player.pause();
      
      // Call lifecycle hook if provided
      registration.onBecomeInactive?.();
      
      this.events.onPlayerUnloaded?.(videoId);
      
      // debug log removed
    } catch (error) {
      console.error(`[VideoPlaybackManagerV2] Error deactivating video ${videoId}:`, error);
    } finally {
      this.deactivating.delete(videoId);
    }
  }

  /**
   * Deactivate all videos (useful when navigating away from video feed).
   */
  async deactivateAll(): Promise<void> {
    // debug log removed
    
    // Mute all videos immediately to stop audio
    const mutePromises: Promise<void>[] = [];
    this.registrations.forEach((registration) => {
      mutePromises.push(
        registration.player.setMuted(true).catch((err) => {
          console.warn(`[VideoPlaybackManagerV2] Failed to mute ${registration.videoId}:`, err);
        })
      );
    });
    
    await Promise.all(mutePromises);
    
    // Deactivate current video
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
  async cleanup(): Promise<void> {
    // debug log removed
    
    // Deactivate all
    await this.deactivateAll();
    
    // Release all players
    const releasePromises: Promise<void>[] = [];
    this.registrations.forEach((registration) => {
      releasePromises.push(
        registration.player.release().catch((error) => {
          console.error(`[VideoPlaybackManagerV2] Error releasing ${registration.videoId}:`, error);
        })
      );
    });
    
    await Promise.all(releasePromises);
    
    this.registrations.clear();
    // debug log removed
  }
}

/**
 * Singleton instance for app-wide video playback coordination V2.
 */
export const videoPlaybackManagerV2 = new VideoPlaybackManagerV2({
  onActiveVideoChanged: (videoId) => {},
  onPlayerUnloaded: (videoId) => {},
  onPlayerLoaded: (videoId) => {},
});

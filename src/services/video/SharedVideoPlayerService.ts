/**
 * SharedVideoPlayerService
 * 
 * Manages a SINGLE global VideoPlayer instance shared across all VideoCard components.
 * 
 * WHY THIS EXISTS:
 * expo-video has a GPU memory leak on Android (and possibly iOS). Each time we create
 * a new VideoPlayer, GPU textures (EGL mtrack) are allocated but NEVER freed, even
 * after calling player.release(). This causes OutOfMemoryError crashes.
 * 
 * SOLUTION:
 * Instead of creating/destroying players, we reuse ONE player and swap video sources
 * using player.replace(). This prevents GPU memory from accumulating.
 * 
 * EVIDENCE:
 * - Multi-player: EGL 4MB → 185MB (46x increase) = CRASH
 * - Single-player: EGL stays constant ~8-12MB = STABLE
 * 
 * OFFICIAL SUPPORT:
 * Expo documentation explicitly supports this pattern:
 * https://docs.expo.dev/versions/latest/sdk/video/#preloading-videos
 * 
 * "To start preloading, replace the player source with a video source 
 * using the replace() function."
 */

import { createVideoPlayer, VideoPlayer } from 'expo-video';
import { Platform } from 'react-native';

class SharedVideoPlayerService {
  private static player: VideoPlayer | null = null;
  private static currentVideoUrl: string | null = null;
  private static isInitialized: boolean = false;

  /**
   * Gets the shared VideoPlayer instance. Creates it on first call.
   * 
   * @returns The global VideoPlayer instance
   */
  static getPlayer(): VideoPlayer {
    if (!this.player) {
      console.log('🎬 [SharedVideoPlayer] Creating global player instance');
      
      // Create player with null source - we'll set source dynamically
      this.player = createVideoPlayer(null);
      
      // Configure player defaults
      this.player.loop = true;
      this.player.muted = false; // Default unmuted (TikTok/Reels behavior)
      
      if (Platform.OS === 'android') {
        // Android optimizations
        this.player.staysActiveInBackground = false;
      }
      
      this.isInitialized = true;
    }
    
    return this.player;
  }

  /**
   * Sets the active video by swapping the player source.
   * This is THE KEY METHOD that prevents GPU memory leaks.
   * 
   * CRITICAL FIX (Jan 20, 2026 - ITERATION 2): Use replaceAsync and AWAIT it!
   * 
   * Bug History:
   * - V1: Called play() immediately after replace() → old audio played
   * - V2: Added pause + 50ms setTimeout → still failed, audio desync persists
   * - V3: Use replaceAsync() and AWAIT completion → CORRECT!
   * 
   * Expo Docs Warning: "On iOS replace() loads synchronously on UI thread causing freezes.
   * Use replaceAsync to load asynchronously and avoid UI lags."
   * 
   * @param videoUrl URL of the video to play
   * @param muted Whether video should be muted
   */
  static async setActiveVideo(videoUrl: string, muted: boolean): Promise<void> {
    const timestamp = new Date().toISOString().substring(11, 23);
    const player = this.getPlayer();
    const videoId = videoUrl.substring(videoUrl.length - 20);
    
    console.log(`\n🎬 [${timestamp}] [SharedVideoPlayer] setActiveVideo called`);
    console.log(`   Current URL: ${this.currentVideoUrl?.substring(this.currentVideoUrl.length - 20) || 'null'}`);
    console.log(`   New URL:     ${videoId}`);
    console.log(`   Muted:       ${muted}`);
    console.log(`   Player state: playing=${player.playing}, muted=${player.muted}`);
    
    // Only replace if source actually changed
    if (this.currentVideoUrl !== videoUrl) {
      console.log(`🔄 [${timestamp}] [SharedVideoPlayer] Source CHANGED - starting swap sequence`);
      
      try {
        // CRITICAL: Pause BEFORE replacing to stop old audio
        console.log(`⏸️  [${timestamp}] [SharedVideoPlayer] STEP 1: Pausing old source`);
        player.pause();
        // Give pause time to take effect (it's async)
        await new Promise(resolve => setTimeout(resolve, 30));
        console.log(`   → Paused: playing=${player.playing}`);
        
        // KEY: Use replaceAsync and AWAIT it - ensures new source loads before playing
        console.log(`🔄 [${timestamp}] [SharedVideoPlayer] STEP 2: Calling replaceAsync()`);
        const replaceStart = Date.now();
        await player.replaceAsync(videoUrl);
        const replaceTime = Date.now() - replaceStart;
        console.log(`   → replaceAsync completed in ${replaceTime}ms`);
        
        this.currentVideoUrl = videoUrl;
        
        // CRITICAL FIX #8: Wait for sourceLoad event before calling play()
        // Hypothesis: play() fails if source isn't fully loaded yet
        console.log(`📥 [${timestamp}] [SharedVideoPlayer] STEP 3: Waiting for sourceLoad event`);
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.log(`   ⚠️  sourceLoad timeout - proceeding anyway`);
            listener.remove();
            resolve();
          }, 500); // 500ms max wait
          
          const listener = player.addListener('sourceLoad', (payload) => {
            clearTimeout(timeout);
            listener.remove();
            console.log(`   → sourceLoad fired: duration=${payload.duration}s`);
            resolve();
          });
        });
        
        // Now it's safe to play - source is fully loaded
        console.log(`▶️  [${timestamp}] [SharedVideoPlayer] STEP 4: Setting muted=${muted} and calling play()`);
        player.muted = muted;
        player.play();
        
        // Give play() time to take effect
        await new Promise(resolve => setTimeout(resolve, 50));
        console.log(`   → play() called, state after 50ms: playing=${player.playing}`);
        
        console.log(`✅ [${timestamp}] [SharedVideoPlayer] Swap complete - now playing ${videoId}\n`);
        
      } catch (error) {
        console.error(`❌ [${timestamp}] [SharedVideoPlayer] Error replacing source:`, error);
        // If replaceAsync fails, try creating new source
        console.log(`🔧 [${timestamp}] [SharedVideoPlayer] FALLBACK: Creating new player`);
        this.player = createVideoPlayer(videoUrl);
        this.currentVideoUrl = videoUrl;
        player.muted = muted;
        player.play();
      }
    } else {
      console.log(`▶️  [${timestamp}] [SharedVideoPlayer] Same source - just unmute/play`);
      console.log(`   Before: playing=${player.playing}, muted=${player.muted}`);
      // Same source, just update mute and play
      player.muted = muted;
      player.play();
      await new Promise(resolve => setTimeout(resolve, 30));
      console.log(`   After:  playing=${player.playing}, muted=${player.muted}\n`);
    }
  }

  /**
   * Pauses the shared player (called when no video is active)
   */
  static pause(): void {
    const timestamp = new Date().toISOString().substring(11, 23);
    const player = this.getPlayer();
    const videoId = this.currentVideoUrl?.substring(this.currentVideoUrl.length - 20) || 'null';
    console.log(`⏸️  [${timestamp}] [SharedVideoPlayer] pause() called for ${videoId}`);
    try {
      player.pause();
      console.log(`   → Paused successfully: playing=${player.playing}`);
    } catch (error) {
      console.error(`❌ [${timestamp}] [SharedVideoPlayer] Error pausing:`, error);
    }
  }

  /**
   * Updates the mute state of the shared player
   * 
   * @param muted Whether to mute the player
   */
  static setMuted(muted: boolean): void {
    const player = this.getPlayer();
    player.muted = muted;
  }

  /**
   * Gets the current mute state
   * 
   * @returns Whether the player is currently muted
   */
  static isMuted(): boolean {
    return this.getPlayer().muted;
  }

  /**
   * Gets the current playing state
   * 
   * @returns Whether the player is currently playing
   */
  static isPlaying(): boolean {
    return this.getPlayer().playing;
  }

  /**
   * Toggles play/pause (for user interaction)
   */
  static togglePlayPause(): void {
    const player = this.getPlayer();
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  /**
   * Gets the current video URL
   * 
   * @returns The URL of the currently loaded video
   */
  static getCurrentVideoUrl(): string | null {
    return this.currentVideoUrl;
  }

  /**
   * CRITICAL: This should RARELY be called. 
   * Only call when permanently closing video features.
   * 
   * In normal operation, we NEVER release the player - that's the whole point!
   */
  static release(): void {
    if (this.player) {
      console.log('⚠️  [SharedVideoPlayer] Releasing global player (should be RARE)');
      try {
        this.player.release();
      } catch (error) {
        console.error('❌ [SharedVideoPlayer] Error releasing:', error);
      }
      this.player = null;
      this.currentVideoUrl = null;
      this.isInitialized = false;
    }
  }

  /**
   * Reset for testing purposes
   */
  static resetForTesting(): void {
    this.release();
  }
}

export default SharedVideoPlayerService;

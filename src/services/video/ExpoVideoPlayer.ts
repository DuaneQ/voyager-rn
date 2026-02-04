/**
 * ExpoVideoPlayer Implementation
 * 
 * Wraps expo-video's VideoPlayer to implement IVideoPlayer interface.
 * Follows Single Responsibility Principle - only handles expo-video integration.
 */

import { VideoPlayer } from 'expo-video';
import { IVideoPlayer, VideoPlayerStatus, VideoPlayerConfig } from '../../interfaces/IVideoPlayer';

export class ExpoVideoPlayer implements IVideoPlayer {
  private player: VideoPlayer;
  private statusListeners: Set<(status: VideoPlayerStatus) => void> = new Set();
  private _id: string;
  private _isPlaying: boolean = false;
  private _isMuted: boolean = false;
  private _isLoading: boolean = true;
  private _currentTime: number = 0;
  private _duration: number = 0;
  private _isReleased: boolean = false;
  private subscriptions: any[] = [];

  constructor(config: VideoPlayerConfig) {
    this._id = `expo-video-${Date.now()}-${Math.random()}`;
    
    // Create player with initial configuration
    const { createVideoPlayer } = require('expo-video');
    this.player = createVideoPlayer(config.videoUrl);
    
    // Set initial properties
    this.player.loop = config.loop ?? true;
    this.player.muted = config.muted ?? false;
    this._isMuted = config.muted ?? false;
    
    // NOTE: Buffer options were removed after testing showed they cause HTTP 416 errors
    // with Firebase Storage. Some videos don't support range requests properly.
    // Let expo-video use its default buffer configuration.
    // Previous attempt: maxBufferBytes: 5_000_000 caused "Range Not Satisfiable" errors
    // See: https://github.com/google/ExoPlayer/issues/8474
    // debug logs removed
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Auto-play if configured
    if (config.autoPlay) {
      this.play().catch(err => {
        console.error('[ExpoVideoPlayer] Auto-play error:', err);
      });
    }
  }

  private setupEventListeners(): void {
    try {
      // Listen for playing state changes
      const playingSub = this.player.addListener('playingChange', ({ isPlaying }) => {
        this._isPlaying = isPlaying;
        this.notifyListeners();
      });
      this.subscriptions.push(playingSub);

      // Listen for status changes
      const statusSub = this.player.addListener('statusChange', ({ status, error }) => {
        this._isLoading = status === 'loading';
        
        // status change handled silently; diagnostic logs removed
        
        if (error) {
          // Enhanced error logging with full error details
          console.error(`[ExpoVideoPlayer] ERROR for ${this._id}:`, {
            errorMessage: error.message,
            status: status,
            duration: this._duration,
            currentTime: this._currentTime,
            // Include full error object for debugging
            fullError: JSON.stringify(error, null, 2),
          });
          this.notifyListeners({ error: error.message });
        } else {
          this.notifyListeners();
        }
      });
      this.subscriptions.push(statusSub);

      // Listen for time updates
      const timeSub = this.player.addListener('timeUpdate', ({ currentTime }) => {
        this._currentTime = currentTime;
        this.notifyListeners();
      });
      this.subscriptions.push(timeSub);

      // Listen for source load (to get duration and check format support)
      const sourceSub = this.player.addListener('sourceLoad', (event: any) => {
        const { duration, availableVideoTracks } = event;
        this._duration = duration;
        this._isLoading = false;
        
        // Source loaded; diagnostic logs removed
        
        // Check if video format is supported by device (Android only)
        // This helps catch MediaCodecVideoRenderer errors before they happen
        const { Platform } = require('react-native');
        if (Platform.OS === 'android' && availableVideoTracks?.length > 0) {
          const videoTrack = availableVideoTracks[0];
          // Video track details available; diagnostic logs removed
          
          // Warn if format is not supported - this will cause MediaCodecVideoRenderer error
          if (videoTrack.isSupported === false) {
            console.error(`[ExpoVideoPlayer] UNSUPPORTED FORMAT for ${this._id}:`, {
              mimeType: videoTrack.mimeType,
              size: videoTrack.size,
              bitrate: videoTrack.bitrate,
            });
            // Notify listeners of the unsupported format error
            this.notifyListeners({ 
              error: `Video format not supported by this device (${videoTrack.mimeType}, ${videoTrack.size?.width}x${videoTrack.size?.height})` 
            });
            return;
          }
        }
        
        this.notifyListeners();
      });
      this.subscriptions.push(sourceSub);

      // Listen for mute changes
      const mutedSub = this.player.addListener('mutedChange', ({ muted }) => {
        this._isMuted = muted;
        this.notifyListeners();
      });
      this.subscriptions.push(mutedSub);
    } catch (error) {
      console.error('[ExpoVideoPlayer] Error setting up listeners:', error);
    }
  }

  private notifyListeners(overrides?: Partial<VideoPlayerStatus>): void {
    const status: VideoPlayerStatus = {
      isPlaying: this._isPlaying,
      isMuted: this._isMuted,
      isLoading: this._isLoading,
      isBuffering: false, // expo-video doesn't expose buffering state directly
      currentTime: this._currentTime,
      duration: this._duration,
      ...overrides,
    };

    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[ExpoVideoPlayer] Listener error:', error);
      }
    });
  }

  // IVideoPlayer interface implementation

  get id(): string {
    return this._id;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  get duration(): number {
    return this._duration;
  }

  /**
   * Track if playback was blocked by browser autoplay policy.
   * This allows UI to show "tap to play" overlay on web.
   */
  private _isAutoplayBlocked: boolean = false;
  
  get isAutoplayBlocked(): boolean {
    return this._isAutoplayBlocked;
  }

  async play(): Promise<void> {
    // debug logs removed
    if (this._isReleased) {
      console.warn(`[ExpoVideoPlayer] Cannot play - player ${this._id} already released`);
      return;
    }
    try {
      await this.player.play();
      this._isAutoplayBlocked = false;
    } catch (error: any) {
      // Handle browser autoplay policy (NotAllowedError)
      // This happens when trying to play with sound before user interaction
      if (error?.name === 'NotAllowedError' || 
          (error?.message && error.message.includes("user didn't interact"))) {
        console.warn(`[ExpoVideoPlayer] Autoplay blocked on ${this._id} - user interaction required`);
        this._isAutoplayBlocked = true;
        // Notify listeners about the autoplay block
        this.notifyListeners({ autoplayBlocked: true });
        // Don't throw - this is expected behavior on web
        return;
      }
      console.error(`[ExpoVideoPlayer] Play error on ${this._id}:`, error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    // debug logs removed
    if (this._isReleased) {
      console.warn(`[ExpoVideoPlayer] Cannot pause - player ${this._id} already released`);
      return;
    }
    try {
      await this.player.pause();
      // debug logs removed
    } catch (error) {
      console.error(`[ExpoVideoPlayer] Pause error on ${this._id}:`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this._isReleased) {
      console.warn('[ExpoVideoPlayer] Cannot stop - player already released');
      return;
    }
    try {
      this.player.pause();
      this.player.currentTime = 0;
    } catch (error) {
      console.error('[ExpoVideoPlayer] Stop error:', error);
      throw error;
    }
  }

  async seek(timeInSeconds: number): Promise<void> {
    if (this._isReleased) {
      console.warn('[ExpoVideoPlayer] Cannot seek - player already released');
      return;
    }
    try {
      this.player.currentTime = timeInSeconds;
    } catch (error) {
      console.error('[ExpoVideoPlayer] Seek error:', error);
      throw error;
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    if (this._isReleased) {
      console.warn('[ExpoVideoPlayer] Cannot set muted - player already released');
      return;
    }
    try {
      this.player.muted = muted;
    } catch (error) {
      console.error('[ExpoVideoPlayer] Set muted error:', error);
      throw error;
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (this._isReleased) {
      console.warn('[ExpoVideoPlayer] Cannot set volume - player already released');
      return;
    }
    try {
      this.player.volume = Math.max(0, Math.min(1, volume));
    } catch (error) {
      console.error('[ExpoVideoPlayer] Set volume error:', error);
      throw error;
    }
  }

  async setLooping(loop: boolean): Promise<void> {
    try {
      this.player.loop = loop;
    } catch (error) {
      console.error('[ExpoVideoPlayer] Set looping error:', error);
      throw error;
    }
  }

  async release(): Promise<void> {
    // debug logs removed
    if (this._isReleased) {
      console.warn(`[ExpoVideoPlayer] Player ${this._id} already released`);
      return;
    }
    
    try {
      // debug logs removed
      this._isReleased = true;
      
      // Remove all listeners
      // debug logs removed
      this.subscriptions.forEach(sub => {
        try {
          sub.remove();
        } catch (err) {
          console.error(`[ExpoVideoPlayer] Error removing subscription for ${this._id}:`, err);
        }
      });
      this.subscriptions = [];
      this.statusListeners.clear();
      
      // Release player
      this.player.release();
    } catch (error) {
      console.error(`[ExpoVideoPlayer] Release error for ${this._id}:`, error);
    }
  }

  addStatusListener(listener: (status: VideoPlayerStatus) => void): () => void {
    this.statusListeners.add(listener);
    
    // Immediately notify with current status
    this.notifyListeners();
    
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Get the underlying expo-video player instance
   * Used by VideoView component
   */
  getPlayer(): VideoPlayer {
    return this.player;
  }
}

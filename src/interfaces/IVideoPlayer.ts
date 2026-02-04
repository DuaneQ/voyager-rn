/**
 * IVideoPlayer Interface
 * 
 * Defines the contract for video player implementations.
 * Follows Interface Segregation Principle - small, focused interface.
 * Allows different implementations (expo-av, expo-video) to be used interchangeably.
 */

export interface IVideoPlayer {
  /**
   * Unique identifier for this player instance
   */
  readonly id: string;

  /**
   * Current playback state
   */
  readonly isPlaying: boolean;

  /**
   * Current mute state
   */
  readonly isMuted: boolean;

  /**
   * Whether the player is currently loading
   */
  readonly isLoading: boolean;

  /**
   * Current playback position in seconds
   */
  readonly currentTime: number;

  /**
   * Total duration in seconds
   */
  readonly duration: number;

  /**
   * Start or resume playback
   */
  play(): Promise<void>;

  /**
   * Pause playback
   */
  pause(): Promise<void>;

  /**
   * Stop playback and reset position
   */
  stop(): Promise<void>;

  /**
   * Seek to a specific time
   * @param timeInSeconds - Position to seek to
   */
  seek(timeInSeconds: number): Promise<void>;

  /**
   * Set mute state
   * @param muted - Whether to mute
   */
  setMuted(muted: boolean): Promise<void>;

  /**
   * Set volume (0.0 to 1.0)
   * @param volume - Volume level
   */
  setVolume(volume: number): Promise<void>;

  /**
   * Set whether video should loop
   * @param loop - Whether to loop
   */
  setLooping(loop: boolean): Promise<void>;

  /**
   * Release resources and cleanup
   * CRITICAL: Must be called when player is no longer needed
   */
  release(): Promise<void>;

  /**
   * Add listener for playback status changes
   * @param listener - Callback for status updates
   * @returns Unsubscribe function
   */
  addStatusListener(listener: (status: VideoPlayerStatus) => void): () => void;
}

/**
 * Video player status
 */
export interface VideoPlayerStatus {
  isPlaying: boolean;
  isMuted: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  error?: string;
  /**
   * True when browser autoplay policy blocked playback.
   * User interaction is required to start playback.
   * Only relevant on web platform.
   */
  autoplayBlocked?: boolean;
}

/**
 * Video player configuration
 */
export interface VideoPlayerConfig {
  videoUrl: string;
  loop?: boolean;
  muted?: boolean;
  autoPlay?: boolean;
}

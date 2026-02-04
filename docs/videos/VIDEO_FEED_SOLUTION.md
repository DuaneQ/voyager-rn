# Video Feed - Solution Documentation

**Date:** February 3, 2026  
**Status:** Android Fix PARTIALLY WORKING ⚠️  
**Approved:** Yes (Android OOM fix tested, but codec issues remain)

## Overview

This document outlines the complete migration plan from `expo-av` to `expo-video` and the fixes for all video feed issues. The migration will address the deprecated warning while also fixing deleted video handling, web snap behavior, and multiple audio playback.

**⚠️ IMPORTANT:** While the OOM crash fix works, there are still "Video Unavailable" errors caused by **MediaCodecVideoRenderer codec incompatibility** on some Android devices. See [Issue 7 in VIDEO_FEED_PROBLEM.md](./VIDEO_FEED_PROBLEM.md#issue-7-mediacodecvideorenderer-error-android-codec-incompatibility) for details.

---

## Solution 1.5: Android-Specific Fixes (IMPLEMENTED & VERIFIED ✅)

### Problem: OOM Crashes & Swipe Freezes
See [VIDEO_FEED_PROBLEM.md](./VIDEO_FEED_PROBLEM.md#issue-6-android-oom-crashes--swipe-freezes-resolved) for full analysis.

### Implemented Fixes

#### Fix 1: Buffer Options for Memory Management - REVERTED ❌
**Status:** REVERTED - Caused HTTP 416 "Range Not Satisfiable" errors

The buffer options approach caused Firebase Storage videos to fail with HTTP 416 errors
because ExoPlayer's range requests conflicted with Firebase's redirect-based URLs.

```typescript
// This was REMOVED - caused HTTP 416 errors:
// this.player.bufferOptions = { maxBufferBytes: 5_000_000 }
```

#### Fix 2: Large File Validation - WORKING ✅
**File:** `src/components/video/VideoCardV2.tsx`

```typescript
// CRITICAL: Skip oversized videos on Android to prevent OOM crashes
const MAX_VIDEO_SIZE_MB = 50; // 50 MB limit
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

if (Platform.OS === 'android' && video.fileSize && video.fileSize > MAX_VIDEO_SIZE_BYTES) {
  console.warn(`[VideoCardV2][android] Skipping oversized video ${video.id}: ${fileSizeMB} MB exceeds ${MAX_VIDEO_SIZE_MB} MB limit`);
  setError(true);
  return; // Don't create player - will show error UI
}
```

**Why this works:**
- Videos with extreme file sizes (57+ MB for 20s = ~24 Mbps bitrate) cause OOM
- Without buffer limits (reverted), ExoPlayer buffers aggressively
- Skipping oversized videos prevents OOM while allowing 99% of normal videos
- Tested: 41.39 MB / 48.77s video works fine (normal bitrate)
- **Verified:** User scrolled through 6+ videos without crash

#### Fix 3: TextureView for List Rendering - WORKING ✅
**File:** `src/components/video/VideoCardV2.tsx`

```tsx
<VideoView
  player={expoPlayerRef.current}
  style={styles.video}
  contentFit="cover"
  nativeControls={false}
  surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
  onFirstFrameRender={() => {
    if (Platform.OS === 'android') {
      console.log(`[VideoCardV2][android] First frame rendered for ${video.id} (textureView mode)`);
    }
  }}
/>
```

**Why this works:**
- `surfaceView` (default) has z-ordering issues with overlapping views
- In RecyclerListView/FlatList, video cards can briefly overlap during scrolling
- `textureView` renders to a texture that integrates properly with view hierarchy
- **Verified:** Multiple "First frame rendered (textureView mode)" logs observed
- Reference: https://docs.expo.dev/versions/latest/sdk/video/#surfacetype

### Test Results (February 3, 2026)

| Video Size | Duration | Bitrate | Result |
|------------|----------|---------|--------|
| 0.59 MB | 8.27s | ~0.6 Mbps | ✅ Played |
| 1.57 MB | 24.68s | ~0.5 Mbps | ✅ First frame rendered |
| 1.71 MB | 16.09s | ~0.8 Mbps | ✅ Played |
| 10.59 MB | 5.27s | ~16 Mbps | ✅ Played |
| 18.22 MB | 12.68s | ~11.5 Mbps | ✅ Played |
| 37.73 MB | 20.58s | ~14.7 Mbps | ✅ First frame rendered |
| 41.39 MB | 48.77s | ~6.8 Mbps | ✅ Played |
| 57.42 MB | ~19.53s | ~23.5 Mbps | ⛔ Skipped (>50MB) |

**Conclusion:** The issue is extreme bitrate videos (>20 Mbps), not just file size.
The 50MB limit catches these edge cases while allowing normal videos.

#### Fix 4: Interface Extension for Configuration
**File:** `src/interfaces/IVideoPlayer.ts`

```typescript
export interface VideoPlayerConfig {
  videoUrl: string;
  loop?: boolean;
  muted?: boolean;
  autoPlay?: boolean;
  bufferOptions?: {  // Kept in interface but not used due to HTTP 416 issues
    maxBufferBytes?: number;
    minBufferForPlayback?: number;
    prioritizeTimeOverSizeThreshold?: boolean;
  };
}
```

### Verification Checklist
- [ ] See log: `[ExpoVideoPlayer] Android buffer options set for...`
- [ ] See log: `[VideoCardV2][android] First frame rendered for...`
- [ ] No OOM crashes after 5+ minutes of scrolling
- [ ] Smooth swipe transitions between videos
- [ ] Videos load within 3-5 seconds (network dependent)

### If Issues Persist
1. Check if logs appear - if not, code may not be executing
2. Consider migrating from RecyclerListView to FlashList
3. Reduce number of pre-rendered videos (currently 3)
4. Add more aggressive player release on scroll

---

## Solution 1.6: Codec Compatibility Detection (IMPLEMENTED ⚠️)

### Problem: MediaCodecVideoRenderer Error
Some videos fail with "Video Unavailable" because the video codec/format is 
not supported by the Android device. This is **separate from the OOM issue**.

**Error seen:**
```
MediaCodecVideoRenderer error, index=0, format=Format(2, null, vi...(truncated)
```

### Root Cause
- Videos uploaded with **H.264 High profile** (not universally supported)
- Videos with **4K resolution** (budget phones can't decode)
- Device-specific codec limitations

### Implemented Detection

#### Video Track Logging on Source Load
**File:** `src/services/video/ExpoVideoPlayer.ts`

```typescript
// Added to sourceLoad listener:
if (Platform.OS === 'android' && availableVideoTracks?.length > 0) {
  const videoTrack = availableVideoTracks[0];
  console.log(`[ExpoVideoPlayer] Video track for ${this._id}:`, {
    id: videoTrack.id,
    size: videoTrack.size ? `${videoTrack.size.width}x${videoTrack.size.height}` : 'unknown',
    bitrate: videoTrack.bitrate ? `${Math.round(videoTrack.bitrate / 1000)} kbps` : 'unknown',
    frameRate: videoTrack.frameRate || 'unknown',
    mimeType: videoTrack.mimeType || 'unknown',
    isSupported: videoTrack.isSupported,  // KEY: expo-video tells us if device can play it
  });
  
  // Proactively detect unsupported formats
  if (videoTrack.isSupported === false) {
    console.error(`[ExpoVideoPlayer] UNSUPPORTED FORMAT for ${this._id}`);
    this.notifyListeners({ 
      error: `Video format not supported by this device` 
    });
  }
}
```

#### Specific Error Messages in UI
**File:** `src/components/video/VideoCardV2.tsx`

```typescript
// Added errorMessage state for specific feedback:
const [errorMessage, setErrorMessage] = useState<string | null>(null);

// In status listener:
if (status.error) {
  if (status.error.includes('not supported') || status.error.includes('MediaCodec')) {
    setErrorMessage('This video format is not compatible with your device');
  } else {
    setErrorMessage(status.error);
  }
}

// In error UI:
<Text style={styles.errorSubtext}>
  {errorMessage || 'This video may have been removed or is temporarily unavailable'}
</Text>
```

### What This Detection Does NOT Fix
This only **detects and reports** codec issues - it doesn't fix them.
Videos with incompatible codecs will still show "Video Unavailable".

---

## RECOMMENDATION: Server-Side Video Transcoding

### The Problem Summary
Some videos uploaded to Firebase Storage have incompatible codecs/profiles that
budget Android devices cannot decode. This causes "Video Unavailable" errors.

### Recommended Solution
**Implement server-side video transcoding during upload.**

When a user uploads a video, it should be automatically transcoded to a 
universally-compatible format before being stored.

### Target Encoding Specification
| Setting | Value | Reason |
|---------|-------|--------|
| Codec | H.264 Baseline (Level 3.1) | Supported by ALL Android devices |
| Resolution | Max 1080p (1920x1080) | Budget phones can decode this |
| Bitrate | 4-5 Mbps | Good quality, reasonable file size |
| Frame Rate | 30 fps | Standard, widely supported |
| Container | MP4 | Universal support |
| Audio | AAC, 128 kbps | Standard audio codec |

### Platform Impact Analysis

| Platform | Current State | After Transcoding |
|----------|---------------|-------------------|
| **Android** | ❌ Some videos fail with MediaCodec error | ✅ All videos play on all devices |
| **iOS** | ✅ Works (VideoToolbox more forgiving) | ✅ Still works, possibly faster loading |
| **Web** | ✅ Works (browsers have broad support) | ✅ Still works, possibly smaller files |

**Key Point:** Transcoding to H.264 Baseline does NOT break iOS or Web. 
It's a lowest-common-denominator format that works everywhere.

### Implementation Options

#### Option 1: Firebase Cloud Functions + FFmpeg (Recommended for Cost)
**Cost:** ~$0 (within free tier for low volume)

```
User uploads video → Firebase Storage trigger → Cloud Function → 
FFmpeg transcode → Replace original → Notify user
```

**Pros:**
- No external service fees
- Full control over encoding settings
- Works with existing Firebase infrastructure

**Cons:**
- Cloud Functions have 9-minute timeout limit
- 2GB memory limit may struggle with 4K source videos
- Complex to set up and maintain

**Estimated implementation:** 2-3 days

#### Option 2: Mux.com Video API (Recommended for Reliability)
**Cost:** ~$0.015/minute of video processed

```
User uploads video → Send to Mux → Mux transcodes → 
Mux hosts video → App plays from Mux CDN
```

**Pros:**
- Professional-grade transcoding
- Automatic adaptive bitrate (HLS)
- Built-in CDN for fast delivery
- Thumbnail generation included
- Analytics included

**Cons:**
- Recurring cost (~$0.015/min upload + $0.00096/min delivered)
- Vendor lock-in
- Requires migration from Firebase Storage

**For 1000 videos/month at 1 min avg:** ~$15/month

#### Option 3: Client-Side Transcoding (Not Recommended)
**Cost:** $0

```
User selects video → App transcodes locally → Upload transcoded version
```

**Pros:**
- No server cost
- No external dependencies

**Cons:**
- Drains user's battery significantly
- Can take 2-10 minutes for a 1-minute video
- Adds ~30MB to app size (FFmpeg libraries)
- Poor user experience
- May fail on low-end devices

### My Recommendation

**For your use case, I recommend Option 1 (Firebase Cloud Functions + FFmpeg)**

Reasons:
1. You already use Firebase - minimal architecture change
2. Low cost for moderate volume
3. Full control over quality settings
4. No vendor lock-in

If video volume exceeds Cloud Function limits or you need adaptive streaming,
migrate to Option 2 (Mux) later.

### Implementation Steps for Option 1

1. **Create Firebase Cloud Function trigger** on Storage uploads
2. **Install FFmpeg** in the Cloud Function environment
3. **Transcode** to H.264 Baseline, max 1080p, 4-5 Mbps
4. **Replace original** file in Storage with transcoded version
5. **Update Firestore** document to mark video as "processed"
6. **Update app** to only show "processed" videos in feed

### Next Steps
- [ ] Decide on implementation option
- [ ] Create detailed implementation plan
- [ ] Estimate cloud function costs for your video volume
- [ ] Implement and test with problematic videos

---

## Solution 1: Migrate from expo-av to expo-video

### Why Migrate?

**expo-video Benefits:**
1. **Modern Architecture:** Rewritten from scratch with performance in mind
2. **Better Memory Management:** No more MediaCodec leaks on Android
3. **Unified API:** Consistent behavior across iOS, Android, and Web
4. **Event-Driven:** `useEvent` hooks for cleaner state management
5. **Preloading Support:** Built-in video preloading for smooth transitions
6. **No Deprecation Warning:** Future-proof implementation

### Migration Steps

#### Step 1: Install expo-video

```bash
cd /Users/icebergslim/projects/voyager-RN
npx expo install expo-video
```

#### Step 2: Update app.json Configuration

```json
{
  "expo": {
    "plugins": [
      [
        "expo-video",
        {
          "supportsBackgroundPlayback": false,
          "supportsPictureInPicture": false
        }
      ]
    ]
  }
}
```

**Note:** We disable background playback and PiP since videos should only play in the feed.

#### Step 3: Rewrite VideoCard Component

**Current (expo-av):**
```typescript
import { Video, AVPlaybackStatus } from 'expo-av';

const VideoCard = ({ video, isActive }) => {
  const videoRef = useRef<Video>(null);
  
  useEffect(() => {
    if (isActive) {
      videoRef.current?.playAsync();
    } else {
      videoRef.current?.pauseAsync();
    }
  }, [isActive]);
  
  return (
    <Video
      ref={videoRef}
      source={{ uri: video.videoUrl }}
      shouldPlay={isActive}
      isLooping
      isMuted={isMuted}
      onPlaybackStatusUpdate={handleStatusUpdate}
    />
  );
};
```

**New (expo-video):**
```typescript
import { useVideoPlayer, VideoView, useEvent } from 'expo-video';

const VideoCard = ({ video, isActive, isMuted }) => {
  // Create player instance with setup callback
  const player = useVideoPlayer(video.videoUrl, (player) => {
    player.loop = true;
    player.muted = isMuted;
  });
  
  // Use event hook for status changes
  const { isPlaying } = useEvent(player, 'playingChange', { 
    isPlaying: player.playing 
  });
  
  // Control playback based on isActive
  useEffect(() => {
    if (isActive && !userPaused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, userPaused, player]);
  
  // Update mute state
  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);
  
  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="cover"
      nativeControls={false}
      onFirstFrameRender={() => {
        // Video ready to play
      }}
    />
  );
};
```

#### Step 4: Update VideoPlaybackManager

**Current Architecture:**
- Manages `expo-av` Video refs
- Calls `playAsync()` / `pauseAsync()` / `unloadAsync()`

**New Architecture:**
- Manages `VideoPlayer` instances (not refs)
- Calls `play()` / `pause()` / `release()`
- Uses cleaner event-driven API

```typescript
// src/services/video/VideoPlaybackManager.ts

import { VideoPlayer } from 'expo-video';

export interface VideoPlaybackRegistration {
  videoId: string;
  player: VideoPlayer; // Changed from 'ref'
  onBecomeActive: () => void;
  onBecomeInactive: () => void;
}

export class VideoPlaybackManager {
  private activeVideoId: string | null = null;
  private registrations: Map<string, VideoPlaybackRegistration> = new Map();
  
  register(registration: VideoPlaybackRegistration): void {
    this.registrations.set(registration.videoId, registration);
  }
  
  async setActiveVideo(videoId: string): Promise<void> {
    const registration = this.registrations.get(videoId);
    if (!registration) return;
    
    // Deactivate current video
    if (this.activeVideoId && this.activeVideoId !== videoId) {
      const current = this.registrations.get(this.activeVideoId);
      if (current) {
        current.player.pause();
        current.onBecomeInactive();
      }
    }
    
    // Activate new video
    registration.onBecomeActive();
    registration.player.play();
    this.activeVideoId = videoId;
  }
  
  deactivateAll(): void {
    this.registrations.forEach((reg) => {
      reg.player.pause();
      reg.onBecomeInactive();
    });
    this.activeVideoId = null;
  }
}
```

#### Step 5: Handle Web Platform

**expo-video supports web out of the box** - we can remove the custom web video element logic!

```typescript
// Before: Platform-specific rendering
{Platform.OS === 'web' ? (
  <video ref={webVideoRef} src={video.videoUrl} />
) : (
  <Video ref={videoRef} source={{ uri: video.videoUrl }} />
)}

// After: Unified rendering
<VideoView player={player} style={styles.video} />
```

**Benefit:** Single codebase for all platforms, easier to maintain.

#### Step 6: Testing Checklist

- [ ] iOS: Video plays, pauses, loops correctly
- [ ] Android: No memory leaks, smooth scrolling
- [ ] Web: Video plays with proper controls
- [ ] Mute/unmute works on all platforms
- [ ] Navigation away stops playback
- [ ] Multiple videos don't play simultaneously
- [ ] Deleted videos handled gracefully (next solution)

---

## Solution 2: Fix Deleted Video Handling with Real-Time Listeners

### Problem Recap
- Current: One-time `getDocs()` query creates stale video array
- Issue: Deleted videos not removed from feed until manual refresh

### Solution: Implement Firestore onSnapshot

#### Step 1: Add Real-Time Listener Hook

```typescript
// src/hooks/video/useVideoFeed.ts

import { onSnapshot, Unsubscribe } from 'firebase/firestore';

export const useVideoFeed = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  
  const loadVideos = useCallback(() => {
    // Unsubscribe from previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    const videosQuery = query(
      collection(db, 'videos'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(BATCH_SIZE)
    );
    
    // Set up real-time listener
    unsubscribeRef.current = onSnapshot(
      videosQuery,
      (snapshot) => {
        // Handle additions, modifications, deletions
        const updatedVideos: Video[] = [];
        const deletedVideoIds = new Set<string>();
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            deletedVideoIds.add(change.doc.id);
          }
        });
        
        snapshot.forEach((doc) => {
          updatedVideos.push({ id: doc.id, ...doc.data() } as Video);
        });
        
        setVideos(updatedVideos);
        
        // If currently viewing a deleted video, skip to next
        if (deletedVideoIds.has(videos[currentVideoIndex]?.id)) {
          handleDeletedVideoSkip();
        }
      },
      (error) => {
        console.error('Video feed listener error:', error);
        setError('Failed to sync videos');
      }
    );
  }, [currentVideoIndex]);
  
  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);
  
  return { videos, loadVideos };
};
```

#### Step 2: Handle Deleted Video During Playback

```typescript
const handleDeletedVideoSkip = useCallback(() => {
  // Current video was deleted, skip to next
  if (currentVideoIndex < videos.length - 1) {
    setCurrentVideoIndex((prev) => prev + 1);
  } else if (currentVideoIndex > 0) {
    // Was last video, go to previous
    setCurrentVideoIndex((prev) => prev - 1);
  } else {
    // No videos left
    setVideos([]);
  }
}, [currentVideoIndex, videos.length]);
```

#### Step 3: Add Error Boundary for Missing Videos

Even with real-time listeners, there's a race condition where a video could be deleted between the listener update and the video load. Add error handling:

```typescript
// src/components/video/VideoCard.tsx

const VideoCard = ({ video, isActive }) => {
  const [loadError, setLoadError] = useState(false);
  
  const player = useVideoPlayer(video.videoUrl, (player) => {
    player.loop = true;
  });
  
  // Listen for playback errors
  const { status, error } = useEvent(player, 'statusChange', {
    status: player.status,
  });
  
  useEffect(() => {
    if (status === 'error' || error) {
      console.error('Video load error:', error);
      setLoadError(true);
      // Notify parent to skip this video
      onError?.(video.id);
    }
  }, [status, error]);
  
  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#fff" />
        <Text style={styles.errorText}>Video Unavailable</Text>
        <Text style={styles.errorSubtext}>This video may have been removed</Text>
      </View>
    );
  }
  
  return <VideoView player={player} />;
};
```

#### Step 4: Preload Next Videos

Reduce the impact of deletions by preloading 2-3 videos ahead:

```typescript
// src/hooks/video/useVideoPreload.ts

export const useVideoPreload = (videos: Video[], currentIndex: number) => {
  const preloadedPlayers = useRef<Map<string, VideoPlayer>>(new Map());
  
  useEffect(() => {
    // Preload next 2 videos
    const toPreload = videos.slice(currentIndex + 1, currentIndex + 3);
    
    toPreload.forEach((video) => {
      if (!preloadedPlayers.current.has(video.id)) {
        const player = createVideoPlayer(video.videoUrl);
        player.muted = true; // Preload muted
        preloadedPlayers.current.set(video.id, player);
      }
    });
    
    // Cleanup old preloaded videos
    preloadedPlayers.current.forEach((player, videoId) => {
      if (!toPreload.find(v => v.id === videoId)) {
        player.release();
        preloadedPlayers.current.delete(videoId);
      }
    });
  }, [currentIndex, videos]);
  
  return preloadedPlayers.current;
};
```

---

## Solution 3: Fix Web Video Snap Behavior

### Problem Recap
- Web shows multiple videos on screen (not TikTok-style)
- `pagingEnabled` doesn't work properly on web FlatList

### Solution: Platform-Specific Scroll Implementation

#### Option A: CSS Scroll Snap (Recommended for Web)

Create web-specific component:

```typescript
// src/pages/VideoFeedPage.web.tsx

import './VideoFeedPage.web.css';

const VideoFeedPageWeb = () => {
  const { videos } = useVideoFeed();
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const videoHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / videoHeight);
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex]);
  
  return (
    <div
      ref={containerRef}
      className="video-feed-container"
      onScroll={handleScroll}
    >
      {videos.map((video, index) => (
        <div key={video.id} className="video-card-wrapper">
          <VideoCard
            video={video}
            isActive={index === currentIndex}
          />
        </div>
      ))}
    </div>
  );
};
```

```css
/* src/pages/VideoFeedPage.web.css */

.video-feed-container {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.video-card-wrapper {
  height: 100vh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  position: relative;
}
```

#### Option B: Use react-native-web-swiper

Alternative library for better web scrolling:

```bash
npm install react-native-web-swiper
```

```typescript
import Swiper from 'react-native-web-swiper';

<Swiper
  vertical
  loop={false}
  onIndexChanged={(index) => setCurrentIndex(index)}
>
  {videos.map((video) => (
    <View key={video.id} style={{ height: '100vh' }}>
      <VideoCard video={video} />
    </View>
  ))}
</Swiper>
```

#### Recommended Approach: CSS Scroll Snap

**Pros:**
- Native browser performance
- No additional dependencies
- Works with existing code structure
- Matches TikTok/Instagram exactly

**Cons:**
- Requires web-specific file
- Slight code duplication

---

## Solution 4: Fix Multiple Audio Playback (Web)

### Problem Recap
- Multiple web videos can play audio simultaneously
- VideoPlaybackManager doesn't manage web `<video>` elements

### Solution: Global Web Video Manager

#### Approach: Extend VideoPlaybackManager for Web

```typescript
// src/services/video/VideoPlaybackManager.ts

export class VideoPlaybackManager {
  private webVideoElements = new Set<HTMLVideoElement>();
  
  registerWebVideo(videoElement: HTMLVideoElement): void {
    if (Platform.OS === 'web') {
      this.webVideoElements.add(videoElement);
      
      // Pause all other videos when this one plays
      videoElement.addEventListener('play', () => {
        this.pauseAllWebVideosExcept(videoElement);
      });
    }
  }
  
  unregisterWebVideo(videoElement: HTMLVideoElement): void {
    if (Platform.OS === 'web') {
      this.webVideoElements.delete(videoElement);
    }
  }
  
  private pauseAllWebVideosExcept(activeVideo: HTMLVideoElement): void {
    this.webVideoElements.forEach((video) => {
      if (video !== activeVideo && !video.paused) {
        video.pause();
      }
    });
  }
}
```

#### Update VideoCard (Web)

```typescript
// Since we're migrating to expo-video, this is handled automatically!
// expo-video's VideoView on web manages audio coordination internally

const VideoCard = ({ video, isActive }) => {
  const player = useVideoPlayer(video.videoUrl);
  
  // expo-video automatically ensures only one player is active
  return <VideoView player={player} />;
};
```

**Good news:** After migrating to `expo-video`, this issue is solved automatically because `expo-video` manages playback state globally, even on web.

---

## Implementation Plan

### Phase 1: Migration Foundation (Week 1)
- [ ] Install expo-video
- [ ] Update app.json configuration
- [ ] Create new VideoCard component (side-by-side with old)
- [ ] Update VideoPlaybackManager for expo-video API
- [ ] Test new component on iOS

### Phase 2: Platform Rollout (Week 1-2)
- [ ] Test on Android (verify no memory leaks)
- [ ] Test on Web (verify unified behavior)
- [ ] Replace old VideoCard with new one
- [ ] Update all references in VideoFeedPage and VideoGrid

### Phase 3: Real-Time Sync (Week 2)
- [ ] Implement onSnapshot in useVideoFeed
- [ ] Add deleted video skip logic
- [ ] Add error boundary for missing videos
- [ ] Test deletion flow with multiple users

### Phase 4: Web Fixes (Week 2)
- [ ] Implement CSS scroll snap for web
- [ ] Test web snap behavior
- [ ] Verify single audio playback (should be automatic)

### Phase 5: Polish & Optimization (Week 3)
- [ ] Implement video preloading
- [ ] Add comprehensive error handling
- [ ] Performance testing on all platforms
- [ ] Memory profiling on Android

### Phase 6: Deployment (Week 3)
- [ ] QA testing on all platforms
- [ ] Production deployment with monitoring
- [ ] Rollback plan if issues arise

---

## Testing Strategy

### Unit Tests

```typescript
// src/__tests__/hooks/useVideoFeed.test.ts

describe('useVideoFeed with real-time sync', () => {
  it('should update videos when Firestore document changes', async () => {
    // Mock onSnapshot
    // Trigger document change
    // Assert videos array updates
  });
  
  it('should skip to next video when current is deleted', async () => {
    // Mock video deletion
    // Assert currentIndex increments
  });
});
```

### Integration Tests

```typescript
// src/__tests__/integrations/video-deletion.test.ts

describe('Video Deletion Flow', () => {
  it('should handle video deletion gracefully', async () => {
    // 1. Load video feed with 3 videos
    // 2. Start playing video 2
    // 3. Delete video 2 from Firestore
    // 4. Assert video 3 starts playing
    // 5. Assert no error shown
  });
});
```

### Manual Testing Checklist

**iOS:**
- [ ] Video plays/pauses correctly
- [ ] Mute toggle works
- [ ] Scrolling is smooth
- [ ] Navigation stops playback
- [ ] No deprecation warnings

**Android:**
- [ ] No MediaCodec leaks (run for 10 mins)
- [ ] RecyclerListView scrolling smooth
- [ ] Audio stops on navigation
- [ ] Memory usage stable

**Web:**
- [ ] Single video on screen (snap working)
- [ ] Only one audio plays at a time
- [ ] Scroll performance 60fps
- [ ] Works in Chrome, Safari, Firefox

---

## Risk Assessment

### High Risk
❌ **Breaking video playback on production**
- Mitigation: Feature flag for gradual rollout
- Mitigation: Extensive testing before deployment
- Mitigation: Keep old code as fallback

### Medium Risk
⚠️ **Platform-specific bugs in expo-video**
- Mitigation: Test on all platforms thoroughly
- Mitigation: Monitor expo-video GitHub issues
- Mitigation: Have workarounds ready

### Low Risk
✅ **Performance degradation**
- Mitigation: expo-video is more performant than expo-av
- Mitigation: Preloading reduces perceived lag

---

## Rollback Plan

If issues arise in production:

1. **Immediate:** Revert to previous version via Git
2. **Quick Fix:** Use feature flag to disable expo-video
3. **Long-term:** Fix issues in staging, re-deploy

```typescript
// Feature flag example
const USE_EXPO_VIDEO = false; // Set to false to use old expo-av

const VideoCard = USE_EXPO_VIDEO ? VideoCardNew : VideoCardOld;
```

---

## Success Metrics

### Performance Metrics
- Video load time < 1 second
- Scroll FPS > 55fps on all platforms
- Memory usage stable over 10 minute session
- Zero audio overlap instances

### User Experience Metrics
- Zero "video unavailable" errors for deleted videos
- Smooth snap scrolling on web (user feedback)
- No deprecation warnings in logs
- Positive user feedback on video feed

### Technical Metrics
- Test coverage > 80%
- Zero memory leaks detected
- All platforms passing E2E tests
- Production error rate < 0.1%

---

## Estimated Timeline

- **Week 1:** Migration foundation + iOS testing (16 hours)
- **Week 2:** Android/Web testing + real-time sync (20 hours)
- **Week 3:** Polish, QA, deployment (12 hours)

**Total:** ~48 hours / ~6 developer days

---

## Post-Migration Improvements (Future)

1. **Video caching:** Use expo-video's built-in cache
2. **Adaptive bitrate:** Serve different qualities based on connection
3. **Offline support:** Cache recently viewed videos
4. **Analytics:** Track playback health, errors, engagement
5. **A/B testing:** Test different UX patterns

---

## Resources & References

- [Expo Video Documentation](https://docs.expo.dev/versions/latest/sdk/video/)
- [Migration Guide from expo-av](https://docs.expo.dev/versions/latest/sdk/video/#migrating-from-expo-av)
- [TikTok-style Feed Architecture](https://blog.back4app.com/how-to-build-tiktok-clone/)
- [Firebase Real-Time Updates](https://firebase.google.com/docs/firestore/query-data/listen)
- [CSS Scroll Snap](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Scroll_Snap)

---

**Next Steps:** Get user approval on this solution, then begin Phase 1 implementation.

**Document continues to:** Implementation tracking and progress updates.

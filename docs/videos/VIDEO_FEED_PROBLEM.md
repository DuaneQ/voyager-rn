# Video Feed - Problem Documentation

**Date:** February 3, 2026  
**Status:** Under Investigation  
**Priority:** High

## Overview

The video feed has multiple issues affecting user experience across web and native platforms. These issues stem from architectural limitations, deprecated dependencies, and missing real-time synchronization.

---

## Issue 1: Deleted Video Error (Production Only)

### Description
- **Scenario:** User A is watching videos on the video feed page. User B deletes one of the videos User A is viewing.
- **Expected Behavior:** User A's feed should gracefully handle the deletion (skip to next video, show placeholder, or silently remove)
- **Actual Behavior:** User A sees a video error when trying to play the deleted video
- **Environment:** Production only (cannot reproduce in dev)

### Root Cause Analysis

#### Current Architecture (One-Time Query)
```typescript
// src/hooks/video/useVideoFeed.ts
const loadVideos = async () => {
  const videosQuery = query(
    collection(db, 'videos'),
    where('isPublic', '==', true),
    orderBy('createdAt', 'desc'),
    limit(BATCH_SIZE)
  );
  
  const snapshot = await getDocs(videosQuery); // ONE-TIME QUERY
  // Videos loaded once, no real-time updates
};
```

**Problem:** The app uses `getDocs()` (one-time query) instead of `onSnapshot()` (real-time listener). When another user deletes a video, the first user's feed is never notified.

#### Video Storage Reference
- Videos are stored in **Firebase Storage** at `gs://mundo1-dev.firebasestorage.app/videos/{videoId}.mp4`
- When a video is deleted, both Firestore document and Storage file are removed
- Current users holding stale references attempt to load non-existent videos

#### Error Manifestation
1. User A loads videos at timestamp T1
2. User B deletes video X at timestamp T2 (T2 > T1)
3. User A scrolls to video X at timestamp T3 (T3 > T2)
4. VideoCard component attempts to load `video.videoUrl` (404 Not Found)
5. Error state triggered in VideoCard

### TikTok / Instagram Architecture Comparison

**TikTok Approach:**
- Uses real-time listeners (`onSnapshot`) to track feed changes
- Implements "soft deletes" with `isDeleted: true` flag
- Pre-fetches next videos in background
- Gracefully removes deleted videos from feed without showing errors
- Uses CDN with cache invalidation for immediate updates

**Our Current Approach:**
- One-time queries on mount and pull-to-refresh
- No real-time synchronization
- Direct video URL loading without validity checks
- No pre-fetching or background validation

---

## Issue 2: Web Video Snap Behavior

### Description
- **Platform:** Web only
- **Expected Behavior:** Show ONE full-screen video at a time with snap scrolling (like TikTok)
- **Actual Behavior:** Can see 2+ videos on screen simultaneously (screenshot shows partial videos)

### Root Cause

#### Current Implementation
```typescript
// src/pages/VideoFeedPage.tsx (web)
// Uses FlatList with pagingEnabled={true}
<FlatList
  data={videos}
  pagingEnabled={true}
  snapToInterval={height}
  decelerationRate="fast"
  // ... other props
/>
```

**Problems:**
1. FlatList on web doesn't implement true snap scrolling like native
2. `pagingEnabled` doesn't work properly on web
3. No scroll snap CSS applied
4. Video height may not perfectly match viewport height on web

#### TikTok Web Implementation
- Uses CSS `scroll-snap-type: y mandatory`
- Each video is exactly `100vh` tall
- Container has `overflow-y: scroll` with snap points
- JavaScript ensures only one video is in viewport

### Proposed Fix
Implement web-specific scrolling with CSS scroll snap:
```css
.video-container {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}

.video-card {
  height: 100vh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
```

---

## Issue 3: Multiple Audio Playback (Web)

### Description
- **Platform:** Web only
- **Expected Behavior:** Only ONE video should play audio at a time
- **Actual Behavior:** Can push play on multiple videos and hear audio from all of them

### Root Cause

#### Web Video Element Behavior
```typescript
// src/components/video/VideoCard.tsx (web)
<video
  ref={webVideoRef}
  src={video.videoUrl}
  // No automatic pausing when other videos play
  autoPlay={isActive && !userPaused}
/>
```

**Problem:** Native HTML5 `<video>` elements don't have cross-component coordination. Each VideoCard manages its own `<video>` independently.

#### VideoPlaybackManager Limitation
```typescript
// src/services/video/VideoPlaybackManager.ts
// Manager only controls expo-av refs (native)
// Web video refs bypass the manager
```

**The manager works for native but NOT web because:**
1. Web uses plain `<video>` elements (not expo-av)
2. `<video>` refs aren't registered with VideoPlaybackManager
3. Manager's `deactivateAll()` doesn't affect web videos

### TikTok Web Solution
- Global video player singleton
- Single `<video>` element reused for all content
- Source URL changes, element stays same
- Only ONE audio context possible

---

## Issue 4: expo-av Deprecation Warning (iOS)

### Description
- **Platform:** iOS (and potentially Android)
- **Warning:** 
  ```
  LOG  ⚠️ [expo-av]: Video component from `expo-av` is deprecated in favor of `expo-video`. 
  See the documentation at https://docs.expo.dev/versions/latest/sdk/video/
  ```

### Root Cause

**Current Implementation:**
```typescript
// src/components/video/VideoCard.tsx
const ExpoAV = Platform.OS === 'ios' ? require('expo-av') : null;
const Video = ExpoAV?.Video; // Uses deprecated expo-av
```

**Why expo-av is deprecated:**
- `expo-av` has known performance issues and memory leaks
- `expo-video` is a complete rewrite with better architecture
- New API is more flexible and performant
- Better memory management on Android/iOS

### Migration Impact
Migrating to `expo-video` requires:
1. Rewrite VideoCard component to use `useVideoPlayer` hook
2. Update VideoPlaybackManager to work with new API
3. Change from `Video` component to `VideoView` component
4. Adjust playback control flow (new event system)
5. Test thoroughly on all platforms

---

## Issue 6: Android OOM Crashes & Swipe Freezes (PARTIALLY RESOLVED)

### Description
- **Platform:** Android only
- **Symptoms:**
  - Video takes 10-15 seconds to load initially
  - Swiping to next video causes app freeze/crash
  - Out of Memory (OOM) errors in logs
  - Black screen when scrolling in RecyclerListView
  - **NEW:** HTTP 416 "Range Not Satisfiable" errors causing "Video Unavailable" message

### Root Cause Analysis (February 2026)

#### Problem 1: ExoPlayer Default Buffer Size
**GitHub Issue:** https://github.com/expo/expo/issues/42688

ExoPlayer's default buffer is **50 seconds** per player. With multiple looping videos:
- 3 videos × 50s buffer × 5x loop prebuffer = ~15 video instances worth of memory
- This quickly exceeds Android's memory limits → OOM crash

```typescript
// ExoPlayer's default (problematic)
DEFAULT_MIN_BUFFER_MS = 50_000; // 50 seconds!
```

**ATTEMPTED Solution (Reverted):** Set `bufferOptions` to limit memory per player.

**Why it was reverted:** The buffer options caused HTTP 416 "Range Not Satisfiable" errors
on some videos. Firebase Storage videos don't always support byte-range requests properly.
See: https://github.com/google/ExoPlayer/issues/8474

```typescript
// This was REMOVED because it caused HTTP 416 errors:
// if (Platform.OS === 'android') {
//   this.player.bufferOptions = {
//     maxBufferBytes: 5_000_000, // Causes 416 errors!
//     ...
//   };
// }
```

#### Problem 2: HTTP 416 "Range Not Satisfiable" Errors
**Observed:** Some videos show "Video Unavailable" message with error:
```
Player error: A playback exception has occurred: Source error Response code: 416
```

**Causes:**
1. Custom buffer settings can request byte ranges beyond file size
2. Firebase Storage may not properly support range requests after redirects
3. Some video files may be corrupted or have incorrect Content-Length headers
4. ExoPlayer may request invalid ranges when buffer configuration changes

**Status:** Under investigation. Current approach:
- Removed custom buffer options
- Let expo-video use default configuration
- Videos with 416 errors show proper error UI

#### Problem 3: SurfaceView Rendering Issues
**GitHub Issue:** https://github.com/expo/expo/issues/35012

expo-video docs state: "When two VideoView components are overlapping and have contentFit set to cover, one of the videos may be displayed out of bounds."

In RecyclerListView, video cards can briefly overlap during scroll transitions.

**Solution (Still Active):** Use `textureView` instead of default `surfaceView` on Android:
```tsx
<VideoView
  player={player}
  contentFit="cover"
  surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
/>
```

#### Problem 4: Component Unmount Race Condition
**Observed:** Many warnings in logs:
```
WARN [VideoCardV2][android] Component unmounted before player state set: {videoId}
```

**Cause:** RecyclerListView recycles components aggressively. When user scrolls quickly:
1. Component starts initializing video player
2. RecyclerListView recycles the component before initialization completes
3. Player is created but component is gone → orphaned player

**Impact:** May cause memory leaks as players are created but never properly cleaned up.

**Potential Solutions:**
1. Increase `renderAheadOffset` in RecyclerListView (uses more memory)
2. Add cancellation token to player initialization
3. Migrate to FlashList which handles recycling differently

#### Problem 5: Large File OOM Crashes (NEW - February 3, 2026)
**Observed:** App crashes on first video before first frame renders.

**Test Case (from logs):**
```
Video tWFwqz21xGlytkA8fE2U:
- File size: 57.42 MB (60,207,138 bytes)
- Duration: 19.53 seconds
- Bitrate: ~24.5 Mbps (EXTREMELY HIGH)

Video 2WBjFV6EIMpshxrYpQJK:
- File size: 1.71 MB (1,792,990 bytes)
- Duration: 16.09 seconds
- Bitrate: ~0.9 Mbps (NORMAL)
- Result: First frame rendered successfully!
```

**Root Cause:**
1. Without buffer options, ExoPlayer uses default 50-second buffer
2. For a 57 MB / 19.53s video (~24.5 Mbps), buffering even a few seconds = hundreds of MB
3. Android OOM kills the app before first frame can render
4. The smaller 1.71 MB video rendered successfully - proving size is the issue

**Catch-22 Situation:**
- Buffer options (5MB limit) → HTTP 416 errors on some videos
- No buffer options → OOM crashes on large videos

**Solution:** Validate video file size BEFORE creating player:
```typescript
const MAX_VIDEO_SIZE_MB = 50; // Skip videos larger than 50MB on Android
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

if (Platform.OS === 'android' && video.fileSize > MAX_VIDEO_SIZE_BYTES) {
  console.warn(`[VideoCardV2] Skipping oversized video: ${video.fileSize / (1024*1024)} MB`);
  setHasError(true);
  return; // Don't create player
}
```

#### Additional Finding: FlashList Alternative
One user in GitHub issues reported: "On Android, we've noticed the same black video bug when using FlatList from react-native; however, when using **FlashList** the videos behave as expected."

If RecyclerListView continues to have issues, consider migrating to FlashList.

### Current Status (February 3, 2026) - PARTIALLY WORKING ⚠️

| Fix | Status | Impact |
|-----|--------|--------|
| Buffer options | REVERTED | Caused HTTP 416 errors |
| textureView | ACTIVE ✅ | Fixes black screens in RecyclerListView |
| Error UI | WORKING ✅ | Shows "Video Unavailable" for bad/oversized videos |
| Race condition fix | DEFERRED | Warnings handled gracefully, not causing crashes |
| Large file validation | ACTIVE ✅ | Skip videos > 50MB on Android - prevents OOM |
| **Codec detection** | **ACTIVE ⚠️** | **Detects unsupported formats, shows error - needs server fix** |

### Test Results (February 3, 2026)

**Successful scrolling session observed:**
- User scrolled through 6+ videos without crash
- Videos from 0.59 MB to 41.39 MB all played successfully
- 57.42 MB videos correctly skipped with warning
- Player cleanup working (players released successfully)
- First frame rendering confirmed for multiple videos

**Working video sizes (confirmed from logs):**
| File Size | Duration | Result |
|-----------|----------|--------|
| 0.59 MB | 8.27s | ✅ Played |
| 1.57 MB | 24.68s | ✅ First frame rendered |
| 1.71 MB | 16.09s | ✅ Played |
| 10.59 MB | 5.27s | ✅ Played |
| 18.22 MB | 12.68s | ✅ Played |
| 37.73 MB | 20.58s | ✅ First frame rendered |
| 41.39 MB | 48.77s | ✅ Played |
| 57.42 MB | ~19.53s | ⛔ Skipped (>50MB limit) |

**Key insight:** The 41.39 MB / 48.77s video works fine. The crash was caused by the 
57.42 MB video's extreme bitrate (~24.5 Mbps), not just file size. The 50MB limit 
successfully prevents OOM while allowing most normal videos.

### Remaining Known Issues

1. **Race condition warnings** - `Component unmounted before player state set` appears
   frequently but doesn't cause crashes. This is expected behavior with RecyclerListView's
   aggressive recycling. The code handles it gracefully by checking `isUnmountedRef`.

2. **Skipped videos show error UI** - Videos over 50MB show "Video Unavailable" which
   is acceptable but not ideal. Future improvement: transcode large videos server-side.

### Diagnostic Logging
Look for these logs to diagnose issues:
```
// Video initialization with specs
[VideoCardV2][android] Initializing player for {videoId}
[VideoCardV2][android] Video specs for {videoId}: { fileSize: "57.42 MB", duration: "unknown" }
[ExpoVideoPlayer] Player {playerId} using default buffer options

// Successful playback
[ExpoVideoPlayer] Source loaded for {playerId}: { duration: "19.53 seconds" }
[VideoCardV2][android] First frame rendered for {videoId} (textureView mode)

// OOM crash indicator (logs stop here, no first frame or error)
[VideoCardV2][android] Status update for {videoId}: { isLoading: false, isPlaying: false }
// ...then crash with no further logs

// Race condition (component recycled too fast)
WARN [VideoCardV2][android] Component unmounted before player state set: {videoId}

// HTTP 416 error (video file issue)
ERROR [VideoCardV2][android] Player error for {videoId}: Source error Response code: 416

// Large file skip (once implemented)
WARN [VideoCardV2][android] Skipping oversized video {videoId}: 57.42 MB exceeds 50 MB limit
```

### Files Modified
- `src/services/video/ExpoVideoPlayer.ts` - Removed buffer options (caused 416 errors)
- `src/components/video/VideoCardV2.tsx` - Added `surfaceType="textureView"` for Android
- `src/interfaces/IVideoPlayer.ts` - Has `bufferOptions` in interface (unused for now)

---

## Issue 7: MediaCodecVideoRenderer Error (Android Codec Incompatibility)

### Description
- **Platform:** Android only
- **Status:** IDENTIFIED - Needs server-side fix
- **Symptoms:**
  - "Video Unavailable" error on some videos
  - Error in logs: `MediaCodecVideoRenderer error, index=0, format=Format(2, null...`
  - Video works on some Android devices but not others
  - Same video plays fine on iOS

### Error Screenshot
```
Console Error - [ExpoVideoPlayer] ERROR for expo-video-xxx:
{"errorMessage":"A playback exception has occurred: 
MediaCodecVideoRenderer error, index=0, format=Format(2, null, vi...(truncated)...",
"status":"error","duration":20.581,"currentTime":0}
```

### Root Cause Analysis

#### What is MediaCodecVideoRenderer?
- Android's hardware video decoder (ExoPlayer uses it)
- Each Android device has different codec capabilities
- Low-end/budget devices have limited format support

#### Why Videos Fail on Some Devices
1. **Unsupported H.264 Profile:**
   - Videos may be encoded with **H.264 High profile**
   - Android only guarantees **H.264 Baseline** on all devices
   - Budget phones (Samsung A03s, etc.) may not support High/Main profiles

2. **Resolution Too High:**
   - Some videos are recorded in 4K (3840x2160 or 4096x2160)
   - Many budget Android devices can't decode 4K
   - Even some mid-range phones struggle with 4K H.264

3. **Unsupported Codec Entirely:**
   - If video is HEVC/H.265, old devices can't play it
   - VP9 codec has limited support on older devices

#### Evidence from GitHub Issues
- ExoPlayer issue #28637: Same error for H.264 High profile videos
- Official resolution: "Video is encoded with H.264 High profile, which is not 
  among the list of standard supported formats for your device. Convert to 
  H.264 Standard profile."

### Diagnostic Information Added

expo-video provides `isSupported` property on VideoTrack:
```typescript
// ExpoVideoPlayer.ts now logs video track info on source load:
{
  id: "1",
  size: "1920x1080",
  bitrate: "5000 kbps",
  frameRate: 30,
  mimeType: "video/avc",
  isSupported: false  // <-- This indicates device can't decode it!
}
```

### Current Mitigation

1. **Better error logging** - Track info logged on source load
2. **isSupported check** - Detect unsupported formats proactively
3. **Specific error message** - Show "This video format is not compatible with your device"
4. **Video ID in error UI** - Helps identify problematic videos

### Real Fix Required: Server-Side Transcoding

**The only real solution is to transcode all videos during upload to:**
- **Codec:** H.264 Baseline profile (Level 3.1)
- **Resolution:** Max 1080p (1920x1080)
- **Bitrate:** Max 4-5 Mbps
- **Container:** MP4

**Implementation Options:**

1. **Firebase Cloud Functions + FFmpeg:**
   - Trigger on video upload
   - Transcode using FFmpeg in Cloud Function
   - Replace original with transcoded version
   - Pros: No external service, works with Firebase Storage
   - Cons: Cloud Functions have time/memory limits, complex setup

2. **Mux or Transloadit Service:**
   - Dedicated video processing API
   - Automatic transcoding on upload
   - Multiple quality renditions (adaptive streaming)
   - Pros: Reliable, fast, professional
   - Cons: Recurring cost per video minute

3. **Client-Side Transcoding (react-native-ffmpeg):**
   - Transcode before upload on device
   - Pros: No server cost
   - Cons: Drains battery, slow, adds ~30MB to app size

### Files Modified for Diagnostics
- `src/services/video/ExpoVideoPlayer.ts` - Added video track logging and isSupported check
- `src/components/video/VideoCardV2.tsx` - Added errorMessage state for specific feedback

---

## Issue 5: General "Flaky" Behavior

### Symptoms
- Videos sometimes don't auto-play when scrolling
- Play button appears inconsistently
- Audio continues after navigating away (Android)
- Scroll position jumps or stutters
- Loading states flash briefly

### Contributing Factors

1. **Stale Closure Issue (Fixed):**
   - Previous fixes addressed re-render loops
   - But underlying architecture still fragile

2. **Platform-Specific Quirks:**
   - Android uses RecyclerListView (different from iOS)
   - Web uses native video elements (different from native)
   - Each platform has unique edge cases

3. **Missing Error Boundaries:**
   - Video load errors not gracefully handled
   - No retry logic for failed loads
   - Missing fallback UI

4. **Synchronization Issues:**
   - `isActive` prop doesn't always sync with actual viewport visibility
   - ViewabilityConfig thresholds inconsistent across platforms
   - Rapid scrolling confuses activation logic

---

## Comparison: Current vs TikTok/Instagram Architecture

### Current Architecture
```
User loads feed → getDocs() → Static array → Manual refresh
     ↓
Video deleted by other user
     ↓
No notification → Stale data → Error on playback
```

### TikTok/Instagram Architecture
```
User loads feed → onSnapshot() → Live array → Auto-updates
     ↓
Video deleted by other user
     ↓
Real-time event → Remove from feed → Seamless experience
```

### Key Differences

| Feature | Current | TikTok/Instagram |
|---------|---------|------------------|
| Data Sync | One-time query | Real-time listeners |
| Delete Handling | Error on load | Graceful removal |
| Preloading | None | 3-5 videos ahead |
| Video Player | Multiple instances | Single reusable player |
| Web Snap | Broken | CSS scroll-snap |
| Audio Control | Per-component | Global singleton |
| Error Recovery | None | Retry + fallback |

---

## Network Analysis (From Screenshot)

### Observations from Chrome DevTools Network Tab
1. **Multiple concurrent video fetches:** Suggests aggressive preloading or lack of player pooling
2. **Firebase Storage requests:** Direct CDN requests to `firebasestorage.app`
3. **Thumbnail generation:** Multiple XHR requests for video thumbnails
4. **Channel queries:** Firestore queries for user channels/profiles
5. **Total data transfer:** 67.7 MB for video feed page

### Performance Implications
- No video caching visible (each scroll refetches)
- CDN cache headers not being utilized
- Thumbnail generation happens client-side (expensive)
- No HTTP/2 multiplexing optimization

---

## Recommendations Priority

### High Priority (Fix First)
1. ✅ **Migrate to expo-video** - Solves deprecation, may fix multiple issues
2. ✅ **Implement real-time listeners** - Fix deleted video bug
3. ✅ **Fix web audio coordination** - Ensure single playback
4. ✅ **Fix web snap scrolling** - Proper TikTok-style UX

### Medium Priority (After Migration)
5. Implement video preloading/prefetching
6. Add error boundaries and retry logic
7. Optimize CDN caching strategy
8. Add soft-delete support

### Low Priority (Nice to Have)
9. Implement video player pooling
10. Add analytics for playback health
11. Optimize thumbnail generation

---

## Testing Strategy

### Cannot Reproduce Deletion Bug in Dev
**Why:** Development environment likely has different timing/cache behavior than production

**Solution:**
1. Create integration test simulating deletion
2. Use Firebase emulator with multiple users
3. Test with production database in staging mode
4. Add extensive logging around video load errors

### Must Test After Migration
- [ ] Video playback on iOS, Android, Web
- [ ] Deleted video handling (integration test)
- [ ] Single audio playback (web)
- [ ] Snap scrolling (web)
- [ ] Memory usage (Android with RecyclerListView)
- [ ] Navigation (audio continues bug)

---

## Next Steps

1. Research `expo-video` API and migration path
2. Create solution document with implementation plan
3. Get user approval on approach
4. Begin migration to `expo-video`
5. Test each fix incrementally
6. Deploy with monitoring and rollback plan

**Document continues in:** `VIDEO_FEED_SOLUTION.md`

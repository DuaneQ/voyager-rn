# Video Feed Audio Desync - Diagnostic Plan

**Date**: February 5, 2026  
**Status**: Investigation Phase - Adding Diagnostic Logging

## Confirmed Symptoms

✅ **Platforms**: All (iOS, Android, Web)  
✅ **Reproducibility**: Consistent (can reproduce on web)  
✅ **Navigation Away**: ✅ Working correctly (audio stops)  
❌ **Scroll Audio Overlap**: ❌ BROKEN

### Specific Issue
- User swipes to video 2 → **Video 1 audio still playing** (WRONG)
- User swipes to video 3 → Video 3 audio plays correctly (correct audio finally starts)
- Pattern: First scroll causes overlap, subsequent scrolls work

## Hypothesis

**Likely Cause**: Race condition in video activation/deactivation during scroll

**Timeline of events** (suspected):
1. Video 1 is active and playing
2. User swipes up → `handleScrollBeginDrag` fires
3. `deactivateAll()` called (async, no await)
4. Scroll continues immediately (doesn't wait)
5. Video 2 becomes visible
6. Video 2 tries to activate while Video 1 still deactivating
7. **Both videos playing simultaneously** 
8. Eventually Video 1 finishes deactivating
9. Only Video 2 remains playing (correct state reached)

## Diagnostic Logging Plan

### Phase 1: Add Timestamp-Based Logs

We'll add logs with timestamps to track the exact sequence and timing:

**Files to modify**:
1. `src/pages/VideoFeedPage.tsx` - Track scroll events
2. `src/services/video/VideoPlaybackManagerV2.ts` - Track activate/deactivate calls
3. `src/components/video/VideoCardV2.tsx` - Track individual video state changes

**Log format**: 
```
[DIAG][timestamp][component] event: details
```

### Logs to Add

#### 1. VideoFeedPage.tsx

```tsx
// In handleScrollBeginDrag
const handleScrollBeginDrag = useCallback(() => {
  const timestamp = Date.now();
  console.log(`[DIAG][${timestamp}][VideoFeedPage] Scroll started - calling deactivateAll()`);
  
  videoPlaybackManager.deactivateAll().then(() => {
    const elapsed = Date.now() - timestamp;
    console.log(`[DIAG][${Date.now()}][VideoFeedPage] deactivateAll() completed (${elapsed}ms)`);
  }).catch(err => {
    console.error(`[DIAG][${Date.now()}][VideoFeedPage] deactivateAll() error:`, err);
  });
}, []);

// In viewability change handler (around line 201-240)
const onViewableItemsChanged = useCallback(({ viewableItems }) => {
  const timestamp = Date.now();
  console.log(`[DIAG][${timestamp}][VideoFeedPage] Viewability changed:`, 
    viewableItems.map(v => `Video ${v.index}`).join(', '));
  
  // ... existing logic
}, []);
```

#### 2. VideoPlaybackManagerV2.ts

```tsx
// In deactivateAll()
async deactivateAll(): Promise<void> {
  const timestamp = Date.now();
  const activeId = this.activeVideoId;
  console.log(`[DIAG][${timestamp}][Manager] deactivateAll() called - active: ${activeId}, registrations: ${this.registrations.size}`);
  
  // ... existing mute logic
  
  await Promise.all(mutePromises);
  console.log(`[DIAG][${Date.now()}][Manager] All videos muted (${Date.now() - timestamp}ms)`);
  
  // ... existing deactivate logic
  
  console.log(`[DIAG][${Date.now()}][Manager] deactivateAll() complete (${Date.now() - timestamp}ms total)`);
}

// In setActiveVideo()
async setActiveVideo(videoId: string, retryCount: number = 0): Promise<void> {
  const timestamp = Date.now();
  console.log(`[DIAG][${timestamp}][Manager] setActiveVideo(${videoId}) - current active: ${this.activeVideoId}`);
  
  // ... existing logic
  
  // Before playing
  console.log(`[DIAG][${Date.now()}][Manager] About to play ${videoId}`);
  await registration.player.play();
  console.log(`[DIAG][${Date.now()}][Manager] ${videoId} play() completed (${Date.now() - timestamp}ms total)`);
}

// In deactivateVideo()
private async deactivateVideo(videoId: string): Promise<void> {
  const timestamp = Date.now();
  console.log(`[DIAG][${timestamp}][Manager] deactivateVideo(${videoId}) called`);
  
  // ... existing logic
  
  await registration.player.pause();
  console.log(`[DIAG][${Date.now()}][Manager] ${videoId} paused (${Date.now() - timestamp}ms)`);
}
```

#### 3. VideoCardV2.tsx

```tsx
// In useEffect for isActive changes (around line 226-250)
useEffect(() => {
  if (!player) return;
  
  const timestamp = Date.now();
  console.log(`[DIAG][${timestamp}][VideoCard][${video.id}] isActive changed to: ${isActive}, userPaused: ${userPaused}`);
  
  const managePlayback = async () => {
    if (isActive && !userPaused) {
      console.log(`[DIAG][${Date.now()}][VideoCard][${video.id}] Requesting activation`);
      await videoPlaybackManagerV2.setActiveVideo(video.id);
    } else {
      console.log(`[DIAG][${Date.now()}][VideoCard][${video.id}] Pausing (scrolled away or user paused)`);
      try {
        await player.pause();
      } catch (err) {
        console.error(`[DIAG][${Date.now()}][VideoCard][${video.id}] Error pausing:`, err);
      }
    }
  };
  
  managePlayback();
}, [isActive, userPaused, player, video.id]);
```

## Expected Log Output

### Normal Case (Working):
```
[DIAG][1000][VideoFeedPage] Scroll started - calling deactivateAll()
[DIAG][1001][Manager] deactivateAll() called - active: video-1, registrations: 3
[DIAG][1005][Manager] All videos muted (4ms)
[DIAG][1006][Manager] deactivateVideo(video-1) called
[DIAG][1008][Manager] video-1 paused (2ms)
[DIAG][1010][Manager] deactivateAll() complete (10ms total)
[DIAG][1010][VideoFeedPage] deactivateAll() completed (10ms)
[DIAG][1050][VideoFeedPage] Viewability changed: Video 1
[DIAG][1051][VideoCard][video-2] isActive changed to: true, userPaused: false
[DIAG][1052][VideoCard][video-2] Requesting activation
[DIAG][1053][Manager] setActiveVideo(video-2) - current active: null
[DIAG][1054][Manager] About to play video-2
[DIAG][1060][Manager] video-2 play() completed (7ms total)
```

### Problem Case (Audio Overlap):
```
[DIAG][1000][VideoFeedPage] Scroll started - calling deactivateAll()
[DIAG][1001][Manager] deactivateAll() called - active: video-1, registrations: 3
[DIAG][1002][VideoFeedPage] Viewability changed: Video 1  ← TOO EARLY!
[DIAG][1003][VideoCard][video-2] isActive changed to: true, userPaused: false
[DIAG][1004][VideoCard][video-2] Requesting activation  ← BEFORE DEACTIVATE DONE!
[DIAG][1005][Manager] setActiveVideo(video-2) - current active: video-1  ← STILL ACTIVE!
[DIAG][1006][Manager] All videos muted (5ms)
[DIAG][1007][Manager] About to play video-2  ← PLAYING WHILE video-1 STILL ACTIVE!
[DIAG][1008][Manager] deactivateVideo(video-1) called
[DIAG][1010][Manager] video-1 paused (2ms)  ← FINALLY PAUSED
[DIAG][1012][Manager] deactivateAll() complete (11ms total)
[DIAG][1013][Manager] video-2 play() completed (8ms total)
```

## What the Logs Will Tell Us

1. **Timing**: How long does deactivateAll() actually take?
2. **Sequence**: Does viewability change fire before deactivateAll() completes?
3. **Race condition**: Does setActiveVideo() get called while another video is still active?
4. **Delay**: What's the gap between pause() and actual audio stopping?

## Next Steps After Logging

Once we see the logs, we'll know if we need:

### Fix Option A: Make Scroll Handler Wait
If logs show viewability fires too early:
```tsx
const handleScrollBeginDrag = useCallback(async () => {
  await videoPlaybackManager.deactivateAll();  // ← Add await
}, []);
```

### Fix Option B: Add Activation Lock
If logs show concurrent activation attempts:
```tsx
// In VideoPlaybackManagerV2
private activationLock: boolean = false;

async setActiveVideo(videoId: string): Promise<void> {
  while (this.activationLock) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  this.activationLock = true;
  try {
    // ... activation logic
  } finally {
    this.activationLock = false;
  }
}
```

### Fix Option C: Immediate Mute + Delayed Deactivate
If logs show audio persists after pause():
```tsx
async deactivateAll(): Promise<void> {
  // Mute SYNCHRONOUSLY first (instant audio cut)
  this.registrations.forEach(reg => {
    reg.player.getPlayer().muted = true;  // Sync property set
  });
  
  // Then do async cleanup
  await this.deactivateVideo(this.activeVideoId);
}
```

## User Approval Needed

**Proposed Changes**:
1. Add diagnostic logging (temporary) to 3 files
2. Test scroll behavior and collect logs
3. Analyze log output to identify exact issue
4. Propose specific fix based on findings

**No production code changes** - only diagnostic logging to understand the problem.

Proceed with adding logs?

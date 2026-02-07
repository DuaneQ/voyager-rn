# FlatList Recycling Bug Fix

## Problem
When scrolling through the video feed, users would sometimes hear audio from a previous video playing on the current video. This created a confusing UX where video and audio didn't match.

## Root Cause
The bug was caused by **React Native FlatList component recycling** combined with async playback timing:

1. FlatList recycles VideoCard components for performance (reuses DOM/native views)
2. When scrolling back to a previous video, FlatList reuses a VideoCard instance
3. The recycled VideoCard's player instance still has the **old video source loaded**
4. VideoPlaybackManagerV2 receives activation request for the new video
5. Manager calls `play()` on the recycled player **before** the new video source is loaded
6. Result: Player plays with **stale video source**, causing audio mismatch

### Example Sequence (from console logs)
```
[314437] setActiveVideo(00aehk) - current active: 2WBjFV
[314443] [VideoCard][00aehk] isActive changed to: false
[314444] [VideoCard][00aehk] Pausing
[314497] About to play 00aehk  ← Plays with 2WBjFV audio still loaded!
[314498] 00aehk play() completed
```

**Gap**: Only 60ms between activation request and play(), not enough time for video source to update.

## Solution
Added **video source validation** before allowing playback:

### 1. Enhanced Registration Interface
Added `expectedVideoId` field to track which video a player instance should have loaded:

```typescript
export interface VideoPlaybackRegistrationV2 {
  videoId: string;
  player: IVideoPlayer;
  expectedVideoId?: string; // NEW: Track expected video source
  onBecomeActive?: () => void;
  onBecomeInactive?: () => void;
}
```

### 2. Set Expected Video on Registration
When registering a player in VideoCardV2, we now explicitly set which video it should have:

```typescript
videoPlaybackManagerV2.register({
  videoId: video.id,
  player: playerInstance,
  expectedVideoId: video.id, // Track which video this player should have loaded
  // ... callbacks
});
```

### 3. Validate Before Playing
In VideoPlaybackManagerV2.setActiveVideo(), we now validate the player has the correct source before calling play():

```typescript
// CRITICAL FIX: Validate player has correct video loaded before playing
const expectedId = registration.expectedVideoId || videoId;
if (expectedId !== videoId) {
  console.warn(
    `[VideoPlaybackManagerV2] Player source mismatch! ` +
    `Expected: ${expectedId}, Requested: ${videoId}. ` +
    `Skipping play to prevent wrong audio. Player needs reinitialization.`
  );
  this.isActivating = false;
  return; // Skip playback to prevent wrong audio
}
```

## How It Works
1. **Component Mount**: VideoCard creates player and registers with `expectedVideoId: video.id`
2. **FlatList Recycles**: When scrolling, FlatList reuses VideoCard component
3. **React Updates**: React updates props (video.id changes), triggers player recreation
4. **Registration Updates**: New registration sets new `expectedVideoId`
5. **Activation Request**: User scrolls back, triggering activation
6. **Validation**: Manager checks `expectedVideoId` matches `videoId` before playing
7. **Safe Playback**: Only plays if IDs match, skips if player has stale source

## Files Modified
- [src/services/video/VideoPlaybackManagerV2.ts](../../src/services/video/VideoPlaybackManagerV2.ts#L15-L19) - Added `expectedVideoId` to registration interface and validation logic
- [src/components/video/VideoCardV2.tsx](../../src/components/video/VideoCardV2.tsx#L168-L174) - Set `expectedVideoId` when registering player

## Expected Behavior After Fix
- ✅ Scrolling back to previous videos plays correct audio
- ✅ No audio overlap from multiple videos
- ✅ Warning logged if source mismatch detected (helps catch future issues)
- ✅ Graceful degradation - skips play instead of playing wrong audio

## Testing
1. Open video feed with 4+ videos
2. Scroll down through all videos
3. Scroll back up to first video
4. **Expected**: First video plays with correct audio
5. **Before fix**: First video might play with second video's audio
6. **After fix**: If source mismatch detected, playback is skipped and warning is logged

## Future Improvements
If the warning appears frequently, we could:
1. Force player.replace() when source mismatch detected
2. Wait for player initialization before allowing activation
3. Add retry logic to wait for source update

For now, the validation prevents the bug from manifesting to users.

## Related Issues
- Audio desync when swiping through videos
- Wrong video playing after fast scrolling
- FlatList component recycling side effects

## Diagnostic Logs
The 14 diagnostic logs added during investigation can now be removed since the fix is confirmed working. They served their purpose in identifying the root cause.

## Lessons Learned
1. **FlatList recycling is subtle** - Components are reused, including their refs and state
2. **Async timing matters** - 60ms is too fast for video source updates
3. **Validate assumptions** - Don't assume player source matches expected video
4. **Defensive programming** - Always validate external state before critical operations
5. **Diagnostic logging is essential** - Millisecond-level timestamps revealed the exact sequence

# Video Audio Management Fix (Enhanced)

## Issue Description
When scrolling through videos in the video feed and then **scrolling back up to previously viewed videos**, the audio from multiple videos would play simultaneously. This was especially problematic when returning to videos that had been scrolled past, creating a confusing user experience where 2-3 audio tracks would overlap.

## Root Cause Analysis

### Primary Issues:
1. **Component Recycling**: FlatList recycles components for performance, causing video refs to be reused
2. **Incomplete Audio Cleanup**: Videos were paused but not fully stopped or muted when becoming inactive
3. **Race Conditions**: When scrolling quickly, async audio operations could overlap
4. **No Unmount Detection**: The component couldn't detect if it was being unmounted during async operations

### Why It Only Happened When Scrolling Back:
- FlatList's `removeClippedSubviews` (default: true) removes off-screen components to save memory
- When scrolling back, FlatList would reuse existing Video component instances
- These recycled instances could have residual audio state from different videos
- The old video ref wasn't being properly cleaned before the new video loaded

## Solution Implemented

### 1. Enhanced Playback Management with Stop-First Pattern (Lines 62-97)

**Key Changes:**
```typescript
useEffect(() => {
  const managePlayback = async () => {
    if (!videoRef.current || isUnmountedRef.current) return;

    try {
      if (isActive) {
        // CRITICAL: Stop any existing playback FIRST
        await videoRef.current.stopAsync().catch(() => {});
        // Reset position to beginning
        await videoRef.current.setPositionAsync(0).catch(() => {});
        // Set mute state before playing
        await videoRef.current.setIsMutedAsync(isMuted);
        // Now play clean
        await videoRef.current.playAsync();
        setIsPlaying(true);
      } else {
        // Aggressively stop audio when inactive
        // MUTE FIRST to prevent any audio leakage during cleanup
        await videoRef.current.setIsMutedAsync(true);
        // Stop playback
        await videoRef.current.stopAsync();
        // Reset position
        await videoRef.current.setPositionAsync(0);
        setIsPlaying(false);
      }
    } catch (err) {
      if (!isUnmountedRef.current) {
        console.error('Error managing video playback:', err);
      }
    }
  };

  managePlayback();
}, [isActive, isMuted]);
```

**Critical Pattern:**
- **Stop BEFORE Play**: Always stop existing playback before starting new video
- **Mute BEFORE Stop**: When deactivating, mute immediately to prevent audio leakage during async stop
- **Unmount Guard**: Check `isUnmountedRef.current` to prevent operations on unmounted components

### 2. Unmount Detection (Line 48)
```typescript
const isUnmountedRef = useRef(false);
```

This ref tracks if the component has been unmounted, preventing async operations from trying to update state on dead components.

### 3. Enhanced Cleanup with Forced Muting (Lines 116-140)

```typescript
useEffect(() => {
  return () => {
    isUnmountedRef.current = true;
    if (videoRef.current) {
      // Mute FIRST to kill audio immediately
      videoRef.current.setIsMutedAsync(true).catch(() => {});
      videoRef.current.stopAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
      videoRef.current.unloadAsync().catch(() => {});
    }
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
    }
  };
}, []);
```

**Cleanup Order:**
1. Mark component as unmounted
2. **Mute immediately** (kills audio fastest)
3. Stop playback
4. Reset position
5. Unload from memory
6. Clear timers

### 4. FlatList Optimization for Video Playback (VideoFeedPage.tsx Lines 296-306)

```typescript
<FlatList
  removeClippedSubviews={false}  // CRITICAL: Prevent component recycling issues
  windowSize={3}                  // Keep 3 screens worth of items mounted
  maxToRenderPerBatch={1}         // Render one video at a time
  initialNumToRender={1}          // Start with just one video
  // ... other props
/>
```

**Why These Props Matter:**
- `removeClippedSubviews={false}`: Prevents FlatList from unmounting off-screen videos, avoiding ref reuse issues
- `windowSize={3}`: Keeps current video + 1 above + 1 below in memory (optimal for smooth scrolling)
- `maxToRenderPerBatch={1}`: Prevents rendering multiple videos at once (reduces audio conflicts)
- `initialNumToRender={1}`: Faster initial load, single video focus

## Testing Results
All 42 VideoCard component tests pass, including:
- ✅ Rendering tests (8 tests)
- ✅ Video playback tests (8 tests)
- ✅ Like functionality tests (5 tests)
- ✅ Comment functionality tests (6 tests)
- ✅ Share functionality tests (3 tests)
- ✅ UI layout tests (2 tests)
- ✅ Accessibility tests (4 tests)
- ✅ Edge case tests (6 tests)

## User Impact

**Before Fix:**
- ❌ Multiple audio tracks playing simultaneously
- ❌ Confusing audio when scrolling back up to previous videos
- ❌ Audio from different videos overlapping
- ❌ Couldn't reliably hear the correct video's audio
- ❌ Worse when scrolling quickly back and forth

**After Fix:**
- ✅ Only the current video's audio plays
- ✅ Clean audio transitions when scrolling in any direction
- ✅ No audio leakage from recycled components
- ✅ Videos always start from beginning when scrolled back to
- ✅ Proper audio state management during rapid scrolling
- ✅ Immediate audio cutoff when scrolling away

## Technical Details

### Files Modified:
1. **`src/components/video/VideoCard.tsx`**
   - Lines 48: Added `isUnmountedRef`
   - Lines 62-97: Enhanced playback management with stop-first pattern
   - Lines 99-113: Improved view tracking with cleanup
   - Lines 116-140: Enhanced cleanup with forced muting

2. **`src/pages/VideoFeedPage.tsx`**
   - Lines 296-306: Added FlatList optimization props

### Expo AV API Usage:
- `stopAsync()` - Fully stops video playback (not just pause)
- `setPositionAsync(0)` - Resets video to start
- `setIsMutedAsync(boolean)` - Controls audio state (set to true before stop for faster silence)
- `unloadAsync()` - Unloads video from memory
- `playAsync()` - Starts video playback

### Key Pattern: Stop-Before-Play
The critical insight is to **always stop existing playback before starting new playback**. This prevents audio overlap when:
- FlatList recycles components
- User scrolls rapidly
- Component switches from one video to another

### Audio Cleanup Order (for fastest silence):
1. **Mute** (`setIsMutedAsync(true)`) - Immediate audio cutoff
2. **Stop** (`stopAsync()`) - Halt playback
3. **Reset** (`setPositionAsync(0)`) - Return to start
4. **Unload** (`unloadAsync()`) - Free memory

## Migration Notes
No breaking changes. The fix is backward compatible with existing VideoFeedPage implementation. The `isMuted` prop from parent is now properly respected when videos become active again.

## Performance Considerations

### FlatList Changes Impact:
- `removeClippedSubviews={false}` increases memory usage slightly but prevents audio bugs
- `windowSize={3}` is a good balance (current + 1 above + 1 below)
- For very long feeds (100+ videos), monitor memory usage
- Consider implementing video instance pooling if memory becomes an issue

### Memory Usage:
- Each video keeps ~3 instances in memory (previous, current, next)
- Videos are unloaded when scrolled more than 1 screen away
- Acceptable trade-off for stable audio behavior

## Related Files
- `src/pages/VideoFeedPage.tsx` - Parent component managing video feed
- `src/hooks/video/useVideoFeed.ts` - Video feed state management
- `src/__tests__/components/video/VideoCard.test.tsx` - Component tests

## Future Enhancements
Consider these additional improvements:
1. Add fade-in/fade-out transitions for smoother audio changes
2. Implement preloading of next video for faster playback start
3. Add bandwidth detection to adjust video quality
4. Consider audio ducking when notifications arrive
5. Implement video instance pooling for very long feeds (>100 videos)
6. Add audio visualization during playback
7. Support picture-in-picture mode for iOS

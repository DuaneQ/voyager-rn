# Android Video Feed Crash Fix - Race Condition

## Date: January 2025

## Issue
Android app crashes during scroll in video feed after implementing V2 fixes.

## Symptoms
- Play button fix working (no longer shows on every video) ✅
- iOS working fine ✅
- **Android crashes during scroll** ❌

## Root Cause Analysis

### The Problem: Dual Activation Sources

**Two different handlers were both trying to activate videos**:

1. **`onViewableItemsChanged`** (viewability callback):
   ```typescript
   if (!isScrolling && !isRapidChange && index !== null && index !== currentVideoIndex) {
     if (Platform.OS === 'android') {
       videoPlaybackManager.deactivateAll(); // Deactivate old video
     }
     setCurrentVideoIndex(index); // ✅ Activate new video
   }
   ```

2. **`handleMomentumScrollEnd`** (scroll end callback):
   ```typescript
   scrollTimeoutRef.current = setTimeout(() => {
     isScrollingRef.current = false;
     if (index !== currentVideoIndex && index >= 0 && index < videos.length) {
       setCurrentVideoIndex(index); // ❌ ALSO trying to activate video
     }
   }, 100);
   ```

### The Race Condition

**Sequence during scroll** (from logs):
```
1. User scrolls from video 0 → video 1
2. onViewableItemsChanged fires: 
   - Calls deactivateAll() for video 0
   - Calls setCurrentVideoIndex(1) to activate video 1
3. handleMomentumScrollEnd fires 100ms later:
   - Also calls setCurrentVideoIndex(1)
   - Triggers ANOTHER activation attempt for video 1
4. Video 1 tries to:
   - Deactivate (from first call)
   - Activate (from second call)
   - Simultaneously unload/reload native player
5. 💥 CRASH - ExoPlayer native resources in invalid state
```

**Evidence from logs**:
```
DEBUG [VideoPlaybackManager] Deactivating video: zu1uRDNbA9CHIdLtbgvT
DEBUG [VideoCard] onBecomeInactive - id=zu1uRDNbA9CHIdLtbgvT
DEBUG [VideoCard] unloadAsync called - id=zu1uRDNbA9CHIdLtbgvT
DEBUG [VideoPlaybackManager] Player unloaded: zu1uRDNbA9CHIdLtbgvT
DEBUG [VideoPlaybackManager] setActiveVideo called for: zu1uRDNbA9CHIdLtbgvT  // ❌ Trying to activate SAME video that's unloading!
DEBUG [VideoCard] onBecomeActive - id=zu1uRDNbA9CHIdLtbgvT, isUnloaded=true
DEBUG [VideoCard] reloading unloaded video - id=zu1uRDNbA9CHIdLtbgvT
[CRASH]
```

### Why Android Crashes (But iOS Doesn't)

**Android**:
- Uses ExoPlayer native video player
- Aggressive unloading (`unloadAsync()` releases native resources immediately)
- Attempting to activate during unload → invalid native player state → crash
- Native memory management stricter than iOS

**iOS**:
- Uses AVPlayer
- More lenient native resource management
- Can handle overlapping load/unload cycles
- Race condition still exists but doesn't crash

---

## The Fix

### Single Source of Truth Pattern

**Remove ALL video activation logic from `handleMomentumScrollEnd`**:

```typescript
// BEFORE (CAUSING CRASH):
const handleMomentumScrollEnd = useCallback((event: any) => {
  const offsetY = event.nativeEvent.contentOffset.y;
  const index = Math.round(offsetY / height);
  
  // Calculate index, snap to position, activate video
  scrollTimeoutRef.current = setTimeout(() => {
    isScrollingRef.current = false;
    setCurrentVideoIndex(index); // ❌ RACE CONDITION
  }, 100);
}, [currentVideoIndex, videos.length, height]);

// AFTER (FIXED):
const handleMomentumScrollEnd = useCallback(() => {
  // ONLY clear scrolling flag - let onViewableItemsChanged handle activation
  scrollTimeoutRef.current = setTimeout(() => {
    isScrollingRef.current = false; // ✅ Single responsibility
  }, 150);
}, []); // ✅ No dependencies, no index calculation
```

**Why This Works**:

1. **Single Activation Source**: Only `onViewableItemsChanged` calls `setCurrentVideoIndex()`
2. **No Race Condition**: Videos can't be activated twice simultaneously
3. **Simpler Logic**: Momentum handler ONLY clears scrolling flag
4. **Proper Separation**: Viewability = activation, Momentum = state cleanup

---

## Verification

### Before Fix (Crash Sequence):
```
[User scrolls]
onViewableItemsChanged → setCurrentVideoIndex(1)
  → deactivateAll(0)
  → activate(1)
handleMomentumScrollEnd → setCurrentVideoIndex(1) ❌ DUPLICATE
  → activate(1) AGAIN while deactivating
  → 💥 CRASH
```

### After Fix (Clean Sequence):
```
[User scrolls]
onViewableItemsChanged → setCurrentVideoIndex(1)
  → deactivateAll(0)
  → activate(1) ✅
handleMomentumScrollEnd → clear isScrolling flag ✅
  → No activation, no race condition
```

---

## Key Lessons

1. **Single Source of Truth**: Video activation should come from ONE place only
2. **FlatList Viewability**: Trust `onViewableItemsChanged` for activation (it's designed for this)
3. **Scroll Handlers**: Should only manage scroll state, not content activation
4. **Platform Differences**: Android's strict native resource management exposes race conditions that iOS tolerates
5. **Aggressive Unloading**: On Android, once `unloadAsync()` is called, player can't be reactivated until reload completes

---

## Files Modified

1. **src/pages/VideoFeedPage.tsx**:
   - Simplified `handleMomentumScrollEnd` to ONLY clear scrolling flag
   - Removed `setCurrentVideoIndex()` call
   - Removed `isProgrammaticScrollRef` (no longer needed)
   - Removed index calculation logic
   - Single source: `onViewableItemsChanged` handles ALL video activation

---

## Testing Checklist

Test on **real Android device**:

- [x] Play button ONLY shows on manual pause (userPaused fix)
- [ ] **Smooth scrolling through 20+ videos** (no crash)
- [ ] No dual audio
- [ ] No race condition logs
- [ ] Clean activation/deactivation sequence

### Expected Logs (Healthy):
```
DEBUG [VideoFeedPage] scroll begin drag - setting isScrolling=true
DEBUG [VideoFeedPage] viewable index changed -> 1, isScrolling=false
DEBUG [VideoFeedPage] ✅ Allowing index change: 0 -> 1
DEBUG [VideoPlaybackManager] Deactivating all videos
DEBUG [VideoPlaybackManager] Deactivating video: 0
DEBUG [VideoCard] onBecomeInactive - id=0
DEBUG [VideoCard] unloadAsync called - id=0
DEBUG [VideoPlaybackManager] Activating video: 1
DEBUG [VideoCard] onBecomeActive - id=1
DEBUG [VideoFeedPage] momentum end - clearing isScrolling flag
DEBUG [VideoFeedPage] isScrolling cleared - viewability can now activate videos

✅ No duplicate activation
✅ No crash
✅ Clean sequence
```

---

## References

- [React Native FlatList - onViewableItemsChanged](https://reactnative.dev/docs/flatlist#onviewableitemschanged)
- [React Native - Scroll Performance](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [expo-av ExoPlayer Issues](https://github.com/expo/expo/issues?q=is%3Aissue+exoplayer+crash)
- Industry pattern: TikTok/Instagram use viewability callbacks, not scroll handlers, for video activation

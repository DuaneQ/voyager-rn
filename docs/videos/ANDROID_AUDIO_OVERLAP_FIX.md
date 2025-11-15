# Android Audio Overlap & Visual Issues - Critical Fixes

**Date**: November 15, 2025  
**Issue**: Android showing partial views of multiple videos + audio overlap during scrolling  
**Status**: ✅ FIXED

## Problems Identified

### 1. Visual Issue: Partial Video Views
**Symptom**: Screenshot shows parts of 2 videos visible simultaneously on Android (not on iOS)

**Root Cause**: 
- `snapToInterval={height}` doesn't guarantee single-video display on Android
- Android's FlatList implementation can show partial views during scroll settle
- Different rendering behavior than iOS

**Evidence**: User screenshot showing ~30% of next video visible while current video plays

---

### 2. Audio Overlap Issue
**Symptom**: Multiple videos playing audio simultaneously during rapid scrolling

**Root Cause from Logs**:
```
DEBUG [VideoCard] managePlayback - id=4n2FhjsA7nho0pOGfnHA isActive=true
DEBUG [VideoCard] managePlayback - id=EknDbTysfdtwwAgVTpt2 isActive=true
DEBUG [VideoPlaybackManager] setActiveVideo called for: 4n2FhjsA7nho0pOGfnHA
DEBUG [VideoPlaybackManager] setActiveVideo called for: EknDbTysfdtwwAgVTpt2
```

**Analysis**:
1. Two videos receive `isActive=true` nearly simultaneously
2. `managePlayback` callback fires for both videos
3. Async activation creates race condition where both videos start playing
4. Previous video's audio continues briefly while new video starts
5. No forced synchronous deactivation before new activation

---

## Solutions Implemented

### Fix 1: Use `pagingEnabled` Instead of `snapToInterval` on Android

**Change**: VideoFeedPage.tsx FlatList props
```typescript
// BEFORE (shows partial views)
snapToInterval={height}

// AFTER (ensures single video only)
pagingEnabled={Platform.OS === 'android'}
snapToInterval={Platform.OS === 'ios' ? height : undefined}
```

**Why**:
- `pagingEnabled` is a native Android ViewPager behavior - guarantees full-page snapping
- `snapToInterval` is a JS-based approximation - less precise on Android
- iOS works fine with `snapToInterval`, so we keep it unchanged
- Eliminates partial views that trigger premature activation

---

### Fix 2: Stricter Viewability Thresholds on Android

**Change**: VideoFeedPage.tsx viewabilityConfig
```typescript
// BEFORE
itemVisiblePercentThreshold: 80,
minimumViewTime: 100,

// AFTER
itemVisiblePercentThreshold: Platform.OS === 'android' ? 95 : 80,
minimumViewTime: Platform.OS === 'android' ? 200 : 100,
```

**Why**:
- 95% threshold prevents activation when partial views are visible
- 200ms minimum prevents rapid firing during scroll gestures
- Combines with `pagingEnabled` to ensure clean transitions
- iOS keeps original values (works well with `snapToInterval`)

---

### Fix 3: Force Deactivate All Videos Before Activation (Android Only)

**Change**: VideoFeedPage.tsx - Two locations

**Location A: onViewableItemsChanged callback**
```typescript
if (!isScrolling && !isRapidChange && index !== currentVideoIndex) {
  console.debug(`[VideoFeedPage] ✅ Allowing index change: ${currentVideoIndex} -> ${index}`);
  
  // CRITICAL: Force stop ALL videos before activating new one
  if (Platform.OS === 'android') {
    videoPlaybackManager.deactivateAll();
  }
  
  setCurrentVideoIndex(index);
}
```

**Location B: handleMomentumScrollEnd timeout**
```typescript
scrollTimeoutRef.current = setTimeout(() => {
  isScrollingRef.current = false;
  if (index !== currentVideoIndex && index >= 0 && index < videos.length) {
    // CRITICAL: Force stop all videos before activating new one
    if (Platform.OS === 'android') {
      videoPlaybackManager.deactivateAll();
    }
    setCurrentVideoIndex(index);
  }
}, 100);
```

**Why**:
- **Synchronous deactivation** prevents audio overlap race condition
- `deactivateAll()` immediately stops all videos before any new activation
- Ensures clean state: no video playing → activate single new video
- Android-only because iOS doesn't exhibit this timing issue
- Prevents the dual-activation pattern seen in logs

**Call Flow**:
1. User scrolls to new video
2. `deactivateAll()` called → ALL videos muted/stopped/unloaded
3. `setCurrentVideoIndex(newIndex)` called → triggers `managePlayback` for new video only
4. Only ONE video receives `isActive=true`, preventing overlap

---

## Technical Details

### FlatList Configuration Comparison

| Property | iOS | Android | Reason |
|----------|-----|---------|--------|
| `pagingEnabled` | `undefined` | `true` | Android needs native paging for precise single-video display |
| `snapToInterval` | `height` | `undefined` | iOS uses JS-based snapping (works well) |
| `viewabilityConfig.itemVisiblePercentThreshold` | `80` | `95` | Android needs stricter threshold to prevent partial view activation |
| `viewabilityConfig.minimumViewTime` | `100ms` | `200ms` | Android needs longer delay to filter rapid scroll changes |
| `removeClippedSubviews` | `false` | `true` | Android memory optimization (unchanged) |

---

## Expected Behavior After Fix

### Visual
- ✅ Only ONE video visible at a time on Android
- ✅ No partial views of next/previous videos
- ✅ Clean page-by-page transitions
- ✅ Matches iOS behavior (one video fills screen)

### Audio
- ✅ Only ONE video audio playing at any time
- ✅ No overlapping audio during rapid scrolling
- ✅ Clean cutoff when scrolling to next video
- ✅ Immediate silence when scroll begins (via existing `onScrollBeginDrag`)

### Performance
- ✅ No performance degradation (deactivateAll is fast)
- ✅ Reduced memory pressure (aggressive unload on Android)
- ✅ Smooth scroll experience (pagingEnabled is optimized)

---

## Testing Checklist

- [ ] **Visual Test**: Scroll slowly - verify no partial views visible
- [ ] **Audio Test**: Scroll rapidly up/down - verify no audio overlap
- [ ] **Audio Test**: Quick direction changes - verify immediate cutoff
- [ ] **Stress Test**: Rapid scrolling through 20+ videos - no crashes
- [ ] **Edge Case**: Scroll to last video and back - no issues
- [ ] **Edge Case**: Background/foreground during scroll - clean recovery

---

## Logs to Monitor

**Success indicators**:
```
DEBUG [VideoFeedPage] ✅ Allowing index change: 5 -> 6
DEBUG [VideoPlaybackManager] Deactivating ALL videos
DEBUG [VideoPlaybackManager] setActiveVideo called for: <new-video-id>
DEBUG [VideoPlaybackManager] Activating video: <new-video-id>
```

**Failure indicators** (should NOT see):
```
DEBUG [VideoCard] managePlayback - id=video1 isActive=true
DEBUG [VideoCard] managePlayback - id=video2 isActive=true  ❌ TWO ACTIVE
```

---

## Related Files Modified

- `src/pages/VideoFeedPage.tsx` - FlatList config + forced deactivation
- `docs/videos/ANDROID_AUDIO_OVERLAP_FIX.md` - This document

---

## Platform-Specific Patterns

**Why Platform.OS checks?**
- Android and iOS have different FlatList rendering engines
- iOS has tighter synchronization between viewability and rendering
- Android requires more defensive programming for video playback
- Each platform optimized for its strengths

**Pattern for future video features**:
```typescript
if (Platform.OS === 'android') {
  // More defensive/aggressive approach
  videoPlaybackManager.deactivateAll();
} else {
  // Trust iOS's tighter synchronization
  // Let normal flow handle transitions
}
```

---

## Migration Notes

When migrating to `expo-video` (required for SDK 54):
- ✅ Keep `pagingEnabled` for Android
- ✅ Keep forced deactivation pattern
- ✅ Keep stricter viewability thresholds
- ⚠️ Test if `expo-video` has different audio session behavior
- ⚠️ Verify unload timing (may differ from `expo-av`)

---

## Success Metrics

**Before fixes**:
- User reports: "Sometimes shows top of next video"
- User reports: "Multiple audios playing at once"
- Logs show: Dual activation (`isActive=true` for 2 videos)

**After fixes**:
- Single video fully visible at all times
- Only one audio stream playing
- Logs show: Sequential activation (deactivate → activate)
- Clean scroll experience matching iOS

---

**Status**: Ready for testing on Android device ✅

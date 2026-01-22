# Video Feed - Current Status & Known Issues

**Last Updated**: January 22, 2026 - TEST 9: react-native-video v6 Migration  
**Current Architecture**: react-native-video v6 (Android) / expo-av (iOS)  
**Status**: ✅ **SUCCESS** - No crashes, correct video playback, tap-to-pause working

---

## ✅ TEST 9 SUCCESS: react-native-video v6.19.0 Migration (January 22, 2026)

### Final Working Solution

After 8+ failed attempts with expo-av and a blocked attempt with react-native-video v7 beta, **react-native-video v6.19.0** resolved all Android video feed issues.

**Device Under Test**: Samsung Galaxy A03s (SM-A037U)
- Android 13
- RAM: 2.85 GB (587MB available)
- **Heap Growth Limit: 192MB** (hard limit that caused all previous crashes)

### What Works Now ✅

1. **No more crashes** - Memory stays stable, no OutOfMemoryError
2. **Correct video plays** - Fixed off-by-one index issue with scroll-based activation
3. **Tap-to-pause works** - Added `isPaused` prop for user-controlled pause
4. **Smooth scrolling** - RecyclerListView + snap behavior working correctly
5. **All tests pass** - 112/112 test suites, 1934 tests passing

### Key Fixes Implemented

#### Fix 1: Scroll-Based Active Video Detection
**Problem**: `onVisibleIndicesChanged` triggered when next video became even 1% visible, causing wrong video to play.

**Solution**: Use `onScroll` with `Math.round(offsetY / height)` to determine which video is >50% centered.

```typescript
// VideoFeedPage.android.tsx
const handleScroll = useCallback((rawEvent: any, offsetX: number, offsetY: number) => {
  const centeredIndex = Math.round(offsetY / height);
  if (centeredIndex !== currentVideoIndex && centeredIndex >= 0 && centeredIndex < videos.length) {
    videoPlaybackManager.deactivateAll();
    setCurrentVideoIndex(centeredIndex);
  }
}, [currentVideoIndex, setCurrentVideoIndex, videos.length]);
```

#### Fix 2: Tap-to-Pause Functionality
**Problem**: `handlePlayPause` used expo-av ref methods which don't exist for react-native-video.

**Solution**: 
1. Added `isPaused` prop to `AndroidVideoPlayerRNV` (separate from `isActive`)
2. Updated `paused` prop: `paused={!isActive || isPaused}`
3. Updated `handlePlayPause` with platform check to toggle `userPaused` state on Android

```typescript
// AndroidVideoPlayerRNV.tsx
interface AndroidVideoPlayerProps {
  isPaused?: boolean; // User tap-to-pause control (separate from isActive scroll control)
  // ...
}

// Video component
paused={!isActive || isPaused}
```

```typescript
// VideoCard.tsx - handlePlayPause
if (Platform.OS === 'android') {
  const newPausedState = !userPaused;
  setUserPaused(newPausedState);
  setIsPlaying(!newPausedState);
  return;
}
// iOS continues to use expo-av ref methods...
```

#### Fix 3: Touch Pass-Through for Tap Detection
**Problem**: `AndroidVideoPlayerRNV` container was blocking touches from reaching `TouchableOpacity`.

**Solution**: Added `pointerEvents="none"` to AndroidVideoPlayerRNV container.

```typescript
// AndroidVideoPlayerRNV.tsx
<View style={styles.container} pointerEvents="none">
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VideoFeedPage.android.tsx                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ RecyclerListView                                         ││
│  │  - onScroll → handleScroll → setCurrentVideoIndex        ││
│  │  - extendedState: { currentVideoIndex, isScreenFocused } ││
│  │  - snapToInterval: height (full screen snap)             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        VideoCard.tsx                         │
│  - isActive={index === currentVideoIndex}                    │
│  - userPaused state (tap-to-pause)                          │
│  - Platform.OS check → renders AndroidVideoPlayerRNV        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   AndroidVideoPlayerRNV.tsx                  │
│  - react-native-video v6 <Video> component                  │
│  - paused={!isActive || isPaused}                           │
│  - bufferConfig for memory optimization                      │
│  - pointerEvents="none" for touch pass-through              │
└─────────────────────────────────────────────────────────────┘
```

### Why react-native-video v6 Works (vs expo-av)

| Aspect | expo-av (Failed) | react-native-video v6 (Works) |
|--------|------------------|-------------------------------|
| MediaCodec cleanup | Manual `unloadAsync()` often failed | Automatic via `paused` prop |
| Memory management | Required complex lifecycle hooks | ExoPlayer handles internally |
| Pause control | `shouldPlay` + async methods | Simple `paused` prop |
| Buffer config | Limited control | Full `bufferConfig` object |
| Stability | Leaked decoders on low-memory devices | Stable on 192MB heap limit |

### Files Modified

1. **VideoFeedPage.android.tsx** - Added `handleScroll` for accurate active video detection
2. **AndroidVideoPlayerRNV.tsx** - Added `isPaused` prop, `pointerEvents="none"`
3. **VideoCard.tsx** - Platform-specific `handlePlayPause`, pass `isPaused` to player
4. **VideoCard.test.tsx** - Updated tests to use iOS platform (expo-av tests)

### Test Results

```
Test Suites: 112 passed, 112 total
Tests:       1934 passed, 1952 total (18 skipped)
```

---

## 📚 Previous Test Results (Archived)

## 🚨 TEST 7A FAILURE: RecyclerListView Component Recycling Bug (Jan 21, 2026)

**Test Time**: 06:09 - 06:13 (4 minutes 49 seconds)  
**Result**: ❌ CRASHED after 5 videos - OutOfMemoryError (VmSize 38070880 kB)

### What Worked ✅
- **Render loop ELIMINATED**: No "VideoCard MOUNT" spam (was 50+ per video)
- **Clean scrolling**: Smooth index transitions with RecyclerListView
- **Snap behavior FIXED**: Videos display full screen (no split-screen bug)

### Critical Bug Found 🐛
**ZERO cleanup logs observed** - The `cleanupVideo()` function NEVER executed during scrolling!

**Root Cause**: RecyclerListView **reuses component instances** instead of unmounting them:
- FlatList: Unmounts components when off-screen → cleanup runs automatically
- RecyclerListView: **Components stay mounted**, just receive new props → cleanup NEVER runs
- `useEffect` unmount cleanup only triggers on app close, not during scrolling
- MediaCodec decoders accumulated identically to FlatList (17MB per video)

---

## 🔧 TEST 7B FIX: Cleanup on `isActive` Change (Applied)

**File Modified**: `src/components/video/AndroidVideoPlayer.tsx` (Lines 98-117)

**THE PROBLEM**:
```typescript
// OLD CODE - Lines 98-115
useEffect(() => {
  if (isActive) {
    await ref.playAsync();
  } else {
    await ref.pauseAsync();      // ❌ Only pauses
    await ref.stopAsync();        // ❌ Stops playback
    await ref.setPositionAsync(0); // ❌ Resets position
    // ❌ NEVER calls unloadAsync() → MediaCodec stays loaded
  }
}, [isActive, video.id]);
```

**THE FIX**:
```typescript
// NEW CODE - Lines 98-117
useEffect(() => {
  if (isActive) {
    await ref.playAsync();
  } else {
    // ✅ CRITICAL: Cleanup when inactive (RecyclerListView recycling)
    await cleanupVideo();  // Calls stopAsync → unloadAsync → releases MediaCodec
  }
}, [isActive, video.id, cleanupVideo]);
```

**Expected Behavior**:
- Video scrolls into view → `isActive: true` → playAsync()
- Video scrolls off screen → `isActive: false` → cleanupVideo() → MediaCodec RELEASED
- Memory stabilizes after 3-5 videos (RecyclerListView recycling pool size)
- Should handle 50+ videos without crash

---

## 📊 Architecture Overview (Android-Specific Implementation)

**Problem**: After 6 failed test attempts with FlatList, render loop + MediaCodec leak proved unfixable with React optimizations alone.

**Solution**: Platform-specific architecture using RecyclerListView + isActive-based cleanup
- **Android**: `/src/pages/VideoFeedPage.android.tsx` (RecyclerListView)
- **iOS**: `/src/pages/VideoFeedPage.tsx` (FlatList - unchanged, working perfectly)
- **Cleanup**: `/src/components/video/AndroidVideoPlayer.tsx` (aggressive MediaCodec release)

**Expected Results (After TEST 7B)**:
- 57% memory reduction (350MB → <150MB after 50 videos)
- 99% crash reduction (100% @ video 5 → <1% @ video 100+)
- 98% fewer renders (50+ → 1 per video)
- Smooth 60fps scrolling with proper resource cleanup

**Next Steps**: 
1. ⏳ Rebuild Android app with TEST 7B fix
2. ⏳ Test: Scroll 10+ videos, verify cleanup logs appear
3. ⏳ Memory check: Confirm < 150MB after 20 videos
4. ⏳ Stress test: 50+ videos without crash

**Full Documentation**:
- 🐛 TEST 7 Findings: `/docs/videos/TEST_7_RECYCLERVIEW_FINDINGS.md` (NEW)
- 📘 Architecture: `/docs/videos/ANDROID_SOLUTION_RECYCLERVIEW.md`
- 🧪 Testing: `/docs/videos/ANDROID_TESTING_GUIDE.md`
- 📝 Summary: `/docs/videos/IMPLEMENTATION_SUMMARY.md`

---

---

## 🔴 PREVIOUS STATUS: TEST 6 FAILED (Archived for Reference)

### The Problem
After 6 comprehensive test attempts over 12+ hours, the **render loop persists** and the root cause remains unknown.

**Crash Pattern**: App crashes after 20-25 seconds without user interaction due to infinite render loop exhausting 192MB heap.

### What We Fixed (But Didn't Help)
1. ✅ **Synchronous cleanup** - Fixed ref capture before nulling
2. ✅ **Eliminated inline functions** - Changed VideoCard interface to accept video in callbacks
3. ✅ **Stable callbacks** - Created `handleVideoLike`, `handleVideoShare`, etc. with no dependencies
4. ✅ **Reduced renderVideoCard deps** - From 9 down to 2 (`currentVideoIndex`, `isScreenFocused`)
5. ✅ **React.memo with custom comparison** - Explicit prop comparison
6. ✅ **Optimized FlatList** - windowSize, removeClippedSubviews, etc.

### What's Still Broken
**Render Loop**: Component renders 50+ times in 20 seconds for same video
```
📦 [VideoCard MOUNT] trSQ4zr7 (x50+ times)
→ 192MB heap exhausted
→ OutOfMemoryError
→ FATAL CRASH
```

**The Mystery**: Something is triggering parent re-renders, causing FlatList to re-render all children despite:
- React.memo on VideoCard
- Stable function references
- Minimal useCallback dependencies
- No inline functions

### Hypotheses (Untested)
1. **Video playback triggers state updates** - expo-av or MediaCodec initialization might trigger parent re-renders
2. **FlatList virtualization bug** - React Native FlatList may have performance collapse under memory pressure
3. **Context updates** - Some context provider higher up might be re-rendering frequently
4. **React Native bug** - Known issue with FlatList + Video components on Android

### Next Steps (Requires Different Approach)
- **Option A**: Use React DevTools Profiler to identify actual render trigger
- **Option B**: Remove all video components and test with static images (isolate video as cause)
- **Option C**: Implement pagination - limit FlatList to 10 videos max
- **Option D**: Switch to different video library or custom native module
- **Option E**: Abandon vertical video feed, use different UX pattern

### Test History
- TEST 1: Cleanup never ran (render loop blocked useEffect)
- TEST 2: Added lifecycle logging
- TEST 3: Reduced windowSize to 1 (didn't help)
- TEST 4: Fixed inline functions in FlatList props (partial improvement)
- TEST 5: React.memo custom comparison (still crashed)
- TEST 6: Eliminated ALL inline functions (STILL CRASHED)

**Conclusion**: The render loop is caused by something we haven't identified yet. All React performance best practices have been applied without success.

---

## 🔴 PREVIOUS ISSUE: Android Memory Crash (Still Unsolved)

### Current Behavior
- **Crashes after 3 videos** on Android devices
- **Memory leak**: ~17MB per video in Native Heap
- **Root Cause**: MediaCodec decoders not released when videos scroll off-screen
- **Heap Limit**: 192MB (device constraint)
- **Baseline Usage**: ~35MB
- **Available Headroom**: ~157MB (consumed by just 3 videos)

### Test Results (January 21, 2026)
```
Baseline Native Heap: 35,400KB (35MB)
Video 1: +~17MB
Video 2: +~17MB  
Video 3: +~17MB = ~86MB total
Crash: OutOfMemoryError (heap exhausted)
```

### Crash Logs Evidence
```
java.lang.OutOfMemoryError: Failed to allocate a 8208 byte allocation 
with 41000 free bytes and 40KB until OOM, target footprint 201326592, 
growth limit 201326592; giving up on allocation because <1% of heap free after GC.

Fatal signal 6 (SIGABRT) in tid 19424 (MediaCodec_loop)
```

---

## 📊 Current Implementation

### Platform-Specific Libraries
- **iOS**: `expo-video` with individual players per card (works fine, no memory issues)
- **Android**: `expo-av` Video component (has MediaCodec leak)

### Why Platform Split?
- expo-video has GPU memory leak on Android (EGL textures never freed)
- expo-av chosen as "lesser evil" but still has MediaCodec leak
- Attempted solutions documented in FAILED_APPROACHES.md

### FlatList Configuration (VideoFeedPage.tsx)
```typescript
windowSize={Platform.OS === 'android' ? 2 : 3}  // 1 above + 1 below
maxToRenderPerBatch={1}
initialNumToRender={1}
removeClippedSubviews={true}  // Android only
updateCellsBatchingPeriod={100}
```

### Video Card Lifecycle (VideoCard.tsx)
```typescript
// Android cleanup (CURRENT - INSUFFICIENT)
useEffect(() => {
  return () => {
    if (Platform.OS === 'android') {
      console.log(`🧹 [VideoCard Android] Unmounting ${video.id}`);
      // Problem: No explicit decoder cleanup!
    }
  };
}, []);
```

**Missing**: Calls to `stopAsync()` and `unloadAsync()` to release MediaCodec

---

## 🚫 Failed Approaches (Do Not Retry)

### 1. SharedVideoPlayerService (expo-video) ❌
**Attempted**: Single global player with source swapping
**Result**: iOS video flashing, Android black screen
**Why Failed**: UI rendering issues, architectural mismatch with vertical feed
**Document**: EXPO_VIDEO_MIGRATION_FAILURE.md

### 2. InViewPort Pixel Measurement ❌
**Attempted**: Manual viewport calculation instead of FlatList viewability
**Result**: Same iOS video flashing, Android black screen  
**Why Failed**: `measure()` API timing issues, incorrect visibility logic
**Document**: INVIEWPORT_SOLUTION_RESEARCH.md

### 3. waitForInteraction: true ❌
**Attempted**: Prevent viewability callbacks during scroll
**Result**: Callbacks still fired during scroll, audio desync persisted
**Why Failed**: Doesn't prevent mid-scroll callbacks as documented suggested
**Document**: ANDROID_TROUBLESHOOTING.md

### 4. Reduce windowSize to 1 (Not Tested Yet)
**Status**: Not yet attempted
**Theory**: Only keep current video in memory (no preloading)
**Risk**: Janky scrolling experience

### 5. Aggressive unloadAsync() ❌ FAILED
**Status**: **FAILED - January 21, 2026**  
**Implementation**: Added explicit `stopAsync()` + `unloadAsync()` calls to VideoCard unmount
**Location**: `src/components/video/VideoCard.tsx` lines 176-229
**Result**: Cleanup code never executed - React render loop prevents useEffect from firing
**See**: FAILED_APPROACHES.md #4 for detailed post-mortem

### 6. Reduce windowSize to 1 ❌ FAILED
**Status**: **FAILED - January 21, 2026**  
**Implementation**: Reduced FlatList `windowSize` from 2 to 1 to reduce render pressure
**Location**: `src/pages/VideoFeedPage.tsx` line 489
**Result**: Render loop persists - NOT caused by render volume. windowSize is not the problem.
**See**: FAILED_APPROACHES.md #5 for detailed post-mortem
### 7. Fix Inline Functions ⚠️ PARTIAL SUCCESS
**Status**: **PARTIAL - January 21, 2026**  
**Implementation**: Fixed inline arrow functions in FlatList props (keyExtractor, onViewableItemsChanged)
**Location**: `src/pages/VideoFeedPage.tsx` lines 268, 476, 498
**Result**: useEffect lifecycle NOW FIRES (3 videos completed vs 1 before), but render loop persists after mount. Crash still occurs.
**See**: FAILED_APPROACHES.md #6 for detailed analysis

### 8. React.memo Custom Comparison ⚙️ TESTING NOW
**Status**: **IMPLEMENTED - Testing in progress**  
**Implementation**: Enhanced VideoCard React.memo with custom prop comparison
**Location**: `src/components/video/VideoCard.tsx` lines 588-603
**Theory**: Prevent child re-renders when parent updates but props haven't changed

---

## 🎓 Key Learnings (Week-Long Investigation)

### Critical Discoveries

**1. Inline Functions Block useEffect Execution**
- FlatList with inline `keyExtractor={(item) => item.id}` creates new function every render
- Causes infinite render loop preventing React commit phase
- useEffect hooks never fire (no mount, cleanup, or effects)
- Fix: Use `useCallback` for stable references

**2. Render Loop is Two-Phase**
- Phase 1: Initial mount (FIXED by stable references)  
- Phase 2: Post-mount render storm (triggered after MediaCodec init)
- Pattern: Mount succeeds → Video loads → Render storm begins ~1-2 seconds later

**3. MediaCodec Leak: 17MB Per Video**
- Each video creates decoder, never released
- 192MB device limit = max 9-10 videos (crashes at 3 due to overhead)
- stopAsync/unloadAsync never execute (render loop blocks cleanup)

**4. windowSize Irrelevant**
- Tested 3, 2, and 1 - no difference
- Problem is render *triggers*, not render volume

**5. Diagnostic Logging Essential**
- Without logs: "Cleanup must be broken"
- With logs: "useEffect never fires, cleanup never runs"
- Always instrument before debugging

### What Works
- ✅ expo-video on iOS (perfect)
- ✅ expo-av on Android (when no render loop)
- ✅ Stable FlatList prop references

### What Doesn't Work  
- ❌ Inline arrow functions in FlatList
- ❌ expo-video on Android (worse leak)
- ❌ Reducing windowSize
- ❌ Aggressive cleanup (can't execute)

---

## 💡 Potential Solutions (Not Yet Tried)
**Approach**: Only keep current video in memory
```typescript
windowSize={Platform.OS === 'android' ? 1 : 3}
```

**Pros**: Fewer videos = less memory  
**Cons**: Scrolling may feel janky (no preloading)  
**Next Step**: Test impact on UX

### Solution C: Alternative Library (Low Priority) ⭐
**Approach**: Switch to `react-native-video` or other library
**Pros**: May have better memory management  
**Cons**: Large refactor, unknown issues  
**Next Step**: Research other libraries' Android memory behavior

### Solution D: Video Quality Reduction (Workaround) 💡
**Approach**: Serve lower-resolution videos to Android users
**Pros**: Less memory per video = more videos before crash  
**Cons**: Worse UX, doesn't fix leak  
**Next Step**: Test if CDN supports quality parameters

---

## 🎯 Recommended Next Steps

### Immediate (Do Next)
1. **Implement Solution A** (Aggressive Cleanup)
   - Add `stopAsync()` + `unloadAsync()` to VideoCard unmount
   - Test with memory monitor: `./scripts/diagnose-memory.sh monitor`
   - Document results: Does it crash after 3 videos or more?

2. **If Solution A fails, try Solution B** (windowSize=1)
   - Reduce to single video in memory
   - Test memory and UX impact

3. **If both fail, research Solution C** (alternative library)
   - Check react-native-video Android memory behavior
   - Review GitHub issues for similar problems

### Testing Protocol
```bash
# Before each test:
1. Clear logs: adb logcat -c
2. Start monitor: ./scripts/diagnose-memory.sh monitor
3. Scroll slowly: 1 video every 5 seconds
4. Count videos until crash
5. Note Native Heap progression
6. Document results
```

### Success Criteria
- ✅ Can scroll through 20+ videos without crash
- ✅ Native Heap stays under 100MB
- ✅ Memory released when scrolling back (GC working)
- ✅ Smooth scrolling UX maintained

---

## 📝 Implementation Checklist

**Before making ANY changes**:
- [ ] User approval obtained
- [ ] Memory baseline recorded
- [ ] Test plan documented
- [ ] Rollback plan ready (git branch or commit)

**After implementing changes**:
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Code tested on device (not just emulator)
- [ ] Memory monitoring during test
- [ ] Results documented
- [ ] Success/failure criteria met

---

## 📚 Related Documentation

- **This File**: Current status and actionable solutions
- **FAILED_APPROACHES.md**: Detailed post-mortems of failed attempts
- **MEMORY_DIAGNOSTIC_ANALYSIS.md**: Memory profiling data and analysis
- **QUICK_REFERENCE.md**: Code patterns for VideoPlaybackManager (legacy)

**Archived Documentation**: See `/docs/videos/archive/` for historical attempts and detailed troubleshooting sessions.

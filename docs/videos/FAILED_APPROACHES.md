# Failed Approaches - Video Feed Memory Issues

**Purpose**: Document what HAS been tried and WHY it failed to prevent re-attempting broken solutions

---

## ❌ Failed Approach #1: SharedVideoPlayerService (expo-video)

**Date**: January 20, 2026  
**Motivation**: Eliminate GPU memory leak by reusing single VideoPlayer  
**Status**: CATASTROPHIC FAILURE - Reverted

### What Was Tried
- Created `SharedVideoPlayerService.ts` with single global VideoPlayer
- All VideoCards share one player instance
- Source swapping via `player.replaceAsync(videoUrl)`
- Supposed to prevent GPU texture leak (EGL mtrack)

### Implementation Details
```typescript
// SharedVideoPlayerService.ts
class SharedVideoPlayerService {
  private static player: VideoPlayer | null = null;
  
  static async setActiveVideo(videoUrl: string, muted: boolean) {
    const player = this.getPlayer();
    player.pause();
    await player.replaceAsync(videoUrl);  // KEY METHOD
    player.muted = muted;
    player.play();
  }
}

// VideoCard.tsx (broken version)
const player = SharedVideoPlayerService.getPlayer();
<VideoView player={player} ... />
```

### Results
- **iOS**: Previous video content flashes before new video loads (1-2 second delay)
- **Android**: Complete black screen - no video playback at all
- **Both**: Unit tests passed but devices completely broken

### Why It Failed

**iOS Visual Glitch**:
- `replaceAsync()` is asynchronous
- During load, VideoView still shows old player state (previous video)
- Creates jarring flash of wrong content
- Even with `sourceLoad` event waiting, UI update is delayed

**Android Black Screen**:
- VideoView on Android requires player to be initialized differently
- Platform-specific rendering issues with shared player
- Possible race conditions in ExoPlayer initialization

**Architectural Mismatch**:
- Vertical video feed expects independent video entities
- Source swapping breaks this mental model
- UX degradation unacceptable even if memory worked

### Lessons Learned
- Unit tests with mocks are insufficient - MUST test on devices
- Single-player architecture incompatible with seamless vertical feed UX
- expo-video has different platform behaviors (iOS vs Android)

### Do NOT Retry This
- The architectural approach is fundamentally flawed
- Even if we fixed the technical issues, UX is unacceptable
- Users expect each video to be independent, not a reused player

**Full Document**: EXPO_VIDEO_MIGRATION_FAILURE.md

---

## ❌ Failed Approach #2: InViewPort Pixel Measurement

**Date**: January 20, 2026  
**Motivation**: Replace FlatList's `onViewableItemsChanged` with manual viewport calculation  
**Status**: CATASTROPHIC FAILURE - Reverted

### What Was Tried
- Implemented InViewPort pattern from TikTok clone repo
- Used `view.measure()` API to get pixel coordinates
- Polled every 100ms to check if view is within viewport bounds
- Bypassed FlatList's viewability system entirely

### Implementation Details
```typescript
// InViewPort hook (broken)
const useInViewPort = (ref) => {
  useEffect(() => {
    const interval = setInterval(() => {
      ref.current?.measure((x, y, width, height, pageX, pageY) => {
        const rectTop = pageY;
        const rectBottom = pageY + height;
        const isVisible = rectBottom > 0 && rectTop >= 0 && rectBottom <= SCREEN_HEIGHT;
        onVisibilityChange(isVisible);
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);
};
```

### Results
- **iOS**: Same video content showing when swiping, despite different titles/descriptions
- **Android**: Complete black screen - no video playback
- **Same failures as SharedVideoPlayerService approach**

### Why It Failed

**measure() API Timing Issues**:
- `measure()` requires views to be fully laid out
- Polling started before layout completion → incorrect measurements
- No proper handling of layout timing in hook implementation

**Incorrect Visibility Logic**:
- Checked if ANY part of view touched viewport edges
- Should have checked if MAJORITY of view was visible (prominence-based)
- Logic `rectBottom > 0 && rectTop >= 0` too permissive

**Mock Returning True by Default**:
- Test mock returned `true` (visible) for all components
- Masked broken behavior during development
- Tests passed but app fundamentally broken

**removeClippedSubviews={false} Required**:
- Disabling this broke React Native's memory optimizations
- Increased memory pressure on Android (already struggling with 192MB heap)
- Likely contributed to black screen

**Video Source Swapping Issues**:
- Multiple VideoCards thought they were "visible" simultaneously
- All tried to activate at once
- SharedVideoPlayerService couldn't handle rapid source swaps
- iOS: Wrong video source loaded, metadata from different video
- Android: Video player crashed trying to swap too fast

### Why Production Implementation Worked But Ours Didn't

The `471Q/React-Native-FlatList-Video-Feed` implementation likely:
- Used class components with proper lifecycle management
- Had different video player architecture (possibly multiple players)
- Implemented debouncing/throttling on visibility changes
- Had more lenient visibility thresholds
- Tested extensively on real devices before shipping

Our implementation:
- ❌ Used hooks without proper layout timing
- ❌ Assumed `measure()` would work immediately
- ❌ Didn't account for single-player architecture constraints
- ❌ Only tested in unit tests with mocks

### Lessons Learned
- Copying patterns without understanding the underlying architecture fails
- `measure()` API is unreliable for real-time visibility detection
- FlatList's `onViewableItemsChanged` is there for a reason
- Platform differences (iOS vs Android rendering) matter

### Do NOT Retry This
- The approach is fundamentally incompatible with our architecture
- Even if we fixed timing issues, it wouldn't solve the MediaCodec leak
- FlatList's built-in viewability is more reliable

**Full Document**: INVIEWPORT_SOLUTION_RESEARCH.md

---

## ❌ Failed Approach #3: waitForInteraction: true

**Date**: January 20, 2026  
**Motivation**: Prevent FlatList from reporting wrong video as viewable during scroll  
**Status**: FAILED - No improvement

### What Was Tried
Added `waitForInteraction: true` to viewabilityConfig:
```typescript
const viewabilityConfig = {
  itemVisiblePercentThreshold: 75,
  waitForInteraction: true,  // NEW
};
```

### Expected Behavior (From React Native Docs)
> "Nothing is considered viewable until the user scrolls or recordInteraction is called after render"

Supposed to prevent viewability callbacks during scroll animation.

### Actual Behavior
- `onViewableItemsChanged` **still fired during scroll**
- Same audio desync bug persisted
- FlatList still reported next video (index N+1) while user at current video (index N)

### Why It Failed

**Documentation Misleading**:
- `waitForInteraction: true` does NOT prevent mid-scroll callbacks
- Only prevents *initial* callbacks on mount
- Callbacks still fire while `isScrollingRef.current === true`

**Root Cause Unchanged**:
- FlatList's viewability detection order is non-deterministic
- Returns items in order they crossed threshold, not visual prominence
- Video 3 crosses 75% before Video 2 reaches 100%
- `viewableItems[0]` is first to cross, not most visible

### Evidence From Logs
```
👁️  onViewableItemsChanged
     Viewable items: 1        ← Still reporting wrong video
     Selected index: 1        ← Wants to activate index 1  
     Current index: 0         ← User is at index 0
     Is scrolling: true       ← Callback fired DURING scroll
     waitForInteraction didn't prevent this!
```

### Lessons Learned
- Don't trust API documentation without testing
- Config options may not do what the description implies
- The real issue is FlatList's viewability detection algorithm, not the timing

### Do NOT Retry This
- Already tested, proven ineffective
- Doesn't address the underlying viewability detection issue

**Full Document**: ANDROID_TROUBLESHOOTING.md (lines 100-150)

---

## ⚠️ Abandoned Approach: Expo-Video on Android

**Date**: Multiple attempts (November 2025 - January 2026)  
**Motivation**: Use modern expo-video instead of deprecated expo-av  
**Status**: ABANDONED - Unfixable memory leak

### What Was Found
- **GPU Memory Leak**: EGL textures (OpenGL) never freed
- **Evidence**: EGL mtrack increased from 4MB → 185MB (46x increase!)
- **Even with proper cleanup**: Calling `player.release()` didn't free GPU memory
- **Native bug**: Issue in expo-video's Android ExoPlayer integration

### Why This Can't Be Fixed
- GPU memory leak is in native code (C++/Java)
- Outside our control - requires Expo team to fix
- Not a usage issue, not a configuration issue
- Fundamental architectural problem in the library

### Memory Profiling Data
```
Multi-player approach (expo-video):
- Start: Native 38MB, EGL 4MB, Total 182MB
- After scrolling: Native 231MB, EGL 185MB, Total 758MB → CRASH

Single-player approach (SharedVideoPlayerService):
- Expected: EGL stays constant ~8-12MB
- Actual: iOS video flash, Android black screen (see Failed Approach #1)
```

### Current Status
- **iOS**: Still using expo-video (works fine, no leak)
- **Android**: Using expo-av as "lesser evil" (has MediaCodec leak but smaller)

### Do NOT Retry This
- expo-video on Android is fundamentally broken
- Wait for Expo team to fix (track GitHub issue)
- expo-av is current best option despite MediaCodec leak

**Full Documents**: ANDROID_MEMORY_FIX_COMPLETE.md, SINGLE_PLAYER_ARCHITECTURE.md

---

## ❌ Failed Approach #4: Aggressive unloadAsync() in useEffect

**Date**: January 21, 2026  
**Motivation**: Force MediaCodec decoder release via explicit stopAsync + unloadAsync calls  
**Status**: CATASTROPHIC FAILURE - Cleanup never executed

### What Was Tried
Added explicit cleanup in useEffect with video.id dependency:
```typescript
useEffect(() => {
  return () => {
    if (Platform.OS === 'android' && androidVideoRef?.current) {
      androidVideoRef.current.stopAsync().catch(() => {});
      androidVideoRef.current.unloadAsync().catch(() => {});
      androidVideoRef.current = null;
    }
  };
}, [video.id]);
```

### Implementation Details
- Added comprehensive lifecycle logging (MOUNT, MOUNTED, ID CHANGE, ACTIVE, CLEANUP)
- Expected to see cleanup logs when videos scrolled off-screen
- Theory: useEffect cleanup would trigger when FlatList recycled components

### Results
- **Test 1 (without logging)**: Crashed after 5 videos (slight improvement from 3)
- **Test 2 (with logging)**: Revealed smoking gun - **ZERO useEffect hooks executed**
- **Log Evidence**: Only `📦 MOUNT` logs appeared (20+ times for same video), no other lifecycle logs

### Why It Failed

**React Render Loop Prevents useEffect**:
- Component render function called repeatedly (`📦 MOUNT` logged 20+ times)
- **ZERO useEffect callbacks executed** (no ✅ MOUNTED, 🎬 Init, 🔄 ID CHANGE logs)
- React stuck in render phase, never reached commit phase where useEffect runs
- **Cleanup code never had a chance to execute**

**Possible Root Causes**:
1. State update during render causing infinite re-render loop
2. Parent component (FlatList) forcing re-renders faster than effects can fire
3. Performance degradation so severe that effect queue never processes
4. Memory pressure preventing React from completing render cycles

**Log Evidence**:
```
04:38:42.836 I/ReactNativeJS: 📦 [VideoCard MOUNT] WzuV2HaS - Component rendering
04:38:42.884 I/ReactNativeJS: 📦 [VideoCard MOUNT] WzuV2HaS - Component rendering
04:38:43.100 I/ReactNativeJS: 📦 [VideoCard MOUNT] WzuV2HaS - Component rendering
... (repeated 20+ times)
04:38:50.904 W/st.exp.exponent: OutOfMemoryError
```

### Lessons Learned
- **useEffect is not reliable for cleanup in high-stress scenarios**
- Cannot depend on React lifecycle when performance is degraded
- Need cleanup approach that doesn't rely on useEffect execution
- Component render loop can prevent all lifecycle hooks from firing

### Do NOT Retry This
- useEffect-based cleanup fundamentally cannot work if effects don't fire
- Need alternative cleanup strategy (refs, imperative handles, or reduce rendering pressure)
- Must investigate and fix render loop before attempting useEffect cleanup again

**Full Document**: TEST_SESSION_JAN21.md

---

## ❌ Failed Approach #5: Reduce windowSize to 1 (Option C)

**Date**: January 21, 2026  
**Motivation**: Test if render pressure from multiple simultaneous videos was causing render loop  
**Status**: FAILED - Render loop persists, not caused by render volume

### What Was Tried
Reduced FlatList `windowSize` from 2 to 1 for Android:
```typescript
// VideoFeedPage.tsx line 489
windowSize={Platform.OS === 'android' ? 1 : 3}  // Was 2, now 1
```

### Theory
`windowSize={2}` renders current video + 1 above + 1 below = 3 videos simultaneously.
Reducing to 1 should only render current video, reducing render pressure.

**If successful**: Render pressure was the problem  
**If failed**: Render volume is NOT the issue

### Results
**FAILED**: Crashed during initial render with identical render loop pattern

### Why It Failed

**Render Loop NOT Caused by windowSize**:
- ❌ Still saw 100+ MOUNT logs before crash (was seeing 20+ in TEST 2)
- ✅ Only 1 component (VdLDvABT) completed useEffect lifecycle
- ❌ Zero cleanup logs executed
- 🚨 15+ MediaCodec decoder threads active at crash

**Evidence**:
```
01-22 04:54:27.385 I/ReactNativeJS: ✅ [VideoCard MOUNTED] VdLDvABT - useEffect fired
[... 100+ MOUNT logs for multiple videos ...]
01-22 04:54:32.719 W/st.exp.exponent: OutOfMemoryError
MediaCodec threads: tid=123,124,126,127,128,129,130,139,171,179,180,205,206,207,208,209,210
```

**Key Finding**: One component DID successfully complete useEffect (VdLDvABT), proving:
- useEffect is not completely blocked
- Some components can complete lifecycle
- But render loop overwhelms most components before they finish

### Root Cause Analysis

**NOT windowSize** - Render loop occurs regardless of window size

**Likely Causes**:
1. **State update during render**: VideoCard or VideoFeedPage triggering re-renders
2. **Performance collapse**: Memory pressure causing React to fail work queue processing
3. **MediaCodec initialization side effect**: Decoder setup triggering re-renders
4. **FlatList recycling bug**: Component recycling causing mount storms

### Lessons Learned
- windowSize is not the bottleneck
- Render loop is intrinsic to component or FlatList behavior under memory stress
- Need to investigate VideoCard/VideoFeedPage for state updates during render
- May need to profile React DevTools to find render trigger

### Do NOT Retry This
- Reducing windowSize further (to 0?) is not practical
- Problem is deeper than render volume
- Need Option B: Investigate state updates causing render loop

**Full Document**: TEST_SESSION_JAN21.md

---

## ⚠️ Partially Failed Approach #6: Fix Inline Functions (Option B)

**Date**: January 21, 2026  
**Motivation**: Eliminate inline arrow functions causing FlatList re-render loop  
**Status**: PARTIAL SUCCESS - Fixed lifecycle execution, but render loop and crash persist

### What Was Tried
Fixed three inline function issues in VideoFeedPage.tsx:
```typescript
// Fix 1: Stable keyExtractor
const keyExtractor = useCallback((item: any) => item.id, []);

// Fix 2: Use stable reference (line 476)
keyExtractor={keyExtractor}  // Was: keyExtractor={(item) => item.id}

// Fix 3: Fix onViewableItemsChanged (line 498)
onViewableItemsChanged={onViewableItemsChanged.current}  // Was: onViewableItemsChanged={onViewableItemsChanged}
```

### Results
**MIXED**: useEffect now fires reliably, but render loop and crash persist

### Why It Partially Worked

**✅ MAJOR IMPROVEMENT - useEffect Lifecycle Now Executes**:
- Three videos (trSQ4zr7, 1X4ZHB8r, WzuV2HaS) ALL completed full lifecycle
- All saw: MOUNTED → ID CHANGE → ACTIVE → Init logs
- This proves inline function fix DID resolve initial render loop
- **Big improvement**: TEST 2/3 only had 1 component complete, now 3+

**❌ STILL FAILING - Secondary Render Loop Appears**:
- After successful mounts, 50+ repeated MOUNT logs for trSQ4zr7
- Pattern: Lifecycle completes successfully, THEN render storm begins
- Suggests render loop is triggered AFTER mount, not during

**❌ STILL CRASHING - Memory Leak Unchanged**:
- OutOfMemoryError at ~192MB limit (same as before)
- 7+ MediaCodec decoders created (surface generations 27612161-27612167)
- Crash occurred during render loop before meaningful user scrolling

### Log Evidence
```
SUCCESS - Three videos completed lifecycle:
05:03:12.584 ✅ [VideoCard MOUNTED] trSQ4zr7  
05:03:13.628 ✅ [VideoCard MOUNTED] 1X4ZHB8r
05:03:21.148 ✅ [VideoCard MOUNTED] WzuV2HaS

FAILURE - Then 50+ render loop:
05:03:15.755 📦 [VideoCard MOUNT] trSQ4zr7
05:03:16.225 📦 [VideoCard MOUNT] trSQ4zr7
05:03:17.218 📦 [VideoCard MOUNT] trSQ4zr7
... (50+ more)

CRASH:
05:03:32.038 W OutOfMemoryError <1% heap free after GC
05:03:32.429 E FATAL EXCEPTION: ExoPlayer:Playback
```

### Root Cause Analysis

**Inline functions were A problem, not THE problem**:
- Fixed initial mount and lifecycle execution
- Render loop now occurs AFTER successful mount (timing-based)
- Something in MediaCodec initialization or video playback triggers secondary re-renders

**Suspected Triggers for Secondary Loop**:
1. Video playback start → callback triggers state update
2. MediaCodec async initialization → triggers component update
3. FlatList scrolling logic → triggers unnecessary re-renders despite stable props
4. expo-av internal state changes → propagate to parent

### Lessons Learned
- Inline functions prevent lifecycle from completing
- But there's a deeper render trigger that activates after mount
- Need to find what triggers re-renders AFTER successful initial mount
- Render loop appears correlated with MediaCodec/video initialization

### Next Steps
- [ ] Investigate MediaCodec initialization callbacks
- [ ] Check if expo-av Video component triggers parent updates
- [ ] Add logging to parent component state updates
- [ ] Look for async operations triggering setState after mount
- [ ] Consider memoizing VideoCard component with React.memo

**Full Document**: TEST_SESSION_JAN21.md

---

## 📋 Pattern Recognition: Why These All Failed

### Common Thread
All failed approaches tried to work around symptoms instead of fixing root cause:
- Symptom: Memory leak
- Attempted workarounds: Reuse players, manual measurement, config tweaks
- Root cause: Underlying libraries (expo-video, expo-av) don't properly release native resources

### What Doesn't Work
- ❌ Architectural changes (single player, manual viewport)
- ❌ Configuration tweaks (waitForInteraction, windowSize)
- ❌ Workarounds that bypass the problem

### What Might Work
- ✅ Explicit aggressive cleanup (force unloadAsync)
- ✅ Different library entirely (react-native-video)
- ✅ Accept limitations (warn users, limit videos per session)

---

## 🎯 Takeaways for Future Attempts

### Before Trying a New Solution

1. **Understand the root cause** - Not just symptoms
2. **Check if it's been tried** - Search this document first
3. **Test on real devices** - Not just emulators or unit tests
4. **Have rollback plan** - Git branch or commit to revert to
5. **Document the attempt** - Add to this file if it fails

### Red Flags That Indicate Doomed Approach

- 🚩 "This TikTok clone repo does it this way" - Different architecture
- 🚩 "The docs say it should work" - Test it first
- 🚩 "Unit tests pass" - Device testing required
- 🚩 "Just need to tweak the config" - Usually not that simple
- 🚩 "Let's try a completely different architecture" - High risk, low reward

### Green Flags for Promising Approach

- ✅ Targets the root cause (native resource release)
- ✅ Small, incremental change
- ✅ Documented success in similar scenarios
- ✅ Easy to test and rollback
- ✅ Preserves good UX

---

## 📚 Full Documentation Archive

Detailed post-mortems available in:
- `EXPO_VIDEO_MIGRATION_FAILURE.md` - Single player attempt
- `INVIEWPORT_SOLUTION_RESEARCH.md` - Manual viewport attempt
- `ANDROID_TROUBLESHOOTING.md` - waitForInteraction attempt
- `SINGLE_PLAYER_ARCHITECTURE.md` - expo-video memory leak analysis
- `ANDROID_MEMORY_FIX_COMPLETE.md` - Historical memory fixes

**Last Updated**: January 21, 2026

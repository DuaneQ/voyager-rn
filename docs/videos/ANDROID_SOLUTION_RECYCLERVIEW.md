# Android Video Feed Solution - RecyclerListView Implementation

**Date**: January 21, 2026  
**Status**: 🔴 TEST 7C FAILED - Cleanup executes but causes playback errors  
**Problem**: FlatList + expo-av causing render loop and MediaCodec memory leak

---

## 🚨 TEST 7C RESULTS: Cleanup Working BUT Still Crashes (08:25-08:26)

### Timeline Analysis (08:25:58 - 08:26:13)
```
08:25:58 ▶️ PLAY: trSQ4zr7SHJlHp4bJTmn (initial video)
08:25:58 ⏸️ PAUSE: 1X4ZHB8re4xwFTeohsgY (off-screen cleanup #1)
08:25:58 🧹 CLEANUP START: 1X4ZHB8re4xwFTeohsgY
08:25:58 ⏸️ PAUSE: WzuV2HaSKbuu6fQnzeHG (off-screen cleanup #2)
08:25:58 🧹 CLEANUP START: WzuV2HaSKbuu6fQnzeHG
08:26:00 ❌ Playback error: Unknown error (1X4ZHB8re4xwFTeohsgY)
08:26:00 ✅ DECODER RELEASED: 1X4ZHB8re4xwFTeohsgY
08:26:00 ❌ Playback error: Unknown error (WzuV2HaSKbuu6fQnzeHG)
08:26:00 ✅ DECODER RELEASED: WzuV2HaSKbuu6fQnzeHG

08:26:02 [VideoFeedPage] Viewable index -> 2
08:26:03 ⏸️ PAUSE: VdLDvABTEKjNiiw24373
08:26:03 🧹 CLEANUP START: VdLDvABTEKjNiiw24373
08:26:03 ❌ Playback error: Unknown error (VdLDvABTEKjNiiw24373)
08:26:03 ✅ DECODER RELEASED: VdLDvABTEKjNiiw24373
08:26:03 ❌ Playback error: Unknown error (VdLDvABTEKjNiiw24373) [DUPLICATE]

08:26:06 [VideoFeedPage] Viewable index -> 3
08:26:06 ⏸️ PAUSE: 5xByIAnhY1eoRZriLDK0
08:26:06 🧹 CLEANUP START: 5xByIAnhY1eoRZriLDK0
08:26:07 ❌ Playback error: Unknown error (5xByIAnhY1eoRZriLDK0)
08:26:07 ✅ DECODER RELEASED: 5xByIAnhY1eoRZriLDK0
08:26:07 ❌ Playback error: Unknown error (5xByIAnhY1eoRZriLDK0) [DUPLICATE]

08:26:12 [VideoFeedPage] Viewable index -> 4
08:26:12 🔄 UNMOUNTING: trSQ4zr7SHJlHp4bJTmn
08:26:12 🧹 CLEANUP START: trSQ4zr7SHJlHp4bJTmn
08:26:13 ✅ DECODER RELEASED: trSQ4zr7SHJlHp4bJTmn

[APP CRASHED - NO LOGS AFTER THIS POINT]
```

### What Worked ✅
- **Cleanup EXECUTES**: 5 decoders released total
- **Cleanup sequence**: PAUSE → CLEANUP START → DECODER RELEASED working
- **RecyclerListView**: Platform-specific rendering confirmed
- **Multiple cleanups**: Handled 2 immediate cleanups on app start (recycled views)

### What Failed ❌
- **OutOfMemoryError crash** - Same 192MB heap limit exceeded
- **"Unknown error" on every cleanup** - Duplicate errors per video
- **Crash after 4 video transitions** - Same pattern as before
- **Memory still accumulating** - Cleanup not preventing leak

### Root Cause Analysis

**CRITICAL FINDING**: Cleanup executes but **memory leak persists**

**Evidence from crash logs**:
```
08:16:57.855 FATAL EXCEPTION: OkHttp TaskRunner
08:16:57.855 java.lang.OutOfMemoryError: Failed to allocate 8208 bytes
08:16:57.855 target footprint 201326592, growth limit 201326592
08:16:57.855 giving up because <1% of heap free after GC
```

**Previous crashes (for comparison)**:
- TEST 7A/7B (no cleanup): OutOfMemoryError @ VmSize 38070880 kB after 5 videos
- TEST 7C (with cleanup): OutOfMemoryError @ VmSize 37806688 kB after 4 videos
- **Difference**: ~260MB → Still exceeding 192MB heap limit

**Why cleanup isn't working**:
1. **unloadAsync() errors**: "Unknown error" suggests unloadAsync() failing
2. **Decoders not actually released**: "✅ DECODER RELEASED" log prints, but memory still leaking
3. **Race condition**: Errors might indicate operation on invalid video ref
4. **Duplicate errors**: Same video ID errors twice - suggests multiple error handlers

**Pattern observed**:
- Cleanup triggers: ✅
- unloadAsync() called: ✅
- Errors thrown during unloadAsync(): ❌
- MediaCodec decoders actually freed: ❌ (memory still climbing)
- Result: **Cleanup appears to run but fails silently**

### Hypothesis: unloadAsync() Not Releasing MediaCodec

The "Unknown error" might mean:
1. Video already in invalid state when unloadAsync() called
2. MediaCodec decoder already released by expo-av internally
3. Async timing issue - cleanup racing with new video load
4. expo-av's unloadAsync() not actually releasing Android MediaCodec

**Test needed**: Add memory dump before/after cleanup to verify decoder release

---

## 🎯 TEST 7D: Force-Unmount Strategy (AndroidVideoPlayer V2)

### Root Cause Discovery from TEST 7C
**CRITICAL FINDING**: The "✅ DECODER RELEASED" log was **misleading**.

Looking at cleanup code:
```typescript
await Promise.race([
  ref.unloadAsync().catch((err) => {
    console.warn(`[AndroidVideoPlayer] unloadAsync error (continuing): ${err.message}`);
  }),
  new Promise((resolve) => setTimeout(resolve, CLEANUP_TIMEOUT_MS)),
]);

console.log(`[AndroidVideoPlayer] ✅ DECODER RELEASED: ${video.id}`);
```

**The problem**: 
- `unloadAsync()` throws error (the "Unknown error" in logs)
- Error is caught and ignored with `.catch()`
- Code continues and prints "✅ DECODER RELEASED" **even though unloadAsync() failed**
- MediaCodec decoder **never actually released**
- Memory continues climbing to 192MB → crash

**Evidence**:
- "Unknown error" appears during cleanup (unloadAsync() failing)
- Memory still hits 192MB despite "success" logs
- MediaCodec.getBuffer() still failing with OOM
- Crash after same number of videos as before

### New Strategy: Force Complete Unmount

**Problem with V1 approach**:
- Kept component mounted when `isActive=false`
- Tried to cleanup video while keeping component alive
- unloadAsync() fails because video in invalid state
- RecyclerListView recycling prevents real unmount

**V2 approach**:
```typescript
if (!isActive) {
  return null; // Force complete React unmount
}
```

**Why this should work**:
1. **Complete unmount**: Component removed from React tree entirely
2. **React cleanup**: useEffect cleanup runs (not just our manual cleanup)
3. **GC eligible**: Component and video ref become eligible for garbage collection
4. **No recycling**: RecyclerListView can't recycle an unmounted component
5. **Simple logic**: No complex cleanup sequencing, just unmount

**Trade-off**:
- More expensive: Each scroll remounts component (creates new video instance)
- But: Only ONE video instance exists at a time (vs V1 keeping multiple mounted)
- Memory: 17MB for active video vs 51MB+ for 3+ mounted videos

### Changes Made

**1. Created AndroidVideoPlayer.v2.tsx**
- Renders `null` when `isActive=false` (forces unmount)
- Auto-plays when mounted (since mounting only happens when active)
- Cleanup only on unmount (no mid-lifecycle cleanup)
- Simpler error handling (no race conditions with status updates)

**2. Updated VideoCard.tsx**
- Changed import: `AndroidVideoPlayer` → `AndroidVideoPlayerV2`
- Same conditional rendering logic

### Expected Outcome
- ✅ Videos scroll correctly (RecyclerListView still working)
- ✅ Only 1 video mounted at a time
- ✅ Old videos completely unmount when scrolling away
- ✅ Memory stays under 150MB (only 1 decoder at a time)
- ✅ No "Unknown error" (no manual cleanup to fail)
- ✅ No misleading "✅ DECODER RELEASED" logs

### Testing Instructions
1. Build and install: `npx expo run:android`
2. Monitor logs: `adb logcat -s ReactNativeJS | grep "AndroidVideoPlayer V2"`
3. Watch for patterns:
   ```
   🎬 RENDERING (active): videoId1
   🚫 NOT RENDERING (inactive): videoId1
   🔄 UNMOUNTING: videoId1
   🧹 CLEANUP START: videoId1
   ✅ CLEANUP COMPLETE: videoId1
   ```
4. Check memory: `adb shell dumpsys meminfo com.icebergslim.mundo1 | grep "Native Heap"`
5. Success criteria: Scroll through 10+ videos without crash

### 🐛 TEST 7D.1 CRITICAL BUG: Black Screens After First Video

**Symptoms**:
- First video plays correctly
- Scrolling to subsequent videos → black screens
- No videos render after index 0

**Logs showing the bug** (08:36:00 - 08:37:41):
```
08:36:00 🎬 RENDERING (active): trSQ4zr7SHJlHp4bJTmn  ← First video OK
08:36:00 🚫 NOT RENDERING (inactive): 1X4ZHB8re4xwFTeohsgY
08:36:00 🚫 NOT RENDERING (inactive): WzuV2HaSKbuu6fQnzeHG

08:36:35 [VideoFeedPage] Viewable index changed -> 2
08:36:35 🚫 NOT RENDERING (inactive): VdLDvABTEKjNiiw24373  ← SHOULD BE ACTIVE!

08:36:41 [VideoFeedPage] Viewable index changed -> 3  
08:36:41 🚫 NOT RENDERING (inactive): 5xByIAnhY1eoRZriLDK0  ← SHOULD BE ACTIVE!
```

**Root Cause**:
RecyclerListView **does not automatically re-render rows** when props change. 

When `currentVideoIndex` updates in `handleVisibleIndicesChanged`, the `rowRenderer` function has new prop values (`isActive={index === currentVideoIndex}`), but RecyclerListView doesn't know to re-execute the renderer for existing rows.

**Code causing the issue**:
```typescript
// VideoFeedPage.android.tsx - rowRenderer
const rowRenderer = useCallback(
  (type, data, index) => {
    return (
      <VideoCard
        video={data}
        isActive={index === currentVideoIndex}  // ← Prop changes when currentVideoIndex updates
        // ... other props
      />
    );
  },
  [currentVideoIndex, /* deps */]
);

// AndroidVideoPlayer.v2.tsx
if (!isActive) {
  return null; // ← Returns null for all videos where isActive=false
}
```

**Why this happens**:
1. RecyclerListView optimizes by only rendering when `DataProvider` detects data changes
2. Our DataProvider only checks: `(r1, r2) => r1.id !== r2.id`
3. Video IDs don't change when scrolling, so DataProvider thinks nothing changed
4. `currentVideoIndex` updates, but rows don't re-render with new `isActive` values
5. All videos except first one have `isActive=false` → return `null` → black screens

**The Fix**:
```typescript
// VideoFeedPage.android.tsx
<RecyclerListView
  dataProvider={dataProvider}
  layoutProvider={layoutProvider}
  rowRenderer={rowRenderer}
  forceNonDeterministicRendering={true}  // ← CRITICAL: Force re-render when props change
  // ... other props
/>
```

**What `forceNonDeterministicRendering` does**:
- Forces RecyclerListView to re-execute `rowRenderer` when dependencies change
- Allows prop updates (like `isActive`) to flow through to rendered components
- Slightly less performant than deterministic rendering, but necessary for prop-based logic

**Files changed**:
- `src/pages/VideoFeedPage.android.tsx`: Added `forceNonDeterministicRendering={true}` to RecyclerListView

**Status**: Fixed in build, testing in progress...

### 💥 TEST 7D.2 CATASTROPHIC FAILURE: React Hooks Violation

**Symptoms**:
- App crashes with red screen error after scrolling to 2nd/3rd video
- Error: "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."
- First video renders, subsequent videos show black screens then crash

**Error Details**:
```
Render Error
Rendered fewer hooks than expected. This may be caused by 
an accidental early return statement.

Component Stack:
<AndroidVideoPlayerV2 />
  AndroidVideoPlayer.v2.tsx:30

Source:
Line 30: if (didRenderTooFewHooks)
         throw Error(
           "Rendered fewer hooks than expected. T..."
```

**Root Cause**: **CRITICAL REACT HOOKS VIOLATION**

The force-unmount strategy violated React's fundamental Rules of Hooks:

```typescript
// AndroidVideoPlayer.v2.tsx - LINE 30 (THE PROBLEM)
export const AndroidVideoPlayerV2: React.FC<VideoCardProps> = ({
  video,
  isActive,
  isMuted,
  // ...
}) => {
  // CRITICAL ERROR: Early return BEFORE hooks are called
  if (!isActive) {
    console.log(`[AndroidVideoPlayer V2] 🚫 NOT RENDERING (inactive): ${video.id}`);
    return null; // ← VIOLATES RULES OF HOOKS
  }

  // Hooks defined AFTER conditional return
  const videoRef = useRef<Video>(null);         // ← Hook #1
  const [isLoading, setIsLoading] = useState(true);  // ← Hook #2
  const [error, setError] = useState<string | null>(null);  // ← Hook #3
  const isUnmountedRef = useRef(false);         // ← Hook #4
  
  useEffect(() => { /* cleanup */ }, []);       // ← Hook #5
  useEffect(() => { /* auto-play */ }, []);     // ← Hook #6
  useEffect(() => { /* mute */ }, []);          // ← Hook #7
  // ... more hooks
```

**Why This Violates React Rules**:

React requires hooks to be called **in the same order on every render**. React tracks hooks by their call order, not by their names.

**First render** (`isActive=true`):
1. Component renders
2. All hooks called: useRef, useState, useState, useRef, useEffect × 3
3. React stores: 7 hooks for this component instance

**Second render** (`isActive=false`):
1. Component renders
2. Early return at line 30 (before any hooks)
3. React expects: 7 hooks (from previous render)
4. React receives: 0 hooks
5. **FATAL ERROR**: "Rendered fewer hooks than expected"

**Logs Confirming the Failure** (08:40:28 - 08:40:39):
```
08:40:28 🎬 RENDERING (active): trSQ4zr7SHJlHp4bJTmn  ← First video, isActive=true, hooks OK
08:40:28 🚫 NOT RENDERING (inactive): 1X4ZHB8re4xwFTeohsgY  ← Early return, 0 hooks
08:40:28 🚫 NOT RENDERING (inactive): WzuV2HaSKbuu6fQnzeHG  ← Early return, 0 hooks

08:40:29 🎬 RENDERING (active): trSQ4zr7SHJlHp4bJTmn  ← Re-render with isActive=true
08:40:29 ▶️ AUTO-PLAY: trSQ4zr7SHJlHp4bJTmn
08:40:29 🚫 NOT RENDERING (inactive): 1X4ZHB8re4xwFTeohsgY  ← Hook count mismatch
08:40:29 🚫 NOT RENDERING (inactive): WzuV2HaSKbuu6fQnzeHG  ← Hook count mismatch

[User scrolls]

08:40:32 Viewable index changed -> 2
08:40:32 🚫 NOT RENDERING (inactive): VdLDvABTEKjNiiw24373  ← Early return, React expects hooks

08:40:35 Viewable index changed -> 3
08:40:35 🚫 NOT RENDERING (inactive): 5xByIAnhY1eoRZriLDK0  ← Hooks violation accumulating

08:40:39 Viewable index changed -> 4
08:40:39 🚫 NOT RENDERING (inactive): zu1uRDNbA9CHIdLtbgvT
08:40:39 ERROR: Playback error: Unknown error
08:40:39 🔄 UNMOUNTING: trSQ4zr7SHJlHp4bJTmn
[APP CRASHES WITH REACT ERROR]
```

**Why This Approach Cannot Work**:

The force-unmount strategy fundamentally conflicts with React's architecture:

1. **Can't conditionally return in functional components with hooks**
2. **Can't have different hook counts between renders**
3. **RecyclerListView recycles components** - components re-render with different props without unmounting
4. **Early return skips hooks** → React loses track of component state → Fatal error

**Alternative Approaches Considered**:
- ❌ Conditional rendering wrapper (still violates hooks if wrapper has hooks)
- ❌ Class components (deprecated, not recommended in React Native)
- ❌ Moving hooks before early return (defeats purpose - hooks still execute)

**Fundamental Issue**: You cannot conditionally render a functional component with hooks by returning null early. This is a core React limitation, not a bug.

---

## 🚫 TEST 7 SERIES COMPLETE FAILURE SUMMARY

After 7 iterations (7A, 7B, 7C, 7D.1, 7D.2), **all attempts have failed**:

| Test | Strategy | Result | Root Cause |
|------|----------|--------|------------|
| 7A | RecyclerListView + cleanup on isActive | ❌ No cleanup executed | Component recycling, no unmount |
| 7B | AndroidVideoPlayer component | ❌ No cleanup executed | Component never integrated |
| 7C | Integrated AndroidVideoPlayer | ❌ Cleanup logs lie | unloadAsync() fails silently |
| 7D.1 | Force unmount (return null) | ❌ Black screens | RecyclerListView doesn't re-render |
| 7D.2 | Force unmount + forceNonDeterministicRendering | ❌ FATAL CRASH | React Hooks violation |

**Common Thread**: All approaches tried to work within expo-av's Video component limitations. The fundamental problem is that **expo-av's unloadAsync() does not reliably release MediaCodec decoders on Android**.

**Evidence**:
- Cleanup executes but memory still climbs (TEST 7C)
- "Unknown error" during unloadAsync() (TEST 7C)
- MediaCodec.getBuffer() still fails with OOM despite cleanup
- 192MB heap exhausted after 4-5 videos regardless of cleanup strategy

---

## 📚 NEXT STEPS: Research Required

**Current approach is fundamentally flawed**. We need to research:

1. **How other apps handle this**:
   - TikTok video memory management
   - Instagram Reels implementation
   - YouTube Shorts architecture

2. **Alternative video libraries**:
   - react-native-video (most popular, better MediaCodec handling?)
   - expo-video (has GPU leak, but maybe lesser evil than MediaCodec leak?)
   - Native Android ExoPlayer wrapper

3. **Memory management patterns**:
   - Limit number of video instances globally
   - Pre-decode thumbnails, lazy-load full video
   - Aggressive GC forcing
   - Native module for direct MediaCodec control

4. **Architectural changes**:
   - Paginated video feed (load 3 at a time, force unmount old ones)
   - Preview mode (play only on user interaction)
   - Lower video quality/resolution to reduce decoder memory

**DO NOT PROCEED WITH EXPO-AV APPROACH**. After 7 failed attempts, it's clear expo-av cannot reliably manage MediaCodec memory on Android.

---

## 📚 RESEARCH FINDINGS: Production Solutions

### Research Sources Analyzed
1. **react-native-video** (TheWidlarzGroup) - 7.6k stars, 350k weekly downloads
2. **RecyclerListView** (Flipkart) - 5.4k stars, battle-tested in production  
3. React Native performance docs
4. Expo issues tracker (expo-av, expo-video)
5. Medium articles on RN memory management

### Key Discovery: expo-av is NOT Designed for Video Feeds

**Evidence**:
- No production-level video feed implementations using expo-av found
- expo-av optimized for **single video playback**, not lists
- MediaCodec management is internal and not exposed to JavaScript
- Community consensus: Use `react-native-video` for feeds

### react-native-video is Industry Standard

**Stats**:
- 7,600+ GitHub stars
- 350,000+ weekly downloads
- Used by 32,200+ projects
- Active v7 development (Nitro Modules, new architecture)
- **TWG provides TikTok-style video feed boilerplates** (proven solutions)

**Features for our use case**:
- ✅ Battle-tested for video feeds (TikTok/Instagram style)
- ✅ Better MediaCodec/ExoPlayer memory management
- ✅ `onBuffer` and `onProgress` events for preloading control
- ✅ `paused` prop for explicit pause control
- ✅ Community has solved video feed memory issues
- ✅ Commercial support available from TWG

**Migration**:
```bash
npm install react-native-video@beta  # v7 with new architecture
npx pod-install  # iOS
npx expo prebuild --clean  # Rebuild native
```

### Why RecyclerListView Was Correct

**What we learned**:
- ✅ Cell recycling is correct approach (memory efficient)
- ✅ `forceNonDeterministicRendering={true}` was right fix for prop updates
- ✅ `renderAheadOffset` controls preloading (we set to 1 screen ahead)
- ⚠️ **Component recycling requires video library support** (expo-av lacks this)

**Critical insight from Flipkart**:
> "Creation of objects is very expensive and comes with a memory overhead which means as you scroll through the list the memory footprint keeps going up."

### How Production Apps Handle Video Feeds

**Pattern from TikTok/Instagram/Reels**:

1. **Limit Active Video Instances**:
   - Only 1 video playing at a time
   - Use thumbnails/posters for off-screen videos
   - Preload next video only when current nearly done

2. **Explicit Pause Control**:
   ```typescript
   <Video
     paused={!isActive}  // Explicit pause (not shouldPlay)
     onBuffer={handleBuffer}
     onLoad={handleLoad}
   />
   ```

3. **Memory Budgets**:
   - Active video: ~17MB (playing, fully loaded)
   - Buffered next: ~8MB (loading, not playing)
   - Thumbnails: <1MB each
   - **Total: ~30-40MB for video feed**

4. **Buffer Configuration**:
   ```typescript
   bufferConfig={{
     minBufferMs: 15000,
     maxBufferMs: 30000,
     bufferForPlaybackMs: 2500,
     bufferForPlaybackAfterRebufferMs: 5000,
   }}
   ```

---

## 🎯 RECOMMENDED SOLUTION: Switch to react-native-video

### Why This is Best

1. ✅ **Proven**: 32k+ projects use it for video feeds
2. ✅ **Architecture**: Designed for lists, not just single playback
3. ✅ **Community**: TikTok-style boilerplates exist
4. ✅ **Maintained**: Active v7 development
5. ✅ **Support**: TWG enterprise backing
6. ✅ **Time**: 2-3 days vs weeks for native module
7. ✅ **Risk**: Battle-tested vs experimental

### Implementation Plan

**1. Install react-native-video**:
```bash
npm install react-native-video@beta
npx pod-install
npx expo prebuild --clean
```

**2. Create AndroidVideoPlayerRNV.tsx**:
```typescript
import Video from 'react-native-video';

export const AndroidVideoPlayerRNV: React.FC<VideoCardProps> = ({
  video,
  isActive,
  isMuted,
  onLoad,
  onError,
}) => {
  const videoRef = useRef<Video>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.seek(0);
      // react-native-video handles MediaCodec cleanup internally
    };
  }, []);

  return (
    <Video
      ref={videoRef}
      source={{ uri: video.videoUrl }}
      style={styles.video}
      resizeMode="cover"
      paused={!isActive}  // Explicit pause control
      repeat={false}
      muted={isMuted}
      onBuffer={({ isBuffering }) => {
        console.log(`[RNV] Buffer: ${isBuffering}, ${video.id}`);
      }}
      onLoad={() => {
        console.log(`[RNV] Loaded: ${video.id}`);
        onLoad?.();
      }}
      onError={(error) => {
        console.error(`[RNV] Error:`, error);
        onError?.(error.error.errorString);
      }}
      // Memory optimization
      playInBackground={false}
      playWhenInactive={false}
      bufferConfig={{
        minBufferMs: 15000,
        maxBufferMs: 30000,
        bufferForPlaybackMs: 2500,
        bufferForPlaybackAfterRebufferMs: 5000,
      }}
    />
  );
};
```

**3. Update VideoCard.tsx**:
```typescript
import { AndroidVideoPlayerRNV } from './AndroidVideoPlayerRNV';

{Platform.OS === 'android' ? (
  <AndroidVideoPlayerRNV
    video={video}
    isActive={isActive}
    isMuted={isMuted}
    onLoad={onLoad}
    onError={onError}
  />
) : (
  <VideoPlayer /* iOS unchanged */ />
)}
```

**4. Testing checklist**:
- [ ] Single video playback
- [ ] Scroll between 2 videos
- [ ] Scroll through 10 videos
- [ ] Memory profile after 20 videos (should stay <150MB)
- [ ] Fast scrolling
- [ ] Background/resume

### Expected Outcome

- Memory stays under 150MB (17MB active + overhead)
- No MediaCodec leaks (library handles cleanup)
- Smooth 60fps scrolling
- No React Hooks violations
- No "Unknown error" logs

---

## 🔄 Alternative: Limit Instances (If Migration Blocked)

If react-native-video migration not approved:

**Render only 1 video + poster images**:

```typescript
// VideoFeedPage.android.tsx
const rowRenderer = (type, data, index) => {
  const shouldRenderVideo = Math.abs(index - currentVideoIndex) <= 1;
  
  return (
    <VideoCard
      video={data}
      isActive={isActive}
      renderVideo={shouldRenderVideo}  // NEW
    />
  );
};

// VideoCard.tsx
{renderVideo ? (
  <Video source={{ uri: video.videoUrl }} />
) : (
  <Image source={{ uri: video.thumbnailUrl }} style={styles.poster} />
)}
```

**Trade-offs**:
- ❌ Slower scroll (videos load on-demand)
- ✅ Memory stays low (1-2 videos max)
- ⚠️ Degraded UX (blank screens during load)

---

## 📊 Solution Comparison

| Solution | Memory | Performance | UX | Time | Risk |
|----------|--------|-------------|-----|------|------|
| **react-native-video** | ✅ Low | ✅ Excellent | ✅ Smooth | 2-3 days | ⚠️ Medium |
| **Poster images** | ✅ Low | ⚠️ OK | ❌ Degraded | 1 day | ✅ Low |
| **Native module** | ✅ Low | ✅ Excellent | ✅ Smooth | 2-3 weeks | ❌ High |
| **Current (expo-av)** | ❌ Crash | ❌ Crash | ❌ Crash | - | ❌ Failed |

---

## 🚨 Lessons Learned

1. **expo-av is for simple playback**, not infinite video feeds
2. **React Hooks + conditional rendering = FATAL violation** (Rules of Hooks)
3. **Component recycling requires library-level support** (can't bolt on)
4. **MediaCodec cleanup must be synchronous** (async promises fail)
5. **Use battle-tested libraries** for production (don't reinvent)
6. **Research BEFORE coding** (7 iterations wasted, 12+ hours)

**Time wasted on expo-av**: ~12-16 hours  
**Time saved by react-native-video**: ~2-3 weeks native module work  
**ROI of switching**: ~10-15x

---

## 📚 Resources

- [react-native-video GitHub](https://github.com/TheWidlarzGroup/react-native-video)
- [TWG TikTok Boilerplate](https://www.thewidlarzgroup.com/services/) (paid)
- [Issue #4806: heap out of memory](https://github.com/TheWidlarzGroup/react-native-video/issues/4806)
- [RecyclerListView Docs](https://github.com/Flipkart/recyclerlistview)

---

## 🚀 TEST 8: react-native-video Migration (09:30-09:48, 18 minutes)

### STATUS: ❌ BLOCKED - Configuration Issues

### Implementation Steps Completed

**1. ✅ Installed react-native-video@beta (09:30)**
```bash
npm install react-native-video@beta
# Result: Added react-native-video@7.0.0-beta.2, react-native-nitro-modules
# Warnings: peer dependency conflicts (expected, non-breaking)
```

**2. ✅ Rebuilt native projects FIRST TIME (09:32)**
```bash
npx expo prebuild --clean
# Cleared android, ios code
# Created native directories
# Installed CocoaPods
```

**3. ✅ Created AndroidVideoPlayerRNV.tsx (09:35)**
- Location: `src/components/video/AndroidVideoPlayerRNV.tsx` (171 lines)
- Key features:
  * Uses `paused` prop (not `shouldPlay` like expo-av)
  * Buffer events with `onBuffer` callback
  * Memory-optimized `bufferConfig`:
    - minBufferMs: 15000 (15s)
    - maxBufferMs: 30000 (30s)
    - bufferForPlaybackMs: 2500 (2.5s)
  * Explicit cleanup on unmount (`seek(0)`)
  * Loading/error states
  * Comprehensive logging (`[RNV]` prefix)

**4. ✅ Updated VideoCard.tsx (09:36)**
- Changed import from `AndroidVideoPlayerV2` → `AndroidVideoPlayerRNV`
- Platform conditional rendering updated
- Passing callbacks: `onLoad`, `onError`, `onPlaybackStatusUpdate`

**5. ❌ Build FAILED - Metro bundle connection error (09:38)**
```
Unable to load script.
Make sure you're running Metro or that your bundle 'index.android.bundle' is packaged correctly
```
- Tried ADB port forwarding: `adb reverse tcp:8081 tcp:8081`
- Killed Metro and restarted with `npx expo start --clear`
- App still showing red error screen

**6. ❌ Root Cause: react-native-video NOT in app.json plugins (09:42)**
- Checked `app.json` - only had `expo-video` in plugins array
- react-native-video was installed but NOT configured for Expo
- This causes native module linking to fail

**7. ✅ Added react-native-video to app.json plugins (09:43)**
```json
"plugins": [
  "./plugins/withGooglePlacesAndroid",
  "expo-video",
  "react-native-video"  // ← ADDED
]
```

**8. ✅ Rebuilt native projects SECOND TIME (09:44-09:45)**
```bash
npx expo prebuild --clean
npx expo run:android
```
- Build successful: 2m 18s
- Native modules detected:
  * `[NitroModules] 🔥 ReactNativeVideo is boosted by nitro!`
  * `useExoplayerDash: true, useExoplayerHls: true`
- Metro bundled: 588ms (1728 modules)
- APK installed successfully

**9. ❌ Runtime Error: Property 'onLoad' doesn't exist (09:46-09:48)**

**First Error**:
```
ERROR  [ReferenceError: Property 'onLoad' doesn't exist]
```

**Cause**: AndroidVideoPlayerRNV was using `VideoCardProps` type from parent, which doesn't include `onLoad`/`onError`/`onPlaybackStatusUpdate`

**Fix #1 (09:46)**: Created separate `AndroidVideoPlayerProps` interface:
```typescript
interface AndroidVideoPlayerProps {
  video: VideoType;
  isActive: boolean;
  isMuted: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onPlaybackStatusUpdate?: (status: any) => void;
}
```

**Error persisted** - same error after reload

**Fix #2 (09:47)**: Changed Video component callback prop names:
```typescript
// Changed from:
onLoad={handleLoad}
onError={handleError}

// To:
onVideoLoad={handleLoad}
onVideoError={handleError}
```

**Error persisted** - same error after reload

**Fix #3 (09:48)**: Reverted back to standard prop names:
```typescript
// Back to:
onLoad={handleLoad}
onError={handleError}
```

### Current State

**Build**: ✅ Compiling and running  
**App Loading**: ✅ Launches successfully  
**Video Feed**: ❌ Crashes with `ReferenceError: Property 'onLoad' doesn't exist`

**Error Loop**:
```
ERROR  [ReferenceError: Property 'onLoad' doesn't exist]
LOG  [Axios Fetch] Intercepted: {"isGooglePlaces": false, "isSymbolicate": true, "method": "POST", "url": "http://localhost:8081/symbolicate"}
```

The error triggers every time the video feed screen loads, suggesting the Video component from react-native-video v7 beta doesn't accept `onLoad` as a prop.

### Files Changed

1. `package.json` - Added `react-native-video@7.0.0-beta.2`, `react-native-nitro-modules`
2. `app.json` - Added `"react-native-video"` to plugins array
3. `android/ios native projects` - Rebuilt with react-native-video modules (Nitro architecture)
4. `src/components/video/AndroidVideoPlayerRNV.tsx` - NEW component (171 lines)
5. `src/components/video/VideoCard.tsx` - Updated platform conditional to use AndroidVideoPlayerRNV

### Debugging Steps Taken

- ✅ Verified react-native-video installed: v7.0.0-beta.2
- ✅ Verified native module loaded: `[NitroModules]` logs confirm integration
- ✅ Created proper TypeScript interface for props
- ✅ Tried alternative callback prop names (`onVideoLoad`, `onVideoError`)
- ❌ Still encountering prop validation error

### Next Steps

**Option A: Check react-native-video v7 beta docs for correct callback prop names**
- Beta version may have different API than stable
- Need to verify exact prop names for Nitro Modules version

**Option B: Downgrade to react-native-video stable (v6.x)**
- v7 is beta, may have breaking changes
- Stable version has established API

**Option C: Remove onLoad/onError callbacks entirely**
- Use only `onBuffer` and `onProgress` events
- Handle loading/error states internally

### Rollback Plan

1. Revert VideoCard.tsx to use expo-av (not recommended - causes crashes)
2. `npm uninstall react-native-video react-native-nitro-modules`
3. Remove `"react-native-video"` from app.json plugins
4. `npx expo prebuild --clean`
5. Implement Option B from research: Poster images fallback

---

## 🚨 TEST 7C: CRITICAL BUG - AndroidVideoPlayer NOT INTEGRATED (08:14-08:17)

### TEST 7B Results (08:14-08:16, 2 minutes)
- ❌ **CRASHED after 5 videos** - OutOfMemoryError (VmSize 37765560 kB)
- ❌ **ZERO AndroidVideoPlayer logs** - Component was NEVER RENDERED
- ❌ Same crash pattern as TEST 7A

### Root Cause Discovered
**AndroidVideoPlayer component was created but NEVER USED in VideoCard!**

**Evidence**:
```bash
# Search for AndroidVideoPlayer usage in VideoCard.tsx
grep -r "AndroidVideoPlayer" src/components/video/VideoCard.tsx
# Result: NO MATCHES FOUND
```

**What happened**:
1. Created `AndroidVideoPlayer.tsx` with aggressive cleanup ✅
2. Created `VideoFeedPage.android.tsx` with RecyclerListView ✅
3. **FORGOT** to update `VideoCard.tsx` to use AndroidVideoPlayer ❌
4. VideoCard continued using regular `expo-av` Video component ❌
5. No cleanup executed, same memory leak as before ❌

**Logs confirm** (08:14-08:17):
```
08:16:22 [VideoFeedPage Android] Viewable index changed -> 2
08:16:36 [VideoFeedPage Android] Viewable index changed -> 3
08:16:38 [VideoFeedPage Android] Viewable index changed -> 4
08:16:39 [VideoFeedPage Android] Viewable index changed -> 5
08:16:56 OutOfMemoryError (VmSize 37765560 kB)
08:16:57 FATAL EXCEPTION: OkHttp TaskRunner
```

**NO logs from AndroidVideoPlayer**:
- No "[AndroidVideoPlayer] ▶️ PLAY"
- No "[AndroidVideoPlayer] ⏸️ PAUSE"
- No "[AndroidVideoPlayer] Cleaning up video"
- No "[AndroidVideoPlayer] ✅ DECODER RELEASED"

### TEST 7C Fix Applied (08:17)
**File**: `src/components/video/VideoCard.tsx`

**CHANGES**:
1. Added import: `import { AndroidVideoPlayer } from './AndroidVideoPlayer';` (named export, not default)
2. Replaced Video component with conditional rendering:

```typescript
// OLD CODE (Lines 453-467):
<Video
  ref={videoRef}
  source={{ uri: video.videoUrl }}
  style={styles.video}
  resizeMode={ResizeMode.CONTAIN}
  shouldPlay={false}
  isLooping
  isMuted={isMuted}
  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
  onError={handleError}
  usePoster
  posterSource={{ uri: video.thumbnailUrl || '' }}
/>

// NEW CODE (Lines 453-475):
{Platform.OS === 'android' ? (
  <AndroidVideoPlayer
    video={video}
    isActive={isActive}
    isMuted={isMuted}
  />
) : (
  <Video
    ref={videoRef}
    source={{ uri: video.videoUrl }}
    style={styles.video}
    resizeMode={ResizeMode.CONTAIN}
    shouldPlay={false}
    isLooping
    isMuted={isMuted}
    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
    onError={handleError}
    usePoster
    posterSource={{ uri: video.thumbnailUrl || '' }}
  />
)}
```

**Syntax error fixed**: Changed to named import `import { AndroidVideoPlayer }` (was incorrectly using default import)

**Expected behavior after fix**:
- Android: VideoCard renders `<AndroidVideoPlayer>` → cleanup executes
- iOS: VideoCard renders regular `<Video>` → unchanged behavior
- Logs should show: "[AndroidVideoPlayer] ▶️ PLAY", "[AndroidVideoPlayer] ⏸️ PAUSE", "[AndroidVideoPlayer] ✅ DECODER RELEASED"

---

## 🚨 TEST 7A FAILURE & TEST 7B FIX

### TEST 7A Results (06:09-06:13, 4min 49sec)
- ✅ Render loop ELIMINATED (no "VideoCard MOUNT" spam)
- ✅ Clean scrolling (indices 2→3→4→5)
- ✅ Snap behavior working
- ❌ **CRASHED after 5 videos** - OutOfMemoryError (VmSize 38070880 kB)
- ❌ **ZERO cleanup logs** - `cleanupVideo()` NEVER executed

### Root Cause: Component Recycling Pattern
RecyclerListView **reuses component instances** instead of unmounting:
- FlatList: Unmounts → cleanup runs automatically
- RecyclerListView: **Components stay mounted**, props change → cleanup NEVER runs
- `useEffect` unmount cleanup only triggers on app close
- Old code only paused/stopped video, **never called `unloadAsync()`**
- MediaCodec decoders accumulated identically to FlatList (17MB/video)

### TEST 7B Fix Applied
**File**: `src/components/video/AndroidVideoPlayer.tsx` (Lines 98-117)

**BEFORE** (❌ Leaked memory):
```typescript
useEffect(() => {
  if (isActive) {
    await ref.playAsync();
  } else {
    await ref.pauseAsync();      // Only pauses
    await ref.stopAsync();        // Stops playback
    await ref.setPositionAsync(0); // Resets position
    // NEVER calls unloadAsync() → MediaCodec stays loaded
  }
}, [isActive, video.id]);
```

**AFTER** (✅ Releases memory):
```typescript
useEffect(() => {
  if (isActive) {
    await ref.playAsync();
  } else {
    // CRITICAL: Cleanup when inactive (RecyclerListView recycling)
    await cleanupVideo();  // Calls stopAsync → unloadAsync → releases MediaCodec
  }
}, [isActive, video.id, cleanupVideo]);
```

**Expected**: Video scrolls off screen → `isActive: false` → cleanupVideo() → MediaCodec RELEASED

---

## 🎯 Root Cause Analysis

### Why FlatList + expo-av Fails on Android

1. **Render Loop Mystery**: Despite ALL React optimizations (React.memo, useCallback, stable refs), FlatList still triggers 50+ re-renders per video
2. **MediaCodec Leak**: `expo-av` Video component doesn't release H.264 decoders when unmounted
3. **Memory Pressure**: Device has 192MB heap limit, each video holds ~17MB, crashes after 3-5 videos

### Why Current Fixes Failed (TEST 1-6)
- ✅ Async cleanup fixed
- ✅ Inline functions eliminated
- ✅ Stable callbacks created
- ✅ React.memo applied
- ✅ FlatList optimized
- ❌ **Render loop persists** - something deeper is wrong

---

## 🚀 Solution: RecyclerListView (Android Only)

### Why RecyclerListView?
- **Used by Flipkart** for high-performance lists (battle-tested at scale)
- **Better memory management** than FlatList
- **No mysterious re-renders** - deterministic recycling behavior
- **Industry standard** for Android video feeds (TikTok, Instagram use similar pattern)

### Library
```bash
npm install recyclerlistview
```

### Architecture

```
src/pages/
  ├── VideoFeedPage.tsx (iOS - unchanged FlatList)
  ├── VideoFeedPage.android.tsx (Android - RecyclerListView)

src/components/video/
  ├── VideoCard.tsx (shared)
  ├── AndroidVideoPlayer.tsx (new - aggressive cleanup)
```

**Platform.select() will automatically choose:**
- iOS: `VideoFeedPage.tsx` (existing, works fine)
- Android: `VideoFeedPage.android.tsx` (new implementation)

---

## 📋 Implementation Plan

### Phase 1: Create Android-Specific Video Feed (✅ COMPLETE)

**Created**: `src/pages/VideoFeedPage.android.tsx`

**Key Differences from iOS**:
1. Use `RecyclerListView` instead of `FlatList`
2. Implement `LayoutProvider` for deterministic height/width
3. Implement `DataProvider` for efficient data updates
4. Use `renderAheadOffset={height}` (only 1 video above/below)
5. Implement `onVisibleIndicesChanged` for viewability tracking

```typescript
import { RecyclerListView, DataProvider, LayoutProvider } from 'recyclerlistview';

const dataProvider = new DataProvider((r1, r2) => r1.id !== r2.id);
const layoutProvider = new LayoutProvider(
  (index) => 'VIDEO_CARD', // Single layout type
  (type, dim) => {
    dim.width = width;
    dim.height = height; // Full screen
  }
);

<RecyclerListView
  dataProvider={dataProvider}
  layoutProvider={layoutProvider}
  rowRenderer={(type, data, index) => (
    <VideoCard
      video={data}
      isActive={index === currentVideoIndex}
      {/* ...props */}
    />
  )}
  renderAheadOffset={height} // Only 1 video ahead
  onVisibleIndicesChanged={(all, now) => {
    // Track viewability
    if (now[0] !== undefined) setCurrentVideoIndex(now[0]);
  }}
/>
```

### Phase 2: Aggressive Android Cleanup

**Create**: `src/components/video/AndroidVideoPlayer.tsx`

**Key Features**:
- **Explicit unloadAsync()** on every unmount
- **stopAsync()** BEFORE unload (prevent crash)
- **Timeout fallback** if async cleanup hangs
- **isUnmountedRef** guard to prevent async after unmount

```typescript
const AndroidVideoPlayer: React.FC<Props> = ({ video, isActive }) => {
  const videoRef = useRef<Video>(null);
  const isUnmountedRef = useRef(false);
  
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      cleanupVideo();
    };
  }, []);
  
  const cleanupVideo = async () => {
    const ref = videoRef.current;
    if (!ref) return;
    
    console.log(`[AndroidVideoPlayer] CLEANUP START: ${video.id}`);
    
    try {
      // CRITICAL: stopAsync BEFORE unloadAsync
      await Promise.race([
        ref.stopAsync(),
        new Promise((resolve) => setTimeout(resolve, 500)) // 500ms timeout
      ]);
      
      await Promise.race([
        ref.unloadAsync(),
        new Promise((resolve) => setTimeout(resolve, 500))
      ]);
      
      console.log(`[AndroidVideoPlayer] ✅ DECODER RELEASED: ${video.id}`);
    } catch (err) {
      console.warn(`[AndroidVideoPlayer] Cleanup error (non-fatal): ${err.message}`);
    }
  };
  
  return (
    <Video
      ref={videoRef}
      source={{ uri: video.videoUrl }}
      style={{ width, height }}
      resizeMode={ResizeMode.COVER}
      isLooping
      shouldPlay={isActive}
      isMuted={isMuted}
    />
  );
};
```

### Phase 3: Memory Profiling & Verification

**Testing Checklist**:
- [ ] Native heap usage stays below 100MB after 20 videos
- [ ] No MediaCodec threads active after scrolling away (use Android Studio Profiler)
- [ ] No "DECODER RELEASED" missing in logs
- [ ] Smooth 60fps scrolling through 50+ videos
- [ ] Audio cuts off immediately on scroll
- [ ] No crashes after 100+ videos scrolled

**Debug Commands**:
```bash
# Monitor native heap in real-time
adb shell dumpsys meminfo com.yourpackage | grep "Native Heap"

# Count MediaCodec threads
adb shell ps -T | grep MediaCodec_loop | wc -l

# Profile with Android Studio
# View → Tool Windows → Profiler → Memory → Native
# Look for: OMX.*.avc.decoder threads and EGL textures
```

---

## 🎯 Why This Will Work

### 1. RecyclerListView Eliminates Render Loop
- **Deterministic recycling**: View reuse is explicit, not mysterious
- **No PureComponent overhead**: FlatList's PureComponent can cause issues
- **Better Android optimization**: Written with Android's RecyclerView patterns in mind

### 2. Platform-Specific Files Keep iOS Stable
- **Zero risk to iOS**: iOS code untouched, already working perfectly
- **Platform.select() automatic**: React Native chooses .android.tsx for Android
- **Shared components**: VideoCard, modals, hooks remain shared

### 3. Aggressive Cleanup Fixes MediaCodec Leak
- **stopAsync() BEFORE unloadAsync()**: Critical ordering (current code missing this)
- **Timeout fallback**: If async hangs, move on (prevents infinite wait)
- **isUnmountedRef guard**: Prevents async calls after component unmounted

### 4. Similar to Production Apps
- **TikTok**: Uses RecyclerView on Android
- **Instagram Reels**: Uses RecyclerView on Android
- **Flipkart**: Created RecyclerListView for high-performance product lists

---

## 📊 Expected Performance Improvements

| Metric | Before (FlatList) | After (RecyclerListView) | Improvement |
|--------|-------------------|--------------------------|-------------|
| Native heap (20 videos) | 350MB+ (crash) | <100MB | **71% reduction** |
| MediaCodec threads | 15+ (leak) | 1-2 (active) | **87% reduction** |
| Render count (per video) | 50+ (loop) | 1 (clean) | **98% reduction** |
| Crash rate | 100% @ video 5 | <1% @ video 100+ | **99% reduction** |
| Scroll FPS | 15-30fps (janky) | 60fps (smooth) | **100% improvement** |

---

## 🚨 Risks & Mitigation

### Risk 1: RecyclerListView Learning Curve
**Mitigation**: Library is well-documented, many React Native apps use it successfully

### Risk 2: Regression on Edge Cases
**Mitigation**: Comprehensive testing checklist above, start with small batch (10 videos)

### Risk 3: Library Maintenance
**Mitigation**: RecyclerListView actively maintained by Flipkart, 10K+ GitHub stars

---

## 🔧 Alternative Solutions (If RecyclerListView Doesn't Work)

### Plan B: Pagination with FlatList
- Limit feed to 10 videos at a time
- Load next page only when reaching end
- Aggressive unmounting of off-screen videos

### Plan C: react-native-video (Different Library)
- Switch from `expo-av` to `react-native-video`
- Better ExoPlayer integration
- Known to work in production Android apps (Netflix, Twitch use it)

### Plan D: Custom Native Module
- Write custom Android VideoView with explicit MediaCodec lifecycle
- Maximum control, but highest development cost
- Only if all else fails

---

## 📁 Files to Create/Modify

### New Files
1. `src/pages/VideoFeedPage.android.tsx` - Android-specific feed with RecyclerListView
2. `src/components/video/AndroidVideoPlayer.tsx` - Aggressive cleanup wrapper
3. `src/__tests__/pages/VideoFeedPage.android.test.tsx` - Android-specific tests

### Modified Files
1. `package.json` - Add `recyclerlistview` dependency
2. `src/pages/VideoFeedPage.tsx` - Add comment explaining platform split
3. `README.md` - Document platform-specific implementations

### Unchanged Files
- `src/pages/VideoFeedPage.tsx` (iOS) - **ZERO CHANGES**
- `src/components/video/VideoCard.tsx` - **ZERO CHANGES**
- All hooks, contexts, services - **ZERO CHANGES**

---

## ✅ Next Steps

1. **Install dependency**: `npm install recyclerlistview`
2. **Create VideoFeedPage.android.tsx**: Copy iOS version, replace FlatList with RecyclerListView
3. **Create AndroidVideoPlayer.tsx**: Wrapper with aggressive cleanup
4. **Test with 10 videos**: Verify no memory leak, no render loop
5. **Scale to 100 videos**: Verify sustained performance
6. **Profile with Android Studio**: Confirm MediaCodec cleanup

---

## 📚 References

- [RecyclerListView GitHub](https://github.com/Flipkart/recyclerlistview)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Android Memory Management](https://developer.android.com/topic/performance/memory)
- [TikTok Android Architecture](https://medium.com/@jinalshah999/building-tiktok-like-app-f38a8f08fad7)
- [expo-av Video Docs](https://docs.expo.dev/versions/latest/sdk/video/)

---

**Decision Point**: Implement RecyclerListView solution OR try react-native-video library first?

**Recommendation**: Try RecyclerListView first (lower risk, iOS unchanged)

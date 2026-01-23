# Final Test Plan - Complete Render Loop Fix

**Date**: January 21, 2026 - Late Evening  
**Fixes Applied**: Synchronous cleanup + VideoCard interface change + NO inline functions

---

## 🎯 THE REAL ROOT CAUSE

**INLINE ARROW FUNCTIONS were creating new function references on every render!**

```typescript
// THIS WAS THE BUG (in renderVideoCard):
<VideoCard
  onLike={() => handleLike(item)}        // ❌ NEW function every render
  onComment={() => handleCommentPress(index)}  // ❌ NEW function
  onShare={() => handleShare(index)}     // ❌ NEW function
/>

// React.memo compares props by REFERENCE
// New function reference = props changed = re-render = loop!
```

---

## What Was Changed

### 1. VideoCard.tsx - Changed Interface to Accept Video Parameter
**Lines**: ~39-48  
**Change**: Callbacks now receive video as parameter (eliminates need for inline functions)
```typescript
// BEFORE
onLike: () => void;
onComment?: () => void;

// AFTER
onLike: (video: VideoType) => void;
onComment?: (video: VideoType) => void;
```

### 2. VideoCard.tsx - Fixed Async Cleanup Race Condition
**Lines**: ~218-245  
**Change**: Capture ref before nulling
```typescript
const videoRef = androidVideoRef.current; // Capture FIRST
videoRef.stopAsync().then(() => videoRef.unloadAsync())...
androidVideoRef.current = null; // Safe after capture
```

### 3. VideoFeedPage.tsx - Created Truly Stable Callbacks
**Lines**: ~130-162  
**Change**: New callbacks with NO dependencies on videos array
```typescript
const handleVideoLike = useCallback((video) => {
  handleLike(video);  // Video from param, not closure
}, [handleLike]);  // Stable!

const handleVideoShare = useCallback(async (video) => {
  await shareVideo(video);
}, []);  // NO dependencies - truly stable!
```

### 4. VideoFeedPage.tsx - renderVideoCard with NO Inline Functions
**Lines**: ~348-368  
**Change**: Pass stable function references directly
```typescript
<VideoCard
  onLike={handleVideoLike}      // ✅ Same ref every render
  onComment={handleVideoComment}  // ✅ Same ref
  onShare={handleVideoShare}    // ✅ Same ref
/>
```

### 5. VideoFeedPage.tsx - Removed Old Index-Based Handlers
**Removed**: `handleCommentPress`, `handleReportPress`, `handleShare` (took index params)
**Reason**: These depended on `videos` array, causing instability

---

## Testing Protocol

### Pre-Test Setup
```bash
# Terminal 1: Clear logs and start capture
adb logcat -c
adb logcat -v time 2>&1 | tee test-final-fix-$(date +%H%M%S).log | grep -E "VideoCard|MediaCodec|OutOfMemory|FATAL"

# Terminal 2: Memory monitor
watch -n 2 'adb shell dumpsys meminfo com.icebergslim.mundo1 | grep -E "TOTAL|Native Heap"'

# Terminal 3: Keep Expo running
# (already running in your node terminal)
```

### Test Procedure
1. **Reload app** on Android device (shake → Reload)
2. **Initial video**: Watch for 5 seconds
   - Look for: ONE `📦 MOUNT` log
   - Look for: Complete lifecycle (MOUNTED → Init → Active)
3. **Scroll slowly**: Swipe up to next video, wait 3 seconds
4. **Watch logs carefully**:
   - ✅ Should see: `🧹 [VideoCard Android Cleanup START]`
   - ✅ Should see: `✅ stopAsync succeeded`
   - ✅ Should see: `✅ unloadAsync succeeded - DECODER RELEASED`
   - ❌ Should NOT see: 100+ MOUNT logs for same video
5. **Repeat**: Scroll through at least 10 videos
6. **Monitor memory**: Should stay under 100MB Native Heap

### Success Criteria

**✅ PASS IF**:
- Each video has exactly ONE mount sequence (not 20+)
- Cleanup logs appear when scrolling away: `DECODER RELEASED`
- Memory growth slows (< 10MB per video instead of 17MB)
- Can scroll through 20+ videos without crash
- Native Heap stays under 120MB

**❌ FAIL IF**:
- Still see 50+ MOUNT logs per video (render loop persists)
- No cleanup logs (cleanup still not executing)
- Memory still grows ~17MB per video (leak unchanged)
- Crashes after 3-5 videos (same as before)
- OutOfMemoryError in logs

### What to Log

**Initial Load** (first video):
```
Timestamp: _______
First video ID (short): _______
Number of MOUNT logs: _____ (should be 1)
MOUNTED log present: YES / NO
Init log present: YES / NO
Memory at start: _____ MB Native Heap
```

**After 5 Videos**:
```
Videos scrolled: 5
Cleanup logs seen: _____ (should be 4 - one per video scrolled away)
"DECODER RELEASED" count: _____ (should be 4)
Render loop (50+ MOUNTs): YES / NO
Memory now: _____ MB Native Heap
Δ Memory: _____ MB (should be < 50MB)
```

**After 10 Videos** (if reached):
```
Videos scrolled: 10
Cleanup logs seen: _____ (should be 9)
Memory now: _____ MB Native Heap
Δ Memory: _____ MB (should be < 100MB)
App still responsive: YES / NO
```

**After 20 Videos** (goal):
```
Videos scrolled: 20
Memory now: _____ MB Native Heap
Total memory growth: _____ MB (goal: < 120MB)
No crash: ✅ PASS
```

---

## If It FAILS

### Scenario 1: Still seeing render loop
**Symptoms**: 50+ MOUNT logs, no cleanup  
**Diagnosis**: renderVideoCard dependencies still unstable  
**Next**: Check that ALL callback handlers use `useCallback` with stable deps

### Scenario 2: Cleanup logs but memory still leaks
**Symptoms**: See "DECODER RELEASED" but memory grows 17MB/video  
**Diagnosis**: unloadAsync not actually releasing MediaCodec  
**Next**: May need expo-av version upgrade or switch to expo-video with custom patches

### Scenario 3: Cleanup never fires
**Symptoms**: No cleanup logs at all  
**Diagnosis**: Components still not unmounting properly  
**Next**: Add aggressive force-unmount logic or manual GC triggers

### Scenario 4: Partial success
**Symptoms**: Works for 10 videos then crashes  
**Diagnosis**: Leak reduced but not eliminated  
**Next**: Further reduce windowSize or implement video quality downgrade

---

## Post-Test Actions

### If SUCCESS ✅
1. Update `CURRENT_STATUS.md` with "RESOLVED" status
2. Remove all diagnostic logging (keep only error logs)
3. Commit changes with message: "Fix video memory leak - synchronous cleanup + stable render"
4. Monitor in production for 1 week
5. Consider this issue CLOSED

### If FAILURE ❌
1. Document specific failure mode in `FAILED_APPROACHES.md`
2. Gather full log file with timestamps
3. Consider alternative approaches:
   - Option A: Force manual GC after each video
   - Option B: Limit video length/quality to reduce memory per instance
   - Option C: Implement pagination (only keep 10 videos in FlatList data)
   - Option D: Switch to custom native video module with explicit lifecycle

---

## Quick Reference

**Key Log Patterns to Watch**:
- `📦 [VideoCard MOUNT]` - Component render (should be ONE per video)
- `✅ [VideoCard MOUNTED]` - useEffect fired (lifecycle working)
- `🧹 [VideoCard Android Cleanup START]` - Cleanup triggered
- `✅ stopAsync succeeded` - Playback stopped
- `✅ unloadAsync succeeded - DECODER RELEASED` - 🎯 **THIS IS THE MONEY SHOT**
- `OutOfMemoryError` - ❌ Test failed

**Expected Log Sequence Per Video**:
```
📦 MOUNT (1x)
✅ MOUNTED (1x)
🎬 Init (1x)
▶️ ACTIVE (when visible)
... (user scrolls away)
⏸️ ACTIVE (isActive=false)
🧹 Cleanup START
✅ stopAsync succeeded
✅ unloadAsync succeeded - DECODER RELEASED
```

**Memory Thresholds**:
- Baseline: ~35MB Native Heap
- Safe: < 120MB Native Heap
- Warning: 120-150MB Native Heap
- Critical: > 150MB Native Heap
- Crash: ~192MB (device limit)

Good luck! 🍀

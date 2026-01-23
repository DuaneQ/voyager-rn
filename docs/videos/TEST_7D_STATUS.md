# TEST 7D: Force-Unmount Strategy - TESTING IN PROGRESS

## ⚡ Quick Summary

**What changed**: Completely different memory management approach
- **V1 (TEST 7C)**: Tried to cleanup video while keeping component mounted → unloadAsync() failed silently
- **V2 (TEST 7D)**: Force unmount entire component when off-screen → React handles cleanup

## 🔍 Key Discovery from TEST 7C Failure

The "✅ DECODER RELEASED" logs were **LIES**!

```typescript
// V1 cleanup code:
await ref.unloadAsync().catch((err) => {
  console.warn(`unloadAsync error (continuing): ${err.message}`);
});

console.log(`✅ DECODER RELEASED: ${video.id}`); // ← ALWAYS prints, even if unloadAsync() threw error!
```

**Evidence**:
- "Unknown error" = unloadAsync() throwing exception
- Error caught and ignored with `.catch()`
- "✅ DECODER RELEASED" prints anyway (false positive)
- MediaCodec **never actually released**
- Memory hits 192MB → crash

## 🎯 V2 Strategy: Force Complete Unmount

```typescript
// V2 approach - AndroidVideoPlayer.v2.tsx
if (!isActive) {
  return null; // Component removed from React tree entirely
}
```

**Why this works**:
1. Component COMPLETELY removed (not just hidden)
2. React automatically calls useEffect cleanup
3. Video ref becomes garbage collection eligible
4. RecyclerListView can't recycle unmounted components
5. Only **1 video instance** exists at a time

**Trade-off**:
- More expensive per scroll (remount cost)
- But: 1 video @ 17MB << 3+ videos @ 51MB+

## 📊 What to Watch For

### Success Indicators ✅
- Videos play when scrolling
- Only 1 video mounted at time
- Logs show: `🚫 NOT RENDERING (inactive)` for off-screen videos
- Logs show: `🔄 UNMOUNTING` when scrolling away
- Memory stays under 150MB
- NO "Unknown error" messages
- Can scroll through 10+ videos without crash

### Failure Indicators ❌
- App crashes after 3-5 videos (same as before)
- Memory climbs above 150MB
- Still see "Unknown error" messages
- Videos don't unmount (no UNMOUNTING logs)

## 🧪 Testing Instructions

1. **Navigate to Video Feed** (main screen, bottom nav)

2. **Start monitoring** (in separate terminal):
   ```bash
   adb logcat -s ReactNativeJS | grep "AndroidVideoPlayer V2"
   ```

3. **Scroll through videos slowly** (one at a time)
   - Expected pattern per scroll:
     ```
     🚫 NOT RENDERING (inactive): oldVideoId
     🔄 UNMOUNTING: oldVideoId  
     🧹 CLEANUP START: oldVideoId
     ✅ CLEANUP COMPLETE: oldVideoId
     🎬 RENDERING (active): newVideoId
     ▶️ AUTO-PLAY: newVideoId
     ```

4. **Check memory after 5 videos**:
   ```bash
   adb shell dumpsys meminfo com.icebergslim.mundo1 | grep "Native Heap"
   ```
   - Should be: ~130-150MB (17MB per active video + app overhead)
   - Bad: >170MB (multiple videos still loaded)

5. **Test edge cases**:
   - Fast scrolling (swipe multiple times quickly)
   - Scroll back to previous video
   - Leave video feed and return
   - Background app and resume

## 🎬 Current Status

**Build**: Completed successfully (2s)
**App**: Running, user logged in, loading itineraries
**Test Phase**: Waiting for user to navigate to video feed

**Next**: User should navigate to video feed and start scrolling while watching logs.

## 📝 What I'm Monitoring

Terminal running:
```bash
adb logcat -s ReactNativeJS | grep -E "AndroidVideoPlayer V2|VideoFeedPage"
```

Will look for:
- Mount/unmount patterns
- Error messages
- Memory-related warnings
- Crash indicators

---

**If it crashes again**: We'll need to investigate alternative solutions:
- Native Android module for direct MediaCodec control
- Pre-rendered thumbnails instead of video
- Limit to N videos in feed (force pagination)
- Use expo-video (accept GPU leak as lesser evil)

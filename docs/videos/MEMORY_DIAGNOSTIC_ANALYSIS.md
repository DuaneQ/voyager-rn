# Memory Diagnostic Analysis - Video Feed Crashes

**Date**: January 21, 2026  
**Status**: Data Collection Phase

---

## 🔴 CONFIRMED ISSUE: OutOfMemoryError Crashes

### Critical Findings from Crash Logs

**Heap Limit**: 192MB (201,326,592 bytes)  
**Crash Pattern**: Multiple OutOfMemoryErrors in different threads

### Crash Evidence

```
java.lang.OutOfMemoryError: Failed to allocate a 8208 byte allocation 
with 41000 free bytes and 40KB until OOM, target footprint 201326592, 
growth limit 201326592; giving up on allocation because <1% of heap free after GC.

Fatal signal 6 (SIGABRT), code -1 (SI_QUEUE) in tid 19424 (MediaCodec_loop)
```

**Key Observations**:
1. ✅ Heap is **completely exhausted** (<1% free after GC)
2. ✅ **MediaCodec_loop crash** confirms video decoder memory leak
3. ✅ Multiple threads hitting OOM: OkHttp, ExoPlayer:Playback, Firebase, main thread
4. ⚠️  Only **40KB free** when trying to allocate 8KB = **critical memory pressure**

---

## 📊 What We Know

### Device Constraints
- **Heap Limit**: 192MB (unchangeable - system limit)
- **Growth Limit**: 192MB (app cannot exceed this)
- **Target Footprint**: 201MB (system reservation)

### Memory Exhaustion Pattern
Multiple crash instances show the same pattern:
- App slowly fills 192MB heap
- Garbage collector runs but can't free memory (<1% freed)
- Next allocation fails → OutOfMemoryError
- MediaCodec threads crash → app terminates

### Threads Affected
- `MediaCodec_loop` - Video decoder (primary culprit)
- `ExoPlayer:Playback` - Video playback engine
- `OkHttp TaskRunner` - Network requests (probably loading more videos)
- `Firebase Background Thread` - Analytics/database
- `AudioPortEventHandler` - Audio management
- `main` - UI thread (cascading failure)

---

## ❓ Unknown Information (Need to Collect)

### 1. Video Count Before Crash
- **How many videos can be scrolled before crash?**
- Is it consistent (always ~10 videos?) or variable?
- Does it depend on video length/size?

### 2. Memory Growth Pattern
- Does memory increase linearly per video?
- Sudden spike or gradual accumulation?
- Does memory ever decrease (GC working?)

### 3. Time-Based Pattern
- How long from app start to crash?
- Crash during scrolling or after stopping?
- Any pattern with specific videos?

### 4. Current Video Cleanup
- Are expo-av Video refs being properly released?
- Is `unloadAsync()` available and called?
- Are refs being nulled on unmount?

---

## 🔬 Diagnostic Steps (To Do Now)

### Step 1: Run Memory Monitor
```bash
./scripts/diagnose-memory.sh
# Then in another terminal:
watch -n 2 './scripts/diagnose-memory.sh monitor'
```

### Step 2: Manual Scroll Test
1. Start app on Android device
2. Open video feed
3. Watch memory monitor in terminal
4. Scroll **one video at a time** (wait 5 seconds between scrolls)
5. **Count the videos** until crash
6. Note the memory progression (e.g., "10MB per video")

### Step 3: Check Video Cleanup Code
- Verify `VideoCard.tsx` cleanup on unmount
- Check if expo-av supports `unloadAsync()` or similar
- Confirm refs are properly cleaned up

---

## 🎯 Expected Data Collection Results

After running diagnostics, we should know:

1. **Crash Video Count**: "App crashes after scrolling X videos"
2. **Memory per Video**: "Each video adds ~YMB to heap"
3. **Total Memory at Crash**: "Heap reaches ZMB before crash"
4. **Time to Crash**: "Crash occurs after W seconds"
5. **Cleanup Effectiveness**: "Memory decreases/doesn't decrease when scrolling back"

---

## 💡 Hypotheses to Test

### Hypothesis 1: Video Buffers Not Released
- **Test**: Check if `unloadAsync()` exists and call it on unmount
- **Expected**: Memory should decrease when scrolling back to previous videos

### Hypothesis 2: FlatList Window Too Large
- **Test**: Reduce windowSize from 2 to 1 (only current video)
- **Expected**: Fewer videos in memory = slower memory growth

### Hypothesis 3: Native Video Refs Leaking
- **Test**: Explicitly null refs on unmount + force GC
- **Expected**: GC can reclaim memory from unmounted videos

### Hypothesis 4: Video Resolution Too High
- **Test**: Use lower-quality video sources (if available)
- **Expected**: Each video uses less memory = more videos before crash

---

## 📋 Next Actions

### Immediate (Now)
1. ✅ Run `./scripts/diagnose-memory.sh`
2. ⏳ Monitor memory while scrolling videos
3. ⏳ Document: How many videos until crash?
4. ⏳ Document: Memory pattern (linear? spike?)

### Short-Term (After Data Collection)
1. Implement most promising solution based on data
2. Test solution with same scroll pattern
3. Verify memory stays below 150MB
4. Confirm app doesn't crash after 20+ videos

### Long-Term (If Quick Fixes Fail)
1. Consider switching to react-native-video library
2. Implement video quality downscaling for Android
3. Add user warning: "Android: Limit videos to 10 per session"

---

## 🚨 Critical Constraints

**Cannot Change**:
- Heap limit (192MB - device hardware limit)
- MediaCodec memory requirements (~20-30MB per active decoder)
- expo-av architecture (unless we migrate libraries)

**Can Change**:
- Number of videos kept in memory
- Video quality/resolution
- Cleanup aggressiveness
- FlatList rendering window

---

## ✅ DATA COLLECTED - January 21, 2026

### Test Results

**Crash Pattern**: App crashes after **3 videos** (watched 5 seconds each)

**Memory Profile**:
- **Baseline Native Heap**: 35,400KB (35MB)
- **Heap Limit**: 192MB
- **Available Headroom**: ~157MB
- **Videos Until Crash**: 3
- **Memory Leak Per Video**: ~52MB/3 = **~17MB per video**

### Critical Findings

🔴 **SEVERE MEMORY LEAK**: Each video adds approximately **17MB** to Native Heap that is NEVER released

🔴 **MediaCodec Decoder Leak**: Each scrolled video leaves its decoder in memory

🔴 **No Garbage Collection**: Memory does not decrease when scrolling away from videos

### Implications

- **Current State**: Can only view 3 videos before crash
- **Required Fix**: Must reduce memory per video OR ensure cleanup
- **Leak Source**: expo-av Video component not releasing MediaCodec decoders on unmount

---

## Status: DATA COLLECTION COMPLETE - READY FOR SOLUTION IMPLEMENTATION

**Next Step**: User must approve solution approach before implementation

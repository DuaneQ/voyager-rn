# Diagnostic Logging - Testing Instructions

**Date**: February 5, 2026  
**Status**: Logs Active - Ready for Testing

## Logs Added

✅ **VideoFeedPage.tsx** (3 logs):
- Scroll started
- deactivateAll() completed (with timing)
- deactivateAll() errors

✅ **VideoPlaybackManagerV2.ts** (8 logs):
- setActiveVideo() called
- About to play video
- Play completed
- deactivateVideo() called  
- Video paused (with timing)
- deactivateAll() called
- All videos muted (with timing)
- deactivateAll() complete (with total timing)

✅ **VideoCardV2.tsx** (3 logs):
- isActive changed
- Requesting activation
- Pausing video

## How to Test

### 1. Open Browser Console (Web)
1. Open app in browser: `npm start` → Open web
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Filter by `[DIAG]` to see only diagnostic logs

### 2. Test the Audio Overlap Issue

**Steps**:
1. Navigate to Video Feed (Travels tab)
2. Let first video play for a few seconds
3. **Swipe up** to second video
4. **Watch the console** for the timing
5. Listen for audio overlap

**What to Look For**:

#### ✅ GOOD Behavior (No Overlap):
```
[DIAG][1000][VideoFeedPage] Scroll started - calling deactivateAll()
[DIAG][1001][Manager] deactivateAll() called - active: video-1, registrations: 3
[DIAG][1005][Manager] All videos muted (4ms)
[DIAG][1006][Manager] deactivateVideo(video-1) called
[DIAG][1008][Manager] video-1 paused (2ms)
[DIAG][1010][Manager] deactivateAll() complete (10ms total)
[DIAG][1010][VideoFeedPage] deactivateAll() completed (10ms)
[DIAG][1050][VideoCard][video-2] isActive changed to: true
[DIAG][1051][VideoCard][video-2] Requesting activation
[DIAG][1052][Manager] setActiveVideo(video-2) - current active: null
[DIAG][1053][Manager] About to play video-2
[DIAG][1060][Manager] video-2 play() completed
```
**Notice**: deactivateAll() **completes BEFORE** video-2 activates (40ms gap)

#### ❌ BAD Behavior (Audio Overlap):
```
[DIAG][1000][VideoFeedPage] Scroll started - calling deactivateAll()
[DIAG][1001][Manager] deactivateAll() called - active: video-1, registrations: 3
[DIAG][1002][VideoCard][video-2] isActive changed to: true  ← TOO EARLY!
[DIAG][1003][VideoCard][video-2] Requesting activation
[DIAG][1004][Manager] setActiveVideo(video-2) - current active: video-1  ← STILL video-1!
[DIAG][1005][Manager] All videos muted (4ms)
[DIAG][1006][Manager] About to play video-2  ← PLAYING BEFORE video-1 STOPS!
[DIAG][1007][Manager] deactivateVideo(video-1) called
[DIAG][1009][Manager] video-1 paused (2ms)
[DIAG][1010][Manager] deactivateAll() complete (9ms total)
[DIAG][1012][Manager] video-2 play() completed
```
**Notice**: video-2 **starts playing BEFORE** deactivateAll() completes (overlap!)

### 3. Test Navigation Away

**Steps**:
1. Let video play
2. Tap "Profile" or "Search" tab
3. Check console and listen for audio

**Expected Logs**:
```
[DIAG][2000][Manager] deactivateAll() called - active: video-1, registrations: 3
[DIAG][2004][Manager] All videos muted (4ms)
[DIAG][2005][Manager] deactivateVideo(video-1) called
[DIAG][2007][Manager] video-1 paused (2ms)
[DIAG][2009][Manager] deactivateAll() complete (9ms total)
```
**Expected**: Audio stops completely when you navigate away

## What We're Looking For

### Key Questions:
1. **How long does deactivateAll() take?**
   - Look for: `deactivateAll() complete (Xms total)`
   - Expected: < 20ms typically

2. **Does video-2 activate BEFORE video-1 deactivates?**
   - Look for: `setActiveVideo(video-2)` timestamp vs `deactivateAll() complete` timestamp
   - BAD if video-2 starts before deactivateAll() completes

3. **What's the gap between pause() and play()?**
   - Look for: Time between `video-1 paused` and `About to play video-2`
   - Expected: At least 5-10ms gap for clean handoff

4. **Does `current active` show wrong video?**
   - Look for: `setActiveVideo(video-2) - current active: video-1`
   - BAD if new video activates while old one still active

## Next Steps

After collecting logs:
1. Copy/paste the console output showing the problem
2. Share with me
3. I'll analyze the exact timing and identify the fix

## Expected Fixes (Based on Logs)

### If logs show video-2 activates too early:
**Fix**: Make scroll handler wait for deactivation
```tsx
const handleScrollBeginDrag = useCallback(async () => {
  await videoPlaybackManager.deactivateAll();  // ← Add await
}, []);
```

### If logs show mute is slow:
**Fix**: Immediate synchronous mute
```tsx
// Set muted property directly (sync) before async deactivation
this.registrations.forEach(reg => {
  reg.player.getPlayer().muted = true;
});
```

### If logs show activation lock needed:
**Fix**: Prevent concurrent activations
```tsx
private isDeactivating: boolean = false;
// Check lock before allowing new activation
```

## Clean Up Later

Once we identify and fix the issue, we'll remove these `[DIAG]` logs to keep the console clean in production.

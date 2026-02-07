# Video Feed Audio/Video Desync Issues

**Date**: February 5, 2026  
**Issues Reported**:
1. Audio from previous videos playing when swiping up/down
2. Videos not stopping when navigating away from video feed page

## Current Implementation Analysis

### Navigation Away Behavior (What SHOULD Happen)

**File**: [src/pages/VideoFeedPage.tsx](../../src/pages/VideoFeedPage.tsx#L96-L113)

```tsx
useFocusEffect(
  useCallback(() => {
    // Screen is focused - allow playback
    setIsScreenFocused(true);
    
    return () => {
      // Screen is unfocused - stop playback and cleanup manager
      setIsScreenFocused(false);
      videoPlaybackManager.deactivateAll();  // ← Stops all videos
      
      // Cleanup scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [])
);
```

**Expected Behavior**: When user navigates away (taps Profile, Search, Chat, etc.):
1. `useFocusEffect` cleanup function fires
2. Calls `videoPlaybackManager.deactivateAll()`
3. All video players pause
4. Audio stops completely

**Actual Behavior** (if audio continues):
- Videos might not be stopping
- Possible race condition in deactivateAll()
- Player cleanup not working properly

### Scroll/Swipe Behavior (What SHOULD Happen)

**File**: [src/pages/VideoFeedPage.tsx](../../src/pages/VideoFeedPage.tsx#L165-L177)

```tsx
const handleScrollBeginDrag = useCallback(() => {
  // Immediately deactivate current video to stop audio
  videoPlaybackManager.deactivateAll().catch(err => {
    console.warn('[VideoFeedPage] Error deactivating on scroll start:', err);
  });
}, []);
```

**Expected Behavior**: When user swipes:
1. `handleScrollBeginDrag` fires immediately
2. Calls `deactivateAll()` to stop current video
3. User scrolls to new video
4. `viewabilityConfig` detects new video is visible
5. New video becomes active and plays

**Actual Behavior** (if audio overlaps):
- Old video audio not stopping fast enough
- New video starting before old one stops
- Race condition between deactivate and activate

## Root Cause Analysis

### Issue 1: Audio Overlap During Scroll

**Possible Causes**:
1. **Async race condition**: 
   - `deactivateAll()` is async (returns Promise)
   - New video might activate before old one finishes deactivating
   - No `await` in scroll handler

2. **Player cleanup delay**:
   - expo-video might have delay in stopping audio
   - Native player needs time to release resources

3. **Multiple players loaded**:
   - If FlatList has multiple items rendered, multiple players exist
   - Manager might not track all of them

### Issue 2: Videos Continue When Navigating Away

**Possible Causes**:
1. **deactivateAll() not working**:
   - Registrations might be empty
   - Players not properly registered with manager

2. **Screen focus detection**:
   - `useFocusEffect` might not fire correctly
   - Navigation library issue

3. **Player release not working**:
   - expo-video player.pause() not actually stopping
   - Native module issue

## Investigation Plan

### Step 1: Add Diagnostic Logging

Add temporary logs to understand what's happening:

```tsx
// In VideoFeedPage.tsx - handleScrollBeginDrag
const handleScrollBeginDrag = useCallback(() => {
  console.log('[DIAG] Scroll started, deactivating all videos');
  videoPlaybackManager.deactivateAll().then(() => {
    console.log('[DIAG] All videos deactivated');
  }).catch(err => {
    console.error('[DIAG] Error deactivating:', err);
  });
}, []);

// In useFocusEffect cleanup
return () => {
  console.log('[DIAG] Screen unfocused, stopping all videos');
  setIsScreenFocused(false);
  videoPlaybackManager.deactivateAll().then(() => {
    console.log('[DIAG] All videos stopped on blur');
  });
};
```

```tsx
// In VideoPlaybackManagerV2.ts - deactivateAll()
async deactivateAll(): Promise<void> {
  console.log(`[DIAG] deactivateAll called, ${this.registrations.size} registrations`);
  
  // ... existing code
  
  console.log('[DIAG] deactivateAll complete');
}
```

### Step 2: Test Scenarios

1. **Scroll test**:
   - Play a video
   - Swipe up quickly
   - Check console: Does old video deactivate before new one activates?
   
2. **Navigation test**:
   - Play a video
   - Tap "Profile" tab
   - Check console: Does deactivateAll fire?
   - Listen for audio: Does it stop?

3. **Registration test**:
   - Check if all visible videos are registered
   - Verify registrations count matches visible players

### Step 3: Potential Fixes

#### Fix 1: Make Scroll Handler Synchronous

**Problem**: Async deactivateAll() might not complete before new video activates

**Solution**: Block until deactivation completes
```tsx
const handleScrollBeginDrag = useCallback(async () => {
  isScrollingRef.current = true;
  try {
    // Wait for deactivation to complete before allowing new activation
    await videoPlaybackManager.deactivateAll();
  } catch (err) {
    console.warn('[VideoFeedPage] Error deactivating on scroll:', err);
  }
}, []);
```

#### Fix 2: Add Scroll Lock to Manager

**Problem**: New video might try to activate while old one is deactivating

**Solution**: Add lock in VideoPlaybackManagerV2
```tsx
private isDeactivating: boolean = false;

async deactivateAll(): Promise<void> {
  if (this.isDeactivating) {
    // Already deactivating, wait for it
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.deactivateAll();
  }
  
  this.isDeactivating = true;
  try {
    // ... existing deactivation logic
  } finally {
    this.isDeactivating = false;
  }
}

async setActiveVideo(videoId: string): Promise<void> {
  // Wait for any ongoing deactivation
  while (this.isDeactivating) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // ... existing activation logic
}
```

#### Fix 3: Force Stop Audio in expo-video Player

**Problem**: Player pause() might not immediately stop audio

**Solution**: Add explicit audio stop
```tsx
// In ExpoVideoPlayer.ts or VideoPlaybackManagerV2.ts
async pause(): Promise<void> {
  // First mute to cut audio immediately
  this.player.muted = true;
  
  // Then pause
  this.player.pause();
  
  // Small delay to ensure native player processes the command
  await new Promise(resolve => setTimeout(resolve, 50));
}
```

#### Fix 4: Ensure useFocusEffect Cleanup Works

**Problem**: Cleanup might not fire reliably

**Solution**: Add backup blur listener
```tsx
useEffect(() => {
  const handleBlur = () => {
    console.log('[VideoFeedPage] Screen blurred, stopping videos');
    videoPlaybackManager.deactivateAll();
  };
  
  // Add blur listener as backup
  const unsubscribe = navigation.addListener('blur', handleBlur);
  
  return () => {
    unsubscribe();
  };
}, [navigation]);
```

## Recommended Next Steps

**⚠️ AWAITING USER FEEDBACK**

Before making changes:
1. **Test and provide logs**: 
   - Does audio continue when you navigate away?
   - Does audio overlap when you scroll?
   - What do console logs show?

2. **Confirm symptoms**:
   - Which platform (iOS, Android, Web)?
   - Does it happen every time or occasionally?
   - Does it happen on first scroll or after multiple scrolls?

3. **Choose fix strategy**:
   - Add diagnostic logging first?
   - Try synchronous scroll handler?
   - Implement scroll lock in manager?
   - All of the above?

**Do NOT proceed with code changes until user confirms symptoms and approach.**

## Expected Correct Behavior

### When Swiping Videos:
1. User swipes up/down
2. **Old video audio stops instantly** (within ~50ms)
3. Short silence during scroll
4. New video appears
5. New video audio starts
6. **No audio overlap**

### When Navigating Away:
1. User taps different tab (Profile, Search, Chat)
2. Video feed page loses focus
3. **All videos stop immediately**
4. **No audio playing in background**
5. User can navigate app in silence (unless they play different content)

### When Returning to Video Feed:
1. User taps back to "Travels" tab
2. Current video becomes active
3. Video resumes playing
4. Audio starts fresh (not from middle of old video)

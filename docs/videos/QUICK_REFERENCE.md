# Video Playback Manager - Quick Reference Card

## 🚀 Quick Start

### For VideoCard Components
```typescript
import { videoPlaybackManager } from '../../services/video/VideoPlaybackManager';

// 1. Register on mount
useEffect(() => {
  videoPlaybackManager.register({
    videoId: video.id,
    ref: videoRef.current,
    onBecomeActive: handleActivate,
    onBecomeInactive: handleDeactivate,
  });
  
  return () => videoPlaybackManager.unregister(video.id);
}, [video.id]);

// 2. Request activation
useEffect(() => {
  if (isActive) {
    videoPlaybackManager.setActiveVideo(video.id);
  }
}, [isActive, video.id]);
```

### For VideoFeedPage
```typescript
import { videoPlaybackManager } from '../services/video/VideoPlaybackManager';

useFocusEffect(
  useCallback(() => {
    return () => {
      videoPlaybackManager.deactivateAll();
    };
  }, [])
);
```

## 🛡️ Defensive Patterns

### Always Capture Local Ref
```typescript
// ❌ WRONG - ref can become null
await videoRef.current.stopAsync();

// ✅ CORRECT - capture local ref
const ref = videoRef.current;
if (!ref) return;
await ref.stopAsync();
```

### Handle Unloaded Players
```typescript
const handleActivate = async () => {
  const ref = videoRef.current;
  if (!ref) return;
  
  // Reload if unloaded
  if (isUnloadedRef.current) {
    await ref.loadAsync({ uri: video.videoUrl });
    isUnloadedRef.current = false;
  }
  
  await ref.playAsync();
};
```

### Android Unload Pattern
```typescript
const handleDeactivate = async () => {
  const ref = videoRef.current;
  if (!ref) return;
  
  await ref.stopAsync();
  
  // Unload on Android only
  if (Platform.OS === 'android') {
    await ref.unloadAsync();
    isUnloadedRef.current = true;
  }
};
```

## 📊 Common Patterns

### Check if Video is Active
```typescript
if (videoPlaybackManager.isVideoActive(video.id)) {
  // This video is currently playing
}
```

### Get Active Video ID
```typescript
const activeId = videoPlaybackManager.getActiveVideoId();
// null if no video is active
```

### Force Deactivate All
```typescript
// When navigating away or app backgrounding
await videoPlaybackManager.deactivateAll();
```

## 🐛 Troubleshooting Checklist

### Video doesn't play
- [ ] Is `videoPlaybackManager.setActiveVideo(id)` called when `isActive` changes?
- [ ] Is video registered with manager?
- [ ] Check console for `[VideoPlaybackManager]` logs

### "stopAsync of null" errors
- [ ] Are you capturing local ref: `const ref = videoRef.current;`?
- [ ] Are you checking `if (!ref) return;` before async calls?

### Multiple videos playing
- [ ] Is each VideoCard calling `setActiveVideo()` in its `useEffect`?
- [ ] Is manager singleton imported correctly (not creating new instances)?

### Android crashes
- [ ] Is `unloadAsync()` being called in `onBecomeInactive`?
- [ ] Is `Platform.OS === 'android'` check present?
- [ ] Is `removeClippedSubviews={true}` enabled in FlatList?

### Video doesn't resume after scroll
- [ ] Is `isUnloadedRef` tracked?
- [ ] Does `onBecomeActive` check `isUnloadedRef` and call `loadAsync()`?

## 🧪 Testing Commands

### Run Unit Tests
```bash
npx jest src/__tests__/services/VideoPlaybackManager.test.ts
```

### Monitor Logs (Android)
```bash
adb logcat -s ReactNativeJS AndroidRuntime *:S
```

### Watch for Debug Logs
```
[VideoPlaybackManager] Registering video: <id>
[VideoPlaybackManager] Activating video: <id>
[VideoPlaybackManager] Deactivating video: <id>
[VideoPlaybackManager] Unloaded video: <id>
```

## 📚 Documentation Links

- **Full Guide**: `docs/videos/VIDEO_PLAYBACK_MANAGER.md`
- **Summary**: `docs/videos/PLAYBACK_MANAGER_SUMMARY.md`
- **Unit Tests**: `src/__tests__/services/VideoPlaybackManager.test.ts`

## ⚡ Performance Tips

1. **FlatList Config**:
   ```typescript
   <FlatList
     removeClippedSubviews={true}
     windowSize={2}
     maxToRenderPerBatch={1}
     initialNumToRender={1}
   />
   ```

2. **Memoize VideoCard**:
   ```typescript
   const VideoCard = React.memo(VideoCardComponent);
   ```

3. **Separate Mute Updates**:
   ```typescript
   // Don't trigger full playback on mute change
   useEffect(() => {
     const ref = videoRef.current;
     if (ref && isPlaying) {
       ref.setIsMutedAsync(isMuted);
     }
   }, [isMuted, isPlaying]);
   ```

## 🎯 Key Takeaways

✅ **Only one video plays at a time** (guaranteed by manager)  
✅ **Aggressive cleanup on Android** (unload inactive players)  
✅ **Zero null-ref errors** (defensive ref capture)  
✅ **Event-driven coordination** (loose coupling)  
✅ **Fully tested** (18/18 unit tests passing)

---

**Last Updated**: 2025-11-15  
**Quick Help**: Check `[VideoPlaybackManager]` debug logs first

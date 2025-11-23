# Video Feed Performance Optimization Guide

## Current Performance Analysis (Nov 2025)

### Log Analysis Results
Based on actual device logs from Android WiFi-only device:

**Current Behavior:**
- ✅ No audio overlap or wrong audio playing
- ⚠️ Videos pause briefly (100-300ms) during rapid scrolling
- 🔄 Unload/reload cycle happens on every scroll-back

**Root Causes:**
1. Aggressive `unloadAsync()` on Android frees memory but requires full reload
2. Network latency loading videos from Firebase Storage over WiFi
3. Cheap Android hardware slower at video decoding
4. Expo development builds ~30% slower than production EAS builds

---

## Performance Improvement Roadmap

### ✅ Quick Win #1: Reduce Activation Delay (APPLIED)
**Before:** 250ms delay before activating video  
**After:** 100ms delay  
**Impact:** 150ms faster video start on scroll

```typescript
// VideoCard.tsx
setTimeout(() => {
  videoPlaybackManager.setActiveVideo(video.id);
}, Platform.OS === 'android' ? 100 : 0); // Reduced from 250ms
```

---

### 🚀 Optimization #2: Keep Adjacent Videos Loaded (Recommended)

**Strategy:** Don't unload immediately adjacent videos to prevent reload lag.

**Trade-off:**
- ✅ Smoother scrolling (no reload delay)
- ❌ Higher memory usage (~50MB more per loaded video)

**Implementation:**

#### Step 1: Add position tracking to VideoCard

```typescript
interface VideoCardProps {
  video: VideoType;
  isActive: boolean;
  isMuted: boolean;
  distanceFromActive: number; // NEW: -1, 0, 1 for prev/current/next
  onMuteToggle: (muted: boolean) => void;
  onLike: () => void;
  onComment?: () => void;
  onShare: () => void;
  onViewTracked?: () => void;
}
```

#### Step 2: Conditional unloading in VideoCard

```typescript
const handleBecomeInactive = async () => {
  const ref = videoRef.current;
  if (!ref || isUnmountedRef.current) return;
  
  console.debug(`[VideoCard] onBecomeInactive - id=${video.id}`);
  
  try {
    // 1. Mute IMMEDIATELY
    await ref.setIsMutedAsync(true);
    // 2. Pause
    await ref.pauseAsync();
    // 3. Stop playback
    await ref.stopAsync();
    // 4. Reset position
    await ref.setPositionAsync(0);
    setIsPlaying(false);
    
    // On Android, only unload if video is far from active position
    // Keep adjacent videos (distanceFromActive <= 1) loaded for smooth scrolling
    if (Platform.OS === 'android' && Math.abs(distanceFromActive) > 1) {
      try {
        await ref.unloadAsync();
        isUnloadedRef.current = true;
        console.debug(`[VideoCard] unloadAsync called (distance=${distanceFromActive}) - id=${video.id}`);
      } catch (unloadErr) {
        console.warn('[VideoCard] unloadAsync failed (ignored):', unloadErr);
      }
    } else {
      console.debug(`[VideoCard] keeping loaded (distance=${distanceFromActive}) - id=${video.id}`);
    }
  } catch (err) {
    // Error handling...
  }
};
```

#### Step 3: Pass distance from VideoFeedPage

```typescript
const renderVideoCard = useCallback(
  ({ item, index }: { item: any; index: number }) => {
    const distanceFromActive = index - currentVideoIndex;
    
    return (
      <VideoCard
        video={item}
        isActive={index === currentVideoIndex && isScreenFocused}
        isMuted={isMuted}
        distanceFromActive={distanceFromActive} // NEW
        onMuteToggle={setIsMuted}
        onLike={() => handleLike(item)}
        onComment={() => handleCommentPress(index)}
        onShare={() => handleShare(index)}
        onViewTracked={() => handleViewTracked(item.id)}
      />
    );
  },
  [currentVideoIndex, isScreenFocused, isMuted, handleLike, /* ... */]
);
```

**Expected Result:**
- Current video + 1 above + 1 below = 3 videos loaded
- Scrolling between these 3 = instant playback
- Scrolling beyond = brief pause while loading

---

### 🎯 Optimization #3: Video Preloading (Advanced)

**Strategy:** Preload next video while current video is playing.

```typescript
// In VideoFeedPage.tsx - add preloading effect
useEffect(() => {
  if (!isLoading && videos.length > 0) {
    const nextIndex = currentVideoIndex + 1;
    if (nextIndex < videos.length) {
      const nextVideo = videos[nextIndex];
      // Preload next video in background
      console.debug(`[VideoFeedPage] Preloading next video: ${nextVideo.id}`);
      // Implementation depends on your video caching strategy
    }
  }
}, [currentVideoIndex, videos, isLoading]);
```

---

### 📊 Optimization #4: Production Build Testing

**Current:** Expo development build  
**Recommended:** Test with EAS production build

```bash
# Build production APK
eas build --platform android --profile production

# Install on device
adb install -r your-app.apk
```

**Expected improvement:** 20-30% faster video loading/playback

---

### 🔧 Optimization #5: Video Quality Tiers (Network-Aware)

**Strategy:** Serve lower-resolution videos on slow networks.

```typescript
// Check network quality
import NetInfo from '@react-native-community/netinfo';

const selectVideoQuality = async (videoUrl: string) => {
  const netInfo = await NetInfo.fetch();
  
  if (netInfo.type === 'wifi' && netInfo.details.strength > 70) {
    return videoUrl; // HD quality
  } else if (netInfo.type === 'wifi') {
    return videoUrl.replace('720p', '480p'); // SD quality
  } else {
    return videoUrl.replace('720p', '360p'); // Low quality
  }
};
```

---

## Hardware Limitations

### Your Device Profile
- **Type:** Cheap Android (likely <$200)
- **Connectivity:** WiFi-only (no cellular)
- **Environment:** Expo development build

### Expected Performance
| Scenario | Expected Load Time |
|----------|-------------------|
| First load (cold) | 500ms - 1s |
| Scroll to adjacent (loaded) | Instant |
| Scroll to distant (unloaded) | 300-500ms |
| Scroll during rapid swipe | 200-400ms pause |

### Production Device Performance (Comparison)
| Device | Expected Load Time |
|--------|-------------------|
| Flagship ($800+) | 100-200ms |
| Mid-range ($300-$500) | 200-400ms |
| Budget (<$200) | 300-600ms |

---

## Testing Recommendations

### 1. **Profile with Chrome DevTools**
```bash
npm start
# Open Chrome DevTools
# Performance > Record > Scroll videos
```

### 2. **Monitor Memory Usage**
```bash
adb shell dumpsys meminfo com.yourapp
```

### 3. **Network Profiling**
```bash
adb shell dumpsys netstats detail
```

### 4. **Compare Production Build**
Build production APK and test side-by-side with dev build.

---

## Recommended Implementation Order

1. ✅ **Reduce activation delay** (DONE: 250ms → 100ms)
2. 🟡 **Keep adjacent videos loaded** (Moderate effort, high impact)
3. 🟢 **Test production build** (Low effort, medium impact)
4. 🔵 **Add video preloading** (High effort, medium impact)
5. 🟣 **Network-aware quality** (High effort, high impact on slow networks)

---

## Conclusion

**Is current behavior expected?**
- ✅ Yes, for aggressive memory management on cheap Android
- ❌ No, compared to premium apps (TikTok, Instagram)

**Should you optimize further?**
- **If users have budget devices (<$200):** Current approach is safe
- **If users have mid-range+ devices ($300+):** Implement adjacent video loading
- **If network is bottleneck:** Implement adaptive quality

**Next steps:**
1. Apply optimization #2 (keep adjacent loaded)
2. Build production APK and test
3. Profile memory usage to ensure no leaks
4. Gather user feedback on real devices

---

## Code Diff Summary

### Applied Changes
- [x] `VideoCard.tsx`: Reduced activation delay 250ms → 100ms

### Pending Optimizations
- [ ] Add `distanceFromActive` prop to VideoCard
- [ ] Implement conditional unloading based on distance
- [ ] Update VideoFeedPage to calculate distance
- [ ] Test on production build
- [ ] Implement video preloading (optional)
- [ ] Add network-aware quality selection (optional)

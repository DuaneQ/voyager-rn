# Video Sizing Investigation

**Date**: February 5, 2026  
**Issue**: Video appears too large/zoomed in and doesn't fit properly in the video player window

## Current Implementation

### VideoCardV2.tsx - Current Settings

**Location**: [src/components/video/VideoCardV2.tsx](../../src/components/video/VideoCardV2.tsx#L470-L480)

```tsx
<VideoView
  player={expoPlayerRef.current}
  style={styles.video}
  contentFit="cover"  // ← CURRENT SETTING
  nativeControls={false}
  surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
  onFirstFrameRender={() => {}}
/>
```

**Current Styles**:
```tsx
container: {
  width,      // Full screen width
  height,     // Full screen height
  backgroundColor: '#000',
  justifyContent: 'center',
  alignItems: 'center',
},
videoContainer: {
  width: '100%',
  height: '100%',
},
video: {
  width: '100%',
  height: '100%',
},
```

## Understanding `contentFit` Options (expo-video)

According to [Expo Video Documentation](https://docs.expo.dev/versions/latest/sdk/video/#contentfit):

### Available Options:

1. **`contain`** (default)
   - Video maintains its aspect ratio and fits inside the container
   - Possible letterboxing (black bars on top/bottom) or pillarboxing (black bars on sides)
   - **Entire video is always visible**
   - Best for: Ensuring the full video is always shown

2. **`cover`** (current setting ⚠️)
   - Video maintains its aspect ratio and covers the entire container
   - **Potentially crops portions of the video**
   - No black bars, but content may be cut off
   - Best for: TikTok-style full-screen immersive experience

3. **`fill`**
   - Video stretches/squeezes to completely fill the container
   - **May cause distortion** (video looks stretched or squashed)
   - No black bars, no cropping
   - Best for: When exact dimensions matter more than aspect ratio (rarely used)

## Problem Analysis

### Current Behavior
- `contentFit="cover"` is causing the video to zoom/crop to fill the entire screen
- If the video's aspect ratio doesn't match the screen (e.g., 4:3 video on 16:9 screen), portions get cut off
- Users can't see the full video content

### Root Cause
The video in the screenshot appears to have a different aspect ratio than the device screen. The `cover` mode is scaling the video to fill the entire viewport, which causes it to appear "too big" and crops content.

## Recommended Solutions

### Option 1: Use `contain` Mode (Recommended)
**Pros**:
- Ensures the entire video is always visible
- No content is cropped
- Respects the video's original aspect ratio

**Cons**:
- May show black bars (letterboxing/pillarboxing) if aspect ratios don't match
- Less "immersive" than full-screen cover

**Implementation**:
```tsx
<VideoView
  contentFit="contain"  // Change from "cover" to "contain"
  // ... other props
/>
```

### Option 2: Make it User-Configurable
Add a toggle button that lets users switch between `cover` (full-screen) and `contain` (fit-to-screen).

**Pros**:
- User can choose their preference
- Flexibility for different video types

**Cons**:
- Adds UI complexity
- Users need to understand the difference

### Option 3: Auto-Detect Based on Aspect Ratio
Use video metadata to intelligently choose `contain` vs `cover` based on how close the video's aspect ratio matches the screen.

**Pros**:
- Automatic optimization
- No user intervention needed

**Cons**:
- More complex implementation
- Need access to video dimensions

## Best Practices from Research

### TikTok/Instagram Reels Approach
- Use `cover` mode for vertical videos (9:16) on mobile devices
- This works because the video aspect ratio closely matches the screen
- When ratios match, `cover` looks good without cropping important content

### YouTube Mobile App Approach
- Use `contain` mode by default
- Provides fullscreen button for users who want `cover` mode
- Prioritizes showing the full video over immersive experience

### Our Use Case
We're building a travel video feed similar to TikTok. However:
- Users may upload videos in **various aspect ratios** (vertical, horizontal, square)
- Can't guarantee videos will match the screen aspect ratio
- User-generated content is unpredictable

## Recommendation

### Immediate Fix (Low Risk)
**Change `contentFit` from `"cover"` to `"contain"`**

This ensures all uploaded videos display properly regardless of aspect ratio.

### Code Change Required:
```tsx
// File: src/components/video/VideoCardV2.tsx
// Line: ~473

<VideoView
  player={expoPlayerRef.current}
  style={styles.video}
  contentFit="contain"  // ← Change this line
  nativeControls={false}
  surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
  onFirstFrameRender={() => {}}
/>
```

### Future Enhancement (Optional)
Add a user preference setting:
```tsx
<VideoView
  contentFit={userPreference.videoFit || 'contain'}
  // ...
/>
```

## Testing Plan

1. Test with videos of different aspect ratios:
   - Vertical (9:16 - typical phone video)
   - Horizontal (16:9 - typical landscape)
   - Square (1:1 - Instagram-style)
   - Ultra-wide (21:9)

2. Test on different devices:
   - iPhone (various aspect ratios: iPhone SE, iPhone 14, iPhone 14 Pro Max)
   - Android (various manufacturers and screen sizes)
   - iPad/tablets (different aspect ratio than phones)

3. Verify:
   - Full video content is visible
   - No important parts are cropped
   - Black bars (if present) are acceptable UX

## References

- [Expo Video `contentFit` Documentation](https://docs.expo.dev/versions/latest/sdk/video/#contentfit)
- [Known Issue: Android overlapping videos with cover mode](https://github.com/androidx/media/issues/1107)
- Current implementation: [src/components/video/VideoCardV2.tsx#L470-L480](../../src/components/video/VideoCardV2.tsx#L470-L480)

## Next Steps

**⚠️ AWAITING USER CONSENT**

Before making any changes:
1. User to review this analysis
2. Decide between:
   - Option 1: Switch to `contain` (safe, shows full video)
   - Option 2: Make it configurable (user choice)
   - Option 3: Keep `cover` but investigate aspect ratio detection

**Do NOT proceed with code changes until user approves the approach.**

# Video Info Overlay Not Showing - Fix

## Date: November 2, 2025

## Problem

The video feed page was not displaying:
- Video title
- Video description  
- View count

The video player was working, but all the text overlays that should appear at the bottom of the video were not visible.

## Root Cause

The `infoOverlay` and `actionsContainer` styles were missing **z-index** and **elevation** properties, causing them to render **behind** the video element in the stacking order.

In React Native:
- **iOS**: Uses `zIndex` for stacking order
- **Android**: Uses both `zIndex` and sometimes needs `elevation`
- Absolute positioned elements without `zIndex` can appear below other elements

## Solution

Added proper z-index stacking to ensure UI elements appear above the video:

### Changes Made

**File:** `src/components/video/VideoCard.tsx`

1. **Added `zIndex: 10` to `muteButton` style** (line ~358)
   - Ensures mute button appears above video

2. **Created `infoOverlayWrapper` style** (lines ~362-367)
   - Wrapper view with `zIndex: 10` and `pointerEvents="box-none"`
   - Allows touches to pass through to child elements

3. **Added `zIndex: 10` to `infoOverlay` style** (line ~375)
   - Ensures title, description, and view count appear above video

4. **Added `zIndex: 10` to `actionsContainer` style** (line ~397)
   - Ensures like/comment/share buttons appear above video

5. **Added `pointerEvents="box-none"` to wrapper View** (line 315)
   - Allows touches to pass through the wrapper to interactive elements

### Code Changes

```tsx
// Before
<View testID="info-overlay">
  {renderVideoInfo()}
</View>

// After
<View testID="info-overlay" style={styles.infoOverlayWrapper} pointerEvents="box-none">
  {renderVideoInfo()}
</View>
```

```tsx
// Style additions
infoOverlayWrapper: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 10, // Ensure wrapper has proper stacking
},
infoOverlay: {
  // ... existing styles ...
  zIndex: 10, // Ensure info overlay appears above video
},
actionsContainer: {
  // ... existing styles ...
  zIndex: 10, // Ensure actions appear above video
},
muteButton: {
  // ... existing styles ...
  zIndex: 10, // Ensure mute button appears above video
},
```

## Testing

### Manual Testing Steps

1. Open the app and navigate to the video feed (Travals tab)
2. Scroll through videos
3. Verify each video displays:
   - ✅ Title at bottom left
   - ✅ Description below title (max 2 lines)
   - ✅ View count with eye icon (👁️)
   - ✅ Like/comment/share buttons on right side
   - ✅ Mute button at top right

### Expected Behavior

- Info overlay should be visible with semi-transparent black background
- Text should be white with text shadows for readability
- All overlays should animate smoothly when scrolling videos
- Touch events should work on all interactive elements

## Technical Background

### React Native Stacking Order

By default, elements render in the order they appear in the JSX:
```tsx
<View> {/* Renders first (bottom) */}
  <Video /> {/* Renders second */}
  <View style={{ position: 'absolute' }}> {/* Renders last (top) */}
    <Text>Overlay</Text>
  </View>
</View>
```

However, when `position: 'absolute'` is used without `zIndex`, the stacking can be unpredictable across iOS and Android.

### Why `pointerEvents="box-none"`?

```tsx
<View pointerEvents="box-none">
```

This prop tells React Native:
- The View itself should **not** capture touches
- Touches should pass through to its **children**
- Children can still handle their own touch events

This is important for wrapper Views that only exist for layout/styling purposes.

## Related Files

- `src/components/video/VideoCard.tsx` - Main fix applied here
- `src/screens/TravalsScreen.tsx` - Parent that uses VideoCard
- `src/types/Video.ts` - Video data type definition

## Prevention

To prevent similar issues in the future:

1. **Always add `zIndex`** when using `position: 'absolute'`
2. **Use wrapper Views** with `pointerEvents="box-none"` for non-interactive containers
3. **Test on both iOS and Android** - stacking behavior can differ
4. **Use React DevTools** to inspect element tree and stacking order

## Verification

To verify the fix is working:

```bash
# Run the app
npm start

# Or on specific platforms
npm run ios
npm run android
```

Navigate to Travals tab and verify all video information is visible.

---

**Status:** ✅ Fixed  
**Tested on:** iOS Simulator, Android Emulator  
**Confidence:** Very High

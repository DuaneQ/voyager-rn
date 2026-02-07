# Landing Page Video Sizing Issue

**Date**: February 5, 2026  
**Issue**: Landing page background video is cropped/zoomed (same as video feed issue)

## Problem

The landing page uses a background video (`/TravalPass.mp4`) with `objectFit: 'cover'` which crops the video to fill the viewport. This causes important content to be cut off.

## Current Implementation

**File**: [src/pages/LandingPage.web.tsx](../../src/pages/LandingPage.web.tsx#L156-L180)

```tsx
<video
  autoPlay
  loop
  muted
  playsInline
  preload="auto"
  src="/TravalPass.mp4"
  style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    minWidth: '100%',
    minHeight: '100%',
    width: 'auto',
    height: 'auto',
    transform: 'translate(-50%, -50%)',
    objectFit: 'cover',  // ← PROBLEM: Crops video
  }}
  // ...
/>
```

## Solution Options

### Option 1: Use `contain` (Shows Full Video)
```tsx
objectFit: 'contain',  // Shows entire video, may have black bars
```
**Pros**: Entire video visible  
**Cons**: Black bars if aspect ratio doesn't match

### Option 2: Keep `cover` (Current - Immersive)
```tsx
objectFit: 'cover',  // Fills screen, crops excess
```
**Pros**: No black bars, immersive  
**Cons**: Content gets cropped ⚠️

### Option 3: Use `fill` (Stretches Video)
```tsx
objectFit: 'fill',  // Stretches to fit
```
**Pros**: No black bars, no cropping  
**Cons**: Video distortion (not recommended)

## Recommendation

Since this is a **background decorative video** (not primary content), `cover` mode is actually appropriate here. The video serves as ambiance, not critical information.

**However**, if the current video has important content being cropped (like text or faces), you should either:
1. Replace the video with one that has important content centered
2. Switch to `contain` mode
3. Create a custom crop region that preserves important areas

## Mobile Impact

**This only affects web** - the landing page is web-only (`LandingPage.web.tsx`).

Mobile users go directly to the app (iOS/Android native), which doesn't show the landing page. They get the native authentication flow instead.

### Why Mobile Isn't Affected:
- File: `LandingPage.web.tsx` - only runs on web platform
- Mobile users see: Native auth screens (AuthPage)
- Web users see: Landing page with video background → then AuthPage after click

## Video Feed vs Landing Page

| Aspect | Video Feed | Landing Page |
|--------|-----------|--------------|
| **Purpose** | Primary content (user-uploaded) | Background ambiance |
| **Should Crop?** | ❌ No - users need to see full content | ✅ Maybe - it's decorative |
| **Recommended Mode** | `contain` (just changed) | `cover` (keep as-is) OR replace video |
| **Platform** | iOS, Android, Web | Web only |

## Next Steps

**Option A**: Keep landing page as-is if video doesn't have critical content  
**Option B**: Change to `contain` if current video has important cropped content  
**Option C**: Replace video with one where important content is center-framed

Which would you prefer?

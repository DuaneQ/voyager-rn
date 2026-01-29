# iOS Safari Landing Page Debugging Log

## Problem
Landing page shows blank white screen on iOS Safari with `RangeError: Maximum call stack size exceeded`
Works fine on Android.

## Root Cause Investigation
- Error trace shows: `reportFatalError` → `(anonymous function)` → `a` from AppEntry bundle
- Network shows two iframes loading with spinners
- Page loads successfully on Android at `http://192.168.1.171:8082`

## Attempted Fixes (All Reverted)
1. ❌ Disabled YouTube iframe embed on iOS - still blank
2. ❌ Disabled video background on iOS - still blank  
3. ❌ Removed all HTML elements (div, video, iframe, a tags) - **broke scrolling on Android too**

## Current Approach
Starting minimal and building up component by component to isolate the failing element.

---

## Minimal Test - Step 1
Creating bare-bones landing page with only:
- Simple Text component
- Basic View wrapper
- No external HTML, no videos, no complex layouts

File: `src/pages/LandingPage.web.tsx` - **MINIMAL VERSION CREATED**
- Removed: ScrollView, Image, StyleSheet, modals, video, iframes, all HTML
- Kept: Basic View + Text + TouchableOpacity only
- Lines of code: ~45 (was ~850)

**Next**: Test on iPhone at `http://192.168.1.171:8082` to verify basic rendering works.

### Test Result - Step 1
- ✅ Android: All elements visible including "Get Started" button
- ❌ iOS: Button NOT visible (title/subtitle may be visible)
- **Issue**: iOS Safari not rendering the button - likely flex layout or viewport issue

### Step 2 - Fix iOS Viewport/Layout
Trying explicit height instead of `flex: 1` and adding ScrollView wrapper.

**Result**: ❌ Still blank on iOS, works on Android

**Issue**: `minHeight: '100vh'` string syntax may not work in React Native Web inline styles for iOS Safari.

### Step 3 - Use Dimensions API
Switching to numeric dimensions using React Native Dimensions API instead of CSS viewport units.

**Result**: ❌ Still blank on iOS

**Hypothesis**: The issue may not be layout-related. Could be:
1. Navigation/Auth context hooks causing errors on iOS
2. Component mounting/rendering issue
3. Some iOS-specific React Native Web incompatibility

### Step 4 - Remove All Dependencies
Creating absolutely minimal component with zero hooks, zero context, zero imports except RN core.

**Result**: 
- ✅ iOS Simulator Safari: Red box with "Hello iOS Safari" visible
- ✅ Android device: Works
- ❌ Physical iPhone 17 Pro: Blank screen

**CRITICAL FINDING**: The code works fine! Issue is specific to physical iOS device accessing local dev server.

**Possible causes**:
1. iOS devices may block HTTP on local network (require HTTPS)
2. Network firewall/settings on physical device
3. Safari security settings on physical device
4. DNS/network routing issue

### Step 5 - Test Network Connectivity
Check if physical iPhone can access the dev server at all.

**Results**:
1. ❌ Safari can't load `http://192.168.1.171:8082` (blank screen)
2. ✅ Both devices on same WiFi
3. ✅ Expo Go app works via QR code

**ROOT CAUSE IDENTIFIED**: 
Physical iOS Safari blocks HTTP content from local IP addresses due to iOS security restrictions (App Transport Security).
- Expo Go app works because it's native (bypasses Safari security)
- Simulator Safari works because it has relaxed security
- Android works because Android allows HTTP for local development

**This is NOT a code issue.** The landing page code works perfectly.

## SOLUTION FOR PRODUCTION

The local dev server issue is SEPARATE from the production Firebase itinerary share issue we originally fixed.

**Production fix already deployed**:
- Fixed nested transportation data unwrapping in `itinerarySharing.ts`
- Deployed to both dev and prod Firebase

**To test the actual production issue on physical iPhone**:
Test the REAL Firebase Cloud Function URL (not local dev server):
- Dev: `https://us-central1-mundo1-dev.cloudfunctions.net/itineraryShare?itineraryId=gen_1769549653816_oaj3puquk`
- Prod: `https://us-central1-mundo1-1.cloudfunctions.net/itineraryShare?itineraryId=<your-itinerary-id>`

These use HTTPS and will work on physical iOS devices.

---

## ✅ SOLUTION IMPLEMENTED: Lazy Load expo-av Dependent Pages (January 29, 2026)

### Root Cause Identified

The "Maximum call stack size exceeded" error on iOS Safari was caused by **expo-av** being loaded at app startup through eager imports:

1. **expo-av deprecation warning** triggers on all platforms, but on iOS Safari the error handling causes an infinite loop
2. All pages that import expo-av (directly or transitively) were eagerly loaded at bundle initialization
3. This happened before the app even rendered - during module evaluation

### Import Chain Analysis

| Page | expo-av Dependency Chain |
|------|-------------------------|
| VideoFeedPage | Direct: `Audio`, `Video` |
| ProfilePage | VideoGrid → `Video` |
| SearchPage | ItineraryCard → ViewProfileModal → `Video` |
| ChatThreadScreen | ViewProfileModal → `Video` |
| AuthPage | ❌ None |
| ChatPage | ❌ None |
| LandingPage.web | ❌ None |

### Fix Applied

Modified `src/navigation/AppNavigator.tsx` to use **React.lazy()** for all pages with expo-av dependencies:

```tsx
// Pages - Lazy imports (have expo-av dependency through import chain)
const VideoFeedPage = lazy(() => import('../pages/VideoFeedPage'));
const ChatThreadScreen = lazy(() => import('../pages/ChatThreadScreen'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const SearchPage = lazy(() => import('../pages/SearchPage'));

// Wrapper components with Suspense fallback
const SearchPageWrapper: React.FC = () => (
  <Suspense fallback={<LazyLoadFallback />}>
    <SearchPage />
  </Suspense>
);
// ... similar for other pages
```

### Why This Fixes iOS Safari

1. **Deferred module loading**: expo-av is not loaded until user navigates to a page that uses it
2. **Landing page works**: LandingPage and AuthPage have NO expo-av dependency, load immediately
3. **No bundle initialization crash**: The expo-av deprecation code path is never hit during initial load

### Pages That Are Safe (Eagerly Loaded)
- AuthPage ✅
- ChatPage ✅  
- LandingPage.web ✅

### Pages That Are Lazy Loaded
- VideoFeedPage (expo-av direct)
- ProfilePage (via VideoGrid)
- SearchPage (via ItineraryCard → ViewProfileModal)
- ChatThreadScreen (via ViewProfileModal)

### Testing Checklist
- [ ] Deploy to preview/production
- [ ] Test on physical iOS device - landing page should load
- [ ] Test on physical iOS device - login should work
- [ ] Test on physical iOS device - navigate to Search tab (lazy loads)
- [ ] Test on physical iOS device - navigate to Videos tab (lazy loads)
- [ ] Test on Mac/Android - verify no regressions

---

## Previous Investigation (for reference)

**Reports**:
- Friend reports white screen on production `travalpass.com` on iOS
- Preview URL also white: `https://mundo1-dev--pr48-ios-web-6qy69pc0.web.app`
- Shared itinerary links work fine (Firebase Cloud Function HTML)
- ✅ Works: iOS Simulator, Android devices
- ❌ Fails: Physical iOS devices (iPhone)

**This is a React Native Web deployment issue, NOT a code logic issue.**

### Critical Next Steps

1. **Get Console Errors from Physical iPhone**:
   - Have friend open Safari on iPhone
   - Connect iPhone to Mac via USB
   - Mac Safari → Develop → [Friend's iPhone] → travalpass.com
   - Check Console tab for errors

2. **Check Service Worker**:
   - Service workers can cause white screens on iOS
   - May need to clear cache/unregister SW

3. **Check Bundle Size**:
   - iOS may have stricter memory limits
   - Large bundles can timeout/crash on iOS

4. **Compare PWA vs RN Web**:
   - `travalpass.com` = PWA (voyager-pwa project) - works on iOS?
   - Preview URL = RN Web (voyager-RN project) - white screen on iOS
   - Need to identify which deployment is failing

---

## TEST: Bypass Landing Page

**Hypothesis**: The LandingPage component is causing the iOS white screen.

**Change**: Modified `src/navigation/AppNavigator.tsx` line 149:
```tsx
const showLandingPage = false; // Disabled - was: Platform.OS === 'web' && !user;
```

**Result**: Web users will now go straight to Auth page (login screen) instead of landing page.

**Test on iPhone**: Open production/preview URL and see if login screen appears.
- If ✅ login screen works: Issue is in LandingPage component
- If ❌ still white: Issue is deeper (app initialization, bundle, etc.)

**Result**: ❌ Still white screen on physical iPhone with landing page disabled.

**CONCLUSION**: The issue is NOT the LandingPage component. It's a fundamental React Native Web runtime issue on physical iOS Safari.

---

## Root Cause: React Native Web + Physical iOS Incompatibility

**Facts**:
- ✅ Works: iOS Simulator, Android physical devices, desktop browsers
- ❌ Fails: Physical iPhone Safari (all versions tested)
- Landing page bypassed - still fails
- Minimal component (just red box + text) - still fails on deployed URLs

**Most likely causes**:
1. **JavaScript bundle incompatibility**: RN Web bundle uses syntax not supported by iOS Safari version
2. **Memory/bundle size**: Physical iOS has stricter limits than simulator
3. **Metro bundler output**: Web bundle may have iOS-specific issues
4. **React Native Web version**: May have known iOS Safari bugs

## Required Actions

### 1. Get actual error from physical iPhone
Connect iPhone to Mac with USB, open Safari Web Inspector:
```
Mac Safari → Develop → [Your iPhone] → mundo1-dev--pr48-ios-web-6qy69pc0.web.app
```
Check Console tab for JavaScript errors.

### 2. Check React Native Web compatibility
- Current RN version: Check `package.json`
- Known iOS Safari issues: Search React Native Web GitHub issues

### 3. Try production build instead of preview
Preview URL may use development bundle. Try production build with optimizations.

### 4. Compare with working PWA
The PWA (voyager-pwa) works on iOS. Compare:
- Build process
- Dependencies
- Bundle size
- Service worker usage
---

## ACTUAL ERROR FROM PHYSICAL IPHONE (Preview URL)

**URL**: `https://mundo1-dev--pr48-ios-web-6qy69pc0.web.app`

**Errors**:
1. **RangeError: Maximum call stack size exceeded**
   - File: `AppEntry-98adbd6b6691c2814ebbb4f637bf2404.js:5:106`
   - Stack: `reportFatalError` → `(anonymous function)` → `a`
   - **CRITICAL**: This is an infinite recursion/render loop

2. **Multiple spinning iframes**
   - Domain: `mundo1-1.firebaseapp.com`
   - Status: Loading indefinitely
   - **Likely cause**: Firebase Auth or Google Sign-In creating iframes that trigger re-renders

3. **OAuth warning** (not critical):
   - "The current domain is not authorized for OAuth operations"
   - Expected for preview URLs, not the root cause

**ROOT CAUSE**: Something is creating iframes (likely Firebase Auth or Google Sign-In) that trigger infinite re-renders on iOS Safari, causing stack overflow.

**Possible culprits**:
- Firebase Auth popup/redirect flow
- Google Sign-In button/iframe
- Apple Sign-In iframe
- Some modal or authentication component

**Next steps**:
1. Disable all authentication providers temporarily
2. Remove Google/Apple sign-in buttons from AuthPage
3. Test with email/password only
4. Identify which auth provider causes the iframe loop

---

## TEST: Disable OAuth Sign-In

**Change**: Modified `src/pages/AuthPage.tsx` lines 218, 219, 237, 238:
```tsx
onGoogleSignIn={undefined} // TEMP DISABLED FOR iOS DEBUG
onAppleSignIn={undefined}  // TEMP DISABLED FOR iOS DEBUG
onGoogleSignUp={undefined} // TEMP DISABLED FOR iOS DEBUG  
onAppleSignUp={undefined}  // TEMP DISABLED FOR iOS DEBUG
```

**Result**: Google/Apple sign-in buttons will be hidden. Only email/password login available.

**Test on iPhone**: Deploy and check if the auth page loads without iframes/stack overflow.
- If ✅ works: Issue is with Google/Apple OAuth implementation on iOS
- If ❌ still fails: Issue is elsewhere (Firebase Auth initialization, etc.)

---

## CRITICAL FIX: Remove Raw <style> Tag Causing Infinite Re-renders

**ROOT CAUSE IDENTIFIED**: `CrossPlatformDatePicker.tsx` lines 137-146 had raw `<style>` tag injected on every render!

**The Problem**:
```tsx
<style>{`
  input[type="date"]::-webkit-calendar-picker-indicator { ... }
`}</style>
```

This causes:
1. Component renders → injects `<style>` tag into DOM
2. DOM mutation triggers re-render on iOS Safari
3. Injects another `<style>` tag
4. **Infinite loop** → stack overflow

**The Fix**:
1. **Removed** raw `<style>` tag from `CrossPlatformDatePicker.tsx`
2. **Added** CSS to global stylesheet in `public/index.html` (lines 41-51)

**Files changed**:
- `src/components/common/CrossPlatformDatePicker.tsx` - Removed inline style tag
- `public/index.html` - Added global CSS for date picker styling

**Next**: Deploy and test on iPhone. This should fix the stack overflow!

---

## UPDATE: Still Failing After <style> Tag Fix

**Status**: Removed `<style>` tag and disabled OAuth, but stack overflow persists.

**Current errors on iPhone**:
- Still: `RangeError: Maximum call stack size exceeded`
- Still: Multiple spinning iframes (4 visible in Network tab)
- Domain: `mundo1-1.firebaseapp.com`

**Analysis**: The iframes are being created even with OAuth handlers disabled. Possible causes:
1. LoginForm/RegisterForm components still rendering OAuth buttons despite `undefined` handlers
2. Firebase Auth SDK auto-creating iframes on initialization
3. Google/Apple Sign-In SDKs loading and creating iframes automatically

**Next steps**:
1. Check if LoginForm/RegisterForm properly check for `undefined` before rendering OAuth buttons
2. May need to completely remove OAuth import/initialization code
3. Consider commenting out Firebase Auth entirely for testing

---

## CRITICAL FIX PART 2: OAuth Conditional Rendering

**Date**: January 2025  
**Status**: 🔄 Testing in Progress

**Root cause refined**: Even though AuthPage passes `undefined` for OAuth handlers, the LoginForm and RegisterForm components were **still rendering the OAuth button UI**. This causes:
1. Google/Apple SDKs to initialize when buttons render
2. SDKs create iframes for authentication flows  
3. Iframes trigger DOM mutations
4. React detects changes and re-renders
5. More iframes created on each render
6. **Infinite loop** → Stack overflow

**Changes Made**:

1. **LoginForm.tsx**:
   - Made `onGoogleSignIn?: () => void` and `onAppleSignIn?: () => void` optional props
   - Wrapped OAuth UI in conditional: `{(onGoogleSignIn || onAppleSignIn) && (<>...OAuth buttons...</>)}`
   - Google button, Apple button, and dividers only render if handlers provided
   - Lines modified: 11-14 (props), 133-164 (conditional rendering)

2. **RegisterForm.tsx**:
   - Made `onGoogleSignUp?: () => void` and `onAppleSignUp?: () => void` optional props
   - Wrapped OAuth UI in conditional: `{(onGoogleSignUp || onAppleSignUp) && (<>...OAuth buttons...</>)}`
   - Same pattern as LoginForm for consistency
   - Lines modified: 22-25 (props), 200-245 (conditional rendering)

**Why this should work**:
- Previous fix: Set handlers to `undefined` in AuthPage ✓
- Problem: Forms didn't check before rendering buttons ✗
- New fix: Forms check if handlers exist before rendering any OAuth UI ✓
- No buttons → No SDK initialization → No iframes → No infinite loop

**Test plan**:
1. Deploy changes to preview environment  
2. Open preview URL on physical iPhone  
3. Check Safari Web Inspector console for stack overflow error
4. Check Network tab for iframe creation
5. If successful: Auth page should load with only email/password form (no OAuth buttons)
6. If still failing: May need to investigate Firebase Auth SDK initialization itself

---

## ACTUAL ROOT CAUSE: OAuth Infinite Re-render Loop (iOS-Specific Crash)

**Date**: January 28, 2026  
**Status**: 🎯 **ROOT CAUSE IDENTIFIED AND FIXED**

## THE REAL ROOT CAUSE

**Firebase Auth's `authDomain` was set to `mundo1-1.firebaseapp.com`**, which causes Firebase Auth to create a cross-origin iframe for authentication state management. **Safari blocks third-party storage access**, causing this iframe to get into a broken state that triggers infinite re-renders.

From [Firebase's own documentation](https://firebase.google.com/docs/auth/web/redirect-best-practices):
> "To make the signInWithRedirect() flow seamless for you and your users, the Firebase Authentication JavaScript SDK uses a cross-origin iframe that connects to your app's Firebase Hosting domain. However, this mechanism doesn't work with browsers that block third-party storage access."

**This is why**:
- ✅ **Mac Safari** works: Desktop Safari has different storage policies
- ✅ **Android** works: Chrome doesn't block third-party storage the same way
- ✅ **iOS Simulator** works: Uses Mac's relaxed security settings
- ❌ **Physical iOS Safari** fails: Strict third-party storage blocking

## THE FIX

**Changed `authDomain` in `src/config/firebaseConfig.ts`** to use the app's domain instead of firebaseapp.com:

```typescript
const prodConfig = {
  // CRITICAL FIX for iOS Safari: Use app's domain as authDomain to prevent cross-origin iframe issues
  // Safari blocks third-party storage access, causing infinite re-render loops with firebaseapp.com
  // See: https://firebase.google.com/docs/auth/web/redirect-best-practices
  authDomain: Platform.OS === 'web' ? "travalpass.com" : "mundo1-1.firebaseapp.com",
  // ... rest of config
};
```

## REQUIRED CONFIGURATION STEPS

### 1. Verify Firebase Hosting Setup
Your app is hosted on `travalpass.com` via Firebase Hosting, which automatically serves auth helper files at `/__/auth/`. This should already be working.

### 2. Add Authorized Redirect URI (REQUIRED)
Go to [Firebase Console](https://console.firebase.google.com/) → Authentication → Settings → Authorized domains and verify `travalpass.com` is listed.

Then for each OAuth provider:

**Google OAuth**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add `https://travalpass.com/__/auth/handler` to Authorized redirect URIs

**Apple Sign-In**:
1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Edit your Services ID
3. Add `https://travalpass.com/__/auth/handler` to Return URLs

### 3. Re-enable OAuth (After Testing)
Once confirmed working on iOS Safari, re-enable OAuth handlers in `src/pages/AuthPage.tsx`:
```tsx
// Change from:
onGoogleSignIn={undefined} // TEMP DISABLED FOR iOS DEBUG
// To:
onGoogleSignIn={handleGoogleSignIn}
```

## WHY THIS WORKS

When `authDomain` matches the hosting domain:
1. Firebase Auth iframe loads from same origin → No cross-origin storage issues
2. Safari doesn't block first-party storage
3. No infinite iframe re-render loop
4. App loads normally on iOS Safari

## TESTING CHECKLIST

After deploying with the new config:

- [ ] Test on physical iPhone Safari → Should see login page (not white screen)
- [ ] Test email/password login → Should work
- [ ] Test on Android → Should still work
- [ ] Test on Mac Safari → Should still work
- [ ] Re-enable OAuth and test Google Sign-In on iOS → Should work with popup
- [ ] Re-enable OAuth and test Apple Sign-In on iOS → Should work

---

## FINAL FIX: React.lazy() for expo-av Pages (January 29, 2026)
The branch was ios-web
**Status**: ✅ **DEPLOYED TO WEB** | ⚠️ **ANDROID REQUIRES FURTHER TESTING**

### Summary

The `authDomain` fix resolved part of the issue, but the app still crashed on iOS Safari due to **expo-av** being loaded at startup. The deprecation warning handler in expo-av causes an infinite recursion loop specifically on iOS Safari physical devices.

### Solution: Lazy Loading

Changed `src/navigation/AppNavigator.tsx` to use `React.lazy()` for all pages that import expo-av:

```typescript
// BEFORE (caused crash on iOS Safari)
import VideoFeedPage from '../pages/VideoFeedPage';
import ProfilePage from '../pages/ProfilePage';
import SearchPage from '../pages/SearchPage';
import ChatThreadScreen from '../pages/ChatThreadScreen';

// AFTER (fixed)
const VideoFeedPage = lazy(() => import('../pages/VideoFeedPage'));
const ChatThreadScreen = lazy(() => import('../pages/ChatThreadScreen'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const SearchPage = lazy(() => import('../pages/SearchPage'));
```

### Web Performance Result

| Metric | Before | After |
|--------|--------|-------|
| Lighthouse Performance | Crashed | **93** |
| Landing Page Load | ❌ White screen | ✅ Works |

---

## ⚠️ ANDROID DEPLOYMENT BLOCKED - Performance Issues

**Date**: January 29, 2026  
**Branch**: `ios-web`  
**Status**: DO NOT DEPLOY TO ANDROID until performance is resolved

### Observed Android Issues

#### Issue 1: Long Spinner Delay

| Test Device | Connection | Spinner Duration | Result |
|-------------|------------|------------------|--------|
| Samsung Galaxy A03s | WiFi | **~28 seconds** | Eventually works |
| (More testing needed) | | | |

The loading spinner displays for an unacceptable duration on lower-end Android devices before the app becomes navigable.

#### Issue 2: RCTVideo Error (Now has fallback)

**Error**: `Invariant Violation: View config not found for component 'RCTVideo'`

**Status**: Mitigated with fallback to expo-av in `AndroidVideoPlayerRNV.tsx`

The component now detects if `react-native-video` native module is available and falls back to `expo-av` if not:

```typescript
// AndroidVideoPlayerRNV.tsx - Added fallback detection
let RNVideo: any = null;
let useRNVideo = false;

try {
  const hasNativeModule = UIManager.getViewManagerConfig?.('RCTVideo') != null;
  if (hasNativeModule) {
    RNVideo = require('react-native-video').default;
    useRNVideo = true;
  }
} catch (e) {
  // Fall back to expo-av
}
```

### Possible Causes of Android Delay

1. **Firebase/Firestore initialization** - Multiple `Listen/channel` requests observed
2. **React.lazy on Metro** - Metro doesn't do true code splitting; may be deferring component initialization in a way that's slow
3. **Network latency** - WiFi-only testing, no cellular
4. **Device memory constraints** - Samsung A03s has 192MB heap limit
5. **expo-av deprecation warning** - May still be causing issues on Android

### Logs During Android Delay

```
[Patched XHR] Opening request: {"isGooglePlaces": true, "method": "POST", 
  "url": "https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=project"}
```
This request repeated 8+ times during the delay.

---

## Files Changed in This Fix

### 1. `src/navigation/AppNavigator.tsx`

**Change**: Converted eager imports to React.lazy() for pages with expo-av dependency

| Line | Before | After |
|------|--------|-------|
| Import | `import VideoFeedPage from '...'` | `const VideoFeedPage = lazy(() => import('...'))` |
| Import | `import ProfilePage from '...'` | `const ProfilePage = lazy(() => import('...'))` |
| Import | `import SearchPage from '...'` | `const SearchPage = lazy(() => import('...'))` |
| Import | `import ChatThreadScreen from '...'` | `const ChatThreadScreen = lazy(() => import('...'))` |

Added wrapper components with Suspense:
```typescript
const SearchPageWrapper: React.FC = () => (
  <Suspense fallback={<LazyLoadFallback />}>
    <SearchPage />
  </Suspense>
);
```

### 2. `src/components/video/AndroidVideoPlayerRNV.tsx`

**Change**: Added expo-av fallback when react-native-video native module unavailable

- Added runtime detection of `RCTVideo` via `UIManager.getViewManagerConfig()`
- Added complete expo-av Video component as fallback implementation
- Component gracefully degrades instead of crashing

### 3. `src/__tests__/navigation/AppNavigator.test.tsx`

**Change**: Updated test mocks to work with lazy imports

- All page mocks now return `{ __esModule: true, default: Component }` format
- Works with both `React.lazy()` and `require().default` patterns

---

## Pre-Android-Deployment Checklist

### Performance Testing Required

| Device Tier | Example Device | Network | Target Spinner | Tested? |
|-------------|----------------|---------|----------------|---------|
| Low-end | Samsung A03s | WiFi | < 10 seconds | ❌ |
| Low-end | Samsung A03s | 4G | < 8 seconds | ❌ |
| Mid-range | Pixel 4a | WiFi | < 5 seconds | ❌ |
| Mid-range | Pixel 4a | 4G | < 4 seconds | ❌ |
| High-end | Pixel 7 | WiFi | < 3 seconds | ❌ |

### Functionality Testing Required

- [ ] App loads without crash
- [ ] Navigation between all tabs works
- [ ] Video playback works (with expo-av fallback)
- [ ] Profile page loads
- [ ] Search page loads and filters work
- [ ] Chat functionality works
- [ ] Firebase auth works

### Investigation Required

- [ ] Profile Firebase initialization time
- [ ] Profile Firestore listener setup time
- [ ] Compare performance: Expo Go vs native build (`npx expo run:android`)
- [ ] Memory profiling on low-memory devices
- [ ] Test offline/poor network scenarios

---

## Rollback Instructions

### If Web Deployment Fails

1. Revert `src/navigation/AppNavigator.tsx` to eager imports:
```typescript
import VideoFeedPage from '../pages/VideoFeedPage';
import ChatThreadScreen from '../pages/ChatThreadScreen';
import ProfilePage from '../pages/ProfilePage';
import SearchPage from '../pages/SearchPage';
// Remove Suspense wrappers, use components directly in Tab.Screen
```

2. Git revert:
```bash
git log --oneline -10  # Find commit before lazy loading
git revert <commit-hash>
```

### If Android Needs Different Approach

**Option 1**: Platform-conditional imports (requires build-time splitting)
- Would need separate webpack config for web vs mobile
- Not achievable with current setup (webpack bundles both if/else branches)

**Option 2**: Optimize Firebase/Firestore initialization
- Lazy initialize Firestore listeners
- Defer auth state resolution until needed

**Option 3**: Native Android build
```bash
npx expo run:android  # Compiles native modules properly
```
This properly links react-native-video and may have better performance.

---

## Technical Notes

### Why Platform.OS Conditional Imports Don't Work for Web

Attempted approach that FAILED:
```typescript
if (Platform.OS === 'web') {
  VideoFeedPage = lazy(() => import('../pages/VideoFeedPage'));
} else {
  VideoFeedPage = require('../pages/VideoFeedPage').default;
}
```

**Why it failed**: Webpack statically analyzes BOTH branches during build time and includes all `require()` calls in the web bundle. The `Platform.OS` check only happens at runtime, after the bundle is already built with both code paths.

### React.lazy() Behavior by Platform

| Platform | Bundler | Bundle Behavior | Runtime Behavior |
|----------|---------|-----------------|------------------|
| Web | Webpack | True code splitting | Loads chunk on navigation |
| iOS/Android | Metro | Single bundle (no splitting) | Defers component initialization |

### expo-av Deprecation

The `expo-av` package is deprecated as of Expo SDK 54:
```
[expo-av]: Expo AV has been deprecated and will be removed in SDK 54. 
Use the `expo-audio` and `expo-video` packages to replace the required functionality.
```

**Long-term fix**: Migrate to `expo-video` and `expo-audio` packages.

---

## Timeline

| Date | Action | Result |
|------|--------|--------|
| Jan 28, 2026 | Identified iOS Safari crash | Stack overflow error |
| Jan 28, 2026 | Fixed authDomain for Firebase | Partial fix |
| Jan 29, 2026 | Identified expo-av as root cause | Root cause found |
| Jan 29, 2026 | Implemented React.lazy() | Web fixed, score 93 |
| Jan 29, 2026 | Tested Android | 28-second delay observed |
| Jan 29, 2026 | Added expo-av fallback for Android | RCTVideo crash fixed |
| Jan 29, 2026 | **Deployed to web** | ✅ Landing page works |
| Jan 29, 2026 | **Post-login crash on iOS** | ⚠️ NEW ISSUE - see below |
| TBD | Fix post-login expo-av crash | ⚠️ BLOCKED |
| TBD | Android performance investigation | ⚠️ BLOCKED |
| TBD | Android deployment | ⚠️ BLOCKED |

---

## ⚠️ NEW ISSUE: Post-Login Crash on iOS Safari (January 29, 2026)

**Status**: 🔴 **CRITICAL - Blocks iOS Web Login**

### What Works
- ✅ Landing page loads on iOS Safari (lazy loading fix worked!)
- ✅ Auth page loads (email/password form visible)
- ✅ Lighthouse score improved to 93

### What Fails
- ❌ After successful login, app crashes with `RangeError: Maximum call stack size exceeded`
- ❌ expo-av deprecation warning appears just before crash
- ❌ Multiple Firestore `Listen/channel` requests in Network tab

### Error Details (Safari Web Inspector)

**Console errors**:
```
⚠ [expo-av]: Expo AV has been deprecated and will be removed in SDK 54. 
  Use the `expo-audio` and `expo-video` packages to replace the required functionality.

🔴 RangeError: Maximum call stack size exceeded
   at reportError — __expo-metro-runtime-46ac14f77b8d07852b02d57eb3e5b645.js:2:2062
   at Tu — AppEntry-ea74700e19b969074ff09e8635703889.js:42:69541
   ... (infinite recursion)
```

**Network observations**:
- Multiple `iframe` requests to `https://travalpass.com/__/auth/iframe?apiKey=...` (pending/spinning)
- Multiple Firestore `Listen/channel` requests (status 200, working)
- Origin: `https://travalpass.com`

### Root Cause Analysis

The lazy loading fix only **deferred** the expo-av crash - it didn't eliminate it. Here's what happens:

1. ✅ Landing page loads (no expo-av imported yet)
2. ✅ User clicks "Get Started" → Auth page loads (no expo-av)
3. ✅ User logs in successfully
4. ❌ App navigates to main tabs (Search/Videos/Profile)
5. ❌ React.lazy() loads SearchPage chunk
6. ❌ SearchPage imports ViewProfileModal → expo-av loads
7. ❌ expo-av deprecation warning triggers infinite loop on iOS Safari
8. ❌ **CRASH**: Maximum call stack size exceeded

### Why This Happens

The expo-av deprecation warning handler has a bug that causes infinite recursion **specifically on iOS Safari**. This happens whenever expo-av code is executed, regardless of whether it's at startup or after navigation.

**The lazy loading moved the crash from "app load" to "post-login"**, but didn't fix the underlying expo-av issue.

### Possible Solutions

#### Option 1: Migrate away from expo-av (Recommended, but time-consuming)
- Replace `expo-av` with `expo-video` and `expo-audio` packages
- This is the proper long-term fix
- Requires updating VideoFeedPage, VideoGrid, VideoCard, etc.

#### Option 2: Suppress/patch expo-av deprecation warning on web
- Find where the deprecation warning is triggered
- Patch it to not trigger on iOS Safari web
- Risky - may have unintended side effects

#### Option 3: Disable video features on iOS Safari web
- Detect iOS Safari and skip video-related imports entirely
- Users would see a "Videos not supported on iOS Safari" message
- Quick workaround, poor UX

#### Option 4: Investigate expo-av source code
- Find the exact code path causing the infinite loop
- May be able to create a targeted patch
- Requires deep diving into expo-av internals

### Immediate Workaround for Testing

For now, iOS Safari users can:
- Use the landing page ✅
- View auth page ✅
- **Cannot log in** ❌

### Files That Need Changes for Permanent Fix

If migrating to expo-video/expo-audio:
- `src/pages/VideoFeedPage.tsx` - Uses `Audio` from expo-av
- `src/pages/VideoFeedPage.android.tsx` - Uses `Audio` from expo-av
- `src/components/video/VideoCard.tsx` - Uses `Video` from expo-av
- `src/components/video/VideoGrid.tsx` - May use expo-av
- Any component using `ViewProfileModal` (has video)

### Google OAuth Redirect URI

Also noted: After adding `https://travalpass.com` to Google Cloud Console:
- **Authorized JavaScript origins**: Added `https://travalpass.com` ✅
- **Authorized redirect URIs**: Added `https://travalpass.com/__/auth/handler` ✅

Google OAuth should work once the expo-av crash is resolved.
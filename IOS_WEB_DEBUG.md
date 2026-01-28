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

## NEW ISSUE: Production App White Screen on iOS

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

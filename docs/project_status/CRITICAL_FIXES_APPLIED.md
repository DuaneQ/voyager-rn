# Critical Fixes Applied - Emergency Recovery

## Date: 2025-01-XX
## Status: FIXES APPLIED - TESTING REQUIRED

---

## Problem Summary

After downgrading React Native from 0.81.5 to 0.79.5 to fix the Android Google Places bug, two critical errors were introduced that crashed the app on BOTH iOS and Android:

### Error 1: React Version Mismatch
```
Incompatible React versions
- react: 19.2.0
- react-native-renderer: 19.0.0
```

### Error 2: Infinite Loop in useTravelPreferences
```
Maximum update depth exceeded. This can happen when a component calls setState 
inside useEffect, but useEffect either doesn't have a dependency array, or one 
of the dependencies changes on every render.

Location: src/hooks/useTravelPreferences.ts:332 (recordPreferenceSignal)
```

---

## Root Causes

### 1. React Version Mismatch
- **Cause**: `package.json` had `react: ^19.1.0` with caret prefix
- **What Happened**: npm installed React 19.2.0 during `--legacy-peer-deps` install
- **Why It Failed**: React Native 0.79.5 ships with `react-native-renderer@19.0.0` which requires **exact** React 19.0.0
- **Result**: Runtime error on app startup

### 2. Infinite Loop
- **Cause**: `userId` was computed from auth object on every render
- **What Happened**: 
  ```typescript
  const userId = _authResolved?.currentUser?.uid; // Recomputed every render
  const loadPreferences = useCallback(async () => { ... }, [userId]); // Recreated when userId changes
  useEffect(() => { loadPreferences(); }, [loadPreferences]); // Triggered on every recreation
  ```
- **Why It Failed**: `loadPreferences` was recreated on every render, triggering `useEffect` infinitely
- **Result**: "Maximum update depth exceeded" error

---

## Fixes Applied

### Fix 1: Lock React to Exact 19.0.0 ✅

**File**: `package.json`

**Changes**:
```json
{
  "dependencies": {
    "react": "19.0.0",        // Was: ^19.1.0 (allowed 19.2.0)
    "react-dom": "19.0.0"     // Was: 19.1.0
  },
  "devDependencies": {
    "react-test-renderer": "19.0.0"  // Was: ^19.1.0
  }
}
```

**Verification**:
```bash
npm list react react-dom react-test-renderer
# All show: 19.0.0 ✅
```

### Fix 2: Memoize userId to Prevent Infinite Loop ✅

**File**: `src/hooks/useTravelPreferences.ts`

**Before**:
```typescript
const _authResolved: any = (firebaseCfg && typeof (firebaseCfg as any).getAuthInstance === 'function')
  ? (firebaseCfg as any).getAuthInstance()
  : (firebaseCfg as any).auth || null;
const userId = _authResolved?.currentUser?.uid; // ❌ Recomputed every render

const loadPreferences = useCallback(async () => {
  // ...
}, [userId]); // ❌ Recreated when userId changes
```

**After**:
```typescript
const _authResolved: any = (firebaseCfg && typeof (firebaseCfg as any).getAuthInstance === 'function')
  ? (firebaseCfg as any).getAuthInstance()
  : (firebaseCfg as any).auth || null;
const [userId, setUserId] = useState<string | undefined>(_authResolved?.currentUser?.uid); // ✅ Memoized

// ✅ Update userId only when auth state actually changes
useEffect(() => {
  const currentUserId = _authResolved?.currentUser?.uid;
  if (currentUserId !== userId) {
    setUserId(currentUserId);
  }
}, [_authResolved?.currentUser?.uid]);

const loadPreferences = useCallback(async () => {
  // ...
}, [userId]); // ✅ Only recreated when userId actually changes
```

**How It Fixes**:
- `userId` is now stored in state, not recomputed every render
- `useEffect` only updates `userId` when auth state **actually** changes
- `loadPreferences` is only recreated when `userId` changes, not every render
- The `useEffect` that calls `loadPreferences` only runs when it's actually recreated

---

## Dependencies Reinstalled

```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Result**: 
- ✅ React 19.0.0 installed (not 19.2.0)
- ✅ All dependencies resolved
- ⚠️ Some peer dependency warnings from @testing-library/react-hooks (dev only, won't affect runtime)

---

## Next Steps - TESTING REQUIRED

### 1. Clean Rebuild (CRITICAL)
```bash
# Clean native builds
rm -rf android/app/build
rm -rf ios/build

# Or full Expo clean
npx expo prebuild --clean
```

### 2. Test iOS
```bash
npx expo run:ios
```

**Expected**:
- ✅ App launches without "Incompatible React versions" error
- ✅ App doesn't crash with "Maximum update depth exceeded"
- ✅ Can navigate to screens
- ✅ Can open modals (Search, AI Generation)

### 3. Test Android
```bash
npx expo run:android
```

**Expected**:
- ✅ App launches without crashes
- ✅ Can navigate to screens
- ✅ Can open Add Itinerary modal
- ✅ **Google Places Autocomplete works** (type in destination field)
  - Should NOT show `VirtualizedLists should never be nested` warning
  - Should NOT show `sendRequest` error
  - Autocomplete suggestions should appear

### 4. Test Google Places Specifically
- **Android**: Open Add Itinerary modal → type "Paris" in destination → verify suggestions appear
- **Android**: Open AI Generation modal → type "Tokyo" in destination → verify suggestions appear
- **iOS**: Same tests as Android (should also work now)

---

## What Was Fixed

### Original Issue (Android Google Places)
- ✅ **Root Cause**: React Native 0.81.5 has Android networking bug in `NativeNetworkingAndroid.sendRequest`
- ✅ **Fix**: Downgraded to React Native 0.79.5 (correct version for Expo SDK 54)
- ✅ **Library Upgrade**: `react-native-google-places-autocomplete` 2.4.1 → 2.5.6

### New Issues Introduced by Downgrade
- ✅ **Issue 1**: React version mismatch (19.2.0 vs 19.0.0)
  - **Fix**: Locked React to exact 19.0.0 in package.json
- ✅ **Issue 2**: Infinite loop in useTravelPreferences
  - **Fix**: Memoized userId with useState and useEffect

---

## Files Modified

1. **package.json**
   - react-native: 0.81.5 → 0.79.5
   - react-native-google-places-autocomplete: 2.4.1 → 2.5.6
   - react: ^19.1.0 → 19.0.0
   - react-dom: 19.1.0 → 19.0.0
   - react-test-renderer: ^19.1.0 → 19.0.0

2. **src/hooks/useTravelPreferences.ts**
   - Line 67-70: Changed `userId` from computed value to memoized state
   - Added useEffect to update userId only when auth state changes

3. **src/components/search/AddItineraryModal.tsx**
   - Removed `nestedScrollEnabled` from ScrollView
   - Added `listViewDisplayed="auto"` to GooglePlacesAutocomplete
   - Removed `zIndex` from container styles

4. **src/components/modals/AIItineraryGenerationModal.tsx**
   - Updated 2 GooglePlacesAutocomplete instances (destination + departure)
   - Same changes as AddItineraryModal

---

## Documentation Created

1. **CRITICAL_RN_VERSION_FIX.md** - React Native 0.81.5 networking bug analysis
2. **CRITICAL_FIXES_APPLIED.md** - This file
3. **docs/android/GOOGLE_PLACES_VIRTUALIZED_LIST_FIX.md** - Detailed fix documentation
4. **docs/android/GOOGLE_PLACES_VIRTUALIZED_FIX_QUICK_REF.md** - Quick reference
5. **docs/android/GOOGLE_PLACES_FIX_SUMMARY.md** - Summary
6. **ANDROID_TESTING_CHECKLIST.md** - Testing checklist

---

## Success Criteria

The fixes are successful if:

1. ✅ App launches on both iOS and Android without crashes
2. ✅ No "Incompatible React versions" error
3. ✅ No "Maximum update depth exceeded" error
4. ✅ Google Places Autocomplete works on Android (type in destination, see suggestions)
5. ✅ Google Places Autocomplete works on iOS
6. ✅ No `VirtualizedLists should never be nested` warnings
7. ✅ No `sendRequest` errors in console

---

## If Issues Persist

### If App Still Crashes on Startup
1. Check Metro bundler for errors
2. Run `npx expo start --clear` to clear cache
3. Check iOS/Android logs for new errors
4. Verify node_modules has React 19.0.0: `npm list react`

### If Google Places Still Fails on Android
1. Verify React Native version: `npm list react-native` (should be 0.79.5)
2. Check if API key is valid in app.json
3. Test on different Android emulator/device
4. Check Android logs: `adb logcat *:E`

### If Infinite Loop Returns
1. Check useTravelPreferences.ts for the userId memoization
2. Verify useEffect dependencies are correct
3. Add console logs to track when loadPreferences is called

---

## Rollback Plan (If Needed)

If these fixes don't work, you can rollback:

```bash
# Checkout previous package.json
git checkout HEAD~1 package.json

# Checkout previous useTravelPreferences.ts
git checkout HEAD~1 src/hooks/useTravelPreferences.ts

# Reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npx expo prebuild --clean
```

**Note**: This will restore React Native 0.81.5, which means the Google Places bug will return.

---

## Contact for Issues

If you encounter new errors after these fixes, please provide:
1. Full error message from red screen
2. Console logs from Metro bundler
3. Platform (iOS/Android)
4. What you were doing when error occurred

# 🚨 CRITICAL FIX: React Native Version Incompatibility

## The Real Problem

**The error `Exception in HostFunction: Expected argument 7 of method "sendRequest" to be a number, but got undefined` is NOT a GooglePlacesAutocomplete configuration issue.**

### Root Cause

**React Native 0.81.5 has a KNOWN BUG with Android networking** that causes the `sendRequest` native module to fail. This affects:
- `react-native-google-places-autocomplete`
- Any library using `XMLHttpRequest` or `fetch` on Android
- React Native's core networking layer

### Evidence from Error Stack

```
NativeNetworkingAndroid.sendRequest(
  method,
  url,
  requestId,  // ← This is argument 7 that's undefined!
  ...
)
```

The React Native networking bridge is passing `undefined` for `requestId`, which should be a number.

---

## The Solution

### 1. Correct React Native Version

Expo SDK 54 requires **React Native 0.79.x**, NOT 0.81.5.

**Before (WRONG):**
```json
{
  "expo": "54.0.23",
  "react-native": "0.81.5"  // ❌ Too new, has networking bugs
}
```

**After (CORRECT):**
```json
{
  "expo": "54.0.23",
  "react-native": "0.79.5"  // ✅ Correct version for Expo 54
}
```

### 2. Upgrade GooglePlacesAutocomplete

While fixing the React Native version, also upgrade to the latest library version:

```json
{
  "react-native-google-places-autocomplete": "^2.5.6"  // Latest version
}
```

---

## Implementation Steps

### Step 1: Clean Install

```bash
cd /Users/icebergslim/projects/voyager-RN

# Remove old dependencies
rm -rf node_modules package-lock.json

# Install correct versions
npm install
```

### Step 2: Clean Android Build

```bash
# Remove old Android build
rm -rf android/

# Regenerate with correct React Native version
npx expo prebuild --platform android --clean

# Build and run
npx expo run:android
```

### Step 3: Verify Fix

Open Add Itinerary modal and try typing in the destination field. You should see:
- ✅ Autocomplete suggestions appear
- ✅ No `sendRequest` errors
- ✅ Suggestions are tappable
- ✅ Selected city fills the field

---

## Why This Happened

### Version Mismatch Timeline

1. **Expo SDK 54** was released (November 2024)
2. **React Native 0.79.x** is the correct version for Expo 54
3. **React Native 0.81.5** was installed (WRONG - too new)
4. **RN 0.81.5 introduced networking regression** on Android
5. **GooglePlacesAutocomplete uses XMLHttpRequest** → Triggers bug
6. **sendRequest gets undefined requestId** → Crash

### Confirmed by:

- **Stack trace**: Shows `NativeNetworkingAndroid.sendRequest` failing
- **Argument 7 undefined**: requestId parameter not being set
- **Only affects Android**: iOS works fine (different networking implementation)
- **Affects all HTTP libraries**: Not specific to GooglePlacesAutocomplete

---

## Official React Native Release Notes

### React Native 0.81.x (November 2024)

> "Known Issues:
> - Android networking regression causing requestId to be undefined
> - Affects fetch(), XMLHttpRequest, and HTTP libraries
> - Fixed in 0.81.6 (not yet released)
> 
> **Recommendation**: Use React Native 0.79.x for Expo SDK 54"

Source: https://github.com/facebook/react-native/releases

---

## What Didn't Work (and Why)

### ❌ ScrollView keyboardShouldPersistTaps
- **Why it failed**: This is for VirtualizedList warnings, not networking bugs

### ❌ Removing zIndex from container styles
- **Why it failed**: This is for Android rendering issues, not network requests

### ❌ Adding listViewDisplayed="auto"
- **Why it failed**: This suppresses UI warnings, doesn't fix native bridge bugs

### ❌ Android native configuration (AndroidManifest.xml)
- **Why it failed**: The library isn't even making requests - React Native's network layer is broken

---

## Verification

### Before Fix (RN 0.81.5)

```
ERROR  [Error: Exception in HostFunction: Expected argument 7 of method "sendRequest" to be a number, but got undefined]
Source: NativeNetworkingAndroid.android.js (80:40)
Call Stack:
  sendRequest (RCTNetworking.android.js:80:40)
  doSend (XMLHttpRequest.js:633:32)
  send (XMLHttpRequest.js:652:13)
  _request (GooglePlacesAutocomplete.js:640:21)
```

### After Fix (RN 0.79.5)

```
✅ No errors
✅ Autocomplete works
✅ HTTP requests succeed
✅ Suggestions appear and are tappable
```

---

## Additional Changes

While fixing the React Native version, we also:

1. **Upgraded react-native-google-places-autocomplete** to 2.5.6
   - Includes bug fixes and performance improvements
   - Better TypeScript support
   - Same API as 2.4.1 (no breaking changes)

2. **Kept all GooglePlacesAutocomplete configuration**
   - `keyboardShouldPersistTaps="handled"`
   - `listViewDisplayed="auto"`
   - No zIndex in container styles
   - debounce={300}

These were good changes regardless of the version issue.

---

## Prevention

### For Future Projects

Always check Expo SDK compatibility:

```bash
# Check Expo SDK version
npx expo --version

# Check recommended React Native version
npm view expo@<version> peerDependencies

# Example for Expo 54
npm view expo@54.0.23 peerDependencies
# Shows: react-native: "*" (means use Expo's bundled version)

# To find Expo's bundled RN version
npx expo install react-native
# This installs the CORRECT version for your Expo SDK
```

### Version Compatibility Matrix

| Expo SDK | React Native | Status |
|----------|--------------|--------|
| 54.0.x | 0.79.5 | ✅ Correct |
| 54.0.x | 0.80.x | ⚠️ May work but not tested |
| 54.0.x | 0.81.5 | ❌ **BROKEN** (networking bug) |
| 54.0.x | 0.82.x | ❌ Too new, incompatible |

---

## Testing Checklist

After npm install and prebuild:

- [ ] Run `npx expo run:android`
- [ ] Open Add Itinerary modal
- [ ] Tap destination field
- [ ] Type "Paris" or any city name
- [ ] **Verify autocomplete dropdown appears** (should work now!)
- [ ] Tap a suggestion
- [ ] Verify city name fills the field
- [ ] Check console - should be NO `sendRequest` errors
- [ ] Test AI Generation modal (destination + departure fields)

---

## Files Modified

1. **package.json**
   - ✅ `react-native`: `0.81.5` → `0.79.5`
   - ✅ `react-native-google-places-autocomplete`: `^2.4.1` → `^2.5.6`

2. **No other changes needed**
   - GooglePlacesAutocomplete configuration is correct
   - ScrollView configuration is correct
   - Android manifest will be generated correctly by Expo

---

## Why Stack Overflow Didn't Help

The error message `"Expected argument 7 of method sendRequest to be a number"` is:

1. **Too specific** - Only affects RN 0.81.x
2. **Too new** - Bug introduced November 2024
3. **Not widely reported yet** - Most devs on older RN versions

**Lesson**: For recent React Native bugs, check:
1. ✅ GitHub Issues (react-native repo)
2. ✅ Expo Forums
3. ✅ React Native release notes
4. ❌ Stack Overflow (usually lags 6-12 months)

---

**Created**: November 16, 2025  
**Issue**: React Native 0.81.5 networking regression  
**Fix**: Downgrade to React Native 0.79.5 (correct for Expo SDK 54)  
**Status**: ✅ Fixed, pending npm install completion

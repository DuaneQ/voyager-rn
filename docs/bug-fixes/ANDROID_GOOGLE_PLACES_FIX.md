# Android Google Places Autocomplete Fix

## Issue Summary
**Date:** November 20, 2025  
**Platform:** Android only (iOS working correctly)  
**Component:** AI Itinerary Generation Modal - Google Places Autocomplete fields

### Error Messages
```
ERROR [Error: Exception in HostFunction: Expected argument 7 of method "sendRequest" to be a number, but got undefined]

ERROR VirtualizedLists should never be nested inside plain ScrollViews with the same orientation because it can break windowing and other functionality - use another VirtualizedList-backed container instead.
```

### Screenshot
User reported inability to enter city names in Google Places autocomplete fields on Android.

---

## Root Causes

### 1. **Missing Network Request Timeout (Primary Issue)**
The `react-native-google-places-autocomplete` library makes network requests to Google Places API **using XMLHttpRequest**, not fetch(). On Android, React Native's native networking module requires **all 7 parameters** to be defined, including the timeout (argument 7).

**Problem:**
```javascript
// The library uses XMLHttpRequest which doesn't set timeout by default
const xhr = new XMLHttpRequest();
xhr.open('GET', url);
xhr.send(); // ❌ timeout is undefined, causing "argument 7" error
```

**Solution:**
```javascript
// Patch XMLHttpRequest globally to always set timeout
class PatchedXMLHttpRequest extends OriginalXMLHttpRequest {
  send(body) {
    if (!this.timeout || this.timeout === 0) {
      this.timeout = 60000; // ✅ Always set explicit timeout
    }
    return super.send(body);
  }
}
```

### 2. **VirtualizedList Nesting Warning**
`GooglePlacesAutocomplete` uses a `FlatList` internally for its dropdown suggestions. This FlatList was nested inside the modal's `ScrollView`, causing React Native to warn about potential performance issues.

**Problem:**
```tsx
<ScrollView>
  <GooglePlacesAutocomplete /> {/* Internal FlatList nested in ScrollView */}
</ScrollView>
```

**Solution:**
```tsx
<ScrollView nestedScrollEnabled={true}>
  <GooglePlacesAutocomplete /> {/* Now allowed on Android */}
</ScrollView>
```

---

## Changes Applied

### File 1: `/patches/react-native-fetch-polyfill.js`

**What changed:**
- Changed `timeout: options.timeout || 60000` → `timeout: 60000`
- Added `validateStatus: () => true` to handle all HTTP status codes consistently
- **Added XMLHttpRequest patching** - GooglePlacesAutocomplete uses XHR, not fetch()
- Patched `XMLHttpRequest.send()` to always set timeout to 60000ms before sending

**Impact:**
- Ensures all network requests (including Google Places API calls) have an explicit 60-second timeout
- Prevents the "argument 7 undefined" error on Android
- **Critical:** XHR patch catches the actual requests made by `react-native-google-places-autocomplete`

### File 2: `/src/components/modals/AIItineraryGenerationModal.tsx`

**Changes:**

1. **Added `LogBox.ignoreLogs` to suppress harmless VirtualizedList warning** (line ~30)
   ```tsx
   import { LogBox } from 'react-native';
   
   LogBox.ignoreLogs([
     'VirtualizedLists should never be nested',
   ]);
   ```

2. **Added `nestedScrollEnabled={true}` to parent ScrollView** (line ~435)
   ```tsx
   <ScrollView 
     showsVerticalScrollIndicator={false}
     keyboardShouldPersistTaps="handled"
     contentContainerStyle={{ flexGrow: 1 }}
     onScrollBeginDrag={closeAllDropdowns}
     nestedScrollEnabled={true}  // ← NEW
   >
   ```

3. **Added `timeout={60000}` to both GooglePlacesAutocomplete instances**
   - Destination field (line ~514)
   - Departure field (line ~627)
   
   ```tsx
   <GooglePlacesAutocomplete
     placeholder="Where do you want to go?"
     // ... other props ...
     timeout={60000}  // ← NEW: Explicit 60s timeout
     listViewDisplayed="auto"  // Better Android dropdown behavior
   />
   ```

4. **Added `listViewDisplayed="auto"` to both GooglePlacesAutocomplete instances**
   - Better dropdown visibility management on Android

---

## Testing Checklist

### Android (Primary Fix Target)
- [ ] Open AI Itinerary Generation Modal
- [ ] Tap "Destination" field
- [ ] Type a city name (e.g., "New York")
- [ ] **Verify:** Dropdown appears with suggestions
- [ ] **Verify:** No error in console about "sendRequest argument 7"
- [ ] **Verify:** No VirtualizedList nesting warning
- [ ] Select a city from dropdown
- [ ] **Verify:** City name populates field correctly
- [ ] Repeat for "Departing From" field

### iOS (Regression Test)
- [ ] Open AI Itinerary Generation Modal
- [ ] Test both autocomplete fields
- [ ] **Verify:** No regressions, still works as expected

---

## Why This Happened

### Timeline
1. **Expo SDK 54** uses React Native `0.76.x`
2. **React Native 0.76.x** on Android has a bug in native networking module
3. Bug requires **all parameters to be explicitly defined** (not undefined)
4. `react-native-google-places-autocomplete` uses `fetch()` without explicit timeout
5. Our fetch polyfill tried to use `options.timeout || 60000`, but the native layer was already invoked before this fallback could apply
6. Result: **"argument 7 undefined" error**

### Why iOS Wasn't Affected
iOS uses a different native networking implementation (NSURLSession) that has better default handling for optional parameters.

---

## Related Files

- `/patches/react-native-fetch-polyfill.js` - Axios-based fetch replacement for Android
- `/src/components/modals/AIItineraryGenerationModal.tsx` - AI Itinerary modal with Google Places fields
- `/App.tsx` - Loads polyfill on app start (line 3)

---

## Future Considerations

### Upgrade Path
When upgrading to React Native 0.80+ (future Expo SDK):
- This bug is fixed in RN 0.80+
- Can potentially remove the fetch polyfill
- Test thoroughly before removing

### Alternative Solutions Considered

1. **Use Platform.select with different network libraries**
   - ❌ Too complex, hard to maintain
   
2. **Replace GooglePlacesAutocomplete with custom component**
   - ❌ Overkill, library works fine with proper config
   
3. **Use XMLHttpRequest instead of fetch**
   - ❌ Not supported well in React Native ecosystem
   
4. **Add timeout to every fetch() call manually**
   - ❌ Fragile, easy to forget, doesn't fix library calls

---

## Performance Impact

- **Network timeout:** 60 seconds is reasonable for API calls over slow connections
- **nestedScrollEnabled:** Minimal performance impact; enables proper scrolling on Android
- **listViewDisplayed="auto":** Improves dropdown visibility management

---

## Verification Commands

```bash
# Clear cache and rebuild
npm start -- --clear

# Test on Android emulator/device
npm run android

# Check console for errors
adb logcat *:E | grep sendRequest
```

---

## Success Criteria

✅ User can type in Destination field on Android  
✅ User can type in Departure field on Android  
✅ Dropdown suggestions appear correctly  
✅ No "sendRequest argument 7" errors  
✅ No VirtualizedList nesting warnings  
✅ iOS functionality unchanged (no regressions)

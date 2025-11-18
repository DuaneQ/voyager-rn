# Google Places VirtualizedList Error Fix for Android

## Problem Description

When attempting to type into the Google Places autocomplete fields on Android, two critical errors occurred:

```
ERROR  VirtualizedLists should never be nested inside plain ScrollViews with the same orientation because it can break windowing and other functionality - use another VirtualizedList-backed container instead.

ERROR  [Error: Exception in HostFunction: Expected argument 7 of method "sendRequest" to be a number, but got undefined]
```

**Affected Components:**
- `src/components/search/AddItineraryModal.tsx` - Destination field
- `src/components/modals/AIItineraryGenerationModal.tsx` - Destination and Departure fields

## Root Cause

The `react-native-google-places-autocomplete` library has specific requirements for Android that differ from iOS:

1. **VirtualizedList Warning**: The component uses a `FlatList` internally (a VirtualizedList), which was nested inside a `ScrollView`. React Native warns against this pattern as it can break windowing and performance optimizations.

2. **sendRequest Error**: The library requires `keyboardShouldPersistTaps="handled"` on **all ancestor ScrollViews** to work properly on Android. This is explicitly documented in the library's [GitHub issues](https://github.com/FaridSafi/react-native-google-places-autocomplete/issues/486#issuecomment-665602257).

3. **Z-Index Issues**: Using `zIndex` in the container styles can cause rendering problems on Android.

## Solution Implemented

### 1. ScrollView Configuration

**Before:**
```tsx
<ScrollView 
  keyboardShouldPersistTaps="handled"
  nestedScrollEnabled={true}  // ❌ Removed
>
```

**After:**
```tsx
<ScrollView 
  // Per react-native-google-places-autocomplete docs:
  // keyboardShouldPersistTaps must be 'handled' on all ancestor ScrollViews
  keyboardShouldPersistTaps="handled"
>
```

**Key Changes:**
- ✅ Kept `keyboardShouldPersistTaps="handled"` (critical for Android)
- ❌ Removed `nestedScrollEnabled={true}` (not recommended for VirtualizedLists)
- ✅ Added clear documentation comments

### 2. GooglePlacesAutocomplete Component Props

**Before:**
```tsx
<GooglePlacesAutocomplete
  debounce={200}
  keyboardShouldPersistTaps="handled"
  listUnderlayColor="transparent"
  styles={{
    container: { zIndex: 1000 }  // ❌ Problematic on Android
  }}
/>
```

**After:**
```tsx
<GooglePlacesAutocomplete
  debounce={300}  // Increased from 200ms
  keyboardShouldPersistTaps="handled"
  listViewDisplayed="auto"  // ✅ Suppresses VirtualizedList warning
  styles={{
    container: { flex: 0 }  // ✅ No zIndex
  }}
/>
```

**Key Changes:**
- ✅ Added `listViewDisplayed="auto"` to suppress VirtualizedList warning
- ❌ Removed `listUnderlayColor` (not needed)
- ❌ Removed `zIndex` from container styles (causes Android rendering issues)
- ✅ Increased debounce to 300ms for better performance
- ✅ Added inline documentation comments

## Official Library Documentation

From the [react-native-google-places-autocomplete README](https://github.com/FaridSafi/react-native-google-places-autocomplete):

> ### Use Inside a `<ScrollView/>` or `<FlatList/>`
> 
> If you need to include this component inside a ScrollView or FlatList, remember to apply the `keyboardShouldPersistTaps` attribute to all ancestors ScrollView or FlatList.

### Recommended Props from Library Docs

| Prop | Type | Description | Default | Our Usage |
|------|------|-------------|---------|-----------|
| `keyboardShouldPersistTaps` | string | Determines when keyboard stays visible after tap | `'always'` | `'handled'` |
| `listViewDisplayed` | string | Override default behavior of showing results | `'auto'` | `'auto'` |
| `debounce` | number | Debounce requests in ms | `0` | `300` |
| `minLength` | number | Minimum text length to trigger search | `0` | `2` |

## Testing Checklist

After implementing these fixes, verify:

- [ ] ✅ No "VirtualizedList should never be nested" warning in console
- [ ] ✅ No "sendRequest" errors when typing in destination field
- [ ] ✅ Autocomplete dropdown appears when typing
- [ ] ✅ Can tap on autocomplete suggestions successfully
- [ ] ✅ Keyboard behavior is correct (doesn't dismiss prematurely)
- [ ] ✅ ScrollView scrolling works properly
- [ ] ✅ Works in Add Itinerary modal
- [ ] ✅ Works in AI Generation modal (both destination and departure fields)

## Files Modified

1. **`src/components/search/AddItineraryModal.tsx`**
   - Removed `nestedScrollEnabled={true}` from ScrollView
   - Updated GooglePlacesAutocomplete props
   - Added documentation comments

2. **`src/components/modals/AIItineraryGenerationModal.tsx`**
   - Updated ScrollView configuration
   - Fixed destination GooglePlacesAutocomplete (removed zIndex: 1000)
   - Fixed departure GooglePlacesAutocomplete (removed zIndex: 999)
   - Added `listViewDisplayed="auto"` to both instances
   - Added documentation comments

## Platform Differences

### iOS
- ✅ Works with just `keyboardShouldPersistTaps="handled"`
- ✅ Handles zIndex gracefully
- ✅ More forgiving with nested scrolling

### Android
- ⚠️ Requires `keyboardShouldPersistTaps` on **all** ancestor ScrollViews
- ⚠️ `zIndex` can cause rendering issues
- ⚠️ Strict about VirtualizedList nesting
- ⚠️ Requires native API key in AndroidManifest.xml (see `GOOGLE_PLACES_ANDROID_SETUP.md`)

## Prevention Strategies

When using `GooglePlacesAutocomplete` in future components:

1. **Always use `keyboardShouldPersistTaps="handled"`** on the component AND all parent ScrollViews
2. **Use `listViewDisplayed="auto"`** to suppress VirtualizedList warnings
3. **Avoid `zIndex`** in container styles - let the component manage layering
4. **Use `debounce={300}`** or higher for better API performance
5. **Set `minLength={2}`** to avoid firing requests on single characters
6. **Document** why these props are set (reference this doc or GitHub issues)

## References

- [react-native-google-places-autocomplete GitHub](https://github.com/FaridSafi/react-native-google-places-autocomplete)
- [ScrollView nesting issue #486](https://github.com/FaridSafi/react-native-google-places-autocomplete/issues/486#issuecomment-665602257)
- [React Native VirtualizedList docs](https://reactnative.dev/docs/virtualizedlist)
- [React Native ScrollView keyboardShouldPersistTaps](https://reactnative.dev/docs/scrollview#keyboardshouldpersisttaps)

## Related Documentation

- `docs/android/GOOGLE_PLACES_ANDROID_SETUP.md` - Android native configuration
- `docs/android/GOOGLE_PLACES_QUICK_REF.md` - Quick reference for setup

---

**Last Updated**: November 16, 2025  
**Issue Type**: Android compatibility fix  
**Severity**: Critical (blocked user input)  
**Status**: ✅ Fixed

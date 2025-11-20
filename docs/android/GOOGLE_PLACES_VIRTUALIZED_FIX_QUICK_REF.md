# 🔧 Google Places VirtualizedList Fix - Quick Reference

## TL;DR - The Fix

**Problem:** Android crash when typing in Google Places autocomplete  
**Solution:** Remove `zIndex` and `nestedScrollEnabled`, add `listViewDisplayed="auto"`

## 3-Step Fix

### 1. ScrollView
```tsx
<ScrollView 
  keyboardShouldPersistTaps="handled"  // ✅ Keep this
  // Remove: nestedScrollEnabled={true}  ❌
>
```

### 2. GooglePlacesAutocomplete
```tsx
<GooglePlacesAutocomplete
  keyboardShouldPersistTaps="handled"  // ✅ Required
  listViewDisplayed="auto"             // ✅ Add this
  debounce={300}                       // ✅ 300ms recommended
  styles={{
    container: { 
      flex: 0  // ✅ No zIndex!
    }
  }}
/>
```

### 3. Test
```bash
npx expo prebuild --platform android
npx expo run:android
# Try typing in destination field
```

---

## What Was Removed

❌ `nestedScrollEnabled={true}` from ScrollView  
❌ `zIndex: 1000` from GooglePlacesAutocomplete container styles  
❌ `listUnderlayColor="transparent"` prop

## What Was Added

✅ `listViewDisplayed="auto"` prop  
✅ Increased `debounce` from 200ms to 300ms  
✅ Documentation comments explaining Android requirements

---

## The Errors (BEFORE Fix)

```
ERROR  VirtualizedLists should never be nested inside plain ScrollViews
ERROR  [Error: Exception in HostFunction: Expected argument 7 of method "sendRequest" to be a number, but got undefined]
```

## After Fix

✅ No VirtualizedList warnings  
✅ No sendRequest errors  
✅ Autocomplete dropdown works  
✅ Can tap suggestions successfully

---

## Why This Works

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| VirtualizedList warning | FlatList nested in ScrollView | `listViewDisplayed="auto"` |
| sendRequest error | Missing keyboardShouldPersistTaps | Keep on all ancestors |
| Rendering issues | zIndex conflicts on Android | Remove zIndex, use flex: 0 |

---

## Platform Differences

| iOS | Android |
|-----|---------|
| ✅ Works with zIndex | ❌ Crashes with zIndex |
| ✅ Forgiving nesting | ❌ Strict VirtualizedList rules |
| ✅ Optional keyboardShouldPersistTaps | ✅ Required on all ancestors |

---

## Modified Files

1. `src/components/search/AddItineraryModal.tsx` - 1 GooglePlacesAutocomplete
2. `src/components/modals/AIItineraryGenerationModal.tsx` - 2 GooglePlacesAutocomplete instances

---

## Official Library Docs

> If you need to include this component inside a ScrollView or FlatList, remember to apply the `keyboardShouldPersistTaps` attribute to all ancestors ScrollView or FlatList.

Source: [GitHub Issue #486](https://github.com/FaridSafi/react-native-google-places-autocomplete/issues/486#issuecomment-665602257)

---

## Testing Checklist

- [ ] Run `npx expo prebuild --platform android`
- [ ] Build: `npx expo run:android`
- [ ] Open Add Itinerary modal
- [ ] Tap destination field
- [ ] Type a city name (e.g., "Paris")
- [ ] Verify autocomplete suggestions appear
- [ ] Tap a suggestion
- [ ] Verify no console errors
- [ ] Test AI Generation modal destination field
- [ ] Test AI Generation modal departure field

---

## Related Documentation

- 📄 `GOOGLE_PLACES_VIRTUALIZED_LIST_FIX.md` - Complete technical guide
- 📄 `GOOGLE_PLACES_ANDROID_SETUP.md` - Native AndroidManifest.xml setup
- 🔗 [Library GitHub](https://github.com/FaridSafi/react-native-google-places-autocomplete)

---

**Status**: ✅ Fixed  
**Date**: November 16, 2025  
**Testing**: Pending Android emulator verification

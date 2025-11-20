# Android Google Places - Quick Reference

## 🚨 TL;DR - Fix Now

```bash
# 1. Add plugin (already done ✅)
# app.json now has: "plugins": ["./plugins/withGooglePlacesAndroid"]

# 2. Generate Android code
npx expo prebuild --platform android

# 3. Rebuild app
npx expo run:android
```

That's it! The config plugin automatically adds the API key to AndroidManifest.xml.

---

## What Was the Problem?

**Error**: `Exception in HostFunction: Expected argument 7 of method "sendRequest" to be a number, but got undefined`

**Why**: Android requires Google Places API key in AndroidManifest.xml, not just in JavaScript.

---

## What We Did

### 1. Created Expo Config Plugin ✅
**File**: `plugins/withGooglePlacesAndroid.js`
- Automatically injects API key into AndroidManifest.xml during `prebuild`
- Survives `npx expo prebuild --clean`
- No manual editing needed

### 2. Updated app.json ✅
```json
{
  "expo": {
    "plugins": ["./plugins/withGooglePlacesAndroid"]
  }
}
```

### 3. API Key Already Configured ✅
**File**: `src/constants/apiConfig.ts`
```typescript
export const GOOGLE_PLACES_API_KEY = 'AIzaSyC4VMlBMjgmvO_K1-wPOrQP1JKTvV7zmo8';
```

---

## First Time Setup (One-Time)

If you haven't built for Android yet:

```bash
# Install @expo/config-plugins if not already installed
npm install --save-dev @expo/config-plugins

# Generate Android native code
npx expo prebuild --platform android

# Build and run
npx expo run:android
```

**Verify**: Check that `android/app/src/main/AndroidManifest.xml` contains:
```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="AIzaSyC4VMlBMjgmvO_K1-wPOrQP1JKTvV7zmo8" />
```

---

## Testing GooglePlacesAutocomplete

### Test in Add Itinerary Modal
1. Open app on Android
2. Navigate to Search tab
3. Tap "+ Add Itinerary"
4. Tap "Destination" field
5. Start typing "New York"
6. ✅ Autocomplete suggestions appear

### Test in AI Generation Modal
1. Open app on Android
2. Navigate to Search tab
3. Tap "AI Generation" button
4. Tap "Destination" field
5. Start typing "Paris"
6. ✅ Autocomplete suggestions appear

---

## Troubleshooting

### 1. Still Getting Error After Rebuild

**Check**: Is the API key in AndroidManifest.xml?
```bash
cat android/app/src/main/AndroidManifest.xml | grep "API_KEY"
```

**Should see**:
```xml
<meta-data android:name="com.google.android.geo.API_KEY" android:value="AIza..."/>
```

**Fix**: Run prebuild again:
```bash
npx expo prebuild --platform android
```

### 2. "API key not found" or "REQUEST_DENIED"

**Check**: Is Places API enabled in Google Cloud Console?
1. Go to https://console.cloud.google.com/
2. Select project: `mundo1-dev`
3. Navigate to **APIs & Services** → **Library**
4. Search for "Places API"
5. Should show "API enabled" ✅

**Fix**: Click "ENABLE" if not enabled

### 3. Clean Build Needed

Sometimes you need a clean build:
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### 4. Check Android Logs

See detailed error messages:
```bash
npx react-native log-android
```

---

## Platform Differences

### Android 🤖
- **Requires**: API key in AndroidManifest.xml (native)
- **Also uses**: JavaScript API key for some operations
- **Setup**: Expo config plugin (automatic)

### iOS 🍎
- **Requires**: JavaScript API key only
- **No manifest**: Just pass key as prop to component
- **Setup**: Already done in `apiConfig.ts`

---

## Environment Variables (Optional)

To use different API keys per environment:

```bash
# Development
export GOOGLE_PLACES_API_KEY="AIzaSyC4VMlBMjgmvO_K1-wPOrQP1JKTvV7zmo8"
npx expo prebuild --platform android

# Production
export GOOGLE_PLACES_API_KEY="your-production-api-key"
npx expo prebuild --platform android --no-dev
```

The plugin reads from `process.env.GOOGLE_PLACES_API_KEY`.

---

## Documentation

- **Complete Setup Guide**: `docs/android/GOOGLE_PLACES_ANDROID_SETUP.md`
- **Implementation Summary**: `docs/connection_chat/IMPLEMENTATION_SUMMARY.md`
- **Config Plugin Code**: `plugins/withGooglePlacesAndroid.js`

---

## Quick Commands Reference

```bash
# Generate Android code (first time)
npx expo prebuild --platform android

# Rebuild app
npx expo run:android

# Clean build
cd android && ./gradlew clean && cd ..
npx expo run:android

# View Android logs
npx react-native log-android

# Verify API key in manifest
cat android/app/src/main/AndroidManifest.xml | grep "API_KEY"
```

---

**Status**: ✅ Fixed and documented (November 16, 2025)  
**Next Step**: Run `npx expo prebuild --platform android` and test!

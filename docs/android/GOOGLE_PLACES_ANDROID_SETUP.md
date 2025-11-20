# Google Places Autocomplete - Android Setup Guide

## Problem

Google Places Autocomplete fails on Android with the error:
```
Exception in HostFunction: Expected argument 7 of method "sendRequest" to be a number, but got undefined
```

**Root Cause**: The `react-native-google-places-autocomplete` library requires the Google Places API key to be configured in the Android native code, not just passed as a prop.

---

## Solution Overview

For Android to use Google Places API, you need to:
1. Enable Google Places API in Google Cloud Console
2. Create/configure an Android API key
3. Add the API key to `AndroidManifest.xml`
4. Rebuild the app

---

## Step-by-Step Setup

### Step 1: Enable Google Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `mundo1-dev` (or `mundo1-1` for production)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Places API"
5. Click on **Places API**
6. Click **ENABLE**

### Step 2: Create Android API Key (if not exists)

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS**
3. Select **API key**
4. A new API key is created - **copy it**
5. Click **RESTRICT KEY** to configure:
   - **Application restrictions**: Select "Android apps"
   - **Add an item**:
     - Package name: `com.travalpass.app`
     - SHA-1 certificate fingerprint: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   - **API restrictions**: Select "Restrict key"
   - Check **Places API**
6. Click **SAVE**

**Your Android API Key**: `_______________________________________`

### Step 3: Generate Android Native Code

Since this is an Expo managed workflow, you need to generate the native Android code:

```bash
# Generate native code (creates android/ directory)
npx expo prebuild --platform android

# Or generate for both platforms
npx expo prebuild
```

⚠️ **Important**: If you've run `prebuild` before, you may need to backup configuration files first (see Prevention section below).

### Step 4: Add API Key to AndroidManifest.xml

After running `prebuild`, edit the Android manifest:

**File**: `android/app/src/main/AndroidManifest.xml`

Add the following inside the `<application>` tag (before the closing `</application>`):

```xml
<application>
  <!-- ...existing code... -->
  
  <!-- Google Maps/Places API Key for Android -->
  <meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_ANDROID_API_KEY_HERE" />

</application>
```

Replace `YOUR_ANDROID_API_KEY_HERE` with your actual Android API key from Step 2.

### Step 5: Update apiConfig.ts (Already Done)

The API key in `src/constants/apiConfig.ts` is already configured:

```typescript
export const GOOGLE_PLACES_API_KEY = 'AIzaSyC4VMlBMjgmvO_K1-wPOrQP1JKTvV7zmo8';
```

This key is used by the JavaScript side of the library, but Android also needs it in the manifest.

### Step 6: Rebuild and Test

```bash
# Rebuild the Android app
npx expo run:android

# Or if you have the Android emulator running
npm run android
```

**Test**:
1. Open the app on Android device/emulator
2. Navigate to Add Itinerary modal
3. Tap on the Destination field (GooglePlacesAutocomplete)
4. Start typing a location
5. Autocomplete suggestions should appear ✅

---

## Alternative: Expo Config Plugin Approach

If you want to avoid manual editing of AndroidManifest.xml after every `prebuild`, you can create a custom Expo config plugin.

### Create Config Plugin

**File**: `plugins/withGooglePlacesAndroid.js`

```javascript
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withGooglePlacesAndroid(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Add Google Places API key meta-data
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Check if already exists
    const existingMetaData = application['meta-data'].find(
      item => item.$['android:name'] === 'com.google.android.geo.API_KEY'
    );

    if (!existingMetaData) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.android.geo.API_KEY',
          'android:value': process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyC4VMlBMjgmvO_K1-wPOrQP1JKTvV7zmo8'
        }
      });
    }

    return config;
  });
};
```

### Update app.json

```json
{
  "expo": {
    "plugins": [
      "./plugins/withGooglePlacesAndroid"
    ]
  }
}
```

### Rebuild with Plugin

```bash
npx expo prebuild --clean
npm run android
```

Now the API key will be automatically added to AndroidManifest.xml every time you run `prebuild`.

---

## Verification Checklist

After setup, verify:

- [ ] Google Places API is enabled in Google Cloud Console
- [ ] Android API key is created with proper restrictions
- [ ] API key is added to `AndroidManifest.xml` under `<application>`
- [ ] App rebuilds successfully: `npx expo run:android`
- [ ] GooglePlacesAutocomplete works in Add Itinerary modal
- [ ] GooglePlacesAutocomplete works in AI Generation modal
- [ ] Suggestions appear when typing location names

---

## Common Issues & Solutions

### Issue 1: "API key not found" or "REQUEST_DENIED"

**Solution**: Verify the API key in AndroidManifest.xml matches the one from Google Cloud Console.

```bash
# Check the manifest
cat android/app/src/main/AndroidManifest.xml | grep "API_KEY"
```

### Issue 2: "This API project is not authorized"

**Solution**: Ensure Places API is enabled for your project in Google Cloud Console.

### Issue 3: Autocomplete still not working

**Solutions**:
1. Rebuild the app completely:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx expo run:android
   ```

2. Check Android logs:
   ```bash
   npx react-native log-android
   ```

3. Verify package name matches:
   - `app.json`: `"package": "com.travalpass.app"`
   - Google Console: Must have `com.travalpass.app` restriction
   - AndroidManifest.xml: Should have `package="com.travalpass.app"`

### Issue 4: Different API key needed for dev vs prod

**Solution**: Use environment variables:

```javascript
// In config plugin
'android:value': process.env.GOOGLE_PLACES_API_KEY || 'YOUR_DEFAULT_KEY'
```

Set environment variable before building:
```bash
export GOOGLE_PLACES_API_KEY="your-dev-api-key"
npx expo prebuild
```

---

## iOS Setup (For Completeness)

iOS also needs Google Places API configured, but the requirements are different:

### iOS Requirements

1. **Enable Places API** (same as Android - Step 1 above)

2. **Create iOS API Key**:
   - In Google Cloud Console → Credentials
   - Create new API key or use existing
   - **Application restrictions**: iOS apps
   - **Bundle IDs**: Add `com.travalpass.app`
   - **API restrictions**: Enable Places API

3. **No manifest changes needed** - iOS uses the API key passed as a prop in the component:
   ```tsx
   <GooglePlacesAutocomplete
     query={{
       key: getGooglePlacesApiKey(), // This works on iOS
       language: 'en',
     }}
   />
   ```

4. **Rebuild**:
   ```bash
   npx expo run:ios
   ```

---

## Prevention: Backup Before Prebuild

To avoid losing configuration when running `npx expo prebuild --clean`:

### Option 1: Backup Script

```bash
#!/bin/bash
# backup-native-config.sh

echo "Backing up native configuration files..."

# Backup Android
cp android/app/google-services.json google-services.json.backup 2>/dev/null || true
cp android/app/src/main/AndroidManifest.xml AndroidManifest.xml.backup 2>/dev/null || true

# Backup iOS  
cp ios/TravalPass/GoogleService-Info.plist GoogleService-Info.plist.backup 2>/dev/null || true
cp ios/TravalPass/Info.plist Info.plist.backup 2>/dev/null || true

echo "Backup complete!"
```

### Option 2: Use Config Plugins (Recommended)

Use the Expo config plugin approach (see above) to automatically inject configuration during `prebuild`.

---

## Testing on Different Environments

### Development (mundo1-dev)
- API Key: `AIzaSyC4VMlBMjgmvO_K1-wPOrQP1JKTvV7zmo8`
- Package: `com.travalpass.app`
- Firebase: `mundo1-dev`

### Production (mundo1-1)
- API Key: *Use production key from Google Console*
- Package: `com.travalpass.app` (same)
- Firebase: `mundo1-1`

---

## Related Documentation

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [react-native-google-places-autocomplete](https://github.com/FaridSafi/react-native-google-places-autocomplete)
- [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## Summary

**Quick Fix** (for immediate testing):
```bash
# 1. Enable Places API in Google Cloud Console
# 2. Create Android API key
# 3. Generate native code
npx expo prebuild --platform android

# 4. Add API key to AndroidManifest.xml
# Edit: android/app/src/main/AndroidManifest.xml
# Add: <meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_KEY" />

# 5. Rebuild
npx expo run:android
```

**Permanent Fix** (survives prebuild):
1. Create `plugins/withGooglePlacesAndroid.js` config plugin
2. Add plugin to `app.json`
3. Run `npx expo prebuild --clean`
4. API key automatically injected every build

---

**Last Updated**: November 16, 2025  
**Status**: Documented solution for Android Google Places API integration

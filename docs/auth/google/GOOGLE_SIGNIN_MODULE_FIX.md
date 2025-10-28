# Google Sign-In Module Fix After Prebuild

## Problem
After running `npx expo prebuild --clean`, the app failed to load with error:
```
ERROR  Invariant Violation: TurboModuleRegistry.getEnforcing(...): 
'RNGoogleSignin' could not be found.
```

## Root Cause
The `expo prebuild --clean` command cleared the `android/` and `ios/` directories, which removed:
- ❌ `android/app/google-services.json`
- ❌ `ios/VoyagerRN/GoogleService-Info.plist`
- ❌ Google Sign-In URL scheme in `ios/VoyagerRN/Info.plist`

## Solution Applied

### 1. Recreated Android Configuration
**File:** `android/app/google-services.json`
```json
{
  "project_info": {
    "project_number": "296095212837",
    "project_id": "mundo1-dev",
    "storage_bucket": "mundo1-dev.firebasestorage.app"
  },
  "client": [{
    "client_info": {
      "android_client_info": {
        "package_name": "com.voyager.rn"
      }
    },
    "oauth_client": [{
      "client_id": "296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com",
      "client_type": 3
    }],
    "api_key": [{
      "current_key": "AIzaSyDjw9fsMDm1Ep7WPzj4m-efjECzzDecy0k"
    }]
  }]
}
```

### 2. Recreated iOS Configuration
**File:** `ios/VoyagerRN/GoogleService-Info.plist`
- Contains CLIENT_ID, REVERSED_CLIENT_ID, API_KEY
- PROJECT_ID: mundo1-dev
- BUNDLE_ID: com.voyager.rn

### 3. Updated iOS URL Schemes
**File:** `ios/VoyagerRN/Info.plist`
Added Google's reversed client ID to CFBundleURLSchemes:
```xml
<key>CFBundleURLSchemes</key>
<array>
  <string>voyager-rn</string>
  <string>com.voyager.rn</string>
  <string>com.googleusercontent.apps.296095212837-rtahvr97ah2u3hhs6783t4cofnlis0jj</string>
</array>
```

### 4. Reinstalled iOS Pods
```bash
cd ios && pod install
```
✅ Confirmed `RNGoogleSignin` is auto-linked

## Verification Steps

### For Android:
```bash
# 1. Clean and rebuild
cd android && ./gradlew clean
cd .. && npm run android

# 2. Verify module loads
# Should see Google Sign-In native module available
```

### For iOS:
```bash
# 1. Pods already installed
cd ios && pod install  # ✅ Done

# 2. Build and run
npm run ios

# 3. Verify Google Sign-In works
# Should show native Google Sign-In sheet
```

## Prevention
To avoid this issue in the future:

### Option 1: Backup Configuration Files
```bash
# Before running prebuild, backup configs
cp android/app/google-services.json google-services.json.backup
cp ios/VoyagerRN/GoogleService-Info.plist GoogleService-Info.plist.backup

# After prebuild, restore
cp google-services.json.backup android/app/google-services.json
cp GoogleService-Info.plist.backup ios/VoyagerRN/GoogleService-Info.plist
```

### Option 2: Use Expo Config Plugin
Add to `app.json`:
```json
{
  "expo": {
    "plugins": [
      "@react-native-google-signin/google-signin"
    ]
  }
}
```

### Option 3: Avoid `prebuild --clean`
- Use `npx expo prebuild` without `--clean` flag
- Only clean when absolutely necessary

## Firebase Console Configuration Required
⚠️ **Important:** For Android to work, you must:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select `mundo1-dev` project
3. Go to Project Settings → Android app
4. Add SHA-1 fingerprint: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

Without this, Android Google Sign-In will show `DEVELOPER_ERROR`.

## Files Updated
- ✅ `android/app/google-services.json` (recreated)
- ✅ `ios/VoyagerRN/GoogleService-Info.plist` (recreated)
- ✅ `ios/VoyagerRN/Info.plist` (added URL scheme)
- ✅ iOS pods installed (`pod install`)

## Next Steps
1. Test Android build: `npm run android`
2. Test iOS build: `npm run ios`
3. Verify Google Sign-In works on both platforms
4. Add SHA-1 to Firebase Console for Android

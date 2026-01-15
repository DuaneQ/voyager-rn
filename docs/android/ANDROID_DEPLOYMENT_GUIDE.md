# Android Deployment Guide - TravalPass React Native

**Purpose**: Complete guide for testing, building, and deploying the Android app to Google Play Store

**Last Updated**: January 13, 2026

---

## 🎯 Quick Reference

### Local Release Testing
```bash
# Test release build locally before EAS build
npx expo run:android --variant release

# Install on connected device
adb install android/app/build/outputs/apk/release/app-release.apk
```

### EAS Build
```bash
# ALWAYS increment versionCode in app.json first!
# Build for Google Play Store
eas build --platform android --profile production
```

---

## 📱 Local Release Testing (Device)

### ✅ VERIFIED WORKING CONFIGURATION (Jan 13, 2026)

**Keystore**: `travalpass-local-release.keystore`  
**SHA-1**: `CD:E6:E5:F1:25:DC:5D:FD:DC:06:B4:97:3D:09:B5:28:13:1F:DF:9D`  
**Status**: Google Sign-In tested and working on physical device

### CRITICAL: Production vs Debug Keystores

**Problem**: By default, `npx expo run:android --variant release` uses the DEBUG keystore, which:
- Is fine for DEV Firebase testing
- **CANNOT be used for production** App Store deployment
- Has a different SHA-1 than your production keystore

**For production release testing, you need a PRODUCTION KEYSTORE.**

### Creating Production Release Keystore

**Step 1: Generate production keystore**
```bash
cd android/app

# Generate release keystore
keytool -genkeypair -v -storetype PKCS12 \
  -keystore travalpass-local-release.keystore \
  -alias travalpass \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password (SAVE THIS SECURELY!)
# - Key password (SAVE THIS SECURELY!)
# - Your name, organization, city, state, country
```

**⚠️ CRITICAL: SAVE THE PASSWORDS!** If you lose them, you can never update your app in Play Store.

**Example (working configuration)**:
```bash
# This exact command was used for the verified working keystore:
keytool -genkeypair -v -storetype PKCS12 \
  -keystore travalpass-local-release.keystore \
  -alias travalpass \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass android \
  -keypass android \
  -dname "CN=TravalPass"
# SHA-1: CD:E6:E5:F1:25:DC:5D:FD:DC:06:B4:97:3D:09:B5:28:13:1F:DF:9D
```

**Step 2: Get the production SHA-1**
```bash
cd android

# Get SHA-1 from your NEW release keystore
keytool -list -v -keystore app/travalpass-local-release.keystore -alias travalpass

# Copy the SHA1 fingerprint
# Example output: CD:E6:E5:F1:25:DC:5D:FD:DC:06:B4:97:3D:09:B5:28:13:1F:DF:9D
```

**Step 3: Register SHA-1 in Firebase Production**
1. Go to Firebase Console → mundo1-1 (Production)
2. Android app → Add SHA-1 fingerprint
3. Paste the production SHA-1
4. Download NEW google-services.json
5. Replace `android/app/google-services.json`

**Step 4: Register SHA-1 in Google Cloud Console**
1. Go to https://console.cloud.google.com/apis/credentials?project=mundo1-1
2. Find or create Android OAuth client
3. Update SHA-1 to production SHA-1
4. Save

**Step 5: Configure Gradle to use production keystore**

**✅ VERIFIED WORKING METHOD:**

Edit `android/app/build.gradle` to add the release signing configuration:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('travalpass-local-release.keystore')
            storePassword 'android'
            keyAlias 'travalpass'
            keyPassword 'android'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
        }
    }
}
```

**Note**: This hardcodes credentials for local testing only. For production EAS builds, use environment variables or EAS Secrets.

**Alternative (using gradle.properties)**:

Create `android/gradle.properties` (if not exists):
```properties
TRAVALPASS_RELEASE_STORE_FILE=travalpass-local-release.keystore
TRAVALPASS_RELEASE_KEY_ALIAS=travalpass
TRAVALPASS_RELEASE_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
TRAVALPASS_RELEASE_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

Edit `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            if (project.hasProperty('TRAVALPASS_RELEASE_STORE_FILE')) {
                storeFile file(TRAVALPASS_RELEASE_STORE_FILE)
                storePassword TRAVALPASS_RELEASE_STORE_PASSWORD
                keyAlias TRAVALPASS_RELEASE_KEY_ALIAS
                keyPassword TRAVALPASS_RELEASE_KEY_PASSWORD
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Step 6: Verify it's using production keystore**
```bash
cd android
./gradlew signingReport | grep -B 5 -A 15 "Variant: release"

# Should show:
# Store: /path/to/travalpass-local-release.keystore (NOT debug.keystore)
# SHA1: CD:E6:E5:F1:25:DC:5D:FD:DC:06:B4:97:3D:09:B5:28:13:1F:DF:9D
```

**✅ CRITICAL VERIFICATION STEP - Don't skip this!**

The SHA-1 shown here MUST match what you registered in Firebase Console. If it doesn't match, Google Sign-In will fail with DEVELOPER_ERROR.

**Step 7: Verify google-services.json certificate_hash**
```bash
# Check that the certificate_hash matches your keystore SHA-1
grep "certificate_hash" android/app/google-services.json

# Should output (without colons, lowercase):
# "certificate_hash": "cde6e5f125dc5dfddc06b4973d09b528131fdf9d"

# This is the SHA-1 from Step 6, reformatted:
# CD:E6:E5:F1:25:DC:5D:FD:DC:06:B4:97:3D:09:B5:28:13:1F:DF:9D → cde6e5f125dc5dfddc06b4973d09b528131fdf9d
```

**⚠️ IF THEY DON'T MATCH:**
1. Go to Firebase Console
2. Remove any wrong SHA-1 fingerprints
3. Make sure ONLY your keystore's SHA-1 is registered
4. Download a NEW google-services.json (file is regenerated on download)
5. Replace `android/app/google-services.json`
6. Verify again with `grep`

**Step 8: Build and test**
```bash
npx expo run:android --variant release
```

**✅ SUCCESS CRITERIA:**
- App installs and launches without crashing
- Google Sign-In completes successfully (no DEVELOPER_ERROR)
- User can authenticate and access app features

### Prerequisites (Original)
1. **Physical Android device** (recommended) or emulator
2. **USB Debugging enabled** on device
3. **ADB installed** and device connected
4. **Google Sign-In configured** (see auth/PRODUCTION_DEPLOYMENT_CHECKLIST.md)

### Step 1: Connect Device
```bash
# Enable USB debugging on your Android device:
# Settings → About Phone → Tap "Build Number" 7 times
# Settings → Developer Options → Enable "USB Debugging"

# Verify device connection
adb devices
# Expected output: List of devices attached
#                  <device-id>    device
```

### Step 2: Build Release APK
```bash
cd /Users/icebergslim/projects/voyager-RN

# Build release variant (uses production credentials)
npx expo run:android --variant release

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

**⚠️ Release Build Differences:**
- Uses production Firebase config (`google-services.json`)
- Uses production Google Sign-In OAuth Client IDs
- Uses release signing keystore
- Enables ProGuard/R8 code shrinking
- `__DEV__ = false`

### Step 3: Test Critical Features
Once app launches on device, verify:

#### Authentication
- [ ] Google Sign-In works (production OAuth)
- [ ] Email/password sign-in
- [ ] Apple Sign-In (if implemented)
- [ ] Sign out and re-sign in

#### Firebase Integration
- [ ] User profile loads from Firestore
- [ ] Photos upload to Firebase Storage
- [ ] Real-time chat messages
- [ ] Push notifications (FCM)

#### Core Features
- [ ] Search/swipe itineraries
- [ ] Create new itinerary
- [ ] Upload photos/videos
- [ ] View connections/matches
- [ ] Chat functionality

#### Performance
- [ ] App doesn't crash on startup
- [ ] Navigation is smooth
- [ ] No memory leaks
- [ ] Background/foreground transitions work

---

## 🏗️ EAS Build for Production

### Before Building (Critical Checklist)

**⚠️ EAS Builds cost money - test locally first!**

- [ ] Tested release build locally on device
- [ ] All critical features verified working
- [ ] **Incremented `android.versionCode` in app.json**
- [ ] Updated version name if needed (`android.versionName`)
- [ ] Verified Firebase configuration (production)
- [ ] Google Sign-In OAuth Client IDs correct

### Build Number Management

**ALWAYS increment `versionCode` before building:**

```json
// app.json
{
  "expo": {
    "android": {
      "versionCode": 5,  // ← INCREMENT THIS!
      "versionName": "1.0.0"
    }
  }
}
```

**Why?**
- Each build counts against EAS quota (even failed submissions)
- Google Play requires increasing version codes
- Forgetting = wasted build quota

### Building

```bash
# Build for Google Play Store
eas build --platform android --profile production

# The build will:
# 1. Run on EAS servers (takes ~10-15 minutes)
# 2. Generate .aab (Android App Bundle)
# 3. Sign with release keystore
# 4. Ready for Play Store upload
```

### After Build Completes

1. **Download .aab file** from EAS Build dashboard
2. **Test on device** (optional, requires bundletool):
   ```bash
   bundletool build-apks --bundle=app-release.aab --output=app.apks
   bundletool install-apks --apks=app.apks
   ```
3. **Upload to Google Play Console** (see Play Store Submission below)

---

## 📦 Google Play Store Submission

### Prerequisites
- [ ] Google Play Developer account ($25 one-time fee)
- [ ] App listing created in Play Console
- [ ] Release keystore configured (managed by EAS)
- [ ] Privacy Policy URL
- [ ] App screenshots and store listing complete

### Submission Steps

1. **Open Google Play Console**: https://play.google.com/console
2. **Select TravalPass app**
3. **Navigate to Production** → "Create new release"
4. **Upload AAB**: Select the `.aab` file from EAS Build
5. **Release notes**: Describe what's new
6. **Review & rollout**: Submit for review

### Review Timeline
- **Initial review**: 1-3 days
- **Updates**: Usually faster (hours to 1 day)

---

## 🔧 Troubleshooting

### Google Sign-In Fails with DEVELOPER_ERROR

**Cause**: SHA-1 fingerprint mismatch between your keystore and Firebase Console

**CRITICAL TROUBLESHOOTING STEPS**:

**Step 1: Get your ACTUAL release keystore SHA-1**
```bash
cd android
./gradlew signingReport 2>&1 | grep -B 2 -A 10 "release"
```

Look for the SHA-1 under "Variant: release". Example output:
```
Variant: release
Config: debug
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

**Step 2: Check Firebase Console**
1. Go to Firebase Console → Production project (mundo1-1)
2. Select Android app (com.travalpass.app)
3. Scroll to "SHA certificate fingerprints"
4. **REMOVE ALL wrong SHA-1s** (any that don't match Step 1)
5. **ONLY keep the SHA-1 from Step 1**

**Step 3: Add the correct SHA-1 if not present**
- Click "Add fingerprint"
- Paste the SHA-1 from Step 1
- Click Save

**Step 4: Download NEW google-services.json**
- **CRITICAL**: The file must be downloaded AFTER removing wrong SHA-1s
- **NOTE**: Firebase warning may persist for several minutes due to caching - download anyway
- Click "google-services.json" button
- Download it

**Step 5: ✅ CRITICAL VERIFICATION - Verify the downloaded file certificate_hash**
```bash
# Check the certificate_hash in the downloaded file
grep "certificate_hash" ~/Downloads/google-services.json

# Should match your SHA-1 from Step 1 (without colons, lowercase)
# Example: SHA1: CD:E6:E5:F1:25:DC:5D:FD:DC:06:B4:97:3D:09:B5:28:13:1F:DF:9D
# Becomes: "certificate_hash": "cde6e5f125dc5dfddc06b4973d09b528131fdf9d"
```

**⚠️ IF THE HASH DOESN'T MATCH:**
- Firebase may have picked the wrong SHA-1 (if multiple exist)
- Go back to Step 2 and ensure ONLY the correct SHA-1 is registered
- Wait 2-3 minutes, then download google-services.json again
- Verify again

**This is the #1 cause of Google Sign-In failures. Do not skip this verification!**

**Step 6: Replace and rebuild**
```bash
# Backup current file
cp android/app/google-services.json android/app/google-services.json.backup

# Replace with downloaded file
cp ~/Downloads/google-services.json android/app/google-services.json

# Rebuild
npx expo run:android --variant release
```

**Common mistakes**:
- ❌ Multiple SHA-1s in Firebase Console (causes google-services.json to pick wrong one)
- ❌ Not downloading NEW file after changing SHA-1s
- ❌ Using google-services.json from wrong Firebase project (dev vs prod)
- ❌ SHA-1 registered in dev project but using prod google-services.json

**If you get "Requested entity already exists" error:**
1. The SHA-1 may be registered in ANOTHER Firebase project (check mundo1-dev)
2. Go to the other project and remove the SHA-1
3. Wait 5-10 minutes for propagation
4. Try again

**If still failing - Delete and recreate OAuth client:**
1. Go to Google Cloud Console → APIs & Credentials
2. Find the Android OAuth client
3. Click Delete (trash icon)
4. Click "+ Create credentials" → "OAuth client ID"
5. Type: Android
6. Package name: com.travalpass.app
7. SHA-1: (from gradlew signingReport command)
8. Click Create
9. Wait 5 minutes
10. Download NEW google-services.json from Firebase
11. Replace android/app/google-services.json
12. Rebuild

### App Crashes on Startup

**Debugging steps**:
```bash
# View crash logs
adb logcat | grep -i "exception\|error\|crash"

# Filter to your app only
adb logcat | grep "com.travalpass.app"
```

**Common causes**:
- Missing Firebase configuration
- Hermes/JSC misconfiguration
- Native module version mismatch

### Build Fails on EAS

**Check**:
- `android/build.gradle` has correct dependencies
- No conflicting versions in `package.json`
- EAS Build logs for specific errors

### Release APK Different from Debug

**Remember**:
- Release uses production Firebase (`google-services.json`)
- ProGuard/R8 may cause issues (check `android/app/proguard-rules.pro`)
- `__DEV__` is false (no dev warnings/errors shown)

---

## 📊 Version History

| Version | Build | Date | Status | Notes |
|---------|-------|------|--------|-------|
| 1.0.0 | Local Release | Jan 13, 2026 | ✅ TESTED | Google Sign-In verified working on physical device (R9TRC196JBH) |
| 1.0.0 | 1 | TBD | Pending | Initial Play Store release |

---

## 🎯 Known Working Configuration (Jan 13, 2026)

### Local Release Testing
- **Keystore**: `travalpass-local-release.keystore`
- **Keystore Location**: `android/app/travalpass-local-release.keystore`
- **Key Alias**: `travalpass`
- **Passwords**: `android` (both store and key)
- **SHA-1**: `CD:E6:E5:F1:25:DC:5D:FD:DC:06:B4:97:3D:09:B5:28:13:1F:DF:9D`
- **Firebase Project**: `mundo1-1` (Production)
- **Test Device**: Samsung Galaxy (R9TRC196JBH)
- **Test Results**: ✅ Google Sign-In working, user authentication successful

### Firebase Console Configuration
- **Project**: mundo1-1 (Production)
- **Package**: com.travalpass.app
- **Registered SHA-1**: `CD:E6:E5:F1:25:DC:5D:FD:DC:06:B4:97:3D:09:B5:28:13:1F:DF:9D`
- **google-services.json certificate_hash**: `cde6e5f125dc5dfddc06b4973d09b528131fdf9d`

### Google Cloud Console
- **Project**: mundo1-1
- **OAuth Client Type**: Android
- **Package Name**: com.travalpass.app
- **SHA-1**: `CD:E6:E5:F1:25:DC:5D:FD:DC:06:B4:97:3D:09:B5:28:13:1F:DF:9D`

### build.gradle Configuration (Verified Working)
```gradle
signingConfigs {
    release {
        storeFile file('travalpass-local-release.keystore')
        storePassword 'android'
        keyAlias 'travalpass'
        keyPassword 'android'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        shrinkResources false
    }
}
```

---

## 🔗 Related Documentation

- [iOS Deployment Guide](../ios/APP_STORE_DEPLOYMENT_GUIDE.md)
- [Production Deployment Checklist](../auth/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Testing Google Sign-In on Device](../auth/TESTING_GOOGLE_SIGNIN_ON_DEVICE.md)
- [Android Setup](ANDROID_SETUP.md)

---

## 📝 Notes

### Release vs Debug Builds

| Aspect | Debug | Release |
|--------|-------|---------|
| Firebase | Dev project | Production project |
| OAuth | Dev Client IDs | Production Client IDs |
| ProGuard | Disabled | Enabled |
| `__DEV__` | `true` | `false` |
| Signing | Debug keystore | Release keystore |
| Performance | Slower | Optimized |

### Firebase Projects

- **Development**: `mundo1-dev` (296095212837)
- **Production**: `mundo1-1` (533074391000)

Always verify which Firebase project is being used by checking:
```bash
grep "project_id" android/app/google-services.json
```

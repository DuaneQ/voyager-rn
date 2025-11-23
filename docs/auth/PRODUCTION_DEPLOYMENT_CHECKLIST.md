# Production Deployment Checklist - Google Sign-In for iOS & Android

## 🚨 CRITICAL: Before Deploying to App Stores

This guide ensures Google Sign-In works correctly in production builds for both iOS App Store and Google Play Store.

---

## 📋 Overview

Google Sign-In requires different SHA-1 fingerprints and Client IDs for:
- **Development builds** (debug keystore)
- **Production builds** (release keystore)
- **iOS** (separate Bundle ID configuration)
- **Android** (package name configuration)

**If you skip these steps, Google Sign-In will fail in production with `DEVELOPER_ERROR`.**

---

## 🤖 Android Production Setup

### Step 1: Generate Release Keystore (If Not Already Done)

```bash
# Navigate to android/app directory
cd android/app

# Generate release keystore
keytool -genkeypair -v -storetype PKCS12 \
  -keystore travalpass-release.keystore \
  -alias travalpass-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password (SAVE THIS SECURELY!)
# - Key password (SAVE THIS SECURELY!)
# - Your name, organization, city, state, country
```

**⚠️ CRITICAL: Store the keystore file and passwords securely!**
- Upload keystore to secure password manager (1Password, LastPass, etc.)
- Never commit keystore to Git
- If lost, you cannot update the app in Google Play Store

### Step 2: Get Production SHA-1 Fingerprint

```bash
# From project root
cd android

# Get SHA-1 from release keystore
keytool -list -v -keystore app/travalpass-release.keystore -alias travalpass-release

# Look for the SHA1 fingerprint in output, example:
# SHA1: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12
```

**Copy this SHA-1 - you'll need it in Step 3.**

### Step 3: Add Production SHA-1 to Firebase Console

1. **Open Firebase Console:**
   - https://console.firebase.google.com/
   - Select project: **`mundo1-1`** (PRODUCTION)

2. **Navigate to Project Settings:**
   - Click ⚙️ gear icon → Project Settings
   - Scroll to "Your apps" → Find Android app (com.travalpass.app)

3. **Add Release SHA-1:**
   - Scroll to "SHA certificate fingerprints"
   - Click "Add fingerprint"
   - Paste the production SHA-1 from Step 2
   - Click "Save"

4. **Download Updated google-services.json:**
   - Click "Download google-services.json"
   - Replace: `android/app/google-services.json`

### Step 4: Configure Gradle Signing

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    
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
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 5: Configure Signing Properties

Create `android/gradle.properties` (if not exists) and add:

```properties
TRAVALPASS_RELEASE_STORE_FILE=app/travalpass-release.keystore
TRAVALPASS_RELEASE_KEY_ALIAS=travalpass-release
TRAVALPASS_RELEASE_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
TRAVALPASS_RELEASE_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

**⚠️ Add to .gitignore:**
```
# android/gradle.properties
android/gradle.properties
android/app/travalpass-release.keystore
```

**For CI/CD:** Store as encrypted secrets in GitHub Actions/CircleCI/etc.

### Step 6: Update AuthContext with Production Web Client ID

The production `google-services.json` will have a different Web Client ID. Update `src/context/AuthContext.tsx`:

```typescript
// Get the Web Client ID from production google-services.json
// Look for client_type: 3 in oauth_client array
const PROD_WEB_CLIENT_ID = 'YOUR-PROD-PROJECT-ID.apps.googleusercontent.com';
const DEV_WEB_CLIENT_ID = '296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com';

// In useEffect:
SafeGoogleSignin.configure({
  webClientId: __DEV__ ? DEV_WEB_CLIENT_ID : PROD_WEB_CLIENT_ID,
  offlineAccess: true,
});
```

### Step 7: Build Production APK/AAB

```bash
# Build release APK
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk

# OR build App Bundle (recommended for Play Store)
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Step 8: Test Production Build Before Upload

```bash
# Install production APK on device
adb install android/app/build/outputs/apk/release/app-release.apk

# Test Google Sign-In thoroughly:
# - Sign In (existing user)
# - Sign Up (new user)
# - Error handling
```

### Step 9: Upload to Google Play Console

1. Go to https://play.google.com/console
2. Select TravalPass app
3. Navigate to "Production" → "Create new release"
4. Upload `app-release.aab`
5. Complete release notes and submit for review

---

## 🍎 iOS Production Setup

### Step 1: Configure iOS Bundle ID in Firebase

1. **Open Firebase Console:**
   - https://console.firebase.google.com/
   - Select project: **`mundo1-1`** (PRODUCTION)

2. **Add iOS App (if not already added):**
   - Click "Add app" → iOS
   - iOS bundle ID: `com.travalpass.app` (must match Xcode)
   - App nickname: "TravalPass iOS"
   - Click "Register app"

3. **Download GoogleService-Info.plist:**
   - Download the config file
   - Add to: `ios/TravalPass/GoogleService-Info.plist`
   - In Xcode: Drag file into project, check "Copy items if needed"

### Step 2: Configure URL Scheme in Xcode

1. **Open Xcode project:**
   ```bash
   cd ios
   open TravalPass.xcworkspace
   ```

2. **Add URL Scheme:**
   - Select project in navigator → Select target "TravalPass"
   - Go to "Info" tab → "URL Types"
   - Click "+" to add URL scheme
   - Identifier: `com.googleusercontent.apps.YOUR-IOS-CLIENT-ID`
   - URL Schemes: Reversed Client ID from GoogleService-Info.plist
   - Example: `com.googleusercontent.apps.533074391000-abc123def456`

3. **Get Reversed Client ID:**
   - Open `ios/TravalPass/GoogleService-Info.plist`
   - Find `REVERSED_CLIENT_ID` key
   - Copy the value

### Step 3: Update Info.plist

Edit `ios/TravalPass/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <!-- Your reversed client ID -->
      <string>com.googleusercontent.apps.533074391000-XXXXXXXXXXXX</string>
    </array>
  </dict>
</array>

<!-- Add Google Sign-In whitelist -->
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>googlegmail</string>
  <string>googleplus</string>
</array>
```

### Step 4: Install CocoaPods Dependencies

```bash
cd ios
pod install
```

### Step 5: Configure iOS Client ID in Code

Update `src/context/AuthContext.tsx`:

```typescript
const PROD_IOS_CLIENT_ID = 'YOUR-PROD-IOS-CLIENT-ID.apps.googleusercontent.com'; // From GoogleService-Info.plist
const DEV_IOS_CLIENT_ID = '296095212837-iq6q8qiodt67lalsn3j5ej2s6sn1e01k.apps.googleusercontent.com';

SafeGoogleSignin.configure({
  webClientId: __DEV__ ? DEV_WEB_CLIENT_ID : PROD_WEB_CLIENT_ID,
  iosClientId: __DEV__ ? DEV_IOS_CLIENT_ID : PROD_IOS_CLIENT_ID,
  offlineAccess: true,
});
```

### Step 6: Build Production iOS App

**Option A: EAS Build (Recommended)**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build
eas build:configure

# Build for iOS App Store
eas build --platform ios --profile production

# Download IPA when complete
# Upload to App Store Connect via Transporter app
```

**Option B: Xcode Direct Build**

1. Open Xcode: `ios/TravalPass.xcworkspace`
2. Select "Any iOS Device (arm64)" scheme
3. Product → Archive
4. Window → Organizer → Distribute App
5. Choose "App Store Connect"
6. Follow upload wizard

### Step 7: Test Production Build

```bash
# Using TestFlight
1. Upload build to App Store Connect
2. Enable TestFlight for internal testing
3. Install via TestFlight on device
4. Test all Google Sign-In scenarios

# OR install development build on device
npx expo run:ios --device --configuration Release
```

### Step 8: Submit to App Store

1. Go to https://appstoreconnect.apple.com/
2. Select TravalPass app
3. Create new version in "App Store" tab
4. Select build uploaded from Xcode/EAS
5. Complete app information, screenshots, etc.
6. Submit for review

---

## 🔄 Environment Configuration Strategy

### Recommended: Use Different Firebase Projects

**Development:**
- Firebase Project: `mundo1-dev`
- Android Package: `com.travalpass.app.dev`
- iOS Bundle ID: `com.travalpass.app.dev`
- Separate google-services.json and GoogleService-Info.plist

**Production:**
- Firebase Project: `mundo1-1`
- Android Package: `com.travalpass.app`
- iOS Bundle ID: `com.travalpass.app`
- Production google-services.json and GoogleService-Info.plist

### Update firebaseConfig.ts

```typescript
const devConfig = {
  apiKey: "AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0",
  authDomain: "mundo1-dev.firebaseapp.com",
  projectId: "mundo1-dev",
  // ... rest of dev config
};

const prodConfig = {
  apiKey: "AIzaSyBzRHcKiuCj7vvqJxGDELs2zEXQ0QvQhbk",
  authDomain: "mundo1-1.firebaseapp.com",
  projectId: "mundo1-1",
  // ... rest of prod config
};

// Automatically switch based on __DEV__
const firebaseConfig = __DEV__ ? devConfig : prodConfig;
```

---

## ✅ Pre-Deployment Checklist

### Android

- [ ] Release keystore generated and backed up securely
- [ ] Production SHA-1 added to Firebase Console (mundo1-1)
- [ ] Production google-services.json downloaded and placed in `android/app/`
- [ ] Gradle signing config updated with release keystore
- [ ] Production Web Client ID added to AuthContext
- [ ] Release APK/AAB built successfully
- [ ] Production build tested on real device
- [ ] Google Sign-In works for all 4 scenarios in production
- [ ] App uploaded to Google Play Console
- [ ] Release notes and screenshots updated

### iOS

- [ ] iOS app registered in Firebase Console (mundo1-1)
- [ ] GoogleService-Info.plist downloaded and added to Xcode
- [ ] URL Scheme configured with reversed client ID
- [ ] Info.plist updated with CFBundleURLTypes
- [ ] Production iOS Client ID added to AuthContext
- [ ] CocoaPods dependencies installed
- [ ] Production build created (EAS or Xcode Archive)
- [ ] TestFlight build tested on real device
- [ ] Google Sign-In works for all 4 scenarios
- [ ] Build uploaded to App Store Connect
- [ ] App Store listing and screenshots completed

### General

- [ ] Production Firebase project (mundo1-1) configured correctly
- [ ] Cloud Functions deployed to production
- [ ] Firestore rules updated for production
- [ ] Environment variables set correctly (__DEV__ detection)
- [ ] All API keys and secrets stored securely (not in Git)
- [ ] Terms of Service and Privacy Policy links working
- [ ] Analytics and crash reporting configured
- [ ] Push notifications configured (if applicable)

---

## 🔐 Security Best Practices

### Keystore Management

1. **Never commit to Git:**
   ```gitignore
   # .gitignore
   *.keystore
   *.jks
   android/gradle.properties
   android/key.properties
   ```

2. **Secure Storage:**
   - Upload keystore to company password manager
   - Store in encrypted cloud storage (not Dropbox/Google Drive)
   - Keep offline backup on encrypted external drive

3. **CI/CD Secrets:**
   - GitHub Actions: Use encrypted secrets
   - CircleCI: Use context variables
   - Never log keystore passwords

### Firebase Security

1. **Restrict API Keys:**
   - Firebase Console → Project Settings → API Keys
   - Restrict Android key to package name: `com.travalpass.app`
   - Restrict iOS key to bundle ID: `com.travalpass.app`

2. **OAuth Client IDs:**
   - Only add SHA-1 fingerprints you control
   - Remove debug SHA-1 from production project

---

## 🧪 Testing Production Builds

### Test Scenarios (Both iOS & Android)

**Scenario 1: New User Sign In (ACCOUNT_NOT_FOUND)**
- [ ] User tries "Sign in with Google"
- [ ] No account exists
- [ ] Error shown: "No account found..."
- [ ] Form switches to Register mode

**Scenario 2: Existing User Sign Up (No Duplicate)**
- [ ] User tries "Sign up with Google"
- [ ] Account already exists in Firestore
- [ ] User logged in successfully
- [ ] No duplicate profile created

**Scenario 3: New User Sign Up (Profile Creation)**
- [ ] User tries "Sign up with Google"
- [ ] No account exists
- [ ] Profile created in Firestore
- [ ] User logged in successfully

**Scenario 4: Existing User Sign In (Normal Flow)**
- [ ] User tries "Sign in with Google"
- [ ] Account exists
- [ ] User logged in successfully

**Additional Tests:**
- [ ] Google popup cancellation handled gracefully
- [ ] Offline mode shows appropriate error
- [ ] Multiple Google accounts shown in picker
- [ ] Sign out works correctly
- [ ] Profile data persists after app restart

---

## 🐛 Common Production Issues & Fixes

### Issue: "DEVELOPER_ERROR" in Production

**Cause:** Missing or incorrect SHA-1 fingerprint

**Fix:**
1. Verify release keystore SHA-1 matches Firebase Console
2. Ensure production google-services.json is used (not dev)
3. Rebuild app after adding SHA-1

### Issue: "Sign in failed" with no error details

**Cause:** Web Client ID mismatch

**Fix:**
1. Check google-services.json for correct Web Client ID (client_type: 3)
2. Update AuthContext with production Web Client ID
3. Rebuild app

### Issue: iOS "No identities are available for signing"

**Cause:** Missing provisioning profile

**Fix:**
1. Xcode → Preferences → Accounts → Download Manual Profiles
2. Enable "Automatically manage signing"
3. Or create manual provisioning profile in Apple Developer Portal

### Issue: "This app is not authorized to use Firebase Authentication"

**Cause:** Bundle ID / Package name mismatch

**Fix:**
1. Verify Firebase Console app registration matches exactly
2. Check Xcode bundle ID: `com.travalpass.app`
3. Check build.gradle package: `com.travalpass.app`

---

## 📞 Support Resources

### Documentation
- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [Firebase iOS Setup](https://firebase.google.com/docs/ios/setup)
- [Google Sign-In Android](https://developers.google.com/identity/sign-in/android/start)
- [Google Sign-In iOS](https://developers.google.com/identity/sign-in/ios/start)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)

### Firebase Consoles
- **Development:** https://console.firebase.google.com/project/mundo1-dev
- **Production:** https://console.firebase.google.com/project/mundo1-1

### App Store Consoles
- **Google Play:** https://play.google.com/console
- **App Store Connect:** https://appstoreconnect.apple.com/

---

## 📝 Post-Deployment

After successful deployment:

1. **Monitor Firebase Console:**
   - Check authentication logs
   - Monitor error rates
   - Track user sign-ups

2. **Review App Store Feedback:**
   - Check reviews for auth-related issues
   - Monitor crash reports (Crashlytics)

3. **Update Documentation:**
   - Record production Client IDs in secure wiki
   - Document any deployment issues encountered
   - Update this checklist with lessons learned

---

**Last Updated:** November 23, 2025  
**Status:** Ready for Production Deployment  
**Next Steps:** Follow Android and iOS checklists above before App Store submission

# Google Sign-In Setup for iOS

## Current Issue
You're seeing the error: **"Requiring unknown module 'undefined'"** because:
1. ✅ **FIXED**: Package `@react-native-google-signin/google-signin` is now installed
2. ✅ **FIXED**: iOS pods have been installed
3. ⚠️ **NEEDS ACTION**: You must configure OAuth Client IDs
4. ⚠️ **NEEDS ACTION**: You must rebuild the iOS app

## Step 1: Get Your OAuth Client IDs from Firebase

### A. Get iOS OAuth Client ID
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **mundo1-dev**
3. Navigate to: **Authentication → Sign-in providers → Google**
4. Click **Edit** on the Google provider
5. Scroll down to **iOS** section
6. You'll see your **iOS OAuth Client ID** (format: `296095212837-XXXXX.apps.googleusercontent.com`)
7. **Copy this Client ID**

### B. Get Web OAuth Client ID
1. In the same Google Sign-In settings page
2. Look for **Web SDK configuration** or **Web client ID**
3. Copy the **Web Client ID** (format: `296095212837-XXXXX.apps.googleusercontent.com`)

## Step 2: Update AuthContext Configuration

Open `src/context/AuthContext.tsx` and find this section (around line 88):

```typescript
GoogleSignin.configure({
  iosClientId: '296095212837-YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // TODO: Replace
  webClientId: '296095212837-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // TODO: Replace
  offlineAccess: true,
});
```

Replace with your actual Client IDs from Step 1:

```typescript
GoogleSignin.configure({
  iosClientId: '296095212837-abc123xyz.apps.googleusercontent.com', // Your actual iOS Client ID
  webClientId: '296095212837-def456uvw.apps.googleusercontent.com', // Your actual Web Client ID
  offlineAccess: true,
});
```

## Step 3: Add URL Scheme to iOS

### Option A: Automatic (Recommended)
Run this command to auto-configure:
```bash
npx uri-scheme add "com.googleusercontent.apps.296095212837-YOUR_IOS_CLIENT_ID"
```

### Option B: Manual
1. Open `ios/VoyagerRN/Info.plist`
2. Add this before the final `</dict>`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <!-- Reverse of your iOS OAuth Client ID -->
      <string>com.googleusercontent.apps.296095212837-XXXXX</string>
    </array>
  </dict>
</array>
```

**Important**: The URL scheme is the **reversed** iOS Client ID (without `.apps.googleusercontent.com`)

## Step 4: Rebuild the iOS App

Since you added a native module, you **must rebuild**:

```bash
# Clean build folders
rm -rf ios/build
rm -rf node_modules/.cache

# Rebuild for iOS
npm run ios
```

## Step 5: Test Google Sign-In

1. Launch the app
2. Navigate to the Auth screen
3. Tap **"Sign in with Google"**
4. You should see the Google Sign-In sheet
5. Select your Google account
6. Grant permissions
7. You should be signed in!

## Troubleshooting

### Error: "No idToken from Google Signin"
- Make sure you've configured both `iosClientId` and `webClientId`
- Verify the Client IDs are correct (check Firebase Console)

### Error: "DEVELOPER_ERROR"
- Your URL scheme doesn't match your iOS OAuth Client ID
- Check `ios/VoyagerRN/Info.plist` has the correct reversed Client ID

### Error: "The operation couldn't be completed"
- Make sure you've run `pod install` after installing the package
- Rebuild the app completely (`rm -rf ios/build && npm run ios`)

### Still seeing "Requiring unknown module 'undefined'"
- You need to **rebuild** the native app after installing the package
- Run: `npm run ios` (not just `expo start`)

## Alternative: Use Expo's expo-auth-session (Expo 51 Native)

If you want to avoid native modules and stick with pure Expo:

```bash
npx expo install expo-auth-session expo-web-browser
```

Then update `AuthContext.tsx` to use `expo-auth-session` instead. This is the recommended approach for Expo managed workflow, but since you're using development builds, the current approach works fine.

## Current Status

✅ Package installed: `@react-native-google-signin/google-signin`  
✅ iOS pods installed  
⚠️ **NEEDS ACTION**: Configure OAuth Client IDs in `AuthContext.tsx`  
⚠️ **NEEDS ACTION**: Rebuild iOS app with `npm run ios`

---

**Next Steps:**
1. Get OAuth Client IDs from Firebase Console
2. Update `AuthContext.tsx` with your Client IDs
3. Add URL scheme to `Info.plist`
4. Rebuild: `npm run ios`

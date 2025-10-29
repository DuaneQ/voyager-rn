# Creating iOS OAuth Client ID - Step by Step Guide

## Current Setup
✅ Web Client ID: `296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com`  
⚠️ iOS Client ID: **Not configured yet**  
📱 iOS Bundle ID: `com.voyager.rn`

## Why You Need an iOS Client ID

Google Sign-In on iOS requires a dedicated iOS OAuth Client ID. Without it, you'll get authentication errors when trying to sign in with Google on the iOS simulator/device.

---

## 📋 Step-by-Step Instructions

### Step 1: Open Google Cloud Console

1. **Open your browser** and go to: **https://console.cloud.google.com/**

2. **Sign in** with the Google account that owns your Firebase project

3. **Select your project** from the dropdown at the top:
   - Click the project dropdown (top bar, next to "Google Cloud")
   - Find and click: **"mundo1-dev"**
   - Wait for the project to load

   💡 **Tip**: If you don't see "mundo1-dev", make sure you're signed in with the correct Google account

---

### Step 2: Navigate to Credentials Page

1. **Open the navigation menu** (hamburger icon ☰ in top-left)

2. **Find "APIs & Services"** in the menu
   - Scroll down the left sidebar
   - Look for the section labeled "APIs & Services"
   - It has a plug icon 🔌

3. **Click on "Credentials"** under APIs & Services
   - This will open the credentials management page
   - You should see a list of existing credentials

   🔗 **Direct Link**: https://console.cloud.google.com/apis/credentials?project=mundo1-dev

   📸 **What you should see**:
   - Page title: "Credentials"
   - Blue button at top: "+ CREATE CREDENTIALS"
   - List of existing OAuth clients and API keys below

---

### Step 3: Create New OAuth Client ID

1. **Click the "+ CREATE CREDENTIALS" button** (blue button at the top)

2. **Select "OAuth client ID"** from the dropdown menu
   - A configuration form will appear

3. ⚠️ **If you see a consent screen warning**:
   - Click "CONFIGURE CONSENT SCREEN"
   - Select "External" (unless you have a Google Workspace)
   - Click "CREATE"
   - Fill in required fields:
     - App name: "Voyager RN"
     - User support email: (your email)
     - Developer contact: (your email)
   - Click "SAVE AND CONTINUE"
   - Skip the scopes page (click "SAVE AND CONTINUE")
   - Skip test users page (click "SAVE AND CONTINUE")
   - Click "BACK TO DASHBOARD"
   - Now go back to Step 3, #1 (create credentials again)

---

### Step 4: Configure iOS Application

1. **Select Application Type**:
   - In the "Application type" dropdown, select: **"iOS"**

2. **Enter the Name**:
   - In the "Name" field, type: **`voyager-rn iOS`**
   - This is just a label for you to identify it later

3. **Enter the Bundle ID**:
   - In the "Bundle ID" field, type: **`com.voyager.rn`**
   - ⚠️ **CRITICAL**: This MUST exactly match your iOS Bundle Identifier
   - This comes from your `ios/VoyagerRN.xcodeproj` and `app.json`

   📸 **What you should see on the form**:
   ```
   Application type: [iOS ▼]
   Name: [voyager-rn iOS]
   Bundle ID: [com.voyager.rn]
   ```

4. **Click the "CREATE" button** (blue button at bottom)

---

### Step 5: Copy Your iOS Client ID

1. **A popup will appear** showing your new OAuth client details

2. **Find the "Your Client ID" field**:
   - It will look like: `296095212837-abc123xyz456.apps.googleusercontent.com`

3. **Copy the entire Client ID**:
   - Click the copy icon 📋 next to the Client ID
   - Or manually select and copy the entire string

4. **Save it somewhere safe** (you'll need it in the next steps)

5. **Click "OK"** to close the popup

   💡 **Note**: You can always come back to view this Client ID:
   - Go to Credentials page
   - Find "voyager-rn iOS" in the OAuth 2.0 Client IDs list
   - Click on it to see the Client ID again

---

### Step 6: Verify Your Client ID

Before continuing, verify you have the correct format:

✅ **Correct format**: `296095212837-abc123xyz456.apps.googleusercontent.com`  
❌ **Wrong**: Missing the `.apps.googleusercontent.com` part  
❌ **Wrong**: Copied only part of the string

**Example of what you should have**:
```
296095212837-k8j7h6g5f4d3s2a1.apps.googleusercontent.com
```

---

## 🔧 Implementation Steps

Now that you have your iOS Client ID, follow these steps:

### Step 7: Update AuthContext.tsx

1. **Open the file**: `src/context/AuthContext.tsx`

2. **Find the GoogleSignin.configure section** (around line 95)

3. **Uncomment the iosClientId line** and add your actual Client ID:

   **Before**:
   ```typescript
   GoogleSignin.configure({
     webClientId: '296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com',
     
     // iOS Client ID - not configured yet in Firebase
     // To add: Firebase Console → Authentication → Sign-in providers → Google → Add iOS app
     // iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
     
     offlineAccess: true,
   });
   ```

   **After** (replace with YOUR actual Client ID from Step 5):
   ```typescript
   GoogleSignin.configure({
     webClientId: '296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com',
     iosClientId: '296095212837-abc123xyz456.apps.googleusercontent.com', // ← Your actual iOS Client ID here!
     offlineAccess: true,
   });
   ```

4. **Save the file** (Cmd+S / Ctrl+S)

4. **Save the file** (Cmd+S / Ctrl+S)

---

### Step 8: Add URL Scheme to Info.plist

The iOS app needs to know how to handle the OAuth redirect. You need to add a URL scheme.

**Important**: The URL scheme is your iOS Client ID in reverse format:
- iOS Client ID: `296095212837-abc123xyz456.apps.googleusercontent.com`
- URL Scheme: `com.googleusercontent.apps.296095212837-abc123xyz456`

#### Option A: Automatic (Recommended)

**Run this command in your terminal**:

```bash
# Replace XXXXXX with the middle part of your iOS Client ID
# Example: if your ID is 296095212837-k8j7h6g5f4d3s2a1.apps.googleusercontent.com
# Then use: com.googleusercontent.apps.296095212837-k8j7h6g5f4d3s2a1

npx uri-scheme add "com.googleusercontent.apps.296095212837-XXXXXX"
```

**What this does**:
- Automatically adds the URL scheme to your Info.plist
- Configures it correctly for Google Sign-In

#### Option B: Manual

1. **Open the file**: `ios/VoyagerRN/Info.plist`

2. **Find the end of the file** (look for the closing `</dict></plist>`)

3. **Add this XML BEFORE the final `</dict>`**:

   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleTypeRole</key>
       <string>Editor</string>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>com.googleusercontent.apps.296095212837-XXXXXX</string>
       </array>
     </dict>
   </array>
   ```

4. **Replace `296095212837-XXXXXX`** with your actual reversed iOS Client ID

   **Example**: If your iOS Client ID is:
   ```
   296095212837-k8j7h6g5f4d3s2a1.apps.googleusercontent.com
   ```
   
   Then your URL scheme should be:
   ```
   com.googleusercontent.apps.296095212837-k8j7h6g5f4d3s2a1
   ```

5. **Save the file**

---

### Step 9: Rebuild the iOS App

Since you've changed native configuration, you MUST rebuild:

```bash
# Clean old build artifacts
rm -rf ios/build

# Rebuild the iOS app
npm run ios
```

**Wait for**:
- Xcode to compile the app
- Simulator to launch
- App to appear on the simulator

⏱️ **This may take 2-5 minutes** depending on your machine

---

### Step 10: Test Google Sign-In

1. **Once the app launches**, you should see the Auth/Login screen

2. **Tap the "Sign in with Google" button**

3. **You should see**:
   - A Google Sign-In sheet sliding up from the bottom
   - Your Google accounts listed
   - Or a prompt to sign in to Google

4. **Select your Google account**

5. **Grant permissions** if prompted

6. **If successful**:
   - The sheet will close
   - You'll be signed in and redirected to the home screen
   - ✅ **Success!**

7. **If you get an error**, see the Troubleshooting section below

---

## 🔍 Troubleshooting

### Error: "DEVELOPER_ERROR"

**Symptom**: Error message shows "DEVELOPER_ERROR" or error code 10

**Causes**:
1. URL scheme doesn't match your iOS Client ID
2. Bundle ID doesn't match what you entered in Google Cloud Console
3. iOS Client ID is incorrect

**Fix**:
1. **Verify your URL scheme** in `ios/VoyagerRN/Info.plist`:
   ```xml
   <string>com.googleusercontent.apps.296095212837-XXXXXX</string>
   ```
   
2. **Verify the XXXXXX part matches** your iOS Client ID exactly

3. **Verify your Bundle ID** in Google Cloud Console matches `com.voyager.rn`

4. **After fixing, rebuild**:
   ```bash
   rm -rf ios/build && npm run ios
   ```

---

### Error: "The operation couldn't be completed"

**Symptom**: Generic error when tapping Sign in with Google

**Causes**:
1. Google Sign-In not properly initialized
2. Missing iosClientId in configuration
3. iOS app not rebuilt after changes

**Fix**:
1. **Check AuthContext.tsx** has iosClientId uncommented and set
2. **Rebuild the app** completely:
   ```bash
   cd ios
   rm -rf build
   cd ..
   npm run ios
   ```

---

### Error: "No idToken from Google Signin"

**Symptom**: Error in console logs after selecting Google account

**Causes**:
1. webClientId is missing or incorrect
2. Network issues

**Fix**:
1. **Verify webClientId** in AuthContext.tsx:
   ```typescript
   webClientId: '296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com',
   ```
2. **Check internet connection**
3. **Try again** - sometimes it's a transient network issue

---

### Sign-In Sheet Doesn't Appear

**Symptom**: Tapping "Sign in with Google" does nothing

**Causes**:
1. Package not installed correctly
2. Pods not installed
3. App not rebuilt after adding the package

**Fix**:
1. **Reinstall pods**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

2. **Rebuild**:
   ```bash
   npm run ios
   ```

3. **Check console** for error messages

---

## 📝 Quick Reference

### What You Need
- **iOS Client ID**: From Google Cloud Console (Step 5)
- **URL Scheme**: Reversed iOS Client ID (Step 8)
- **Bundle ID**: `com.voyager.rn` (already set)

### Files to Edit
1. `src/context/AuthContext.tsx` - Add iosClientId
2. `ios/VoyagerRN/Info.plist` - Add URL scheme

### Commands to Run
```bash
# Add URL scheme automatically
npx uri-scheme add "com.googleusercontent.apps.296095212837-XXXXXX"

# Rebuild iOS app
npm run ios
```

---

## ✅ Verification Checklist

Before testing, verify:

- [ ] iOS OAuth Client ID created in Google Cloud Console
- [ ] Bundle ID is `com.voyager.rn` in Google Cloud Console
- [ ] `AuthContext.tsx` has iosClientId uncommented and set
- [ ] `Info.plist` has URL scheme added (reversed Client ID)
- [ ] URL scheme matches your iOS Client ID exactly
- [ ] Pods installed: `cd ios && pod install`
- [ ] App rebuilt: `npm run ios`

---

## 🎯 Summary

### What You Did:
1. ✅ Created iOS OAuth Client ID in Google Cloud Console
2. ✅ Added iosClientId to AuthContext.tsx
3. ✅ Added URL scheme to Info.plist
4. ✅ Rebuilt the iOS app

### What Should Work Now:
- ✅ Tapping "Sign in with Google" on iOS
- ✅ Google Sign-In sheet appears
- ✅ Can select Google account
- ✅ Successfully signs in and redirects to app

### If Something Doesn't Work:
- 📖 Check the Troubleshooting section above
- 🔍 Look at console logs in Xcode or Metro terminal
- 🔄 Try rebuilding: `rm -rf ios/build && npm run ios`

---

## 🆘 Still Having Issues?

If you've followed all steps and it still doesn't work:

1. **Check the console logs** for specific error messages
2. **Verify all credentials** match exactly (no typos)
3. **Try cleaning everything**:
   ```bash
   # Clean iOS build
   rm -rf ios/build
   rm -rf ios/Pods
   
   # Reinstall
   cd ios
   pod install
   cd ..
   
   # Rebuild
   npm run ios
   ```

4. **Verify in Google Cloud Console**:
   - Go to Credentials page
   - Find your iOS OAuth client
   - Verify Bundle ID is correct: `com.voyager.rn`

---

## 📚 Additional Resources

- [Google Sign-In for iOS Documentation](https://developers.google.com/identity/sign-in/ios/start)
- [React Native Google Sign-In Documentation](https://github.com/react-native-google-signin/google-signin)
- [Firebase Authentication with Google](https://firebase.google.com/docs/auth/ios/google-signin)

---

**Good luck! 🚀**

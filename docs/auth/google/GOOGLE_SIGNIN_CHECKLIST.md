# Google Sign-In Setup Checklist

Use this checklist to track your progress setting up Google Sign-In for iOS.

## 📋 Pre-Setup Information

**Your Project Details**:
- Firebase Project: `mundo1-dev`
- iOS Bundle ID: `com.voyager.rn`
- Android Package: `com.voyager.rn`
- Web Client ID: `296095212837-tg2mm4k2d72hmcf9ncmsa2b6jn7hakhg.apps.googleusercontent.com` ✅

---

## ✅ iOS Setup Checklist

### Phase 1: Create OAuth Client ID
- [ ] Open [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Select project: `mundo1-dev`
- [ ] Navigate to: APIs & Services → Credentials
- [ ] Click: "+ CREATE CREDENTIALS"
- [ ] Select: "OAuth client ID"
- [ ] Choose application type: "iOS"
- [ ] Enter name: `voyager-rn iOS`
- [ ] Enter Bundle ID: `com.voyager.rn`
- [ ] Click: "CREATE"
- [ ] **Copy and save your iOS Client ID**: `____________________________________`

### Phase 2: Update Code
- [ ] Open: `src/context/AuthContext.tsx`
- [ ] Find GoogleSignin.configure (around line 95)
- [ ] Uncomment the `iosClientId` line
- [ ] Paste your iOS Client ID from Phase 1
- [ ] Save the file

### Phase 3: Add URL Scheme
- [ ] Copy the middle part of your iOS Client ID (between `296095212837-` and `.apps.googleusercontent.com`)
- [ ] Run command: `npx uri-scheme add "com.googleusercontent.apps.296095212837-XXXXXX"`
  - OR manually edit `ios/VoyagerRN/Info.plist`
- [ ] Verify URL scheme was added to Info.plist

### Phase 4: Rebuild App
- [ ] Run: `cd ios && pod install && cd ..`
- [ ] Run: `npm run ios`
- [ ] Wait for app to build and launch

### Phase 5: Test
- [ ] Tap "Sign in with Google" button
- [ ] Google Sign-In sheet appears
- [ ] Select Google account
- [ ] Grant permissions
- [ ] Successfully signed in ✅

---

## 🔧 Troubleshooting Reference

### If you see "DEVELOPER_ERROR":
1. Verify URL scheme matches iOS Client ID (reversed format)
2. Verify Bundle ID in Google Console is `com.voyager.rn`
3. Rebuild: `rm -rf ios/build && npm run ios`

### If nothing happens when tapping button:
1. Check console logs for errors
2. Verify iosClientId is set in AuthContext.tsx
3. Verify pods are installed: `cd ios && pod install`
4. Rebuild the app

### If "The operation couldn't be completed":
1. Verify all steps above are complete
2. Clean and rebuild:
   ```bash
   rm -rf ios/build
   rm -rf ios/Pods
   cd ios && pod install && cd ..
   npm run ios
   ```

---

## 📝 Your Configuration Values

Fill these in as you go:

**iOS Client ID**:
```
296095212837-________________________.apps.googleusercontent.com
```

**URL Scheme** (reversed Client ID):
```
com.googleusercontent.apps.296095212837-________________________
```

**Verification**:
- [ ] iOS Client ID has `.apps.googleusercontent.com` at the end
- [ ] URL scheme has `com.googleusercontent.apps.` at the start
- [ ] Middle part (after `296095212837-`) matches in both

---

## 🎯 Quick Commands

```bash
# Add URL scheme (replace XXXXXX with your client ID middle part)
npx uri-scheme add "com.googleusercontent.apps.296095212837-XXXXXX"

# Install pods
cd ios && pod install && cd ..

# Rebuild app
npm run ios

# Clean rebuild if needed
rm -rf ios/build && npm run ios
```

---

## 📚 Documentation References

- Detailed Guide: `docs/CREATE_IOS_OAUTH_CLIENT_ID.md`
- Setup Overview: `docs/GOOGLE_SIGNIN_SETUP.md`

---

## ✅ Final Verification

When everything is working, you should be able to:
- [x] Launch the app without errors
- [ ] See the "Sign in with Google" button
- [ ] Tap the button and see Google Sign-In sheet
- [ ] Successfully sign in with a Google account
- [ ] Be redirected to the app's home screen

**Status**: In Progress 🚧

---

**Last Updated**: October 25, 2025

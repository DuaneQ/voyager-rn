# Testing Google Sign-In on Real Android Device

## ⚠️ CRITICAL: Why Expo Go (QR Code) Won't Work

**Google Sign-In CANNOT be tested with Expo Go** because:
- Google Sign-In requires native modules (`@react-native-google-signin/google-signin`)
- Expo Go doesn't include custom native modules
- You MUST build a development build to test this feature

## ✅ RECOMMENDED: Test on Physical Android Device

This is the **fastest and most reliable** method for testing Google Sign-In.

### Step 1: Enable Developer Mode on Your Android Phone

1. Open **Settings** on your Android phone
2. Scroll to **About Phone** (or **About Device**)
3. Find **Build Number** and tap it **7 times**
   - You'll see a message: "You are now a developer!"
4. Go back to **Settings**
5. Open **Developer Options** (usually under System or Advanced)
6. Enable **USB Debugging**
7. (Optional) Enable **Install via USB** for easier installation

### Step 2: Connect Your Phone to Your Mac

1. Connect your Android phone to your Mac using a USB cable
2. On your phone, you'll see a popup asking **"Allow USB debugging?"**
   - Check **"Always allow from this computer"**
   - Tap **OK**

### Step 3: Verify Device Connection

```bash
adb devices
```

**Expected output:**
```
List of devices attached
<device-serial>    device
```

If you see `unauthorized`:
- Check your phone screen for the USB debugging prompt
- Tap "Allow" and try again

If you see `no permissions`:
```bash
adb kill-server
sudo adb start-server
adb devices
```

### Step 4: Build and Install the App

```bash
npx expo run:android --device
```

**What happens:**
1. Expo will detect your connected device
2. Show a list: `[1] Phone Name (connected)`
3. The app will build with native modules included
4. App installs directly on your phone
5. App launches automatically

**Build time:** First build takes 5-10 minutes (subsequent builds are faster)

### Step 5: Test Google Sign-In

Once the app is running on your phone:

1. **Navigate to Sign In page**
2. **Tap "Sign in with Google" button**
   - You should see the Google account picker
   - Select your account
3. **Test all 4 scenarios:**

#### Scenario 1: New User Tries Sign In (No Profile)
- Use Google account that's NOT in Firestore users collection
- Tap "Sign in with Google"
- **Expected:** Error message "No account found for this Google account. Please sign up first."
- **Expected:** Auth form switches to Register mode automatically

#### Scenario 2: Existing User Tries Sign Up
- Use Google account that IS in Firestore users collection
- Switch to Register form
- Tap "Sign up with Google"
- **Expected:** Logs you in WITHOUT creating duplicate profile
- **Expected:** Navigate to main app

#### Scenario 3: New User Signs Up
- Use NEW Google account not in Firestore
- Tap "Sign up with Google"
- **Expected:** Success message "Successfully signed up with Google! Welcome to TravalPass."
- **Expected:** Profile created in Firestore with correct data
- **Expected:** Navigate to main app

#### Scenario 4: Existing User Signs In
- Use Google account in Firestore
- Tap "Sign in with Google"
- **Expected:** Normal authentication flow
- **Expected:** Navigate to main app

### Step 6: Verify in Firestore

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`mundo1-dev`)
3. Go to **Firestore Database**
4. Navigate to `users` collection
5. **Verify profile was created** for Scenario 3:
   - Document ID matches Google UID
   - `email` field matches Google email
   - `subscriptionType` is `'free'`
   - `photos` array has 5 empty strings
   - `dailyUsage` object exists with current date

### Step 7: Hot Reload During Development

After the first build, you can make code changes and see them reflected:

1. Keep the app running on your phone
2. Make code changes in your editor
3. Save the file
4. **The app will reload automatically** (Fast Refresh)

**Note:** Changes to native modules require a rebuild:
```bash
npx expo run:android --device
```

## 🖥️ Alternative: Use Android Emulator

If you don't have a physical device, fix the emulator issue:

### Option A: Cold Boot the Emulator

```bash
# Kill any stuck emulator processes
adb kill-server
killall qemu-system-aarch64 2>/dev/null
killall emulator 2>/dev/null

# Start ADB
adb start-server

# Start emulator with cold boot (slower but more reliable)
/Users/icebergslim/Library/Android/sdk/emulator/emulator @Pixel_9a -no-snapshot-load -no-boot-anim &

# Wait for boot (check status)
adb devices  # Should show "device" not "offline"
```

### Option B: Use Expo's Built-in Emulator Launch

```bash
# This handles emulator startup automatically
npx expo run:android
```

**Troubleshooting if timeout occurs:**
1. The emulator window should appear on your screen
2. Wait 2-3 minutes for full boot (you'll see Android lock screen)
3. If Expo times out before boot completes, run again:
   ```bash
   npx expo run:android
   ```
4. Expo will detect the running emulator and skip the boot step

### Emulator Google Sign-In Requirements

⚠️ **Important:** The emulator must have Google Play Services installed:
- Use an AVD with **"Google Play"** or **"Google APIs"** in the name
- ✅ `Pixel_9a` (has Play Store)
- ❌ AOSP or stock system images won't work

## 🔧 Troubleshooting

### Issue: "Google Sign In is not configured"

**Cause:** The app was started with `npm start` (Expo Go mode)

**Fix:** Always use `npx expo run:android --device` for development builds

### Issue: "Developer error" from Google Sign-In

**Cause:** SHA-1 fingerprint not added to Firebase Console

**Fix:**
1. Get your debug keystore SHA-1:
   ```bash
   cd android
   ./gradlew signingReport
   ```
2. Copy the SHA-1 hash under "Variant: debug"
3. Add to Firebase Console:
   - Project Settings → Your apps → Android app
   - Scroll to "SHA certificate fingerprints"
   - Add the SHA-1

### Issue: Build fails with Gradle errors

**Fix:** Clean and rebuild
```bash
cd android
./gradlew clean
cd ..
npx expo run:android --device
```

### Issue: "No devices/emulators found"

**Physical Device:**
```bash
# Check connection
adb devices

# If unauthorized, check phone screen for USB debugging prompt
# If offline, try:
adb kill-server && adb start-server
```

**Emulator:**
```bash
# List available emulators
/Users/icebergslim/Library/Android/sdk/emulator/emulator -list-avds

# Start manually
/Users/icebergslim/Library/Android/sdk/emulator/emulator @Pixel_9a &
```

### Issue: App crashes on launch

**Check logs:**
```bash
# Real-time logs
adb logcat | grep -i "ReactNative\|GoogleSignIn\|Firebase"

# Or use React Native debugger
npx expo run:android --device --variant debug
```

## 📱 iOS Device Testing

For iOS physical device testing:

```bash
npx expo run:ios --device
```

**Requirements:**
1. Mac with Xcode installed
2. iPhone connected via USB
3. Apple Developer account (free tier works)
4. Device added to provisioning profile

**Note:** iOS simulator also works but requires Xcode:
```bash
npx expo run:ios
```

## 🎯 Quick Reference

### Build Commands

| Command | Use Case |
|---------|----------|
| `npx expo run:android --device` | Build and run on connected phone |
| `npx expo run:android` | Build and run on emulator |
| `npx expo run:android --variant release` | Production build |
| `npm start` | ❌ **DON'T USE** - Only for Expo Go (no native modules) |

### Test Scenarios Checklist

- [ ] **Scenario 1:** New user Sign In → Error + Switch to Register
- [ ] **Scenario 2:** Existing user Sign Up → Login (no duplicate)
- [ ] **Scenario 3:** New user Sign Up → Profile created + Login
- [ ] **Scenario 4:** Existing user Sign In → Normal flow
- [ ] **Edge Case:** Cancel Google popup → No crash
- [ ] **Edge Case:** No internet → Error handling
- [ ] **Verify:** Check Firestore for profile creation (Scenario 3)
- [ ] **Verify:** No duplicate profiles (Scenario 2)

## 🚀 Development Workflow

### Initial Setup (Once)
1. Connect device
2. `npx expo run:android --device`
3. Wait for build (~5-10 min first time)

### Daily Development
1. Keep app running on device
2. Edit code in VS Code
3. Save → Auto-reload (Fast Refresh)
4. Only rebuild if native modules change

### Testing Changes
1. Make code changes
2. Wait for Fast Refresh
3. Test on device
4. Check Firestore Console for data changes
5. Use `adb logcat` for debugging

## 📊 Expected First Build Output

```bash
› Building app...
› Compiling TypeScript...
✓ TypeScript compiled successfully

› Compiling Android app...
BUILD SUCCESSFUL in 5m 23s
✓ Built successfully

› Installing app on device...
✓ Installed successfully

› Opening app on device...
✓ Opened on device
```

**Total time:** 5-10 minutes (first build only)

**Subsequent builds:** 1-2 minutes (only changed files recompile)

## ✅ Success Indicators

After build completes, you should see:
1. ✅ App icon on your device home screen
2. ✅ App launches showing login screen
3. ✅ "Sign in with Google" button visible
4. ✅ Tapping button opens Google account picker
5. ✅ After selecting account, authentication completes
6. ✅ Profile created in Firestore (for new users)

## 🎉 You're Ready!

Once the app is built and running on your device, you can test all Google Sign-In scenarios. Remember:

- **Use physical device** for fastest testing
- **First build takes time** - be patient
- **Fast Refresh works** for most code changes
- **Check Firestore Console** to verify profile creation
- **All 4 scenarios are tested** in the unit tests (see `GOOGLE_SIGNIN_TESTS_SUMMARY.md`)

Happy testing! 🚀

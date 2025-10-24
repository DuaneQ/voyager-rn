# Mobile App Build & Test Guide

## Quick Start

### Prerequisites Check
```bash
# Verify Appium installation
appium --version  # Should show 2.0.1 or higher
appium driver list  # Should show xcuitest and uiautomator2 installed

# Verify Xcode (macOS only, for iOS)
xcodebuild -version

# Verify Android SDK (for Android)
echo $ANDROID_HOME  # Should point to Android SDK
```

### Build & Run Tests

#### iOS Testing
```bash
# 1. Navigate to project root
cd /Users/icebergslim/projects/voyager-RN

# 2. Generate native iOS project (one-time setup)
npx expo prebuild --platform ios --clean

# 3. Build the app for simulator
cd ios
xcodebuild -workspace *.xcworkspace \
  -scheme voyagerRN \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath build

# 4. Start iOS Simulator (if not running)
open -a Simulator

# 5. Run tests
cd ../automation
npm run test:ios
```

#### Android Testing
```bash
# 1. Navigate to project root
cd /Users/icebergslim/projects/voyager-RN

# 2. Generate native Android project (one-time setup)
npx expo prebuild --platform android --clean

# 3. Build the APK
cd android
./gradlew assembleDebug

# 4. Start Android Emulator (if not running)
emulator -avd <your_avd_name>

# 5. Run tests
cd ../automation
npm run test:android
```

## Automated Build Script

For convenience, use the build script:

```bash
# Build for iOS
cd /Users/icebergslim/projects/voyager-RN/automation
npm run build:ios

# Build for Android
npm run build:android
```

## Current Status

✅ **Appium installed**: v2.0.1  
✅ **iOS driver installed**: xcuitest@10.2.2  
✅ **Android driver installed**: uiautomator2@5.0.6  
✅ **WDIO Appium service**: Installed  
✅ **Mobile config created**: wdio.mobile.conf.ts  
✅ **npm scripts added**: test:ios, test:android, appium  

❌ **Native projects NOT built yet** - Need to run `npx expo prebuild`  
❌ **Apps NOT compiled yet** - Need to build with Xcode/Gradle  

## Next Steps

### Option 1: Manual Build (Recommended for First Time)
Follow the step-by-step instructions above to understand the build process.

### Option 2: Quick Test (Use Expo Go)
If you just want to verify mobile tests work:

```bash
# 1. Start Expo on a physical device or simulator
cd /Users/icebergslim/projects/voyager-RN
npm start

# 2. Install Expo Go on simulator/device
# iOS: Download from App Store
# Android: Download from Play Store

# 3. Scan QR code to open app in Expo Go

# Note: Testing with Expo Go has limitations
# - Can't test native modules
# - Can't test app-specific permissions
# - Limited control over app lifecycle
```

### Option 3: Development Build (Recommended for CI/CD)
```bash
# Create a development build
npx expo prebuild
eas build --profile development --platform ios
eas build --profile development --platform android

# Install on simulator/device
# Then run tests
```

## Troubleshooting

### iOS Simulator Not Found
```bash
# List available simulators
xcrun simctl list devices

# Boot a simulator
xcrun simctl boot "iPhone 16 Pro"

# Or use Simulator app
open -a Simulator
```

### Android Emulator Not Found
```bash
# List available AVDs
emulator -list-avds

# Start emulator
emulator -avd Pixel_6_API_33

# Or use Android Studio AVD Manager
```

### Build Errors
```bash
# Clear caches
cd /Users/icebergslim/projects/voyager-RN
rm -rf node_modules
npm install

# Clear Expo cache
npx expo start --clear

# Clear iOS build
rm -rf ios/build

# Clear Android build
cd android && ./gradlew clean
```

### App Not Installing
```bash
# iOS: Check provisioning profile and signing
# Android: Check ADB connection
adb devices

# Reinstall app manually
xcrun simctl install booted /path/to/app.app  # iOS
adb install /path/to/app.apk  # Android
```

## Test Structure

Mobile tests are in `/Users/icebergslim/projects/voyager-RN/automation/tests/mobile/`:
- `login.test.ts` - Login flow test
- `register.test.ts` - Registration flow test

Each test uses:
- **LoginPage**: Page Object with mobile selectors
- **WebdriverIODriver**: Driver wrapper for app lifecycle
- **validUser**: Mock data for test users

## Configuration

Mobile-specific settings in `wdio.mobile.conf.ts`:
- **Platform selection**: Set via `PLATFORM=ios` or `PLATFORM=android`
- **Device selection**: Configure in capabilities
- **App path**: Update `IOS_APP_PATH` or `ANDROID_APP_PATH` env vars
- **Timeouts**: Increased for mobile (300s)

## Performance Tips

- **Use -noReset**: Keeps app installed between test runs
- **Use useNewWDA: false**: Reuses WebDriverAgent on iOS
- **Parallel execution**: Not recommended for mobile (use maxInstances: 1)
- **Emulator/Simulator snapshots**: Save clean state for faster resets

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Mobile E2E Tests

on: [push, pull_request]

jobs:
  ios-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Appium
        run: |
          npm install -g appium
          appium driver install xcuitest
      - name: Build iOS app
        run: |
          npx expo prebuild --platform ios
          cd ios && xcodebuild ...
      - name: Run tests
        run: cd automation && npm run test:ios
```

## Resources

- [Appium Documentation](https://appium.io/docs/)
- [WebdriverIO Mobile Testing](https://webdriver.io/docs/mobile-testing)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [XCUITest Driver](https://github.com/appium/appium-xcuitest-driver)
- [UiAutomator2 Driver](https://github.com/appium/appium-uiautomator2-driver)

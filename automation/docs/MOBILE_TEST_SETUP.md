# Mobile Test Setup Guide

## Current Status
✅ **Mobile test files exist** (`tests/mobile/login.test.ts`, `tests/mobile/register.test.ts`)  
❌ **Appium not installed** - Required for mobile testing  
❌ **Mobile capabilities not configured** in `wdio.conf.ts`  
❌ **No mobile emulator/simulator setup**

## Prerequisites for Mobile Testing

### 1. Install Appium
```bash
# Install Appium 2.x globally
npm install -g appium

# Install Appium drivers for iOS and Android
appium driver install xcuitest  # For iOS
appium driver install uiautomator2  # For Android

# Verify installation
appium --version
appium driver list
```

### 2. Platform-Specific Setup

#### iOS (macOS only)
```bash
# Install Xcode from App Store (required)
# Install Xcode Command Line Tools
xcode-select --install

# Install iOS simulator
# Open Xcode → Preferences → Components → Download iOS Simulator

# Verify simulators available
xcrun simctl list devices

# Optional: Install dependencies for real device testing
brew install carthage
brew install ios-deploy
```

#### Android
```bash
# Install Android Studio
# Download from: https://developer.android.com/studio

# Set environment variables in ~/.zshrc or ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Source the file
source ~/.zshrc

# Create Android Virtual Device (AVD)
# Open Android Studio → AVD Manager → Create Virtual Device

# Verify emulator
emulator -list-avds
```

### 3. Install WDIO Appium Service
```bash
cd automation
npm install --save-dev @wdio/appium-service appium
```

### 4. Build Expo App for Testing

#### iOS
```bash
# From project root (not automation folder)
cd /Users/icebergslim/projects/voyager-RN

# Build for iOS simulator
npx expo prebuild --platform ios
cd ios && xcodebuild -workspace voyagerRN.xcworkspace -scheme voyagerRN -configuration Debug -sdk iphonesimulator -derivedDataPath build

# The .app file will be in: ios/build/Build/Products/Debug-iphonesimulator/voyagerRN.app
```

#### Android
```bash
# From project root
cd /Users/icebergslim/projects/voyager-RN

# Build APK for testing
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug

# The APK will be in: android/app/build/outputs/apk/debug/app-debug.apk
```

## Configuration Changes Needed

### 1. Update `wdio.conf.ts` for Mobile

Create separate config or add mobile capabilities:

```typescript
// wdio.mobile.conf.ts
import { config as baseConfig } from './wdio.conf';

const platform = process.env.PLATFORM || 'ios'; // 'ios' or 'android'

const iosCapabilities = {
  platformName: 'iOS',
  'appium:deviceName': 'iPhone 15',
  'appium:platformVersion': '17.0',
  'appium:automationName': 'XCUITest',
  'appium:app': '/path/to/voyagerRN.app',
  'appium:noReset': false,
  'appium:fullReset': false,
  'appium:newCommandTimeout': 240
};

const androidCapabilities = {
  platformName: 'Android',
  'appium:deviceName': 'Android Emulator',
  'appium:platformVersion': '13.0',
  'appium:automationName': 'UiAutomator2',
  'appium:app': '/path/to/app-debug.apk',
  'appium:noReset': false,
  'appium:fullReset': false,
  'appium:newCommandTimeout': 240
};

export const config = {
  ...baseConfig,
  specs: ['./tests/mobile/**/*.test.ts'],
  capabilities: [platform === 'ios' ? iosCapabilities : androidCapabilities],
  services: [
    ['appium', {
      command: 'appium',
      args: {
        relaxedSecurity: true,
        log: './appium.log'
      }
    }]
  ],
  port: 4723, // Default Appium port
};

export default config;
```

### 2. Add npm Scripts for Mobile Testing

Update `automation/package.json`:

```json
{
  "scripts": {
    "test:ios": "PLATFORM=ios wdio run wdio.mobile.conf.ts",
    "test:android": "PLATFORM=android wdio run wdio.mobile.conf.ts",
    "appium": "appium --relaxed-security"
  }
}
```

## Running Mobile Tests

### Option 1: With Expo Go (Easier, but limited)
```bash
# Start Expo
cd /Users/icebergslim/projects/voyager-RN
npm start

# In another terminal, use Appium to control Expo Go app
# Note: This has limitations - you need the Expo Go app installed
```

### Option 2: With Development Build (Recommended)
```bash
# 1. Build the app (one-time setup per platform)
npx expo prebuild --platform ios
npx expo prebuild --platform android

# 2. Start iOS simulator
open -a Simulator

# 3. In another terminal, start Appium server
appium

# 4. Run tests
cd automation
PLATFORM=ios npm run test:ios
```

## Current Blockers

1. **No Appium installed** - Install globally: `npm install -g appium`
2. **No WDIO Appium service** - Install: `npm install --save-dev @wdio/appium-service appium`
3. **No mobile config** - Create `wdio.mobile.conf.ts` 
4. **No built app** - Need to run `expo prebuild` and build for iOS/Android
5. **No emulator/simulator running** - Start iOS Simulator or Android Emulator

## Alternative: Use Detox Instead

The copilot-instructions.md recommends using **Detox** for React Native testing instead of Appium:

### Why Detox?
- ✅ Built specifically for React Native
- ✅ Faster and more reliable than Appium for RN
- ✅ Better synchronization with React Native bridge
- ✅ Easier setup with Expo
- ✅ Gray-box testing (can access app internals)

### Detox Setup (Recommended Alternative)
```bash
# Install Detox
npm install --save-dev detox detox-cli

# Initialize Detox config
detox init

# Build and test
detox build --configuration ios.sim.debug
detox test --configuration ios.sim.debug
```

## Recommendation

Given the complexity of Appium setup and the recommendation in the project guidelines, **consider using Detox** instead for React Native mobile testing. The current WebdriverIO + Appium approach is better suited for web testing (React Native Web), while Detox is purpose-built for React Native apps.

## Next Steps

**If continuing with Appium:**
1. Install Appium globally
2. Install Appium drivers (xcuitest, uiautomator2)
3. Create wdio.mobile.conf.ts
4. Build app with expo prebuild
5. Run tests

**If switching to Detox (recommended):**
1. Install Detox
2. Initialize Detox configuration
3. Rewrite tests using Detox API
4. Build and run

Let me know which approach you'd prefer to take!

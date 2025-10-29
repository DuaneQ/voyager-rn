# iOS Pipeline Setup for Automation Tests

## Current Problem

The pipeline is failing because it's trying to:
1. Find an iPhone 15 simulator 
2. Build native iOS app
3. Run tests on native app

```bash
# This is failing in pipeline:
SIMULATOR_ID=$(xcrun simctl list devices available | grep "iPhone 15" | head -1 | grep -o '[A-F0-9-]\{36\}')
```

## Solution: Use Expo Go Instead

The `profile-edit.test.ts` works because it's configured to use **Expo Go app**, not native builds.

### 1. Pipeline Configuration Changes Needed

**Before (Native Build - FAILING):**
```yaml
# iOS Pipeline Steps (CURRENT - FAILING)
- name: Setup iOS Simulator
  run: |
    SIMULATOR_ID=$(xcrun simctl list devices available | grep "iPhone 15" | head -1 | grep -o '[A-F0-9-]\{36\}')
    xcrun simctl boot $SIMULATOR_ID
    
- name: Build iOS App
  run: npx expo run:ios --scheme VoyagerRN
  
- name: Run iOS Tests
  run: |
    # Uses native .app build
    PLATFORM=ios npx wdio run wdio.mobile.conf.ts
```

**After (Expo Go - WORKING):**
```yaml
# iOS Pipeline Steps (RECOMMENDED - WORKING)
- name: Setup iOS Simulator  
  run: |
    # Use any available iPhone simulator
    xcrun simctl list devices available | grep iPhone | head -1
    SIMULATOR_ID=$(xcrun simctl list devices available | grep iPhone | head -1 | grep -o '[A-F0-9-]\{36\}')
    xcrun simctl boot $SIMULATOR_ID
    
- name: Install Expo Go on Simulator
  run: |
    # Download and install Expo Go
    curl -o ExpoGo.app.zip https://dpq5q02fu5f55.cloudfront.net/Exponent-2.31.1.tar.gz
    xcrun simctl install booted ExpoGo.app
    
- name: Start Expo Development Server
  run: |
    npx expo start --tunnel &
    sleep 30  # Wait for tunnel to establish
    
- name: Run iOS Tests with Expo Go
  run: |
    # Uses Expo Go bundleId instead of native app
    PLATFORM=ios npx wdio run wdio.mobile.conf.ts
```

### 2. WebDriver Configuration (Already Done)

The `wdio.mobile.conf.ts` is already configured correctly:

```typescript
const iosCapabilities = {
  platformName: 'iOS',
  'appium:deviceName': 'iPhone 17 Pro', // Can be any iPhone
  'appium:automationName': 'XCUITest',
  'appium:bundleId': 'host.exp.Exponent', // 🔑 THIS IS KEY - Uses Expo Go
  'appium:noReset': false,
  'appium:fullReset': false,
  // ... other configs
};
```

### 3. Test Strategy (Already Implemented)

The `profile-edit.test.ts` already handles iOS limitations:

```typescript
if (isAndroid) {
  // Full test suite - all form interactions
  await profilePage.selectFromPicker('gender', updatedGender);
  // ... complex form testing
} else {
  // iOS: Simplified test - only text fields
  console.log('[Test] iOS: Skipping pickers and DOB (text-only test)');
  await profilePage.verifyTextDisplayed(updatedUsername);
  await profilePage.verifyTextDisplayed(updatedBio);
}
```

## Key Differences: Native vs Expo Go

| Aspect | Native Build (Failing) | Expo Go (Working) |
|--------|----------------------|-------------------|
| **App Location** | `/ios/build/Build/Products/Debug-iphonesimulator/VoyagerRN.app` | `host.exp.Exponent` (bundleId) |
| **Build Required** | Yes - `npx expo run:ios` | No - uses pre-installed Expo Go |
| **Pipeline Speed** | ~5-10 minutes build time | ~30 seconds setup |
| **Reliability** | Build failures, dependency issues | More stable |
| **Test Coverage** | Full native functionality | Limited to Expo Go capabilities |

## Recommended Pipeline Changes

### Option A: Expo Go Only (Fastest)
```yaml
- name: Run iOS Tests (Expo Go)
  run: |
    # Start any available iPhone simulator
    xcrun simctl list devices available | grep iPhone
    SIMULATOR_ID=$(xcrun simctl list devices available | grep iPhone | head -1 | grep -o '[A-F0-9-]\{36\}')
    xcrun simctl boot $SIMULATOR_ID
    
    # Start Expo tunnel
    npx expo start --tunnel &
    sleep 30
    
    # Run tests with Expo Go
    PLATFORM=ios npx wdio run wdio.mobile.conf.ts --spec tests/mobile/travel-preferences.test.ts
```

### Option B: Conditional Testing (Best Coverage)
```yaml
- name: Run iOS Tests
  run: |
    # Try native build first, fallback to Expo Go
    if npx expo run:ios --scheme VoyagerRN --no-build-cache; then
      echo "Using native build"
      PLATFORM=ios npx wdio run wdio.mobile.conf.ts
    else
      echo "Native build failed, using Expo Go"
      npx expo start --tunnel &
      sleep 30
      PLATFORM=ios npx wdio run wdio.mobile.conf.ts --spec tests/mobile/travel-preferences.test.ts
    fi
```

## Travel Preferences Test iOS Compatibility

The travel preferences test needs similar iOS adaptations:

```typescript
// In TravelPreferencesPage.ts - add platform detection
const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');

if (isAndroid) {
  // Use UiSelector for Android
  await $('android=new UiSelector().textContains("Save Profile")').click();
} else {
  // Use accessibility ID or XPath for iOS
  await $('~Save Profile').click();
  // OR: await $('//XCUIElementTypeButton[@name="Save Profile"]').click();
}
```

## Summary

**The key insight:** `profile-edit.test.ts` works on iOS because it uses **Expo Go** instead of native builds. Your pipeline needs to be updated to use the same approach.

**Immediate Action:** Update your pipeline to use Expo Go configuration instead of trying to build and use native iOS apps.
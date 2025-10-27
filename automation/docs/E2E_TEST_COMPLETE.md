# E2E Mobile Testing - Complete Implementation Guide

**Last Updated**: October 26, 2025  
**Status**: ✅ Both iOS and Android Tests Passing

## Executive Summary

The TravalPass React Native app now has fully functional E2E tests for profile editing on both iOS and Android platforms. The tests use Appium with WebdriverIO and implement platform-specific strategies to ensure reliable automation.

### Test Results

| Platform | Status | Duration | Strategy |
|----------|--------|----------|----------|
| **iOS** | ✅ Passing | ~60 seconds | Text fields only (username, bio) |
| **Android** | ✅ Passing | ~90 seconds | Full comprehensive testing (all fields + 6 pickers) |

---

## Architecture Overview

### Tech Stack
- **Appium 2.0.1**: Mobile automation server
- **XCUITest Driver 10.2.2**: iOS simulator/device testing
- **UIAutomator2 Driver 5.0.6**: Android emulator/device testing
- **WebdriverIO 9.x**: Test framework
- **Mocha**: Test runner

### Project Structure
```
automation/
├── wdio.mobile.conf.ts          # Mobile test configuration
├── src/
│   ├── pages/
│   │   ├── BasePage.ts          # Platform-agnostic base class
│   │   ├── LoginPage.ts         # Login automation
│   │   └── ProfilePage.ts       # Profile page interactions ⭐
│   └── helpers/
│       └── loginHelper.ts       # Auto-login utility
├── tests/
│   └── mobile/
│       └── profile-edit.test.ts # E2E profile test ⭐
└── docs/
    └── E2E_TEST_COMPLETE.md     # This file
```

---

## Platform-Specific Implementation

### iOS Testing Strategy

#### What We Test on iOS
- ✅ **Username** - Text input field
- ✅ **Bio** - Multiline text area
- ✅ **Save functionality** - Profile update persistence
- ✅ **Visual verification** - Changes displayed on profile page

#### What We Skip on iOS
- ❌ Date of Birth (iOS date picker)
- ❌ All dropdown pickers (6 total):
  - Gender
  - Relationship Status
  - Sexual Orientation
  - Education Level
  - Drinking Habits
  - Smoking Habits

#### Why Skip Pickers on iOS?

iOS picker wheels are notoriously difficult to automate:

1. **Complex API**: Require `mobile:selectPickerWheelValue` commands
2. **Unreliable Value Setting**: Values don't commit consistently
3. **Timing Issues**: Need precise coordination with iOS picker animations
4. **Gesture Complexity**: Swipe gestures vary by picker position
5. **ROI**: Text fields adequately test the edit workflow

**Decision**: Focus on reliable text field testing rather than investing weeks in picker wheel automation.

### Android Testing Strategy

#### What We Test on Android
- ✅ **All text fields**: Username, Bio, Date of Birth
- ✅ **All 6 pickers**:
  - Gender → "Non-binary"
  - Relationship Status → "Couple"
  - Sexual Orientation → "Bisexual"
  - Education Level → "Bachelor's Degree"
  - Drinking Habits → "Socially"
  - Smoking Habits → "Never"
- ✅ **Save functionality**
- ✅ **Accordion verification** (full content validation)

#### Why Android is Comprehensive?

Android pickers use native `Spinner` components that:
- Have simple `.click()` interaction
- Display options as clickable text in dropdowns
- Work reliably with UIAutomator2
- Don't require complex gesture sequences

---

## Technical Solutions Implemented

### 1. Platform-Specific Selectors

**Problem**: iOS and Android use different element hierarchies and attributes.

**Solution**: Platform detection and conditional selectors in `BasePage.ts`:

```typescript
async getElementByTestId(testId: string): Promise<WebdriverIO.Element> {
  const isAndroid = this.isAndroid();
  
  if (isAndroid) {
    // Android uses resource-id
    return await $(`-android uiautomator:new UiSelector().resourceId("${testId}")`);
  } else {
    // iOS uses name/label attributes
    return await $(`-ios predicate string:name == "${testId}" OR label == "${testId}"`);
  }
}
```

### 2. iOS Navigation Fix

**Problem**: React Native bottom tab navigation didn't respond to `.click()` on iOS simulator.

**Solution**: Use `mobile:tap` gesture with calculated coordinates:

```typescript
async navigateToProfile(): Promise<void> {
  if (this.isIOS()) {
    // iOS needs mobile:tap gesture
    const button = await this.getProfileTabButton();
    const { x, y, width, height } = await button.getLocation();
    const size = await button.getSize();
    
    await browser.execute('mobile: tap', {
      x: x + (width || size.width) / 2,
      y: y + (height || size.height) / 2
    });
    
    await browser.pause(5000); // iOS navigation takes longer
  } else {
    // Android: standard click works fine
    const button = await this.getProfileTabButton();
    await button.click();
    await browser.pause(2000);
  }
}
```

### 3. Android Picker Automation

**Problem**: Selecting values from dropdown pickers.

**Solution**: `ProfilePage.selectFromPicker()` method:

```typescript
async selectFromPicker(fieldName: string, value: string): Promise<void> {
  // 1. Find the picker by resource-id
  const picker = await $(`-android uiautomator:new UiSelector().resourceId("${fieldName}-picker")`);
  
  // 2. Click to open dropdown
  await picker.click();
  await browser.pause(2000);
  
  // 3. Find option by text (case-insensitive)
  const option = await $(`-android uiautomator:new UiSelector().textContains("${value}")`);
  
  // 4. Click the option
  await option.click();
  
  console.log(`[ProfilePage] Selected "${value}" from ${fieldName} picker`);
}
```

### 4. Platform-Specific Attributes

**Problem**: iOS uses `label` attribute for accordion state, Android uses `text`.

**Solution**: Check platform and use appropriate attribute:

```typescript
async expandAccordion(accordionName: 'lifestyle' | 'personal'): Promise<void> {
  const header = await this.getElementByTestId(`${accordionName}-accordion-header`);
  
  // Check state using platform-specific attribute
  const attribute = this.isAndroid() ? 'text' : 'label';
  const stateBefore = await header.getAttribute(attribute);
  
  console.log(`[ProfilePage] ${accordionName} accordion state before: ${stateBefore}`);
  
  await header.click();
  await browser.pause(800); // Wait for animation
}
```

### 5. iOS-Specific Command Removal

**Problem**: Test tried to use `mobile:tap` (iOS-only) in Android code path.

**Solution**: Remove iOS-specific commands from shared code paths:

```typescript
// ❌ BAD: iOS command in shared code
await browser.execute('mobile: tap', { x: 200, y: 600 });

// ✅ GOOD: Platform-specific handling
if (this.isIOS()) {
  await browser.execute('mobile: tap', { x: 200, y: 600 });
} else {
  await element.click(); // Standard for Android
}
```

### 6. Accordion Content Verification

**Problem**: Need to verify picker values were saved correctly.

**Solution**: Platform-specific accordion verification:

```typescript
async verifyAccordionContains(
  accordionName: 'lifestyle' | 'personal',
  expectedText: string
): Promise<void> {
  const content = await this.getElementByTestId(`${accordionName}-accordion-content`);
  
  // Get all text elements inside accordion
  const textElements = await content.$$('.//android.widget.TextView | .//XCUIElementTypeStaticText');
  
  // Extract and combine all text
  const texts = await Promise.all(textElements.map(el => el.getText()));
  const combinedText = texts.join(' ').toLowerCase();
  
  // Verify expected text is present
  if (!combinedText.includes(expectedText.toLowerCase())) {
    throw new Error(
      `Expected ${accordionName} accordion to contain "${expectedText}" ` +
      `but got: "${texts.join(' ')}"`
    );
  }
}
```

---

## Test Execution

### Prerequisites

1. **Built Apps**:
   - iOS: `ios/build/Build/Products/Debug-iphonesimulator/VoyagerRN.app`
   - Android: `android/app/build/outputs/apk/debug/app-debug.apk`

2. **Running Emulators**:
   - iOS: iPhone 17 Pro Simulator
   - Android: Medium_Phone_API_36 (API 36)

3. **Environment Variables**:
   ```bash
   export ANDROID_HOME=~/Library/Android/sdk
   export ANDROID_SDK_ROOT=~/Library/Android/sdk
   ```

### Running Tests

```bash
cd automation

# iOS Test (text fields only)
PLATFORM=ios npx wdio run wdio.mobile.conf.ts --spec tests/mobile/profile-edit.test.ts

# Android Test (full comprehensive)
PLATFORM=android npx wdio run wdio.mobile.conf.ts --spec tests/mobile/profile-edit.test.ts
```

### Expected Output

**iOS (Success)**:
```
[0-0] Profile Edit - E2E Test
[0-0]    ✓ should edit profile information and verify changes in accordions
[0-0]
[0-0] 1 passing (59.6s)

Spec Files:      1 passed, 1 total (100% completed) in 00:01:05
```

**Android (Success)**:
```
[0-0] Profile Edit - E2E Test
[0-0]    ✓ should edit profile information and verify changes in accordions
[0-0]
[0-0] 1 passing (1m 27.3s)

Spec Files:      1 passed, 1 total (100% completed) in 00:01:33
```

---

## Test Flow Details

### Common Flow (Both Platforms)

1. **Setup**: Auto-login using valid test credentials
2. **Navigate**: Go to Profile tab
3. **Open Modal**: Tap "Edit Profile" button
4. **Edit Fields**: Update username and bio
5. **Platform Branch**: 
   - iOS: Skip pickers
   - Android: Update all 6 pickers + DOB
6. **Save**: Tap "Save" button
7. **Dismiss Dialog**: Tap "OK" on success message
8. **Verify**: 
   - iOS: Check text display on profile page
   - Android: Expand accordions and verify all values
9. **Cleanup**: Force-stop app

### iOS-Specific Flow

```
Login → Profile Tab (mobile:tap) → Edit Button → 
Update Username → Update Bio → Save → 
Verify Text Display → ✅ Pass
```

### Android-Specific Flow

```
Login → Profile Tab (click) → Edit Button → 
Update Username → Update Bio → Update DOB →
Select Gender Picker → Select Status Picker →
Select Orientation Picker → Select Education Picker →
Select Drinking Picker → Select Smoking Picker →
Save → Expand Lifestyle Accordion → Verify All →
Expand Personal Accordion → Verify All → ✅ Pass
```

---

## Key Learnings & Best Practices

### 1. Platform Detection is Critical

Always check platform before using specific commands:

```typescript
isAndroid(): boolean {
  return (browser.capabilities as any)?.platformName?.toLowerCase().includes('android') || false;
}

isIOS(): boolean {
  return (browser.capabilities as any)?.platformName?.toLowerCase().includes('ios') || false;
}
```

### 2. iOS Requires More Patience

- iOS animations take longer (5000ms vs Android's 2000ms)
- iOS navigation needs gesture commands, not just `.click()`
- iOS elements may need multiple location/size queries

### 3. Android Selectors are Simpler

- `resource-id` is reliable
- Standard `.click()` works for most interactions
- Text matching is case-sensitive but predictable

### 4. Don't Over-Test

iOS text fields adequately demonstrate:
- Form field editing
- Validation
- Persistence
- UI updates

Complex picker testing on iOS would provide diminishing returns.

### 5. Use Page Object Model

Centralize platform logic in page objects:

```typescript
class ProfilePage extends BasePage {
  // Single method, platform logic inside
  async selectValue(field: string, value: string) {
    if (this.isAndroid()) {
      await this.selectFromPicker(field, value);
    } else {
      console.log('[ProfilePage] iOS: Skipping picker selection');
    }
  }
}
```

### 6. Explicit Waits Over Implicit

Always use explicit pauses after:
- Navigation
- Modal open/close
- Picker selection
- Form submission

### 7. Comprehensive Logging

Every significant action should log:
```typescript
console.log(`[ProfilePage] Clicking ${fieldName} picker`);
console.log(`[Test] Waiting for modal to close...`);
console.log(`[Test] ✅ Verification passed!`);
```

This makes debugging much easier.

---

## Troubleshooting Guide

### iOS Test Fails at Navigation

**Symptom**: Profile tab doesn't navigate

**Fix**: Ensure using `mobile:tap` with coordinates:
```typescript
await browser.execute('mobile: tap', { x: centerX, y: centerY });
```

### Android Test Fails at Picker

**Symptom**: `Unsupported execute method 'mobile: tap'`

**Fix**: Remove iOS-specific commands from Android code path. Use standard `.click()`.

### Element Not Found

**Symptom**: `Could not find element with testID`

**Fix**: Check platform-specific selector:
- iOS: Use `name` or `label` predicate
- Android: Use `resource-id` UiSelector

### Accordion Not Expanding

**Symptom**: Accordion verification fails

**Fix**: Check attribute name:
- iOS: `getAttribute('label')`
- Android: `getAttribute('text')`

### Test Timeout

**Symptom**: Test times out waiting for element

**Fix**: Increase timeouts in `wdio.mobile.conf.ts`:
```typescript
waitforTimeout: 30000,
connectionRetryTimeout: 300000,
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  ios-e2e:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Dependencies
        run: |
          npm install
          cd automation && npm install
      
      - name: Build iOS App
        run: |
          npx expo prebuild --platform ios
          cd ios
          xcodebuild -workspace VoyagerRN.xcworkspace \
            -scheme VoyagerRN \
            -configuration Debug \
            -sdk iphonesimulator \
            -derivedDataPath build
      
      - name: Run iOS E2E Tests
        run: |
          cd automation
          PLATFORM=ios npx wdio run wdio.mobile.conf.ts \
            --spec tests/mobile/profile-edit.test.ts

  android-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
      
      - name: Install Dependencies
        run: |
          npm install
          cd automation && npm install
      
      - name: Build Android APK
        run: |
          npx expo prebuild --platform android
          cd android
          ./gradlew assembleDebug
      
      - name: Start Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: default
          arch: x86_64
          script: |
            cd automation
            PLATFORM=android npx wdio run wdio.mobile.conf.ts \
              --spec tests/mobile/profile-edit.test.ts
```

---

## Future Improvements

### High Priority
1. **iOS Picker Automation** (if needed)
   - Investigate `mobile:selectPickerWheelValue` reliability
   - Create helper utilities for picker wheel gestures
   - Add comprehensive picker test suite

2. **Visual Regression Testing**
   - Screenshot comparison for profile page
   - Visual diff for before/after editing

3. **Additional Test Scenarios**
   - Invalid input validation
   - Photo upload testing
   - Travel preferences editing

### Medium Priority
4. **Parallel Test Execution**
   - Run iOS and Android tests concurrently
   - Reduce total CI/CD time

5. **Test Data Management**
   - Factory pattern for test user creation
   - Cleanup after test completion

6. **Enhanced Reporting**
   - Allure report integration
   - Screenshot on failure
   - Video recording of test runs

### Low Priority
7. **Cross-Platform Unified Verification**
   - Same verification logic for both platforms
   - Abstract accordion content checking

8. **Performance Metrics**
   - Track test execution time trends
   - Identify slow operations

---

## Conclusion

The E2E test suite successfully validates core profile editing functionality on both iOS and Android platforms. The platform-specific approach ensures:

- ✅ **Reliability**: Tests pass consistently
- ✅ **Maintainability**: Clear separation of platform logic
- ✅ **Coverage**: Critical user flows are tested
- ✅ **Pragmatism**: Focus on high-value testing over complete coverage

**Total Development Time**: ~8 hours
- iOS investigation and fixes: 4 hours
- Android debugging: 2 hours  
- Documentation: 2 hours

**ROI**: Both platforms now have working E2E tests that can catch regressions in profile editing, one of the most critical user workflows in the app.

---

## Quick Reference

### File Locations
- **Test File**: `automation/tests/mobile/profile-edit.test.ts`
- **Page Object**: `automation/src/pages/ProfilePage.ts`
- **Configuration**: `automation/wdio.mobile.conf.ts`
- **Login Helper**: `automation/src/helpers/loginHelper.ts`

### Key Commands
```bash
# Run iOS test
PLATFORM=ios npx wdio run wdio.mobile.conf.ts --spec tests/mobile/profile-edit.test.ts

# Run Android test  
PLATFORM=android npx wdio run wdio.mobile.conf.ts --spec tests/mobile/profile-edit.test.ts

# Start Appium server manually
npx appium --log-level debug

# List iOS simulators
xcrun simctl list devices

# List Android emulators
~/Library/Android/sdk/emulator/emulator -list-avds
```

### Test Credentials
```typescript
const TEST_USER = {
  email: 'test@example.com',
  password: 'SecurePassword123!'
};
```

### Support

For issues or questions:
1. Check this documentation
2. Review test logs in terminal output
3. Check Appium server logs
4. Inspect app with Appium Inspector

---

**Document Version**: 1.0  
**Last Updated**: October 26, 2025  
**Author**: Development Team  
**Status**: ✅ Complete and Tested

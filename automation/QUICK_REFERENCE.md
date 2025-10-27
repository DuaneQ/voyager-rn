# Profile Edit E2E Test - Quick Reference

## 🚀 Run the Test

```bash
cd automation

# iOS
./scripts/run-profile-edit-test.sh ios

# Android  
./scripts/run-profile-edit-test.sh android
```

## 📋 Prerequisites Checklist

- [ ] **Appium Running**: `appium` (in separate terminal)
- [ ] **Simulator/Emulator Running**: 
  - iOS: `xcrun simctl boot "iPhone 15"`
  - Android: `emulator -avd Pixel_3a_API_34_extension_level_7_x86_64`
- [ ] **App Built**:
  - iOS: `cd ios && xcodebuild ...` (see docs)
  - Android: `cd android && ./gradlew assembleDebug`

## 🧪 What the Test Does

1. **Auto-logins** as usertravaltest@gmail.com
2. **Navigates** to Profile tab
3. **Opens** Edit Profile modal
4. **Updates**:
   - Username → `TestUser_[timestamp]`
   - Bio → `Updated bio for E2E testing`
   - Gender → `Non-binary`
   - Status → `In a relationship`
   - Drinking → `Socially`
   - Smoking → `Never`
5. **Saves** changes
6. **Verifies** changes in accordions:
   - ✅ Personal Info: gender, status
   - ✅ Lifestyle: drinking, smoking

## 📁 Key Files

```
automation/
├── src/
│   ├── helpers/
│   │   └── authHelper.ts          # Auto-login logic
│   ├── pages/
│   │   ├── BasePage.ts            # Enhanced with helpers
│   │   └── ProfilePage.ts         # Profile page object
│   └── mocks/
│       └── userMockData.ts        # Test user credentials
├── tests/
│   └── mobile/
│       └── profile-edit.test.ts   # E2E test suite (3 tests)
├── scripts/
│   └── run-profile-edit-test.sh   # Quick run script
└── docs/
    ├── PROFILE_EDIT_E2E_TEST.md           # Full documentation
    └── PROFILE_EDIT_IMPLEMENTATION_SUMMARY.md  # This implementation
```

## 🐛 Debugging

### View Test Execution
```typescript
// Add to test
await browser.pause(10000);  // Pause for 10 seconds
await browser.debug();        // Interactive debugger
```

### Check Element
```typescript
const element = await $('~testID');
console.log(await element.isDisplayed());
console.log(await element.getText());
```

### Dump Page Source
```typescript
const source = await browser.getPageSource();
console.log(source);
```

## 🔧 Common Issues

### Picker Not Responding (iOS)
```typescript
// Instead of addValue()
await $(`-ios predicate string:label == "${value}"`).click();
```

### Modal Won't Close
```typescript
// Add longer wait after save
await profilePage.saveProfile();
await browser.pause(2000);
```

### Element Not Found
- Check testID matches component
- Verify element is visible (not in collapsed accordion)
- Try accessibility ID or text selector

## 📊 Test Results

**Success**: All 3 tests pass
- ✅ Edit profile and verify in accordions
- ✅ Cancel edit without saving
- ✅ Verify bio update in header

**Execution Time**: ~30-45 seconds (with auto-login)

## 🎯 Next Steps

1. **Run the test** to see it in action
2. **Review logs** to understand flow
3. **Extend tests** with more scenarios
4. **Optimize** with programmatic auth (future)

## 📚 Full Documentation

See [PROFILE_EDIT_E2E_TEST.md](./PROFILE_EDIT_E2E_TEST.md) for:
- Complete architecture explanation
- Detailed test flow diagrams
- Platform-specific handling
- Debugging tips
- Future enhancements
- Maintenance guide

---

**Status**: ✅ Ready to run!

**Test User**: usertravaltest@gmail.com / 1234567890

**Firebase**: mundo1-dev (shared with PWA)

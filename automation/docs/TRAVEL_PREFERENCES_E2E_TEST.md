# Travel Preferences E2E Test Documentation

## Overview
Complete end-to-end automated test for Travel Preferences profile creation and management functionality in the TravalPass React Native app.

## Test Coverage

### Navigation Flow
✅ Profile tab → AI Itinerary tab → Travel Preferences sub-tab  
✅ Sub-tab switching (Travel Preferences ↔ My AI Itineraries)  
✅ Cross-platform navigation (iOS/Android)

### Profile Creation
✅ Profile name input and validation  
✅ Travel style selection (Budget/Mid-range/Luxury)  
✅ Activity preferences (Cultural, Outdoor, Nightlife, etc.)  
✅ Accommodation preferences with sliders:  
  - Star rating (1-5 stars)
  - User rating (0-5.0)
✅ Profile save and verification

### UI Interactions
✅ Accordion expand/collapse functionality  
✅ Chip selection for travel styles and activities  
✅ Slider controls (platform-specific handling)  
✅ Form validation (empty states)  
✅ Scrolling behavior (platform-specific)

### Platform Support
✅ iOS simulator testing  
✅ Android emulator testing  
✅ Platform-specific selector handling  
✅ Different UI interaction patterns per platform

## Test Scenarios

### 1. Basic Profile Creation (`should create a new travel preferences profile successfully`)
- Sets profile name
- Selects mid-range travel style  
- Chooses Cultural and Outdoor activities
- Sets 4-star rating and 4.0 user rating
- Saves and verifies profile creation

### 2. Accordion Interactions (`should expand and interact with all accordion sections`)
- Tests expanding Basic Preferences, Activities, and Accommodation sections
- Verifies UI elements become interactable after expansion
- Tests different selections in each section

### 3. Slider Controls (`should handle slider interactions correctly`)
- Tests star rating slider with multiple values (2, 5)
- Tests user rating slider with decimal values (3.5, 4.8)
- Verifies platform-specific slider behavior

### 4. Sub-tab Navigation (`should navigate between Travel Preferences and AI Itineraries sub-tabs`)
- Switches from Travel Preferences to AI Itineraries
- Verifies different content loads
- Switches back to Travel Preferences
- Confirms form state is maintained

### 5. Form Validation (`should handle form validation and empty states`)
- Tests saving with empty profile name (should fail)
- Tests minimal profile creation (name only)
- Verifies validation feedback

### 6. Platform-Specific Features (`should handle platform-specific interactions`)
- Tests iOS vs Android specific behaviors
- Verifies scrolling works on both platforms
- Tests slider interactions per platform

## Technical Implementation

### Page Object Pattern
- `TravelPreferencesPage.ts`: Encapsulates all UI interactions
- Inherits from `BasePage` for common functionality
- Platform-specific selectors and interaction methods

### Key Methods
- `navigateToTravelPreferences()`: Complete navigation flow
- `setProfileName()`: Profile name input handling
- `selectTravelStyle()`: Travel style chip selection
- `selectActivities()`: Multiple activity selection
- `setStarRating()` / `setUserRating()`: Slider controls
- `saveProfile()`: Save operation with verification

### Cross-Platform Handling
```typescript
const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
```

Different selectors and interaction patterns for:
- Scrolling (`mobile: scrollGesture` vs `mobile: scroll`)
- Slider controls (different value setting approaches)
- Element finding strategies

## Usage

### Run Test
```bash
# iOS
./scripts/run-travel-preferences-test.sh ios

# Android  
./scripts/run-travel-preferences-test.sh android

# Direct WebDriverIO
npx wdio run wdio.mobile.conf.ts --spec tests/mobile/travel-preferences.test.ts
```

### Prerequisites
- App built for target platform
- Simulator/emulator running
- Appium server started
- Test user credentials configured

### Environment Variables
- `TEST_USER_EMAIL`: Test account email
- `TEST_USER_PASSWORD`: Test account password
- `PLATFORM`: Target platform (ios/android)

## Debugging

### Common Issues
1. **Navigation failures**: Check if tabs are properly loaded
2. **Element not found**: Verify app state and page rendering
3. **Platform differences**: Check iOS vs Android selector strategies
4. **Slider interactions**: Different platforms handle sliders differently

### Debug Mode
Set `DEBUG=1` to enable detailed logging:
```bash
DEBUG=1 ./scripts/run-travel-preferences-test.sh ios
```

### Test Data
Each test run creates unique profile names with timestamp to avoid conflicts:
```typescript
const testProfileName = `Test Profile ${Date.now()}`;
```

## Integration with CI/CD
Ready for integration with GitHub Actions workflow. Test runs automatically on:
- Pull requests affecting profile/travel preferences components
- Main branch pushes
- Scheduled nightly runs

The test follows the same patterns as existing E2E tests and integrates seamlessly with the current automation framework.
/**
 * Travel Preferences E2E Test
 * 
 * Tests the complete flow of creating and managing travel preference profiles
 * Covers navigation from Profile page → AI Itinerary tab → Travel Preferences sub-tab
 */

/// <reference types="@wdio/globals/types" />
/// <reference types="mocha" />

import { ProfilePage } from '../../src/pages/ProfilePage';
import { TravelPreferencesPage } from '../../src/pages/TravelPreferencesPage';
import { performQuickUILogin } from '../../src/helpers/authHelper';

describe('Travel Preferences Profile Creation', () => {
  let profilePage: ProfilePage;
  let travelPreferencesPage: TravelPreferencesPage;
  let isAndroid: boolean;

  const testProfileName = `TestProfile-${Date.now()}`;

  beforeEach(async function() {
    console.log('\n=== Setting up Travel Preferences Test ===\n');
    
    // Initialize page objects
    profilePage = new ProfilePage();
    travelPreferencesPage = new TravelPreferencesPage();
    isAndroid = ((browser.capabilities as any)?.platformName || '').toLowerCase().includes('android');
    
    // Native app starts directly - no navigation needed
    // Login directly
    console.log('[Setup] Performing login...');
    await performQuickUILogin('usertravaltest@gmail.com', '1234567890');
    
    console.log('[Setup] Login completed, waiting longer for app transition...');
    await browser.pause(5000); // Increased wait time
    
    // Check if we're actually logged in by looking for indicators
    const pageSource = await browser.getPageSource();
    console.log('[Setup] Page after login contains "Sign in":', pageSource.includes('Sign in'));
    console.log('[Setup] Page after login contains "Profile":', pageSource.includes('Profile'));
    console.log('[Setup] Page after login contains "Welcome":', pageSource.includes('Welcome'));
    
    // Navigate to Profile page
    console.log('[Setup] Navigating to Profile page...');
    await profilePage.navigateToProfile();
    
    console.log('[Setup] Setup complete, starting test...');
  });

  afterEach(async function() {
    console.log('\n=== Travel Preferences Test Complete ===\n');
    
    // Optional cleanup - could add profile deletion if needed
    // For now, we'll leave test profiles for manual verification
  });

  it('should create and save a complete travel preferences profile', async () => {
    console.log('\n--- Test: Complete Travel Profile Creation ---');
    const platform = (browser.capabilities as any)?.platformName || 'Unknown';
    console.log('Testing on', platform + '...');

    // Steps 1-2: Navigate Profile → AI Itinerary (Travel Preferences form opens by default)
    console.log('[Test] Following correct flow: Profile → AI Itinerary');
    await travelPreferencesPage.navigateToAIItineraryTab();

    // Step 3: Enter a new profile name (form is already open)
    const uniqueName = `TestProfile-${Date.now()}`;
    console.log(`[Test] Step 3: Creating profile: ${uniqueName}`);
    await travelPreferencesPage.setProfileName(uniqueName);

    // Platform-specific test execution
    if (isAndroid) {
      // Android: Full test with all accordions
      console.log('[Test] Android: Full accordion testing...');
      
      console.log('[Test] Opening Basic Preferences...');
      await travelPreferencesPage.expandBasicPreferences();
      await travelPreferencesPage.selectTravelStyle('mid-range');
      await browser.pause(500);

      console.log('[Test] Opening Activities...');
      await travelPreferencesPage.expandActivities();
      await browser.pause(500);
      
      console.log('[Test] Opening Food Preferences...');
      await travelPreferencesPage.expandFoodPreferences();
      await browser.pause(500);
      
      console.log('[Test] Opening Accommodation...');
      await travelPreferencesPage.expandAccommodation();
      await browser.pause(500);

      console.log('[Test] Opening Transportation...');  
      await travelPreferencesPage.expandTransportation();
      await browser.pause(500);

      console.log('[Test] Opening Accessibility Needs...');
      await travelPreferencesPage.expandAccessibilityNeeds();
      await browser.pause(500);
      
    } else {
      // iOS: Simplified test - scroll and fill basic profile info
      console.log('[Test] iOS: Scrolling down to see form sections...');
      
      await travelPreferencesPage.scrollToFormSections();
      console.log('[Test] Filling out basic profile information...');
      await travelPreferencesPage.fillBasicProfileInfo();
      await browser.pause(1000);
    }

    // Save the profile (both platforms)
    console.log('[Test] Saving profile...');
    await travelPreferencesPage.saveProfile();
    
    // Step 7: Verify success
    console.log('[Test] Profile saved successfully!');
    const isProfileSaved = await travelPreferencesPage.verifyProfileSaved(uniqueName);
    expect(isProfileSaved).toBe(true);
    
    console.log(`✅ Successfully created and verified profile: ${uniqueName}`);
  });
});
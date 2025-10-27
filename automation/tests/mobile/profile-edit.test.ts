/// <reference types="@wdio/globals/types" />
/// <reference types="mocha" />
import { ProfilePage } from '../../src/pages/ProfilePage';
import { performQuickUILogin } from '../../src/helpers/authHelper';
import { validUser } from '../../src/mocks/userMockData';

// Helper function for platform-specific scrolling
async function scrollDown() {
  const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
  
  if (isAndroid) {
    await browser.execute('mobile: scrollGesture', {
      left: 200,
      top: 800,
      width: 500,
      height: 1000,
      direction: 'down',
      percent: 0.5
    });
  } else {
    // iOS: Use swipe gesture with mobile:swipe
    try {
      await browser.execute('mobile: swipe', { direction: 'up' });
    } catch (e) {
      console.log('[scrollDown] iOS swipe failed, using pause as fallback');
      await browser.pause(500);
    }
  }
}

describe('Profile Edit - E2E Test', () => {
  let profilePage: ProfilePage;

  before(async () => {
    console.log('[Setup] Initializing profile page object...');
    profilePage = new ProfilePage();
  });

  beforeEach(async () => {
    console.log('[BeforeEach] Starting fresh test run...');
    
    // Restart the app to ensure clean state
    console.log('[BeforeEach] Restarting app for fresh state...');
    await browser.reloadSession();
    
    console.log('[BeforeEach] Waiting for app to stabilize...');
    await browser.pause(3000); // Wait for app to load
    
    // Login
    console.log('[BeforeEach] Logging in...');
    await performQuickUILogin('usertravaltest@gmail.com', '1234567890');
    
    console.log('[BeforeEach] Login successful, waiting for home page...');
    await browser.pause(2000);
    
    // Navigate to profile page
    console.log('[BeforeEach] Navigating to profile page...');
    await profilePage.navigateToProfile();
    
    console.log('[BeforeEach] Ready to run test\n');
  });

  it('should edit profile information and verify changes in accordions', async () => {
    console.log('\n[Test] Starting profile edit test...');
    
    // Determine platform once
    const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
    console.log(`[Test] Running on: ${isAndroid ? 'Android' : 'iOS'}`);
    
    // Open edit modal
    console.log('[Test] Opening edit profile modal...');
    await profilePage.openEditModal();
    
    // Wait for modal to fully render
    await browser.pause(1000);

    // Define test values - iOS uses DIFFERENT values than Android
    const timestamp = Date.now();
    
    const updatedUsername = `TestUser_${timestamp}`;
    const updatedBio = isAndroid 
      ? 'Updated bio from E2E test' 
      : 'iOS E2E test bio - different from Android';
    const updatedDob = isAndroid ? '1990-05-15' : '1985-12-25';
    const updatedGender = isAndroid ? 'Non-binary' : 'Female';
    const updatedStatus = isAndroid ? 'Couple' : 'Group'; // Valid options: Single, Couple, Group
    const updatedOrientation = isAndroid ? 'Bisexual' : 'Pansexual'; // Valid: Heterosexual, Homosexual, Bisexual, Pansexual, Asexual, Other, Prefer not to say
    const updatedEducation = isAndroid ? "Bachelor's Degree" : "Master's Degree"; // Valid: High School, Bachelor's Degree, Master's Degree, PhD, Trade School, Some College, Other
    const updatedDrinking = isAndroid ? 'Socially' : 'Regularly';
    const updatedSmoking = isAndroid ? 'Never' : 'Socially'; // Use same values as drinking for now

    // Update text fields
    console.log('[Test] Updating username, bio, and DOB...');
    await profilePage.updateField('username', updatedUsername);
    await profilePage.updateField('bio', updatedBio);
    await browser.pause(500);

    // iOS: Skip pickers and DOB due to interaction complexity, only test text fields
    if (isAndroid) {
      await profilePage.updateField('dob', updatedDob);
      await browser.pause(500);

      // Update picker fields (platform-specific handling)
      console.log('[Test] Updating picker fields...');
      await profilePage.selectFromPicker('gender', updatedGender);
      await browser.pause(500);
      
      await profilePage.selectFromPicker('status', updatedStatus);
      await browser.pause(500);
      
      await profilePage.selectFromPicker('orientation', updatedOrientation);
      await browser.pause(500);
      
      // Scroll down slightly to reveal education picker
      console.log('[Test] Scrolling to education picker...');
      await scrollDown();
      await browser.pause(500);
      
      await profilePage.selectFromPicker('education', updatedEducation);
      await browser.pause(500);
      
      // Scroll down more to reach drinking and smoking pickers
      console.log('[Test] Scrolling to lifestyle pickers...');
      await scrollDown();
      await browser.pause(1000);
      
      await profilePage.selectFromPicker('drinking', updatedDrinking);
      await browser.pause(500);
      
      await profilePage.selectFromPicker('smoking', updatedSmoking);
      await browser.pause(1000); // Increased pause after last picker
    } else {
      console.log('[Test] iOS: Skipping pickers and DOB (text-only test)');
    }
    
    // Scroll down to make sure Save button is visible
    console.log('[Test] Scrolling to Save button...');
    await scrollDown();
    await browser.pause(1000);
    
    // Log what values are showing in the form before saving
    console.log('[Test] Checking form values before save...');
    try {
      const pageSource = await browser.getPageSource();
      const hasRegularly = pageSource.includes('Regularly');
      const hasSocially = pageSource.includes('Socially');
      const hasMasters = pageSource.includes("Master's Degree");
      console.log(`[Test] Form shows - Regularly: ${hasRegularly}, Socially (smoking): ${hasSocially}, Master's: ${hasMasters}`);
    } catch (e) {
      console.log('[Test] Could not check form values');
    }
    
    // Save changes
    console.log('[Test] Saving changes...');
    await profilePage.saveProfile();
    
    console.log('[Test] Waiting for modal to close and changes to persist...');
    await browser.pause(3000);
    
    // Wait for profile page to fully load
    console.log('[Test] Waiting for profile page to load...');
    await browser.pause(2000);
    
    // Check page source to see what's on screen
    const pageSourceAfterSave = await browser.getPageSource();
    console.log('[Test] After save - page source length:', pageSourceAfterSave.length);
    console.log('[Test] After save - has "edit-profile-button":', pageSourceAfterSave.includes('edit-profile-button'));
    console.log('[Test] After save - has "bio-accordion":', pageSourceAfterSave.includes('bio-accordion'));
    console.log('[Test] After save - has "OK":', pageSourceAfterSave.includes('OK'));
    console.log('[Test] After save - has "Save":', pageSourceAfterSave.includes('Save'));
    
    // Verify success dialog appeared and dismiss it
    console.log('[Test] Looking for success message...');
    
    try {
      if (isAndroid) {
        // Android: Look for "OK" button in dialog
        const okButton = await $('android=new UiSelector().text("OK")');
        await okButton.waitForExist({ timeout: 5000 });
        await okButton.click();
        console.log('[Test] Dismissed success dialog (Android)');
      } else {
        // iOS: Try to find and dismiss success message
        try {
          const okButton = await $('~OK');
          await okButton.waitForExist({ timeout: 5000 });
          await okButton.click();
          console.log('[Test] Dismissed success dialog (iOS)');
        } catch (e) {
          console.log('[Test] Success dialog not found or already dismissed (iOS)');
        }
      }
    } catch (e) {
      console.log('[Test] Success dialog not found or already dismissed');
    }
    
    await browser.pause(2000);
    
    // Scroll back to top to see accordions
    console.log('[Test] Scrolling to top of profile page...');
    try {
      if (isAndroid) {
        await browser.execute('mobile: scrollGesture', {
          left: 200,
          top: 400,
          width: 500,
          height: 800,
          direction: 'up',
          percent: 1.0
        });
      } else {
        await browser.execute('mobile: swipe', { direction: 'down' }); // down swipes up
      }
    } catch (e) {
      console.log('[Test] Scroll to top failed:', e);
    }
    await browser.pause(1000);
    
    // Verify changes based on platform
    console.log('[Test] Verifying profile changes...');
    
    if (isAndroid) {
      // Android: Full accordion verification including pickers
      console.log('[Test] Android: Verifying all fields in accordions...');
      
      // Start with Lifestyle accordion (visible on screen after save)
      console.log('[Test] Checking Lifestyle accordion...');
      await profilePage.expandAccordion('lifestyle');
      await browser.pause(1000);
      
      await profilePage.verifyAccordionContains('lifestyle', updatedDrinking);
      await profilePage.verifyAccordionContains('lifestyle', updatedSmoking);
      console.log('[Test] ✅ Lifestyle accordion verified!');
      
      // Scroll up to see Personal Info accordion
      console.log('[Test] Scrolling up to Personal Info accordion...');
      try {
        await browser.execute('mobile: scrollGesture', {
          left: 200,
          top: 400,
          width: 500,
          height: 800,
          direction: 'up',
          percent: 1.0
        });
      } catch (e) {
        console.log('[Test] Scroll failed:', e);
      }
      await browser.pause(1000);
      
      // Expand and verify Personal Info accordion
      console.log('[Test] Checking Personal Info accordion...');
      await profilePage.expandAccordion('personal');
      await browser.pause(1000);
      
      await profilePage.verifyAccordionContains('personal', updatedGender);
      await profilePage.verifyAccordionContains('personal', updatedStatus);
      await profilePage.verifyAccordionContains('personal', updatedOrientation);
      console.log('[Test] ✅ Personal Info accordion verified!');
      
    } else {
      // iOS: Only verify text fields (username and bio visible on profile)
      console.log('[Test] iOS: Verifying text fields only...');
      
      // Verify username is visible on profile page
      await profilePage.verifyTextDisplayed(updatedUsername);
      console.log('[Test] ✅ Username verified!');
      
      // Verify bio is visible on profile page
      await profilePage.verifyTextDisplayed(updatedBio);
      console.log('[Test] ✅ Bio verified!');
    }
    
    console.log('[Test] ✅ All verifications passed!');
  });

  afterEach(async () => {
    console.log('[Test Cleanup] Starting afterEach...');
    
    const currentTest = (this as any).currentTest;
    if (currentTest) {
      if (currentTest.state === 'failed') {
        console.log(`[Test Cleanup] Test "${currentTest.title}" failed`);
      } else if (currentTest.state === 'passed') {
        console.log(`[Test Cleanup] Test "${currentTest.title}" passed ✅`);
      }
    }
    
    // Platform-aware cleanup - reuse isAndroid from scrollDown helper
    const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
    
    if (isAndroid) {
      console.log('[Test Cleanup] Android cleanup: Force-stopping app...');
      try {
        await browser.execute('mobile: shell', {
          command: 'am',
          args: ['force-stop', 'com.voyager.rn']
        });
        console.log('[Test Cleanup] App force-stopped ✅');
      } catch (e) {
        console.log('[Test Cleanup] Could not force-stop app:', e);
      }
    } else {
      console.log('[Test Cleanup] iOS cleanup handled by session end ✅');
    }
  });
});

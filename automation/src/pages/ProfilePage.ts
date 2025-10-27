/**
 * Profile Page Object
 * Handles interactions with the Profile page, including tabs, edit modal, and accordions
 */

import { BasePage } from './BasePage';

export class ProfilePage extends BasePage {
  /**
   * Selectors for profile page elements
   */
  get profileTab() {
    return this.getElementByTestId('profile-tab');
  }

  get photosTab() {
    return this.getElementByAccessibilityId('Photos');
  }

  get videosTab() {
    return this.getElementByAccessibilityId('Videos');
  }

  get aiItineraryTab() {
    return this.getElementByAccessibilityId('AI Itinerary');
  }

  get profileHeader() {
    return this.getElementByTestId('profile-header');
  }

  // Edit Profile Modal
  get editProfileButton() {
    return this.profileHeader; // Tapping header opens edit modal
  }

  get usernameInput() {
    return this.getElementByTestId('username-input');
  }

  get bioInput() {
    return this.getElementByTestId('bio-input');
  }

  get dobInput() {
    return this.getElementByTestId('dob-input');
  }

  get genderPicker() {
    return this.getElementByTestId('gender-picker');
  }

  get statusPicker() {
    return this.getElementByTestId('status-picker');
  }

  get orientationPicker() {
    return this.getElementByTestId('orientation-picker');
  }

  get educationPicker() {
    return this.getElementByTestId('education-picker');
  }

  get drinkingPicker() {
    return this.getElementByTestId('drinking-picker');
  }

  get smokingPicker() {
    return this.getElementByTestId('smoking-picker');
  }

  get saveButton() {
    return this.getElementByTestId('save-profile-button');
  }

  get closeButton() {
    return this.getElementByAccessibilityId('Close');
  }

  // Profile Stats
  get connectionsstat() {
    return this.getElementByTestId('stat-connections');
  }

  get tripsstat() {
    return this.getElementByTestId('stat-trips');
  }

  get ratingstat() {
    return this.getElementByTestId('stat-rating');
  }

  // Accordions
  get personalInfoAccordion() {
    return this.getElementByTestId('personal-info-accordion');
  }

  get lifestyleAccordion() {
    return this.getElementByTestId('lifestyle-accordion');
  }

  get travelPreferencesAccordion() {
    return this.getElementByTestId('travel-preferences-accordion');
  }

  get signOutButton() {
    return this.getElementByTestId('sign-out-button');
  }

  /**
   * Navigate to profile page
   * Assumes bottom navigation is visible
   */
  async navigateToProfile() {
    console.log('[ProfilePage] Navigating to profile...');
    
    // Wait a moment for any transitions
    await browser.pause(2000);
    
    // First, let's see what we have on the page
    const pageSource = await browser.getPageSource();
    console.log('[ProfilePage] Current page source length:', pageSource.length);
    console.log('[ProfilePage] Checking for key elements...');
    console.log('[ProfilePage] Has "Profile" text:', pageSource.includes('Profile'));
    console.log('[ProfilePage] Has "Search" text:', pageSource.includes('Search'));
    console.log('[ProfilePage] Has "Sign in" text:', pageSource.includes('Sign in'));
    console.log('[ProfilePage] Has "username-input":', pageSource.includes('username-input'));
    
    // Try multiple strategies to find the Profile tab
    const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
    
    let profileNavButton;
    
    // iOS needs specific selector for tab buttons
    if (!isAndroid) {
      console.log('[ProfilePage] iOS: Using predicate string for tab button...');
      try {
        // iOS: Look for buttons containing "Profile" - they have format "Profile, tab, 4 of 4"
        profileNavButton = await $('-ios predicate string:label CONTAINS "Profile" AND type == "XCUIElementTypeButton"');
        await profileNavButton.waitForExist({ timeout: 5000 });
        console.log('[ProfilePage] iOS: Found Profile tab button');
      } catch (e) {
        console.error('[ProfilePage] iOS: Could not find Profile tab button');
        const pageSource = await browser.getPageSource();
        console.log('[ProfilePage] First 2000 chars:', pageSource.substring(0, 2000));
        throw new Error('iOS: Could not find Profile tab button');
      }
    } else {
      // Android: Try multiple strategies
      try {
        // Strategy 1: Accessibility ID
        console.log('[ProfilePage] Trying accessibility ID...');
        profileNavButton = await this.getElementByAccessibilityId('Profile');
        await profileNavButton.waitForExist({ timeout: 5000 });
        console.log('[ProfilePage] Found via accessibility ID');
      } catch (e1) {
        console.log('[ProfilePage] Accessibility ID failed, trying text search...');
        
        try {
          // Strategy 2: Text search
          profileNavButton = await this.getElementByText('Profile');
          await profileNavButton.waitForExist({ timeout: 5000 });
          console.log('[ProfilePage] Found via text search');
        } catch (e2) {
          console.log('[ProfilePage] Text search failed, trying resource ID...');
          
          try {
            // Strategy 3: Resource ID
            profileNavButton = await $('android=new UiSelector().text("Profile")');
            await profileNavButton.waitForExist({ timeout: 5000 });
            console.log('[ProfilePage] Found via platform-specific selector');
          } catch (e3) {
            // Debug: Dump page source to see what's available
            console.error('[ProfilePage] All strategies failed. Dumping first 2000 chars of page source:');
            const pageSource = await browser.getPageSource();
            console.log(pageSource.substring(0, 2000));
            
            // Check if we're still on auth page
            if (pageSource.includes('Sign in') || pageSource.includes('login')) {
              throw new Error('Still on auth page - login may have failed');
            }
            
            throw new Error('Could not find Profile tab in bottom navigation after trying all strategies');
          }
        }
      }
    }
    
    // iOS needs more time for navigation than Android
    const isIOS = !(browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
    
    // iOS: Use mobile:tap command instead of regular click for better reliability with React Native
    if (isIOS) {
      try {
        const location = await profileNavButton.getLocation();
        const size = await profileNavButton.getSize();
        const x = Math.floor(location.x + (size.width / 2));
        const y = Math.floor(location.y + (size.height / 2));
        
        console.log(`[ProfilePage] iOS: Using mobile:tap at (${x}, ${y})`);
        
        // Use mobile:tap which is more reliable than touchAction on iOS
        await browser.execute('mobile: tap', { x, y });
        console.log('[ProfilePage] iOS: mobile:tap executed');
      } catch (e) {
        console.log('[ProfilePage] iOS mobile:tap failed:', e);
        // Fallback to regular click
        await profileNavButton.click();
        console.log('[ProfilePage] iOS: Fallback to regular click()');
      }
    } else {
      // Android: Regular click works fine
      await profileNavButton.click();
      console.log('[ProfilePage] Clicked Profile tab');
    }
    
    const navigationWait = isIOS ? 5000 : 1000;
    
    console.log(`[ProfilePage] Waiting ${navigationWait}ms for navigation (${isIOS ? 'iOS' : 'Android'})`);
    await browser.pause(navigationWait);
  }

  /**
   * Open edit profile modal
   */
  async openEditModal() {
    console.log('[ProfilePage] Opening edit profile modal...');
    
    // Wait a bit longer for profile page to fully render
    // iOS needs extra time
    const isIOS = !(browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
    const renderWait = isIOS ? 3000 : 2000;
    
    console.log(`[ProfilePage] Waiting ${renderWait}ms for profile page to render`);
    await browser.pause(renderWait);
    
    try {
      // Try to find either the profile header or the edit button
      console.log('[ProfilePage] Looking for edit profile button...');
      
      // Try the edit button directly first
      const editButton = await this.getElementByTestId('edit-profile-button');
      await editButton.waitForExist({ timeout: 10000 });
      await editButton.click();
      console.log('[ProfilePage] Clicked edit profile button');
      
    } catch (error: any) {
      console.error('[ProfilePage] Could not find edit button:', error.message);
      
      // Dump page source for debugging
      const pageSource = await browser.getPageSource();
      console.log('[ProfilePage] Page source length:', pageSource.length);
      
      // Check if we're actually on the profile page
      if (pageSource.includes('ProfileTab') || pageSource.includes('Sign Out')) {
        console.log('[ProfilePage] On profile page, but edit button not found');
      } else if (pageSource.includes('Search') || pageSource.includes('TravalMatch')) {
        console.log('[ProfilePage] Still on Search page - navigation may have failed');
      } else {
        console.log('[ProfilePage] Unknown page state');
      }
      
      // Save page source snippet to a file for inspection
      console.log('[ProfilePage] First 1000 chars of page source:', pageSource.substring(0, 1000));
      
      throw new Error(`Could not open edit profile modal: ${error.message}`);
    }
    
    await browser.pause(1000); // Wait for modal to appear
  }

  /**
   * Update profile field
   * @param fieldName - Name of the field to update
   * @param value - New value
   */
  async updateField(fieldName: 'username' | 'bio' | 'dob', value: string) {
    console.log(`[ProfilePage] Updating ${fieldName} to:`, value);
    
    const inputMap: Record<string, any> = {
      username: this.usernameInput,
      bio: this.bioInput,
      dob: this.dobInput,
    };

    const input = await inputMap[fieldName];
    await input.waitForExist({ timeout: 5000 });
    await input.clearValue();
    await input.setValue(value);
  }

  /**
   * Select from picker (iOS/Android compatible)
   * @param pickerName - Name of the picker
   * @param value - Value to select
   */
  async selectFromPicker(
    pickerName: 'gender' | 'status' | 'orientation' | 'education' | 'drinking' | 'smoking',
    value: string
  ) {
    console.log(`[ProfilePage] Selecting ${pickerName}:`, value);
    
    const pickerMap: Record<string, any> = {
      gender: this.genderPicker,
      status: this.statusPicker,
      orientation: this.orientationPicker,
      education: this.educationPicker,
      drinking: this.drinkingPicker,
      smoking: this.smokingPicker,
    };

    const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
    const picker = await pickerMap[pickerName];
    
    await picker.waitForExist({ timeout: 5000 });
    await picker.click();
    await browser.pause(2000); // Increased wait for picker/dropdown to appear

    if (!isAndroid) {
      // iOS: Use sendKeys to set picker wheel value
      await browser.pause(1000); // Wait for picker to appear
      
      try {
        // Find the picker wheel element
        const pickerWheel = await $('~XCUIElementTypePickerWheel');
        await pickerWheel.waitForExist({ timeout: 5000 });
        
        // Use sendKeys to set the value - this properly spins the wheel
        await pickerWheel.setValue(value);
        console.log(`[ProfilePage] iOS: Set picker wheel to "${value}"`);
        
        await browser.pause(500); // Wait for wheel to settle
      } catch (e) {
        console.log(`[ProfilePage] iOS: Could not find picker wheel, trying text selection`);
        // Fallback: try clicking the value
        try {
          const pickerItem = await this.getElementByText(value);
          await pickerItem.waitForExist({ timeout: 5000 });
          await pickerItem.click();
          console.log(`[ProfilePage] iOS: Clicked picker value "${value}"`);
        } catch (e2) {
          console.log(`[ProfilePage] iOS: Could not set picker value "${value}"`);
        }
      }
      
      await browser.pause(1000); // Wait for value to be set
      
      // Dismiss picker by tapping outside
      try {
        await browser.execute('mobile: tap', { x: 200, y: 100 });
        console.log('[ProfilePage] iOS: Tapped outside picker to dismiss');
      } catch (e) {
        console.log('[ProfilePage] iOS: Could not dismiss picker');
      }
      
      await browser.pause(500); // Wait for picker to dismiss
    } else {
      // Android: Dropdown dialog appears
      console.log(`[ProfilePage] Looking for option: "${value}"`);
      
      // Try multiple strategies to find the option
      let option;
      let found = false;
      
      // Strategy 1: Exact text match
      try {
        option = await this.getElementByText(value);
        await option.waitForExist({ timeout: 2000 });
        found = true;
        console.log(`[ProfilePage] Found via exact match`);
      } catch (e1) {
        console.log(`[ProfilePage] Exact match failed, trying scrollable search...`);
        
        // Strategy 2: Scroll in the dropdown to find the option
        try {
          // Use UiScrollable to scroll through the dropdown list
          const scrollableSelector = 'android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("' + value + '"))';
          option = await $(scrollableSelector);
          found = true;
          console.log(`[ProfilePage] Found via scrollable search`);
        } catch (e2) {
          console.log(`[ProfilePage] Scrollable search failed, trying case-insensitive...`);
          
          // Strategy 3: Case-insensitive partial match
          try {
            option = await $(`android=new UiSelector().textContains("${value.toLowerCase()}")`);
            await option.waitForExist({ timeout: 2000 });
            found = true;
            console.log(`[ProfilePage] Found via case-insensitive match`);
          } catch (e3) {
            throw new Error(`Could not find picker option "${value}" after trying all strategies`);
          }
        }
      }
      
      if (found && option) {
        await option.click();
        console.log(`[ProfilePage] Clicked option: "${value}"`);
      }
    }
    
    await browser.pause(500); // Wait for selection to apply
  }

  /**
   * Save profile changes
   */
  async saveProfile() {
    console.log('[ProfilePage] Saving profile changes...');
    const save = await this.saveButton;
    await save.waitForExist({ timeout: 5000 });
    console.log('[ProfilePage] Save button found');
    
    const isDisplayed = await save.isDisplayed();
    console.log('[ProfilePage] Save button displayed:', isDisplayed);
    
    // iOS: Use mobile:tap for better reliability
    const isIOS = !(browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
    if (isIOS) {
      const location = await save.getLocation();
      const size = await save.getSize();
      console.log('[ProfilePage] iOS: Save button location:', location, 'size:', size);
      const x = Math.floor(location.x + (size.width / 2));
      const y = Math.floor(location.y + (size.height / 2));
      console.log(`[ProfilePage] iOS: Tapping Save button at (${x}, ${y})`);
      await browser.execute('mobile: tap', { x, y });
    } else {
      await save.click();
    }
    
    await browser.pause(2000); // iOS needs more time for save and modal close
    console.log('[ProfilePage] Profile saved');
  }

  /**
   * Close edit modal without saving
   */
  async closeEditModal() {
    console.log('[ProfilePage] Closing edit modal...');
    const close = await this.closeButton;
    await close.click();
    await browser.pause(500);
  }

  /**
   * Expand an accordion
   * @param accordionName - Which accordion to expand
   */
  async expandAccordion(accordionName: 'personal' | 'lifestyle' | 'preferences') {
    console.log(`[ProfilePage] Expanding ${accordionName} accordion...`);
    
    const testIDMap: Record<string, string> = {
      personal: 'personal-info-accordion-header',
      lifestyle: 'lifestyle-accordion-header',
      preferences: 'travel-preferences-accordion-header',
    };

    const testID = testIDMap[accordionName];
    const header = await this.getElementByTestId(testID);
    await header.waitForExist({ timeout: 5000 });
    
    // Platform-specific attribute check
    const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
    const attributeName = isAndroid ? 'text' : 'label';
    
    // Check current state
    const labelBefore = await header.getAttribute(attributeName);
    console.log(`[ProfilePage] ${accordionName} accordion state before: ${labelBefore}`);
    
    // Click the header to expand
    await header.click();
    console.log(`[ProfilePage] Clicked ${accordionName} accordion header`);
    await browser.pause(800); // Wait for animation
    
    // Check state after
    const labelAfter = await header.getAttribute(attributeName);
    console.log(`[ProfilePage] ${accordionName} accordion state after: ${labelAfter}`);
  }

  /**
   * Verify accordion contains text
   * @param accordionName - Which accordion to check
   * @param expectedText - Text that should be present
   */
  async verifyAccordionContains(
    accordionName: 'personal' | 'lifestyle' | 'preferences',
    expectedText: string
  ): Promise<void> {
    console.log(`[ProfilePage] Verifying ${accordionName} accordion contains:`, expectedText);
    
    // Use content testIDs instead of root accordion container
    const contentTestIDMap: Record<string, string> = {
      personal: 'personal-info-accordion-content',
      lifestyle: 'lifestyle-accordion-content',
      preferences: 'travel-preferences-accordion-content',
    };

    const contentTestID = contentTestIDMap[accordionName];
    const accordionContent = await this.getElementByTestId(contentTestID);
    await accordionContent.waitForExist({ timeout: 5000 });
    
    // Get all text elements within the accordion CONTENT (not the whole accordion)
    const textElements = await accordionContent.$$('.//android.widget.TextView | .//android.widget.Text | .//XCUIElementTypeStaticText');
    
    // Collect all text content
    const allTexts: string[] = [];
    for (const el of textElements) {
      try {
        const text = await el.getText();
        if (text) allTexts.push(text);
      } catch (e) {
        // Skip elements that can't be read
      }
    }
    
    const combinedText = allTexts.join(' ').toLowerCase();
    const contains = combinedText.includes(expectedText.toLowerCase());
    
    console.log(`[ProfilePage] Accordion texts:`, allTexts);
    console.log(`[ProfilePage] Combined text: "${combinedText}"`);
    console.log(`[ProfilePage] Contains "${expectedText}": ${contains}`);
    
    if (!contains) {
      throw new Error(`Expected ${accordionName} accordion to contain "${expectedText}" but got: "${allTexts.join(' ')}"`);
    }
  }

  /**
   * Verify text is visible on profile page
   * @param text - Text to verify
   */
  async verifyTextDisplayed(text: string): Promise<void> {
    console.log(`[ProfilePage] Verifying text is displayed: "${text}"`);
    const element = await this.getElementByText(text);
    const isDisplayed = await element.isDisplayed();
    if (!isDisplayed) {
      throw new Error(`Text "${text}" not found or not displayed on profile page`);
    }
    console.log(`[ProfilePage] ✅ Text "${text}" is displayed`);
  }

  /**
   * Get value from accordion field
   * @param fieldLabel - Label of the field (e.g., "Gender", "Status")
   * @returns The value text
   */
  async getAccordionFieldValue(fieldLabel: string): Promise<string> {
    console.log(`[ProfilePage] Getting accordion field value for:`, fieldLabel);
    
    // Find element by label then get the next sibling (the value)
    const labelElement = await this.getElementByText(fieldLabel);
    await labelElement.waitForExist({ timeout: 5000 });
    
    // Get parent row then find value text
    const row = await labelElement.$('..');
    const valueText = await row.getText();
    
    // Extract value (after the label)
    const value = valueText.replace(fieldLabel, '').trim();
    console.log(`[ProfilePage] Field "${fieldLabel}" value:`, value);
    
    return value;
  }

  /**
   * Click a button by its text
   * @param buttonText - Text of the button to click
   */
  async clickButtonByText(buttonText: string): Promise<void> {
    console.log(`[ProfilePage] Clicking button with text: ${buttonText}`);
    const button = await this.getElementByText(buttonText);
    await button.waitForExist({ timeout: 5000 });
    await button.click();
  }
}

/// <reference types="@wdio/globals/types" />
/// <reference types="mocha" />
/**
 * @testName Login Flow - Mobile
 * @description Validates that a user can login with valid credentials (mobile).
 * @platforms ios, android
 * @priority P1
 * @tags smoke, auth, mobile
 */
import { LoginPage } from '../../src/pages/LoginPage';
import { validUser } from '../../src/mocks/userMockData';
import { WebdriverIODriver } from '../../src/drivers/WebdriverIODriver';

describe('Login Flow - Mobile', () => {
  const loginPage = new LoginPage();
  const driver = new WebdriverIODriver();

  before(async () => {
    // PLATFORM should be set to 'android' or 'ios' in CI or local env
    // Ensure app starts in a clean state for the mobile tests as well.
    await driver.launchApp();
    
    // Wait for app to initialize and React Native to load (longer wait for dev build)
    console.log('[Test] Waiting for React Native to initialize...');
    await browser.pause(10000); // Increased wait for development build
    
    // Try to find login screen elements to confirm we're on the right screen
    console.log('[Test] App launched, checking for UI elements...');
  });

  it('should successfully login with valid credentials', async () => {
    // Debug: Check what's on screen
    const pageSource = await browser.getPageSource();
    console.log('[Test] Page source available, length:', pageSource?.length || 0);
    
    // Save page source to file for inspection
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../../debug-page-source.xml');
    fs.writeFileSync(outputPath, pageSource);
    console.log('[Test] Page source saved to:', outputPath);
    
    // Try to find any text inputs on screen
    const allInputs = await $$('android.widget.EditText');
    console.log('[Test] Found', allInputs.length, 'EditText elements');
    
    // Try to find specific login elements with different strategies
    console.log('[Test] Attempting to find login elements...');
    const strategies = [
      { name: 'Resource ID', selector: 'android=new UiSelector().resourceId("login-email-input")' },
      { name: 'Content Description', selector: 'android=new UiSelector().description("login-email-input")' },
      { name: 'Accessibility ID', selector: '~login-email-input' },
      { name: 'Text Contains email', selector: 'android=new UiSelector().textContains("email")' }
    ];
    
    for (const strategy of strategies) {
      try {
        const element = await $(strategy.selector);
        const exists = await element.isExisting();
        console.log(`[Test] ${strategy.name}: ${exists ? 'FOUND' : 'NOT FOUND'}`);
      } catch (e) {
        console.log(`[Test] ${strategy.name}: ERROR -`, (e as Error).message);
      }
    }
    
    await loginPage.login(validUser.email, validUser.password);
    const home = await $('~homeScreen');
    await home.waitForDisplayed({ timeout: 8000 });
    await expect(home).toBeDisplayed();
  });

  after(async () => {
    await driver.closeApp();
  });
});
